'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import logo from '@/assets/darklogo.svg';
import { BookOpenIcon } from '@/components/HeroIcons';

const NAV = [
  { href: '/kid/library', label: 'My stories', icon: BookOpenIcon },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function KidShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const inStory = pathname.startsWith('/kid/story/');
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Friend';

  if (inStory) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden text-[#1e1b18]">
      {/* Soft storybook atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% -10%, #ffdbd2 0%, transparent 55%), radial-gradient(ellipse 70% 45% at 100% 0%, #ffe8c8 0%, transparent 50%), linear-gradient(180deg, #fff8f5 0%, #fff3ec 40%, #fff8f5 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(#d7c1c7 0.7px, transparent 0.7px)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(180deg, black 0%, transparent 70%)',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[#e9d7d0]/60 bg-[#fff8f5]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <Link href="/kid/library" className="flex items-center gap-2.5">
            <Image src={logo} alt="Fable" className="h-8 w-auto" priority />
            <span className="hidden font-headline-md text-lg text-[#520e33] sm:inline">
              Fable
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <p className="rounded-2xl bg-white/70 px-3 py-1.5 font-body-sm text-sm text-[#524348] shadow-sm ring-1 ring-[#e9d7d0]/80">
              Hi, <span className="font-semibold text-[#520e33]">{firstName}</span>
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-xl px-2.5 py-1.5 font-body-sm text-sm text-[#857278] hover:bg-white/60 hover:text-[#520e33]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-5 md:px-6 md:pt-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9d7d0]/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(82,14,51,0.06)] backdrop-blur-md"
        aria-label="Kid navigation"
      >
        <div className="mx-auto flex max-w-4xl">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 px-3 py-3 transition ${
                  active ? 'text-[#520e33]' : 'text-[#857278] hover:text-[#520e33]'
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                    active
                      ? 'bg-[#ffdbd2] shadow-sm shadow-[#ff7956]/20'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-body-sm text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
