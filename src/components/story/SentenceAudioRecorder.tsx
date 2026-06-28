'use client';

import { useRef, useState } from 'react';
import { AudioRecorder, formatDuration, type RecordingState } from '@/lib/audioRecorder';
import { uploadSentenceAudio } from '@/lib/story-audio-client';

interface SentenceAudioRecorderProps {
  storyId: string;
  sentenceId: string;
  label?: string;
  compact?: boolean;
  existingUrl?: string | null;
  onUploaded?: (audioUrl: string) => void;
}

export default function SentenceAudioRecorder({
  storyId,
  sentenceId,
  label = 'Voice for this sentence',
  compact = false,
  existingUrl,
  onUploaded,
}: SentenceAudioRecorderProps) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [state, setState] = useState<RecordingState>(existingUrl ? 'stopped' : 'idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl ?? null);
  const [durationMs, setDurationMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const startRecording = async () => {
    setError('');
    try {
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      setState('recording');
      setPreviewUrl(null);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Could not start recording');
    }
  };

  const stopAndUpload = async () => {
    try {
      const result = await recorderRef.current?.stop();
      if (!result) return;

      setPreviewUrl(result.objectUrl);
      setDurationMs(result.durationMs);
      setState('stopped');
      setUploading(true);

      const audioUrl = await uploadSentenceAudio(storyId, sentenceId, result.blob);
      setPreviewUrl(audioUrl);
      onUploaded?.(audioUrl);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Could not save recording');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    recorderRef.current?.cancel();
    setPreviewUrl(null);
    setDurationMs(0);
    setState('idle');
    setError('');
  };

  return (
    <div
      className={`rounded-xl border border-[#e9d7d0] bg-[#fff8f5] ${compact ? 'p-3' : 'p-4'}`}
    >
      <p className="mb-2 font-label-sm uppercase tracking-widest text-[#857278]">{label}</p>

      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="min-h-11 w-full rounded-xl border border-dashed border-[#d7c1c7] bg-white px-4 text-sm text-[#524348] hover:border-[#FF7956]"
        >
          Tap to record
        </button>
      )}

      {state === 'recording' && (
        <button
          type="button"
          onClick={stopAndUpload}
          className="min-h-11 w-full animate-pulse rounded-xl bg-[#520e33] px-4 font-label-sm tracking-widest text-white"
        >
          Stop & save
        </button>
      )}

      {(state === 'stopped' || previewUrl) && previewUrl && (
        <div className="space-y-2">
          <p className="text-sm text-[#0d5e30]">
            {uploading ? 'Saving…' : `✓ Voice saved${durationMs ? ` (${formatDuration(durationMs)})` : ''}`}
          </p>
          <audio controls src={previewUrl} className="h-10 w-full" preload="metadata" />
          <button
            type="button"
            onClick={reset}
            className="min-h-10 w-full rounded-xl border border-[#e9d7d0] bg-white text-sm text-[#524348]"
          >
            Re-record
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[#a7391c]">{error}</p>}
    </div>
  );
}
