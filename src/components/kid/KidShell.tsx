'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import logo from '@/assets/darklogo.svg';
import {
  BookOpenIcon,
  LightBulbIcon,
} from '@/components/HeroIcons';

const NAV = [
  { href: '/kid/library', label: 'Library', icon: BookOpenIcon },
  { href: '/kid/waruziko', label: 'Waruziko', icon: LightBulbIcon },
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
    <div className="flex min-h-[100dvh] flex-col bg-[#fff8f5] text-[#1e1b18]">
      <header className="sticky top-0 z-30 border-b border-[#e9d7d0]/80 bg-[#fff8f5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/kid/library" className="flex items-center gap-2.5">
            <Image src={logo} alt="Fable" className="h-8 w-auto" priority />
            <span className="hidden font-headline-md text-lg text-[#520e33] sm:inline">Fable</span>
          </Link>
          <div className="flex items-center gap-3">
            <p className="font-body-sm text-sm text-[#857278]">
              Hi, <span className="font-semibold text-[#520e33]">{firstName}</span>
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-lg border border-[#e9d7d0] px-3 py-1.5 font-label-sm uppercase tracking-widest text-[#524348] hover:border-[#520e33]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-6 md:pt-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9d7d0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Kid navigation"
      >
        <div className="mx-auto flex max-w-5xl">
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
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                    active ? 'bg-[#ffdbd2]' : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-label-sm text-[11px] uppercase tracking-widest">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
