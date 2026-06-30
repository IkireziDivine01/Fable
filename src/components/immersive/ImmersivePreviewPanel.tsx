'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useImmersiveStore } from '@/lib/immersive/store';
import type { EnvironmentType, StoryCharacterSlot } from '@/lib/immersive/types';

const StoryCanvas = dynamic(() => import('./StoryCanvas'), { ssr: false });

interface ImmersivePreviewPanelProps {
  environment: EnvironmentType;
  characters: StoryCharacterSlot[];
  heightClass?: string;
  previewText?: string;
}

export default function ImmersivePreviewPanel({
  environment,
  characters,
  heightClass = 'h-[340px]',
  previewText = 'Your story will unfold here…',
}: ImmersivePreviewPanelProps) {
  const setPreviewWorld = useImmersiveStore((s) => s.setPreviewWorld);
  const setCurrentLine = useImmersiveStore((s) => s.setCurrentLine);

  useEffect(() => {
    setPreviewWorld({ environment, characters });
    setCurrentLine(previewText);
  }, [environment, characters, previewText, setPreviewWorld, setCurrentLine]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#e9d7d0] ${heightClass}`}>
      <StoryCanvas compact />
      <p className="absolute left-4 top-4 rounded-full bg-[#520e33]/80 px-3 py-1 font-label-sm uppercase tracking-widest text-[#ffdbd2]">
        Live preview
      </p>
    </div>
  );
}
