'use client';

import type { ComponentType, SVGProps } from 'react';
import { BookOpenIcon, CloudArrowDownIcon, DevicePhoneMobileIcon } from '@/components/HeroIcons';

interface RequirementProps {
  number: number;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

function RequirementItem({ number, Icon, title, description }: RequirementProps) {
  return (
    <div className="flex gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-[#ffdbd2]">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="mb-2 font-label-sm text-label-sm uppercase tracking-widest text-[#ffdbd2]">
          Requirement {number}
        </p>
        <h5 className="mb-2 font-headline-md text-headline-md text-white">{title}</h5>
        <p className="font-body-md text-body-md leading-relaxed text-white/70">{description}</p>
      </div>
    </div>
  );
}

export default function TechnicalBlueprintSection() {
  const requirements: RequirementProps[] = [
    {
      number: 1,
      Icon: DevicePhoneMobileIcon,
      title: 'User Management & Onboarding',
      description:
        'Low-friction setup for multiple profiles in one household. Each profile tracks personalized learning progress and story history while remaining lightweight.',
    },
    {
      number: 2,
      Icon: BookOpenIcon,
      title: 'Digital Storybook Engine',
      description:
        'Handles gesture inputs, page turns, and synchronized audio/text. Optimized for low-power mobile devices without compromising on aesthetic fidelity.',
    },
    {
      number: 3,
      Icon: CloudArrowDownIcon,
      title: 'Data Synchronization',
      description:
        'Robust background service workers for offline caching and syncing. Local-first storage ensuring your heritage stays with you, even in the most remote locations.',
    },
  ];

  return (
    <section id="technical-spec" className="bg-[#520e33] py-24 text-white md:py-32">
      <div className="mx-auto max-w-[1120px] px-5 md:px-16">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="mb-6 block font-label-md text-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              The Technical Blueprint
            </span>
            <h2 className="mb-10 font-headline-xl text-headline-xl leading-tight">
              System Requirements &amp; Functional Spec
            </h2>
            <div className="space-y-12">
              {requirements.map((req) => (
                <RequirementItem
                  key={req.number}
                  {...req}
                />
              ))}
            </div>
          </div>

          <div className="relative h-full overflow-hidden rounded-lg border border-white/10 shadow-2xl aspect-[4/5] lg:aspect-auto">
            <img
              className="h-full w-full object-cover opacity-60"
              alt="A highly detailed, clean UI concept of the Fable mobile application showing a digital storybook interface."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBQh7QKxgE1Ie-EcSz6ccp6EMbYWICdVOHVAaHzwzyZl-9u55AoyMWZYoHyDW43cZkPHNIG_m1yfTRswuKS0QWP1pbwYCl08LJlYpQDIaTEY3pVbX-ZLsg-3AFuh5mShubxFEfWBnGVNj-dGNoJzjNWLrab1i0xGWGi6kS79wf9oZdxTxCt_yIlvZTz36DP5ZAXtwEnohazCo6neYVUCodC5NTqA_aznf0iHwgsSUP3QXex0wfTOVVMOjJkBQHFu__eh7RX951v2Wl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#520e33] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10">
              <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <p className="mb-2 font-label-sm text-label-sm uppercase tracking-widest text-[#ffdbd2]">
                  Engine Preview
                </p>
                <p className="font-headline-md text-headline-md text-white">
                  v1.2 &quot;Continuity&quot; Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
