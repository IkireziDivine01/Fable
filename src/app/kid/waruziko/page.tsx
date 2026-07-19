'use client';

import { useEffect, useState } from 'react';
import { LightBulbIcon, SparklesIcon } from '@/components/HeroIcons';
import type { WaruzikoFact } from '@/lib/waruziko-server';

const CATEGORY_LABEL: Record<string, string> = {
  culture: 'Culture',
  language: 'Language',
  history: 'History',
  values: 'Values',
  nature: 'Nature',
  food: 'Food',
};

export default function KidWaruzikoPage() {
  const [today, setToday] = useState<WaruzikoFact | null>(null);
  const [archive, setArchive] = useState<WaruzikoFact[]>([]);
  const [showRw, setShowRw] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/waruziko?archive=1');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load Waruziko');
        setToday(data.today);
        setArchive(Array.isArray(data.archive) ? data.archive : []);

        if (data.today?.id) {
          void fetch('/api/waruziko', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ factId: data.today.id }),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="font-body-md text-[#524348]">Opening today&apos;s fact…</p>;
  }

  if (error || !today) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e9d7d0] bg-white p-8 text-center">
        <LightBulbIcon className="mx-auto mb-3 h-10 w-10 text-[#d7c1c7]" />
        <p className="font-body-md text-[#524348]">{error || 'No fact available yet.'}</p>
      </div>
    );
  }

  const title = showRw && today.titleRw ? today.titleRw : today.titleEn;
  const body = showRw && today.bodyRw ? today.bodyRw : today.bodyEn;
  const others = archive.filter((f) => f.id !== today.id);

  return (
    <div>
      <header className="mb-6">
        <p className="font-label-sm uppercase tracking-[0.22em] text-[#857278]">
          Waruziko · Fact of the day
        </p>
        <h1 className="mt-1 font-headline-lg text-3xl text-[#1e1b18] md:text-4xl">
          Learn something new
        </h1>
        <p className="mt-2 max-w-lg font-body-md text-[#524348]">
          A little piece of Rwandan culture to carry with you — then go read a story.
        </p>
      </header>

      <article className="relative overflow-hidden rounded-3xl border border-[#e9d7d0] bg-[#520e33] text-[#fff8f5] shadow-lg shadow-[#520e33]/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,121,86,0.35),_transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -35deg,
              transparent,
              transparent 14px,
              rgba(196, 165, 116, 0.35) 14px,
              rgba(196, 165, 116, 0.35) 15px
            )`,
          }}
        />

        <div className="relative p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF7956] px-3 py-1 font-label-sm uppercase tracking-widest text-white">
              <SparklesIcon className="h-3.5 w-3.5" />
              Today
            </span>
            <div className="flex rounded-full bg-[#241810]/50 p-0.5">
              <button
                type="button"
                onClick={() => setShowRw(true)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  showRw ? 'bg-[#C4A574] text-[#1e1b18]' : 'text-[#ffdbd2]/80'
                }`}
              >
                Kinyarwanda
              </button>
              <button
                type="button"
                onClick={() => setShowRw(false)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  !showRw ? 'bg-[#C4A574] text-[#1e1b18]' : 'text-[#ffdbd2]/80'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <p className="mb-2 font-label-sm uppercase tracking-widest text-[#ffdbd2]/75">
            {CATEGORY_LABEL[today.category] ?? today.category}
            {today.themeLabel ? ` · ${today.themeLabel}` : ''}
          </p>
          <h2 className="font-headline-md text-2xl leading-snug md:text-3xl">{title}</h2>
          <p className="mt-4 max-w-2xl font-body-md text-base leading-relaxed text-[#ffdbd2]">
            {body}
          </p>
        </div>
      </article>

      {others.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="mb-4 font-label-sm uppercase tracking-widest text-[#520e33] hover:text-[#FF7956]"
          >
            {showMore ? 'Hide more facts' : 'Explore more facts'}
          </button>

          {showMore && (
            <ul className="space-y-3">
              {others.map((fact) => (
                <li
                  key={fact.id}
                  className="rounded-2xl border border-[#e9d7d0] bg-white p-4 shadow-sm"
                >
                  <p className="font-label-sm uppercase tracking-widest text-[#857278]">
                    {CATEGORY_LABEL[fact.category] ?? fact.category}
                  </p>
                  <h3 className="mt-1 font-headline-md text-lg text-[#1e1b18]">
                    {showRw && fact.titleRw ? fact.titleRw : fact.titleEn}
                  </h3>
                  <p className="mt-2 font-body-sm text-sm leading-relaxed text-[#524348]">
                    {showRw && fact.bodyRw ? fact.bodyRw : fact.bodyEn}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
