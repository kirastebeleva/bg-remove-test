import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { validateImage } from '../utils/validateImage';

export function AppLayout() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    validateImage(selectedFile).then((result) => {
      if (result.ok) {
        setFile(result.file);
        setError(null);
      } else {
        setFile(null);
        setError(result.error);
      }
    });
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Background Remover</h1>
      </header>

      <main className="app-main">
        <UploadZone error={error} onFileSelect={handleFileSelect} />

        <section className="zone zone-before" aria-label="Preview before">
          <p className="zone-placeholder">Before</p>
        </section>

        <section className="zone zone-after" aria-label="Result after">
          <p className="zone-placeholder">After</p>
        </section>

        <div className="zone-download">
          <button type="button" disabled={!file} className="btn-download">
            Download
          </button>
        </div>
      </main>
    </div>
  )
}
