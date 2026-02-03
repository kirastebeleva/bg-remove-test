import { useEffect, useState } from 'react';
import { UploadZone } from './UploadZone';
import { validateImage } from '../utils/validateImage';
import { downloadAsPng } from '../utils/downloadAsPng';
import {
  createModelSession,
  MODEL_PATH,
  type InferenceSession,
} from '../onnx/session';
import { imageToTensor } from '../onnx/preprocess';
import { runInference } from '../onnx/inference';

export function AppLayout() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelSession, setModelSession] = useState<InferenceSession | null>(null);
  const [inferenceTimeMs, setInferenceTimeMs] = useState<number | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState(false);

  useEffect(() => {
    createModelSession(MODEL_PATH)
      .then(setModelSession)
      .catch(() => {
        // Model load failed (e.g. file missing); session stays null.
        // T-006: first load must complete without error when model is present.
      });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!file || !previewUrl || !modelSession) return;
    setInferenceError(null);
    setInferenceTimeMs(null);
    setIsInferring(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const tensor = imageToTensor(img);
        const { mask, inferenceTimeMs: ms } = await runInference(modelSession, tensor);
        setInferenceTimeMs(ms);
        setIsInferring(false);
        console.log('T-009 inference:', { maskDims: mask.dims, maskLength: mask.data.length, inferenceTimeMs: ms });
        (window as Window & { __lastResult?: { maskDims: number[]; maskLength: number; inferenceTimeMs: number } }).__lastResult = {
          maskDims: mask.dims,
          maskLength: mask.data.length,
          inferenceTimeMs: ms,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setInferenceError(message);
        setInferenceTimeMs(null);
        setIsInferring(false);
        console.error('T-009 inference error:', e);
      }
    };
    img.onerror = () => {
      setInferenceError('Failed to load image');
      setIsInferring(false);
    };
    img.src = previewUrl;
    return () => {
      img.src = '';
    };
  }, [file, previewUrl, modelSession]);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setInferenceTimeMs(null);
    setInferenceError(null);
    validateImage(selectedFile).then((result) => {
      if (result.ok) {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(result.file);
        });
        setFile(result.file);
        setError(null);
      } else {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setFile(null);
        setError(result.error);
      }
    });
  };

  return (
    <div className="app-layout" data-model-ready={modelSession !== null}>
      <header className="app-header">
        <h1>Background Remover</h1>
      </header>

      <main className="app-main">
        <UploadZone error={error} onFileSelect={handleFileSelect} />

        <section className="zone zone-before" aria-label="Preview before">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Original"
              className="preview-image"
            />
          ) : (
            <p className="zone-placeholder">Before</p>
          )}
        </section>

        <section className="zone zone-after" aria-label="Result after">
          {isInferring ? (
            <p className="zone-placeholder">Processing…</p>
          ) : (
            <p className="zone-placeholder">Result will appear here</p>
          )}
        </section>

        <div className="zone-download">
          <button
            type="button"
            disabled={!file}
            className="btn-download"
            onClick={() => {
              if (previewUrl && file) {
                downloadAsPng(previewUrl, file.name);
              }
            }}
          >
            Download
          </button>
          <p className="zone-placeholder" style={{ marginTop: '0.5rem' }}>Это тест</p>
          {inferenceError != null && (
            <p className="inference-error" role="alert">
              {inferenceError}
            </p>
          )}
          {inferenceTimeMs != null && (
            <p className="inference-time" aria-live="polite">
              Inference: {inferenceTimeMs.toFixed(0)} ms
              {inferenceTimeMs <= 2000 ? ' (≤ 2 s ✓)' : ' (> 2 s)'}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
