'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SentenceAudioRecorder from '@/components/story/SentenceAudioRecorder';
import ThemeBadge from '@/components/story/ThemeBadge';
import StoryShell, {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  storyInputClass,
  storyTextareaClass,
} from '@/components/story/StoryShell';
import { SYSTEM_THEME_NAMES } from '@/lib/themes';
import type { StorySentenceInput } from '@/lib/storyHelpers';

interface SentenceRow extends Omit<StorySentenceInput, 'audioUrl'> {
  id: string;
  audioUrl?: string | null;
}

export default function EditSentencesPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [sentences, setSentences] = useState<SentenceRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load story');
        setTitle(result.story.title);
        setSentences(
          result.sentences.map((row: Record<string, unknown>, index: number) => ({
            id: String(row.id ?? index),
            sentenceText: String(row.sentence_text),
            sentenceOrder: Number(row.sentence_order ?? index),
            themeLabel: (row.theme_label as string) ?? 'Ubuntu',
            elderTalkingPoints: (row.elder_talking_points as string) ?? '',
            childPrompt: (row.child_prompt as string) ?? '',
            kinyarwandaText: (row.kinyarwanda_text as string) ?? '',
            audioUrl: (row.audio_url as string) ?? null,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storyId]);

  const updateSentence = (id: string, patch: Partial<SentenceRow>) => {
    setSentences((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const saveSentences = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSentences',
          sentences: sentences.map(({ id, audioUrl, ...rest }) => ({
            ...rest,
            id,
            audioUrl: audioUrl ?? undefined,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Save failed');
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <StoryShell title="Edit sentences" subtitle="Loading…" maxWidth="lg">
        <p className="text-[#524348]">Loading sentences…</p>
      </StoryShell>
    );
  }

  return (
    <StoryShell
      title="Edit sentences"
      subtitle={title}
      backHref="/elder/dashboard"
      backLabel="Dashboard"
      maxWidth="lg"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <StoryEyebrow>Shape each line</StoryEyebrow>
          <StoryLead className="!mb-0">
            Add themes, talking points, Kinyarwanda, and a voice for every sentence.
          </StoryLead>
        </div>
        <Link
          href={`/elder/story/${storyId}/preview`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
        >
          Preview & publish
        </Link>
      </div>

      {error && <StoryAlert message={error} />}

      <div className="space-y-4">
        {sentences.map((sentence, index) => (
          <StoryPanel key={sentence.id} className="!p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-label-sm uppercase tracking-widest text-[#857278]">
                  Sentence {index + 1}
                </span>
                <ThemeBadge label={sentence.themeLabel} />
              </div>
              <button
                type="button"
                onClick={() => setEditingId(editingId === sentence.id ? null : sentence.id)}
                className="min-h-10 rounded-lg border border-[#e9d7d0] bg-[#fff8f5] px-4 text-sm text-[#524348]"
              >
                {editingId === sentence.id ? 'Done' : 'Edit details'}
              </button>
            </div>

            <p className="mb-4 font-body-md text-lg leading-relaxed text-[#1e1b18]">
              {sentence.sentenceText}
            </p>

            <SentenceAudioRecorder
              storyId={storyId}
              sentenceId={sentence.id}
              existingUrl={sentence.audioUrl}
              compact
              onUploaded={(url) => updateSentence(sentence.id, { audioUrl: url })}
            />

            {editingId === sentence.id && (
              <div className="mt-4 space-y-3 border-t border-[#e9d7d0] pt-4">
                <label className="block">
                  <span className="mb-1 block font-label-sm uppercase tracking-widest text-[#857278]">
                    Theme
                  </span>
                  <select
                    value={sentence.themeLabel ?? 'Ubuntu'}
                    onChange={(e) => updateSentence(sentence.id, { themeLabel: e.target.value })}
                    className={storyInputClass}
                  >
                    {SYSTEM_THEME_NAMES.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-label-sm uppercase tracking-widest text-[#857278]">
                    Talking points (gateway)
                  </span>
                  <textarea
                    value={sentence.elderTalkingPoints ?? ''}
                    onChange={(e) =>
                      updateSentence(sentence.id, { elderTalkingPoints: e.target.value })
                    }
                    rows={3}
                    className={storyTextareaClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-label-sm uppercase tracking-widest text-[#857278]">
                    Child prompt
                  </span>
                  <input
                    value={sentence.childPrompt ?? ''}
                    onChange={(e) => updateSentence(sentence.id, { childPrompt: e.target.value })}
                    className={storyInputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-label-sm uppercase tracking-widest text-[#857278]">
                    Kinyarwanda (optional)
                  </span>
                  <input
                    value={sentence.kinyarwandaText ?? ''}
                    onChange={(e) =>
                      updateSentence(sentence.id, { kinyarwandaText: e.target.value })
                    }
                    className={storyInputClass}
                  />
                </label>
              </div>
            )}
          </StoryPanel>
        ))}
      </div>

      <StoryButton onClick={saveSentences} disabled={saving} className="mt-8 w-full">
        {saving ? 'Saving…' : 'Save all sentences'}
      </StoryButton>
    </StoryShell>
  );
}
