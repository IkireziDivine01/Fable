import { blobToBase64 } from './audioRecorder';

export type SentenceAudioLang = 'en' | 'rw';

export async function uploadSentenceAudio(
  storyId: string,
  sentenceId: string,
  blob: Blob,
  lang: SentenceAudioLang = 'en'
): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const response = await fetch(`/api/stories/${storyId}/sentences/${sentenceId}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      lang,
    }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to upload audio');
  return result.audioUrl as string;
}
