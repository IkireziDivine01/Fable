'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BookOpenIcon,
  DevicePhoneMobileIcon,
  HandRaisedIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
} from '@/components/HeroIcons';

export default function HeroSection() {
  const [isSwipeHovered, setIsSwipeHovered] = useState(false);

  return (
    <section id="mission" className="relative overflow-hidden px-5 pb-24 pt-12 md:px-16 md:pb-28 md:pt-24">
      <div className="absolute left-1/2 top-14 -z-10 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-[#ffdbd2]/35 blur-3xl" />
      <div className="mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-12 md:grid-cols-12">
        <div className="z-10 md:col-span-7">
          <span className="mb-5 block font-label-md text-label-md uppercase tracking-[0.2em] text-[#33001d]">
            Kinyarwanda Continuity
          </span>
          <h1 className="mb-7 max-w-3xl font-display-lg-mobile text-headline-xl font-bold leading-[1.05] text-[#1e1b18] md:font-display-lg md:text-display-lg">
            Intergenerational Linguistic Literacy and Cultural Continuity
          </h1>
          <p className="mb-9 max-w-xl font-body-lg text-body-lg leading-relaxed text-[#524348]">
            Fable is an offline-first Progressive Web Application (PWA) designed to bridge
            generations through gesture-driven storytelling. We preserve heritage by making
            Kinyarwanda language learning accessible and engaging for everyone.
          </p>

          <div className="mb-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/signin"
              className="flex h-14 items-center justify-center gap-3 rounded-lg bg-[#FF7956] px-8 font-label-md text-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-95"
            >
              <PlayCircleIcon className="h-5 w-5" />
              <span>LAUNCH PROTOTYPE</span>
            </Link>
            <Link
              href="#technical-spec"
              className="flex h-14 items-center justify-center gap-3 rounded-lg border border-[#d7c1c7] bg-white/50 px-8 font-label-md text-label-md tracking-widest text-[#33001d] transition-colors duration-300 hover:bg-white"
            >
              <DevicePhoneMobileIcon className="h-5 w-5" />
              <span>VIEW TECHNICAL SPEC</span>
            </Link>
          </div>

          {/* <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              ['Offline', 'first'],
              ['Gesture', 'native'],
              ['Family', 'profiles'],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-lg border border-[#e9d7d0] bg-white/60 px-4 py-3">
                <p className="font-label-md text-label-md uppercase tracking-widest text-[#33001d]">
                  {label}
                </p>
                <p className="font-body-md text-sm text-[#857278]">{detail}</p>
              </div>
            ))}
          </div> */}
        </div>

        <div className="relative mt-4 md:col-span-5 md:mt-0">
          <div className="relative flex aspect-square items-center justify-center rounded-[2rem] border border-[#e9d7d0] bg-[#f5ece7] p-4 shadow-2xl shadow-[#520e33]/10">
            <div className="absolute inset-4 rounded-[1.5rem] border border-white/70" />
            <div className="relative z-10 h-full w-full overflow-hidden rounded-[1.5rem]">
              <img
                className="h-full w-full object-cover"
                alt="A serene and minimalist digital art portrait of an elderly Rwandan woman and a young child sharing a moment over a glowing digital tablet."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFSbzAczBSmycGmIUXHjJrO8Nm9JmhA49_fvJknf7kzyTcr5zmfqqs-V48d0s1f40rOvx6E3pQgnbYTZZ1jripWt8siwQJeFzrhGTBFGE2AJKpuHzw-2k6wEiZtcVNl9FI9cXJ6CiUkQQl9FtbocKOoPYUHTwF6pSa61BMpes93IMJLSbC7ldPXG8sHnYcd-gFUmvFA6btB-CldqvErHylNCh-1NEv7NjmkJKIvDsxDLpjPkrWAdghDcR9QeWUfcasXfDJR70eKfCT"
              />
            </div>

            <div
              className="absolute -right-3 top-8 z-20 flex items-center gap-3 rounded-lg border border-[#e9d7d0] bg-white p-4 shadow-xl transition-all duration-300 md:-right-6"
              onMouseEnter={() => setIsSwipeHovered(true)}
              onMouseLeave={() => setIsSwipeHovered(false)}
              style={{
                animation: isSwipeHovered ? 'none' : 'bounce 2s infinite',
              }}
            >
              <HandRaisedIcon className="h-8 w-8 text-[#FF7956]" />
              <span className="hidden font-label-sm text-label-sm uppercase tracking-widest text-[#33001d] sm:block">
                Swipe
              </span>
            </div>

            <div className="absolute -bottom-6 left-6 z-20 grid w-[72%] grid-cols-2 gap-3 rounded-lg border border-[#e9d7d0] bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3">
                <BookOpenIcon className="h-7 w-7 text-[#520e33]" />
                <div>
                  <p className="font-label-sm text-label-sm uppercase tracking-widest text-[#33001d]">
                    Stories
                  </p>
                  <p className="font-body-md text-sm text-[#857278]">Synced audio</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-7 w-7 text-[#53705b]" />
                <div>
                  <p className="font-label-sm text-label-sm uppercase tracking-widest text-[#33001d]">
                    Local
                  </p>
                  <p className="font-body-md text-sm text-[#857278]">Saved access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  );
}
