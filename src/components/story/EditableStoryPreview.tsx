'use client';

import { useState } from 'react';
import ThemeBadge from '@/components/story/ThemeBadge';
import { StoryButton, storyTextareaClass } from '@/components/story/StoryShell';
import type { GeneratedStoryPayload, StorySentenceInput } from '@/lib/storyHelpers';

interface EditableStoryPreviewProps {
  story: GeneratedStoryPayload;
  onStoryChange: (story: GeneratedStoryPayload) => void;
  onPublish: () => void;
  publishing?: boolean;
  continueLabel?: string;
}

export default function EditableStoryPreview({
  story,
  onStoryChange,
  onPublish,
  publishing = false,
  continueLabel = 'Save & continue to voice',
}: EditableStoryPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateSentence = (index: number, patch: Partial<StorySentenceInput>) => {
    const sentences = story.sentences.map((s, i) => (i === index ? { ...s, ...patch } : s));
    const transcript = sentences.map((s) => s.sentenceText).join(' ');
    onStoryChange({ ...story, sentences, transcript });
  };

  return (
    <div className="rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase tracking-widest text-[#857278]">Your story</p>
          <input
            value={story.title}
            onChange={(e) => onStoryChange({ ...story, title: e.target.value })}
            className="mt-1 w-full bg-transparent font-headline-md text-headline-md text-[#1e1b18] outline-none focus:ring-0"
          />
        </div>
        <p className="rounded-full bg-[#fff8f5] px-3 py-1 text-sm text-[#524348] ring-1 ring-[#e9d7d0]">
          {story.sentences.length} sentences · tap to edit
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {story.themes.map((theme) => (
          <ThemeBadge key={theme} label={theme} />
        ))}
      </div>

      <ol className="mb-6 space-y-3">
        {story.sentences.map((sentence, index) => {
          const isEditing = editingIndex === index;
          return (
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

              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={sentence.sentenceText}
                    onChange={(e) => updateSentence(index, { sentenceText: e.target.value })}
                    rows={3}
                    className={storyTextareaClass}
                    autoFocus
                  />
                  <input
                    value={sentence.kinyarwandaText ?? ''}
                    onChange={(e) => updateSentence(index, { kinyarwandaText: e.target.value })}
                    placeholder="Kinyarwanda line (required)"
                    required
                    className={storyTextareaClass}
                  />
                  {!sentence.kinyarwandaText?.trim() && (
                    <p className="text-xs text-[#a7391c]">Kinyarwanda is required for every sentence.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="text-sm text-[#520e33] underline-offset-2 hover:underline"
                  >
                    Done editing
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingIndex(index)}
                  className="w-full text-left"
                >
                  <p className="font-body-md text-[#1e1b18]">{sentence.sentenceText}</p>
                  {sentence.kinyarwandaText?.trim() ? (
                    <p className="mt-2 text-sm italic text-[#524348]">{sentence.kinyarwandaText}</p>
                  ) : (
                    <p className="mt-2 text-sm text-[#a7391c]">Add Kinyarwanda translation</p>
                  )}
                  <p className="mt-2 text-xs text-[#857278]">Click to edit this line only</p>
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <StoryButton
        onClick={onPublish}
        disabled={
          publishing || story.sentences.some((s) => !s.kinyarwandaText?.trim())
        }
        className="w-full"
      >
        {publishing
          ? 'Saving…'
          : story.sentences.some((s) => !s.kinyarwandaText?.trim())
            ? 'Add Kinyarwanda to every sentence'
            : continueLabel}
      </StoryButton>
    </div>
  );

}
