from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import re
from nltk.corpus import stopwords
import nltk
from scipy.sparse import hstack
import numpy as np

nltk.download('stopwords')
stop_words = set(stopwords.words('english'))

app = FastAPI()

model = joblib.load('model.pkl')
tfidf = joblib.load('tfidf_vectorizer.pkl')
scaler = joblib.load('count_scaler.pkl')
party_encoder = joblib.load('party_encoder.pkl')
subject_encoder = joblib.load('subject_encoder.pkl')

label_order = ['pants-fire', 'false', 'barely-true', 'half-true', 'mostly-true', 'true']

def clean_text(text):
    text = text.lower()
    text = re.sub(r'reuters', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    words = [w for w in text.split() if w not in stop_words]
    return ' '.join(words)

class StatementInput(BaseModel):
    statement: str
    party: str = "none"
    subject: str = "none"
    barely_true_c: float = 0
    false_c: float = 0
    half_true_c: float = 0
    mostly_true_c: float = 0
    pants_fire_c: float = 0

@app.post("/predict")
def predict(input: StatementInput):
    clean = clean_text(input.statement)
    text_features = tfidf.transform([clean])

    counts = np.array([[input.barely_true_c, input.false_c, input.half_true_c,
                         input.mostly_true_c, input.pants_fire_c]])
    counts_scaled = scaler.transform(counts)

    party_features = party_encoder.transform([[input.party]])
    subject_features = subject_encoder.transform([[input.subject]])

    combined = hstack([text_features, counts_scaled, party_features, subject_features])

    prediction = model.predict(combined)[0]
    probabilities = model.predict_proba(combined)[0]

    return {
        "prediction": label_order[prediction],
        "confidence": float(max(probabilities)),
        "all_probabilities": {label_order[i]: float(p) for i, p in enumerate(probabilities)}
    }

@app.get("/")
def home():
    return {"status": "Fake news detector API is running"}