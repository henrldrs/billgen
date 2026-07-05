import { ApiError, Button, Field } from "@billgen/ui";
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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-panel w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">BillGen</h1>
        <p className="text-sm text-gray-500 mb-4">Sign in to your account</p>
        <form onSubmit={handleSubmit}>
          <Field
            label="Email"
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            required
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? (
            <div role="alert" className="bg-field__error mb-2">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="text-sm mt-4">
          No account yet? <Link to="/signup" className="text-blue-700 underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
