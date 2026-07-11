import { ApiError, Button, Field, TextInput } from "@billgen/ui";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSession } from "../auth/session";

export function SignupPage() {
  const { signup } = useSession();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signup({
        email,
        password,
        display_name: displayName,
        organization_name: organizationName,
      });
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Signup failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-panel w-full max-w-sm">
        <h1 className="text-xl font-bold mb-1">Create your BillGen account</h1>
        <p className="text-sm text-gray-500 mb-4">
          Free while in beta — no card required.
        </p>
        <form onSubmit={handleSubmit}>
          <Field label="Your name" required>
            <TextInput
              value={displayName}
              required
              autoComplete="name"
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Field>
          <Field label="Organization name" required>
            <TextInput
              value={organizationName}
              required
              onChange={(event) => setOrganizationName(event.target.value)}
            />
          </Field>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password (min. 8 characters)" required>
            <TextInput
              type="password"
              value={password}
              required
              minLength={8}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {error ? (
            <div role="alert" className="bg-field__error mb-2">
              {error}
            </div>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            Create account
          </Button>
        </form>
        <p className="text-sm mt-4">
          Already registered? <Link to="/login" className="text-blue-700 underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
