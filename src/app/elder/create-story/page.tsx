'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import ThemeBadge from '@/components/story/ThemeBadge';
import StoryShell, {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
  storyInputClass,
  storyTextareaClass,
} from '@/components/story/StoryShell';
import { SYSTEM_THEME_NAMES } from '@/lib/themes';
import { buildSentencesFromTranscript } from '@/lib/storyHelpers';
import { ensureKinyarwandaOnSentences } from '@/lib/ensureKinyarwanda';

export default function ElderCreateStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['Ubuntu']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      let sentences = buildSentencesFromTranscript(transcript, selectedThemes);
      if (sentences.length < 3) {
        throw new Error('Write at least 3 sentences in your transcript.');
      }

      sentences = await ensureKinyarwandaOnSentences(sentences);

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          transcript,
          themes: selectedThemes,
          sentences,
          generationType: 'manual',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create story');

      router.push(`/elder/story/${result.story.id}/edit-sentences`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
      setLoading(false);
    }
  };

  return (
    <StoryShell
      title="Author studio"
      subtitle="Manual story"
      backHref="/elder/dashboard"
      backLabel="Dashboard"
      maxWidth="lg"
    >
      <StoryPanel>
        <form onSubmit={handleSubmit}>
          <StoryEyebrow>Write by hand</StoryEyebrow>
          <StoryTitle>Craft your family narrative</StoryTitle>
          <StoryLead>
            Paste or type the full transcript. We split sentences and generate Kinyarwanda for each
            line — then you can refine themes, voices, and translations.
          </StoryLead>

          <label className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={storyInputClass}
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Full transcript
            </span>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              required
              rows={10}
              className={storyTextareaClass}
              placeholder="Write the full story. Sentences split at periods, question marks, and exclamation points."
            />
          </label>

          <div className="mb-6">
            <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
              Cultural themes
            </p>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_THEME_NAMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => toggleTheme(theme)}
                  className={`min-h-10 rounded-full transition ${
                    selectedThemes.includes(theme) ? 'ring-2 ring-[#520e33] ring-offset-2' : 'opacity-60'
                  }`}
                >
                  <ThemeBadge label={theme} />
                </button>
              ))}
            </div>
          </div>

          {error && <StoryAlert message={error} />}
          <StoryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Translating & creating…' : 'Continue to sentence editor'}
          </StoryButton>
        </form>
      </StoryPanel>
    </StoryShell>
  );
}
