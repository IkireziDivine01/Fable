'use client';

import Link from 'next/link';
import {
  AuthBrand,
  AuthEyebrow,
  AuthLead,
  AuthShell,
  AuthTitle,
  RolePathCard,
} from '@/components/auth/AuthShell';
import { BookOpenIcon, HandRaisedIcon, ShieldCheckIcon } from '@/components/HeroIcons';

export default function SignUpHub() {
  return (
    <AuthShell
      aside={
        <>
          <AuthBrand />
          <div className="max-w-md">
            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.2em] text-[#ffdbd2]">
              One library, many voices
            </p>
            <h2 className="mb-5 font-headline-xl text-headline-xl leading-tight">
              Every generation belongs in the same story.
            </h2>
            <p className="font-body-lg text-body-lg leading-relaxed text-white/75">
              Parents hold the keys. Authors preserve memory. Learners grow inside a protected family
              space.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { Icon: ShieldCheckIcon, label: 'Guarded' },
              { Icon: BookOpenIcon, label: 'Stories' },
              { Icon: HandRaisedIcon, label: 'Gesture' },
            ].map(({ Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/15 bg-white/10 p-4">
                <Icon className="mb-2 h-6 w-6 text-[#ffdbd2]" />
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-white/85">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </>
      }
    >
      <AuthBrand />
      <AuthEyebrow>Choose your path</AuthEyebrow>
      <AuthTitle>Who is joining Fable?</AuthTitle>
      <AuthLead>
        Pick the account type that fits you. Learners can also arrive with a parent&apos;s invitation
        code.
      </AuthLead>

      <div className="space-y-4">
        <RolePathCard
          href="/auth/signup/parent"
          badge="Parent"
          accent="bg-[#520e33]/10 text-[#520e33]"
          title="Create a family library"
          description="Set up your household, invite learners and authors, and manage approvals."
        />
        <RolePathCard
          href="/auth/signup/elder"
          badge="Author"
          accent="bg-[#FF7956]/15 text-[#a7391c]"
          title="Record and share stories"
          description="Start your own storytelling studio and preserve family memory in Kinyarwanda."
        />
        <RolePathCard
          href="/auth/signup/kid"
          badge="Learner"
          accent="bg-[#ecf9f1] text-[#0d5e30]"
          title="Join as a learner"
          description="Sign up with your parent's email. They'll approve your account before you enter."
        />
        <RolePathCard
          href="/auth/onboard"
          badge="Invite code"
          accent="bg-[#fff1ec] text-[#a7391c]"
          title="Have an invitation code?"
          description="Parents can invite learners and authors directly — skip the approval wait."
        />
      </div>

      <p className="mt-8 text-center font-body-md text-sm text-[#857278]">
        Already in the library?{' '}
        <Link href="/auth/signin" className="font-semibold text-[#a7391c] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
