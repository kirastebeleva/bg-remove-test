import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadZone } from './UploadZone';
import { validateImage } from '../utils/validateImage';
import { downloadPngBlob } from '../utils/downloadAsPng';
import { composePngFromMask } from '../utils/composePng';
import {
  createModelSession,
  MODEL_PATH,
  type InferenceSession,
} from '../onnx/session';
import { imageToTensor } from '../onnx/preprocess';
import { runInference } from '../onnx/inference';

/** Realistic inference time limit for WASM (TECH-SPEC 2 s was for WebGPU; WASM typically 4–8 s). */
const INFERENCE_TIME_LIMIT_MS = 10_000;

export function AppLayout() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelSession, setModelSession] = useState<InferenceSession | null>(null);
  const [inferenceTimeMs, setInferenceTimeMs] = useState<number | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState(false);
  const [resultPngUrl, setResultPngUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const resultPngUrlRef = useRef<string | null>(null);
  const revokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadModel = useCallback(() => {
    setModelLoadError(null);
    setModelLoading(true);
    createModelSession(MODEL_PATH)
      .then((session) => {
        setModelSession(session);
        setModelLoadError(null);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        setModelLoadError(msg || 'Model load failed');
      })
      .finally(() => setModelLoading(false));
  }, []);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    resultPngUrlRef.current = resultPngUrl;
  }, [resultPngUrl]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useEffect(() => {
    if (revokeTimeoutRef.current) {
      clearTimeout(revokeTimeoutRef.current);
      revokeTimeoutRef.current = null;
    }
    return () => {
      revokeTimeoutRef.current = setTimeout(() => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        if (resultPngUrlRef.current) URL.revokeObjectURL(resultPngUrlRef.current);
        revokeTimeoutRef.current = null;
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (!file || !previewUrl || !modelSession) return;
    setInferenceError(null);
    setInferenceTimeMs(null);
    setResultBlob(null);
    setResultPngUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIsInferring(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const tensor = imageToTensor(img);
        const { mask, inferenceTimeMs: ms } = await runInference(modelSession, tensor);
        setInferenceTimeMs(ms);
        console.log('T-009 inference:', { maskDims: mask.dims, maskLength: mask.data.length, inferenceTimeMs: ms });
        (window as Window & { __lastResult?: { maskDims: number[]; maskLength: number; inferenceTimeMs: number } }).__lastResult = {
          maskDims: mask.dims,
          maskLength: mask.data.length,
          inferenceTimeMs: ms,
        };
        const blob = await composePngFromMask(img, mask);
        setResultBlob(blob);
        setResultPngUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setInferenceError(message);
        setInferenceTimeMs(null);
        console.error('T-009 inference error:', e);
      } finally {
        setIsInferring(false);
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
        setPreviewUrl(null);
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
          ) : resultPngUrl ? (
            <img src={resultPngUrl} alt="Result" className="preview-image" />
          ) : file && !modelSession ? (
            <div className="zone-placeholder zone-model-message">
              {modelLoading ? (
                <p>Loading model…</p>
              ) : (
                <>
                  <p>{modelLoadError ? `Model failed: ${modelLoadError}` : 'Model not loaded'}</p>
                  <p className="zone-hint">Run <code>npm run download-model</code>, then click below.</p>
                  <button type="button" className="btn-load-model" onClick={loadModel}>
                    Load model
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="zone-placeholder">Result will appear here</p>
          )}
        </section>

        <div className="zone-download">
          <button
            type="button"
            disabled={!file || !resultBlob}
            className="btn-download"
            onClick={() => {
              if (resultBlob && file) {
                downloadPngBlob(resultBlob, file.name);
              }
            }}
          >
            Download
          </button>
          {inferenceError != null && (
            <p className="inference-error" role="alert">
              {inferenceError}
            </p>
          )}
          {inferenceTimeMs != null && (
            <p className="inference-time" aria-live="polite">
              Inference: {(inferenceTimeMs / 1000).toFixed(2)} s
              {inferenceTimeMs <= INFERENCE_TIME_LIMIT_MS
                ? ` (≤ ${INFERENCE_TIME_LIMIT_MS / 1000} s ✓)`
                : ` (> ${INFERENCE_TIME_LIMIT_MS / 1000} s)`}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
