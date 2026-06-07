import { Moon, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

type LoginScreenProps = {
  error?: string | null;
  onLogin: (password: string) => Promise<void>;
};

export const LoginScreen = ({ error, onLogin }: LoginScreenProps) => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setLoginError(null);

    try {
      await onLogin(password);
    } catch (requestError) {
      setLoginError(requestError instanceof Error ? requestError.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mystic-shell flex min-h-screen items-center justify-center px-4 py-8 text-bone">
      <form
        className="w-full max-w-sm rounded-lg border border-white/10 bg-card/90 p-5 shadow-glow"
        onSubmit={handleSubmit}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-lavender/30 bg-deep text-lavender shadow-glow">
            <Moon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase text-periwinkle">MoonWeight</p>
            <h1 className="text-2xl font-semibold text-bone">Sign in</h1>
          </div>
        </div>

        <label className="block text-sm font-medium text-bone" htmlFor="adminPassword">
          Password
        </label>
        <input
          id="adminPassword"
          autoComplete="current-password"
          autoFocus
          className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-night/65 px-3 text-base text-bone outline-none shadow-insetline placeholder:text-periwinkle/50 focus:border-lavender/70"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {loginError || error ? (
          <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-bone">
            {loginError ?? error}
          </div>
        ) : null}

        <button
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-lavender hover:text-night disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          <ShieldCheck className="h-4 w-4" />
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
};
