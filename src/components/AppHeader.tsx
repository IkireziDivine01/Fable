'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import logo from '@/assets/darklogo.svg';
import { displayRole } from '@/lib/roles';

export default function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { data: session } = useSession();

  return (
    <header className="border-b border-[#e9d7d0] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="flex items-center gap-5">
          <Link href="/">
            <Image src={logo} alt="Fable" width={96} height={30} />
          </Link>
          <div className="hidden border-l border-[#e9d7d0] pl-5 sm:block">
            <p className="font-label-sm uppercase tracking-widest text-[#857278]">{title}</p>
            {subtitle && (
              <p className="font-body-md text-sm text-[#524348]">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="font-body-md text-sm text-[#1e1b18]">{session?.user?.name}</p>
            <p className="font-label-sm uppercase tracking-widest text-[#857278]">
              {displayRole(session?.user?.role)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-xl border border-[#d7c1c7] px-4 py-2 font-label-sm uppercase tracking-widest text-[#524348] transition hover:border-[#FF7956] hover:text-[#a7391c]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
