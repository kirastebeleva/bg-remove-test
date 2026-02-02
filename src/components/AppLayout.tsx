import { useEffect, useState } from 'react';
import { UploadZone } from './UploadZone';
import { validateImage } from '../utils/validateImage';
import { downloadAsPng } from '../utils/downloadAsPng';
import {
  createModelSession,
  MODEL_PATH,
  type InferenceSession,
} from '../onnx/session';

export function AppLayout() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelSession, setModelSession] = useState<InferenceSession | null>(null);

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

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
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
            <img src={previewUrl} alt="Original" className="preview-image" />
          ) : (
            <p className="zone-placeholder">Before</p>
          )}
        </section>

        <section className="zone zone-after" aria-label="Result after">
          <p className="zone-placeholder">Result will appear here</p>
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
        </div>
      </main>
    </div>
  )
}
