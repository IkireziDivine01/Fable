'use client';

import { themeColor } from '@/lib/themes';

export default function ThemeBadge({ label }: { label?: string | null }) {
  if (!label) return null;

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: themeColor(label) }}
    >
      {label}
    </span>
  );
}
