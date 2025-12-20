import os
import json
import io
from minio import Minio
import logging

logger = logging.getLogger(__name__)

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = os.getenv("MINIO_BUCKET_WAVEFORMS", "waveforms")

client = Minio(
    MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

def init_storage():
    if not client.bucket_exists(BUCKET_NAME):
        client.make_bucket(BUCKET_NAME)
        logger.info(f"Created bucket {BUCKET_NAME}")

def save_waveform(data):
    """
    Save waveform data to MinIO.
    data: dict with machine_id, timestamp, waveform
    """
    machine_id = data['machine_id']
    timestamp = data['timestamp']
    # Create a unique object name
    object_name = f"{machine_id}/{timestamp}.json"
    
    # Convert to JSON bytes
    content = json.dumps(data).encode('utf-8')
    content_stream = io.BytesIO(content)
    
    try:
        client.put_object(
            BUCKET_NAME,
            object_name,
            content_stream,
            length=len(content),
            content_type='application/json'
        )
        logger.debug(f"Saved waveform to {object_name}")
    except Exception as e:
        logger.error(f"Failed to save waveform: {e}")
