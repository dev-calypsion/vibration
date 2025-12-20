import numpy as np
from sklearn.ensemble import IsolationForest
import joblib
import os

MODEL_PATH = "model.joblib"

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.is_fitted = False
        
    def train(self, data):
        """
        Train the model on normal data.
        data: list of [rms, peak, crest_factor]
        """
        X = np.array(data)
        self.model.fit(X)
        self.is_fitted = True
        self.save()
        
    def predict(self, features):
        """
        Predict anomaly.
        features: [rms, peak, crest_factor]
        Returns: -1 for anomaly, 1 for normal
        """
        if not self.is_fitted:
            # Fallback or auto-train on small batch?
            # For now, return 1 (normal) if not fitted
            return 1
            
        X = np.array([features])
        return self.model.predict(X)[0]
    
    def score(self, features):
        """
        Anomaly score. Lower is more anomalous.
        """
        if not self.is_fitted:
            return 0.0
        X = np.array([features])
        return self.model.decision_function(X)[0]

    def save(self):
        joblib.dump(self.model, MODEL_PATH)
        
    def load(self):
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)
            self.is_fitted = True

# Global instance
detector = AnomalyDetector()

# Pre-train with some dummy data if not exists
if not os.path.exists(MODEL_PATH):
    # Generate synthetic normal data
    # RMS around 0.5, Peak around 0.7, CF around 1.4
    X_train = np.random.normal(loc=[0.5, 0.7, 1.4], scale=[0.1, 0.1, 0.1], size=(100, 3))
    detector.train(X_train)
else:
    detector.load()
