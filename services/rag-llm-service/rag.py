import os
import json
import logging
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
from openai import OpenAI

logger = logging.getLogger(__name__)

MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
OPENAI_API_KEY = os.getenv("LLM_API_KEY", "sk-placeholder")
OPENAI_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
COLLECTION_NAME = "maintenance_knowledge"

# Initialize OpenAI
client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

def connect_milvus():
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        logger.info("Connected to Milvus")
        init_collection()
    except Exception as e:
        logger.error(f"Failed to connect to Milvus: {e}")

def init_collection():
    if utility.has_collection(COLLECTION_NAME):
        return

    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536) # OpenAI embedding dim
    ]
    schema = CollectionSchema(fields, "Maintenance manuals and logs")
    collection = Collection(COLLECTION_NAME, schema)
    
    # Create index
    index_params = {
        "metric_type": "L2",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 128}
    }
    collection.create_index("embedding", index_params)
    logger.info(f"Created collection {COLLECTION_NAME}")

def get_embedding(text):
    # If placeholder key, return random vector for dev
    if OPENAI_API_KEY == "sk-placeholder":
        import numpy as np
        return np.random.rand(1536).tolist()
        
    response = client.embeddings.create(input=text, model="text-embedding-ada-002")
    return response.data[0].embedding

def ingest_document(text):
    connect_milvus()
    collection = Collection(COLLECTION_NAME)
    
    embedding = get_embedding(text)
    
    collection.insert([
        [text],
        [embedding]
    ])
    collection.flush()
    logger.info("Ingested document")

def query_rag(query_text, context_filter=None):
    try:
        connect_milvus()
        collection = Collection(COLLECTION_NAME)
        collection.load()
    except Exception as e:
        logger.error(f"Failed to connect to Milvus: {e}")
        return {
            "summary": "Failed to connect to Milvus",
            "likely_causes": ["Milvus connection error"],
            "immediate_actions": ["Check Milvus connection"],
            "confidence_score": 0.0
        }
    try:
        query_embedding = get_embedding(query_text)
        
        search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=3,
            output_fields=["text"]
        )
        
        context = ""
        for hits in results:
            for hit in hits:
                context += hit.entity.get("text") + "\n---\n"
    except Exception as e:
        logger.error(f"Failed to get context: {e}")
        context = ""
            
    # LLM Query
    prompt = f"""
    You are an expert industrial maintenance assistant.
    Use the following context to answer the user's question about machine vibration anomalies.
    
    Context:
    {context}
    
    Question: {query_text}
    
    Return the answer in JSON format:
    {{
        "summary": "...",
        "likely_causes": ["..."],
        "immediate_actions": ["..."],
        "confidence_score": 0.0-1.0
    }}
    """
    
    if OPENAI_API_KEY == "sk-placeholder":
        return {
            "summary": "Simulated RAG response. Check API key.",
            "likely_causes": ["Bearing wear", "Misalignment"],
            "immediate_actions": ["Lubricate bearing", "Check alignment"],
            "confidence_score": 0.85
        }

    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
