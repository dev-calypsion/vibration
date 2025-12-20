import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks
from kafka import KafkaConsumer, KafkaProducer
from model import detector
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_METRICS = os.getenv("KAFKA_TOPIC_METRICS", "metrics")
KAFKA_TOPIC_INFERENCE = os.getenv("KAFKA_TOPIC_INFERENCE", "inference-results")
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "true").lower() == "true"

producer = None
if ENABLE_KAFKA:
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        logger.info("Kafka Producer initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Kafka Producer: {e}")
        ENABLE_KAFKA = False # Fallback if connection fails

def process_message(msg_value):
    try:
        data = msg_value
        metrics = data.get('metrics', {})
        
        features = [
            metrics.get('rms', 0),
            metrics.get('peak', 0),
            metrics.get('crest_factor', 0)
        ]
        
        prediction = detector.predict(features)
        score = detector.score(features)
        
        is_anomaly = prediction == -1
        
        result = {
            "machine_id": data.get('machine_id'),
            "timestamp": data.get('timestamp'),
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": float(score),
            "rul_estimate_hours": 240.0 if not is_anomaly else 24.0 # Mock RUL
        }
        
        # Publish result if Kafka is enabled
        if producer:
            producer.send(KAFKA_TOPIC_INFERENCE, result)
        else:
            logger.info(f"Inference result (No Kafka): {result}")
        
        if is_anomaly:
            logger.warning(f"Anomaly detected for {data.get('machine_id')}! Score: {score}")
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")

async def consume_metrics():
    if not ENABLE_KAFKA:
        logger.info("Kafka disabled, skipping consumer start")
        return

    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC_METRICS,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id='ml-inference-group'
        )
        logger.info("Started ML Consumer")
        
        loop = asyncio.get_event_loop()
        
        while True:
            # Poll for messages
            msg_batch = await loop.run_in_executor(None, consumer.poll, 1000)
            for tp, messages in msg_batch.items():
                for msg in messages:
                    try:
                        val = json.loads(msg.value.decode('utf-8'))
                        process_message(val)
                    except Exception as e:
                        logger.error(f"Failed to decode message: {e}")
            await asyncio.sleep(0.1)
    except Exception as e:
        logger.error(f"Kafka Consumer failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(consume_metrics())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok", "kafka_enabled": ENABLE_KAFKA}

@app.post("/predict")
def predict(metrics: dict):
    """
    Ad-hoc prediction endpoint.
    metrics: {"rms": float, "peak": float, "crest_factor": float}
    """
    features = [
        metrics.get('rms', 0),
        metrics.get('peak', 0),
        metrics.get('crest_factor', 0)
    ]
    prediction = detector.predict(features)
    score = detector.score(features)
    
    return {
        "is_anomaly": bool(prediction == -1),
        "anomaly_score": float(score)
    }
