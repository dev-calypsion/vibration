import axios from 'axios';

// In a real app, this would be an env var. 
// For dev, we assume localhost:8000 (API Gateway) is proxied or accessible.
// Next.js runs on 3000, API on 8000.
// We might need a proxy in next.config.js or CORS.
// For now, we'll use localhost:8000 directly.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api`;
export const TOKEN_STORAGE_KEY = 'vg.auth.token';

let inMemoryToken: string | null = null;

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return inMemoryToken;
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
};

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (username: string, password: string) => {
  const payload = new URLSearchParams({
    username,
    password,
    grant_type: 'password',
  });

  const res = await axios.post(`${API_BASE_URL}/token`, payload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.data?.access_token) {
    throw new Error('Missing token in response');
  }

  return res.data as { access_token: string; token_type: string };
};

export const logout = () => setAuthToken(null);

export const getMachines = async () => {
    // Mock response if API not ready
    try {
        const res = await api.get('/machines');
        return res.data;
    } catch (e) {
        console.error("API Error", e);
        return ["machine_01", "machine_02", "machine_03", "machine_04", "machine_05"];
    }
};

export const getMetrics = async (machineId: string) => {
    try {
        const res = await api.get(`/metrics/${machineId}`);
        return res.data;
    } catch (e) {
        console.error("API Error", e);
        return [];
    }
};

export const getAlerts = async () => {
    try {
        const res = await api.get('/alerts');
        return res.data;
    } catch (e) {
        console.error("API Error", e);
        return [];
    }
};

export const predictAnomaly = async (metrics: any) => {
    try {
        const res = await api.post('/predict', metrics);
        return res.data;
    } catch (e) {
        console.error("API Error", e);
        // Basic mock prediction so UI can still function in demo mode
        return { is_anomaly: false, anomaly_score: 0.0 };
    }
};

export const queryRAG = async (query: string) => {
    try {
        const res = await api.post('/rag/query', { query });
        return res.data;
    } catch (e) {
        console.error("API Error", e);
        // Mock AI response for offline/demo mode
        return {
            summary: "Backend LLM service is offline, showing demo response only.",
            likely_causes: [
                "Increased overall vibration level compared to baseline",
                "Possible imbalance or misalignment depending on dominant frequency",
            ],
            immediate_actions: [
                "Schedule an on-site inspection for this asset",
                "Verify mounting, alignment, and bearing condition",
            ],
            confidence_score: 0.4,
        };
    }
};
