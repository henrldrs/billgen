import { ApiError, Button, Field, LogoMark, TextInput } from "@billgen/ui";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      </div>
    </main>
  );
}
