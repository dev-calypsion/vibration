from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag import ingest_document, query_rag

app = FastAPI()

class IngestRequest(BaseModel):
    text: str

class QueryRequest(BaseModel):
    query: str

@app.post("/ingest")
def ingest(req: IngestRequest):
    try:
        ingest_document(req.text)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
def query(req: QueryRequest):
    try:
        return query_rag(req.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}
