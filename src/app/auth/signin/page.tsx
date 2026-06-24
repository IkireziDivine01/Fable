'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signIn as signInWithCredentials } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import logo from '@/assets/darklogo.svg';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  HandRaisedIcon,
  ShieldCheckIcon,
} from '@/components/HeroIcons';

const roles = [
  { value: 'parent', label: 'Parent', description: 'Manage family profiles' },
  { value: 'learner', label: 'Learner', description: 'Continue story lessons' },
  { value: 'elder', label: 'Elder', description: 'Record and guide stories' },
];

export default function SignIn() {
  const router = useRouter();
  const [role, setRole] = useState(roles[0].value);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitted(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    const result = await signInWithCredentials('credentials', {
      email,
      password,
      role,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError('Check your email and password, then try again.');
      return;
    }

    setSubmitted(true);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#fff8f5] px-5 py-8 text-[#1e1b18] md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1120px] grid-cols-1 overflow-hidden rounded-lg border border-[#e9d7d0] bg-white shadow-2xl shadow-[#520e33]/10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden bg-[#520e33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,219,210,0.22),_transparent_35%)]" />
          <div className="relative z-10">
            <Link href="/" className="inline-flex rounded-md bg-white/95 px-4 py-3">
              <Image src={logo} alt="Fable" width={105} height={32} />
            </Link>
          </div>

          <div className="relative z-10 max-w-md">
            <p className="mb-5 font-label-md text-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              Welcome Back
            </p>
            <h1 className="mb-6 font-headline-xl text-headline-xl leading-tight">
              Pick up the story where your family left it.
            </h1>
            <p className="font-body-lg text-body-lg leading-relaxed text-white/75">
              Access saved lessons, offline storybooks, and shared progress for every generation in
              your household.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { Icon: BookOpenIcon, label: 'Stories' },
              { Icon: HandRaisedIcon, label: 'Gesture' },
              { Icon: ShieldCheckIcon, label: 'Private' },
            ].map(({ Icon, label }) => (
              <div key={label} className="rounded-lg border border-white/15 bg-white/10 p-4">
                <Icon className="mb-3 h-7 w-7 text-[#ffdbd2]" />
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-white/85">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 inline-flex lg:hidden">
              <Image src={logo} alt="Fable" width={105} height={32} />
            </Link>

            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.2em] text-[#33001d]">
              Sign In
            </p>
            <h2 className="mb-4 font-headline-lg text-headline-lg text-[#1e1b18]">
              Enter your family library.
            </h2>
            <p className="mb-8 font-body-md text-body-md leading-relaxed text-[#524348]">
              Choose your profile type and sign in to continue learning, listening, and sharing
              Kinyarwanda stories.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset>
                <legend className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                  Profile Type
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {roles.map((item) => (
                    <label
                      key={item.value}
                      className={`cursor-pointer rounded-lg border p-4 transition-all ${
                        role === item.value
                          ? 'border-[#FF7956] bg-[#fff1ec] text-[#33001d]'
                          : 'border-[#e9d7d0] bg-white text-[#524348] hover:border-[#d7c1c7]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={item.value}
                        checked={role === item.value}
                        onChange={(event) => setRole(event.target.value)}
                        className="sr-only"
                      />
                      <span className="block font-label-md text-label-md uppercase tracking-widest">
                        {item.label}
                      </span>
                      <span className="mt-2 block font-body-md text-sm leading-snug opacity-75">
                        {item.description}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

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

              <label className="block">
                <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Enter your password"
                  className="h-13 w-full rounded-lg border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956]"
                />
              </label>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-3 font-body-md text-sm text-[#524348]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#d7c1c7] accent-[#FF7956]"
                  />
                  Keep me signed in
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#FF7956] px-8 font-label-md text-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-95"
              >
                <span>{isSubmitting ? 'SIGNING IN' : 'SIGN IN'}</span>
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </form>

            {error && (
              <p className="mt-5 rounded-lg border border-[#ffdbd2] bg-[#fff8f5] px-4 py-3 font-body-md text-sm text-[#a7391c]">
                {error}
              </p>
            )}

            {submitted && (
              <p className="mt-5 flex items-center gap-2 rounded-lg bg-[#fff1ec] px-4 py-3 font-body-md text-sm text-[#a7391c]">
                <CheckCircleIcon className="h-5 w-5 shrink-0" />
                You are signed in for this prototype session.
              </p>
            )}

            <p className="mt-8 text-center font-body-md text-sm text-[#857278]">
              Need a family space?{' '}
              <Link href="/auth/signup" className="font-semibold text-[#a7391c]">
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
