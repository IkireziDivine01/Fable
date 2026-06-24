'use client';

import { ArrowRightIcon, BookOpenIcon, GlobeAltIcon } from '@/components/HeroIcons';

export default function ParadigmShiftSection() {
  return (
    <section id="how-it-works" className="bg-[#fbf2ed] py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-5 md:px-16">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-6 font-headline-lg text-headline-lg text-[#1e1b18]">
            The Pivot: Beyond Age Limits
          </h2>
          <div className="mx-auto mb-8 h-1 w-16 bg-[#FF7956]" />
          <p className="font-body-lg text-body-lg leading-relaxed text-[#524348]">
            Addressing the gap in intergenerational storytelling. Fable moves away from restrictive
            age limits to create a platform built for universal, family-wide access, specifically
            focused on Kinyarwanda language learning. We believe learning should be a shared
            experience, not a solitary task.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col justify-between rounded-lg border border-[#d7c1c7]/20 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#d7c1c7]/40 hover:shadow-lg md:col-span-2 md:p-10">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ffdbd2] text-[#520e33]">
                <BookOpenIcon className="h-8 w-8" />
              </div>
              <h3 className="mb-4 font-headline-md text-headline-md text-[#1e1b18]">
                The Storytelling Engine
              </h3>
              <p className="font-body-md text-body-md leading-relaxed text-[#524348]">
                Our engine synchronizes high-fidelity audio with interactive text, allowing families
                to explore myths and histories in tandem. The focus remains on the content, with the
                UI receding into the background.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 font-label-md text-[#FF7956] transition-all hover:gap-3">
              <span>EXPLORE THE ENGINE</span>
              <ArrowRightIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-[#d7c1c7]/10 bg-[#520e33] p-8 text-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg md:col-span-1 md:p-10">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-[#ffdbd2]">
                <GlobeAltIcon className="h-8 w-8" />
              </div>
              <h3 className="mb-4 font-headline-md text-headline-md">Linguistic Rooting</h3>
              <p className="font-body-md text-body-md leading-relaxed text-white/80">
                By focusing on Kinyarwanda, we are not just teaching a language; we are rooting the
                diaspora back into their cultural soil through the power of narrative.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
