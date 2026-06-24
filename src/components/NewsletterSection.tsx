'use client';

import { useState } from 'react';
import { ArrowRightIcon, CheckCircleIcon } from '@/components/HeroIcons';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      setEmail('');
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <section className="mx-auto max-w-[1120px] px-5 py-24 text-center md:px-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 font-headline-lg text-headline-lg text-[#1e1b18]">
          Join the Archival Mission
        </h2>
        <p className="mb-12 font-body-lg text-body-lg text-[#524348]">
          Receive updates on our progress and be the first to launch the Fable prototype in your
          community.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent border-b-2 border-[#d7c1c7] focus:border-[#FF7956] px-4 py-4 outline-none font-body-md transition-all text-center text-[#1e1b18] placeholder-[#857278]"
          placeholder="archivist@fable.com"
          required
        />
        <button
          type="submit"
          className="mt-4 flex h-14 items-center justify-center gap-3 rounded-lg bg-[#FF7956] px-10 font-label-md text-label-md tracking-widest text-white transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-95"
        >
          {isSubmitted ? (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              <span>SUBSCRIBED</span>
            </>
          ) : (
            <>
              <span>SUBSCRIBE TO UPDATES</span>
              <ArrowRightIcon className="h-5 w-5" />
            </>
          )}
        </button>
      </form>

      {isSubmitted && (
        <p className="text-[#a7391c] font-body-md mt-4">Thank you for subscribing!</p>
      )}
    </section>
  );
}
