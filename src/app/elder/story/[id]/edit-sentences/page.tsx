'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { fetchNarrationAudio } from '@/lib/aiVoice';
import { uploadSentenceAudio } from '@/lib/story-audio-client';
import { SYSTEM_THEME_NAMES } from '@/lib/themes';
import {
  buildSentencesFromTranscript,
  type StorySentenceInput,
} from '@/lib/storyHelpers';

type AiNarrationScope = 'en' | 'rw' | 'both';

interface SentenceRow extends Omit<StorySentenceInput, 'audioUrl' | 'kinyarwandaAudioUrl'> {
  id: string;
  audioUrl?: string | null;
  kinyarwandaAudioUrl?: string | null;
}

function mapSentenceRow(row: Record<string, unknown>, index: number): SentenceRow {
  return {
    id: String(row.id ?? `local-${index}`),
    sentenceText: String(row.sentence_text ?? row.sentenceText ?? ''),
    sentenceOrder: Number(row.sentence_order ?? row.sentenceOrder ?? index),
    themeLabel: String(row.theme_label ?? row.themeLabel ?? 'Ubuntu'),
    elderTalkingPoints: String(row.elder_talking_points ?? row.elderTalkingPoints ?? ''),
    childPrompt: String(row.child_prompt ?? row.childPrompt ?? ''),
    kinyarwandaText: String(row.kinyarwanda_text ?? row.kinyarwandaText ?? ''),
    audioUrl:
      (row.audio_url as string | null | undefined) ??
      (row.audioUrl as string | null | undefined) ??
      null,
    kinyarwandaAudioUrl:
      (row.kinyarwanda_audio_url as string | null | undefined) ??
      (row.kinyarwandaAudioUrl as string | null | undefined) ??
      null,
  };
}

export default function EditSentencesPage() {
  const params = useParams();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [sentences, setSentences] = useState<SentenceRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [aiNarrationScope, setAiNarrationScope] = useState<AiNarrationScope>('both');
  const [generateProgress, setGenerateProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load story');
        setTitle(result.story.title);

        const existing = Array.isArray(result.sentences) ? result.sentences : [];
        if (existing.length > 0) {
          setSentences(
            existing.map((row: Record<string, unknown>, index: number) => mapSentenceRow(row, index))
          );
        } else {
          const themes = Array.isArray(result.story.themes) ? result.story.themes.map(String) : [];
          const seeded = buildSentencesFromTranscript(String(result.story.transcript ?? ''), themes);
          if (seeded.length === 0) {
            throw new Error('This story has no sentences yet. Re-create it or add a transcript first.');
          }
          setSentences(
            seeded.map((row, index) =>
              mapSentenceRow(
                {
                  id: `local-${index}`,
                  sentenceText: row.sentenceText,
                  sentenceOrder: row.sentenceOrder,
                  themeLabel: row.themeLabel ?? 'Ubuntu',
                  kinyarwandaText: row.kinyarwandaText,
                },
                index
              )
            )
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storyId]);

  const voiceStats = useMemo(() => {
    const en = sentences.filter((s) => s.audioUrl).length;
    const rw = sentences.filter((s) => s.kinyarwandaAudioUrl).length;
    return { en, rw, total: sentences.length };
  }, [sentences]);

  const updateSentence = (id: string, patch: Partial<SentenceRow>) => {
    setSentences((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const persistSentences = async (rows: SentenceRow[]): Promise<SentenceRow[]> => {
    const missing = rows
      .map((s, i) => (!s.kinyarwandaText?.trim() ? i + 1 : null))
      .filter((n): n is number => n != null);
    if (missing.length > 0) {
      throw new Error(
        `Kinyarwanda is required for every sentence. Missing on sentence${missing.length === 1 ? '' : 's'} ${missing.join(', ')}.`
      );
    }

    const response = await fetch(`/api/stories/${storyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateSentences',
        sentences: rows.map(({ id, audioUrl, kinyarwandaAudioUrl, ...rest }) => ({
          ...rest,
          id,
          audioUrl: audioUrl ?? undefined,
          kinyarwandaAudioUrl: kinyarwandaAudioUrl ?? undefined,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Save failed');

    const savedRows = Array.isArray(result.sentences)
      ? result.sentences.map((row: Record<string, unknown>, index: number) =>
          mapSentenceRow(row, index)
        )
      : rows;

    return savedRows.map((row: SentenceRow, index: number) => ({
      ...row,
      audioUrl: row.audioUrl ?? rows[index]?.audioUrl ?? null,
      kinyarwandaAudioUrl: row.kinyarwandaAudioUrl ?? rows[index]?.kinyarwandaAudioUrl ?? null,
      elderTalkingPoints: row.elderTalkingPoints || rows[index]?.elderTalkingPoints || '',
      childPrompt: row.childPrompt || rows[index]?.childPrompt || '',
      themeLabel: row.themeLabel || rows[index]?.themeLabel || 'Ubuntu',
    }));
  };

  const saveSentences = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await persistSentences(sentences);
      setSentences(saved);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const generateAllAiVoices = async () => {
    setGeneratingAll(true);
    setError('');
    setGenerateProgress('');
    try {
      let rows = sentences;
      if (rows.some((s) => s.id.startsWith('local-'))) {
        setGenerateProgress('Saving sentences…');
        rows = await persistSentences(rows);
        setSentences(rows);
      }

      const langs: Array<'en' | 'rw'> =
        aiNarrationScope === 'both' ? ['en', 'rw'] : [aiNarrationScope];

      type Job = { sentence: SentenceRow; lang: 'en' | 'rw' };
      const jobs: Job[] = [];
      for (const lang of langs) {
        for (const sentence of rows) {
          const text =
            lang === 'rw'
              ? (sentence.kinyarwandaText ?? '').trim()
              : sentence.sentenceText.trim();
          const hasAudio = lang === 'rw' ? Boolean(sentence.kinyarwandaAudioUrl) : Boolean(sentence.audioUrl);
          if (text && !hasAudio) jobs.push({ sentence, lang });
        }
      }

      if (jobs.length === 0) {
        throw new Error(
          aiNarrationScope === 'both'
            ? 'Every sentence already has English and Kinyarwanda narration (or text is missing).'
            : aiNarrationScope === 'rw'
              ? 'Every sentence already has Kinyarwanda narration, or Kinyarwanda text is missing.'
              : 'Every sentence already has English narration, or English text is missing.'
        );
      }

      const updated = [...rows];
      for (let i = 0; i < jobs.length; i += 1) {
        const { sentence, lang } = jobs[i];
        const label = lang === 'rw' ? 'Kinyarwanda' : 'English';
        setGenerateProgress(`${label} · ${i + 1} of ${jobs.length}`);

        const text =
          lang === 'rw'
            ? (sentence.kinyarwandaText ?? '').trim()
            : sentence.sentenceText.trim();
        const blob = await fetchNarrationAudio(text, {
          lang: lang === 'rw' ? 'rw-RW' : 'en-US',
          characterType: 'grandma',
        });
        const audioUrl = await uploadSentenceAudio(storyId, sentence.id, blob, lang);
        const idx = updated.findIndex((s) => s.id === sentence.id);
        if (idx >= 0) {
          updated[idx] =
            lang === 'rw'
              ? { ...updated[idx], kinyarwandaAudioUrl: audioUrl }
              : { ...updated[idx], audioUrl };
        }
        setSentences([...updated]);
      }
      setGenerateProgress('Done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate AI voices');
    } finally {
      setGeneratingAll(false);
      setTimeout(() => setGenerateProgress(''), 1800);
    }
  };

  const scopeLabel =
    aiNarrationScope === 'both'
      ? 'both languages'
      : aiNarrationScope === 'rw'
        ? 'Kinyarwanda'
        : 'English';

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <StoryEyebrow>Shape each line</StoryEyebrow>
          <StoryLead className="!mb-0">
            Refine themes and translations, record your voice on any line, or generate AI narration
            for English, Kinyarwanda, or both.
          </StoryLead>
        </div>
        <Link
          href={`/elder/story/${storyId}/preview`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FF7956] px-5 font-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 hover:bg-[#ee6744]"
        >
          Preview & publish
        </Link>
      </div>

      <StoryPanel className="mb-6 !p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-label-sm uppercase tracking-widest text-[#857278]">
              AI voice narration
            </p>
            <p className="mt-1 text-sm text-[#524348]">
              Choose a language, then generate for every line that still needs that track. Record
              anytime to replace the English voice on a sentence.
            </p>
            <p className="mt-2 text-xs text-[#857278]">
              Ready: English {voiceStats.en}/{voiceStats.total} · Kinyarwanda {voiceStats.rw}/
              {voiceStats.total}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[20rem]">
            <div
              className="grid grid-cols-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-1"
              role="group"
              aria-label="Narration language"
            >
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'rw', label: 'Kinyarwanda' },
                  { id: 'both', label: 'Both' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAiNarrationScope(option.id)}
                  disabled={generatingAll}
                  className={`min-h-10 rounded-lg px-2 text-sm transition ${
                    aiNarrationScope === option.id
                      ? 'bg-[#520e33] text-white shadow-sm'
                      : 'text-[#524348] hover:bg-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={generateAllAiVoices}
              disabled={saving || generatingAll || sentences.length === 0}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#520e33] px-5 font-label-md tracking-widest text-white transition hover:bg-[#3d0a26] disabled:opacity-50"
            >
              {generatingAll
                ? generateProgress || 'Generating…'
                : `Generate AI · ${scopeLabel}`}
            </button>
          </div>
        </div>
      </StoryPanel>

      {error && <StoryAlert message={error} />}

      <div className="space-y-4">
        {sentences.map((sentence, index) => (
          <StoryPanel key={sentence.id} className="!p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label-sm uppercase tracking-widest text-[#857278]">
                  Sentence {index + 1}
                </span>
                <ThemeBadge label={sentence.themeLabel} />
                {sentence.audioUrl && (
                  <span className="rounded-full bg-[#e8f5ec] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#0d5e30]">
                    EN voice
                  </span>
                )}
                {sentence.kinyarwandaAudioUrl && (
                  <span className="rounded-full bg-[#f3e8ef] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#520e33]">
                    RW voice
                  </span>
                )}
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
              key={`${sentence.id}:${sentence.audioUrl ?? 'none'}`}
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
                    Kinyarwanda (required)
                  </span>
                  <input
                    value={sentence.kinyarwandaText ?? ''}
                    onChange={(e) =>
                      updateSentence(sentence.id, { kinyarwandaText: e.target.value })
                    }
                    required
                    className={storyInputClass}
                  />
                  {!sentence.kinyarwandaText?.trim() && (
                    <p className="mt-1 text-xs text-[#a7391c]">
                      Add the Ikinyarwanda line for this sentence.
                    </p>
                  )}
                </label>
              </div>
            )}
          </StoryPanel>
        ))}
      </div>

      <StoryButton
        onClick={saveSentences}
        disabled={
          saving ||
          sentences.length === 0 ||
          sentences.some((s) => !s.kinyarwandaText?.trim())
        }
        className="mt-8 w-full"
      >
        {saving
          ? 'Saving…'
          : sentences.length === 0
            ? 'No sentences to save'
            : sentences.some((s) => !s.kinyarwandaText?.trim())
              ? 'Add Kinyarwanda to every sentence'
              : 'Save all sentences'}
      </StoryButton>
    </StoryShell>
  );
}
