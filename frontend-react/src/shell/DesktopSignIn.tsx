/** The desktop's sign-in screen.
 *
 *  A desktop install has no password: `POST /auth/desktop-bootstrap` mints
 *  the machine's single local session, and until 2026-09-13 the window went
 *  from a spinner straight into the dashboard. That is correct and it is
 *  also the one moment a person is never told *whose* copy this is, what
 *  plan it is on, or where the data sits — the questions the licence, the
 *  backups and the first run all turn on.
 *
 *  So this screen says it. It is the web app's login page with the form
 *  taken out: the same `AuthPage` frame, the account it will open as, the
 *  plan, the data folder, and one button. A switch lets it get out of the way
 *  on later launches; signing out from the account menu brings it back.
 *
 *  Presentational: the boot state machine is `frontend-electron/src/App.tsx`'s,
 *  which is the only place that knows how a sidecar starts. This file knows
 *  how to show the four states it can be in, which is why it is testable
 *  without Tauri. */

import { AuthPage, Badge, Button, ErrorState, IconChip, LoadingScreen, Switch, ThemeSwitcher } from "@henrioutai/ui";

import { useTheme } from "../lib/theme";
import { t, tTier, type Lang } from "../lib/translations";
import { LanguageToggle } from "../panels/LanguageToggle";
import { useLang } from "../providers/LanguageProvider";

export interface DesktopAccount {
  name: string;
  email: string;
  organization?: string | null;
  /** The plan tier's wire value (`free`, `partner`…); translated here. */
  plan?: string | null;
  /** The resolved data directory, from `GET /onboarding`. */
  dataDirectory?: string | null;
}

export type DesktopSignInState =
  | { status: "connecting" }
  | { status: "ready"; account: DesktopAccount; signedOut?: boolean }
  | { status: "error"; message: string };

export interface DesktopSignInProps {
  state: DesktopSignInState;
  onContinue: () => void;
  onRetry: () => void;
  /** Whether later launches skip this screen. Stored by the shell. */
  autoOpen: boolean;
  onAutoOpenChange: (next: boolean) => void;
}

function initialsOf(name: string, email: string): string {
  const source = (name.trim() || email).trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DesktopSignIn({ state, onContinue, onRetry, autoOpen, onAutoOpenChange }: DesktopSignInProps) {
  const { lang } = useLang();
  const [theme, setTheme] = useTheme();

  return (
    <AuthPage
      tagline={t(lang, "signin.tagline")}
      aside={
        <ul>
          <li>{t(lang, "signin.aside1")}</li>
          <li>{t(lang, "signin.aside2")}</li>
          <li>{t(lang, "signin.aside3")}</li>
        </ul>
      }
      footer={
        <>
          <LanguageToggle ariaLabel={t(lang, "settings.language")} />
          <ThemeSwitcher theme={theme} onChange={setTheme} size="sm" withSystem={false} />
        </>
      }
    >
      {state.status === "connecting" ? (
        <LoadingScreen label={t(lang, "signin.starting")} />
      ) : state.status === "error" ? (
        <ErrorState
          title={t(lang, "signin.errorTitle")}
          description={
            <>
              {t(lang, "signin.errorHint")}
              <br />
              <code className="bg-num">{state.message}</code>
            </>
          }
          onRetry={onRetry}
          retryLabel={t(lang, "common.retry")}
        />
      ) : (
        <SignInCard lang={lang} state={state} onContinue={onContinue} autoOpen={autoOpen} onAutoOpenChange={onAutoOpenChange} />
      )}
    </AuthPage>
  );
}

function SignInCard({
  lang,
  state,
  onContinue,
  autoOpen,
  onAutoOpenChange,
}: {
  lang: Lang;
  state: Extract<DesktopSignInState, { status: "ready" }>;
  onContinue: () => void;
  autoOpen: boolean;
  onAutoOpenChange: (next: boolean) => void;
}) {
  const { account } = state;
  return (
    <div className="bg-signin">
      <div>
        <h1 className="bg-signin__title">{t(lang, "signin.welcome")}</h1>
        <p className="bg-signin__lead">{state.signedOut ? t(lang, "signin.signedOut") : t(lang, "signin.lead")}</p>
      </div>

      <div className="bg-signin__account">
        <IconChip tone="accent" shape="circle" size="lg">
          <span className="bg-topnav__avatar-initials">{initialsOf(account.name, account.email)}</span>
        </IconChip>
        <div className="bg-signin__who">
          <span className="bg-signin__name">{account.name}</span>
          {account.organization ? <span className="bg-signin__org">{account.organization}</span> : null}
          <span className="bg-signin__meta">{account.email}</span>
        </div>
        {account.plan ? (
          <Badge tone="info" className="bg-signin__plan">
            {tTier(lang, account.plan)}
          </Badge>
        ) : null}
      </div>

      {account.dataDirectory ? (
        <dl className="bg-signin__facts">
          <dt>{t(lang, "signin.dataDir")}</dt>
          <dd>
            <code className="bg-num">{account.dataDirectory}</code>
          </dd>
        </dl>
      ) : null}

      <div className="bg-signin__actions">
        <Button variant="primary" size="lg" onClick={onContinue}>
          {t(lang, "signin.continue")}
        </Button>
        <Switch checked={autoOpen} onChange={onAutoOpenChange} label={t(lang, "signin.autoOpen")} />
        <p className="bg-muted">{t(lang, "signin.autoOpenHint")}</p>
      </div>
    </div>
  );
}
