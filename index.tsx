import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Upload, FileVideo, Loader2 } from "lucide-react";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

interface AnalysisResult {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  signals: Record<string, { name: string; status: "pass" | "warn" | "fail"; details: string }>;
}

const RISK_COLORS: Record<string, string> = {
  LOW: "#16a34a",
  MEDIUM: "#d97706",
  HIGH: "#dc2626",
};

const STATUS_COLORS: Record<string, string> = {
  pass: "#16a34a",
  warn: "#d97706",
  fail: "#dc2626",
};

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const response = await fetch(`${API_URL}/analyze`, { method: "POST", body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Analysis failed");
      }
      const data = await response.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        AI-Generated Content Detection
      </h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Upload a short video (MP4/MOV, 5-20 seconds) to check the likelihood it was AI-generated.
      </p>

      <div
        onClick={() => !file && document.getElementById("video-upload")?.click()}
        style={{
          border: "2px dashed #ccc",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          cursor: file ? "default" : "pointer",
          background: "#fafafa",
        }}
      >
        {file ? (
          <div>
            <FileVideo size={32} style={{ marginBottom: 8 }} />
            <p style={{ fontWeight: 600 }}>{file.name}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              style={{ marginTop: 8, fontSize: 13, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <Upload size={32} style={{ marginBottom: 8, color: "#999" }} />
            <p style={{ color: "#666" }}>Click to choose a video</p>
          </div>
        )}
        <input
          id="video-upload"
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
      </div>

      <button
        disabled={!file || isAnalyzing}
        onClick={handleAnalyze}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px 0",
          fontWeight: 600,
          border: "none",
          borderRadius: 6,
          background: !file || isAnalyzing ? "#ccc" : "#111",
          color: "#fff",
          cursor: !file || isAnalyzing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {isAnalyzing && <Loader2 size={16} className="spin" />}
        {isAnalyzing ? "Analyzing..." : "Analyze"}
      </button>

      {error && (
        <p style={{ marginTop: 16, color: "#dc2626", fontSize: 14 }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: 32, padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
              background: RISK_COLORS[result.riskLevel],
              marginBottom: 12,
            }}
          >
            {result.riskLevel} RISK — {result.riskScore.toFixed(1)}/100
          </div>
          <p style={{ fontSize: 14, color: "#444", marginBottom: 16 }}>{result.summary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(Object.values(result.signals) as AnalysisResult["signals"][string][]).map((sig, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  border: `1px solid ${STATUS_COLORS[sig.status]}33`,
                  background: `${STATUS_COLORS[sig.status]}0d`,
                }}
              >
                <strong>{sig.name}:</strong> {sig.details}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
