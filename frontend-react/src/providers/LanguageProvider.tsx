/** The interface language, for the whole app.
 *
 *  Before this, `lang` was derived from `company.default_language` and drilled
 *  through every screen as a prop. That conflates two different things:
 *
 *  * **the document language** — what an invoice is *written in*. A business
 *    fact about the customer being billed, and rightly a company setting.
 *  * **the interface language** — what the person operating the software
 *    reads. A personal preference, and a Belgian company issuing French
 *    invoices may well employ a Dutch-speaking bookkeeper.
 *
 *  Tying the second to the first means one of them is always wrong for
 *  somebody. They are separate here and stay separate.
 *
 *  ## Where the answer comes from, in order
 *
 *  1. what this person chose, if they ever chose (`users.language`);
 *  2. the company default, because a Belgian company's staff usually do read
 *     the language it invoices in;
 *  3. the browser, if it asks for one of the four;
 *  4. French — BillGen is Belgian and French is the model's own default.
 *
 *  A choice is written to `localStorage` immediately so the next paint is
 *  already in the right language, and to the server so it follows the person to
 *  another machine. The local copy is a cache of the server's answer, never a
 *  second source of truth: when the two disagree the server wins on load.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LANGS, isLang, type Lang } from "../lib/translations";

const STORAGE_KEY = "billgen.lang";

interface LanguageValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  /** True once the person has made an explicit choice, here or on the server.
   *  The settings screen uses it to say "following your company" rather than
   *  showing a preference nobody expressed. */
  explicit: boolean;
  /** Registers the active company's document language as the fallback.
   *
   *  The provider sits above the router, where no company is known yet — the
   *  shell learns which company is active only after its query resolves, and it
   *  changes when the company switcher is used. Rather than splitting the shell
   *  in half to move the provider under it, the shell reports the value up.
   */
  setCompanyDefault: (lang: string | undefined) => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function readStored(): Lang | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isLang(raw) ? raw : null;
  } catch {
    // A private window throws on access rather than returning null.
    return null;
  }
}

function fromBrowser(): Lang | null {
  if (typeof navigator === "undefined") return null;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.slice(0, 2).toLowerCase();
    if (base && isLang(base)) return base;
  }
  return null;
}

export interface LanguageProviderProps {
  children: ReactNode;
  /** The signed-in person's stored choice, once `/users/me` has answered.
   *  Undefined while loading; null means they have never chosen. */
  userLanguage?: string | null;
  /** Persists the choice. Omitted in tests and in the preview harness, where
   *  there is no server to persist to. */
  onPersist?: (lang: Lang) => void;
}

export function LanguageProvider({ children, userLanguage, onPersist }: LanguageProviderProps) {
  const [chosen, setChosen] = useState<Lang | null>(() => readStored());
  const [companyLanguage, setCompanyLanguage] = useState<string | undefined>(undefined);

  const setCompanyDefault = useCallback((next: string | undefined) => {
    setCompanyLanguage((current) => (current === next ? current : next));
  }, []);

  //  The server's answer wins over the cached one on load: someone who changed
  //  their language on another machine should see that change here, and the
  //  stale local copy would otherwise silently override it.
  useEffect(() => {
    if (userLanguage && isLang(userLanguage) && userLanguage !== chosen) {
      setChosen(userLanguage);
      try {
        localStorage.setItem(STORAGE_KEY, userLanguage);
      } catch {
        /* private window */
      }
    }
    // `chosen` is deliberately absent: this reconciles *incoming* server state,
    // and including it would undo a local choice the moment it was made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLanguage]);

  const lang: Lang =
    chosen ??
    (companyLanguage && isLang(companyLanguage) ? companyLanguage : null) ??
    fromBrowser() ??
    "fr";

  const setLang = useCallback(
    (next: Lang) => {
      setChosen(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private window — the choice still applies for this session */
      }
      onPersist?.(next);
    },
    [onPersist],
  );

  //  Screen readers and browser features (hyphenation, spell-check, the
  //  translate prompt) read this. Setting it is not decoration.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, explicit: chosen !== null, setCompanyDefault }),
    [lang, setLang, chosen, setCompanyDefault],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** The current interface language.
 *
 *  Falls back to French outside a provider rather than throwing: a component
 *  rendered in a test or a preview harness should still render text, and a
 *  crash is a poor way to report a missing provider in a translation helper.
 */
export function useLang(): LanguageValue {
  return (
    useContext(LanguageContext) ?? {
      lang: "fr" as Lang,
      setLang: () => {},
      explicit: false,
      setCompanyDefault: () => {},
    }
  );
}

export { LANGS };
export type { Lang };
