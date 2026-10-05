import { ArrowRight, LockKeyhole, Moon } from "lucide-react";
import { useState, type FormEvent } from "react";

export const LoginScreen = ({
  error,
  onLogin,
}: {
  error?: string | null;
  onLogin: (password: string) => Promise<void>;
}) => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setLoginError(null);
    try {
      await onLogin(password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="login-page">
      <div className="login-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Moon size={22} />
          </span>
          MoonWeight<span className="version">01</span>
        </a>
        <div className="login-illustration" aria-hidden="true">
          <div className="moon-halo" />
          <div className="moon-sphere" />
          <span className="orbit-dot" />
        </div>
        <p className="eyebrow">YOUR DATA. YOUR SPACE.</p>
        <h1>
          Small entries.
          <br />
          <em>A clearer picture.</em>
        </h1>
        <p className="login-description">
          A quiet place to record your weight and see it over time. Private, by design.
        </p>
      </div>
      <form className="panel login-form" onSubmit={submit}>
        <span className="icon-disc">
          <LockKeyhole size={20} />
        </span>
        <h2>Welcome back.</h2>
        <p className="muted">Sign in to your personal tracker.</p>
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          className="input"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={1024}
          required
          disabled={submitting}
          aria-describedby={loginError || error ? "login-error" : undefined}
        />
        {(loginError || error) && (
          <p id="login-error" role="alert" className="notice notice-error">
            {loginError ?? error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
          <ArrowRight size={17} />
        </button>
        <p className="form-footnote">
          <LockKeyhole size={12} /> A private space on your own server.
        </p>
      </form>
      <footer className="login-footer">
        MoonWeight <span>Private weight tracking · v1.0</span>
      </footer>
    </main>
  );
};
