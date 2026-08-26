export type Lang = "en" | "fr" | "nl" | "es";

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
  "history.actions": { en: "Actions", fr: "Actions", nl: "Acties", es: "Acciones" },
  "history.void": { en: "Void", fr: "Annuler", nl: "Annuleren", es: "Anular" },
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

} as const;

export type MessageKey = keyof typeof MESSAGES;

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

/** Translate a backend Peppol-gate message key (e.g. "errSupplierVat").
 *  Unknown keys (backend newer than the UI) fall back to the raw key. */
export function tPeppolError(lang: Lang, messageKey: string): string {
  const key = `peppol.${messageKey}`;
  return key in MESSAGES ? t(lang, key as MessageKey) : messageKey;
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
