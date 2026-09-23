import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  CheckCircle2,
  FileVideo,
  Info,
  Loader2,
  Shield,
  Sparkles,
  Upload,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

interface AnalysisResult {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  signals: Record<string, { name: string; status: "pass" | "warn" | "fail"; details: string }>;
}

const RISK_STYLES: Record<AnalysisResult["riskLevel"], { tint: string; accent: string; label: string }> = {
  LOW: { tint: "rgba(55, 105, 87, 0.16)", accent: "#3b7a66", label: "Low risk" },
  MEDIUM: { tint: "rgba(181, 120, 34, 0.18)", accent: "#b66b25", label: "Moderate risk" },
  HIGH: { tint: "rgba(165, 74, 74, 0.18)", accent: "#b04f4f", label: "High risk" },
};

const STATUS_STYLES: Record<"pass" | "warn" | "fail", { color: string; fill: string }> = {
  pass: { color: "#426e5a", fill: "rgba(66, 110, 90, 0.1)" },
  warn: { color: "#9f6a27", fill: "rgba(159, 106, 39, 0.12)" },
  fail: { color: "#9e5050", fill: "rgba(158, 80, 80, 0.12)" },
};

const App = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setFile(selectedFile);
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
        const payload = await response.json();
        throw new Error(payload.detail || "Analysis failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (error_: any) {
      setError(error_?.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const risk = result ? RISK_STYLES[result.riskLevel] : null;

  return (
    <>
      <style>{`
        :root {
          color-scheme: light;
          --bg: #f4efe8;
          --panel: rgba(255, 252, 247, 0.82);
          --panel-strong: #fffaf4;
          --text: #1f2328;
          --muted: #67615a;
          --line: rgba(34, 28, 20, 0.1);
          --shadow: 0 24px 80px rgba(55, 37, 20, 0.08);
          --shadow-soft: 0 16px 40px rgba(55, 37, 20, 0.06);
          --radius-xl: 28px;
          --radius-lg: 22px;
        }

        * {
          box-sizing: border-box;
        }

        html {
          min-height: 100%;
          background:
            radial-gradient(circle at top left, rgba(169, 181, 169, 0.25), transparent 28%),
            radial-gradient(circle at top right, rgba(210, 191, 167, 0.35), transparent 24%),
            linear-gradient(180deg, #f7f1e8 0%, #f1ebe2 50%, #ece4d8 100%);
        }

        body {
          margin: 0;
          min-height: 100vh;
          color: var(--text);
          font-family: Inter, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          background: transparent;
        }

        button,
        input {
          font: inherit;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(10px);
          pointer-events: none;
          opacity: 0.75;
        }

        .orb.one {
          width: 18rem;
          height: 18rem;
          top: -7rem;
          right: -5rem;
          background: radial-gradient(circle at 30% 30%, rgba(195, 179, 152, 0.65), rgba(195, 179, 152, 0.05));
        }

        .orb.two {
          width: 16rem;
          height: 16rem;
          bottom: 12rem;
          left: -6rem;
          background: radial-gradient(circle at 30% 30%, rgba(171, 190, 175, 0.55), rgba(171, 190, 175, 0.05));
        }

        .shell {
          position: relative;
          width: min(1160px, calc(100% - 32px));
          margin: 0 auto;
          padding: 24px 0 40px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 4px 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text);
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(180deg, #f7f0e7, #ebe1d4);
          border: 1px solid rgba(34, 28, 20, 0.08);
          display: grid;
          place-items: center;
          box-shadow: var(--shadow-soft);
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .brand-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .brand-subtitle {
          font-size: 0.88rem;
          color: var(--muted);
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(34, 28, 20, 0.08);
          background: rgba(255, 251, 244, 0.76);
          color: var(--muted);
          box-shadow: 0 10px 28px rgba(48, 35, 22, 0.05);
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          align-items: stretch;
        }

        .hero-copy,
        .panel {
          border: 1px solid var(--line);
          border-radius: var(--radius-xl);
          background: var(--panel);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }

        .hero-copy {
          padding: 34px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 520px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(34, 28, 20, 0.08);
          color: #66715e;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 18px 0 18px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(3rem, 6vw, 5.2rem);
          line-height: 0.94;
          letter-spacing: -0.04em;
          max-width: 9ch;
        }

        .hero-lead {
          max-width: 46ch;
          color: var(--muted);
          font-size: 1.05rem;
          line-height: 1.75;
          margin-bottom: 24px;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }

        .meta {
          padding: 11px 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(34, 28, 20, 0.08);
          color: #4d5349;
          font-size: 0.92rem;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: auto;
        }

        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 0;
          border-radius: 16px;
          padding: 14px 18px;
          cursor: pointer;
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, opacity 180ms ease;
          text-decoration: none;
          font-weight: 600;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .button.primary {
          background: #28312b;
          color: #fbf8f2;
          box-shadow: 0 18px 30px rgba(40, 49, 43, 0.16);
        }

        .button.secondary {
          background: rgba(255, 255, 255, 0.6);
          color: #32322f;
          border: 1px solid rgba(34, 28, 20, 0.1);
        }

        .button.ghost {
          background: transparent;
          color: #637066;
          padding-left: 4px;
          padding-right: 4px;
        }

        .button:disabled {
          cursor: not-allowed;
          opacity: 0.56;
        }

        .panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .upload-zone {
          border-radius: 24px;
          border: 1px dashed rgba(47, 58, 50, 0.18);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(247, 240, 231, 0.52));
          min-height: 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          transition: border-color 180ms ease, transform 180ms ease, background 180ms ease;
          cursor: pointer;
        }

        .upload-zone.active {
          border-color: rgba(67, 97, 78, 0.35);
          background: linear-gradient(180deg, rgba(252, 249, 244, 0.88), rgba(233, 241, 232, 0.68));
          transform: scale(0.995);
        }

        .upload-zone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          max-width: 28ch;
        }

        .upload-badge {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(34, 28, 20, 0.08);
          box-shadow: var(--shadow-soft);
          color: #47574c;
        }

        .upload-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
        }

        .upload-copy {
          margin: 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 0.96rem;
        }

        .file-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(34, 28, 20, 0.08);
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .file-name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 23ch;
        }

        .file-size {
          color: var(--muted);
          font-size: 0.92rem;
          margin-top: 2px;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 10px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 1.02rem;
          letter-spacing: 0.02em;
        }

        .section-title p {
          margin: 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .result-card {
          border-radius: 24px;
          padding: 22px;
          border: 1px solid rgba(34, 28, 20, 0.08);
          background: rgba(255, 252, 248, 0.86);
          box-shadow: 0 18px 40px rgba(54, 37, 25, 0.05);
        }

        .risk-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 20px;
          border-radius: 20px;
          margin-bottom: 18px;
          border: 1px solid rgba(34, 28, 20, 0.08);
        }

        .risk-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .risk-score {
          font-size: 2rem;
          line-height: 1;
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
        }

        .risk-label {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.95rem;
        }

        .summary {
          color: #47423d;
          line-height: 1.8;
          margin: 0 0 18px;
          font-size: 0.98rem;
        }

        .signals {
          display: grid;
          gap: 12px;
        }

        .signal {
          padding: 15px 16px;
          border-radius: 18px;
          border: 1px solid rgba(34, 28, 20, 0.08);
        }

        .signal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .signal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
        }

        .signal-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .signal-details {
          margin: 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 0.94rem;
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(164, 79, 79, 0.08);
          border: 1px solid rgba(164, 79, 79, 0.16);
          color: #7e3f3f;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .info-card {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(34, 28, 20, 0.08);
        }

        .info-card .label {
          color: var(--muted);
          font-size: 0.84rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
        }

        .info-card .value {
          font-size: 1rem;
          line-height: 1.55;
          margin: 0;
        }

        .footer-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
          padding: 0 6px;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .footer-note span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 960px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .hero-copy {
            min-height: auto;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .shell {
            width: min(100% - 20px, 1160px);
            padding-top: 14px;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .hero-copy,
          .panel,
          .result-card {
            padding: 20px;
          }

          .hero h1 {
            max-width: 100%;
          }

          .risk-banner,
          .file-card,
          .signal-head,
          .footer-note {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="page">
        <div className="orb one" />
        <div className="orb two" />

        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">
                <Shield size={20} strokeWidth={2.2} />
              </div>
              <div className="brand-copy">
                <div className="brand-title">Instagram Authenticity</div>
                <div className="brand-subtitle">Subtle video forensics for synthetic media</div>
              </div>
            </div>

            <div className="pill">
              <Sparkles size={16} />
              Calm editorial interface
            </div>
          </header>

          <main className="hero">
            <section className="hero-copy">
              <div>
                <div className="eyebrow">
                  <CheckCircle2 size={14} />
                  Refined local analysis
                </div>

                <h1>Video authenticity, presented with restraint.</h1>

                <p className="hero-lead">
                  Upload a short video and let the model evaluate whether it looks AI-generated.
                  The interface is intentionally quiet: soft neutrals, no harsh accents, and a layout
                  designed to feel closer to a well-made editorial tool than a demo.
                </p>

                <div className="meta-row">
                  <div className="meta">MP4 and MOV</div>
                  <div className="meta">5 to 20 seconds</div>
                  <div className="meta">Private local processing</div>
                </div>
              </div>

              <div>
                <div className="cta-row">
                  <button className="button primary" onClick={() => inputRef.current?.click()}>
                    Choose a video
                    <ArrowRight size={16} />
                  </button>
                  <button className="button secondary" onClick={handleAnalyze} disabled={!file || isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        Run analysis
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            <section className="panel">
              <div
                className={`upload-zone ${isDragging ? "active" : ""}`}
                onClick={() => !file && inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  handleUpload(event.dataTransfer.files?.[0]);
                }}
              >
                <div className="upload-zone-inner">
                  <div className="upload-badge">
                    {file ? <FileVideo size={28} /> : <Upload size={28} />}
                  </div>

                  {!file ? (
                    <>
                      <p className="upload-title">Drop a video here</p>
                      <p className="upload-copy">
                        Choose a file from your device or drag it into this panel. The result will
                        appear below with a short summary and the signal breakdown.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="upload-title">Ready to analyze</p>
                      <p className="upload-copy">{file.name}</p>
                    </>
                  )}

                  <input
                    ref={inputRef}
                    className="sr-only"
                    type="file"
                    accept="video/*"
                    onChange={(event) => handleUpload(event.target.files?.[0])}
                  />
                </div>
              </div>

              {file && (
                <div className="file-card">
                  <div className="file-meta">
                    <div className="upload-badge" style={{ width: 50, height: 50, borderRadius: 16 }}>
                      <FileVideo size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>

                  <button className="button ghost" onClick={reset}>
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <div className="error-box">
                  <AlertTriangle size={18} />
                  <div>{error}</div>
                </div>
              )}

              <div className="section-title">
                <div>
                  <h2>What the model returns</h2>
                  <p>A score, a risk band, and the evidence behind the call.</p>
                </div>
              </div>

              {result ? (
                <div className="result-card">
                  <div
                    className="risk-banner"
                    style={{ background: risk?.tint || "rgba(255,255,255,0.7)" }}
                  >
                    <div>
                      <div className="risk-pill" style={{ background: risk?.accent || "#6b6b6b", color: "white" }}>
                        {result.riskLevel} RISK
                      </div>
                      <p className="risk-label">{risk?.label || "Analysis result"}</p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <p className="risk-score">{result.riskScore.toFixed(1)}</p>
                      <p className="risk-label">out of 100</p>
                    </div>
                  </div>

                  <p className="summary">{result.summary}</p>

                  <div className="signals">
                    {Object.values(result.signals).map((signal, index) => {
                      const token = STATUS_STYLES[signal.status];
                      return (
                        <div
                          className="signal"
                          key={`${signal.name}-${index}`}
                          style={{ background: token.fill }}
                        >
                          <div className="signal-head">
                            <div className="signal-title">
                              <Info size={16} color={token.color} />
                              {signal.name}
                            </div>
                            <div className="signal-status" style={{ color: token.color, background: "rgba(255,255,255,0.56)" }}>
                              {signal.status}
                            </div>
                          </div>
                          <p className="signal-details">{signal.details}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="result-card">
                  <div className="risk-banner" style={{ background: "rgba(255,255,255,0.72)" }}>
                    <div>
                      <div className="risk-pill" style={{ background: "rgba(103, 116, 108, 0.12)", color: "#4f5d54" }}>
                        Awaiting file
                      </div>
                      <p className="risk-label">A result card will appear here after analysis.</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="risk-score">—</p>
                      <p className="risk-label">score</p>
                    </div>
                  </div>

                  <p className="summary">
                    The interface is deliberately restrained so the analysis feels like a publication
                    tool rather than a flashy dashboard.
                  </p>

                  <div className="info-grid">
                    <div className="info-card">
                      <div className="label">Signal style</div>
                      <p className="value">Soft neutrals, low contrast accents, and no loud gradients.</p>
                    </div>
                    <div className="info-card">
                      <div className="label">Layout</div>
                      <p className="value">Two-column hero with a calm upload surface and structured results.</p>
                    </div>
                    <div className="info-card">
                      <div className="label">Focus</div>
                      <p className="value">Readable evidence with enough hierarchy to make the result easy to scan.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>

          <div className="footer-note">
            <span>
              <CheckCircle2 size={16} />
              Local processing with the backend at {API_URL}
            </span>
            <span>
              Designed to feel quiet, tactile, and editorial
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);