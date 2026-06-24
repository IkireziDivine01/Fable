'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/darklogo.svg';
import { getStoriesByHousehold } from '@/lib/supabase';
import { ArrowRightIcon, BookOpenIcon } from '@/components/HeroIcons';

interface Story {
  id: string;
  title: string;
  status: string;
  created_at: string;
  author_id: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch stories on mount
  useEffect(() => {
    async function loadStories() {
      if (!session?.user?.householdId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getStoriesByHousehold(session.user.householdId);
        setStories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [session?.user?.householdId]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fff8f5]">
        <div className="text-center">
          <p className="font-body-md text-[#524348]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#fff8f5] text-[#1e1b18]">
      {/* Header */}
      <header className="border-b border-[#e9d7d0] bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src={logo} alt="Fable" width={105} height={32} />
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
                Welcome
              </p>
              <p className="font-body-md text-[#1e1b18]">{session.user?.name}</p>
            </div>
            <button
              onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
              className="px-6 py-2 rounded-lg bg-[#FF7956] font-label-md text-label-md tracking-widest text-white hover:bg-[#ee6744] transition-all"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <p className="font-label-md text-label-md uppercase tracking-[0.2em] text-[#33001d] mb-2">
            Your Library
          </p>
          <h1 className="font-headline-xl text-headline-xl text-[#1e1b18] mb-2">
            Family Stories
          </h1>
          <p className="font-body-md text-[#524348]">
            Access and manage stories in your family household
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-[#fff1ec] px-4 py-4 text-left font-body-md text-sm text-[#a7391c]">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="font-body-md text-[#524348]">Loading your stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="rounded-lg border border-[#e9d7d0] bg-white p-12 text-center">
            <BookOpenIcon className="h-12 w-12 mx-auto mb-4 text-[#d7c1c7]" />
            <h3 className="font-headline-md text-[#1e1b18] mb-2">No stories yet</h3>
            <p className="font-body-md text-[#524348] mb-6">
              Start by creating your first story or waiting for family members to share.
            </p>
            <Link
              href="/stories/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF7956] font-label-md text-label-md tracking-widest text-white hover:bg-[#ee6744] transition-all"
            >
              <span>CREATE STORY</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="group rounded-lg border border-[#e9d7d0] bg-white p-6 hover:border-[#FF7956] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <BookOpenIcon className="h-8 w-8 text-[#FF7956]" />
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-label-sm uppercase tracking-widest bg-[#f1f5e9] text-[#2d5016]">
                    {story.status}
                  </span>
                </div>
                <h3 className="font-headline-md text-[#1e1b18] mb-2 group-hover:text-[#FF7956] transition-colors">
                  {story.title}
                </h3>
                <p className="font-body-sm text-[#857278] text-sm">
                  {new Date(story.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
