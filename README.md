# Instagram Content Provenance and Authenticity Verification System

A basic version of a video-forensics tool. This version detects whether a short
video is likely AI-generated. More detection modules will be added later.

## How it works

An ensemble of two pretrained AI-vs-real image classifiers is run across sampled
frames of the uploaded video, fused with lightweight frequency-domain and
Error-Level-Analysis cues, to produce a synthetic-media likelihood score (0-100).

## Setup

### Prerequisites
- Python 3.8+
- Node.js 16+

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend runs at `http://localhost:8000`. The pretrained models (~1 GB) download
on first run.

### Frontend
```bash
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

## Project structure

```
backend/
├── app.py                  # FastAPI app (POST /analyze)
├── config.py                # model IDs, fusion weights, decision bands
├── forensic_signals.py      # frequency + Error-Level-Analysis cues
├── analyze_synthetic.py     # AI-detector ensemble + fusion
├── video_utils.py           # video validation / frame extraction
├── tests/                   # unit tests (no model download)
└── requirements.txt
index.tsx / index.html       # single-page React frontend
```

## API

```
POST http://localhost:8000/analyze
Content-Type: multipart/form-data
video: <file>
```

Response:
```json
{
  "riskScore": 82.4,
  "riskLevel": "HIGH",
  "summary": "...",
  "signals": { "...": { "name": "...", "status": "pass|warn|fail", "details": "..." } }
}
```
