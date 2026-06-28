'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  AuthBrand,
  AuthEyebrow,
  AuthLead,
  AuthShell,
  AuthTitle,
} from '@/components/auth/AuthShell';
import { HandRaisedIcon } from '@/components/HeroIcons';

export default function PendingApprovalPage() {
  const { data: session } = useSession();

  return (
    <AuthShell
      aside={
        <>
          <AuthBrand />
          <div className="max-w-md">
            <p className="mb-4 font-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              Almost there
            </p>
            <h2 className="font-headline-lg leading-tight">
              Your parent is the gatekeeper — by design.
            </h2>
            <p className="mt-4 font-body-md leading-relaxed text-white/75">
              Fable keeps learners inside a family circle. Approval is a feature, not a delay.
            </p>
          </div>
        </>
      }
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1ec]">
        <HandRaisedIcon className="h-7 w-7 text-[#FF7956]" />
      </div>
      <AuthEyebrow>Awaiting approval</AuthEyebrow>
      <AuthTitle>Your parent hasn&apos;t opened the door yet.</AuthTitle>
      <AuthLead>
        Hi {session?.user?.name ?? 'there'} — your account is created, but a parent must approve it
        before you can enter the story library. Ask them to check their Fable family dashboard.
      </AuthLead>

      <div className="space-y-3 rounded-2xl border border-[#e9d7d0] bg-[#fff8f5] p-5">
        <p className="font-label-sm uppercase tracking-widest text-[#857278]">What happens next</p>
        <ol className="list-decimal space-y-2 pl-5 font-body-md text-sm text-[#524348]">
          <li>Your parent signs in at Fable</li>
          <li>They open Family and approve your learner account</li>
          <li>You sign in again and enter your library</li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="h-12 flex-1 rounded-xl border border-[#d7c1c7] font-label-md text-label-md text-[#524348] hover:bg-[#fff8f5]"
        >
          SIGN OUT
        </button>
        <Link
          href="/auth/signin"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-[#FF7956] font-label-md text-label-md text-white hover:bg-[#ee6744]"
        >
          TRY AGAIN
        </Link>
      </div>
    </AuthShell>
  );
}
