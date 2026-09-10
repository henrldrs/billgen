/** Where the interface language comes from.
 *
 *  Worth pinning because the chain changed on 2026-09-10 and the reason is a
 *  real person: the company's *document* language used to be the fallback, so
 *  a Portuguese operator invoicing Dutch customers got an app in Dutch. The
 *  document language says what goes on the invoice. It says nothing about what
 *  the person operating the software can read.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { LanguageProvider, useLang } from "./LanguageProvider";

function Probe() {
  const { lang, explicit } = useLang();
  return <span data-testid="lang">{`${lang}:${explicit}`}</span>;
}

function withBrowserLanguages(tags: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(tags);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("an operating system language BillGen speaks is used", () => {
  withBrowserLanguages(["nl-BE", "nl"]);
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByTestId("lang").textContent).toBe("nl:false");
});

test("an operating system language BillGen does not speak falls to English", () => {
  //  Emilia's case exactly: Portuguese Windows, and Portuguese is not one of
  //  the four the app is translated into. English, not French — a person who
  //  cannot read the interface cannot find the control that changes it.
  withBrowserLanguages(["pt-PT", "pt"]);
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByTestId("lang").textContent).toBe("en:false");
});

test("the person's own choice outranks the operating system", () => {
  localStorage.setItem("billgen.lang", "es");
  withBrowserLanguages(["fr-BE", "fr"]);
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByTestId("lang").textContent).toBe("es:true");
});

test("the server's answer outranks the cached one", () => {
  //  Someone who changed their language on another machine should see that
  //  change here, and the stale local copy would otherwise override it.
  localStorage.setItem("billgen.lang", "es");
  withBrowserLanguages(["fr"]);
  render(
    <LanguageProvider userLanguage="nl">
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByTestId("lang").textContent).toBe("nl:true");
});

test("a language BillGen does not speak is ignored, not trusted", () => {
  //  `users.language` is two characters of user-supplied data on the wire.
  withBrowserLanguages(["nl"]);
  render(
    <LanguageProvider userLanguage="zz">
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByTestId("lang").textContent).toBe("nl:false");
});
