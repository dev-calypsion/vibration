import logging
from fastapi import FastAPI, HTTPException
from typing import List, Dict
from db import get_connection

logger = logging.getLogger(__name__)

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/metrics")
def get_metrics(machine_id: str = None, limit: int = 100):
    """Get recent metrics for a machine or all machines."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        if machine_id:
            cur.execute("""
                SELECT time, machine_id, rms, peak, crest_factor, status 
                FROM vibration_metrics 
                WHERE machine_id = ? 
                ORDER BY time DESC 
                LIMIT ?
            """, (machine_id, limit))
        else:
            cur.execute("""
                SELECT time, machine_id, rms, peak, crest_factor, status 
                FROM vibration_metrics 
                ORDER BY time DESC 
                LIMIT ?
            """, (limit,))
        
        rows = cur.fetchall()
        return [
            {
                "timestamp": r[0],
                "machine_id": r[1],
                "rms": r[2],
                "peak": r[3],
                "crest_factor": r[4],
                "status": r[5]
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/machines")
def get_machines():
    """Get list of all machine IDs."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT DISTINCT machine_id FROM vibration_metrics")
        rows = cur.fetchall()
        return [r[0] for r in rows]
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/alerts")
def get_alerts(limit: int = 50):
    """Get recent alerts (if alerts table exists)."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT time, machine_id, type, message, severity, details 
            FROM alerts 
            ORDER BY time DESC 
            LIMIT ?
        """, (limit,))
        rows = cur.fetchall()
        return [
            {
                "timestamp": r[0],
                "machine_id": r[1],
                "type": r[2],
                "message": r[3],
                "severity": r[4],
                "details": r[5]
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Alerts query failed (table might not exist): {e}")
        return []
    finally:
        cur.close()
        conn.close()

@app.post("/ingest/metrics")
def ingest_metrics(payload: Dict):
    """
    HTTP ingestion endpoint for metrics.
    Accepts a single metric payload from simulator.
    """
    from db import insert_metrics
    try:
        # Wrap single payload in a list for batch processing
        insert_metrics([payload])
        return {"status": "ok", "message": "Metrics ingested"}
    except Exception as e:
        logger.error(f"Failed to ingest metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest/waveform")
def ingest_waveform(payload: Dict):
    """
    HTTP ingestion endpoint for raw waveform data.
    """
    from storage import save_waveform
    try:
        save_waveform(payload)
        return {"status": "ok", "message": "Waveform saved"}
    except Exception as e:
        logger.error(f"Failed to save waveform: {e}")
        raise HTTPException(status_code=500, detail=str(e))
