import os
import httpx
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Config
SECRET_KEY = os.getenv("API_SECRET_KEY", "super-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Service URLs
TIMESERIES_URL = os.getenv("TIMESERIES_URL", "http://timeseries-service:8000")
ML_URL = os.getenv("ML_URL", "http://ml-service:8000")
RAG_URL = os.getenv("RAG_URL", "http://rag-llm-service:8000")

app = FastAPI(title="Vibration Platform API Gateway")

# CORS configuration: prefer regex for flexible domain patterns
cors_origins = os.getenv("ALLOWED_ORIGINS", "")
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", "")
allowed_origins = [
    origin.strip() for origin in cors_origins.split(",") if origin.strip()
] or [
    "https://link360.in",
    "https://www.link360.in",
]

if origin_regex:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)):
    # TEMPORARY BYPASS: Return default user if no token or invalid token
    return TokenData(username="admin_bypass")

    # Original Logic (Disabled)
    # credentials_exception = HTTPException(
    #     status_code=status.HTTP_401_UNAUTHORIZED,
    #     detail="Could not validate credentials",
    #     headers={"WWW-Authenticate": "Bearer"},
    # )
    # try:
    #     payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    #     username: str = payload.get("sub")
    #     if username is None:
    #         raise credentials_exception
    #     token_data = TokenData(username=username)
    # except JWTError:
    #     raise credentials_exception
    # return token_data

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Mock user verification
    if form_data.username == "admin" and form_data.password == "admin":
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": form_data.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

# Proxy Helper
async def proxy_request(url: str, method: str, json_body: dict = None, params: dict = None):
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                resp = await client.get(url, params=params)
            elif method == "POST":
                resp = await client.post(url, json=json_body)
            return resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {exc}")

# --- Routes ---

@app.get("/api/machines")
async def get_machines(current_user: TokenData = Depends(get_current_user)):
    return await proxy_request(f"{TIMESERIES_URL}/machines", "GET")

@app.get("/api/metrics/{machine_id}")
async def get_metrics(machine_id: str, limit: int = 100, current_user: TokenData = Depends(get_current_user)):
    return await proxy_request(
        f"{TIMESERIES_URL}/metrics", 
    "GET", params= {"machine_id": machine_id,"limit": limit},
    )

@app.get("/api/alerts")
async def get_alerts(limit: int = 50, current_user: TokenData = Depends(get_current_user)):
    return await proxy_request(f"{TIMESERIES_URL}/alerts", "GET", params={"limit": limit})

@app.post("/api/predict")
async def predict(metrics: dict, current_user: TokenData = Depends(get_current_user)):
    return await proxy_request(f"{ML_URL}/predict", "POST", json_body=metrics)

@app.post("/api/rag/query")
async def rag_query(query: dict, current_user: TokenData = Depends(get_current_user)):
    # query: {"query": "..."}
    return await proxy_request(f"{RAG_URL}/query", "POST", json_body=query)

@app.get("/health")
def health():
    return {"status": "ok"}
