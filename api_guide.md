# Veritas AI — ML Model API Integration Guide

This guide details how to wrap your **Fake News Detection Machine Learning Model** in a lightweight Python web service (using **FastAPI** or **Flask**) and connect it directly to the Veritas AI web interface.

---

## 1. FastAPI Setup (Recommended)

FastAPI is high-performant, generates schema documentation automatically, and handles asynchronous events natively.

### Prerequisites
Install the required packages:
```bash
pip install fastapi uvicorn pydantic scikit-learn
```

### Python Implementation (`main.py`)
Save the following script and update the loading path with your custom vectorizer and model weights:

```python
import pickle
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Veritas AI Model Service")

# IMPORTANT: Configure Cross-Origin Resource Sharing (CORS)
# This allows your local web browser to send HTTP requests to this Python backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to ['null'] or specific file paths in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD YOUR MODEL HERE ---
# Example loading a Scikit-Learn pipeline
try:
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    print("Successfully loaded model and vectorizer.")
except FileNotFoundError:
    print("Warning: model files not found. Returning mockup predictions.")
    model = None
    vectorizer = None


# Define the expected JSON body format
class NewsItem(BaseModel):
    text: str | None = None
    url: str | None = None


@app.post("/predict")
async def predict_credibility(item: NewsItem):
    # Determine what content is present (Text claim or URL to parse)
    content = item.text if item.text else item.url
    
    if not content:
        return {
            "truth_score": 0,
            "verdict": "SUSPICIOUS",
            "bias": 50,
            "sensationalism": 50,
            "source_trust": 50,
            "diagnostic_details": "No text content received."
        }

    # If model is loaded, run NLP predictions
    if model and vectorizer:
        # Preprocess text content
        features = vectorizer.transform([content])
        
        # Predict Class (e.g. 0 = Fake, 1 = Real)
        prediction = model.predict(features)[0]
        
        # Predict Probabilities
        probabilities = model.predict_proba(features)[0]
        # Assuming class index 1 represents True/Real news
        truth_probability = float(probabilities[1])
        truth_score = int(truth_probability * 100)
    else:
        # Fallback Mock Metrics for verification testing
        truth_score = 88
        prediction = 1

    # Map scores to Veritas UI expectations
    verdict = "VERIFIED" if truth_score >= 70 else ("SUSPICIOUS" if truth_score >= 50 else "FAKE")
    
    # Calculate dummy auxiliary stats (Replace with your actual features logic)
    bias_score = int(45 - (truth_score * 0.3)) if prediction == 1 else int(65 + (truth_score * 0.2))
    sensational_score = 15 if prediction == 1 else 85
    trust_score = int(truth_score * 1.05) if truth_score < 95 else 95

    return {
        "truth_score": truth_score,
        "verdict": verdict,
        "bias": min(max(bias_score, 0), 100),
        "sensationalism": min(max(sensational_score, 0), 100),
        "source_trust": min(max(trust_score, 0), 100),
        "diagnostic_details": f"Model vector scan complete. Classification label: {'Real' if prediction == 1 else 'Unverified'} with confidence mapping."
    }

# To run locally:
# uvicorn main:app --reload --port 8000
```

---

## 2. Flask Setup (Alternative)

If you prefer Flask, install dependencies:
```bash
pip install Flask flask-cors scikit-learn
```

### Python Implementation (`app.py`)
```python
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enables CORS for all routes

# --- Load model ---
try:
    with open("model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
except FileNotFoundError:
    model, vectorizer = None, None


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    content = data.get("text") or data.get("url")
    
    if not content:
        return jsonify({"error": "No content received"}), 400

    # NLP Vectorization & Predict
    if model and vectorizer:
        features = vectorizer.transform([content])
        proba = model.predict_proba(features)[0][1]
        truth_score = int(proba * 100)
    else:
        truth_score = 82  # Simulation mock

    verdict = "VERIFIED" if truth_score >= 75 else ("SUSPICIOUS" if truth_score >= 50 else "FAKE")

    return jsonify({
        "truth_score": truth_score,
        "verdict": verdict,
        "bias": 20,
        "sensationalism": 15,
        "source_trust": 90,
        "diagnostic_details": "Model scan completed successfully using Flask backend."
    })


if __name__ == "__main__":
    app.run(port=8000, debug=True)
```

---

## 3. Wiring It Up in Veritas AI

1. Start your local server by running:
   ```bash
   uvicorn main:app --reload --port 8000
   # OR
   python app.py
   ```
2. Open **Veritas AI** (by double-clicking `index.html`).
3. Click on the **API Integration** tab in the navigation bar.
4. Input your endpoint URL: `http://127.0.0.1:8000/predict` (default) or whatever your server uses.
5. Click **Save** to cache the configuration.
6. Click **Ping Backend Endpoint** to test connection. If successful, you will see a green JSON response indicating active connection status!
7. Navigate to the **Analyzer** tab and run a verification scan. The website will automatically fetch predictions directly from your Python model backend!

---

## Troubleshooting CORS Issues
If the "Ping Backend Endpoint" returns a network fetch error:
- Ensure the FastAPI server is running (`uvicorn main:app`).
- Confirm you added the CORS middleware to FastAPI or Flask as outlined above. If CORS middleware is missing, browser security policies will block requests originating from local file locations.
