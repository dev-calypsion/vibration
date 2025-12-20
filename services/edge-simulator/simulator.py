import time
import json
import random
import logging
import numpy as np
import paho.mqtt.client as mqtt
import requests
from datetime import datetime
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configuration
INGESTION_MODE = os.getenv("INGESTION_MODE", "http").lower() # http or mqtt
MQTT_BROKER = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
NUM_MACHINES = int(os.getenv("NUM_MACHINES", 5))
SAMPLE_RATE = 2000  # Hz
CHUNK_SIZE = 2048   # ~1 second of data
INTERVAL = 2.0      # Seconds between publishes

# HTTP Config
TIMESERIES_URL = os.getenv("TIMESERIES_URL", "http://localhost:8000/ingest/metrics")
ML_URL = os.getenv("ML_URL", "http://localhost:8001/predict")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_waveform(duration, sample_rate, fault_type=None):
    t = np.linspace(0, duration, int(duration * sample_rate), endpoint=False)
    
    # Base signal: 1x RPM (e.g., 1800 RPM = 30 Hz)
    freq_1x = 30.0
    signal = 0.5 * np.sin(2 * np.pi * freq_1x * t)
    
    # Add noise
    noise = np.random.normal(0, 0.1, len(t))
    signal += noise
    
    # Simulate faults
    if fault_type == "imbalance":
        # High 1x amplitude
        signal += 1.5 * np.sin(2 * np.pi * freq_1x * t)
    elif fault_type == "misalignment":
        # High 2x amplitude
        signal += 0.8 * np.sin(2 * np.pi * (2 * freq_1x) * t)
    elif fault_type == "bearing_fault":
        # High frequency impacts
        bearing_freq = 120.0
        signal += 0.3 * np.sin(2 * np.pi * bearing_freq * t) * (1 + 0.5 * np.sin(2 * np.pi * 5 * t)) # Modulated
        
    return signal.tolist()

def calculate_metrics(waveform):
    arr = np.array(waveform)
    rms = np.sqrt(np.mean(arr**2))
    peak = np.max(np.abs(arr))
    crest_factor = peak / rms if rms > 0 else 0
    return {
        "rms": round(float(rms), 4),
        "peak": round(float(peak), 4),
        "crest_factor": round(float(crest_factor), 4)
    }

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT Broker!")
    else:
        logger.error(f"Failed to connect, return code {rc}")

def send_data_mqtt(client, topic, payload):
    client.publish(topic, json.dumps(payload))

def send_data_http(payload):
    # Send to Timeseries Service
    try:
        requests.post(TIMESERIES_URL, json=payload)
    except Exception as e:
        logger.error(f"Failed to send to Timeseries: {e}")

    # Send to ML Service (Ad-hoc prediction)
    try:
        # ML service expects just metrics for /predict
        ml_payload = payload['metrics']
        # But we also want to associate it with machine_id, though the simple /predict might not store it.
        # For now, just hitting the endpoint to trigger logic if needed, or we might need a better ingestion endpoint on ML side.
        # The current ML /predict is just a calculator. 
        # If we want to simulate the full pipeline, we should probably have an ingestion endpoint on ML service too, 
        # or let Timeseries service forward it? 
        # For now, let's just log that we would send it.
        requests.post(ML_URL, json=ml_payload)
    except Exception as e:
        logger.error(f"Failed to send to ML: {e}")

def main():
    client = None
    if INGESTION_MODE == "mqtt":
        client = mqtt.Client()
        client.on_connect = on_connect
        logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_start()
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return
    else:
        logger.info(f"Starting Simulator in HTTP mode (Target: {TIMESERIES_URL})")

    machines = [f"machine_{i:02d}" for i in range(1, NUM_MACHINES + 1)]
    
    # Randomly assign faults
    machine_states = {m: "healthy" for m in machines}
    # Make machine_05 have a fault
    if len(machines) >= 5:
        machine_states["machine_05"] = "bearing_fault"

    try:
        while True:
            for machine_id in machines:
                state = machine_states[machine_id]
                
                # Occasionally switch state for demo
                if random.random() < 0.01:
                    states = ["healthy", "imbalance", "misalignment", "bearing_fault"]
                    state = random.choice(states)
                    machine_states[machine_id] = state
                    logger.info(f"{machine_id} state changed to {state}")

                waveform = generate_waveform(CHUNK_SIZE/SAMPLE_RATE, SAMPLE_RATE, state)
                metrics = calculate_metrics(waveform)
                
                payload = {
                    "machine_id": machine_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "sample_rate": SAMPLE_RATE,
                    "metrics": metrics,
                    "waveform": waveform, 
                    "status": state 
                }
                
                if INGESTION_MODE == "mqtt":
                    topic = f"sensors/{machine_id}/vibration"
                    send_data_mqtt(client, topic, payload)
                else:
                    send_data_http(payload)
                
                logger.debug(f"Published ({INGESTION_MODE}) for {machine_id}: RMS={metrics['rms']}")
            
            time.sleep(INTERVAL)
            
    except KeyboardInterrupt:
        logger.info("Stopping simulator...")
        if client:
            client.loop_stop()
            client.disconnect()

if __name__ == "__main__":
    main()
