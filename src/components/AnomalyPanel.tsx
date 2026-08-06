import { useRef, useState } from "react";
import { AlertCircle, Loader2, UploadCloud, X } from "lucide-react";
import { detectAnomalyOnBackend, type AnomalyApi } from "../lib/api";

interface Props {
  onClose: () => void;
}

export default function AnomalyPanel({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annotatedSrc, setAnnotatedSrc] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyApi[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const res = await detectAnomalyOnBackend(file);
      setAnomalies(res.anomalies);
      setAnnotatedSrc(`data:image/jpeg;base64,${res.annotated_image_base64}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Талдау сәтсіз аяқталды: ${e.message}`
          : "Талдау сәтсіз аяқталды."
      );
      setAnomalies(null);
      setAnnotatedSrc(null);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Satellite Anomaly Detection</div>
            <div className="modal-subtitle">
              Классикалық computer-vision: қараңғылық + тегістік анализі негізінде
              мұнай дағына ұқсас аймақтарды анықтайды.
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {!annotatedSrc && (
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={28} />
                <span>Талдануда…</span>
              </>
            ) : (
              <>
                <UploadCloud size={28} />
                <span>Спутник суретін осында тастаңыз немесе таңдау үшін басыңыз</span>
                <span className="dropzone-hint">JPG/PNG, 12MB дейін — немесе backend/sample_data/demo_satellite.jpg демо суретін қолданыңыз</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {error && (
          <div className="anomaly-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {annotatedSrc && (
          <div className="anomaly-result">
            <img src={annotatedSrc} alt={fileName ?? "annotated"} className="anomaly-image" />
            <div className="anomaly-list">
              {anomalies && anomalies.length > 0 ? (
                anomalies.map((a, i) => (
                  <div className="anomaly-row" key={i}>
                    <span className="anomaly-badge" style={{ opacity: 0.5 + a.confidence * 0.5 }}>
                      {Math.round(a.confidence * 100)}%
                    </span>
                    <span>
                      {a.w}×{a.h}px аймақ — қараңғылық {Math.round(a.darkness_score * 100)}%,
                      тегістік {Math.round(a.smoothness_score * 100)}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="anomaly-row">Аномалия анықталмады.</div>
              )}
            </div>
            <p className="disclaimer">
              Нәтиже — "тексеруді қажет ететін аномалия", расталған төгінді емес.
              Желсіз аумақтар мен бұлт көлеңкесі ұқсас көрініс бере алады.
            </p>
            <button
              className="btn-outline small"
              onClick={() => { setAnnotatedSrc(null); setAnomalies(null); setError(null); }}
            >
              Басқа сурет жүктеу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
