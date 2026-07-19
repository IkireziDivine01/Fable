'use client';

import { X } from 'lucide-react';
import { useImmersiveStore } from '@/lib/immersive/store';

export default function HotspotCard() {
  const hotspots = useImmersiveStore((s) => s.hotspots);
  const activeHotspotId = useImmersiveStore((s) => s.activeHotspotId);
  const setActiveHotspot = useImmersiveStore((s) => s.setActiveHotspot);
  const displayLanguage = useImmersiveStore((s) => s.displayLanguage);
  const engagementMode = useImmersiveStore((s) => s.engagementMode);
  const huntReveal = useImmersiveStore((s) => s.huntReveal);
  const setHuntReveal = useImmersiveStore((s) => s.setHuntReveal);

  const hotspot = hotspots.find((h) => h.id === activeHotspotId);
  const isHunt = engagementMode === 'hunt' && Boolean(huntReveal);

  if (!hotspot && !isHunt) return null;

  const useRw = displayLanguage === 'rw';
  const title = isHunt
    ? useRw && huntReveal?.titleRw?.trim()
      ? huntReveal.titleRw.trim()
      : (huntReveal?.title ?? '')
    : useRw && hotspot?.titleRw?.trim()
      ? hotspot.titleRw.trim()
      : (hotspot?.title ?? '');
  const body = isHunt
    ? useRw && huntReveal?.bodyRw?.trim()
      ? huntReveal.bodyRw.trim()
      : (huntReveal?.body ?? '')
    : useRw && hotspot?.bodyRw?.trim()
      ? hotspot.bodyRw.trim()
      : (hotspot?.body ?? '');

  const close = () => {
    setActiveHotspot(null);
    if (isHunt) setHuntReveal(null);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-4 md:top-28">
      <div
        role="dialog"
        aria-label={title}
        className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-[#C4A574]/55 bg-[#241810]/95 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-sm"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-label-sm uppercase tracking-[0.22em] text-[#C4A574]">
              {isHunt ? 'Found it' : 'Explore'}
            </p>
            <h3
              className="mt-0.5 text-lg text-[#fff8f5]"
              style={{ fontFamily: "'Baloo 2', cursive, sans-serif" }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C4A574]/40 text-[#ffdbd2] hover:border-[#C4A574]"
          >
            <X size={16} strokeWidth={2.25} />
          </button>
        </div>
        <p className="font-body-md text-sm leading-relaxed text-[#ffdbd2]/90">{body}</p>
        <button
          type="button"
          onClick={close}
          className="mt-3 min-h-10 w-full rounded-xl bg-[#FF7956] px-4 font-label-md tracking-widest text-white"
        >
          {isHunt ? 'Found it!' : 'Got it'}
        </button>
      </div>
    </div>
  );
}
