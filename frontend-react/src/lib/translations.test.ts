import { t } from "./translations";

test("returns the requested language", () => {
  expect(t("fr", "clients.title")).toBe("Clients");
  expect(t("nl", "clients.add")).toBe("Klant toevoegen");
  expect(t("es", "common.save")).toBe("Guardar");
});

test("english is the reference language", () => {
  expect(t("en", "clients.empty")).toContain("first client");
});
