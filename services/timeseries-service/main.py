import os
import json
import logging
import threading
import uvicorn
from kafka import KafkaConsumer
from dotenv import load_dotenv
from db import init_db, insert_metrics
from storage import init_storage, save_waveform
from api import app

# Load .env from project root
from pathlib import Path
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_METRICS = os.getenv("KAFKA_TOPIC_METRICS", "metrics")
KAFKA_TOPIC_RAW = os.getenv("KAFKA_TOPIC_RAW", "raw-waveform")
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "true").lower() == "true"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def consume_metrics():
    if not ENABLE_KAFKA:
        return
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC_METRICS,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='timeseries-metrics-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        logger.info(f"Started Metrics Consumer for {KAFKA_TOPIC_METRICS}")
        
        batch = []
        BATCH_SIZE = 10
        
        for message in consumer:
            try:
                batch.append(message.value)
                if len(batch) >= BATCH_SIZE:
                    insert_metrics(batch)
                    batch = []
            except Exception as e:
                logger.error(f"Error in metrics consumer: {e}")
    except Exception as e:
        logger.error(f"Failed to start metrics consumer: {e}")

def consume_waveforms():
    if not ENABLE_KAFKA:
        return
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC_RAW,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='timeseries-waveform-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        logger.info(f"Started Waveform Consumer for {KAFKA_TOPIC_RAW}")
        
        for message in consumer:
            try:
                save_waveform(message.value)
            except Exception as e:
                logger.error(f"Error in waveform consumer: {e}")
    except Exception as e:
        logger.error(f"Failed to start waveform consumer: {e}")

def main():
    # Init backends
    try:
        init_db()
        init_storage()
    except Exception as e:
        logger.error(f"Initialization failed: {e}")
    
    if ENABLE_KAFKA:
        # Start consumers in threads
        t1 = threading.Thread(target=consume_metrics, daemon=True)
        t2 = threading.Thread(target=consume_waveforms, daemon=True)
        
        t1.start()
        t2.start()
    else:
        logger.info("Kafka disabled. Waiting for HTTP ingestion...")
    
    # Run API
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
