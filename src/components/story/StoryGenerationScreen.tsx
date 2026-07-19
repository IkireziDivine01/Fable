'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { StoryPanel } from '@/components/story/StoryShell';

interface GenerationStage {
  id: string;
  verb: string;
  detail: string;
  glyph: string;
}

interface PlaceFolkCopy {
  placeVerb: string;
  placeDetail: string;
  folkVerb: string;
  folkDetail: string;
}

type PromptBucket = 'epic' | 'market' | 'forest' | 'home' | 'school' | 'default';

const PLACE_FOLK_BY_BUCKET: Record<PromptBucket, PlaceFolkCopy> = {
  epic: {
    placeVerb: 'Raising the court',
    placeDetail: 'Royal grounds, cattle paths, and courage are settling into place.',
    folkVerb: 'Calling the elders',
    folkDetail: 'Heroes, keepers of law, and brave hearts step into the tale.',
  },
  market: {
    placeVerb: 'Opening the market',
    placeDetail: 'Stalls, voices, and trade smells are gathering around the story.',
    folkVerb: 'Calling the traders',
    folkDetail: 'Sellers, cousins, and bargainers step into the aisle.',
  },
  forest: {
    placeVerb: 'Opening the canopy',
    placeDetail: 'Trees, footpaths, and quiet wildlife are settling into place.',
    folkVerb: 'Calling the wanderers',
    folkDetail: 'Guides, children, and forest friends step under the leaves.',
  },
  home: {
    placeVerb: 'Warming the hearth',
    placeDetail: 'Courtyard light, cooking fire, and familiar walls are taking shape.',
    folkVerb: 'Calling the family',
    folkDetail: 'Grandparents, children, and close kin step into the room.',
  },
  school: {
    placeVerb: 'Opening the schoolyard',
    placeDetail: 'Benches, lessons, and bright morning air are settling into place.',
    folkVerb: 'Calling the learners',
    folkDetail: 'Teachers, classmates, and curious minds step into the day.',
  },
  default: {
    placeVerb: 'Shaping the place',
    placeDetail: 'Light, paths, and the story’s own landmarks are settling into place.',
    folkVerb: 'Calling your characters',
    folkDetail: 'The people at the heart of this tale step into the scene.',
  },
};

function detectPromptBucket(prompt: string | undefined): PromptBucket {
  const text = (prompt ?? '').toLowerCase();
  if (!text.trim()) return 'default';

  if (
    /\b(ndabaga|legend|epic|hero|king|queen|royal|court|warrior|cattle|inyambo|kingdom)\b/.test(
      text
    )
  ) {
    return 'epic';
  }
  if (/\b(market|isoko|stall|trade|vendor|bargain)\b/.test(text)) {
    return 'market';
  }
  if (/\b(forest|ishyamba|hunt|jungle|canopy|woods|tree)\b/.test(text)) {
    return 'forest';
  }
  if (/\b(school|ishuri|classroom|teacher|lesson|pupil)\b/.test(text)) {
    return 'school';
  }
  if (
    /\b(home|urugo|hearth|grandma|grandfather|grandmother|family|kitchen|fire)\b/.test(text)
  ) {
    return 'home';
  }
  return 'default';
}

function buildStages(promptPreview?: string): GenerationStage[] {
  const copy = PLACE_FOLK_BY_BUCKET[detectPromptBucket(promptPreview)];
  return [
    {
      id: 'thread',
      verb: 'Gathering the thread',
      detail: 'Your prompt is the first stitch in a family tapestry.',
      glyph: '✦',
    },
    {
      id: 'story',
      verb: 'Weaving the story',
      detail: 'Sentences are taking shape — values, voices, and heart.',
      glyph: '◈',
    },
    {
      id: 'place',
      verb: copy.placeVerb,
      detail: copy.placeDetail,
      glyph: '△',
    },
    {
      id: 'folk',
      verb: copy.folkVerb,
      detail: copy.folkDetail,
      glyph: '○',
    },
    {
      id: 'finish',
      verb: 'Lighting the fire',
      detail: 'One last breath — your world is almost ready to enter.',
      glyph: '✺',
    },
  ];
}

const STORYTELLING_TIPS = [
  'In Rwanda, stories around the fire pass wisdom from one generation to the next.',
  'Ubuntu reminds us: I am because we are — a perfect thread for family tales.',
  'Umuganda teaches that many hands make light work — just like building a story world.',
  'The best stories leave room for a child to ask one more question.',
];

function Ember({ style }: { style: CSSProperties }) {
  return (
    <span
      className="absolute h-1 w-1 rounded-full bg-[#FF7956] opacity-80 animate-[ember_3s_ease-in-out_infinite]"
      style={style}
      aria-hidden
    />
  );
}

interface StoryGenerationScreenProps {
  promptPreview?: string;
  onCancel?: () => void;
  /** 0–100 when parent knows real completion */
  progressOverride?: number | null;
}

export default function StoryGenerationScreen({
  promptPreview,
  onCancel,
  progressOverride = null,
}: StoryGenerationScreenProps) {
  const stages = useMemo(() => buildStages(promptPreview), [promptPreview]);
  const [stageIndex, setStageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [simProgress, setSimProgress] = useState(4);

  const stage = stages[stageIndex] ?? stages[0];
  const displayProgress = progressOverride ?? simProgress;

  useEffect(() => {
    setStageIndex(0);
  }, [promptPreview]);

  useEffect(() => {
    const stageTimer = window.setInterval(() => {
      setStageIndex((i) => (i < stages.length - 1 ? i + 1 : i));
    }, 3200);
    return () => window.clearInterval(stageTimer);
  }, [stages.length]);

  useEffect(() => {
    const tipTimer = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % STORYTELLING_TIPS.length);
    }, 4500);
    return () => window.clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    if (progressOverride != null) return;

    const tick = window.setInterval(() => {
      setSimProgress((p) => {
        if (p >= 92) return p;
        const bump = stageIndex === stages.length - 1 ? 1.2 : 2.4;
        return Math.min(92, p + bump);
      });
    }, 400);
    return () => window.clearInterval(tick);
  }, [progressOverride, stageIndex, stages.length]);

  useEffect(() => {
    if (progressOverride == null) return;
    setSimProgress(progressOverride);
  }, [progressOverride]);

  return (
    <StoryPanel className="relative overflow-hidden border-[#520e33]/15 bg-gradient-to-b from-[#fff8f5] via-white to-[#fff0ea] px-6 py-10 md:px-10 md:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, #520e33 1px, transparent 1px), radial-gradient(circle at 80% 60%, #520e33 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-lg text-center">
        <p className="mb-2 font-label-sm uppercase tracking-[0.32em] text-[#857278]">
          Story forge
        </p>
        <h2 className="mb-8 font-headline-lg text-2xl leading-tight text-[#33001d] md:text-3xl">
          Your tale is being woven
        </h2>

        <div className="relative mx-auto mb-10 flex h-36 w-36 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-[#520e33]/10 animate-[pulse_2.8s_ease-in-out_infinite]"
            aria-hidden
          />
          <div
            className="absolute inset-3 rounded-full bg-gradient-to-t from-[#520e33] to-[#7a1a4a] shadow-inner shadow-[#33001d]/40"
            aria-hidden
          />
          <div
            className="absolute inset-6 rounded-full bg-gradient-to-t from-[#FF7956] via-[#ff9a7a] to-[#ffdbd2] opacity-90 animate-[pulse_1.6s_ease-in-out_infinite]"
            aria-hidden
          />
          <Ember style={{ left: '18%', top: '22%', animationDelay: '0s' }} />
          <Ember style={{ left: '72%', top: '30%', animationDelay: '0.8s' }} />
          <Ember style={{ left: '55%', top: '12%', animationDelay: '1.4s' }} />
          <Ember style={{ left: '35%', top: '68%', animationDelay: '2.1s' }} />
          <span
            className="relative z-10 font-headline-md text-4xl text-[#ffdbd2] drop-shadow-sm transition-all duration-500"
            aria-hidden
          >
            {stage.glyph}
          </span>
        </div>

        <div className="mb-8 min-h-[5.5rem]">
          <p className="mb-2 font-headline-md text-xl text-[#520e33] transition-all duration-500">
            {stage.verb}
          </p>
          <p className="font-body-md leading-relaxed text-[#524348]">{stage.detail}</p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex justify-between font-label-sm uppercase tracking-widest text-[#857278]">
            <span>Journey</span>
            <span className="tabular-nums">{Math.round(displayProgress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#f3e8e4]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#520e33] via-[#a7391c] to-[#FF7956] transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        <ul className="mb-8 flex flex-wrap justify-center gap-2">
          {stages.map((s, i) => {
            const unlocked = i <= stageIndex;
            const current = i === stageIndex;
            return (
              <li
                key={s.id}
                className={`rounded-full px-3 py-1 font-label-sm uppercase tracking-wider transition-all duration-300 ${
                  current
                    ? 'bg-[#520e33] text-[#ffdbd2] shadow-md shadow-[#520e33]/25'
                    : unlocked
                      ? 'bg-[#ffdbd2] text-[#520e33]'
                      : 'bg-white text-[#b8a5ab] ring-1 ring-[#e9d7d0]'
                }`}
              >
                {unlocked && !current ? '✓ ' : ''}
                {s.verb.split(' ').slice(-1)[0]}
              </li>
            );
          })}
        </ul>

        {promptPreview && (
          <blockquote className="mb-6 rounded-xl border border-[#e9d7d0] bg-white/70 px-4 py-3 text-left">
            <p className="mb-1 font-label-sm uppercase tracking-widest text-[#857278]">
              Starting from
            </p>
            <p className="line-clamp-2 font-body-md italic text-[#524348]">
              &ldquo;{promptPreview}&rdquo;
            </p>
          </blockquote>
        )}

        <p
          key={tipIndex}
          className="animate-[fadeIn_0.6s_ease-out] font-body-md text-sm italic leading-relaxed text-[#857278]"
        >
          {STORYTELLING_TIPS[tipIndex]}
        </p>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 font-label-sm uppercase tracking-widest text-[#857278] underline-offset-4 hover:text-[#520e33] hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </StoryPanel>
  );
}
