import { AppShell } from "@/components/site/app-shell";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <main className="min-w-0 bg-transparent">{children}</main>
    </AppShell>
  );
}
