'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { displayRole } from '@/lib/roles';

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'signup'>('code');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [invitationRole, setInvitationRole] = useState<'kid' | 'elder' | null>(null);
  const [invitationHint, setInvitationHint] = useState('');
  const [inviterName, setInviterName] = useState('');

  const handleCodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/validate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invitationCode.trim().toUpperCase() }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Invalid invitation code');
      }

      setInvitationRole(result.role);
      setInvitationHint(result.nameHint ?? '');
      setInviterName(result.inviterName ?? 'Your family');
      setStep('signup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitted(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: invitationCode.trim().toUpperCase(),
          email: formData.get('email'),
          password: formData.get('password'),
          name: formData.get('name'),
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Sign up failed.');
      }

      setSubmitted(true);
      setTimeout(() => router.push('/auth/signin'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      reverse
      aside={
        <>
          <AuthBrand />
          <div className="max-w-md">
            <p className="mb-4 font-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              Invited in
            </p>
            <h2 className="font-headline-lg leading-tight">
              A parent opened the door — you&apos;re expected.
            </h2>
            <p className="mt-4 font-body-md leading-relaxed text-white/75">
              Invitation codes are single-use and expire in 30 days. Once you join, you enter the
              household immediately — no approval wait.
            </p>
          </div>
        </>
      }
    >
      <AuthBrand />

      {step === 'code' ? (
        <>
          <AuthEyebrow>Join with code</AuthEyebrow>
          <AuthTitle>Enter your invitation.</AuthTitle>
          <AuthLead>
            A parent shared a code with you. Learners explore stories; authors record them.
          </AuthLead>

          {error && <AuthError message={error} />}

          <form onSubmit={handleCodeSubmit} className="space-y-5">
            <AuthField label="Invitation code">
              <input
                type="text"
                required
                placeholder="ABC123DEF456"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                maxLength={12}
                className={`${authInputClass} uppercase tracking-widest`}
              />
            </AuthField>

            <AuthSubmit disabled={isSubmitting}>
              {isSubmitting ? 'CHECKING…' : 'CONTINUE'}
            </AuthSubmit>
          </form>

          <p className="mt-6 text-center font-body-md text-sm text-[#857278]">
            No code?{' '}
            <Link href="/auth/signup/kid" className="font-semibold text-[#a7391c] hover:underline">
              Request parent approval
            </Link>
            {' · '}
            <Link href="/auth/signup" className="font-semibold text-[#a7391c] hover:underline">
              Other paths
            </Link>
          </p>
        </>
      ) : (
        <>
          <AuthEyebrow>{displayRole(invitationRole)} invite</AuthEyebrow>
          <AuthTitle>
            {invitationRole === 'kid' ? 'Welcome, learner.' : 'Welcome, author.'}
          </AuthTitle>
          <AuthLead>
            Invited by <span className="font-semibold text-[#1e1b18]">{inviterName}</span>.
            {invitationHint ? ` This code was meant for ${invitationHint}.` : ''}
          </AuthLead>

          {error && <AuthError message={error} />}
          {submitted && <AuthSuccess message="Account created — redirecting to sign in…" />}

          <form onSubmit={handleSignupSubmit} className="space-y-5">
            <AuthField label="Full name">
              <input
                type="text"
                name="name"
                required
                placeholder={invitationHint || 'Your name'}
                className={authInputClass}
              />
            </AuthField>

            <AuthField label="Email">
              <input type="email" name="email" required className={authInputClass} />
            </AuthField>

            <AuthField label="Password">
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className={authInputClass}
              />
            </AuthField>

            <AuthSubmit disabled={isSubmitting || submitted}>
              {isSubmitting ? 'CREATING…' : 'CREATE ACCOUNT'}
            </AuthSubmit>

            <button
              type="button"
              onClick={() => {
                setStep('code');
                setError('');
              }}
              className="w-full text-center font-body-md text-sm text-[#857278] hover:text-[#524348]"
            >
              Use a different code
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
