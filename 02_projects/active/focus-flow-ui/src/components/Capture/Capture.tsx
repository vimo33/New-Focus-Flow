import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import type { InboxItem, CaptureResponse } from '../../services/api';
import { useSTT } from '../../hooks/useSTT';

interface CaptureProps {
  className?: string;
}

// Common emoji prefixes for quick selection
const EMOJI_OPTIONS = [
  { emoji: '💡', label: 'Idea' },
  { emoji: '📋', label: 'Task' },
  { emoji: '🎯', label: 'Goal' },
  { emoji: '💼', label: 'Work' },
  { emoji: '🏠', label: 'Personal' },
  { emoji: '❓', label: 'Question' },
  { emoji: '📝', label: 'Note' },
  { emoji: '🚀', label: 'Project' },
];

export function Capture({ className = '' }: CaptureProps) {
  const [text, setText] = useState('');
  const [prefix, setPrefix] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCapturedItem, setLastCapturedItem] = useState<InboxItem | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<InboxItem[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, startListening, stopListening } = useSTT({
    continuous: false,
    interimResults: false,
    onResult: (transcript) => setText(transcript),
    onError: () => setError('Voice recognition failed. Please try again.'),
  });

  // Load recent captures on mount
  useEffect(() => {
    loadRecentCaptures();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      // V key for voice (when not focused on textarea)
      if (e.key === 'v' && e.target !== textareaRef.current && !isListening) {
        e.preventDefault();
        startVoiceInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [text, prefix, isListening]);

  const loadRecentCaptures = async () => {
    try {
      const response = await api.getInbox();
      // Get last 5 items
      setRecentCaptures(response.items.slice(0, 5));
    } catch (err) {
      console.error('Failed to load recent captures:', err);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response: CaptureResponse = await api.capture({
        text: text.trim(),
        prefix: prefix || undefined,
        source: 'pwa',
      });

      setLastCapturedItem(response.item);
      setShowSuccess(true);
      setText('');
      setPrefix('');

      // Reload recent captures
      await loadRecentCaptures();

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      setError(null);
      startListening();
    }
  };

  const handleUndo = async () => {
    if (!lastCapturedItem) return;

    try {
      // Delete the last captured item
      await api.processInboxItem(lastCapturedItem.id, { action: 'delete' });
      setShowSuccess(false);
      setLastCapturedItem(null);
      await loadRecentCaptures();
    } catch (err) {
      setError('Failed to undo capture');
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'work':
        return 'text-blue-400';
      case 'personal':
        return 'text-green-400';
      case 'ideas':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getCategoryBgColor = (category?: string) => {
    switch (category) {
      case 'work':
        return 'bg-blue-500/20';
      case 'personal':
        return 'bg-green-500/20';
      case 'ideas':
        return 'bg-yellow-500/20';
      default:
        return 'bg-slate-500/20';
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-slate-500';
    if (confidence >= 0.8) return 'bg-emerald-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploadSuccess(null);
    setUploadingFile(true);

    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name} exceeds 10MB limit`);
          continue;
        }
        await api.uploadFile(file);
      }
      const names = Array.from(fileList).map(f => f.name).join(', ');
      setUploadSuccess(`Uploaded: ${names}`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCaptureDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleCaptureDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleCaptureDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col ${className} ${dragOver ? 'ring-2 ring-primary ring-inset' : ''}`}
      data-testid="capture-screen"
      onDrop={handleCaptureDrop}
      onDragOver={handleCaptureDragOver}
      onDragLeave={handleCaptureDragLeave}
    >
      {/* Main Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-6 md:px-12 py-8">

        {/* AI Classification Badge */}
        {lastCapturedItem?.ai_classification && showSuccess && (
          <div className="w-full flex items-center justify-start gap-4 mb-6 md:mb-10 animate-fade-in-up" data-testid="classification-badge">
            <div className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full bg-card-dark border border-slate-700/50 shadow-sm transition-all hover:border-slate-600">
              <span className="material-symbols-outlined text-yellow-400 text-[20px]">bolt</span>
              <p className="text-slate-300 text-sm font-medium">
                Auto-routing to: <span className={`font-bold ${getCategoryColor(lastCapturedItem.ai_classification.category)}`}>
                  {lastCapturedItem.ai_classification.category.charAt(0).toUpperCase() + lastCapturedItem.ai_classification.category.slice(1)}
                </span>
              </p>
            </div>

            {/* Confidence Indicator */}
            <div className="group relative flex items-center justify-center cursor-help" data-testid="confidence-indicator">
              <div
                className={`w-2.5 h-2.5 rounded-full ${getConfidenceColor(lastCapturedItem.ai_classification.confidence)} shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:flex whitespace-nowrap px-3 py-1.5 bg-gray-900 text-slate-300 text-xs rounded border border-slate-700 shadow-xl z-10">
                AI Confidence: {lastCapturedItem.ai_classification.confidence >= 0.8 ? 'High' : lastCapturedItem.ai_classification.confidence >= 0.6 ? 'Medium' : 'Low'} ({Math.round(lastCapturedItem.ai_classification.confidence * 100)}%)
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        )}

        {/* Main Input Area */}
        <div className="w-full relative group">
          {/* Optional Prefix Emoji */}
          {prefix && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-3xl">{prefix}</span>
              <button
                onClick={() => setPrefix('')}
                className="text-slate-500 hover:text-slate-300 text-sm"
                data-testid="remove-prefix-button"
              >
                Remove
              </button>
            </div>
          )}

          {/* Decorative indicator */}
          <div className="absolute -left-12 top-2 hidden xl:flex flex-col items-center gap-4 opacity-50 transition-opacity group-focus-within:opacity-100">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>

          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            autoFocus
            className="w-full bg-transparent border-none p-0 text-3xl md:text-5xl font-light text-white placeholder-slate-600 focus:ring-0 resize-none min-h-[160px] leading-tight transition-all"
            data-testid="capture-textarea"
          />

          {/* Voice Input Button */}
          <div className="absolute right-0 bottom-4 md:top-2 md:bottom-auto translate-x-0 md:translate-x-16 transition-all">
            <button
              onClick={startVoiceInput}
              aria-label="Voice Input"
              disabled={isSubmitting}
              className={`flex items-center justify-center w-12 h-12 rounded-full bg-card-dark text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg border border-slate-700/50 group/mic ${
                isListening ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-dark' : ''
              }`}
              data-testid="voice-input-button"
            >
              <span className={`material-symbols-outlined text-[24px] transition-colors ${
                isListening ? 'text-primary' : 'group-hover/mic:text-primary'
              }`}>
                {isListening ? 'mic' : 'mic'}
              </span>
            </button>
          </div>
        </div>

        {/* Input Footer / Actions */}
        <div className="w-full flex flex-wrap items-end justify-between gap-4 mt-8 pt-6 border-t border-slate-800/50">
          <div className="flex flex-col gap-3">
            {/* Keyboard Hint */}
            <p className="text-slate-500 text-sm hidden md:block">
              Press <kbd className="font-sans px-1.5 py-0.5 bg-card-dark rounded border border-slate-700 text-xs">Cmd</kbd> + <kbd className="font-sans px-1.5 py-0.5 bg-card-dark rounded border border-slate-700 text-xs">Enter</kbd> to save
            </p>

            {/* Emoji Picker Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-2"
                data-testid="emoji-picker-toggle"
              >
                <span className="material-symbols-outlined text-[18px]">add_reaction</span>
                Add prefix emoji
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="absolute top-full mt-2 bg-card-dark border border-slate-700 rounded-lg shadow-xl p-2 grid grid-cols-4 gap-2 z-10" data-testid="emoji-picker">
                  {EMOJI_OPTIONS.map((option) => (
                    <button
                      key={option.emoji}
                      onClick={() => {
                        setPrefix(option.emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="flex flex-col items-center gap-1 p-2 hover:bg-slate-700 rounded transition-colors"
                      title={option.label}
                    >
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="text-xs text-slate-400">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Voice Hint */}
            <span className="text-slate-500 text-sm italic hidden sm:block">
              Or press 'V' for voice
            </span>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              data-testid="capture-submit-button"
            >
              <span>{isSubmitting ? 'Capturing...' : 'Capture Item'}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm" data-testid="error-message">
            {error}
          </div>
        )}

        {/* File Upload Section */}
        <div className="w-full mt-8 pt-6 border-t border-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-400 text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
              Upload Files
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="text-sm text-primary hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              Browse
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".docx,.pdf,.md,.txt,.json,.csv,.png,.jpg,.jpeg,.svg"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border border-dashed border-slate-700 hover:border-slate-500 bg-card-dark/30 p-4 text-center transition-colors"
          >
            <p className="text-slate-500 text-sm">
              {uploadingFile ? 'Uploading...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              .docx, .pdf, .md, .txt, .json, .csv, .png, .jpg, .svg
            </p>
          </div>
          {uploadError && (
            <p className="mt-2 text-red-400 text-sm">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="mt-2 text-emerald-400 text-sm">{uploadSuccess}</p>
          )}
        </div>

        {/* Recent Captures List */}
        {recentCaptures.length > 0 && (
          <div className="w-full mt-12 pt-8 border-t border-slate-800/50">
            <h3 className="text-slate-400 text-sm font-medium mb-4">Recent Captures</h3>
            <div className="space-y-2" data-testid="recent-captures-list">
              {recentCaptures.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 bg-card-dark/50 rounded-lg hover:bg-card-dark transition-colors"
                  data-testid={`recent-capture-${item.id}`}
                >
                  {item.prefix && <span className="text-xl">{item.prefix}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm truncate">{item.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.ai_classification && (
                        <span className={`text-xs px-2 py-0.5 rounded ${getCategoryBgColor(item.ai_classification.category)} ${getCategoryColor(item.ai_classification.category)}`}>
                          {item.ai_classification.category}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccess && lastCapturedItem && (
        <div className="fixed bottom-6 left-0 w-full pointer-events-none flex flex-col items-center justify-end px-4 gap-3 z-50">
          {/* Meta Text */}
          <p className="text-slate-400 text-xs font-normal opacity-80">
            Last saved to Inbox • Just now
          </p>

          {/* Toast */}
          <div className="pointer-events-auto flex items-center justify-between gap-6 px-4 py-3 bg-surface-dark border border-slate-700 rounded-lg shadow-2xl animate-fade-in transform translate-y-0 opacity-100 transition-all duration-300" data-testid="success-toast">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20">
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">check</span>
              </div>
              <span className="text-slate-200 text-sm font-medium">Capture saved to Inbox</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={handleUndo}
              className="text-sm font-medium text-primary hover:text-blue-400 transition-colors"
              data-testid="undo-button"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
