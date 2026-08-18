import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogoMark } from "#/components/site/logo";
import { ThemeToggle } from "#/components/ui/theme-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="glow-field pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden />

      <header className="shell relative flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display font-semibold tracking-tight"
        >
          <LogoMark />
          lojinha
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>

          <div className="card mt-8 p-6 shadow-[var(--shadow-card)]">{children}</div>

          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}
