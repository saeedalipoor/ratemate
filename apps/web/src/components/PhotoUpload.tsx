import { useRef, useState } from 'react';
import { getApiUrl } from '../lib/config';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function PhotoUpload({ photos, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const response = await fetch(getApiUrl('/api/uploads'), {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          throw new Error(data.error ?? 'Upload failed');
        }
        uploaded.push(data.url);
      }
      onChange([...photos, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= 4}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Add photos'}
        </button>
        <span className="text-sm text-stone-500">Up to 4 images, 5 MB each</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url) => (
            <img
              key={url}
              src={url}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-cover border border-stone-200"
            />
          ))}
        </div>
      )}
    </div>
  );
}
