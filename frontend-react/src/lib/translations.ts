export type Lang = "en" | "fr" | "nl" | "es";

const MESSAGES = {
  "common.save": {
    en: "Save",
    fr: "Enregistrer",
    nl: "Opslaan",
    es: "Guardar",
  },
  "common.cancel": {
    en: "Cancel",
    fr: "Annuler",
    nl: "Annuleren",
    es: "Cancelar",
  },
  "common.add": {
    en: "Add",
    fr: "Ajouter",
    nl: "Toevoegen",
    es: "Añadir",
  },
  "common.edit": {
    en: "Edit",
    fr: "Modifier",
    nl: "Bewerken",
    es: "Editar",
  },
  "common.loading": {
    en: "Loading…",
    fr: "Chargement…",
    nl: "Laden…",
    es: "Cargando…",
  },
  "common.error": {
    en: "Something went wrong",
    fr: "Une erreur est survenue",
    nl: "Er is iets misgegaan",
    es: "Algo salió mal",
  },
  "clients.title": {
    en: "Clients",
    fr: "Clients",
    nl: "Klanten",
    es: "Clientes",
  },
  "clients.add": {
    en: "Add client",
    fr: "Ajouter un client",
    nl: "Klant toevoegen",
    es: "Añadir cliente",
  },
  "clients.empty": {
    en: "No clients yet. Add your first client to start invoicing.",
    fr: "Aucun client. Ajoutez votre premier client pour facturer.",
    nl: "Nog geen klanten. Voeg uw eerste klant toe om te factureren.",
    es: "Sin clientes. Añada su primer cliente para facturar.",
  },
  "clients.name": {
    en: "Name",
    fr: "Nom",
    nl: "Naam",
    es: "Nombre",
  },
  "clients.email": {
    en: "Email",
    fr: "E-mail",
    nl: "E-mail",
    es: "Correo",
  },
  "clients.vat": {
    en: "VAT number",
    fr: "N° TVA",
    nl: "BTW-nummer",
    es: "NIF-IVA",
  },
  "clients.city": {
    en: "City",
    fr: "Ville",
    nl: "Stad",
    es: "Ciudad",
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;

export function t(lang: Lang, key: MessageKey): string {
  return MESSAGES[key][lang] ?? MESSAGES[key].en;
}
