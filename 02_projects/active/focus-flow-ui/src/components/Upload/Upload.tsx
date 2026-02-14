import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import type { UploadedFile } from '../../services/api';

const ACCEPTED_TYPES = '.docx,.pdf,.md,.txt,.json,.csv,.png,.jpg,.jpeg,.svg';
const MAX_SIZE_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getUploads();
      setFiles(response.files);
    } catch (err: any) {
      console.error('Failed to load uploads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    const total = fileList.length;
    let completed = 0;

    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`${file.name} exceeds ${MAX_SIZE_MB}MB limit`);
          continue;
        }
        await api.uploadFile(file);
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await api.deleteUpload(filename);
      setFiles((prev) => prev.filter((f) => f.name !== filename));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Uploads</h1>
        <p className="mt-1 text-sm text-gray-400">
          Upload and manage files in your vault
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8
          transition-colors duration-200 text-center
          ${dragOver
            ? 'border-primary bg-primary/10'
            : 'border-gray-600 hover:border-gray-400 bg-card-dark'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-3 block">
          cloud_upload
        </span>
        <p className="text-white font-medium">
          {dragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Accepted: {ACCEPTED_TYPES.split(',').join(', ')} | Max {MAX_SIZE_MB}MB
        </p>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-card-dark rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* File List */}
      <div className="bg-card-dark rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-2 block">folder_open</span>
            No files uploaded yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3 hidden sm:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {files.map((file) => (
                <tr key={file.name} className="hover:bg-surface-dark/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400 text-lg">
                        {file.originalName.match(/\.(png|jpg|jpeg|svg)$/i) ? 'image' : 'description'}
                      </span>
                      <span className="text-sm text-white truncate max-w-[200px] sm:max-w-none">
                        {file.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={api.getDownloadUrl(file.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        title="Download"
                      >
                        <span className="material-symbols-outlined text-lg">download</span>
                      </a>
                      <button
                        onClick={() => handleDelete(file.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
