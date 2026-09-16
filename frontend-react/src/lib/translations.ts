export type Lang = "en" | "fr" | "nl" | "es";

/** The four, in the order a picker should offer them.
 *
 *  French first: BillGen is Belgian, `Company.default_language` defaults to
 *  "fr", and the majority of the first customers will be francophone. Dutch
 *  second because the other half of the country reads it.
 */
export const LANGS: readonly { value: Lang; label: string; short: string }[] = [
  { value: "fr", label: "Français", short: "FR" },
  { value: "nl", label: "Nederlands", short: "NL" },
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
];

/** Narrows an untrusted string — a stored value, a URL, an API field — to a
 *  language the app actually has translations for. */
export function isLang(value: string | null | undefined): value is Lang {
  return value === "en" || value === "fr" || value === "nl" || value === "es";
}

const MESSAGES = {
  // ---- common -----------------------------------------------------------------
  "common.save": { en: "Save", fr: "Enregistrer", nl: "Opslaan", es: "Guardar" },
  "common.cancel": { en: "Cancel", fr: "Annuler", nl: "Annuleren", es: "Cancelar" },
  "common.add": { en: "Add", fr: "Ajouter", nl: "Toevoegen", es: "Añadir" },
  "common.edit": { en: "Edit", fr: "Modifier", nl: "Bewerken", es: "Editar" },
  "common.close": { en: "Close", fr: "Fermer", nl: "Sluiten", es: "Cerrar" },
  "common.create": { en: "Create", fr: "Créer", nl: "Aanmaken", es: "Crear" },
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

  // ---- clients ----------------------------------------------------------------
  "clients.title": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
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
  "clients.name": { en: "Name", fr: "Nom", nl: "Naam", es: "Nombre" },
  "clients.email": { en: "Email", fr: "E-mail", nl: "E-mail", es: "Correo" },
  "clients.vat": { en: "VAT number", fr: "N° TVA", nl: "BTW-nummer", es: "NIF-IVA" },
  "clients.address": { en: "Address", fr: "Adresse", nl: "Adres", es: "Dirección" },
  "clients.postalCode": {
    en: "Postal code",
    fr: "Code postal",
    nl: "Postcode",
    es: "Código postal",
  },
  "clients.city": { en: "City", fr: "Ville", nl: "Stad", es: "Ciudad" },
  "clients.country": { en: "Country", fr: "Pays", nl: "Land", es: "País" },

  // ---- products ---------------------------------------------------------------
  "products.title": {
    en: "Products & services",
    fr: "Produits et services",
    nl: "Producten en diensten",
    es: "Productos y servicios",
  },
  "products.add": {
    en: "Add product",
    fr: "Ajouter un produit",
    nl: "Product toevoegen",
    es: "Añadir producto",
  },
  "products.empty": {
    en: "No products yet. Add your catalog to speed up invoicing.",
    fr: "Aucun produit. Créez votre catalogue pour facturer plus vite.",
    nl: "Nog geen producten. Bouw uw catalogus om sneller te factureren.",
    es: "Sin productos. Cree su catálogo para facturar más rápido.",
  },
  "products.name": { en: "Name", fr: "Nom", nl: "Naam", es: "Nombre" },
  "products.price": {
    en: "Unit price",
    fr: "Prix unitaire",
    nl: "Eenheidsprijs",
    es: "Precio unitario",
  },
  "products.category": { en: "Category", fr: "Catégorie", nl: "Categorie", es: "Categoría" },
  "products.vatRate": { en: "VAT %", fr: "TVA %", nl: "BTW %", es: "IVA %" },

  // ---- invoice builder ----------------------------------------------------------
  "invoice.title": {
    en: "New invoice",
    fr: "Nouvelle facture",
    nl: "Nieuwe factuur",
    es: "Nueva factura",
  },
  "invoice.client": { en: "Client", fr: "Client", nl: "Klant", es: "Cliente" },
  "invoice.selectClient": {
    en: "Select a client…",
    fr: "Choisir un client…",
    nl: "Kies een klant…",
    es: "Elegir un cliente…",
  },
  "invoice.description": {
    en: "Description",
    fr: "Description",
    nl: "Omschrijving",
    es: "Descripción",
  },
  "invoice.quantity": { en: "Qty", fr: "Qté", nl: "Aantal", es: "Cant." },
  "invoice.unitPrice": { en: "Unit price", fr: "PU HT", nl: "Prijs", es: "Precio" },
  "invoice.vatRate": { en: "VAT %", fr: "TVA %", nl: "BTW %", es: "IVA %" },
  "invoice.addLine": {
    en: "Add line",
    fr: "Ajouter une ligne",
    nl: "Lijn toevoegen",
    es: "Añadir línea",
  },
  "invoice.removeLine": { en: "Remove", fr: "Retirer", nl: "Verwijderen", es: "Quitar" },
  "invoice.comments": {
    en: "Comments",
    fr: "Commentaires",
    nl: "Opmerkingen",
    es: "Comentarios",
  },
  "invoice.create": {
    en: "Save draft",
    fr: "Enregistrer le brouillon",
    nl: "Concept opslaan",
    es: "Guardar borrador",
  },
  "invoice.created": {
    en: "Draft saved — issue it from Invoices to finalize the number.",
    fr: "Brouillon enregistré — émettez-le depuis Factures pour finaliser le numéro.",
    nl: "Concept opgeslagen — geef het uit via Facturen om het nummer vast te leggen.",
    es: "Borrador guardado — emítalo desde Facturas para asignar el número.",
  },
  "invoice.subtotal": { en: "Subtotal", fr: "Total HT", nl: "Subtotaal", es: "Base" },
  "invoice.discount": { en: "Discount", fr: "Remise", nl: "Korting", es: "Descuento" },
  "invoice.vat": { en: "VAT", fr: "TVA", nl: "BTW", es: "IVA" },
  "invoice.total": { en: "Total", fr: "Total TTC", nl: "Totaal", es: "Total" },

  // ---- history --------------------------------------------------------------------
  "history.title": {
    en: "Invoices",
    fr: "Factures",
    nl: "Facturen",
    es: "Facturas",
  },
  "history.empty": {
    en: "No invoices yet.",
    fr: "Aucune facture.",
    nl: "Nog geen facturen.",
    es: "Sin facturas.",
  },
  "history.all": { en: "All", fr: "Toutes", nl: "Alle", es: "Todas" },
  "history.status": { en: "Status", fr: "Statut", nl: "Status", es: "Estado" },
  "history.reference": { en: "Reference", fr: "Référence", nl: "Referentie", es: "Referencia" },
  "history.date": { en: "Date", fr: "Date", nl: "Datum", es: "Fecha" },
  "history.total": { en: "Total", fr: "Total TTC", nl: "Totaal", es: "Total" },
  // T-45 — the list names who owes, and by when. The Client and Due headers
  //  reuse invoice.client and reports.dueDate. French and Dutch drafted without
  //  a native read (SOLO_RUN § Boundaries).
  "history.noNumber": {
    en: "No number yet",
    fr: "Pas encore de numéro",
    nl: "Nog geen nummer",
    es: "Sin número todavía",
  },
  "history.overdue": { en: "Overdue", fr: "En retard", nl: "Te laat", es: "Vencida" },
  "history.overdueDays": {
    en: "Overdue · {days} days",
    fr: "En retard · {days} jours",
    nl: "Te laat · {days} dagen",
    es: "Vencida · {days} días",
  },
  "history.overdueDay": {
    en: "Overdue · 1 day",
    fr: "En retard · 1 jour",
    nl: "Te laat · 1 dag",
    es: "Vencida · 1 día",
  },
  "history.actions": { en: "Actions", fr: "Actions", nl: "Acties", es: "Acciones" },
  "history.void": { en: "Void", fr: "Annuler", nl: "Annuleren", es: "Anular" },
  "history.duplicate": { en: "Duplicate", fr: "Dupliquer", nl: "Dupliceren", es: "Duplicar" },
  "history.duplicated": {
    en: "Copied into a new draft",
    fr: "Copiée dans un nouveau brouillon",
    nl: "Gekopieerd naar een nieuw concept",
    es: "Copiada en un nuevo borrador",
  },
  "history.voidReason": {
    en: "Reason for voiding",
    fr: "Motif d'annulation",
    nl: "Reden voor annulering",
    es: "Motivo de anulación",
  },
  "creditNotes.title": {
    en: "Credit notes",
    fr: "Notes de crédit",
    nl: "Creditnota's",
    es: "Notas de crédito",
  },
  "creditNotes.empty": {
    en: "No credit notes yet",
    fr: "Aucune note de crédit pour le moment",
    nl: "Nog geen creditnota's",
    es: "Todavía no hay notas de crédito",
  },
  "creditNotes.emptyHint": {
    en: "A credit note corrects an invoice that has already been issued. Create one from the invoice you need to correct.",
    fr: "Une note de crédit corrige une facture déjà émise. Créez-la depuis la facture à corriger.",
    nl: "Een creditnota corrigeert een reeds uitgegeven factuur. Maak er een aan vanuit de te corrigeren factuur.",
    es: "Una nota de crédito corrige una factura ya emitida. Créela desde la factura que necesita corregir.",
  },
  "creditNotes.goToInvoices": {
    en: "Go to invoices",
    fr: "Aller aux factures",
    nl: "Naar facturen",
    es: "Ir a las facturas",
  },
  "creditNotes.reason": { en: "Reason", fr: "Motif", nl: "Reden", es: "Motivo" },
  "creditNotes.correctsInvoice": {
    en: "Corrects invoice",
    fr: "Corrige la facture",
    nl: "Corrigeert factuur",
    es: "Corrige la factura",
  },
  "history.creditNote": {
    en: "Credit note",
    fr: "Note de crédit",
    nl: "Creditnota",
    es: "Nota de crédito",
  },
  "history.creditNoteReason": {
    en: "Reason for the credit note",
    fr: "Motif de la note de crédit",
    nl: "Reden voor de creditnota",
    es: "Motivo de la nota de crédito",
  },
  "history.payment": { en: "Payment", fr: "Paiement", nl: "Betaling", es: "Pago" },
  // T-47 — the sheet's one primary action, and the menu the corrections sit
  // behind. French and Dutch drafted without a native read.
  "history.recordPayment": {
    en: "Record payment",
    fr: "Enregistrer un paiement",
    nl: "Betaling registreren",
    es: "Registrar un pago",
  },
  "history.more": { en: "More", fr: "Plus", nl: "Meer", es: "Más" },
  "history.paymentAmount": { en: "Amount", fr: "Montant", nl: "Bedrag", es: "Importe" },
  "history.paymentDate": {
    en: "Payment date",
    fr: "Date de paiement",
    nl: "Betaaldatum",
    es: "Fecha de pago",
  },
  "history.record": { en: "Record", fr: "Enregistrer", nl: "Registreren", es: "Registrar" },
  "history.downloadPdf": {
    en: "Download PDF",
    fr: "Télécharger PDF",
    nl: "Pdf downloaden",
    es: "Descargar PDF",
  },
  "history.downloadXml": {
    en: "Peppol XML",
    fr: "XML Peppol",
    nl: "Peppol-XML",
    es: "XML Peppol",
  },
  "history.downloadError": {
    en: "Could not download the document. Please try again.",
    fr: "Téléchargement du document impossible. Veuillez réessayer.",
    nl: "Kon het document niet downloaden. Probeer het opnieuw.",
    es: "No se pudo descargar el documento. Inténtelo de nuevo.",
  },
  "history.downloadSaved": {
    en: "Saved",
    fr: "Enregistré :",
    nl: "Opgeslagen:",
    es: "Guardado:",
  },
  "history.peppolBlocked": {
    en: "Peppol export blocked — fix the following before exporting:",
    fr: "Export Peppol bloqué — corrigez les points suivants avant d'exporter :",
    nl: "Peppol-export geblokkeerd — corrigeer het volgende vóór het exporteren:",
    es: "Exportación Peppol bloqueada — corrija lo siguiente antes de exportar:",
  },
  "peppol.errSupplierName": {
    en: "Your company name is missing.",
    fr: "Le nom de votre entreprise est manquant.",
    nl: "De naam van uw bedrijf ontbreekt.",
    es: "Falta el nombre de su empresa.",
  },
  "peppol.errSupplierAddress": {
    en: "Your company address is missing.",
    fr: "L'adresse de votre entreprise est manquante.",
    nl: "Het adres van uw bedrijf ontbreekt.",
    es: "Falta la dirección de su empresa.",
  },
  "peppol.errSupplierCountry": {
    en: "Your company country code is invalid.",
    fr: "Le code pays de votre entreprise est invalide.",
    nl: "De landcode van uw bedrijf is ongeldig.",
    es: "El código de país de su empresa no es válido.",
  },
  "peppol.errSupplierVat": {
    en: "Your company VAT number is missing or invalid.",
    fr: "Le numéro de TVA de votre entreprise est manquant ou invalide.",
    nl: "Het btw-nummer van uw bedrijf ontbreekt of is ongeldig.",
    es: "El NIF-IVA de su empresa falta o no es válido.",
  },
  "peppol.errSupplierIban": {
    en: "Your company IBAN is missing or invalid.",
    fr: "L'IBAN de votre entreprise est manquant ou invalide.",
    nl: "Het IBAN van uw bedrijf ontbreekt of is ongeldig.",
    es: "El IBAN de su empresa falta o no es válido.",
  },
  "peppol.errSupplierBic": {
    en: "Your company BIC is invalid.",
    fr: "Le BIC de votre entreprise est invalide.",
    nl: "De BIC van uw bedrijf is ongeldig.",
    es: "El BIC de su empresa no es válido.",
  },
  "peppol.errCustomerName": {
    en: "The client name is missing.",
    fr: "Le nom du client est manquant.",
    nl: "De naam van de klant ontbreekt.",
    es: "Falta el nombre del cliente.",
  },
  "peppol.errCustomerAddress": {
    en: "The client address is missing.",
    fr: "L'adresse du client est manquante.",
    nl: "Het adres van de klant ontbreekt.",
    es: "Falta la dirección del cliente.",
  },
  "peppol.errCustomerCountry": {
    en: "The client country code is invalid.",
    fr: "Le code pays du client est invalide.",
    nl: "De landcode van de klant is ongeldig.",
    es: "El código de país del cliente no es válido.",
  },
  "peppol.errCustomerVat": {
    en: "The client VAT number is invalid.",
    fr: "Le numéro de TVA du client est invalide.",
    nl: "Het btw-nummer van de klant is ongeldig.",
    es: "El NIF-IVA del cliente no es válido.",
  },
  "peppol.errCustomerVatB2C": {
    en: "The client has no VAT number (B2C). Peppol is B2B/B2G only — use the PDF instead.",
    fr: "Le client n'a pas de numéro de TVA (B2C). Peppol est réservé au B2B/B2G — utilisez le PDF.",
    nl: "De klant heeft geen btw-nummer (B2C). Peppol is alleen B2B/B2G — gebruik de pdf.",
    es: "El cliente no tiene NIF-IVA (B2C). Peppol es solo B2B/B2G — use el PDF.",
  },
  "history.draft": { en: "Draft", fr: "Brouillon", nl: "Concept", es: "Borrador" },
  "history.voided": { en: "Voided", fr: "Annulée", nl: "Geannuleerd", es: "Anulada" },
  "history.paidStamp": { en: "Paid", fr: "Payée", nl: "Betaald", es: "Pagada" },

  /* ---- the invoice as a document ------------------------------------------
   * The words that appear ON the paper, not in the interface around it. They
   * are separated from `invoice.*` (the composer's labels) on purpose: a
   * composer field can be called "Client", the document has to say "Billed to",
   * and the day one of them is reworded the other must not move with it.
   * ---------------------------------------------------------------------- */
  /* The heading on the paper. NOT `invoice.title`, which is the composer's
     "New invoice" — a document that calls itself "New invoice" is a screenshot
     of a form, not an invoice. */
  "invoiceDoc.title": { en: "Invoice", fr: "Facture", nl: "Factuur", es: "Factura" },
  "invoiceDoc.from": { en: "From", fr: "Émetteur", nl: "Afzender", es: "Emisor" },
  "invoiceDoc.to": { en: "Billed to", fr: "Facturé à", nl: "Gefactureerd aan", es: "Facturado a" },
  "invoiceDoc.issueDate": {
    en: "Issue date",
    fr: "Date de facture",
    nl: "Factuurdatum",
    es: "Fecha de factura",
  },
  "invoiceDoc.dueDate": {
    en: "Due date",
    fr: "Échéance",
    nl: "Vervaldatum",
    es: "Vencimiento",
  },
  "invoiceDoc.description": {
    en: "Description",
    fr: "Désignation",
    nl: "Omschrijving",
    es: "Descripción",
  },
  "invoiceDoc.quantity": { en: "Qty", fr: "Qté", nl: "Aantal", es: "Cant." },
  "invoiceDoc.unitPrice": {
    en: "Unit price",
    fr: "Prix unitaire",
    nl: "Eenheidsprijs",
    es: "Precio unitario",
  },
  "invoiceDoc.vat": { en: "VAT", fr: "TVA", nl: "Btw", es: "IVA" },
  "invoiceDoc.lineTotal": { en: "Amount", fr: "Montant", nl: "Bedrag", es: "Importe" },
  "invoiceDoc.lines": {
    en: "Invoice lines",
    fr: "Lignes de facture",
    nl: "Factuurregels",
    es: "Líneas de factura",
  },
  "invoiceDoc.payTo": {
    en: "Payable to",
    fr: "Paiement sur le compte",
    nl: "Te betalen op rekening",
    es: "Pago en la cuenta",
  },
  "history.issue": { en: "Issue", fr: "Émettre", nl: "Uitgeven", es: "Emitir" },
  "history.issueConfirm": {
    en: "Issue this draft? A gapless invoice number will be assigned and the invoice becomes final — this cannot be undone.",
    fr: "Émettre ce brouillon ? Un numéro de facture séquentiel sera attribué et la facture deviendra définitive — action irréversible.",
    nl: "Dit concept uitgeven? Er wordt een sluitend factuurnummer toegekend en de factuur wordt definitief — dit kan niet ongedaan worden gemaakt.",
    es: "¿Emitir este borrador? Se asignará un número de factura correlativo y la factura será definitiva — no se puede deshacer.",
  },
  "history.delete": { en: "Delete", fr: "Supprimer", nl: "Verwijderen", es: "Eliminar" },
  "history.deleteConfirm": {
    en: "Delete this draft permanently? Drafts have no invoice number, so nothing legal is lost.",
    fr: "Supprimer définitivement ce brouillon ? Les brouillons n'ont pas de numéro de facture, rien de légal n'est perdu.",
    nl: "Dit concept definitief verwijderen? Concepten hebben geen factuurnummer, er gaat niets wettelijks verloren.",
    es: "¿Eliminar este borrador de forma permanente? Los borradores no tienen número de factura, no se pierde nada legal.",
  },
  "history.confirm": { en: "Confirm", fr: "Confirmer", nl: "Bevestigen", es: "Confirmar" },

  // ---- dashboard --------------------------------------------------------------------
  "dashboard.title": {
    en: "Dashboard",
    fr: "Tableau de bord",
    nl: "Dashboard",
    es: "Panel",
  },
  "dashboard.invoiced": {
    en: "Invoiced",
    fr: "Facturé",
    nl: "Gefactureerd",
    es: "Facturado",
  },
  "dashboard.paid": { en: "Paid", fr: "Encaissé", nl: "Betaald", es: "Cobrado" },
  "dashboard.outstanding": {
    en: "Outstanding",
    fr: "En attente",
    nl: "Openstaand",
    es: "Pendiente",
  },
  "dashboard.overdue": {
    en: "Overdue",
    fr: "En retard",
    nl: "Achterstallig",
    es: "Vencidas",
  },
  "dashboard.revenue": {
    en: "Revenue by month",
    fr: "Chiffre d'affaires par mois",
    nl: "Omzet per maand",
    es: "Ingresos por mes",
  },
  "dashboard.month": { en: "Month", fr: "Mois", nl: "Maand", es: "Mes" },

  // ---- activity ---------------------------------------------------------------------
  "activity.title": {
    en: "Activity log",
    fr: "Journal d'activité",
    nl: "Activiteitenlog",
    es: "Registro de actividad",
  },
  "activity.empty": {
    en: "No activity recorded yet.",
    fr: "Aucune activité enregistrée.",
    nl: "Nog geen activiteit geregistreerd.",
    es: "Sin actividad registrada.",
  },

  // ---- client 360 -------------------------------------------------------------------
  "client360.identity": {
    en: "Identity",
    fr: "Identité",
    nl: "Identiteit",
    es: "Identidad",
  },
  "client360.invoices": {
    en: "Invoices",
    fr: "Factures",
    nl: "Facturen",
    es: "Facturas",
  },
  "client360.noInvoices": {
    en: "No invoices for this client yet.",
    fr: "Aucune facture pour ce client.",
    nl: "Nog geen facturen voor deze klant.",
    es: "Aún no hay facturas para este cliente.",
  },
  // Named "record activity", not "history": this card shows edits to the CLIENT
  // RECORD (created, edited, imported), not the commercial history of invoices
  // and payments. Calling it "Historique" promised the second and delivered the
  // first — see customers.history vs customers.activity in scaffold/ia.ts.
  "client360.recordActivity": {
    en: "Record activity",
    fr: "Activité de la fiche",
    nl: "Activiteit op de fiche",
    es: "Actividad de la ficha",
  },
  "client360.recordActivityHint": {
    en: "Changes to this client's details. Invoices and payments are not here — they are in the Invoices tab.",
    fr: "Modifications des données de ce client. Les factures et paiements ne sont pas ici — ils sont dans l'onglet Factures.",
    nl: "Wijzigingen aan de gegevens van deze klant. Facturen en betalingen staan hier niet — die staan op het tabblad Facturen.",
    es: "Cambios en los datos de este cliente. Las facturas y los pagos no están aquí — están en la pestaña Facturas.",
  },
  "client360.noRecordActivity": {
    en: "This client's details have not been changed since it was created.",
    fr: "Les données de ce client n'ont pas été modifiées depuis sa création.",
    nl: "De gegevens van deze klant zijn sinds de aanmaak niet gewijzigd.",
    es: "Los datos de este cliente no han cambiado desde su creación.",
  },
  "client360.staleFilter": {
    en: "The API ignored the target_id filter and returned the whole organization's log, so it is not shown. Restart the API — it is older than this build.",
    fr: "L'API a ignoré le filtre target_id et a renvoyé le journal de toute l'organisation ; il n'est donc pas affiché. Redémarrez l'API — elle est antérieure à cette version.",
    nl: "De API negeerde de target_id-filter en gaf het log van de hele organisatie terug; het wordt daarom niet getoond. Herstart de API — die is ouder dan deze build.",
    es: "La API ignoró el filtro target_id y devolvió el registro de toda la organización, por lo que no se muestra. Reinicie la API — es anterior a esta versión.",
  },
  "client360.contact": { en: "Contact", fr: "Contact", nl: "Contact", es: "Contacto" },
  "client360.phone": { en: "Phone", fr: "Téléphone", nl: "Telefoon", es: "Teléfono" },
  "client360.notes": { en: "Notes", fr: "Notes", nl: "Notities", es: "Notas" },
  "client360.type": { en: "Type", fr: "Type", nl: "Type", es: "Tipo" },
  "client360.business": {
    en: "Business",
    fr: "Professionnel",
    nl: "Zakelijk",
    es: "Empresa",
  },
  "client360.individual": {
    en: "Individual",
    fr: "Particulier",
    nl: "Particulier",
    es: "Particular",
  },
  "client360.notFound": {
    en: "This client does not exist, or belongs to another organization.",
    fr: "Ce client n'existe pas ou appartient à une autre organisation.",
    nl: "Deze klant bestaat niet of hoort bij een andere organisatie.",
    es: "Este cliente no existe o pertenece a otra organización.",
  },
  "client360.backToClients": {
    en: "Back to clients",
    fr: "Retour aux clients",
    nl: "Terug naar klanten",
    es: "Volver a clientes",
  },
  "client360.newInvoice": {
    en: "New invoice",
    fr: "Nouvelle facture",
    nl: "Nieuwe factuur",
    es: "Nueva factura",
  },

  // ---- company -----------------------------------------------------------------------
  "company.title": {
    en: "Company details",
    fr: "Données de l'entreprise",
    nl: "Bedrijfsgegevens",
    es: "Datos de la empresa",
  },
  "company.name": {
    en: "Company name",
    fr: "Nom de l'entreprise",
    nl: "Bedrijfsnaam",
    es: "Nombre de la empresa",
  },
  "company.vat": { en: "VAT number", fr: "N° TVA", nl: "BTW-nummer", es: "NIF-IVA" },
  "company.registration": {
    en: "Enterprise number (KBO/BCE)",
    fr: "N° d'entreprise (BCE)",
    nl: "Ondernemingsnummer (KBO)",
    es: "N.º de empresa",
  },
  "company.email": { en: "Email", fr: "E-mail", nl: "E-mail", es: "Correo" },
  "company.address": { en: "Address", fr: "Adresse", nl: "Adres", es: "Dirección" },
  "company.postalCode": {
    en: "Postal code",
    fr: "Code postal",
    nl: "Postcode",
    es: "Código postal",
  },
  "company.city": { en: "City", fr: "Ville", nl: "Stad", es: "Ciudad" },
  "company.country": {
    en: "Country code",
    fr: "Code pays",
    nl: "Landcode",
    es: "Código de país",
  },
  "company.iban": { en: "IBAN", fr: "IBAN", nl: "IBAN", es: "IBAN" },
  "company.bic": { en: "BIC", fr: "BIC", nl: "BIC", es: "BIC" },
  "company.prefix": {
    en: "Invoice prefix",
    fr: "Préfixe de facture",
    nl: "Factuurvoorvoegsel",
    es: "Prefijo de factura",
  },
  "company.language": { en: "Language", fr: "Langue", nl: "Taal", es: "Idioma" },
  "company.template": {
    en: "PDF template",
    fr: "Modèle PDF",
    nl: "PDF-sjabloon",
    es: "Plantilla PDF",
  },
  "company.legalName": {
    en: "Legal name",
    fr: "Dénomination légale",
    nl: "Juridische naam",
    es: "Razón social",
  },
  "company.phone": { en: "Phone", fr: "Téléphone", nl: "Telefoon", es: "Teléfono" },
  "company.address2": {
    en: "Address line 2",
    fr: "Adresse (ligne 2)",
    nl: "Adresregel 2",
    es: "Dirección (línea 2)",
  },
  "company.currency": { en: "Currency", fr: "Devise", nl: "Valuta", es: "Moneda" },
  "company.sectionProfile": {
    en: "Company profile",
    fr: "Profil de l'entreprise",
    nl: "Bedrijfsprofiel",
    es: "Perfil de la empresa",
  },
  "settings.language": {
    en: "Language",
    fr: "Langue",
    nl: "Taal",
    es: "Idioma",
  },
  "settings.languageHint": {
    en: "The language of this interface. Documents keep the company's language.",
    fr: "La langue de cette interface. Les documents conservent celle de la société.",
    nl: "De taal van deze interface. Documenten behouden die van het bedrijf.",
    es: "El idioma de esta interfaz. Los documentos conservan el de la empresa.",
  },
  "company.sectionIdentity": {
    en: "Legal identity",
    fr: "Identité juridique",
    nl: "Juridische identiteit",
    es: "Identidad jurídica",
  },
  "company.sectionBank": {
    en: "Bank account",
    fr: "Compte bancaire",
    nl: "Bankrekening",
    es: "Cuenta bancaria",
  },
  "company.sectionNumbering": {
    en: "Invoice numbering",
    fr: "Numérotation des factures",
    nl: "Factuurnummering",
    es: "Numeración de facturas",
  },
  "company.sectionDefaults": {
    en: "Invoice defaults",
    fr: "Valeurs par défaut",
    nl: "Standaardwaarden",
    es: "Valores por defecto",
  },
  "company.saved": {
    en: "Changes saved.",
    fr: "Modifications enregistrées.",
    nl: "Wijzigingen opgeslagen.",
    es: "Cambios guardados.",
  },
  "company.unsaved": {
    en: "Unsaved changes",
    fr: "Modifications non enregistrées",
    nl: "Niet-opgeslagen wijzigingen",
    es: "Cambios sin guardar",
  },
  "company.upToDate": {
    en: "Everything saved",
    fr: "Tout est enregistré",
    nl: "Alles is opgeslagen",
    es: "Todo guardado",
  },
  "company.discard": {
    en: "Discard changes",
    fr: "Annuler les modifications",
    nl: "Wijzigingen verwerpen",
    es: "Descartar cambios",
  },
  "company.checkedOnSave": {
    en: "Checked again when you save.",
    fr: "Vérifié à nouveau lors de l'enregistrement.",
    nl: "Wordt opnieuw gecontroleerd bij het opslaan.",
    es: "Se verifica de nuevo al guardar.",
  },
  "company.normalized": {
    en: "Reads as",
    fr: "Se lit",
    nl: "Gelezen als",
    es: "Se lee",
  },
  "company.invalid": { en: "Invalid", fr: "Invalide", nl: "Ongeldig", es: "No válido" },
  "company.prefixHint": {
    en: "Used for new invoice numbers. Numbers already issued keep the prefix they were issued with.",
    fr: "Utilisé pour les nouveaux numéros de facture. Les factures déjà émises conservent leur préfixe.",
    nl: "Gebruikt voor nieuwe factuurnummers. Reeds uitgegeven nummers behouden hun voorvoegsel.",
    es: "Se usa para los nuevos números de factura. Las facturas ya emitidas conservan su prefijo.",
  },
  "company.peppolReady": {
    en: "Ready to send via Peppol",
    fr: "Prêt à envoyer via Peppol",
    nl: "Klaar om via Peppol te verzenden",
    es: "Listo para enviar por Peppol",
  },
  "company.peppolNotReady": {
    en: "Not ready to send via Peppol",
    fr: "Pas prêt pour Peppol",
    nl: "Nog niet klaar voor Peppol",
    es: "Aún no listo para Peppol",
  },
  "company.peppolMissing": {
    en: "Still missing",
    fr: "Encore manquant",
    nl: "Nog ontbrekend",
    es: "Todavía falta",
  },
  "company.peppolSupplierOnly": {
    en: "This checks your own details only — an e-invoice can still be refused because the client's are incomplete.",
    fr: "Ceci ne vérifie que vos propres données — une facture électronique peut encore être refusée si celles du client sont incomplètes.",
    nl: "Dit controleert alleen uw eigen gegevens — een e-factuur kan alsnog geweigerd worden als die van de klant onvolledig zijn.",
    es: "Esto solo verifica sus propios datos: una factura electrónica aún puede rechazarse si los del cliente están incompletos.",
  },

  // ---- import -----------------------------------------------------------------
  "import.title": {
    en: "Import data",
    fr: "Importer des données",
    nl: "Gegevens importeren",
    es: "Importar datos",
  },
  "import.intro": {
    en: "Import companies, clients, and products from a FinanceFlow BillGen backup file (.json). Nothing is written until you confirm.",
    fr: "Importez entreprises, clients et produits depuis une sauvegarde FinanceFlow BillGen (.json). Rien n'est enregistré avant votre confirmation.",
    nl: "Importeer bedrijven, klanten en producten uit een FinanceFlow BillGen-back-up (.json). Er wordt niets opgeslagen tot u bevestigt.",
    es: "Importe empresas, clientes y productos desde una copia de FinanceFlow BillGen (.json). No se guarda nada hasta que confirme.",
  },
  "import.choose": {
    en: "Choose backup file",
    fr: "Choisir un fichier",
    nl: "Back-upbestand kiezen",
    es: "Elegir archivo",
  },
  "import.preview": {
    en: "Preview import",
    fr: "Prévisualiser",
    nl: "Voorbeeld",
    es: "Vista previa",
  },
  "import.confirm": {
    en: "Confirm import",
    fr: "Confirmer l'import",
    nl: "Import bevestigen",
    es: "Confirmar importación",
  },
  "import.reset": {
    en: "Start over",
    fr: "Recommencer",
    nl: "Opnieuw",
    es: "Empezar de nuevo",
  },
  "import.previewHeading": {
    en: "Preview — nothing has been saved yet",
    fr: "Aperçu — rien n'a encore été enregistré",
    nl: "Voorbeeld — nog niets opgeslagen",
    es: "Vista previa — aún no se ha guardado nada",
  },
  "import.doneHeading": {
    en: "Import complete",
    fr: "Import terminé",
    nl: "Import voltooid",
    es: "Importación completada",
  },
  "import.companies": {
    en: "Companies",
    fr: "Entreprises",
    nl: "Bedrijven",
    es: "Empresas",
  },
  "import.clients": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
  "import.products": {
    en: "Products",
    fr: "Produits",
    nl: "Producten",
    es: "Productos",
  },
  "import.created": { en: "New", fr: "Nouveaux", nl: "Nieuw", es: "Nuevos" },
  "import.skipped": {
    en: "Skipped",
    fr: "Ignorés",
    nl: "Overgeslagen",
    es: "Omitidos",
  },
  "import.failed": { en: "Failed", fr: "Échecs", nl: "Mislukt", es: "Fallidos" },
  "import.invoicesNote": {
    en: "invoice(s) were found in the backup. Historical invoices are not imported — importing them would create new legal invoice numbers.",
    fr: "facture(s) trouvée(s) dans la sauvegarde. Les factures historiques ne sont pas importées — cela créerait de nouveaux numéros légaux.",
    nl: "factuur(en) gevonden in de back-up. Historische facturen worden niet geïmporteerd — dat zou nieuwe wettelijke factuurnummers aanmaken.",
    es: "factura(s) encontrada(s) en la copia. Las facturas históricas no se importan — crearía nuevos números legales.",
  },
  "import.issues": {
    en: "Rows that could not be imported",
    fr: "Lignes non importées",
    nl: "Niet-geïmporteerde rijen",
    es: "Filas no importadas",
  },
  "import.badFile": {
    en: "That file is not valid JSON.",
    fr: "Ce fichier n'est pas un JSON valide.",
    nl: "Dat bestand is geen geldige JSON.",
    es: "Ese archivo no es un JSON válido.",
  },
  "backup.title": {
    en: "Backup",
    fr: "Sauvegarde",
    nl: "Back-up",
    es: "Copia de seguridad",
  },
  "backup.intro": {
    en: "Download everything in this organization — companies, clients, products, invoices, payments, the activity log and the invoice counters — as one file you can restore later.",
    fr: "Téléchargez tout le contenu de cette organisation — entreprises, clients, produits, factures, paiements, journal d'activité et compteurs de factures — dans un fichier restaurable.",
    nl: "Download alles in deze organisatie — bedrijven, klanten, producten, facturen, betalingen, activiteitenlog en factuurtellers — als één later te herstellen bestand.",
    es: "Descargue todo el contenido de esta organización — empresas, clientes, productos, facturas, pagos, registro de actividad y contadores de facturas — en un archivo restaurable.",
  },
  "backup.download": {
    en: "Download backup",
    fr: "Télécharger la sauvegarde",
    nl: "Back-up downloaden",
    es: "Descargar copia",
  },
  "backup.restoreHeading": {
    en: "Restore",
    fr: "Restaurer",
    nl: "Herstellen",
    es: "Restaurar",
  },
  "backup.restoreIntro": {
    en: "Restore a backup into this organization. Only possible while the organization is still empty — restoring never merges into existing data.",
    fr: "Restaurez une sauvegarde dans cette organisation. Possible uniquement tant que l'organisation est vide — la restauration ne fusionne jamais avec des données existantes.",
    nl: "Herstel een back-up in deze organisatie. Kan alleen zolang de organisatie leeg is — herstellen voegt nooit samen met bestaande gegevens.",
    es: "Restaure una copia en esta organización. Solo es posible mientras la organización esté vacía — la restauración nunca se combina con datos existentes.",
  },
  "backup.choose": {
    en: "Choose backup file",
    fr: "Choisir le fichier",
    nl: "Kies back-upbestand",
    es: "Elegir archivo",
  },
  "backup.restore": {
    en: "Restore this backup",
    fr: "Restaurer cette sauvegarde",
    nl: "Deze back-up herstellen",
    es: "Restaurar esta copia",
  },
  "backup.confirmTitle": {
    en: "Restore backup?",
    fr: "Restaurer la sauvegarde ?",
    nl: "Back-up herstellen?",
    es: "¿Restaurar la copia?",
  },
  "backup.confirmBody": {
    en: "This writes the backup's companies, invoices, and history into this organization. It cannot be undone from the app.",
    fr: "Les entreprises, factures et l'historique de la sauvegarde seront écrits dans cette organisation. Irréversible depuis l'application.",
    nl: "De bedrijven, facturen en geschiedenis uit de back-up worden in deze organisatie geschreven. Kan niet ongedaan worden gemaakt vanuit de app.",
    es: "Las empresas, facturas e historial de la copia se escribirán en esta organización. No se puede deshacer desde la aplicación.",
  },
  "backup.done": {
    en: "Backup restored",
    fr: "Sauvegarde restaurée",
    nl: "Back-up hersteld",
    es: "Copia restaurada",
  },
  "backup.restored": {
    en: "restored",
    fr: "restauré(s)",
    nl: "hersteld",
    es: "restaurado(s)",
  },
  "backup.badFile": {
    en: "That file is not valid JSON.",
    fr: "Ce fichier n'est pas un JSON valide.",
    nl: "Dat bestand is geen geldige JSON.",
    es: "Ese archivo no es un JSON válido.",
  },
  // ---- reports -------------------------------------------------------------------
  "reports.year": { en: "Year", fr: "Année", nl: "Jaar", es: "Año" },
  "reports.invoicedPerMonth": {
    en: "Invoiced per month",
    fr: "Facturé par mois",
    nl: "Gefactureerd per maand",
    es: "Facturado por mes",
  },
  "reports.revenueCaption": {
    en: "Issued invoices, VAT included, exactly as the server totalled them.",
    fr: "Factures émises, TVA comprise, telles que totalisées par le serveur.",
    nl: "Uitgereikte facturen, inclusief btw, zoals de server ze optelde.",
    es: "Facturas emitidas, IVA incluido, tal como las totalizó el servidor.",
  },
  "reports.noRevenue": {
    en: "No invoices were issued in this year.",
    fr: "Aucune facture émise cette année.",
    nl: "In dit jaar zijn geen facturen uitgereikt.",
    es: "No se emitieron facturas este año.",
  },
  "reports.bestMonth": { en: "Best month", fr: "Meilleur mois", nl: "Beste maand", es: "Mejor mes" },
  "reports.byStatus": {
    en: "Invoices by status",
    fr: "Factures par statut",
    nl: "Facturen per status",
    es: "Facturas por estado",
  },
  "reports.count": { en: "Count", fr: "Nombre", nl: "Aantal", es: "Cantidad" },
  "reports.dueDate": { en: "Due date", fr: "Échéance", nl: "Vervaldatum", es: "Vencimiento" },
  "reports.outstandingHint": {
    en: "Issued and partially paid invoices — money billed and not yet received.",
    fr: "Factures émises et partiellement payées — facturé, pas encore encaissé.",
    nl: "Uitgereikte en deels betaalde facturen — gefactureerd, nog niet ontvangen.",
    es: "Facturas emitidas y parcialmente pagadas — facturado, aún no cobrado.",
  },
  "reports.overdueHint": {
    en: "Invoices the server has marked overdue — past their due date and unpaid.",
    fr: "Factures marquées en retard par le serveur — échues et impayées.",
    nl: "Facturen die de server als achterstallig markeerde — vervallen en onbetaald.",
    es: "Facturas marcadas como vencidas por el servidor — vencidas e impagadas.",
  },
  "reports.noOutstanding": {
    en: "Nothing outstanding. Every issued invoice has been paid.",
    fr: "Rien en attente. Toutes les factures émises sont payées.",
    nl: "Niets openstaand. Elke uitgereikte factuur is betaald.",
    es: "Nada pendiente. Todas las facturas emitidas están pagadas.",
  },
  "reports.noOverdue": {
    en: "No overdue invoices.",
    fr: "Aucune facture en retard.",
    nl: "Geen achterstallige facturen.",
    es: "Sin facturas vencidas.",
  },

  // ---- invoice detail ------------------------------------------------------------
  "invoiceDetail.summary": { en: "Summary", fr: "Récapitulatif", nl: "Overzicht", es: "Resumen" },
  "invoiceDetail.lines": { en: "Lines", fr: "Lignes", nl: "Regels", es: "Líneas" },
  "invoiceDetail.payments": { en: "Payments", fr: "Paiements", nl: "Betalingen", es: "Pagos" },
  "invoiceDetail.noPayments": {
    en: "No payment has been recorded against this invoice.",
    fr: "Aucun paiement enregistré pour cette facture.",
    nl: "Voor deze factuur is geen betaling geregistreerd.",
    es: "No se ha registrado ningún pago para esta factura.",
  },
  "invoiceDetail.history": { en: "History", fr: "Historique", nl: "Geschiedenis", es: "Historial" },
  "invoiceDetail.historyHint": {
    en: "Every recorded action on this invoice, from the audit log.",
    fr: "Chaque action enregistrée sur cette facture, depuis le journal d'audit.",
    nl: "Elke geregistreerde actie op deze factuur, uit het auditlogboek.",
    es: "Cada acción registrada sobre esta factura, desde el registro de auditoría.",
  },
  "invoiceDetail.noHistory": {
    en: "The audit log holds nothing for this invoice.",
    fr: "Le journal d'audit ne contient rien pour cette facture.",
    nl: "Het auditlogboek bevat niets voor deze factuur.",
    es: "El registro de auditoría no contiene nada para esta factura.",
  },
  "invoiceDetail.paymentTerms": {
    en: "Payment terms",
    fr: "Conditions de paiement",
    nl: "Betalingsvoorwaarden",
    es: "Condiciones de pago",
  },
  "invoiceDetail.template": { en: "PDF template", fr: "Modèle PDF", nl: "PDF-sjabloon", es: "Plantilla PDF" },
  "invoiceDetail.voidedReason": {
    en: "Void reason",
    fr: "Motif d'annulation",
    nl: "Reden van annulering",
    es: "Motivo de anulación",
  },
  "invoiceDetail.notFound": {
    en: "That invoice could not be loaded.",
    fr: "Cette facture n'a pas pu être chargée.",
    nl: "Deze factuur kon niet worden geladen.",
    es: "No se pudo cargar esa factura.",
  },
  "invoiceDetail.backToInvoices": {
    en: "Back to invoices",
    fr: "Retour aux factures",
    nl: "Terug naar facturen",
    es: "Volver a las facturas",
  },
  "invoiceDetail.method": { en: "Method", fr: "Moyen", nl: "Methode", es: "Método" },
  "invoiceDetail.open": {
    en: "Open full record",
    fr: "Ouvrir la fiche complète",
    nl: "Volledig record openen",
    es: "Abrir la ficha completa",
  },

  // ---- products (detail & editing) ------------------------------------------------
  "products.description": { en: "Description", fr: "Description", nl: "Omschrijving", es: "Descripción" },
  "products.billingType": {
    en: "Billing type",
    fr: "Type de facturation",
    nl: "Facturatietype",
    es: "Tipo de facturación",
  },
  "products.status": { en: "Status", fr: "Statut", nl: "Status", es: "Estado" },
  "products.anyStatus": {
    en: "Any status",
    fr: "Tous les statuts",
    nl: "Elke status",
    es: "Cualquier estado",
  },
  "products.anyBillingType": {
    en: "Any billing type",
    fr: "Tous les types",
    nl: "Elk factureringstype",
    es: "Cualquier tipo",
  },
  "products.filtered": {
    en: "Filtered on the server — the list below is the whole result, not a page of it.",
    fr: "Filtré côté serveur — la liste ci-dessous est le résultat complet.",
    nl: "Op de server gefilterd — de lijst hieronder is het volledige resultaat.",
    es: "Filtrado en el servidor — la lista es el resultado completo.",
  },
  "products.edit": { en: "Edit product", fr: "Modifier le produit", nl: "Product bewerken", es: "Editar producto" },
  "products.saved": {
    en: "Product saved.",
    fr: "Produit enregistré.",
    nl: "Product opgeslagen.",
    es: "Producto guardado.",
  },

  // ---- activity log columns --------------------------------------------------------
  "activity.action": { en: "Action", fr: "Action", nl: "Actie", es: "Acción" },
  "activity.target": { en: "Record", fr: "Enregistrement", nl: "Record", es: "Registro" },
  "activity.when": { en: "When", fr: "Quand", nl: "Wanneer", es: "Cuándo" },
  "activity.clientTitle": {
    en: "Client record activity",
    fr: "Activité sur les fiches clients",
    nl: "Activiteit op klantrecords",
    es: "Actividad de fichas de cliente",
  },
  "activity.clientHint": {
    en: "Who created, edited or imported a client record. Not the commercial history.",
    fr: "Qui a créé, modifié ou importé une fiche client. Pas l'historique commercial.",
    nl: "Wie een klantrecord aanmaakte, wijzigde of importeerde. Niet de commerciële historiek.",
    es: "Quién creó, editó o importó una ficha de cliente. No el historial comercial.",
  },

  // ---- common (feedback) -----------------------------------------------------------
  "common.retry": { en: "Try again", fr: "Réessayer", nl: "Opnieuw proberen", es: "Reintentar" },
  "common.saved": { en: "Saved", fr: "Enregistré", nl: "Opgeslagen", es: "Guardado" },

  // ---- audit actions (AuditAction in core/models/audit_log.py) ---------------------
  "audit.create": { en: "Created", fr: "Créé", nl: "Aangemaakt", es: "Creado" },
  "audit.update": { en: "Edited", fr: "Modifié", nl: "Gewijzigd", es: "Editado" },
  "audit.issue": { en: "Issued", fr: "Émis", nl: "Uitgereikt", es: "Emitida" },
  "audit.pay": { en: "Payment recorded", fr: "Paiement enregistré", nl: "Betaling geregistreerd", es: "Pago registrado" },
  "audit.void": { en: "Voided", fr: "Annulé", nl: "Geannuleerd", es: "Anulada" },
  "audit.delete": { en: "Deleted", fr: "Supprimé", nl: "Verwijderd", es: "Eliminado" },
  "audit.export_pdf": { en: "PDF exported", fr: "PDF exporté", nl: "PDF geëxporteerd", es: "PDF exportado" },
  "audit.export_peppol": { en: "Peppol XML exported", fr: "XML Peppol exporté", nl: "Peppol-XML geëxporteerd", es: "XML Peppol exportado" },
  "audit.export_backup": { en: "Backup exported", fr: "Sauvegarde exportée", nl: "Back-up geëxporteerd", es: "Copia exportada" },
  "audit.restore": { en: "Restored", fr: "Restauré", nl: "Hersteld", es: "Restaurado" },
  "audit.import": { en: "Imported", fr: "Importé", nl: "Geïmporteerd", es: "Importado" },
  "audit.login": { en: "Signed in", fr: "Connexion", nl: "Aangemeld", es: "Inicio de sesión" },
  "audit.logout": { en: "Signed out", fr: "Déconnexion", nl: "Afgemeld", es: "Cierre de sesión" },
  "audit.error": { en: "Error", fr: "Erreur", nl: "Fout", es: "Error" },
  //  Written by api/security/auth_service.py, and unlabelled until 2026-09-04 —
  //  tAuditAction falls back to the wire value, so the activity log read
  //  "session.revoke" in every language.
  "audit.session.revoke": { en: "Session revoked", fr: "Session révoquée", nl: "Sessie ingetrokken", es: "Sesión revocada" },
  "audit.password.change": { en: "Password changed", fr: "Mot de passe modifié", nl: "Wachtwoord gewijzigd", es: "Contraseña cambiada" },

  // ---- VAT report -------------------------------------------------------------
  // Every string here has to survive being read by an accountant. The caveat
  // keys in particular are not decoration: the endpoint returns SALES only, and
  // a screen that let someone believe otherwise would be a filing error.
  "vat.title": { en: "VAT", fr: "TVA", nl: "Btw", es: "IVA" },
  "vat.period": { en: "Period", fr: "Période", nl: "Periode", es: "Período" },
  "vat.granularity": { en: "Period type", fr: "Type de période", nl: "Periodetype", es: "Tipo de período" },
  "vat.month": { en: "Month", fr: "Mois", nl: "Maand", es: "Mes" },
  "vat.quarter": { en: "Quarter", fr: "Trimestre", nl: "Kwartaal", es: "Trimestre" },
  "vat.year": { en: "Year", fr: "Année", nl: "Jaar", es: "Año" },
  "vat.outputOnly": {
    en: "Sales only — output VAT",
    fr: "Ventes uniquement — TVA due",
    nl: "Alleen verkopen — verschuldigde btw",
    es: "Solo ventas — IVA repercutido",
  },
  "vat.outputOnlyBody": {
    en: "This is a preparation aid, not a return you can file. BillGen holds no purchases, so deductible VAT and the 71/72 balance are not in it. Check the figures against your accounting before declaring.",
    fr: "Il s'agit d'une aide à la préparation, pas d'une déclaration prête à déposer. BillGen ne contient aucun achat : la TVA déductible et le solde 71/72 n'y figurent pas. Vérifiez les montants avec votre comptabilité avant de déclarer.",
    nl: "Dit is een hulpmiddel bij de voorbereiding, geen aangifte die u kunt indienen. BillGen bevat geen aankopen, dus aftrekbare btw en het saldo 71/72 ontbreken. Controleer de bedragen met uw boekhouding voor u aangifte doet.",
    es: "Es una ayuda de preparación, no una declaración lista para presentar. BillGen no contiene compras, por lo que el IVA deducible y el saldo 71/72 no están incluidos. Verifique las cifras con su contabilidad antes de declarar.",
  },
  "vat.otherCurrency": {
    en: "Documents in another currency were left out",
    fr: "Des documents dans une autre devise ont été exclus",
    nl: "Documenten in een andere valuta zijn weggelaten",
    es: "Se excluyeron documentos en otra moneda",
  },
  "vat.otherCurrencyBody": {
    en: "The report is denominated in one currency. Anything invoiced in another is not counted here and has to be declared separately.",
    fr: "Le rapport est libellé dans une seule devise. Ce qui est facturé dans une autre n'est pas compté ici et doit être déclaré séparément.",
    nl: "Het rapport luidt in één valuta. Wat in een andere valuta is gefactureerd, telt hier niet mee en moet apart worden aangegeven.",
    es: "El informe se expresa en una sola moneda. Lo facturado en otra no se cuenta aquí y debe declararse por separado.",
  },
  "vat.category": { en: "Category", fr: "Catégorie", nl: "Categorie", es: "Categoría" },
  "vat.rate": { en: "Rate", fr: "Taux", nl: "Tarief", es: "Tipo" },
  "vat.grid": { en: "Grid", fr: "Grille", nl: "Rooster", es: "Casilla" },
  "vat.invoicedBase": { en: "Invoiced base", fr: "Base facturée", nl: "Gefactureerde basis", es: "Base facturada" },
  "vat.invoicedVat": { en: "Invoiced VAT", fr: "TVA facturée", nl: "Gefactureerde btw", es: "IVA facturado" },
  "vat.creditedBase": { en: "Credited base", fr: "Base créditée", nl: "Gecrediteerde basis", es: "Base abonada" },
  "vat.creditedVat": { en: "Credited VAT", fr: "TVA créditée", nl: "Gecrediteerde btw", es: "IVA abonado" },
  "vat.netBase": { en: "Net base", fr: "Base nette", nl: "Nettobasis", es: "Base neta" },
  "vat.netVat": { en: "Net VAT", fr: "TVA nette", nl: "Netto btw", es: "IVA neto" },
  "vat.invoiceCount": { en: "Invoices", fr: "Factures", nl: "Facturen", es: "Facturas" },
  "vat.creditNoteCount": { en: "Credit notes", fr: "Notes de crédit", nl: "Creditnota's", es: "Notas de crédito" },
  "vat.breakdown": {
    en: "Per category and rate",
    fr: "Par catégorie et taux",
    nl: "Per categorie en tarief",
    es: "Por categoría y tipo",
  },
  "vat.noLines": {
    en: "Nothing was invoiced in this period.",
    fr: "Rien n'a été facturé sur cette période.",
    nl: "In deze periode is niets gefactureerd.",
    es: "No se facturó nada en este período.",
  },
  "vat.gridUnmapped": {
    en: "No unambiguous grid",
    fr: "Pas de grille univoque",
    nl: "Geen eenduidig rooster",
    es: "Sin casilla inequívoca",
  },
  "vat.breakdownLockedBody": {
    en: "Your plan shows the period totals. The breakdown per category and rate comes with a paid plan.",
    fr: "Votre formule affiche les totaux de la période. Le détail par catégorie et taux est inclus dans une formule payante.",
    nl: "Uw abonnement toont de periodetotalen. De uitsplitsing per categorie en tarief hoort bij een betaald abonnement.",
    es: "Su plan muestra los totales del período. El desglose por categoría y tipo se incluye en un plan de pago.",
  },
  "vat.breakdownLocked": {
    en: "The per-rate breakdown is part of a paid plan.",
    fr: "Le détail par taux fait partie d'une formule payante.",
    nl: "De uitsplitsing per tarief hoort bij een betaald abonnement.",
    es: "El desglose por tipo forma parte de un plan de pago.",
  },

  // ---- plan, usage & entitlements (B4) ----------------------------------------
  // Two vocabularies arrive from the server as raw wire strings: meter names
  // ("invoices") and feature keys ("pdf_remove_branding"). Both are translated
  // through tMeter/tFeature, which fall back to the raw key so a backend newer
  // than this UI degrades to an ugly label instead of a blank cell.
  "plan.title": { en: "Plan & usage", fr: "Formule et utilisation", nl: "Abonnement en verbruik", es: "Plan y uso" },
  "plan.current": { en: "Current plan", fr: "Formule actuelle", nl: "Huidig abonnement", es: "Plan actual" },
  "plan.status": { en: "Subscription status", fr: "Statut de l'abonnement", nl: "Abonnementsstatus", es: "Estado de la suscripción" },
  "plan.usage": { en: "Usage", fr: "Utilisation", nl: "Verbruik", es: "Uso" },
  "plan.used": { en: "Used", fr: "Utilisé", nl: "Gebruikt", es: "Usado" },
  "plan.limit": { en: "Limit", fr: "Limite", nl: "Limiet", es: "Límite" },
  "plan.remaining": { en: "remaining", fr: "restant", nl: "resterend", es: "restante" },
  "plan.unlimited": { en: "Unlimited", fr: "Illimité", nl: "Onbeperkt", es: "Ilimitado" },
  "plan.thisPeriod": { en: "this month", fr: "ce mois-ci", nl: "deze maand", es: "este mes" },
  "plan.exhausted": { en: "Limit reached", fr: "Limite atteinte", nl: "Limiet bereikt", es: "Límite alcanzado" },
  "plan.features": { en: "What your plan includes", fr: "Ce que votre formule inclut", nl: "Wat uw abonnement bevat", es: "Lo que incluye su plan" },
  "plan.allPlans": { en: "All plans", fr: "Toutes les formules", nl: "Alle abonnementen", es: "Todos los planes" },
  "plan.yourPlan": { en: "Your plan", fr: "Votre formule", nl: "Uw abonnement", es: "Su plan" },
  "plan.seePlans": { en: "See plans", fr: "Voir les formules", nl: "Bekijk abonnementen", es: "Ver planes" },
  "plan.included": { en: "Included", fr: "Inclus", nl: "Inbegrepen", es: "Incluido" },
  "plan.notIncluded": { en: "Not included", fr: "Non inclus", nl: "Niet inbegrepen", es: "No incluido" },
  "plan.upgradeTitle": { en: "Not on your plan", fr: "Absent de votre formule", nl: "Niet in uw abonnement", es: "No está en su plan" },
  "plan.limitTitle": { en: "Plan limit reached", fr: "Limite de la formule atteinte", nl: "Abonnementslimiet bereikt", es: "Límite del plan alcanzado" },
  "plan.requiredTier": { en: "Available from", fr: "Disponible à partir de", nl: "Beschikbaar vanaf", es: "Disponible desde" },
  "plan.noUpgrade": {
    en: "No plan includes this yet.",
    fr: "Aucune formule ne l'inclut encore.",
    nl: "Nog geen abonnement bevat dit.",
    es: "Ningún plan lo incluye todavía.",
  },
  "plan.usageCaption": {
    en: "Counted by the server. Screens hide what your plan excludes; the server refuses it independently.",
    fr: "Compté par le serveur. Les écrans masquent ce que votre formule exclut ; le serveur le refuse indépendamment.",
    nl: "Geteld door de server. Schermen verbergen wat uw abonnement uitsluit; de server weigert het onafhankelijk.",
    es: "Contado por el servidor. Las pantallas ocultan lo que su plan excluye; el servidor lo rechaza de forma independiente.",
  },
  "plan.matrixCaption": {
    en: "Served from the server's own plan matrix — there is no second copy in the app.",
    fr: "Servi depuis la matrice de formules du serveur — il n'y a pas de seconde copie dans l'application.",
    nl: "Geleverd door de abonnementsmatrix van de server — er is geen tweede kopie in de app.",
    es: "Servido desde la matriz de planes del servidor: no hay una segunda copia en la aplicación.",
  },
  "plan.noBilling": {
    en: "Changing plan is not possible yet: no checkout is connected.",
    fr: "Changer de formule n'est pas encore possible : aucun paiement n'est connecté.",
    nl: "Van abonnement wisselen kan nog niet: er is geen afrekening gekoppeld.",
    es: "Aún no se puede cambiar de plan: no hay pago conectado.",
  },

  // ---- subscription status (wire values from api/entitlements/service.py) -----
  // "none" is the honest state for every tenant today: no billing provider is
  // connected, so no organisation has a SubscriptionRow at all.
  "substatus.none": { en: "No subscription", fr: "Aucun abonnement", nl: "Geen abonnement", es: "Sin suscripción" },
  "substatus.active": { en: "Active", fr: "Actif", nl: "Actief", es: "Activa" },
  "substatus.trialing": { en: "Trial", fr: "Essai", nl: "Proefperiode", es: "Prueba" },
  "substatus.past_due": { en: "Payment overdue", fr: "Paiement en retard", nl: "Betaling te laat", es: "Pago vencido" },
  "substatus.canceled": { en: "Cancelled", fr: "Résilié", nl: "Opgezegd", es: "Cancelada" },

  // ---- tier names (wire values from PlanTier) ----------------------------------
  "tier.free": { en: "Free", fr: "Gratuit", nl: "Gratis", es: "Gratis" },
  "tier.starter": { en: "Starter", fr: "Starter", nl: "Starter", es: "Starter" },
  "tier.business": { en: "Business", fr: "Business", nl: "Business", es: "Business" },
  "tier.business_pro": { en: "Business Pro", fr: "Business Pro", nl: "Business Pro", es: "Business Pro" },

  // ---- meter names (wire values from api/entitlements/matrix.py) ---------------
  "meter.invoices": { en: "Invoices", fr: "Factures", nl: "Facturen", es: "Facturas" },
  "meter.clients": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
  "meter.products": { en: "Products", fr: "Produits", nl: "Producten", es: "Productos" },
  "meter.companies": { en: "Companies", fr: "Sociétés", nl: "Bedrijven", es: "Empresas" },
  "meter.seats": { en: "Users", fr: "Utilisateurs", nl: "Gebruikers", es: "Usuarios" },
  "meter.peppol_documents": { en: "Peppol documents", fr: "Documents Peppol", nl: "Peppol-documenten", es: "Documentos Peppol" },

  // ---- feature names ----------------------------------------------------------
  "feature.credit_notes": { en: "Credit notes", fr: "Notes de crédit", nl: "Creditnota's", es: "Notas de crédito" },
  "feature.pdf_export": { en: "PDF export", fr: "Export PDF", nl: "PDF-export", es: "Exportación PDF" },
  "feature.backup_export": { en: "Backup export", fr: "Export de sauvegarde", nl: "Back-up exporteren", es: "Exportar copia de seguridad" },
  "feature.backup_restore": { en: "Backup restore", fr: "Restauration de sauvegarde", nl: "Back-up herstellen", es: "Restaurar copia de seguridad" },
  "feature.backup_automatic": { en: "Automatic backups", fr: "Sauvegardes automatiques", nl: "Automatische back-ups", es: "Copias automáticas" },
  "feature.backup_scheduled": { en: "Scheduled backups", fr: "Sauvegardes planifiées", nl: "Geplande back-ups", es: "Copias programadas" },
  "feature.backup_history": { en: "Backup history", fr: "Historique des sauvegardes", nl: "Back-upgeschiedenis", es: "Historial de copias" },
  "feature.import_legacy": { en: "Legacy import", fr: "Import de l'ancien logiciel", nl: "Import uit oude software", es: "Importación heredada" },
  "feature.pdf_remove_branding": { en: "Remove BillGen branding", fr: "Retirer la marque BillGen", nl: "BillGen-merk verwijderen", es: "Quitar la marca BillGen" },
  "feature.pdf_templates_premium": { en: "Premium PDF templates", fr: "Modèles PDF premium", nl: "Premium PDF-sjablonen", es: "Plantillas PDF premium" },
  "feature.pdf_customization": { en: "PDF customisation", fr: "Personnalisation du PDF", nl: "PDF-aanpassing", es: "Personalización del PDF" },
  "feature.peppol_export": { en: "Peppol export", fr: "Export Peppol", nl: "Peppol-export", es: "Exportación Peppol" },
  "feature.vat_report": { en: "VAT report", fr: "Rapport TVA", nl: "Btw-rapport", es: "Informe de IVA" },
  "feature.dashboard": { en: "Dashboard", fr: "Tableau de bord", nl: "Dashboard", es: "Panel" },
  "feature.search": { en: "Search", fr: "Recherche", nl: "Zoeken", es: "Búsqueda" },
  "feature.audit_history": { en: "Audit history", fr: "Historique d'audit", nl: "Auditgeschiedenis", es: "Historial de auditoría" },
  // ---- invoices report ----------------------------------------------------------
  "invoiceReport.title": { en: "Invoices", fr: "Factures", nl: "Facturen", es: "Facturas" },
  "invoiceReport.invoiced": { en: "Invoiced", fr: "Facturé", nl: "Gefactureerd", es: "Facturado" },
  "invoiceReport.paid": { en: "Paid", fr: "Encaissé", nl: "Betaald", es: "Cobrado" },
  "invoiceReport.drafts": { en: "Drafts", fr: "Brouillons", nl: "Concepten", es: "Borradores" },
  "invoiceReport.draftsHint": {
    en: "Counted, but in no total — a draft has no number and is owed by nobody.",
    fr: "Comptés, hors totaux — un brouillon n'a pas de numéro et n'est dû par personne.",
    nl: "Geteld, maar in geen enkel totaal — een concept heeft geen nummer.",
    es: "Contados, fuera de los totales — un borrador no tiene número.",
  },
  "invoiceReport.countHint": {
    en: "invoices in this period",
    fr: "factures sur la période",
    nl: "facturen in deze periode",
    es: "facturas en el período",
  },
  "invoiceReport.overdueHint": {
    en: "invoices past their due date",
    fr: "factures échues",
    nl: "facturen over de vervaldatum",
    es: "facturas vencidas",
  },
  "invoiceReport.mixedCurrency": {
    en: "Invoices in another currency were left out",
    fr: "Des factures dans une autre devise ont été exclues",
    nl: "Facturen in een andere valuta zijn weggelaten",
    es: "Se excluyeron facturas en otra moneda",
  },
  "invoiceReport.mixedCurrencyBody": {
    en: "invoices are denominated in another currency and are in none of the figures above.",
    fr: "factures sont libellées dans une autre devise et ne figurent dans aucun total ci-dessus.",
    nl: "facturen staan in een andere valuta en zitten in geen enkel bedrag hierboven.",
    es: "facturas están en otra moneda y no entran en ninguna cifra anterior.",
  },
  "invoiceReport.none": {
    en: "No invoice in this period.",
    fr: "Aucune facture sur cette période.",
    nl: "Geen factuur in deze periode.",
    es: "Ninguna factura en este período.",
  },

  // ---- payments report ----------------------------------------------------------
  "payments.title": { en: "Payments", fr: "Paiements", nl: "Betalingen", es: "Pagos" },
  "payments.subtitle": {
    en: "Money received, across every invoice.",
    fr: "Encaissements, toutes factures confondues.",
    nl: "Ontvangen bedragen, over alle facturen heen.",
    es: "Cobros recibidos, en todas las facturas.",
  },
  "payments.paidOn": { en: "Paid on", fr: "Payé le", nl: "Betaald op", es: "Pagado el" },
  "payments.invoice": { en: "Invoice", fr: "Facture", nl: "Factuur", es: "Factura" },
  "payments.method": { en: "Method", fr: "Moyen", nl: "Wijze", es: "Método" },
  "payments.amount": { en: "Amount", fr: "Montant", nl: "Bedrag", es: "Importe" },
  "payments.from": { en: "Paid from", fr: "Payé à partir du", nl: "Betaald vanaf", es: "Pagado desde" },
  "payments.to": { en: "Paid until", fr: "Payé jusqu'au", nl: "Betaald tot", es: "Pagado hasta" },
  "payments.clearWindow": {
    en: "Clear the date window",
    fr: "Effacer la période",
    nl: "Periode wissen",
    es: "Borrar el período",
  },
  // The server sends these as message keys rather than prose — see
  // api/routers/reference.py — so the explanation is translated here and the
  // backend stays out of the language business.
  "vat.reason.standard": {
    en: "Standard Belgian VAT.",
    fr: "TVA belge normale.",
    nl: "Normale Belgische btw.",
    es: "IVA belga estándar.",
  },
  "vat.reason.intra_eu_b2b": {
    en: "Intra-EU B2B — VAT reverse-charged to the customer.",
    fr: "B2B intracommunautaire — TVA autoliquidée par le client.",
    nl: "Intracommunautair B2B — btw verlegd naar de klant.",
    es: "B2B intracomunitario — IVA con inversión del sujeto pasivo.",
  },
  "vat.reason.intra_eu_goods": {
    en: "Intra-EU B2B supply of goods — exempt.",
    fr: "Livraison intracommunautaire de biens — exemptée.",
    nl: "Intracommunautaire levering van goederen — vrijgesteld.",
    es: "Entrega intracomunitaria de bienes — exenta.",
  },
  "vat.reason.outside_eu": {
    en: "Export outside the EU — no Belgian VAT.",
    fr: "Exportation hors UE — pas de TVA belge.",
    nl: "Uitvoer buiten de EU — geen Belgische btw.",
    es: "Exportación fuera de la UE — sin IVA belga.",
  },
  "invoice.newProduct": {
    en: "+ New item…",
    fr: "+ Nouvel article…",
    nl: "+ Nieuw artikel…",
    es: "+ Nuevo artículo…",
  },
  "invoice.newProductTitle": {
    en: "New catalog item",
    fr: "Nouvel article du catalogue",
    nl: "Nieuw catalogusartikel",
    es: "Nuevo artículo del catálogo",
  },
  "invoice.newProductHint": {
    en: "Saved to the catalog and put on this line. The rest of its details can be filled in under Catalog.",
    fr: "Enregistré au catalogue et placé sur cette ligne. Le reste de ses détails se complète dans Catalogue.",
    nl: "Opgeslagen in de catalogus en op deze regel gezet. De overige gegevens vult u aan onder Catalogus.",
    es: "Guardado en el catálogo y añadido a esta línea. El resto de sus datos se completa en Catálogo.",
  },
  "invoice.productName": {
    en: "Name",
    fr: "Nom",
    nl: "Naam",
    es: "Nombre",
  },
  "invoice.product": {
    en: "Item",
    fr: "Article",
    nl: "Artikel",
    es: "Artículo",
  },
  "invoice.freeText": {
    en: "Free text",
    fr: "Texte libre",
    nl: "Vrije tekst",
    es: "Texto libre",
  },
  "invoice.vatTreatment": {
    en: "VAT treatment",
    fr: "Régime de TVA",
    nl: "Btw-regeling",
    es: "Régimen de IVA",
  },
  "payments.received": {
    en: "Received",
    fr: "Encaissé",
    nl: "Ontvangen",
    es: "Cobrado",
  },
  "payments.receivedHint": {
    en: "payments in this window",
    fr: "paiements sur cette période",
    nl: "betalingen in deze periode",
    es: "pagos en este período",
  },
  "payments.largest": {
    en: "Largest",
    fr: "Plus élevé",
    nl: "Grootste",
    es: "Mayor",
  },
  "payments.otherCurrency": {
    en: "not counted — another currency",
    fr: "non comptés — autre devise",
    nl: "niet meegeteld — andere valuta",
    es: "no contados — otra moneda",
  },
  "payments.none": {
    en: "No payment was recorded in this window.",
    fr: "Aucun paiement enregistré sur cette période.",
    nl: "Geen betaling geregistreerd in deze periode.",
    es: "Ningún pago registrado en este período.",
  },
  "feature.payment_tracking": { en: "Payment tracking", fr: "Suivi des paiements", nl: "Betalingsopvolging", es: "Seguimiento de pagos" },
  "feature.recurring_invoices": { en: "Recurring invoices", fr: "Factures récurrentes", nl: "Terugkerende facturen", es: "Facturas recurrentes" },
  "feature.accountant_export": { en: "Accountant export", fr: "Export comptable", nl: "Boekhoudexport", es: "Exportación contable" },
  "feature.multi_company": { en: "Multiple companies", fr: "Plusieurs sociétés", nl: "Meerdere bedrijven", es: "Varias empresas" },
  "feature.company_level_settings": { en: "Per-company settings", fr: "Paramètres par société", nl: "Instellingen per bedrijf", es: "Ajustes por empresa" },
  "feature.roles_permissions": { en: "Roles & permissions", fr: "Rôles et permissions", nl: "Rollen en rechten", es: "Roles y permisos" },
  "feature.team_administration": { en: "Team administration", fr: "Administration d'équipe", nl: "Teambeheer", es: "Administración de equipo" },
  "feature.priority_support": { en: "Priority support", fr: "Support prioritaire", nl: "Prioritaire ondersteuning", es: "Soporte prioritario" },

  // ---- graded feature levels --------------------------------------------------
  "level.basic": { en: "Basic", fr: "Basique", nl: "Basis", es: "Básico" },
  "level.standard": { en: "Standard", fr: "Standard", nl: "Standaard", es: "Estándar" },
  "level.full": { en: "Full", fr: "Complet", nl: "Volledig", es: "Completo" },
  "level.advanced": { en: "Advanced", fr: "Avancé", nl: "Geavanceerd", es: "Avanzado" },
  "level.custom": { en: "Custom", fr: "Sur mesure", nl: "Op maat", es: "A medida" },
  "level.consolidated": { en: "Consolidated", fr: "Consolidé", nl: "Geconsolideerd", es: "Consolidado" },
  "level.csv": { en: "CSV", fr: "CSV", nl: "CSV", es: "CSV" },
  "level.structured": { en: "Structured", fr: "Structuré", nl: "Gestructureerd", es: "Estructurado" },

  // ---- onboarding — the guided first run (T-29) -------------------------------
  //  Dutch drafted without a native read (SOLO_RUN § Boundaries); Henri reads
  //  FR and NL before this ships. Kept short on purpose: a wizard is not the
  //  place to explain the product, it is the place to get her to an invoice.
  "onboarding.title": { en: "Welcome to BillGen", fr: "Bienvenue dans BillGen", nl: "Welkom bij BillGen", es: "Bienvenido a BillGen" },
  "onboarding.subtitle": { en: "Five short steps, then your first invoice. You can leave and come back — nothing here is lost.", fr: "Cinq étapes courtes, puis votre première facture. Vous pouvez quitter et revenir — rien n'est perdu.", nl: "Vijf korte stappen, dan uw eerste factuur. U kunt weggaan en terugkomen — niets gaat verloren.", es: "Cinco pasos cortos y luego su primera factura. Puede salir y volver — nada se pierde." },
  "onboarding.step.language": { en: "Language & look", fr: "Langue et apparence", nl: "Taal en uiterlijk", es: "Idioma y aspecto" },
  "onboarding.step.company": { en: "Your company", fr: "Votre entreprise", nl: "Uw onderneming", es: "Su empresa" },
  "onboarding.step.legal": { en: "Terms", fr: "Conditions", nl: "Voorwaarden", es: "Condiciones" },
  "onboarding.step.seed": { en: "First client & service", fr: "Premier client et service", nl: "Eerste klant en dienst", es: "Primer cliente y servicio" },
  "onboarding.step.done": { en: "First invoice", fr: "Première facture", nl: "Eerste factuur", es: "Primera factura" },
  "onboarding.theme": { en: "Theme", fr: "Thème", nl: "Thema", es: "Tema" },
  "onboarding.language.hint": { en: "This sets the interface. Each company chooses the language of its documents separately.", fr: "Ceci règle l'interface. Chaque entreprise choisit séparément la langue de ses documents.", nl: "Dit bepaalt de interface. Elke onderneming kiest apart de taal van haar documenten.", es: "Esto configura la interfaz. Cada empresa elige por separado el idioma de sus documentos." },
  "onboarding.locale.hint": { en: "Currency EUR · dates DD/MM/YYYY · Belgian structured communication (+++123/4567/89012+++).", fr: "Devise EUR · dates JJ/MM/AAAA · communication structurée belge (+++123/4567/89012+++).", nl: "Munt EUR · datums DD/MM/JJJJ · Belgische gestructureerde mededeling (+++123/4567/89012+++).", es: "Moneda EUR · fechas DD/MM/AAAA · comunicación estructurada belga (+++123/4567/89012+++)." },
  "onboarding.company.hint": { en: "Every invoice's mandatory mentions come from here. The enterprise number, VAT number and IBAN are checked as you type.", fr: "Les mentions obligatoires de chaque facture viennent d'ici. Numéro d'entreprise, TVA et IBAN sont vérifiés à la saisie.", nl: "De verplichte vermeldingen van elke factuur komen hiervandaan. Ondernemingsnummer, btw-nummer en IBAN worden bij het typen gecontroleerd.", es: "Las menciones obligatorias de cada factura salen de aquí. El número de empresa, el NIF-IVA y el IBAN se comprueban al escribir." },
  "onboarding.company.valid": { en: "Identifiers check out.", fr: "Identifiants valides.", nl: "Identificatiegegevens in orde.", es: "Identificadores correctos." },
  "onboarding.company.invalid": { en: "Fix these before the first invoice:", fr: "À corriger avant la première facture :", nl: "Te verbeteren vóór de eerste factuur:", es: "Corrija esto antes de la primera factura:" },
  "onboarding.company.edit": { en: "Edit company", fr: "Modifier l'entreprise", nl: "Onderneming bewerken", es: "Editar empresa" },
  "onboarding.legal.hint": { en: "Read each text, then accept it. A copy of what you accepted is kept with your data.", fr: "Lisez chaque texte, puis acceptez-le. Une copie de ce que vous avez accepté est conservée avec vos données.", nl: "Lees elke tekst en aanvaard hem. Een kopie van wat u aanvaardde wordt bij uw gegevens bewaard.", es: "Lea cada texto y acéptelo. Se guarda una copia de lo aceptado junto con sus datos." },
  "onboarding.legal.none": { en: "No text requires your acceptance yet.", fr: "Aucun texte ne requiert votre acceptation pour l'instant.", nl: "Nog geen tekst vereist uw aanvaarding.", es: "Ningún texto requiere aún su aceptación." },
  "onboarding.legal.accept": { en: "I have read and accept", fr: "J'ai lu et j'accepte", nl: "Ik heb gelezen en aanvaard", es: "He leído y acepto" },
  "onboarding.legal.accepted": { en: "Accepted", fr: "Accepté", nl: "Aanvaard", es: "Aceptado" },
  "onboarding.seed.hint": { en: "Optional. One client and one service are enough for a first invoice; everything else can follow.", fr: "Facultatif. Un client et un service suffisent pour une première facture ; le reste peut suivre.", nl: "Optioneel. Eén klant en één dienst volstaan voor een eerste factuur; de rest kan later.", es: "Opcional. Un cliente y un servicio bastan para una primera factura; el resto puede venir después." },
  "onboarding.seed.client": { en: "First client", fr: "Premier client", nl: "Eerste klant", es: "Primer cliente" },
  "onboarding.seed.service": { en: "First service or product", fr: "Premier service ou produit", nl: "Eerste dienst of product", es: "Primer servicio o producto" },
  "onboarding.seed.added": { en: "Added", fr: "Ajouté", nl: "Toegevoegd", es: "Añadido" },
  "onboarding.data.hint": { en: "Your invoices, documents and backups are kept in this folder on this computer:", fr: "Vos factures, documents et sauvegardes sont conservés dans ce dossier sur cet ordinateur :", nl: "Uw facturen, documenten en back-ups worden in deze map op deze computer bewaard:", es: "Sus facturas, documentos y copias de seguridad se guardan en esta carpeta de este equipo:" },
  "onboarding.done.hint": { en: "Setup is complete. The number on your first invoice is assigned the moment you issue it, never before.", fr: "La configuration est terminée. Le numéro de votre première facture est attribué au moment où vous l'émettez, jamais avant.", nl: "De configuratie is klaar. Het nummer van uw eerste factuur wordt toegekend op het moment dat u ze uitgeeft, nooit eerder.", es: "La configuración está completa. El número de su primera factura se asigna en el momento de emitirla, nunca antes." },
  "onboarding.done.blocked": { en: "Not finished yet:", fr: "Pas encore terminé :", nl: "Nog niet klaar:", es: "Aún no terminado:" },
  "onboarding.done.finish": { en: "Finish setup", fr: "Terminer la configuration", nl: "Configuratie afronden", es: "Finalizar configuración" },
  "onboarding.done.firstInvoice": { en: "Create my first invoice", fr: "Créer ma première facture", nl: "Mijn eerste factuur maken", es: "Crear mi primera factura" },
  "onboarding.next": { en: "Next", fr: "Suivant", nl: "Volgende", es: "Siguiente" },
  "onboarding.back": { en: "Back", fr: "Retour", nl: "Terug", es: "Atrás" },
  "onboarding.blocker.noCompany": { en: "a company", fr: "une entreprise", nl: "een onderneming", es: "una empresa" },
  "onboarding.blocker.company": { en: "company identifiers", fr: "identifiants de l'entreprise", nl: "ondernemingsgegevens", es: "identificadores de la empresa" },
  "onboarding.blocker.accept": { en: "acceptance of", fr: "acceptation de", nl: "aanvaarding van", es: "aceptación de" },

  // ---- the first run's profile step (T-29) -------------------------------------
  "onboarding.step.profile": { en: "Who you are", fr: "Qui vous êtes", nl: "Wie u bent", es: "Quién es usted" },
  "onboarding.profile.hint": { en: "Your name and what you call your business. Both appear on anything you accept here, so neither can stay as the placeholder this install started with.", fr: "Votre nom et le nom que vous donnez à votre activité. Les deux figurent sur tout ce que vous acceptez ici, donc aucun ne peut rester le nom par défaut de cette installation.", nl: "Uw naam en hoe u uw zaak noemt. Beide verschijnen op alles wat u hier aanvaardt, dus geen van beide mag de standaardnaam van deze installatie blijven.", es: "Su nombre y cómo llama a su actividad. Ambos aparecen en todo lo que acepte aquí, así que ninguno puede quedarse con el nombre por defecto de esta instalación." },
  "onboarding.profile.yourName": { en: "Your name", fr: "Votre nom", nl: "Uw naam", es: "Su nombre" },
  "onboarding.profile.orgName": { en: "Your business", fr: "Votre activité", nl: "Uw zaak", es: "Su actividad" },
  "onboarding.profile.orgHint": { en: "A short name for you and this app. The legal name that goes on the invoices is the next step.", fr: "Un nom court, pour vous et pour cette application. Le nom légal qui figure sur les factures, c'est l'étape suivante.", nl: "Een korte naam, voor u en voor deze toepassing. De wettelijke naam op de facturen is de volgende stap.", es: "Un nombre corto, para usted y para esta aplicación. El nombre legal que va en las facturas es el paso siguiente." },
  "onboarding.profile.localAccount": { en: "This copy signs in on this computer without a password, so there is no e-mail address to confirm.", fr: "Cette copie s'ouvre sur cet ordinateur sans mot de passe ; il n'y a donc pas d'adresse e-mail à confirmer.", nl: "Deze kopie meldt zich op deze computer aan zonder wachtwoord; er is dus geen e-mailadres te bevestigen.", es: "Esta copia se abre en este equipo sin contraseña, así que no hay dirección de correo que confirmar." },
  "onboarding.blocker.profile": { en: "your name and your business name", fr: "votre nom et le nom de votre activité", nl: "uw naam en de naam van uw zaak", es: "su nombre y el nombre de su actividad" },

  // ---- privacy — a client is a data subject (T-35) -----------------------------
  //  Dutch drafted without a native read; Henri reads FR and NL before this ships.
  "privacy.title": { en: "Privacy", fr: "Confidentialité", nl: "Privacy", es: "Privacidad" },
  "privacy.hint": { en: "This client is a data subject. Export what is held about them, or erase their contact details. Issued invoices are kept seven years by law and are never touched.", fr: "Ce client est une personne concernée. Exportez ce qui est conservé à son sujet, ou effacez ses coordonnées. Les factures émises sont conservées sept ans par la loi et ne sont jamais modifiées.", nl: "Deze klant is een betrokkene. Exporteer wat over hem of haar wordt bewaard, of wis de contactgegevens. Uitgegeven facturen worden wettelijk zeven jaar bewaard en worden nooit gewijzigd.", es: "Este cliente es un interesado. Exporte lo que se conserva sobre él, o borre sus datos de contacto. Las facturas emitidas se conservan siete años por ley y nunca se modifican." },
  "privacy.export": { en: "Export data", fr: "Exporter les données", nl: "Gegevens exporteren", es: "Exportar datos" },
  "privacy.erase": { en: "Erase personal data", fr: "Effacer les données personnelles", nl: "Persoonsgegevens wissen", es: "Borrar datos personales" },
  "privacy.erase.confirmTitle": { en: "Erase this client's contact details?", fr: "Effacer les coordonnées de ce client ?", nl: "Contactgegevens van deze klant wissen?", es: "¿Borrar los datos de contacto de este cliente?" },
  "privacy.erase.confirmBody": { en: "Email, phone and notes are blanked and cannot be recovered. Name, VAT number and address stay: the issued invoices print them and must be kept seven years.", fr: "E-mail, téléphone et notes sont effacés et ne peuvent pas être récupérés. Nom, numéro de TVA et adresse restent : les factures émises les mentionnent et doivent être conservées sept ans.", nl: "E-mail, telefoon en notities worden gewist en kunnen niet worden hersteld. Naam, btw-nummer en adres blijven: de uitgegeven facturen vermelden ze en moeten zeven jaar bewaard blijven.", es: "Correo, teléfono y notas se borran y no pueden recuperarse. Nombre, NIF-IVA y dirección se conservan: las facturas emitidas los mencionan y deben guardarse siete años." },
  "privacy.erase.done": { en: "Contact details erased.", fr: "Coordonnées effacées.", nl: "Contactgegevens gewist.", es: "Datos de contacto borrados." },
  "privacy.export.done": { en: "Export saved.", fr: "Export enregistré.", nl: "Export opgeslagen.", es: "Exportación guardada." },

  // ---- the guided tour (2026-09-13) --------------------------------------------
  //  Six coach marks over the live shell, from the onboarding spec's step 5.
  //  Dutch drafted without a native read (SOLO_RUN § Boundaries).
  "tour.dialog": { en: "Guided tour", fr: "Visite guidée", nl: "Rondleiding", es: "Visita guiada" },
  "tour.menu": { en: "Take the tour", fr: "Faire la visite", nl: "Rondleiding volgen", es: "Hacer la visita" },
  "tour.next": { en: "Next", fr: "Suivant", nl: "Volgende", es: "Siguiente" },
  "tour.back": { en: "Back", fr: "Retour", nl: "Terug", es: "Atrás" },
  "tour.skip": { en: "Skip", fr: "Passer", nl: "Overslaan", es: "Omitir" },
  "tour.finish": { en: "Done", fr: "Terminé", nl: "Klaar", es: "Listo" },
  "tour.stepOf": { en: "Step {index} of {count}", fr: "Étape {index} sur {count}", nl: "Stap {index} van {count}", es: "Paso {index} de {count}" },
  "tour.sections.title": { en: "Everything is in the top bar", fr: "Tout est dans la barre du haut", nl: "Alles zit in de bovenbalk", es: "Todo está en la barra superior" },
  "tour.sections.body": { en: "Sales, clients and your catalog. Each one opens a short list of its pages — there is no sidebar to hunt through.", fr: "Ventes, clients et catalogue. Chacun ouvre une courte liste de ses pages — pas de barre latérale à explorer.", nl: "Verkoop, klanten en uw catalogus. Elk opent een korte lijst van zijn pagina's — geen zijbalk om te doorzoeken.", es: "Ventas, clientes y su catálogo. Cada uno abre una lista corta de sus páginas — no hay barra lateral que recorrer." },
  "tour.create.title": { en: "One button creates an invoice", fr: "Un seul bouton crée une facture", nl: "Eén knop maakt een factuur", es: "Un solo botón crea una factura" },
  "tour.create.body": { en: "Pick a client, add a line, preview the PDF. The number is assigned the moment you issue it, never before — so a draft you delete leaves no gap.", fr: "Choisissez un client, ajoutez une ligne, prévisualisez le PDF. Le numéro est attribué au moment de l'émission, jamais avant — un brouillon supprimé ne laisse aucun trou.", nl: "Kies een klant, voeg een lijn toe, bekijk de PDF. Het nummer wordt toegekend op het moment van uitreiken, nooit eerder — een verwijderd ontwerp laat geen gat na.", es: "Elija un cliente, añada una línea, previsualice el PDF. El número se asigna al emitirla, nunca antes — un borrador eliminado no deja hueco." },
  "tour.search.title": { en: "Find anything by typing", fr: "Retrouvez tout en tapant", nl: "Vind alles door te typen", es: "Encuentre todo escribiendo" },
  "tour.search.body": { en: "An invoice number from a bank statement, a client's VAT number, a page name. Ctrl+K opens it from anywhere.", fr: "Un numéro de facture lu sur un extrait bancaire, le numéro de TVA d'un client, le nom d'une page. Ctrl+K l'ouvre de partout.", nl: "Een factuurnummer van een bankuittreksel, het btw-nummer van een klant, een paginanaam. Ctrl+K opent het overal.", es: "Un número de factura de un extracto bancario, el NIF-IVA de un cliente, el nombre de una página. Ctrl+K lo abre desde cualquier lugar." },
  "tour.company.title": { en: "Company, language, theme", fr: "Entreprise, langue, thème", nl: "Onderneming, taal, thema", es: "Empresa, idioma, tema" },
  "tour.company.body": { en: "The company you invoice from is switched here. Beside it, the interface language and the theme — the interface, not your documents, which keep the company's language.", fr: "L'entreprise émettrice se change ici. À côté, la langue de l'interface et le thème — l'interface seulement : vos documents gardent la langue de l'entreprise.", nl: "De onderneming waaruit u factureert wisselt u hier. Ernaast de taal van de interface en het thema — de interface, niet uw documenten, die de taal van de onderneming behouden.", es: "La empresa desde la que factura se cambia aquí. Al lado, el idioma de la interfaz y el tema — la interfaz, no sus documentos, que conservan el idioma de la empresa." },
  "tour.numbers.title": { en: "Your numbers, computed by the server", fr: "Vos chiffres, calculés par le serveur", nl: "Uw cijfers, berekend door de server", es: "Sus cifras, calculadas por el servidor" },
  "tour.numbers.body": { en: "Invoiced, paid, outstanding, overdue, and the VAT to set aside this quarter. Nothing here is estimated on your screen — the same figures decide what the reports say.", fr: "Facturé, encaissé, en attente, en retard, et la TVA à mettre de côté ce trimestre. Rien n'est estimé à l'écran — ce sont les mêmes chiffres que ceux des rapports.", nl: "Gefactureerd, betaald, openstaand, achterstallig, en de btw om dit kwartaal opzij te zetten. Niets wordt op uw scherm geschat — dezelfde cijfers bepalen wat de rapporten zeggen.", es: "Facturado, cobrado, pendiente, vencido y el IVA a reservar este trimestre. Nada se estima en su pantalla — las mismas cifras deciden lo que dicen los informes." },
  "tour.account.title": { en: "Settings, plan and help", fr: "Paramètres, formule et aide", nl: "Instellingen, abonnement en hulp", es: "Ajustes, plan y ayuda" },
  "tour.account.body": { en: "Your company details, your plan and its allowances, backups, appearance, and where your data lives. This tour is here too, whenever you want it again.", fr: "Les données de votre entreprise, votre formule et ses quotas, les sauvegardes, l'apparence et l'emplacement de vos données. Cette visite s'y trouve aussi, quand vous voudrez la refaire.", nl: "Uw bedrijfsgegevens, uw abonnement en zijn limieten, back-ups, uiterlijk en waar uw gegevens staan. Deze rondleiding staat er ook, wanneer u ze opnieuw wilt.", es: "Los datos de su empresa, su plan y sus límites, copias de seguridad, apariencia y dónde viven sus datos. Esta visita también está ahí, cuando quiera repetirla." },

  // ---- the desktop sign-in screen (2026-09-13) ----------------------------------
  "signin.tagline": { en: "Belgian invoicing that lives on your own computer.", fr: "La facturation belge, sur votre propre ordinateur.", nl: "Belgisch factureren, op uw eigen computer.", es: "Facturación belga que vive en su propio ordenador." },
  "signin.aside1": { en: "Your invoices, clients and documents stay in a folder you can open.", fr: "Vos factures, clients et documents restent dans un dossier que vous pouvez ouvrir.", nl: "Uw facturen, klanten en documenten blijven in een map die u kunt openen.", es: "Sus facturas, clientes y documentos se quedan en una carpeta que puede abrir." },
  "signin.aside2": { en: "A backup every day, and one sealed file you can carry.", fr: "Une sauvegarde chaque jour, et un fichier scellé à emporter.", nl: "Elke dag een back-up, en één verzegeld bestand dat u kunt meenemen.", es: "Una copia cada día y un archivo sellado que puede llevarse." },
  "signin.aside3": { en: "Gapless numbering, VAT rules and Peppol XML — with no account to create.", fr: "Numérotation continue, règles de TVA et XML Peppol — sans compte à créer.", nl: "Doorlopende nummering, btw-regels en Peppol-XML — zonder account aan te maken.", es: "Numeración sin huecos, reglas de IVA y XML Peppol — sin crear ninguna cuenta." },
  "signin.starting": { en: "Starting the local service…", fr: "Démarrage du service local…", nl: "Lokale dienst wordt gestart…", es: "Iniciando el servicio local…" },
  "signin.welcome": { en: "Welcome back", fr: "Bon retour", nl: "Welkom terug", es: "Bienvenido de nuevo" },
  "signin.lead": { en: "This copy of BillGen opens as the account below. There is no password: your data never leaves this computer.", fr: "Cette copie de BillGen s'ouvre avec le compte ci-dessous. Pas de mot de passe : vos données ne quittent jamais cet ordinateur.", nl: "Deze kopie van BillGen opent als het account hieronder. Er is geen wachtwoord: uw gegevens verlaten deze computer nooit.", es: "Esta copia de BillGen se abre con la cuenta de abajo. No hay contraseña: sus datos nunca salen de este ordenador." },
  "signin.continue": { en: "Open BillGen", fr: "Ouvrir BillGen", nl: "BillGen openen", es: "Abrir BillGen" },
  "signin.autoOpen": { en: "Open automatically next time", fr: "Ouvrir automatiquement la prochaine fois", nl: "Volgende keer automatisch openen", es: "Abrir automáticamente la próxima vez" },
  "signin.autoOpenHint": { en: "Skip this screen and land on the dashboard. Sign out from the account menu to see it again.", fr: "Passer cet écran et arriver sur le tableau de bord. Déconnectez-vous depuis le menu du compte pour le revoir.", nl: "Dit scherm overslaan en op het dashboard landen. Meld u af via het accountmenu om het opnieuw te zien.", es: "Omitir esta pantalla y llegar al panel. Cierre sesión desde el menú de cuenta para verla de nuevo." },
  "signin.plan": { en: "Plan", fr: "Formule", nl: "Abonnement", es: "Plan" },
  "signin.dataDir": { en: "Your data", fr: "Vos données", nl: "Uw gegevens", es: "Sus datos" },
  "signin.errorTitle": { en: "BillGen could not start", fr: "BillGen n'a pas pu démarrer", nl: "BillGen kon niet starten", es: "BillGen no pudo iniciarse" },
  "signin.errorHint": { en: "The local service did not answer. Try again; if it keeps happening, relaunch the app — the log is in your data folder.", fr: "Le service local n'a pas répondu. Réessayez ; si cela persiste, relancez l'application — le journal se trouve dans votre dossier de données.", nl: "De lokale dienst antwoordde niet. Probeer opnieuw; blijft het gebeuren, herstart dan de app — het logboek staat in uw gegevensmap.", es: "El servicio local no respondió. Inténtelo de nuevo; si persiste, reinicie la aplicación — el registro está en su carpeta de datos." },
  "signin.signedOut": { en: "You signed out. Everything is still on this computer.", fr: "Vous êtes déconnecté. Tout reste sur cet ordinateur.", nl: "U bent afgemeld. Alles staat nog op deze computer.", es: "Ha cerrado sesión. Todo sigue en este ordenador." },
  "account.signOut": { en: "Sign out", fr: "Se déconnecter", nl: "Afmelden", es: "Cerrar sesión" },

  // ---- dashboard cards (2026-09-13) — from `docs/dashboard nice to have.txt` -----
  "dashboard.quickActions": { en: "Quick actions", fr: "Actions rapides", nl: "Snelle acties", es: "Acciones rápidas" },
  "dashboard.newInvoice": { en: "New invoice", fr: "Nouvelle facture", nl: "Nieuwe factuur", es: "Nueva factura" },
  "dashboard.newInvoiceHint": { en: "Numbered when you issue it", fr: "Numérotée à l'émission", nl: "Genummerd bij uitreiking", es: "Numerada al emitirla" },
  "dashboard.newClient": { en: "Add a client", fr: "Ajouter un client", nl: "Klant toevoegen", es: "Añadir un cliente" },
  "dashboard.newClientHint": { en: "Business or private", fr: "Professionnel ou particulier", nl: "Zakelijk of particulier", es: "Empresa o particular" },
  "dashboard.newProduct": { en: "Add a service or product", fr: "Ajouter un service ou produit", nl: "Dienst of product toevoegen", es: "Añadir un servicio o producto" },
  "dashboard.newProductHint": { en: "A fixed rate you reuse", fr: "Un tarif réutilisable", nl: "Een vast tarief dat u hergebruikt", es: "Una tarifa que reutiliza" },
  "dashboard.backup": { en: "Back up now", fr: "Sauvegarder maintenant", nl: "Nu back-uppen", es: "Copia ahora" },
  "dashboard.backupHint": { en: "One file you can carry", fr: "Un fichier à emporter", nl: "Eén bestand om mee te nemen", es: "Un archivo que puede llevarse" },
  "dashboard.recentActivity": { en: "Recent activity", fr: "Activité récente", nl: "Recente activiteit", es: "Actividad reciente" },
  "dashboard.seeAll": { en: "See everything", fr: "Tout voir", nl: "Alles bekijken", es: "Ver todo" },
  "dashboard.noActivity": { en: "Nothing has happened yet.", fr: "Rien ne s'est encore passé.", nl: "Er is nog niets gebeurd.", es: "Aún no ha pasado nada." },
  "dashboard.welcomeTitle": { en: "No invoices issued yet", fr: "Aucune facture émise pour l'instant", nl: "Nog geen facturen uitgereikt", es: "Aún no hay facturas emitidas" },
  "dashboard.welcomeBody": { en: "Your first one takes a client and one line. The number is assigned the moment you issue it.", fr: "La première demande un client et une ligne. Le numéro est attribué au moment de l'émission.", nl: "Uw eerste heeft een klant en één lijn nodig. Het nummer wordt toegekend bij het uitreiken.", es: "La primera necesita un cliente y una línea. El número se asigna al emitirla." },
  "dashboard.thisYear": { en: "this year", fr: "cette année", nl: "dit jaar", es: "este año" },
  "dashboard.outstandingHint": { en: "Issued, not yet paid", fr: "Émis, pas encore encaissé", nl: "Uitgereikt, nog niet betaald", es: "Emitido, aún no cobrado" },
  "dashboard.overdueNone": { en: "Nothing past its due date", fr: "Rien en retard", nl: "Niets over de vervaldag", es: "Nada vencido" },
  "dashboard.overdueSome": { en: "Past due date — worth a reminder", fr: "Échéance dépassée — un rappel s'impose", nl: "Vervaldag voorbij — een herinnering waard", es: "Vencidas — merecen un recordatorio" },
  "dashboard.vatBuffer": { en: "VAT to set aside", fr: "TVA à mettre de côté", nl: "Btw om opzij te zetten", es: "IVA a reservar" },
  "dashboard.vatBufferHint": { en: "Output VAT this quarter ({period})", fr: "TVA collectée ce trimestre ({period})", nl: "Verschuldigde btw dit kwartaal ({period})", es: "IVA repercutido este trimestre ({period})" },

  // ---- settings (2026-09-13) — the section, its rail and its tiles ----------------
  //  Labels and one-line descriptions per IA key. A key with no entry falls
  //  back to the IA's own English label, so the ledger stays the source.
  "settings.title": { en: "Settings", fr: "Paramètres", nl: "Instellingen", es: "Ajustes" },
  "settings.intro": { en: "Your account, your screen, and your data.", fr: "Votre compte, votre écran et vos données.", nl: "Uw account, uw scherm en uw gegevens.", es: "Su cuenta, su pantalla y sus datos." },
  "settings.label.account": { en: "Account", fr: "Compte", nl: "Account", es: "Cuenta" },
  "settings.label.appearance": { en: "Appearance", fr: "Apparence", nl: "Uiterlijk", es: "Apariencia" },
  "settings.label.backup": { en: "Backup & restore", fr: "Sauvegarde et restauration", nl: "Back-up en herstel", es: "Copia y restauración" },
  "settings.label.privacy": { en: "Data & privacy", fr: "Données et confidentialité", nl: "Gegevens en privacy", es: "Datos y privacidad" },
  "settings.label.import": { en: "Import", fr: "Importer", nl: "Importeren", es: "Importar" },
  "settings.label.export": { en: "Export", fr: "Exporter", nl: "Exporteren", es: "Exportar" },
  "settings.label.security": { en: "Security", fr: "Sécurité", nl: "Beveiliging", es: "Seguridad" },
  "settings.label.team": { en: "Users & permissions", fr: "Utilisateurs et droits", nl: "Gebruikers en rechten", es: "Usuarios y permisos" },
  "settings.label.notifications": { en: "Notifications", fr: "Notifications", nl: "Meldingen", es: "Notificaciones" },
  "settings.label.email": { en: "Email", fr: "E-mail", nl: "E-mail", es: "Correo" },
  "settings.label.integrations": { en: "Integrations", fr: "Intégrations", nl: "Integraties", es: "Integraciones" },
  "settings.label.cookies": { en: "Cookie preferences", fr: "Préférences de cookies", nl: "Cookievoorkeuren", es: "Preferencias de cookies" },
  "settings.label.api": { en: "API & webhooks", fr: "API et webhooks", nl: "API en webhooks", es: "API y webhooks" },
  "settings.label.localization": { en: "Localization", fr: "Localisation", nl: "Lokalisatie", es: "Localización" },
  "settings.label.advanced": { en: "Advanced", fr: "Avancé", nl: "Geavanceerd", es: "Avanzado" },
  "settings.desc.account": { en: "Your name, your business name, the interface language.", fr: "Votre nom, le nom de votre activité, la langue de l'interface.", nl: "Uw naam, de naam van uw zaak, de taal van de interface.", es: "Su nombre, el nombre de su negocio, el idioma de la interfaz." },
  "settings.desc.appearance": { en: "Theme, density, text size, motion.", fr: "Thème, densité, taille du texte, animations.", nl: "Thema, dichtheid, tekstgrootte, beweging.", es: "Tema, densidad, tamaño del texto, movimiento." },
  "settings.desc.backup": { en: "A copy of everything, and the way back from a broken laptop.", fr: "Une copie de tout, et le retour après un ordinateur en panne.", nl: "Een kopie van alles, en de weg terug na een kapotte laptop.", es: "Una copia de todo, y el camino de vuelta tras un portátil roto." },
  "settings.desc.privacy": { en: "Where your data lives, what is kept and for how long, the texts you accepted.", fr: "Où vivent vos données, ce qui est conservé et combien de temps, les textes acceptés.", nl: "Waar uw gegevens staan, wat bewaard wordt en hoe lang, de aanvaarde teksten.", es: "Dónde viven sus datos, qué se conserva y cuánto tiempo, los textos aceptados." },
  "settings.desc.import": { en: "Bring the invoices from the previous BillGen with you.", fr: "Reprenez les factures de l'ancien BillGen.", nl: "Neem de facturen uit de vorige BillGen mee.", es: "Traiga las facturas del BillGen anterior." },
  "settings.unavailable": { en: "Not in this release", fr: "Pas dans cette version", nl: "Niet in deze versie", es: "No en esta versión" },

  // ---- appearance (2026-09-13) — from `docs/appearance for saas.txt` -------------
  "appearance.theme": { en: "Theme", fr: "Thème", nl: "Thema", es: "Tema" },
  "appearance.themeHint": { en: "Follow the system, or pick one. The shortcut in the top bar flips it too.", fr: "Suivre le système, ou choisir. Le raccourci de la barre du haut le change aussi.", nl: "Volg het systeem, of kies er een. De snelkoppeling in de bovenbalk wisselt ook.", es: "Seguir el sistema, o elegir uno. El atajo de la barra superior también lo cambia." },
  "appearance.light": { en: "Light", fr: "Clair", nl: "Licht", es: "Claro" },
  "appearance.dark": { en: "Dark", fr: "Sombre", nl: "Donker", es: "Oscuro" },
  "appearance.system": { en: "System", fr: "Système", nl: "Systeem", es: "Sistema" },
  "appearance.density": { en: "Density", fr: "Densité", nl: "Dichtheid", es: "Densidad" },
  "appearance.densityHint": { en: "How much fits on one screen. Compact is for long lists; spacious for a touch screen.", fr: "Ce qui tient sur un écran. Compact pour les longues listes ; spacieux pour un écran tactile.", nl: "Hoeveel er op één scherm past. Compact voor lange lijsten; ruim voor een aanraakscherm.", es: "Cuánto cabe en una pantalla. Compacto para listas largas; amplio para pantalla táctil." },
  "appearance.compact": { en: "Compact", fr: "Compact", nl: "Compact", es: "Compacto" },
  "appearance.comfortable": { en: "Comfortable", fr: "Confortable", nl: "Comfortabel", es: "Cómodo" },
  "appearance.spacious": { en: "Spacious", fr: "Spacieux", nl: "Ruim", es: "Amplio" },
  "appearance.textSize": { en: "Text size", fr: "Taille du texte", nl: "Tekstgrootte", es: "Tamaño del texto" },
  "appearance.textSizeHint": { en: "Scales every label and number, not the documents you send.", fr: "Agrandit chaque libellé et chiffre, pas les documents que vous envoyez.", nl: "Schaalt elk label en getal, niet de documenten die u verstuurt.", es: "Escala cada etiqueta y número, no los documentos que envía." },
  "appearance.small": { en: "Small", fr: "Petit", nl: "Klein", es: "Pequeño" },
  "appearance.medium": { en: "Medium", fr: "Moyen", nl: "Normaal", es: "Mediano" },
  "appearance.large": { en: "Large", fr: "Grand", nl: "Groot", es: "Grande" },
  "appearance.motion": { en: "Reduce motion", fr: "Réduire les animations", nl: "Minder beweging", es: "Reducir el movimiento" },
  "appearance.motionHint": { en: "No animations or transitions anywhere.", fr: "Aucune animation ni transition, nulle part.", nl: "Nergens animaties of overgangen.", es: "Sin animaciones ni transiciones en ningún sitio." },
  "appearance.translucency": { en: "Translucent surfaces", fr: "Surfaces translucides", nl: "Doorschijnende vlakken", es: "Superficies translúcidas" },
  "appearance.translucencyHint": { en: "The frosted cards and menus. Turn off on a slow machine — everything becomes plain.", fr: "Les cartes et menus givrés. À désactiver sur une machine lente — tout devient uni.", nl: "De matglazen kaarten en menu's. Zet uit op een trage machine — alles wordt effen.", es: "Las tarjetas y menús esmerilados. Desactívelo en una máquina lenta — todo se vuelve liso." },

  // ---- account (2026-09-13) --------------------------------------------------------
  "account.title": { en: "Account", fr: "Compte", nl: "Account", es: "Cuenta" },
  "account.identity": { en: "Who you are", fr: "Qui vous êtes", nl: "Wie u bent", es: "Quién es usted" },
  "account.email": { en: "E-mail", fr: "E-mail", nl: "E-mail", es: "Correo" },
  "account.emailHint": { en: "Changing an address needs a verification message the product cannot send yet.", fr: "Changer d'adresse demande un message de vérification que le produit ne peut pas encore envoyer.", nl: "Een adres wijzigen vereist een verificatiebericht dat het product nog niet kan versturen.", es: "Cambiar la dirección requiere un mensaje de verificación que el producto aún no puede enviar." },
  "account.role": { en: "Role", fr: "Rôle", nl: "Rol", es: "Rol" },
  "account.preferences": { en: "Preferences", fr: "Préférences", nl: "Voorkeuren", es: "Preferencias" },

  // ---- data & privacy (2026-09-13) — T-29's settings half -------------------------
  //  Legal sentences on this screen come from `core/trust` through the API;
  //  what is typed here is the product's own description of its folders.
  "data.title": { en: "Data & privacy", fr: "Données et confidentialité", nl: "Gegevens en privacy", es: "Datos y privacidad" },
  "data.where": { en: "Where your data lives", fr: "Où vivent vos données", nl: "Waar uw gegevens staan", es: "Dónde viven sus datos" },
  "data.whereHint": { en: "Everything BillGen knows is in this folder on this computer. Nothing is sent anywhere.", fr: "Tout ce que BillGen sait se trouve dans ce dossier, sur cet ordinateur. Rien n'est envoyé nulle part.", nl: "Alles wat BillGen weet staat in deze map op deze computer. Er wordt niets verstuurd.", es: "Todo lo que BillGen sabe está en esta carpeta de este ordenador. No se envía nada a ninguna parte." },
  "data.hosted": { en: "This account is hosted. The register below says what is held, why, and for how long.", fr: "Ce compte est hébergé. Le registre ci-dessous indique ce qui est conservé, pourquoi et combien de temps.", nl: "Dit account wordt gehost. Het register hieronder zegt wat bewaard wordt, waarom en hoe lang.", es: "Esta cuenta está alojada. El registro de abajo indica qué se conserva, por qué y durante cuánto tiempo." },
  "data.copyPath": { en: "Copy the path", fr: "Copier le chemin", nl: "Pad kopiëren", es: "Copiar la ruta" },
  "data.folder.db": { en: "The database: companies, clients, products, invoices, payments and the activity log.", fr: "La base de données : entreprises, clients, produits, factures, paiements et journal d'activité.", nl: "De database: bedrijven, klanten, producten, facturen, betalingen en het activiteitenlog.", es: "La base de datos: empresas, clientes, productos, facturas, pagos y el registro de actividad." },
  "data.folder.invoices": { en: "One PDF per issued invoice, filed by year, exactly as it was sent.", fr: "Un PDF par facture émise, classé par année, tel qu'envoyé.", nl: "Eén PDF per uitgereikte factuur, per jaar, precies zoals verstuurd.", es: "Un PDF por factura emitida, archivado por año, tal como se envió." },
  "data.folder.contracts": { en: "The texts you accepted, as PDF, with the version and the date.", fr: "Les textes acceptés, en PDF, avec la version et la date.", nl: "De teksten die u aanvaardde, als PDF, met versie en datum.", es: "Los textos que aceptó, en PDF, con la versión y la fecha." },
  "data.folder.backups": { en: "A copy of the database each day BillGen starts; the last thirty are kept.", fr: "Une copie de la base chaque jour où BillGen démarre ; les trente dernières sont conservées.", nl: "Een kopie van de database elke dag dat BillGen start; de laatste dertig worden bewaard.", es: "Una copia de la base cada día que BillGen arranca; se conservan las últimas treinta." },
  "data.retention": { en: "What is kept, and for how long", fr: "Ce qui est conservé, et combien de temps", nl: "Wat bewaard wordt, en hoe lang", es: "Qué se conserva, y durante cuánto tiempo" },
  "data.retentionHint": { en: "The register the privacy policy is drafted from. Issued invoices are kept seven years by Belgian law; erasing a client leaves them untouched.", fr: "Le registre dont la politique de confidentialité est tirée. Les factures émises sont conservées sept ans selon la loi belge ; effacer un client ne les touche pas.", nl: "Het register waaruit het privacybeleid wordt opgesteld. Uitgereikte facturen worden volgens de Belgische wet zeven jaar bewaard; een klant wissen raakt ze niet.", es: "El registro del que se redacta la política de privacidad. Las facturas emitidas se conservan siete años por ley belga; borrar un cliente no las toca." },
  "data.col.dataset": { en: "Data", fr: "Données", nl: "Gegevens", es: "Datos" },
  "data.col.purpose": { en: "Purpose", fr: "Finalité", nl: "Doel", es: "Finalidad" },
  "data.col.basis": { en: "Lawful basis", fr: "Base légale", nl: "Rechtsgrond", es: "Base jurídica" },
  "data.col.retention": { en: "Kept", fr: "Conservation", nl: "Bewaard", es: "Conservación" },
  "data.retained": { en: "Kept even after an erasure", fr: "Conservé même après un effacement", nl: "Bewaard, ook na een wissing", es: "Conservado incluso tras un borrado" },
  "data.subprocessors": { en: "Who else receives it", fr: "Qui d'autre les reçoit", nl: "Wie ze nog ontvangt", es: "Quién más los recibe" },
  "data.noSubprocessors": { en: "Nobody. On this install no third party receives your data.", fr: "Personne. Sur cette installation, aucun tiers ne reçoit vos données.", nl: "Niemand. Op deze installatie ontvangt geen derde uw gegevens.", es: "Nadie. En esta instalación ningún tercero recibe sus datos." },
  "data.texts": { en: "Texts you accepted", fr: "Textes acceptés", nl: "Aanvaarde teksten", es: "Textos aceptados" },
  "data.textsHint": { en: "Each one is kept as a PDF in the contracts folder and travels with your backup.", fr: "Chacun est conservé en PDF dans le dossier contracts et voyage avec votre sauvegarde.", nl: "Elk wordt als PDF in de map contracts bewaard en reist mee met uw back-up.", es: "Cada uno se conserva como PDF en la carpeta contracts y viaja con su copia de seguridad." },
  "data.textPending": { en: "Awaiting your acceptance", fr: "En attente de votre acceptation", nl: "Wacht op uw aanvaarding", es: "Pendiente de su aceptación" },
  "data.textUndrafted": { en: "Not drafted yet", fr: "Pas encore rédigé", nl: "Nog niet opgesteld", es: "Aún no redactado" },
  "data.backupTitle": { en: "Backups", fr: "Sauvegardes", nl: "Back-ups", es: "Copias de seguridad" },
  "data.backupHint": { en: "The daily copy is automatic. A carried backup is one file you take off this computer, sealed with a passphrase only you know.", fr: "La copie quotidienne est automatique. Une sauvegarde à emporter est un fichier que vous sortez de cet ordinateur, scellé par une phrase secrète que vous seul connaissez.", nl: "De dagelijkse kopie is automatisch. Een meegenomen back-up is één bestand dat u van deze computer haalt, verzegeld met een wachtwoordzin die alleen u kent.", es: "La copia diaria es automática. Una copia para llevar es un archivo que saca de este ordenador, sellado con una frase de contraseña que solo usted conoce." },

  // ---- backup — the sealed export, T-28's UI half (2026-09-13) ------------------
  "backup.carryHeading": { en: "One file you can carry", fr: "Un fichier à emporter", nl: "Eén bestand om mee te nemen", es: "Un archivo que puede llevarse" },
  "backup.carryIntro": { en: "The same data as above plus every PDF, zipped and sealed. This is the copy that leaves the computer — on a USB stick, in a cloud folder, with your accountant.", fr: "Les mêmes données que ci-dessus plus chaque PDF, compressées et scellées. C'est la copie qui quitte l'ordinateur — sur une clé USB, dans un dossier cloud, chez votre comptable.", nl: "Dezelfde gegevens als hierboven plus elke PDF, gezipt en verzegeld. Dit is de kopie die de computer verlaat — op een USB-stick, in een cloudmap, bij uw boekhouder.", es: "Los mismos datos que arriba más cada PDF, comprimidos y sellados. Esta es la copia que sale del ordenador — en una memoria USB, en una carpeta en la nube, con su contable." },
  "backup.passphrase": { en: "Passphrase", fr: "Phrase secrète", nl: "Wachtwoordzin", es: "Frase de contraseña" },
  "backup.passphraseHint": { en: "At least {n} characters.", fr: "Au moins {n} caractères.", nl: "Minstens {n} tekens.", es: "Al menos {n} caracteres." },
  "backup.acknowledge": { en: "I understand: a lost passphrase is a lost backup.", fr: "J'ai compris : une phrase secrète perdue est une sauvegarde perdue.", nl: "Ik begrijp het: een verloren wachtwoordzin is een verloren back-up.", es: "Entiendo: una frase perdida es una copia perdida." },
  "backup.carry": { en: "Download sealed backup", fr: "Télécharger la sauvegarde scellée", nl: "Verzegelde back-up downloaden", es: "Descargar copia sellada" },
  "backup.carryDone": { en: "Sealed backup saved — {n} documents inside.", fr: "Sauvegarde scellée enregistrée — {n} documents inclus.", nl: "Verzegelde back-up opgeslagen — {n} documenten erin.", es: "Copia sellada guardada — {n} documentos dentro." },
  "backup.restorePassphrase": { en: "Passphrase of the archive", fr: "Phrase secrète de l'archive", nl: "Wachtwoordzin van het archief", es: "Frase de contraseña del archivo" },
  "backup.restoreFileHint": { en: "A sealed archive (.billgenbak) needs the passphrase it was made with. A plain backup needs nothing.", fr: "Une archive scellée (.billgenbak) demande la phrase secrète de sa création. Une sauvegarde simple ne demande rien.", nl: "Een verzegeld archief (.billgenbak) heeft de wachtwoordzin nodig waarmee het gemaakt is. Een gewone back-up heeft niets nodig.", es: "Un archivo sellado (.billgenbak) necesita la frase con la que se creó. Una copia simple no necesita nada." },

  // ---- alerts — what needs attention (2026-09-15) --------------------------------
  //  One sentence per rule the server can fire (core/services/alerts_service.py).
  //  The numbers arrive in `context`; the wording is this file's. Dutch drafted
  //  without a native read.
  "alerts.title": { en: "What needs attention", fr: "À traiter", nl: "Wat aandacht vraagt", es: "Qué requiere atención" },
  "alerts.empty": { en: "Nothing needs attention today.", fr: "Rien à traiter aujourd'hui.", nl: "Niets vraagt vandaag aandacht.", es: "Nada requiere atención hoy." },
  "alerts.more": { en: "{n} more not shown — the lists have them all.", fr: "{n} de plus non affichés — les listes les contiennent tous.", nl: "{n} meer niet getoond — de lijsten bevatten ze allemaal.", es: "{n} más no mostrados — las listas los contienen todos." },
  "alerts.severity.critical": { en: "critical", fr: "critique", nl: "kritiek", es: "crítico" },
  "alerts.severity.warning": { en: "warning", fr: "à surveiller", nl: "aandacht", es: "aviso" },
  "alerts.severity.info": { en: "note", fr: "note", nl: "opmerking", es: "nota" },
  "alerts.invoice.overdue": { en: "Overdue by {days} days — {outstanding} still open", fr: "En retard de {days} jours — {outstanding} restent dus", nl: "{days} dagen te laat — {outstanding} nog open", es: "Vencida hace {days} días — {outstanding} pendientes" },
  "alerts.invoice.draft_stale": { en: "Draft untouched for {days} days — {amount}", fr: "Brouillon inchangé depuis {days} jours — {amount}", nl: "Ontwerp al {days} dagen onaangeroerd — {amount}", es: "Borrador sin tocar desde hace {days} días — {amount}" },
  "alerts.client.missing_vat_number": { en: "Business client without a VAT number: no Peppol, no reverse charge — invoiced as a consumer.", fr: "Client professionnel sans numéro de TVA : pas de Peppol, pas d'autoliquidation — facturé comme un particulier.", nl: "Zakelijke klant zonder btw-nummer: geen Peppol, geen verlegging — gefactureerd als particulier.", es: "Cliente empresa sin NIF-IVA: sin Peppol, sin inversión del sujeto pasivo — facturado como particular." },
  "alerts.company.incomplete": { en: "Company identifiers to fix: {fields}", fr: "Identifiants de l'entreprise à corriger : {fields}", nl: "Ondernemingsgegevens te verbeteren: {fields}", es: "Identificadores de la empresa por corregir: {fields}" },
  "alerts.company.peppol": { en: "Missing for Peppol: {fields}", fr: "Manque pour Peppol : {fields}", nl: "Ontbreekt voor Peppol: {fields}", es: "Falta para Peppol: {fields}" },
  "alerts.open.invoice": { en: "Open invoice", fr: "Ouvrir la facture", nl: "Factuur openen", es: "Abrir factura" },
  "alerts.open.client": { en: "Open client", fr: "Ouvrir le client", nl: "Klant openen", es: "Abrir cliente" },
  "alerts.open.company": { en: "Fix company", fr: "Corriger l'entreprise", nl: "Onderneming verbeteren", es: "Corregir empresa" },


  // ---- T-46: the navigation speaks the interface language ---------------
  //  One message per IA node, keyed `nav.<node key>`. `ia.ts` declares no
  //  labels any more: `navLabel()` resolves these, the settings children read
  //  the `settings.label.*` entries above, and `dashboard`/`settings` read
  //  their section titles. ia.test.ts fails the build for a node with no name.
  //  French and Dutch drafted without a native read (SOLO_RUN § Boundaries).
  "nav.overview": { en: "{section} overview", fr: "Aperçu — {section}", nl: "{section} — overzicht", es: "Resumen de {section}" },
  "palette.sectionGoTo": { en: "Go to", fr: "Aller à", nl: "Ga naar", es: "Ir a" },
  "palette.sectionCreate": { en: "Create", fr: "Créer", nl: "Aanmaken", es: "Crear" },
  "nav.dashboard.overview": { en: "Financial overview", fr: "Vue financière", nl: "Financieel overzicht", es: "Resumen financiero" },
  "nav.dashboard.revenue": { en: "Revenue", fr: "Chiffre d'affaires", nl: "Omzet", es: "Ingresos" },
  "nav.dashboard.outstanding": { en: "Outstanding invoices", fr: "Factures en attente", nl: "Openstaande facturen", es: "Facturas pendientes" },
  "nav.dashboard.overdue": { en: "Overdue invoices", fr: "Factures en retard", nl: "Achterstallige facturen", es: "Facturas vencidas" },
  "nav.dashboard.activity": { en: "Recent activity", fr: "Activité récente", nl: "Recente activiteit", es: "Actividad reciente" },
  "nav.dashboard.quickactions": { en: "Quick actions", fr: "Actions rapides", nl: "Snelle acties", es: "Acciones rápidas" },
  "nav.dashboard.alerts": { en: "Alerts & tasks", fr: "Alertes et tâches", nl: "Meldingen en taken", es: "Alertas y tareas" },
  "nav.sales": { en: "Sales", fr: "Ventes", nl: "Verkoop", es: "Ventas" },
  "nav.sales.invoices": { en: "Invoices", fr: "Factures", nl: "Facturen", es: "Facturas" },
  "nav.sales.invoices.draft": { en: "Drafts", fr: "Brouillons", nl: "Concepten", es: "Borradores" },
  "nav.sales.invoices.issued": { en: "Issued", fr: "Émises", nl: "Uitgegeven", es: "Emitidas" },
  "nav.sales.invoices.sent": { en: "Sent", fr: "Envoyées", nl: "Verzonden", es: "Enviadas" },
  "nav.sales.invoices.viewed": { en: "Viewed", fr: "Consultées", nl: "Bekeken", es: "Vistas" },
  "nav.sales.invoices.paid": { en: "Paid", fr: "Payées", nl: "Betaald", es: "Pagadas" },
  "nav.sales.invoices.partial": { en: "Partially paid", fr: "Partiellement payées", nl: "Deels betaald", es: "Pagadas parcialmente" },
  "nav.sales.invoices.overdue": { en: "Overdue", fr: "En retard", nl: "Te laat", es: "Vencidas" },
  "nav.sales.invoices.voided": { en: "Cancelled", fr: "Annulées", nl: "Geannuleerd", es: "Anuladas" },
  "nav.sales.invoice.detail": { en: "Invoice detail & lifecycle", fr: "Détail et cycle de vie de la facture", nl: "Factuurdetail en levenscyclus", es: "Detalle y ciclo de vida de la factura" },
  "nav.sales.creditnotes": { en: "Credit notes", fr: "Notes de crédit", nl: "Creditnota's", es: "Notas de crédito" },
  "nav.sales.recurring": { en: "Recurring invoices", fr: "Factures récurrentes", nl: "Terugkerende facturen", es: "Facturas recurrentes" },
  "nav.sales.quotes": { en: "Quotes", fr: "Devis", nl: "Offertes", es: "Presupuestos" },
  "nav.sales.proforma": { en: "Pro-forma invoices", fr: "Factures pro forma", nl: "Pro-formafacturen", es: "Facturas proforma" },
  "nav.sales.reminders": { en: "Payment reminders", fr: "Rappels de paiement", nl: "Betalingsherinneringen", es: "Recordatorios de pago" },
  "nav.customers": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
  "nav.customers.clients": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
  "nav.customers.detail": { en: "Client 360", fr: "Client 360", nl: "Klant 360", es: "Cliente 360" },
  "nav.customers.contacts": { en: "Contacts", fr: "Contacts", nl: "Contactpersonen", es: "Contactos" },
  "nav.customers.groups": { en: "Client groups", fr: "Groupes de clients", nl: "Klantgroepen", es: "Grupos de clientes" },
  "nav.customers.history": { en: "Client history", fr: "Historique client", nl: "Klantgeschiedenis", es: "Historial del cliente" },
  "nav.customers.documents": { en: "Client documents", fr: "Documents client", nl: "Klantdocumenten", es: "Documentos del cliente" },
  "nav.customers.activity": { en: "Client activity", fr: "Activité client", nl: "Klantactiviteit", es: "Actividad del cliente" },
  "nav.catalog": { en: "Catalog", fr: "Catalogue", nl: "Catalogus", es: "Catálogo" },
  "nav.catalog.products": { en: "Products", fr: "Produits", nl: "Producten", es: "Productos" },
  "nav.catalog.services": { en: "Services", fr: "Services", nl: "Diensten", es: "Servicios" },
  "nav.catalog.categories": { en: "Categories", fr: "Catégories", nl: "Categorieën", es: "Categorías" },
  "nav.catalog.pricing": { en: "Pricing", fr: "Tarifs", nl: "Prijzen", es: "Precios" },
  "nav.catalog.vat": { en: "VAT rates", fr: "Taux de TVA", nl: "Btw-tarieven", es: "Tipos de IVA" },
  "nav.catalog.templates": { en: "Invoice templates", fr: "Modèles de facture", nl: "Factuursjablonen", es: "Plantillas de factura" },
  "nav.catalog.archived": { en: "Archived", fr: "Archivés", nl: "Gearchiveerd", es: "Archivados" },
  "nav.reports": { en: "Reports", fr: "Rapports", nl: "Rapporten", es: "Informes" },
  "nav.reports.revenue": { en: "Revenue", fr: "Chiffre d'affaires", nl: "Omzet", es: "Ingresos" },
  "nav.reports.invoices": { en: "Invoices", fr: "Factures", nl: "Facturen", es: "Facturas" },
  "nav.reports.payments": { en: "Payments", fr: "Paiements", nl: "Betalingen", es: "Pagos" },
  "nav.reports.outstanding": { en: "Outstanding", fr: "En attente", nl: "Openstaand", es: "Pendientes" },
  "nav.reports.overdue": { en: "Overdue", fr: "En retard", nl: "Achterstallig", es: "Vencidas" },
  "nav.reports.vat": { en: "VAT", fr: "TVA", nl: "Btw", es: "IVA" },
  "nav.reports.clients": { en: "Clients", fr: "Clients", nl: "Klanten", es: "Clientes" },
  "nav.reports.products": { en: "Products & services", fr: "Produits et services", nl: "Producten en diensten", es: "Productos y servicios" },
  "nav.reports.export": { en: "Export", fr: "Export", nl: "Export", es: "Exportar" },
  "nav.company": { en: "Company", fr: "Entreprise", nl: "Onderneming", es: "Empresa" },
  "nav.company.profile": { en: "Company profile", fr: "Profil de l'entreprise", nl: "Bedrijfsprofiel", es: "Perfil de la empresa" },
  "nav.company.legal": { en: "Legal information", fr: "Informations légales", nl: "Juridische gegevens", es: "Información legal" },
  "nav.company.vat": { en: "VAT / BCE information", fr: "Informations TVA / BCE", nl: "Btw- en KBO-gegevens", es: "Información de IVA / BCE" },
  "nav.company.bank": { en: "Bank accounts", fr: "Comptes bancaires", nl: "Bankrekeningen", es: "Cuentas bancarias" },
  "nav.company.numbering": { en: "Invoice numbering", fr: "Numérotation des factures", nl: "Factuurnummering", es: "Numeración de facturas" },
  "nav.company.payment-terms": { en: "Payment conditions", fr: "Conditions de paiement", nl: "Betalingsvoorwaarden", es: "Condiciones de pago" },
  "nav.company.branding": { en: "Branding", fr: "Identité visuelle", nl: "Huisstijl", es: "Imagen de marca" },
  "nav.company.defaults": { en: "Invoice defaults", fr: "Valeurs par défaut des factures", nl: "Standaardwaarden voor facturen", es: "Valores por defecto de factura" },
  "nav.company.documents": { en: "Company documents", fr: "Documents de l'entreprise", nl: "Bedrijfsdocumenten", es: "Documentos de la empresa" },
  "nav.billing": { en: "Billing", fr: "Abonnement", nl: "Abonnement", es: "Suscripción" },
  "nav.billing.subscription": { en: "My subscription", fr: "Mon abonnement", nl: "Mijn abonnement", es: "Mi suscripción" },
  "nav.billing.plan": { en: "Current plan", fr: "Formule actuelle", nl: "Huidig plan", es: "Plan actual" },
  "nav.billing.usage": { en: "Usage", fr: "Utilisation", nl: "Gebruik", es: "Uso" },
  "nav.billing.invoices": { en: "Invoices from BillGen", fr: "Factures de BillGen", nl: "Facturen van BillGen", es: "Facturas de BillGen" },
  "nav.billing.payment-method": { en: "Payment method", fr: "Moyen de paiement", nl: "Betaalmethode", es: "Método de pago" },
  "nav.billing.history": { en: "Billing history", fr: "Historique de facturation", nl: "Factuurgeschiedenis", es: "Historial de facturación" },
  "nav.billing.change-plan": { en: "Upgrade / downgrade", fr: "Changer de formule", nl: "Plan wijzigen", es: "Cambiar de plan" },
  "nav.billing.cancel": { en: "Cancellation", fr: "Résiliation", nl: "Opzegging", es: "Cancelación" },
  "nav.documents": { en: "Documents", fr: "Documents", nl: "Documenten", es: "Documentos" },
  "nav.documents.all": { en: "All documents", fr: "Tous les documents", nl: "Alle documenten", es: "Todos los documentos" },
  "nav.documents.folders": { en: "Folders", fr: "Dossiers", nl: "Mappen", es: "Carpetas" },
  "nav.documents.invoice-attachments": { en: "Invoice attachments", fr: "Pièces jointes des factures", nl: "Factuurbijlagen", es: "Adjuntos de facturas" },
  "nav.documents.client": { en: "Client documents", fr: "Documents client", nl: "Klantdocumenten", es: "Documentos del cliente" },
  "nav.documents.company": { en: "Company documents", fr: "Documents de l'entreprise", nl: "Bedrijfsdocumenten", es: "Documentos de la empresa" },
  "nav.documents.archived": { en: "Archived", fr: "Archivés", nl: "Gearchiveerd", es: "Archivados" },
  "nav.documents.trash": { en: "Trash", fr: "Corbeille", nl: "Prullenbak", es: "Papelera" },
  "nav.explore": { en: "Explore", fr: "Explorer", nl: "Verkennen", es: "Explorar" },
  "nav.explore.search": { en: "Global search", fr: "Recherche globale", nl: "Algemeen zoeken", es: "Búsqueda global" },
  "nav.explore.filters": { en: "Advanced filters", fr: "Filtres avancés", nl: "Geavanceerde filters", es: "Filtros avanzados" },
  "nav.explore.saved": { en: "Saved searches", fr: "Recherches enregistrées", nl: "Opgeslagen zoekopdrachten", es: "Búsquedas guardadas" },
  "nav.explore.documents": { en: "Document search", fr: "Recherche de documents", nl: "Documenten zoeken", es: "Búsqueda de documentos" },
  "nav.explore.activity": { en: "Activity search", fr: "Recherche d'activité", nl: "Activiteit zoeken", es: "Búsqueda de actividad" },
  "nav.activity": { en: "Activity", fr: "Activité", nl: "Activiteit", es: "Actividad" },
  "nav.activity.notifications": { en: "Notifications", fr: "Notifications", nl: "Meldingen", es: "Notificaciones" },
  "nav.activity.audit": { en: "Audit log", fr: "Journal d'audit", nl: "Auditlogboek", es: "Registro de auditoría" },
  "nav.activity.user": { en: "User activity", fr: "Activité des utilisateurs", nl: "Gebruikersactiviteit", es: "Actividad de usuarios" },
  "nav.activity.security": { en: "Security events", fr: "Événements de sécurité", nl: "Beveiligingsgebeurtenissen", es: "Eventos de seguridad" },
  "nav.activity.system": { en: "System events", fr: "Événements système", nl: "Systeemgebeurtenissen", es: "Eventos del sistema" },
  "nav.help": { en: "Help & support", fr: "Aide et support", nl: "Hulp en ondersteuning", es: "Ayuda y soporte" },
  "nav.help.center": { en: "Help center", fr: "Centre d'aide", nl: "Helpcentrum", es: "Centro de ayuda" },
  "nav.help.getting-started": { en: "Getting started", fr: "Premiers pas", nl: "Aan de slag", es: "Primeros pasos" },
  "nav.help.tutorials": { en: "Tutorials", fr: "Tutoriels", nl: "Handleidingen", es: "Tutoriales" },
  "nav.help.faq": { en: "FAQ", fr: "FAQ", nl: "FAQ", es: "Preguntas frecuentes" },
  "nav.help.contact": { en: "Contact support", fr: "Contacter le support", nl: "Contact opnemen", es: "Contactar con soporte" },
  "nav.help.status": { en: "System status", fr: "État du système", nl: "Systeemstatus", es: "Estado del sistema" },
  "nav.help.whatsnew": { en: "What's new", fr: "Nouveautés", nl: "Wat is nieuw", es: "Novedades" },
  "nav.legal": { en: "Legal", fr: "Juridique", nl: "Juridisch", es: "Legal" },
  "nav.legal.tos": { en: "Terms of Service", fr: "Conditions générales", nl: "Gebruiksvoorwaarden", es: "Términos del servicio" },
  "nav.legal.privacy": { en: "Privacy Policy", fr: "Politique de confidentialité", nl: "Privacybeleid", es: "Política de privacidad" },
  "nav.legal.cookies": { en: "Cookie Policy", fr: "Politique des cookies", nl: "Cookiebeleid", es: "Política de cookies" },
  "nav.legal.dpa": { en: "Data Processing Agreement", fr: "Accord de traitement des données", nl: "Verwerkersovereenkomst", es: "Acuerdo de tratamiento de datos" },
  "nav.legal.subprocessors": { en: "Subprocessors", fr: "Sous-traitants", nl: "Subverwerkers", es: "Subencargados" },
  "nav.legal.ai": { en: "AI transparency", fr: "Transparence IA", nl: "AI-transparantie", es: "Transparencia de IA" },
  "nav.legal.sla": { en: "SLA", fr: "SLA", nl: "SLA", es: "SLA" },
  "nav.legal.notices": { en: "Legal notices", fr: "Mentions légales", nl: "Juridische kennisgevingen", es: "Avisos legales" },
  "nav.legal.contracts": { en: "Customer contracts", fr: "Contrats clients", nl: "Klantcontracten", es: "Contratos de clientes" },
  "nav.onboarding": { en: "Onboarding", fr: "Prise en main", nl: "Onboarding", es: "Incorporación" },
  "nav.onboarding.wizard": { en: "Setup wizard", fr: "Assistant de configuration", nl: "Installatiewizard", es: "Asistente de configuración" },
  "nav.desktop": { en: "Desktop (Windows)", fr: "Bureau (Windows)", nl: "Desktop (Windows)", es: "Escritorio (Windows)" },
  "nav.desktop.connection": { en: "Connection status", fr: "État de la connexion", nl: "Verbindingsstatus", es: "Estado de la conexión" },
  "nav.desktop.offline": { en: "Offline mode & sync", fr: "Mode hors ligne et synchronisation", nl: "Offline modus en synchronisatie", es: "Modo sin conexión y sincronización" },
  "nav.desktop.backup": { en: "Automatic local backup", fr: "Sauvegarde locale automatique", nl: "Automatische lokale back-up", es: "Copia de seguridad local automática" },
  "nav.desktop.printing": { en: "Printing & PDF", fr: "Impression et PDF", nl: "Afdrukken en PDF", es: "Impresión y PDF" },
  "nav.desktop.updates": { en: "Auto-update & crash reporting", fr: "Mises à jour automatiques et rapports d'incident", nl: "Automatische updates en crashrapporten", es: "Actualizaciones automáticas e informes de fallos" },

  //  Invoice status, as a badge reads it. Draft, voided, overdue and the paid
  //  stamp already had words (history.*); `statusLabel()` maps to those, and
  //  only the two missing ones are new — one copy per word.
  "status.issued": { en: "Issued", fr: "Émise", nl: "Uitgegeven", es: "Emitida" },
  "status.partially_paid": { en: "Partially paid", fr: "Partiellement payée", nl: "Deels betaald", es: "Pagada parcialmente" },

  //  The audit log's record kinds (`target_type` on the wire). An unknown one
  //  humanises rather than printing `document_template`.
  "entity.invoice": { en: "Invoice", fr: "Facture", nl: "Factuur", es: "Factura" },
  "entity.client": { en: "Client", fr: "Client", nl: "Klant", es: "Cliente" },
  "entity.product": { en: "Product", fr: "Produit", nl: "Product", es: "Producto" },
  "entity.company": { en: "Company", fr: "Entreprise", nl: "Onderneming", es: "Empresa" },
  "entity.organization": { en: "Organization", fr: "Organisation", nl: "Organisatie", es: "Organización" },
  "entity.user": { en: "User", fr: "Utilisateur", nl: "Gebruiker", es: "Usuario" },
  "entity.membership": { en: "Membership", fr: "Adhésion", nl: "Lidmaatschap", es: "Membresía" },
  "entity.quote": { en: "Quote", fr: "Devis", nl: "Offerte", es: "Presupuesto" },
  "entity.credit_note": { en: "Credit note", fr: "Note de crédit", nl: "Creditnota", es: "Nota de crédito" },
  "entity.expense": { en: "Expense", fr: "Dépense", nl: "Uitgave", es: "Gasto" },
  "entity.document": { en: "Document", fr: "Document", nl: "Document", es: "Documento" },
  "entity.document_template": { en: "Document template", fr: "Modèle de document", nl: "Documentsjabloon", es: "Plantilla de documento" },
  "entity.legal_document": { en: "Legal text", fr: "Texte légal", nl: "Juridische tekst", es: "Texto legal" },
  "entity.consent": { en: "Consent", fr: "Consentement", nl: "Toestemming", es: "Consentimiento" },
  "entity.backup": { en: "Backup", fr: "Sauvegarde", nl: "Back-up", es: "Copia de seguridad" },
  "entity.import": { en: "Import", fr: "Import", nl: "Import", es: "Importación" },

  //  Company identifiers, named the way the settings form names them, for the
  //  alerts card that used to print `vat_number, iban, address_line1`.
  "field.name": { en: "Name", fr: "Nom", nl: "Naam", es: "Nombre" },
  "field.legal_name": { en: "Legal name", fr: "Dénomination sociale", nl: "Officiële naam", es: "Razón social" },
  "field.vat_number": { en: "VAT number", fr: "Numéro de TVA", nl: "Btw-nummer", es: "Número de IVA" },
  "field.registration_number": { en: "Company number", fr: "Numéro d'entreprise", nl: "Ondernemingsnummer", es: "Número de empresa" },
  "field.email": { en: "E-mail", fr: "E-mail", nl: "E-mail", es: "Correo electrónico" },
  "field.phone": { en: "Phone", fr: "Téléphone", nl: "Telefoon", es: "Teléfono" },
  "field.address_line1": { en: "Address", fr: "Adresse", nl: "Adres", es: "Dirección" },
  "field.address_line2": { en: "Address (line 2)", fr: "Adresse (ligne 2)", nl: "Adres (regel 2)", es: "Dirección (línea 2)" },
  "field.postal_code": { en: "Postal code", fr: "Code postal", nl: "Postcode", es: "Código postal" },
  "field.city": { en: "City", fr: "Ville", nl: "Gemeente", es: "Ciudad" },
  "field.country_code": { en: "Country", fr: "Pays", nl: "Land", es: "País" },
  "field.iban": { en: "IBAN", fr: "IBAN", nl: "IBAN", es: "IBAN" },
  "field.bic": { en: "BIC", fr: "BIC", nl: "BIC", es: "BIC" },

  //  Counted phrases carry both plural forms (`tn()`): "2 crítico" and
  //  "0 liquidada(s)" were what one string per key produced.
  "alerts.count.critical.one": { en: "1 critical", fr: "1 critique", nl: "1 kritiek", es: "1 crítico" },
  "alerts.count.critical.other": { en: "{n} critical", fr: "{n} critiques", nl: "{n} kritiek", es: "{n} críticos" },
  "alerts.count.warning.one": { en: "1 warning", fr: "1 à surveiller", nl: "1 aandachtspunt", es: "1 aviso" },
  "alerts.count.warning.other": { en: "{n} warnings", fr: "{n} à surveiller", nl: "{n} aandachtspunten", es: "{n} avisos" },
  "alerts.count.info.one": { en: "1 note", fr: "1 note", nl: "1 opmerking", es: "1 nota" },
  "alerts.count.info.other": { en: "{n} notes", fr: "{n} notes", nl: "{n} opmerkingen", es: "{n} notas" },
  "dashboard.paidCount.one": { en: "1 settled", fr: "1 réglée", nl: "1 vereffend", es: "1 liquidada" },
  "dashboard.paidCount.other": { en: "{n} settled", fr: "{n} réglées", nl: "{n} vereffend", es: "{n} liquidadas" },

} as const;

export type MessageKey = keyof typeof MESSAGES;

/** Whether a key built at runtime (`settings.label.${key}`) has a message,
 *  so a caller can fall back to something better than the key itself. */
export function hasMessage(key: string): key is MessageKey {
  return key in MESSAGES;
}

export function t(lang: Lang, key: MessageKey): string {
  // The key is typed, but not every call site can prove it: HistoryPanel builds
  // `history.${action.kind}` and casts, which is the one hole the type system
  // cannot close. Indexing an absent key used to throw inside render, which
  // React turns into a blank screen for the whole route — an unreadable label
  // is a far better failure than a missing page, so fall back to the key.
  const entry = MESSAGES[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

/** `t` with `{name}` placeholders filled in. Kept out of `t` itself so the
 *  common case stays a lookup; only a handful of strings carry a number. */
export function tf(lang: Lang, key: MessageKey, values: Record<string, string | number>): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** A counted phrase in the form its number needs.
 *
 *  Every one of the four languages inflects something after a count, and
 *  three of them differently: `key.one` is the phrase for exactly one,
 *  `key.other` takes `{n}` for everything else, zero included. */
export function tn(lang: Lang, key: string, n: number): string {
  const form = `${key}.${n === 1 ? "one" : "other"}`;
  return hasMessage(form) ? tf(lang, form, { n }) : `${n} ${key}`;
}

/** The section titles two nodes share with a screen of their own — one word,
 *  one place. */
const SECTION_TITLE: Record<string, MessageKey> = {
  dashboard: "dashboard.title",
  settings: "settings.title",
};

/** A navigation node's name in the interface language.
 *
 *  `ia.ts` declares no labels (T-46): a node's name is a message keyed by its
 *  key, so a new node cannot ship an untranslated name — `ia.test.ts` fails
 *  if one has none. Settings children read the `settings.label.*` entries the
 *  rail already used. The key itself is the fallback: visible, and ugly on
 *  purpose. */
export function navLabel(lang: Lang, key: string): string {
  const title = SECTION_TITLE[key];
  if (title) return t(lang, title);
  if (key.startsWith("settings.")) {
    const settings = `settings.label.${key.slice("settings.".length)}`;
    if (hasMessage(settings)) return t(lang, settings);
  }
  const nav = `nav.${key}`;
  return hasMessage(nav) ? t(lang, nav) : key;
}

/** An invoice status as a badge reads it. The draft placeholder, the voided
 *  and paid stamps and the overdue word already existed under history.*; the
 *  two the badges alone needed are status.*. */
const STATUS_KEY: Record<string, MessageKey> = {
  draft: "history.draft",
  issued: "status.issued",
  paid: "history.paidStamp",
  partially_paid: "status.partially_paid",
  overdue: "history.overdue",
  voided: "history.voided",
};

export function statusLabel(lang: Lang, status: string): string {
  const key = STATUS_KEY[status];
  return key ? t(lang, key) : status;
}

/** Translate a backend Peppol-gate message key (e.g. "errSupplierVat").
 *  Unknown keys (backend newer than the UI) fall back to the raw key. */
export function tPeppolError(lang: Lang, messageKey: string): string {
  const key = `peppol.${messageKey}`;
  return key in MESSAGES ? t(lang, key as MessageKey) : messageKey;
}

/** Translate a VAT-treatment reason key from `GET /vat-treatment`.
 *  An unknown key — a backend that grew a case this UI has no wording for —
 *  falls back to the raw key rather than rendering an empty explanation next
 *  to a zero-rated line. */
export function tVatReason(lang: Lang, reason: string): string {
  return reason in MESSAGES ? t(lang, reason as MessageKey) : reason;
}

/** Translate an audit-log action ("issue", "export_pdf"). Unknown actions —
 *  a backend newer than this UI — fall back to the raw string rather than
 *  rendering a blank cell. */
export function tAuditAction(lang: Lang, action: string): string {
  const key = `audit.${action}`;
  return key in MESSAGES ? t(lang, key as MessageKey) : action;
}

/** Look up `prefix.value`, falling back to a humanised form of the wire value.
 *
 *  The entitlement layer sends three open vocabularies — tier names, meter
 *  names and feature keys — and the server is allowed to grow all three
 *  without this UI shipping. The fallback turns `team_administration` into
 *  "Team administration": still readable, visibly not a designed label. */
function tWire(lang: Lang, prefix: string, value: string): string {
  const key = `${prefix}.${value}`;
  if (key in MESSAGES) return t(lang, key as MessageKey);
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Translate an audit-log record kind ("document_template"). */
export function tEntity(lang: Lang, targetType: string): string {
  return tWire(lang, "entity", targetType);
}

/** Translate a company field name the server reports ("vat_number"). */
export function tField(lang: Lang, field: string): string {
  return tWire(lang, "field", field);
}

/** Translate a subscription status ("past_due"). */
export function tSubscriptionStatus(lang: Lang, status: string): string {
  return tWire(lang, "substatus", status);
}

/** Translate a plan tier ("business_pro"). */
export function tTier(lang: Lang, tier: string): string {
  return tWire(lang, "tier", tier);
}

/** Translate a meter name ("peppol_documents"). */
export function tMeter(lang: Lang, meter: string): string {
  return tWire(lang, "meter", meter);
}

/** Translate a feature key ("pdf_remove_branding"). */
export function tFeature(lang: Lang, feature: string): string {
  return tWire(lang, "feature", feature);
}

/** Translate a graded feature value ("advanced", "consolidated"). Graded
 *  features are the ones whose value is a string rather than a boolean. */
export function tLevel(lang: Lang, level: string): string {
  return tWire(lang, "level", level);
}
