'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { displayRole, normalizeRole } from '@/lib/roles';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  account_status?: string;
  created_at: string;
}

interface PendingKid {
  id: string;
  name: string;
  email: string;
  parent_email?: string;
  created_at: string;
}

interface Invitation {
  id: string;
  code: string;
  role: string;
  name_hint?: string;
  expires_at: string;
  used_at?: string;
}

export default function FamilyPage() {
  const { data: session, status, update } = useSession();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [pending, setPending] = useState<PendingKid[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteRole, setInviteRole] = useState<'kid' | 'elder'>('kid');
  const [inviteNameHint, setInviteNameHint] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadFamilyData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError('');

      const hid = session.user.householdId;
      if (!hid) {
        setError(
          'Your account is not linked to a household yet. Sign out, then sign up again as a parent.'
        );
        return;
      }

      const fetchOpts: RequestInit = { credentials: 'same-origin' };
      const [membersRes, invitRes, pendingRes] = await Promise.all([
        fetch(`/api/parent/family?householdId=${hid}`, fetchOpts),
        fetch(`/api/parent/invitations?householdId=${hid}`, fetchOpts),
        fetch('/api/parent/pending', fetchOpts),
      ]);

      const failures: string[] = [];

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      } else {
        const body = await membersRes.json().catch(() => ({}));
        failures.push(body.error ?? `Members request failed (${membersRes.status})`);
      }

      if (invitRes.ok) {
        setInvitations(await invitRes.json());
      } else {
        const body = await invitRes.json().catch(() => ({}));
        failures.push(body.error ?? `Invitations request failed (${invitRes.status})`);
      }

      if (pendingRes.ok) {
        setPending(await pendingRes.json());
      } else if (pendingRes.status !== 400) {
        const body = await pendingRes.json().catch(() => ({}));
        failures.push(body.error ?? `Pending request failed (${pendingRes.status})`);
      }

      if (failures.length > 0) {
        setError(failures.join(' '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.householdId]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !session.user.householdId) {
      void update();
    }
  }, [status, session?.user?.id, session?.user?.householdId, update]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.householdId) {
        loadFamilyData();
      } else if (session?.user?.id) {
        setLoading(false);
        setError(
          'Your account is not linked to a household yet. Sign out, then sign up again as a parent.'
        );
      }
    }
  }, [status, session?.user?.id, session?.user?.householdId, loadFamilyData]);

  const handleGenerateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/parent/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: inviteRole, nameHint: inviteNameHint || undefined }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to generate invitation');
      }

      setGeneratedCode(result.code);
      setInviteNameHint('');
      await loadFamilyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleApprove = async (kidId: string) => {
    setApprovingId(kidId);
    setError('');

    try {
      const response = await fetch('/api/parent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kidId }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Approval failed');
      }

      await loadFamilyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-[#fff8f5] px-5 py-8">
        <p className="text-center text-[#524348]">Loading family…</p>
      </main>
    );
  }

  const parentCount = members.filter((m) => normalizeRole(m.role) === 'parent').length;
  const kidCount = members.filter((m) => normalizeRole(m.role) === 'kid').length;
  const elderCount = members.filter((m) => normalizeRole(m.role) === 'elder').length;
  const pendingInvitations = invitations.filter((i) => !i.used_at);

  return (
    <main className="min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      <AppHeader title="Family" subtitle="Members · approvals · invites" />

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg">Your household</h1>
            <p className="mt-1 font-body-md text-[#524348]">
              Approve learners, invite authors, and keep everyone connected.
            </p>
          </div>
          <Link
            href="/parent/dashboard"
            className="rounded-xl border border-[#d7c1c7] px-4 py-2 font-body-md text-sm text-[#524348] hover:border-[#FF7956]"
          >
            ← Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#ffdbd2] bg-[#fff8f5] px-4 py-3 text-sm text-[#a7391c]">
            {error}
          </div>
        )}

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Parents', value: parentCount },
            { label: 'Learners', value: kidCount },
            { label: 'Authors', value: elderCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[#e9d7d0] bg-white p-6">
              <p className="font-label-sm uppercase tracking-widest text-[#857278]">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#520e33]">{stat.value}</p>
            </div>
          ))}
        </div>

        {pending.length > 0 && (
          <section className="mb-10 rounded-2xl border border-[#FF7956]/30 bg-[#fff1ec]/50 p-8">
            <h2 className="mb-2 font-headline-md text-headline-md">Pending learner approvals</h2>
            <p className="mb-6 font-body-md text-sm text-[#524348]">
              These learners signed up with your email and are waiting to enter the library.
            </p>
            <div className="space-y-4">
              {pending.map((kid) => (
                <div
                  key={kid.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#e9d7d0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-label-md text-[#1e1b18]">{kid.name}</p>
                    <p className="font-body-sm text-sm text-[#857278]">{kid.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={approvingId === kid.id}
                    onClick={() => handleApprove(kid.id)}
                    className="rounded-xl bg-[#520e33] px-5 py-2 font-label-sm uppercase tracking-widest text-white hover:bg-[#3c0826] disabled:opacity-60"
                  >
                    {approvingId === kid.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-10 rounded-2xl border border-[#e9d7d0] bg-white p-8">
          <h2 className="mb-6 font-headline-md text-headline-md">Household members</h2>
          {members.length === 0 ? (
            <p className="text-center text-[#524348]">No members yet.</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-[#e9d7d0] p-4"
                >
                  <div>
                    <p className="font-label-md text-[#1e1b18]">{member.name}</p>
                    <p className="font-body-sm text-sm text-[#857278]">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-[#FF7956]/10 px-3 py-1 font-label-sm text-[#a7391c]">
                    {displayRole(member.role)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {pendingInvitations.length > 0 && (
          <section className="mb-10 rounded-2xl border border-[#e9d7d0] bg-white p-8">
            <h2 className="mb-6 font-headline-md text-headline-md">
              Open invitations ({pendingInvitations.length})
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#e9d7d0] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-lg tracking-widest">{invitation.code}</p>
                    <p className="font-body-sm text-sm text-[#857278]">
                      For a {displayRole(invitation.role)}
                      {invitation.name_hint ? ` · ${invitation.name_hint}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invitation.code)}
                    className="rounded-xl bg-[#fff8f5] px-4 py-2 font-label-sm text-[#a7391c] ring-1 ring-[#e9d7d0] hover:ring-[#FF7956]"
                  >
                    {copiedCode ? 'Copied!' : 'Copy code'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-[#e9d7d0] bg-white p-8">
          <h2 className="mb-6 font-headline-md text-headline-md">Invite a family member</h2>

          {generatedCode ? (
            <div className="rounded-xl bg-[#ecf9f1] p-6">
              <p className="mb-4 text-sm font-semibold text-[#0d5e30]">Invitation created</p>
              <p className="mb-4 text-center font-mono text-2xl tracking-widest">{generatedCode}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedCode)}
                  className="flex-1 rounded-xl bg-[#FF7956] py-3 font-label-md text-white"
                >
                  Copy code
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedCode(null)}
                  className="flex-1 rounded-xl border border-[#d7c1c7] py-3 font-label-md text-[#524348]"
                >
                  Create another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerateInvitation} className="space-y-5">
              <div>
                <p className="mb-3 font-label-sm uppercase tracking-widest text-[#857278]">
                  Account type
                </p>
                <div className="flex gap-6">
                  {(['kid', 'elder'] as const).map((role) => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={inviteRole === role}
                        onChange={() => setInviteRole(role)}
                        className="accent-[#FF7956]"
                      />
                      <span>{role === 'kid' ? 'Learner' : 'Author'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block font-label-sm uppercase tracking-widest text-[#857278]">
                  Name hint (optional)
                </span>
                <input
                  type="text"
                  value={inviteNameHint}
                  onChange={(e) => setInviteNameHint(e.target.value)}
                  placeholder="e.g. Grandpa Mike"
                  className="h-12 w-full rounded-xl border border-[#d7c1c7] px-4 outline-none focus:border-[#FF7956]"
                />
              </label>

              <button
                type="submit"
                disabled={inviteSubmitting}
                className="h-12 w-full rounded-xl bg-[#520e33] font-label-md tracking-widest text-white hover:bg-[#3c0826] disabled:opacity-60"
              >
                {inviteSubmitting ? 'Generating…' : 'Generate invitation code'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
