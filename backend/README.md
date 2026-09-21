# Backend

FastAPI service for AI-generated video content detection.

## Endpoints
- `GET  /health`
- `POST /analyze` - form field `video`

Interactive docs at `/docs`.

## Run locally
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py    # http://localhost:8000
```

The pretrained AI-image classifiers download on first run.
