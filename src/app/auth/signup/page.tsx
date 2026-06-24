'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import logo from '@/assets/darklogo.svg';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  LanguageIcon,
  ShieldCheckIcon,
} from '@/components/HeroIcons';

export default function SignUp() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitted(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '');
    const household = String(formData.get('household') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          household,
          email,
          password,
          role: 'parent',
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Sign up failed. Please try again.');
      }

      setSubmitted(true);
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] px-5 py-8 text-[#1e1b18] md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1120px] grid-cols-1 overflow-hidden rounded-lg border border-[#e9d7d0] bg-white shadow-2xl shadow-[#520e33]/10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-lg">
            <Link href="/" className="mb-10 inline-flex">
              <Image src={logo} alt="Fable" width={105} height={32} />
            </Link>

            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.2em] text-[#33001d]">
              Create Account
            </p>
            <h1 className="mb-4 font-headline-lg text-headline-lg text-[#1e1b18]">
              Start a shared family library.
            </h1>
            <p className="mb-8 font-body-md text-body-md leading-relaxed text-[#524348]">
              Set up the first guardian account, then invite learners and elders as Fable grows
              with your household.
            </p>

            {error && (
              <div className="mb-5 rounded-lg bg-[#fff1ec] px-4 py-4 text-left font-body-md text-sm text-[#a7391c]">
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                    Full Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Aline Umutesi"
                    className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                    Household Name
                  </span>
                  <input
                    type="text"
                    name="household"
                    required
                    placeholder="Umutesi Family"
                    className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@family.org"
                  className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956]"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                    Password
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="Create password"
                    className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                    Primary Language
                  </span>
                  <select
                    name="language"
                    className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors focus:border-[#FF7956]"
                    defaultValue="english"
                  >
                    <option value="english">English</option>
                    <option value="kinyarwanda">Kinyarwanda</option>
                    <option value="french">French</option>
                    <option value="swahili">Swahili</option>
                  </select>
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-[#e9d7d0] bg-[#fff8f5] p-4 font-body-md text-sm leading-relaxed text-[#524348]">
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-[#d7c1c7] accent-[#FF7956]"
                />
                I agree to create a shared Fable library for my household and manage family profiles
                with care.
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#FF7956] px-8 font-label-md text-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-95 disabled:opacity-75"
              >
                <span>{isSubmitting ? 'CREATING...' : 'CREATE FAMILY LIBRARY'}</span>
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </form>

            {submitted && (
              <div className="mt-5 rounded-lg bg-[#f1f5e9] px-4 py-4 text-left font-body-md text-sm text-[#2d5016]">
                <p className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 shrink-0" />
                  Account created! Redirecting to sign in...
                </p>
              </div>
            )}

            <p className="mt-8 text-center font-body-md text-sm text-[#857278]">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-semibold text-[#a7391c]">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <section className="relative hidden bg-[#fbf2ed] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,121,86,0.16),_transparent_34%)]" />
          <div className="relative z-10 rounded-lg border border-[#e9d7d0] bg-white/75 p-6">
            <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.2em] text-[#33001d]">
              What You Unlock
            </p>
            <h2 className="font-headline-lg text-headline-lg leading-tight text-[#1e1b18]">
              A calm space for language, memory, and practice.
            </h2>
          </div>

          <div className="relative z-10 space-y-4">
            {[
              {
                Icon: CloudArrowDownIcon,
                title: 'Offline access',
                description: 'Save stories and lessons for low-connectivity moments.',
              },
              {
                Icon: LanguageIcon,
                title: 'Language pathways',
                description: 'Guide learners from familiar languages toward Kinyarwanda.',
              },
              {
                Icon: ShieldCheckIcon,
                title: 'Family profiles',
                description: 'Keep progress personal while the library stays shared.',
              },
              {
                Icon: BookOpenIcon,
                title: 'Story continuity',
                description: 'Return to the same tale across generations and devices.',
              },
            ].map(({ Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-lg border border-[#e9d7d0] bg-white p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ffdbd2] text-[#520e33]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-headline-md text-xl text-[#1e1b18]">{title}</h3>
                  <p className="mt-1 font-body-md text-sm leading-relaxed text-[#524348]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
