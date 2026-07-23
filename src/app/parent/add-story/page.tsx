'use client';

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

export default function ParentAddStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [transcript, setTranscript] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['Ubuntu']);
  const [publishNow, setPublishNow] = useState(true);
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

      if (!source.trim()) {
        throw new Error('Please cite where this story comes from.');
      }

      sentences = await ensureKinyarwandaOnSentences(sentences);
      const normalizedTranscript = sentences.map((s) => s.sentenceText).join(' ');

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          source: source.trim(),
          transcript: normalizedTranscript,
          themes: selectedThemes,
          sentences,
          generationType: 'manual',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add story');

      const storyId = result.story.id as string;

      if (publishNow) {
        const publishRes = await fetch(`/api/stories/${storyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'publish' }),
        });
        if (!publishRes.ok) {
          const publishErr = await publishRes.json();
          throw new Error(publishErr.error || 'Story saved but publishing failed');
        }
        router.push('/parent/dashboard?added=1');
        return;
      }

      router.push(`/parent/story/${storyId}/immersive`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add story');
      setLoading(false);
    }
  };

  return (
    <StoryShell
      title="Add a story"
      subtitle="From a book, oral tradition, or elsewhere"
      backHref="/parent/dashboard"
      backLabel="Home"
      maxWidth="lg"
      embedded
    >
      <StoryPanel>
        <form onSubmit={handleSubmit}>
          <StoryEyebrow>Manual entry</StoryEyebrow>
          <StoryTitle>Add a story to your library</StoryTitle>
          <StoryLead>
            Paste or type the full text in English or Kinyarwanda and cite where it comes from. We
            translate the other language for each line so learners can switch languages.
          </StoryLead>

          <label className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Story title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={storyInputClass}
              placeholder="The Market of Many Hands"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
              Source
            </span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              className={storyInputClass}
              placeholder='e.g. Anansi the Spider by Gerald McDermott, or Grandmother oral telling'
            />
            <p className="mt-2 font-body-sm text-sm text-[#857278]">
              Book title & author, oral tradition, family archive — whatever helps your household
              remember where this story lives.
            </p>
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
              placeholder="Write in English or Kinyarwanda. Sentences split at periods, question marks, and exclamation points."
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

          <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#d7c1c7] text-[#520e33] focus:ring-[#FF7956]"
            />
            <span>
              <span className="block font-body-md text-[#1e1b18]">Publish to learner library now</span>
              <span className="font-body-sm text-sm text-[#857278]">
                Learners can read it immediately. Uncheck to save as draft and set up immersive mode
                first.
              </span>
            </span>
          </label>

          {error && <StoryAlert message={error} />}
          <StoryButton type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Translating & adding…'
              : publishNow
                ? 'Add & publish'
                : 'Save draft'}
          </StoryButton>
        </form>
      </StoryPanel>
    </StoryShell>
  );
}
