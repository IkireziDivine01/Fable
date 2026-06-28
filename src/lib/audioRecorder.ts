export type RecordingState = 'idle' | 'recording' | 'stopped' | 'error';

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  objectUrl: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;

  async start(): Promise<void> {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      throw new Error('Audio recording is not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.startedAt = Date.now();

    const preferredTypes = ['audio/webm', 'audio/wav', 'audio/mp4'];
    const mimeType =
      preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  async stop(): Promise<AudioRecordingResult> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording.');
    }

    const recorder = this.mediaRecorder;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;

    const mimeType = recorder.mimeType || 'audio/webm';
    const blob = new Blob(this.chunks, { type: mimeType });
    const durationMs = Date.now() - this.startedAt;

    return {
      blob,
      mimeType,
      durationMs,
      objectUrl: URL.createObjectURL(blob),
    };
  }

  cancel(): void {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
