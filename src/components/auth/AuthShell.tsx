import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/darklogo.svg';

interface AuthShellProps {
  children: React.ReactNode;
  aside?: React.ReactNode;
  reverse?: boolean;
}

export function AuthShell({ children, aside, reverse = false }: AuthShellProps) {
  const formSection = (
    <section className="flex items-center justify-center p-6 md:p-10 lg:p-12">
      <div className="w-full max-w-md">{children}</div>
    </section>
  );

  const asideSection = aside ? (
    <section className="relative hidden overflow-hidden bg-[#520e33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,219,210,0.22),_transparent_40%)]" />
      <div className="absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-[#FF7956]/10 blur-3xl" />
      <div className="relative z-10">{aside}</div>
    </section>
  ) : null;

  return (
    <main className="min-h-screen bg-[#fff8f5] px-4 py-6 text-[#1e1b18] md:px-8 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1140px] grid-cols-1 overflow-hidden rounded-2xl border border-[#e9d7d0] bg-white shadow-2xl shadow-[#520e33]/10 lg:grid-cols-2">
        {reverse ? (
          <>
            {asideSection}
            {formSection}
          </>
        ) : (
          <>
            {formSection}
            {asideSection}
          </>
        )}
      </div>
    </main>
  );
}

export function AuthBrand() {
  return (
    <Link href="/" className="mb-8 inline-flex rounded-md bg-[#fff8f5] px-4 py-3 ring-1 ring-[#e9d7d0]">
      <Image src={logo} alt="Fable" width={105} height={32} priority />
    </Link>
  );
}

export function AuthEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.22em] text-[#33001d]">
      {children}
    </p>
  );
}

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-3 font-headline-lg text-headline-lg leading-tight text-[#1e1b18]">
      {children}
    </h1>
  );
}

export function AuthLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-8 font-body-md text-body-md leading-relaxed text-[#524348]">{children}</p>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p className="mb-5 rounded-xl border border-[#ffdbd2] bg-[#fff8f5] px-4 py-3 font-body-md text-sm text-[#a7391c]">
      {message}
    </p>
  );
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <p className="mb-5 flex items-center gap-2 rounded-xl border border-[#c8ebd4] bg-[#ecf9f1] px-4 py-3 font-body-md text-sm text-[#0d5e30]">
      {message}
    </p>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-sm text-label-sm uppercase tracking-widest text-[#857278]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const authInputClass =
  'h-13 w-full rounded-xl border border-[#d7c1c7] bg-white px-4 font-body-md text-[#1e1b18] outline-none transition-colors placeholder:text-[#857278] focus:border-[#FF7956] focus:ring-2 focus:ring-[#FF7956]/15';

export function AuthSubmit({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center rounded-xl bg-[#FF7956] px-8 font-label-md text-label-md tracking-widest text-white shadow-lg shadow-[#ff7956]/20 transition-all hover:-translate-y-0.5 hover:bg-[#ee6744] active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function RolePathCard({
  href,
  title,
  description,
  badge,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  badge: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[#e9d7d0] bg-[#fff8f5]/60 p-5 transition-all hover:-translate-y-1 hover:border-[#FF7956]/40 hover:shadow-lg hover:shadow-[#520e33]/5"
    >
      <span
        className={`mb-4 inline-flex rounded-full px-3 py-1 font-label-sm text-label-sm uppercase tracking-widest ${accent}`}
      >
        {badge}
      </span>
      <h2 className="mb-2 font-headline-md text-headline-md text-[#1e1b18] group-hover:text-[#520e33]">
        {title}
      </h2>
      <p className="font-body-md text-sm leading-relaxed text-[#524348]">{description}</p>
    </Link>
  );
}
