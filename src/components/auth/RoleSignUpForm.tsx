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

type SignupRole = 'parent' | 'elder' | 'kid';

export default function RoleSignUpPage({ role }: { role: SignupRole }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = {
    parent: {
      eyebrow: 'Parent account',
      title: 'Begin your household library.',
      lead: 'You will manage learners, approve accounts, and invite family authors.',
      showHousehold: true,
      showParentEmail: false,
    },
    elder: {
      eyebrow: 'Author account',
      title: 'Open your storytelling studio.',
      lead: 'Create a space to record, shape, and share family narratives.',
      showHousehold: true,
      showParentEmail: false,
    },
    kid: {
      eyebrow: 'Learner account',
      title: 'Ask to join your family library.',
      lead: 'We will notify your parent by email. You can sign in once they approve you.',
      showHousehold: false,
      showParentEmail: true,
    },
  }[role];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          household: formData.get('household'),
          parentEmail: formData.get('parentEmail'),
          email: formData.get('email'),
          password: formData.get('password'),
          role,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Sign up failed.');
      }

      if (result.pending) {
        setSuccess(
          `Account created. ${result.parentName ? `${result.parentName} ` : 'Your parent '}must approve you before you can explore stories.`
        );
        setTimeout(() => router.push('/auth/signin'), 2500);
        return;
      }

      setSuccess('Account created. Redirecting to sign in…');
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
              Fable family roles
            </p>
            <h2 className="mb-4 font-headline-lg leading-tight">
              Built for intergenerational trust.
            </h2>
            <p className="font-body-md leading-relaxed text-white/75">
              Parents guard the threshold. Authors carry the voice forward. Learners grow inside a
              circle that stays private to your household.
            </p>
          </div>
        </>
      }
    >
      <AuthBrand />
      <AuthEyebrow>{copy.eyebrow}</AuthEyebrow>
      <AuthTitle>{copy.title}</AuthTitle>
      <AuthLead>{copy.lead}</AuthLead>

      {error && <AuthError message={error} />}
      {success && <AuthSuccess message={success} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField label="Full name">
          <input type="text" name="name" required placeholder="Your name" className={authInputClass} />
        </AuthField>

        {copy.showHousehold && (
          <AuthField label="Household name">
            <input
              type="text"
              name="household"
              required
              placeholder="e.g. Umutesi Family"
              className={authInputClass}
            />
          </AuthField>
        )}

        {copy.showParentEmail && (
          <AuthField label="Parent's email">
            <input
              type="email"
              name="parentEmail"
              required
              placeholder="parent@family.org"
              className={authInputClass}
            />
          </AuthField>
        )}

        <AuthField label="Your email">
          <input
            type="email"
            name="email"
            required
            placeholder="you@email.com"
            className={authInputClass}
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className={authInputClass}
          />
        </AuthField>

        <AuthSubmit disabled={isSubmitting || !!success}>
          {isSubmitting ? 'CREATING…' : 'CREATE ACCOUNT'}
        </AuthSubmit>
      </form>

      <p className="mt-6 text-center font-body-md text-sm text-[#857278]">
        <Link href="/auth/signup" className="text-[#a7391c] hover:underline">
          ← Choose a different path
        </Link>
      </p>
    </AuthShell>
  );
}
