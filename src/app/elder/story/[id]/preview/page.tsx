'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeBadge from '@/components/story/ThemeBadge';
import StoryShell, {
  StoryAlert,
  StoryButton,
  StoryEyebrow,
  StoryLead,
  StoryPanel,
  StoryTitle,
} from '@/components/story/StoryShell';

export default function ElderStoryPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = String(params.id ?? '');
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sentenceCount, setSentenceCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/stories/${storyId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load');
        setTitle(result.story.title);
        setTranscript(result.story.transcript ?? '');
        setThemes(Array.isArray(result.story.themes) ? result.story.themes : []);
        setSentenceCount(result.sentences?.length ?? 0);
        setAudioCount(
          (result.sentences ?? []).filter((s: { audio_url?: string | null }) => s.audio_url).length
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    if (storyId) load();
  }, [storyId]);

  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Publish failed');
      setSuccess(true);
      setTimeout(() => router.push('/elder/dashboard?published=1'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <StoryShell title="Preview" subtitle="Loading…" maxWidth="lg">
        <p className="text-[#524348]">Loading preview…</p>
      </StoryShell>
    );
  }

  return (
    <StoryShell
      title="Preview"
      subtitle={title}
      backHref={`/elder/story/${storyId}/edit-sentences`}
      backLabel="Edit sentences"
      maxWidth="lg"
    >
      <StoryPanel>
        <StoryEyebrow>Ready to share</StoryEyebrow>
        <StoryTitle>{title}</StoryTitle>
        <StoryLead>
          {sentenceCount} sentences · {audioCount} with voice recording
        </StoryLead>

        <div className="mb-4 flex flex-wrap gap-2">
          {themes.map((theme) => (
            <ThemeBadge key={theme} label={theme} />
          ))}
        </div>

        <p className="mb-6 rounded-xl bg-[#fff8f5] p-5 font-body-md leading-relaxed text-[#524348]">
          {transcript}
        </p>

        {error && <StoryAlert message={error} />}
        {success && (
          <StoryAlert message="Published! Redirecting to dashboard…" tone="success" />
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/elder/story/${storyId}/edit-sentences`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#e9d7d0] bg-[#fff8f5] px-5 font-label-md tracking-widest text-[#524348]"
          >
            Back to edit
          </Link>
          <StoryButton onClick={publish} disabled={publishing || success} className="flex-1">
            {publishing ? 'Publishing…' : 'Publish to library'}
          </StoryButton>
        </div>
      </StoryPanel>
    </StoryShell>
  );
}
