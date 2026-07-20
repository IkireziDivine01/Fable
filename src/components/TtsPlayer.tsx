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
      setError('Enter some text first (English, Kinyarwanda, or mixed).');
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

      // Heuristic: treat as Kinyarwanda when the line has no Latin-only English cues
      // but includes common RW orthography, or when the user prefixes with "rw:".
      const looksRw =
        /^rw\s*:/i.test(trimmed) ||
        /[áéíóúñ]|(\b(muraho|neza|habaye|umwana|nyirarama|amahoro)\b)/i.test(trimmed);
      const textForTts = trimmed.replace(/^rw\s*:/i, '').trim();
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textForTts,
          lang: looksRw ? 'rw' : 'en',
          characterType: 'grandma',
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Speech generation failed (${response.status})`);
      }

      const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'audio/wav';
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) {
        throw new Error('Received empty audio from the server');
      }
      const blob = new Blob([bytes], { type: mimeType });

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
      <StoryEyebrow>Story narration</StoryEyebrow>
      <StoryTitle>Text to speech</StoryTitle>
      <StoryLead>
        English uses ElevenLabs; Kinyarwanda uses Proto&apos;s native Voice API. Prefix with{' '}
        <code className="text-sm">rw:</code> to force Kinyarwanda.
      </StoryLead>

      {error ? <StoryAlert message={error} /> : null}

      <label className="mb-2 block font-label-sm uppercase tracking-widest text-[#524348]">
        Narration text
      </label>
      <textarea
        className={`${storyTextareaClass} mb-4 min-h-32`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Once upon a time… / Habaye n'ubwo… / Mixed EN + RW welcome"
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
