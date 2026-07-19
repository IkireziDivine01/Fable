import { ReactNode } from 'react';
import KidShell from '@/components/kid/KidShell';

export default function KidLayout({ children }: { children: ReactNode }) {
  return <KidShell>{children}</KidShell>;
}
