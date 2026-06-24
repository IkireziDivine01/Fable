'use client';

import Image from 'next/image';
import logo from '@/assets/darklogo.svg';

export default function Footer() {
  return (
    <footer className="border-t border-[#d7c1c7]/10 bg-[#fff8f5]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full px-5 md:px-16 py-12 max-w-[1120px] mx-auto">
        <div>
          <Image src={logo} alt="Fable" width={100} height={100} />
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full md:w-auto">
          
          <p className="text-[#524348] font-label-sm mt-4 md:mt-0 whitespace-nowrap">
            © 2026 Fable. The Modern Archivist.
          </p>
        </div>
      </div>
    </footer>
  );
}