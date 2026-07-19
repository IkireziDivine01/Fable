'use client';

import { useEffect, useRef, useState } from 'react';
import {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
  storyTextareaClass,
} from '@/components/story/StoryShell';

export default function TtsPlayer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const generateSpeech = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Enter some Kinyarwanda text first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setAudioUrl(null);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Speech generation failed (${response.status})`);
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('Received empty audio from the server');
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAudioUrl(url);

      // Let React attach the new src, then play.
      queueMicrotask(() => {
        const el = audioRef.current;
        if (!el) return;
        el.load();
        void el.play().catch(() => {
          // Autoplay can be blocked; controls remain available.
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StoryPanel>
      <StoryEyebrow>Kinyarwanda voice</StoryEyebrow>
      <StoryTitle>Mateza text to speech</StoryTitle>
      <StoryLead>
        Generate natural Kinyarwanda speech with Mateza — better accent and pronunciation than the
        browser voice.
      </StoryLead>

      {error ? <StoryAlert message={error} /> : null}

      <label className="mb-2 block font-label-sm uppercase tracking-widest text-[#524348]">
        Kinyarwanda text
      </label>
      <textarea
        className={`${storyTextareaClass} mb-4 min-h-32`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Andika inyandiko mu Kinyarwanda…"
        disabled={loading}
      />

      <StoryButton onClick={generateSpeech} disabled={loading || !text.trim()}>
        {loading ? 'Generating…' : 'Generate speech'}
      </StoryButton>

      {audioUrl ? (
        <audio
          ref={audioRef}
          className="mt-6 w-full"
          controls
          src={audioUrl}
          preload="auto"
        />
      ) : null}
    </StoryPanel>
  );
}
