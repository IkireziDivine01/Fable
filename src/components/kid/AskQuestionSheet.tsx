'use client';

import { FormEvent, useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@/components/HeroIcons';

interface AskQuestionSheetProps {
  open: boolean;
  storyId: string;
  sentenceId?: string | null;
  sentenceOrder?: number | null;
  sentencePreview?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function AskQuestionSheet({
  open,
  storyId,
  sentenceId,
  sentenceOrder,
  sentencePreview,
  onClose,
  onSubmitted,
}: AskQuestionSheetProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          questionText: text,
          sentenceId: sentenceId ?? null,
          sentenceOrder: sentenceOrder ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send your question');
      setDone(true);
      setText('');
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setError('');
    setText('');
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-[#1e1b18]/70 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-question-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#C4A574] bg-[#fff8f5] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e9d7d0] bg-[#520e33] px-4 py-3 text-[#fff8f5]">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#FF7956]" />
            <div>
              <p className="font-label-sm uppercase tracking-widest text-[#ffdbd2]/80">
                Mid-story
              </p>
              <h2 id="ask-question-title" className="font-headline-md text-lg">
                Ask your family
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {done ? (
            <div className="text-center">
              <p className="font-headline-md text-[#520e33]">Question sent!</p>
              <p className="mt-2 font-body-md text-[#524348]">
                Your parent or elder will see it and can answer when they have a moment.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-5 min-h-11 w-full rounded-xl bg-[#FF7956] font-label-sm uppercase tracking-widest text-white"
              >
                Back to story
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              {sentencePreview && (
                <p className="rounded-xl bg-[#fff0eb] px-3 py-2 font-body-sm text-sm italic text-[#524348]">
                  About: “{sentencePreview.slice(0, 120)}
                  {sentencePreview.length > 120 ? '…' : ''}”
                </p>
              )}
              <label className="block">
                <span className="mb-1.5 block font-label-sm uppercase tracking-widest text-[#857278]">
                  What are you wondering?
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Why did they…? What does … mean?"
                  className="w-full resize-none rounded-xl border border-[#e9d7d0] bg-white px-3 py-2.5 font-body-md text-[#1e1b18] outline-none focus:border-[#FF7956]"
                  required
                />
              </label>
              {error && <p className="font-body-sm text-sm text-[#a7391c]">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-11 flex-1 rounded-xl border border-[#e9d7d0] font-label-sm uppercase tracking-widest text-[#524348]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || text.trim().length < 3}
                  className="min-h-11 flex-1 rounded-xl bg-[#520e33] font-label-sm uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {saving ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
