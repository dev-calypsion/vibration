FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model from root context? No, usually in docker build context we set root.
# But for now let's assume the model is copied into the service dir or we mount it.
# The previous LS showed `model.joblib` in `services/ml-service/`.
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
