import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { roleHome } from '@/lib/roles';

export default async function DashboardRedirect() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  redirect(roleHome(session.user.role, session.user.accountStatus));
}
