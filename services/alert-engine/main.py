import os
import json
import logging
import psycopg2
from kafka import KafkaConsumer
from dotenv import load_dotenv

load_dotenv()

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_METRICS = os.getenv("KAFKA_TOPIC_METRICS", "metrics")
KAFKA_TOPIC_INFERENCE = os.getenv("KAFKA_TOPIC_INFERENCE", "inference-results")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "vibration_db")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Thresholds (could be loaded from DB)
THRESHOLDS = {
    "rms": 1.0,
    "peak": 2.0,
    "crest_factor": 3.0
}

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME
    )

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                time TIMESTAMPTZ DEFAULT NOW(),
                machine_id TEXT NOT NULL,
                type TEXT NOT NULL,
                message TEXT,
                severity TEXT,
                details JSONB
            );
        """)
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to init alerts DB: {e}")
    finally:
        cur.close()
        conn.close()

def create_alert(machine_id, alert_type, message, severity, details):
    logger.warning(f"ALERT [{severity}]: {machine_id} - {message}")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO alerts (machine_id, type, message, severity, details)
            VALUES (%s, %s, %s, %s, %s)
        """, (machine_id, alert_type, message, severity, json.dumps(details)))
        conn.commit()
    except Exception as e:
        logger.error(f"Failed to save alert: {e}")
    finally:
        cur.close()
        conn.close()

def process_metrics(msg):
    try:
        data = json.loads(msg.value.decode('utf-8'))
        metrics = data.get('metrics', {})
        machine_id = data.get('machine_id')
        
        # Check thresholds
        if metrics.get('rms', 0) > THRESHOLDS['rms']:
            create_alert(
                machine_id, 
                "THRESHOLD_EXCEEDED", 
                f"RMS {metrics['rms']} exceeds limit {THRESHOLDS['rms']}", 
                "HIGH", 
                metrics
            )
    except Exception as e:
        logger.error(f"Error processing metrics: {e}")

def process_inference(msg):
    try:
        data = json.loads(msg.value.decode('utf-8'))
        machine_id = data.get('machine_id')
        
        if data.get('is_anomaly'):
            create_alert(
                machine_id,
                "ML_ANOMALY",
                f"Anomaly detected (Score: {data.get('anomaly_score')})",
                "CRITICAL",
                data
            )
    except Exception as e:
        logger.error(f"Error processing inference: {e}")

def main():
    init_db()
    
    # We need to consume from two topics. 
    # Simplest way is two consumers or one consumer subscribing to both if logic is similar.
    # Logic is different, so two consumers in threads or just one loop checking topic.
    
    consumer = KafkaConsumer(
        KAFKA_TOPIC_METRICS, KAFKA_TOPIC_INFERENCE,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id='alert-engine-group'
    )
    
    logger.info("Started Alert Engine")
    
    for message in consumer:
        if message.topic == KAFKA_TOPIC_METRICS:
            process_metrics(message)
        elif message.topic == KAFKA_TOPIC_INFERENCE:
            process_inference(message)

if __name__ == "__main__":
    main()
