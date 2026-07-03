'use client';

type WizardStepKey =
  | 'prompt'
  | 'review'
  | 'edit'
  | 'world'
  | 'preview'
  | 'voice'
  | 'generating';

interface StepDef {
  key: WizardStepKey;
  label: string;
  short: string;
}

const STEPS: StepDef[] = [
  { key: 'prompt', label: 'Spark', short: 'Idea' },
  { key: 'review', label: 'Gather', short: 'Confirm' },
  { key: 'edit', label: 'Shape', short: 'Edit' },
  { key: 'world', label: 'Place', short: 'World' },
  { key: 'preview', label: 'Walk', short: 'Preview' },
  { key: 'voice', label: 'Speak', short: 'Voice' },
];

const ORDER: WizardStepKey[] = STEPS.map((s) => s.key);

function resolveIndex(step: WizardStepKey): number {
  if (step === 'generating') return ORDER.indexOf('edit');
  return ORDER.indexOf(step);
}

interface StoryWizardProgressProps {
  currentStep: WizardStepKey;
  generating?: boolean;
}

export default function StoryWizardProgress({
  currentStep,
  generating = false,
}: StoryWizardProgressProps) {
  const currentIdx = resolveIndex(currentStep);
  const progressPct =
    currentIdx <= 0 ? 0 : Math.min(100, (currentIdx / (STEPS.length - 1)) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e9d7d0] bg-white px-4 py-5 shadow-sm shadow-[#520e33]/5 md:px-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ffdbd2]/40 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[#520e33]/5 blur-2xl"
        aria-hidden
      />

      <div className="relative mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-label-sm uppercase tracking-[0.28em] text-[#857278]">Your path</p>
          <p className="font-headline-md text-lg text-[#33001d] md:text-xl">
            {generating ? 'The tale is taking form…' : STEPS[currentIdx]?.label ?? 'Begin'}
          </p>
        </div>
        <p className="font-label-sm tabular-nums tracking-widest text-[#857278]">
          {generating ? '…' : `${currentIdx + 1}`}
          <span className="text-[#d7c1c7]"> / </span>
          {STEPS.length}
        </p>
      </div>

      <div className="relative mb-6 h-1.5 overflow-hidden rounded-full bg-[#f3e8e4]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#520e33] via-[#a7391c] to-[#FF7956] transition-all duration-700 ease-out"
          style={{ width: generating ? '62%' : `${progressPct}%` }}
        />
        {generating && (
          <div className="absolute inset-0 animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        )}
      </div>

      <ol className="relative flex justify-between gap-1">
        {STEPS.map((step, idx) => {
          const isGeneratingHere = generating && step.key === 'edit';
          const done = !generating && idx < currentIdx;
          const active = !generating && idx === currentIdx;
          const upcoming = !generating && idx > currentIdx;

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-center justify-center">
                {idx > 0 && (
                  <span
                    className={`absolute right-1/2 top-1/2 h-px w-full -translate-y-1/2 ${
                      done || active || isGeneratingHere ? 'bg-[#520e33]/35' : 'bg-[#e9d7d0]'
                    }`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    isGeneratingHere
                      ? 'scale-110 border-[#FF7956] bg-[#520e33] text-[#ffdbd2] shadow-[0_0_0_4px_rgba(255,121,86,0.25)]'
                      : active
                        ? 'border-[#520e33] bg-[#520e33] text-[#ffdbd2] shadow-md shadow-[#520e33]/20'
                        : done
                          ? 'border-[#520e33] bg-[#ffdbd2] text-[#520e33]'
                          : 'border-[#e9d7d0] bg-[#fff8f5] text-[#857278]'
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden>
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : isGeneratingHere ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF7956] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF7956]" />
                    </span>
                  ) : (
                    <span className="font-label-sm text-[10px] tabular-nums">{idx + 1}</span>
                  )}
                </span>
              </div>
              <span
                className={`hidden text-center font-label-sm uppercase leading-tight tracking-wider sm:block ${
                  active || isGeneratingHere
                    ? 'text-[#520e33]'
                    : done
                      ? 'text-[#524348]'
                      : upcoming
                        ? 'text-[#b8a5ab]'
                        : 'text-[#857278]'
                }`}
              >
                {step.short}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
