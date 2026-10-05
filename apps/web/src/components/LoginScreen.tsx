import { ArrowRight, LockKeyhole, Moon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { setupAccountInputSchema, type SetupAccountInput } from "@moonweight/shared";

export const LoginScreen = ({
  error,
  onLogin,
  setupRequired = false,
  onSetup,
}: {
  error?: string | null;
  onLogin: (password: string, username?: string) => Promise<void>;
  setupRequired?: boolean;
  onSetup?: (input: SetupAccountInput) => Promise<void>;
}) => {
  const [creating, setCreating] = useState(setupRequired);
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    const input = setupAccountInputSchema.safeParse({ setupKey, username, password });
    if (creating && !input.success) {
      setLoginError(input.error.issues[0].message);
      return;
    }
    if (creating && password !== confirmation) {
      setLoginError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      if (creating && input.success && onSetup) await onSetup(input.data);
      else await onLogin(password, setupRequired ? undefined : username.trim().toLowerCase());
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className={`login-page ${creating ? "setup-page" : ""}`}>
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
      <form className="panel login-form" onSubmit={submit} noValidate>
        <span className="icon-disc">
          <LockKeyhole size={20} />
        </span>
        <h2>{creating ? "Make this space yours." : "Welcome back."}</h2>
        <p className="muted">
          {creating
            ? "Create your private account, then add your first reading."
            : "Sign in to your personal tracker."}
        </p>
        {creating && (
          <>
            <label htmlFor="setup-key">Setup key</label>
            <input
              id="setup-key"
              className="input"
              type="password"
              autoComplete="off"
              autoFocus
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              maxLength={1024}
              disabled={submitting}
              aria-describedby="setup-key-help"
            />
            <p id="setup-key-help" className="field-help">
              Shown in your terminal by <code>npm start</code>. It keeps account creation private.
            </p>
          </>
        )}
        {(creating || !setupRequired) && (
          <>
            <label htmlFor="account-username">Username</label>
            <input
              id="account-username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              disabled={submitting}
              required
              autoFocus={!creating}
              aria-describedby={creating ? "username-help" : undefined}
            />
            {creating && (
              <p id="username-help" className="field-help">
                3–32 characters. Letters, numbers, dots, dashes, or underscores.
              </p>
            )}
          </>
        )}
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          className="input"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          autoFocus={!creating && setupRequired}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={creating ? 128 : 1024}
          required
          disabled={submitting}
          aria-describedby={
            creating ? "password-help" : loginError || error ? "login-error" : undefined
          }
        />
        {creating && (
          <>
            <p id="password-help" className="field-help">
              Use a unique password or passphrase with at least 12 characters.
            </p>
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              maxLength={128}
              disabled={submitting}
            />
          </>
        )}
        {(loginError || error) && (
          <p id="login-error" role="alert" className="notice notice-error">
            {loginError ?? error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={submitting}>
          {creating
            ? submitting
              ? "Creating your account…"
              : "Create account"
            : submitting
              ? "Signing in…"
              : "Sign in"}
          <ArrowRight size={17} />
        </button>
        {setupRequired && (
          <button
            className="text-button account-switch"
            type="button"
            disabled={submitting}
            onClick={() => {
              setCreating(!creating);
              setPassword("");
              setConfirmation("");
              setLoginError(null);
            }}
          >
            {creating ? "Use existing server password" : "Create your private account"}
          </button>
        )}
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
