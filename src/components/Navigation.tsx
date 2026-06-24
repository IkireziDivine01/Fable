'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/darklogo.svg';
import { ArrowRightIcon } from '@/components/HeroIcons';

export default function Navigation() {
  const [activeSection, setActiveSection] = useState('mission');

  useEffect(() => {
    const sections = ['mission', 'how-it-works', 'technical-spec'];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries.find(
          (entry) => entry.isIntersecting
        );

        if (visibleSection) {
          setActiveSection(visibleSection.target.id);
        }
      },
      {
        threshold: 0.5,
      }
    );

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { label: 'Mission', href: '#mission', id: 'mission' },
    { label: 'How it Works', href: '#how-it-works', id: 'how-it-works' },
    { label: 'Technical Spec', href: '#technical-spec', id: 'technical-spec' },
  ];

  return (
    <nav className="sticky top-0 z-50 mx-auto flex h-20 w-full max-w-[1120px] items-center justify-between border-b border-[#e9e1dc]/70 bg-[#fff8f5]/90 px-5 backdrop-blur md:px-16">
      <Image src={logo} alt="Fable" width={100} height={100} />

      <div className="hidden md:flex gap-8 items-center">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={
              activeSection === item.id
                ? 'text-[#FF7956] border-b-2 border-[#FF7956] font-bold pb-1 transition-all'
                : 'text-[#524348] font-label-md hover:text-[#33001d] transition-colors duration-200'
            }
          >
            {item.label}
          </a>
        ))}
      </div>

      <Link
        href="/auth/signin"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#FF7956] px-5 font-label-md text-label-md uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-95"
      >
        <span>Get Started</span>
        <ArrowRightIcon className="hidden h-4 w-4 sm:block" />
      </Link>
    </nav>
  );
}