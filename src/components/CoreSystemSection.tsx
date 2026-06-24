'use client';

import type { ComponentType, SVGProps } from 'react';
import { CloudArrowDownIcon, HandRaisedIcon, LanguageIcon } from '@/components/HeroIcons';

interface PillarProps {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

function PillarCard({ Icon, title, description }: PillarProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-[#d7c1c7]/20 border-t-4 border-t-[#520e33] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#d7c1c7]/40 hover:shadow-lg">
      <div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-[#e9e1dc] text-[#520e33]">
          <Icon className="h-7 w-7" />
        </div>
        <h4 className="mb-3 font-headline-md text-headline-md text-[#1e1b18]">{title}</h4>
        <p className="font-body-md text-body-md leading-relaxed text-[#524348]">{description}</p>
      </div>
    </div>
  );
}

export default function CoreSystemSection() {
  const pillars: PillarProps[] = [
    {
      Icon: CloudArrowDownIcon,
      title: 'Accessibility: Offline-First PWA',
      description:
        'Guarantees equitable access, resilient and functional regardless of data connectivity. Designed for regions with variable internet speeds or for focused learning environments without distractions.',
    },
    {
      Icon: HandRaisedIcon,
      title: 'Interaction: Gesture-Driven UX',
      description:
        'Replaces abstract menus with tactile, intuitive gestures native to all generations. Swipe to turn pages, pinch to zoom into details, and long-press to hear pronunciation—mimicking the handling of physical artifacts.',
    },
    {
      Icon: LanguageIcon,
      title: 'Content: Universal Instruction',
      description:
        'Multi-language onboarding opening Kinyarwanda literacy to a global audience. Whether you speak English, French, or Swahili, Fable meets you where you are and guides you home.',
    },
  ];

  return (
    <section className="mx-auto max-w-[1120px] px-5 py-24 md:px-16 md:py-32">
      <h2 className="mb-16 text-center font-headline-lg text-headline-lg text-[#1e1b18]">
        Core System Architecture
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((pillar, index) => (
          <PillarCard key={index} {...pillar} />
        ))}
      </div>
    </section>
  );
}
