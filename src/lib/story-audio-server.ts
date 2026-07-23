import { supabaseAdmin } from './supabase-admin';

const BUCKET = 'story-audio';

export type SentenceAudioLang = 'en' | 'rw';

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
  lang?: SentenceAudioLang;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  const suffix = input.lang === 'rw' ? '-rw' : '';
  const path = `${input.householdId}/${input.storyId}/${input.sentenceId}${suffix}.${ext}`;

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
  audioUrl: string,
  lang: SentenceAudioLang = 'en'
) {
  const { data: story } = await supabaseAdmin
    .from('stories')
    .select('id')
    .eq('id', storyId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!story) throw new Error('Story not found');

  const column = lang === 'rw' ? 'kinyarwanda_audio_url' : 'audio_url';
  const { data, error } = await supabaseAdmin
    .from('story_sentences')
    .update({ [column]: audioUrl })
    .eq('id', sentenceId)
    .eq('story_id', storyId)
    .select(`id, ${column}`)
    .single();

  if (error || !data) {
    const message = error?.message ?? 'Failed to save sentence audio';
    if (lang === 'rw' && message.toLowerCase().includes('kinyarwanda_audio_url')) {
      throw new Error(
        'Kinyarwanda audio is not set up yet. Run supabase/stories_schema.sql in the Supabase SQL Editor (adds kinyarwanda_audio_url).'
      );
    }
    throw new Error(message);
  }
  return String((data as Record<string, unknown>)[column] ?? audioUrl);
}
