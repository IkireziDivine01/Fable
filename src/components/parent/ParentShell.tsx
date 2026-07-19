'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import logo from '@/assets/darklogo.svg';
import {
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  HomeIcon,
  PlusIcon,
  SparklesIcon,
  UsersIcon,
  XMarkIcon,
} from '@/components/HeroIcons';
import { displayRole } from '@/lib/roles';

const CREATE_LINKS = [
  { href: '/parent/create-story', label: 'AI story', icon: SparklesIcon },
  { href: '/parent/quick-story', label: 'Quick 2-sentence', icon: BookOpenIcon },
  { href: '/parent/add-story', label: 'Add from source', icon: PlusIcon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/parent/dashboard') {
    return pathname === '/parent/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCreateRoute(pathname: string) {
  return (
    pathname.startsWith('/parent/create-story') ||
    pathname.startsWith('/parent/quick-story') ||
    pathname.startsWith('/parent/add-story') ||
    pathname.includes('/immersive')
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-body-md text-sm transition ${
        active
          ? 'bg-[#520e33] text-white shadow-sm shadow-[#520e33]/20'
          : 'text-[#524348] hover:bg-[#fff0eb] hover:text-[#520e33]'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const createOpenDefault = isCreateRoute(pathname);
  const [createOpen, setCreateOpen] = useState(createOpenDefault);

  useEffect(() => {
    if (createOpenDefault) setCreateOpen(true);
  }, [createOpenDefault]);

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      <NavLink
        href="/parent/dashboard"
        label="Home"
        icon={HomeIcon}
        active={isActive(pathname, '/parent/dashboard')}
        onNavigate={onNavigate}
      />

      <NavLink
        href="/parent/library"
        label="Library"
        icon={BookOpenIcon}
        active={isActive(pathname, '/parent/library')}
        onNavigate={onNavigate}
      />

      <div>
        <button
          type="button"
          onClick={() => setCreateOpen((open) => !open)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body-md text-sm transition ${
            createOpenDefault
              ? 'bg-[#fff0eb] text-[#520e33]'
              : 'text-[#524348] hover:bg-[#fff0eb] hover:text-[#520e33]'
          }`}
          aria-expanded={createOpen}
        >
          <SparklesIcon className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">Create story</span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform ${createOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {createOpen && (
          <div className="mt-1 space-y-0.5 border-l border-[#e9d7d0] py-1 pl-3 ml-5">
            {CREATE_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-body-md text-sm transition ${
                    active
                      ? 'bg-[#520e33] text-white'
                      : 'text-[#524348] hover:bg-[#fff8f5] hover:text-[#520e33]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NavLink
        href="/parent/family"
        label="Family"
        icon={UsersIcon}
        active={isActive(pathname, '/parent/family')}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#e9d7d0] px-5 py-5">
      <Link href="/parent/dashboard" onClick={onNavigate} className="inline-block">
        <Image src={logo} alt="Fable" width={100} height={32} priority />
      </Link>
      <p className="mt-2 font-label-sm uppercase tracking-widest text-[#857278]">Parent space</p>
    </div>
  );
}

function SidebarFooter() {
  const { data: session } = useSession();

  return (
    <div className="mt-auto border-t border-[#e9d7d0] p-4">
      <div className="mb-3 px-1">
        <p className="truncate font-body-md text-sm text-[#1e1b18]">
          {session?.user?.name ?? 'Parent'}
        </p>
        <p className="font-label-sm uppercase tracking-widest text-[#857278]">
          {displayRole(session?.user?.role)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="w-full rounded-xl border border-[#d7c1c7] px-4 py-2.5 font-label-sm uppercase tracking-widest text-[#524348] transition hover:border-[#FF7956] hover:text-[#a7391c]"
      >
        Sign out
      </button>
    </div>
  );
}

export default function ParentShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e9d7d0] bg-white md:flex">
        <SidebarBrand />
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#1e1b18]/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col bg-white shadow-xl shadow-[#520e33]/15">
            <div className="flex items-start justify-between gap-3 border-b border-[#e9d7d0] px-5 py-5">
              <div>
                <Link href="/parent/dashboard" onClick={() => setMobileOpen(false)}>
                  <Image src={logo} alt="Fable" width={100} height={32} />
                </Link>
                <p className="mt-2 font-label-sm uppercase tracking-widest text-[#857278]">
                  Parent space
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-[#524348] hover:bg-[#fff0eb]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#e9d7d0] bg-white/90 px-4 py-3 backdrop-blur-sm md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-[#524348] hover:bg-[#fff0eb]"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Link href="/parent/dashboard">
            <Image src={logo} alt="Fable" width={88} height={28} />
          </Link>
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
