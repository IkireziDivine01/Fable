'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import AppHeader from '@/components/AppHeader';

interface StoryShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '6xl';
}

const widthClass = {
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-3xl',
  '6xl': 'max-w-6xl',
};

export default function StoryShell({
  title,
  subtitle,
  children,
  backHref,
  backLabel = 'Back',
  maxWidth = '6xl',
}: StoryShellProps) {
  return (
    <main className="min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      <AppHeader title={title} subtitle={subtitle} />

      <div className={`mx-auto ${widthClass[maxWidth]} px-4 py-8 md:px-8`}>
        {backHref && (
          <Link
            href={backHref}
            className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e9d7d0] bg-white px-4 font-label-sm uppercase tracking-widest text-[#524348] transition hover:border-[#FF7956]/40 hover:text-[#520e33]"
          >
            ← {backLabel}
          </Link>
        )}

        {children}
      </div>
    </main>
  );
}

export function StoryPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#e9d7d0] bg-white p-6 shadow-sm shadow-[#520e33]/5 md:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function StoryEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-label-md uppercase tracking-[0.22em] text-[#33001d]">{children}</p>
  );
}

export function StoryTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-3 font-headline-lg text-headline-lg text-[#1e1b18]">{children}</h1>;
}

export function StoryLead({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mb-6 font-body-md leading-relaxed text-[#524348] ${className}`}>{children}</p>
  );
}

export function StoryAlert({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' }) {
  const styles =
    tone === 'success'
      ? 'border-[#c8ebd4] bg-[#ecf9f1] text-[#0d5e30]'
      : 'border-[#ffdbd2] bg-[#fff8f5] text-[#a7391c]';

  return (
    <p className={`mb-5 rounded-xl border px-4 py-3 font-body-md text-sm ${styles}`}>{message}</p>
  );
}

export function StoryButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-label-md tracking-widest transition disabled:opacity-50 sm:w-auto';
  const variants = {
    primary:
      'bg-[#FF7956] text-white shadow-lg shadow-[#ff7956]/20 hover:-translate-y-0.5 hover:bg-[#ee6744]',
    secondary:
      'border border-[#520e33] bg-white text-[#520e33] hover:border-[#FF7956] hover:text-[#a7391c]',
    ghost: 'border border-[#e9d7d0] bg-[#fff8f5] text-[#524348] hover:border-[#d7c1c7]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const storyInputClass =
  'min-h-12 w-full rounded-xl border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition placeholder:text-[#857278] focus:border-[#FF7956] focus:ring-2 focus:ring-[#FF7956]/15';

export const storyTextareaClass =
  'w-full rounded-xl border border-[#d7c1c7] bg-white px-4 py-3 font-body-md leading-relaxed text-[#1e1b18] outline-none transition placeholder:text-[#857278] focus:border-[#FF7956] focus:ring-2 focus:ring-[#FF7956]/15';
