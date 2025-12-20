# Vibration Monitoring & Predictive Maintenance Platform

A complete industrial vibration monitoring, FFT analytics, predictive maintenance, and LLM-based insights platform.

## Architecture

- **Edge Layer**: Simulated IFM sensors sending data via MQTT.
- **Ingestion**: MQTT -> Kafka Bridge.
- **Storage**: TimescaleDB (Metrics), MinIO (Waveforms), Milvus (Vector Embeddings).
- **ML Engine**: Anomaly Detection & RUL Prediction.
- **LLM Engine**: RAG-based insights using OpenAI/Local LLMs.
- **Frontend**: Real-time Dashboard (Next.js/React).

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### Setup

1. **Infrastructure**
   ```bash
   cd deploy
   docker-compose up -d
   ```

2. **Environment**
   Copy `.env.example` to `.env` and configure keys.
   ```bash
   cp .env.example .env
   ```

3. **Running Services**
   (Instructions to be added as services are built)

## Directory Structure
- `apps/`: Frontend applications
- `services/`: Backend microservices
- `libs/`: Shared libraries
- `deploy/`: Infrastructure configuration
