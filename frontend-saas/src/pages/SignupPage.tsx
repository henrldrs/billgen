import { ApiError, AuthPage, Button, Field, TextInput } from "@billgen/ui";
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
    // The same frame as the login page and the desktop's sign-in screen.
    <AuthPage tagline="Belgian invoicing that lives on your own computer.">
      <div className="bg-auth-page__brand">
        <h1>Create your account</h1>
      </div>
    <p className="bg-muted mb-4">Free while in beta — no card required.</p>
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
      <p className="bg-muted mt-4">
        Already registered? <Link to="/login" className="bg-link">Sign in</Link>
      </p>
    </AuthPage>
  );
}
