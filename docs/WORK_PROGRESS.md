# Work Progress Report - VibroGuard Frontend Deployment

**Date:** 2025-12-21
**Status:** Resolved / Ready for Verification

## 1. Overview
This document tracks the resolution of critical deployment issues encountered when deploying the VibroGuard Next.js frontend to Vercel and connecting it to the local backend services via Ngrok.

## 2. Issues Resolved

### 2.1. Vercel 404 & Build Configuration
*   **Issue:** Vercel could not find the correct build output or root directory, resulting in 404 errors.
*   **Fix:**
    *   Created `apps/frontend/vercel.json` to explicitly define the framework (`nextjs`), build command (`next build`), and output directory (`.next`).
    *   Updated `apps/frontend/package.json` to enforce Node.js version `≥20.0.0` to match Vercel's environment.

### 2.2. Network Errors (Ngrok Warning Page)
*   **Issue:** The frontend crashed with "Network Error" or JSON parsing errors because Ngrok's free tier intercepts requests with a "Visit Site" warning page (HTML) instead of returning the API JSON data.
*   **Fix:**
    *   Updated `apps/frontend/lib/api.ts` to include the custom header `ngrok-skip-browser-warning: true` in **all** Axios requests.
    *   Applied this fix to both the main `api` instance and the standalone `login` function.

### 2.3. Client-Side Crash (`e.map is not a function`)
*   **Issue:** The app crashed when the API returned unexpected data (like the HTML warning page mentioned above) or when the database was empty, causing `getMachines` to try and iterate over non-array data.
*   **Fix:**
    *   Added robust `Array.isArray()` checks in `getMachines`, `getMetrics`, and `getAlerts`.
    *   The app now safely handles invalid API responses without crashing the entire UI.

### 2.4. Empty Dashboard (0 Machines Monitored)
*   **Issue:** When the backend database is fresh/empty, the dashboard correctly showed "0 machines" but appeared broken/empty to the user.
*   **Fix:**
    *   Implemented a "Smart Fallback" in `getMachines`.
    *   If the API returns an empty list, the frontend now automatically switches to **Demo Mode**, populating the dashboard with 5 mock machines (`machine_01` - `machine_05`) and generating synthetic vibration data.

## 3. Current System State

*   **Frontend:** Next.js 15+ (App Router)
*   **Backend Connection:** Proxied via Vercel Rewrites -> Ngrok Tunnel -> Local FastAPI Gateway.
*   **Resilience:** The app is now fault-tolerant against empty databases and Ngrok warning pages.

## 4. Next Steps for Verification
1.  **Push** all recent changes to GitHub.
2.  **Wait** for Vercel deployment to complete.
3.  **Refresh** the live URL.
4.  **Verify**:
    *   Login works without crashing.
    *   Dashboard loads with 5 demo machines (if DB is empty).
    *   Charts render without "width/height" errors.

## 5. Docker Infrastructure Progress

### 5.1. Containerized Architecture
The entire backend ecosystem is fully containerized using Docker, ensuring consistent environments across development and deployment.

*   **Infrastructure Services:**
    *   **Kafka & Zookeeper:** Event streaming backbone for high-throughput vibration data.
    *   **Postgres (TimescaleDB):** Optimized time-series storage for sensor metrics.
    *   **MinIO:** S3-compatible object storage for raw waveform data.
    *   **MQTT Broker (Mosquitto):** IoT protocol support for edge device connectivity.

*   **Microservices:**
    *   **Ingestion Service:** Consumes raw data from MQTT/Kafka.
    *   **Timeseries Service:** Manages storage and retrieval of metrics.
    *   **ML Service:** Runs anomaly detection models.
    *   **Alert Engine:** Processes real-time alerts based on thresholds.
    *   **RAG LLM Service:** Provides AI-driven diagnostics.
    *   **API Gateway:** Centralized entry point (FastAPI) for the frontend.
    *   **Edge Simulator:** Generates synthetic vibration data for testing.

### 5.2. Orchestration
*   **Docker Compose:** A unified `docker-compose.yml` file orchestrates all 12+ services (infrastructure + microservices), handling networking, volume persistence, and dependency management (e.g., ensuring Kafka is ready before services start).
