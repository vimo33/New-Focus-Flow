import { useState } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { api } from '../../services/api';
import { GlassCard, Badge } from '../shared';

interface ChatMessage {
  role: 'nitara' | 'user';
  content: string;
}

export default function OnboardingStep1Profile() {
  const { nextStep, setProfileData } = useOnboardingStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'nitara',
      content:
        "Welcome! I'm Nitara, your AI co-founder. Let's get to know each other. Tell me about yourself \u2014 what do you do, what are you working on, and what drives you?",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [extractedProfile, setExtractedProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const handleSubmit = async () => {
    if (!inputValue.trim() || extracting) return;

    const userText = inputValue.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setInputValue('');
    setExtracting(true);

    try {
      const result = await api.post('/profile/extract', { text: userText });
      setExtractedProfile(result.profile || result);
      setProfileData(result.profile || result);
      setMessages((prev) => [
        ...prev,
        {
          role: 'nitara',
          content:
            "Here's what I gathered from that. Take a look and let me know if it captures you well.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'nitara',
          content:
            'I had trouble processing that. Could you try describing yourself again?',
        },
      ]);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedProfile || saving) return;
    setSaving(true);

    try {
      await api.post('/profile', extractedProfile);
      nextStep();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'nitara',
          content: 'Something went wrong saving your profile. Let me try again...',
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      {/* Chat messages */}
      <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'nitara' && (
              <span className="text-primary mr-2 mt-1 text-lg shrink-0">{'\u2726'}</span>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-text-primary'
                  : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-text-secondary'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {extracting && (
          <div className="flex justify-start">
            <span className="text-primary mr-2 mt-1 text-lg shrink-0">{'\u2726'}</span>
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-text-tertiary">
              Analyzing your profile...
            </div>
          </div>
        )}
      </div>

      {/* Extracted profile preview */}
      {extractedProfile && (
        <GlassCard className="space-y-3">
          <h3 className="text-text-primary font-semibold text-lg">
            {extractedProfile.name || 'Your Profile'}
          </h3>
          {extractedProfile.bio && (
            <p className="text-text-secondary text-sm">{extractedProfile.bio}</p>
          )}
          {extractedProfile.skills && extractedProfile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {extractedProfile.skills.map((skill: string, i: number) => (
                <Badge key={i} label={skill} variant="active" />
              ))}
            </div>
          )}
          {extractedProfile.active_work && (
            <p className="text-text-tertiary text-xs">
              Active work: {extractedProfile.active_work}
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-primary text-base px-6 py-2 rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Looks good, continue'}
          </button>
        </GlassCard>
      )}

      {/* Input area */}
      {!extractedProfile && (
        <div className="flex gap-3 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Nitara about yourself..."
            rows={3}
            className="flex-1 bg-surface border border-[var(--glass-border)] rounded-xl px-4 py-3 text-text-primary text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-text-tertiary"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || extracting}
            className="bg-primary text-base px-4 py-3 rounded-xl font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
