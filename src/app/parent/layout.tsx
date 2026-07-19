import { ReactNode } from 'react';
import ParentShell from '@/components/parent/ParentShell';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <ParentShell>{children}</ParentShell>;
}
