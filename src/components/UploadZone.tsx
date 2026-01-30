import { useRef, useState } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/webp';

export type UploadZoneProps = {
  error: string | null;
  onFileSelect: (file: File) => void;
};

export function UploadZone({ error, onFileSelect }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragover, setIsDragover] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <section
      className={`zone zone-upload${isDragover ? ' is-dragover' : ''}`}
      aria-label="Upload area"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        className="upload-input-hidden"
        aria-hidden
      />
      {error ? (
        <p className="zone-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="zone-placeholder">Drop image here or click to upload</p>
      )}
    </section>
  );
}
