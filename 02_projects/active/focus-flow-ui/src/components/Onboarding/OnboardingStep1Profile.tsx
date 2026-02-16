import { useState, useRef, useEffect } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { api } from '../../services/api';
import { GlassCard, Badge } from '../shared';

interface ChatMessage {
  role: 'nitara' | 'user';
  content: string;
}

type ConversationPhase = 'intro' | 'work' | 'location' | 'extract' | 'confirm';

const QUESTIONS: Record<string, string> = {
  intro: "Welcome! I'm Nitara, your AI co-founder. Let's build your profile together. First — what's your name and what do you do?",
  work: "What are you currently working on? Any projects, ventures, or ideas you're focused on?",
  location: "Where are you based? And what skills or expertise would you say define you?",
  extract: "Got it — let me put that together for you...",
};

export default function OnboardingStep1Profile() {
  const { nextStep, setProfileData } = useOnboardingStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'nitara', content: QUESTIONS.intro },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [extractedProfile, setExtractedProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>('intro');
  const [allResponses, setAllResponses] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, extracting]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || extracting) return;

    const userText = inputValue.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setInputValue('');

    const responses = [...allResponses, userText];
    setAllResponses(responses);

    if (phase === 'intro') {
      setPhase('work');
      setMessages((prev) => [...prev, { role: 'nitara', content: QUESTIONS.work }]);
    } else if (phase === 'work') {
      setPhase('location');
      setMessages((prev) => [...prev, { role: 'nitara', content: QUESTIONS.location }]);
    } else if (phase === 'location') {
      // All info collected — extract profile
      setPhase('extract');
      setExtracting(true);
      setMessages((prev) => [...prev, { role: 'nitara', content: QUESTIONS.extract }]);

      const combinedText = responses.join('\n');
      try {
        const result = await api.extractProfile(combinedText);
        const profile = result.profile || result;
        setExtractedProfile(profile);
        setProfileData(profile);
        setPhase('confirm');
        setMessages((prev) => [
          ...prev,
          {
            role: 'nitara',
            content: "Here's your profile. Take a look — does this capture you well?",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'nitara',
            content:
              "I had trouble putting that together. Let me save what I have and you can refine it later.",
          },
        ]);
        // Fallback: create a basic profile from the raw responses
        const fallbackProfile = {
          name: responses[0]?.split(',')[0]?.replace(/^(hi|hey|hello|i am|i'm)\s*/i, '').trim() || 'Founder',
          bio: responses.slice(0, 2).join('. '),
          active_work: responses[1] ? [responses[1]] : [],
        };
        setExtractedProfile(fallbackProfile);
        setProfileData(fallbackProfile);
        setPhase('confirm');
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!extractedProfile || saving) return;
    setSaving(true);

    try {
      await api.saveProfile(extractedProfile);
      nextStep();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'nitara',
          content: 'Something went wrong saving your profile. Trying again...',
        },
      ]);
      // Retry once
      try {
        await api.saveProfile(extractedProfile);
        nextStep();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'nitara',
            content: 'Still having trouble. Please check the backend connection and try again.',
          },
        ]);
      }
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

  const renderSkills = (skills: any[]) => {
    if (!skills || skills.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill: any, i: number) => (
          <Badge
            key={i}
            label={typeof skill === 'string' ? skill : skill.name || skill}
            variant="active"
          />
        ))}
      </div>
    );
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
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-sm text-text-tertiary animate-pulse">
              Analyzing your profile...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Extracted profile preview */}
      {extractedProfile && phase === 'confirm' && (
        <GlassCard className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-2">
            YOUR PROFILE
          </h3>
          <p className="text-text-primary font-semibold text-lg">
            {extractedProfile.name || 'Your Profile'}
          </p>
          {extractedProfile.bio && (
            <p className="text-text-secondary text-sm">{extractedProfile.bio}</p>
          )}
          {extractedProfile.location && (
            <p className="text-text-tertiary text-xs">
              <span className="text-text-secondary">Location:</span> {extractedProfile.location}
            </p>
          )}
          {renderSkills(extractedProfile.skills)}
          {extractedProfile.active_work && extractedProfile.active_work.length > 0 && (
            <div>
              <p className="text-text-tertiary text-xs mb-1">Currently working on:</p>
              <div className="flex flex-wrap gap-2">
                {extractedProfile.active_work.map((w: string, i: number) => (
                  <Badge key={i} label={w} variant="playbook" />
                ))}
              </div>
            </div>
          )}
          {extractedProfile.strategic_focus_tags && extractedProfile.strategic_focus_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {extractedProfile.strategic_focus_tags.map((t: string, i: number) => (
                <Badge key={i} label={t} variant="council" />
              ))}
            </div>
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

      {/* Input area — shown during conversation phases */}
      {phase !== 'confirm' && phase !== 'extract' && (
        <div className="flex gap-3 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={2}
            autoFocus
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
