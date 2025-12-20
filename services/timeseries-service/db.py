import os
import logging
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)

DB_TYPE = os.getenv("DB_TYPE", "postgres").lower()

# Postgres Config
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "vibration_db")

# SQLite Config
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "vibration_db.sqlite")

def get_connection():
    if DB_TYPE == "sqlite":
        import sqlite3
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row  # Enable dictionary-like access
        return conn
    else:
        import psycopg2
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME
        )
        return conn

def init_db():
    """Initialize Database schema."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        if DB_TYPE == "sqlite":
            # SQLite Schema
            cur.execute("""
                CREATE TABLE IF NOT EXISTS vibration_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    time TEXT NOT NULL,
                    machine_id TEXT NOT NULL,
                    rms REAL,
                    peak REAL,
                    crest_factor REAL,
                    status TEXT
                );
            """)
        else:
            # Postgres/TimescaleDB Schema
            cur.execute("""
                CREATE TABLE IF NOT EXISTS vibration_metrics (
                    time TIMESTAMPTZ NOT NULL,
                    machine_id TEXT NOT NULL,
                    rms DOUBLE PRECISION,
                    peak DOUBLE PRECISION,
                    crest_factor DOUBLE PRECISION,
                    status TEXT
                );
            """)
            # Convert to hypertable (if not already)
            try:
                cur.execute("SELECT create_hypertable('vibration_metrics', 'time', if_not_exists => TRUE);")
            except Exception as e:
                logger.warning(f"Hypertable creation warning (might already exist): {e}")
                conn.rollback()
        
        conn.commit()
        logger.info(f"Database initialized ({DB_TYPE})")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to init DB: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

def insert_metrics(metrics_data):
    """
    Insert a batch of metrics.
    metrics_data: list of dicts
    """
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        if DB_TYPE == "sqlite":
            query = """
                INSERT INTO vibration_metrics (time, machine_id, rms, peak, crest_factor, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            values = [
                (
                    m['timestamp'],
                    m['machine_id'],
                    m['metrics']['rms'],
                    m['metrics']['peak'],
                    m['metrics']['crest_factor'],
                    m.get('status', 'unknown')
                )
                for m in metrics_data
            ]
            cur.executemany(query, values)
        else:
            from psycopg2.extras import execute_values
            query = """
                INSERT INTO vibration_metrics (time, machine_id, rms, peak, crest_factor, status)
                VALUES %s
            """
            values = [
                (
                    m['timestamp'],
                    m['machine_id'],
                    m['metrics']['rms'],
                    m['metrics']['peak'],
                    m['metrics']['crest_factor'],
                    m.get('status', 'unknown')
                )
                for m in metrics_data
            ]
            execute_values(cur, query, values)
            
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to insert metrics: {e}")
    finally:
        cur.close()
        conn.close()
