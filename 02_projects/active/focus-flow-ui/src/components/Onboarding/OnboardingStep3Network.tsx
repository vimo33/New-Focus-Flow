import { useState, useEffect, useRef } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { GlassCard } from '../shared';

interface ImportProgress {
  processed: number;
  total: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}

interface ContactPreview {
  name: string;
  company?: string;
  title?: string;
}

export default function OnboardingStep3Network() {
  const { nextStep, setImportJobId } = useOnboardingStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [contacts, setContacts] = useState<ContactPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${baseURL}/network/import/linkedin`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.job_id) {
        setImportJobId(result.job_id);
      }

      setUploading(false);
      setProgress({ processed: 0, total: result.total || 0, status: 'processing' });

      // Connect to SSE for progress updates
      const es = new EventSource(`${baseURL}/network/import/status`);
      eventSourceRef.current = es;

      es.addEventListener('import_progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress({
            processed: data.processed || 0,
            total: data.total || 0,
            status: data.status || 'processing',
          });

          if (data.status === 'completed') {
            setContacts(data.contacts || data.sample_contacts || []);
            es.close();
            eventSourceRef.current = null;
          }

          if (data.status === 'failed') {
            setError(data.error || 'Import failed');
            es.close();
            eventSourceRef.current = null;
          }
        } catch {
          // Ignore parse errors
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // If we were still processing, mark as potentially completed
        setProgress((prev) =>
          prev && prev.status === 'processing'
            ? { ...prev, status: 'completed' }
            : prev
        );
      };
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-text-primary text-2xl font-bold">
          Map Your Constellation
        </h2>
        <p className="text-text-secondary text-sm">
          Import your LinkedIn network to discover connections and opportunities.
        </p>
      </div>

      {/* Upload zone */}
      {!progress && !uploading && (
        <label className="block w-full p-8 border-2 border-dashed border-[var(--glass-border)] rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="space-y-2">
            <p className="text-text-primary text-lg">
              Drop your LinkedIn data export here
            </p>
            <p className="text-text-tertiary text-xs">or click to browse</p>
            <p className="text-text-tertiary text-xs mt-4">
              Go to LinkedIn Settings &rarr; Get a copy of your data &rarr; Download .zip
            </p>
          </div>
        </label>
      )}

      {/* Uploading state */}
      {uploading && (
        <GlassCard className="text-center space-y-3">
          <p className="text-text-secondary text-sm">Uploading your network data...</p>
          <div className="h-2 bg-elevated rounded-full">
            <div className="h-2 bg-primary/50 rounded-full animate-pulse w-1/3" />
          </div>
        </GlassCard>
      )}

      {/* Progress bar */}
      {progress && !isCompleted && progress.status !== 'failed' && (
        <GlassCard className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Processing contacts...</span>
            <span className="text-text-tertiary">
              {progress.processed}/{progress.total}
            </span>
          </div>
          <div className="h-2 bg-elevated rounded-full">
            <div
              className="h-2 bg-primary rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-text-tertiary text-xs text-center">{percent}% complete</p>
        </GlassCard>
      )}

      {/* Completed state */}
      {isCompleted && (
        <GlassCard className="space-y-4">
          <div className="text-center">
            <p className="text-primary text-3xl mb-2">{'\u2726'}</p>
            <p className="text-text-primary font-semibold text-lg">
              {progress.total} contacts discovered
            </p>
          </div>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold">
                Sample contacts
              </p>
              {contacts.slice(0, 5).map((contact, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-[var(--glass-border)] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-medium">
                      {contact.name}
                    </p>
                    {(contact.title || contact.company) && (
                      <p className="text-text-tertiary text-xs">
                        {[contact.title, contact.company].filter(Boolean).join(' at ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Error state */}
      {error && (
        <GlassCard className="border-danger/30">
          <p className="text-danger text-sm">{error}</p>
        </GlassCard>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-center gap-4">
        {!isCompleted && (
          <button
            onClick={() => nextStep()}
            className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
          >
            Skip for now
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => nextStep()}
            className="bg-primary text-base px-6 py-2 rounded-lg font-medium hover:bg-primary/80 transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
