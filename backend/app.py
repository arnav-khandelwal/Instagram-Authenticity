from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import os
import sys

# Force UTF-8 console output so status/emoji strings print on Windows (cp1252).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from video_utils import (
    validate_video,
    save_uploaded_video,
    extract_frames,
    cleanup_temp_files
)
from analyze_synthetic import analyze_synthetic_video

app = FastAPI(
    title="Instagram Content Provenance and Authenticity Verification System",
    description="AI-generated content detection API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # local dev
    # Any local dev port, plus any Vercel deployment of the frontend.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Instagram Content Provenance and Authenticity Verification System",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/analyze")
async def analyze_endpoint(
    video: UploadFile = File(..., description="Video file (MP4/MOV, 5-20 seconds)")
) -> Dict[str, Any]:
    video_path = None
    frame_paths = []
    try:
        if not video:
            raise HTTPException(status_code=400, detail="No video file provided")
        video_content = await video.read()
        video_path = save_uploaded_video(video_content, video.filename)
        is_valid, error_msg = validate_video(video_path)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        frame_paths = extract_frames(video_path, interval=1)
        if not frame_paths:
            raise HTTPException(status_code=500, detail="Failed to extract frames from video")
        print(f"Analyzing {len(frame_paths)} frames for AI-generated content...")
        result = analyze_synthetic_video(frame_paths)
        print(f"AI-Generated Risk: {result['riskScore']:.1f} ({result['riskLevel']})")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        if video_path and os.path.exists(video_path):
            cleanup_temp_files([video_path])
        if frame_paths:
            cleanup_temp_files(frame_paths)


if __name__ == "__main__":
    import uvicorn
    from pathlib import Path
    temp_dir = Path(__file__).parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    print("Starting backend...")
    print("API Docs: http://local\host:8000/docs")
    print("Health Check: http://localhost:8000/health")
    # This API has no websocket routes, so disable websocket protocol loading.
    uvicorn.run(app, host="0.0.0.0", port=8000, ws="none")
