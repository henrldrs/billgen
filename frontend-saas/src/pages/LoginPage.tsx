import { ApiError, Button, Field, LogoMark, TextInput } from "@billgen/ui";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export function LoginPage() {
  const { login, devBootstrap } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleDevBootstrap = async () => {
    setError(null);
    setPending(true);
    try {
      await devBootstrap();
      navigate("/app");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "Dev sign-in needs the API started with DESKTOP_MODE=true."
          : "Dev sign-in failed",
      );
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login({ email, password });
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Login failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="bg-auth-page">
      <div className="bg-panel bg-auth-page__card">
        <div className="bg-auth-page__brand">
          <LogoMark size={26} />
          <h1>BillGen</h1>
        </div>
        <p className="bg-muted mb-4">Sign in to your account</p>
        <form onSubmit={handleSubmit}>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={password}
              required
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <div role="alert" className="bg-field__error mb-2">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="bg-muted mt-4">
          No account yet? <Link to="/signup" className="bg-link">Create one</Link>
        </p>

        {/* Dev-only escape hatch. `import.meta.env.DEV` is replaced with the
            literal `false` by Vite in a production build, so this block is
            tree-shaken out of the shipped bundle — it cannot be reached by
            flipping a runtime flag, because it is not there. */}
        {import.meta.env.DEV ? (
          <div className="bg-auth-page__dev">
            <p className="bg-muted">
              Development build. Signs in as the local single-user account via
              POST /auth/desktop-bootstrap — no password, and the API returns
              404 unless it was started with DESKTOP_MODE=true.
            </p>
            <Button
              variant="secondary"
              disabled={pending}
              className="w-full"
              onClick={() => void handleDevBootstrap()}
            >
              Continue as local dev user
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
