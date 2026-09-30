import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { ArrowRight, Check } from "lucide-react";
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
  const isSignUp = path === authViewPaths.SIGN_UP;
  const heading = isSignUp
    ? "Make room for what matters."
    : path === authViewPaths.SIGN_IN
      ? "A calmer day starts here."
      : "Let’s get you back to Dayflow.";

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />
      <div className="auth-shell">
        <div className="auth-story">
          <Link className="auth-brand" href="/">
            <span className="brand-mark">D</span>
            <span>dayflow</span>
          </Link>
          <div className="auth-story-copy">
            <span className="auth-eyebrow">A LITTLE MORE FOCUS</span>
            <h1>{heading}</h1>
            <p>
              Your plans, priorities, and small wins in one peaceful place.
              Pick up right where you left off, on any device.
            </p>
          </div>
          <div className="auth-promise">
            <span className="auth-promise-icon"><Check size={15} /></span>
            <span>
              <strong>{isSignUp ? "Your day, all in one place" : "Your workspace is waiting"}</strong>
              <small>Tasks sync securely with your account</small>
            </span>
            <ArrowRight size={15} className="auth-promise-arrow" />
          </div>
        </div>
        <section className="auth-card" aria-label={isSignUp ? "Create your account" : "Sign in to Dayflow"}>
          <AuthView path={path} />
          {isSignUp && (
            <p className="auth-import-note">
              Have tasks in this browser? We’ll save them to your new account when you sign up.
            </p>
          )}
        </section>
      </div>
      <p className="auth-note">Thoughtful planning, with room to breathe.</p>
    </main>
  );
}
