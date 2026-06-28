'use client';

import { useRef, useState } from 'react';
import { AudioRecorder, formatDuration, type RecordingState } from '@/lib/audioRecorder';

interface AudioRecorderPanelProps {
  onRecorded?: (objectUrl: string, blob: Blob) => void;
}

export default function AudioRecorderPanel({ onRecorded }: AudioRecorderPanelProps) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [state, setState] = useState<RecordingState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
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

  const stopRecording = async () => {
    try {
      const result = await recorderRef.current?.stop();
      if (!result) return;
      setPreviewUrl(result.objectUrl);
      setDurationMs(result.durationMs);
      setState('stopped');
      onRecorded?.(result.objectUrl, result.blob);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Could not stop recording');
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
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
      <p className="mb-3 font-label-sm uppercase tracking-widest text-white/80">Audio (optional)</p>

      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="min-h-12 w-full rounded-xl bg-white/20 px-4 font-label-md text-white hover:bg-white/30"
        >
          Start recording
        </button>
      )}

      {state === 'recording' && (
        <button
          type="button"
          onClick={stopRecording}
          className="min-h-12 w-full animate-pulse rounded-xl bg-red-500/80 px-4 font-label-md text-white"
        >
          Stop recording
        </button>
      )}

      {state === 'stopped' && previewUrl && (
        <div className="space-y-3">
          <p className="text-sm text-emerald-200">✓ Audio recorded ({formatDuration(durationMs)})</p>
          <audio controls src={previewUrl} className="w-full" />
          <button
            type="button"
            onClick={reset}
            className="min-h-12 w-full rounded-xl border border-white/30 px-4 text-sm text-white"
          >
            Re-record
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
    </div>
  );
}
