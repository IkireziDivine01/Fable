import { supabaseAdmin } from './supabase-admin';

const BUCKET = 'story-audio';

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'mp4';
}

export async function persistSentenceAudio(input: {
  householdId: string;
  storyId: string;
  sentenceId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  const path = `${input.householdId}/${input.storyId}/${input.sentenceId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, input.buffer, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (!uploadError) {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // Fallback when storage bucket is not configured yet
  const base64 = input.buffer.toString('base64');
  return `data:${input.mimeType};base64,${base64}`;
}

export async function setSentenceAudioUrl(
  storyId: string,
  sentenceId: string,
  householdId: string,
  audioUrl: string
) {
  const { data: story } = await supabaseAdmin
    .from('stories')
    .select('id')
    .eq('id', storyId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!story) throw new Error('Story not found');

  const { data, error } = await supabaseAdmin
    .from('story_sentences')
    .update({ audio_url: audioUrl })
    .eq('id', sentenceId)
    .eq('story_id', storyId)
    .select('id, audio_url')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to save sentence audio');
  return String(data.audio_url);
}
