import json
import logging
import os
import paho.mqtt.client as mqtt
from kafka import KafkaProducer
from dotenv import load_dotenv

load_dotenv()

# Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
MQTT_TOPIC = os.getenv("MQTT_TOPIC_SENSORS", "sensors/+/vibration")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_RAW = os.getenv("KAFKA_TOPIC_RAW", "raw-waveform")
KAFKA_TOPIC_METRICS = os.getenv("KAFKA_TOPIC_METRICS", "metrics")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Kafka Producer
producer = None

def get_producer():
    global producer
    if producer is None:
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            logger.info("Connected to Kafka")
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            raise e
    return producer

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info(f"Connected to MQTT Broker. Subscribing to {MQTT_TOPIC}")
        client.subscribe(MQTT_TOPIC)
    else:
        logger.error(f"Failed to connect to MQTT, return code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        machine_id = payload.get("machine_id")
        timestamp = payload.get("timestamp")
        
        if not machine_id or not timestamp:
            logger.warning("Invalid payload: missing machine_id or timestamp")
            return

        # Split payload
        metrics_payload = {
            "machine_id": machine_id,
            "timestamp": timestamp,
            "metrics": payload.get("metrics", {}),
            "status": payload.get("status", "unknown")
        }
        
        waveform_payload = {
            "machine_id": machine_id,
            "timestamp": timestamp,
            "waveform": payload.get("waveform", [])
        }

        # Publish to Kafka
        prod = get_producer()
        prod.send(KAFKA_TOPIC_METRICS, metrics_payload)
        prod.send(KAFKA_TOPIC_RAW, waveform_payload)
        
        logger.debug(f"Ingested data for {machine_id}")

    except json.JSONDecodeError:
        logger.error("Failed to decode JSON payload")
    except Exception as e:
        logger.error(f"Error processing message: {e}")

def main():
    # Initialize Kafka Producer early to fail fast
    try:
        get_producer()
    except:
        logger.warning("Kafka not available immediately, will retry in loop")

    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        return

    client.loop_forever()

if __name__ == "__main__":
    main()
