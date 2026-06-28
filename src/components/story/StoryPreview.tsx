'use client';

import ThemeBadge from '@/components/story/ThemeBadge';
import { StoryButton } from '@/components/story/StoryShell';
import type { GeneratedStoryPayload } from '@/lib/storyHelpers';

interface StoryPreviewProps {
  story: GeneratedStoryPayload;
  onPublish: () => void;
  onRegenerate?: () => void;
  publishing?: boolean;
  loadingLabel?: string;
}

export default function StoryPreview({
  story,
  onPublish,
  onRegenerate,
  publishing = false,
  loadingLabel = 'Publishing…',
}: StoryPreviewProps) {
  return (
    <div className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase tracking-widest text-[#857278]">Preview</p>
          <h2 className="mt-1 font-headline-md text-headline-md text-[#1e1b18]">{story.title}</h2>
        </div>
        <p className="rounded-full bg-[#fff8f5] px-3 py-1 text-sm text-[#524348] ring-1 ring-[#e9d7d0]">
          {story.sentences.length} sentences
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {story.themes.map((theme) => (
          <ThemeBadge key={theme} label={theme} />
        ))}
      </div>

      <p className="mb-6 max-h-40 overflow-y-auto rounded-xl bg-[#fff8f5] p-4 font-body-md leading-relaxed text-[#524348]">
        {story.transcript}
      </p>

      <ol className="mb-6 space-y-3">
        {story.sentences.map((sentence, index) => (
          <li
            key={`${sentence.sentenceOrder}-${index}`}
            className="rounded-xl border border-[#e9d7d0] bg-[#fff8f5] p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-label-sm uppercase tracking-widest text-[#857278]">
                Sentence {index + 1}
              </span>
              <ThemeBadge label={sentence.themeLabel} />
            </div>
            <p className="font-body-md text-[#1e1b18]">{sentence.sentenceText}</p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onRegenerate && (
          <StoryButton onClick={onRegenerate} disabled={publishing} variant="ghost" className="flex-1">
            Regenerate
          </StoryButton>
        )}
        <StoryButton onClick={onPublish} disabled={publishing} className="flex-1">
          {publishing ? loadingLabel : 'Publish to library'}
        </StoryButton>
      </div>
    </div>
  );
}
