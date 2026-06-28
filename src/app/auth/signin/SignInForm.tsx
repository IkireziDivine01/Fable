'use client';

import Link from 'next/link';
import { signIn as signInWithCredentials, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import {
  AuthBrand,
  AuthError,
  AuthEyebrow,
  AuthField,
  AuthLead,
  AuthShell,
  AuthSubmit,
  AuthSuccess,
  AuthTitle,
  authInputClass,
} from '@/components/auth/AuthShell';
import { ArrowRightIcon, BookOpenIcon, HandRaisedIcon, ShieldCheckIcon } from '@/components/HeroIcons';
import { roleHome } from '@/lib/roles';

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
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
      redirect: false,
    });

    if (result?.error) {
      setError('Check your email and password, then try again.');
      setIsSubmitting(false);
      return;
    }

    const session = await update();
    setSubmitted(true);
    setIsSubmitting(false);

    const callbackUrl = searchParams.get('callbackUrl');
    const destination =
      callbackUrl && !callbackUrl.startsWith('/auth')
        ? callbackUrl
        : roleHome(session?.user?.role, session?.user?.accountStatus);

    setTimeout(() => router.push(destination), 600);
  };

  return (
    <AuthShell
      reverse
      aside={
        <>
          <AuthBrand />
          <div className="max-w-md">
            <p className="mb-5 font-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              Welcome back
            </p>
            <h2 className="mb-6 font-headline-xl leading-tight">
              Pick up the story where your family left it.
            </h2>
            <p className="font-body-lg leading-relaxed text-white/75">
              Parents, authors, and learners each enter through the same door — then find their own
              corner of the library.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: BookOpenIcon, label: 'Stories' },
              { Icon: HandRaisedIcon, label: 'Gesture' },
              { Icon: ShieldCheckIcon, label: 'Private' },
            ].map(({ Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/15 bg-white/10 p-4">
                <Icon className="mb-3 h-7 w-7 text-[#ffdbd2]" />
                <p className="font-label-sm uppercase tracking-widest text-white/85">{label}</p>
              </div>
            ))}
          </div>
        </>
      }
    >
      <AuthBrand />
      <AuthEyebrow>Sign in</AuthEyebrow>
      <AuthTitle>Enter your family library.</AuthTitle>
      <AuthLead>
        Use the email and password from your signup or invitation. Pending learners will be guided to
        approval.
      </AuthLead>

      {error && <AuthError message={error} />}
      {submitted && <AuthSuccess message="Signed in — opening your space…" />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField label="Email">
          <input
            type="email"
            name="email"
            required
            placeholder="you@family.org"
            className={authInputClass}
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="Enter your password"
            className={authInputClass}
          />
        </AuthField>

        <AuthSubmit disabled={isSubmitting || submitted}>
          <span className="flex items-center gap-3">
            {isSubmitting ? 'SIGNING IN…' : 'SIGN IN'}
            <ArrowRightIcon className="h-5 w-5" />
          </span>
        </AuthSubmit>
      </form>

      <p className="mt-8 text-center font-body-md text-sm text-[#857278]">
        New to Fable?{' '}
        <Link href="/auth/signup" className="font-semibold text-[#a7391c] hover:underline">
          Choose your path
        </Link>
      </p>
    </AuthShell>
  );
}
