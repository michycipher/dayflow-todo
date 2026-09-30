import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">D</span>
        <span>dayflow</span>
      </Link>
      <section className="auth-card">
        <AuthView path={path} />
      </section>
      <p className="auth-note">Your tasks, ready wherever you are.</p>
    </main>
  );
}
