'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ParadigmShiftSection from '@/components/ParadigmShiftSection';
import CoreSystemSection from '@/components/CoreSystemSection';
import TechnicalBlueprintSection from '@/components/TechnicalBlueprintSection';
import NewsletterSection from '@/components/NewsletterSection';
import Footer from '@/components/Footer';

export default function FableLanding() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#fff8f5] text-[#1e1b18]">
      {/* Story Scrubber */}
      <div
        className="fixed top-0 left-0 w-full h-1 z-[100] transition-all"
        style={{
          background: `linear-gradient(to right, #FF7956 ${scrollProgress}%, transparent ${scrollProgress}%)`,
        }}
      />

      <Navigation />
      <main>
        <HeroSection />
        <ParadigmShiftSection />
        <CoreSystemSection />
        <TechnicalBlueprintSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}
