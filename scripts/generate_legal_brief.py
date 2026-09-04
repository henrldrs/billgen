"""Génère `docs/LEGAL_BRIEF.md` — la note de synthèse destinée au juriste.

Written in French because the reader is a Belgian francophone jurist, and a
brief a lawyer has to translate before reading is a brief that does not get
read. The code and its comments stay in English; only the *output* is French.

Why generated rather than hand-written: every fact counsel needs already exists
as a registry in `core/trust/` — which documents are required and what each one
blocks, what personal data is held and for how long, which subprocessors are
live versus planned, which cookie categories actually run. A typed brief would
disagree with those registries within a month, and a lawyer drafting from a
stale brief produces a policy describing a system that does not exist. That is
worse than no policy: it is a false statement published under Henri's name.

So the tables are read from the code at generation time. The prose around them
is editorial and lives here, beside the tables it introduces.

**The translation maps below are deliberate.** Registry values are authored in
English; rather than translating them silently, `_fr()` looks each one up and
marks anything it does not recognise with «  ⚠ à traduire ». A new dataset
therefore shows up as an obvious gap in the French brief instead of a stray
English sentence nobody notices.

    python scripts/generate_legal_brief.py
    python scripts/generate_legal_brief.py --check    # CI: refuse a stale brief
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.trust import consent, legal, personal_data  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "docs" / "LEGAL_BRIEF.md"

#  Registry English -> brief French. Keyed by the exact source string so a
#  reworded registry entry surfaces as untranslated rather than as a wrong
#  translation that reads fine.
FR: dict[str, str] = {
    # --- document titles ---
    "Terms of Service": "Conditions générales d'utilisation",
    "Privacy Policy": "Politique de confidentialité",
    "Data Processing Agreement": "Contrat de sous-traitance (DPA)",
    "Subprocessors": "Liste des sous-traitants ultérieurs",
    "Cookie Policy": "Politique en matière de cookies",
    "Service Level Agreement": "Convention de niveau de service (SLA)",
    "Legal notices": "Mentions légales",
    # --- what each document blocks ---
    "charging money": "facturer quoi que ce soit",
    "any paid signup": "toute inscription payante",
    "collecting an email address on the marketing site": (
        "collecter une adresse e-mail sur le site vitrine"
    ),
    "selling to any business with a DPO": "vendre à toute entreprise disposant d'un DPO",
    "the DPA, which has to reference it": "le DPA, qui doit y renvoyer",
    "running any analytics at all": "activer la moindre mesure d'audience",
    "enterprise tiers that ask for one": "les offres entreprise qui l'exigent",
    "publishing the marketing site lawfully": "publier légalement le site vitrine",
    # --- dataset purposes ---
    "Authenticate the person and address them in their own language.": (
        "Authentifier la personne et s'adresser à elle dans sa langue."
    ),
    "Let a person see where they are signed in, and end a session they do not recognise.": (
        "Permettre à la personne de voir ses sessions actives et de clôturer "
        "celle qu'elle ne reconnaît pas."
    ),
    "Address an invoice to a legally identified counterparty.": (
        "Adresser une facture à une contrepartie légalement identifiée."
    ),
    "Issue a legally valid invoice and support the customer's VAT return.": (
        "Émettre une facture légalement valable et alimenter la déclaration TVA du client."
    ),
    "Prove who changed what — the integrity guarantee the invoicing core rests on.": (
        "Prouver qui a modifié quoi — la garantie d'intégrité sur laquelle "
        "repose le cœur de facturation."
    ),
    "Prove that consent was given, to what, and when.": (
        "Prouver que le consentement a été donné, à quoi, et quand."
    ),
    # --- retentions ---
    "Life of the account, then 30 days in backups.": (
        "Durée de vie du compte, puis 30 jours dans les sauvegardes."
    ),
    "Until the token expires or is revoked.": ("Jusqu'à expiration ou révocation du jeton."),
    "Seven years after the last invoice, following the documents they appear on.": (
        "Sept ans après la dernière facture, en suivant les documents où elles figurent."
    ),
    "Seven years (Belgian VAT Code art. 60 / CIR 92 bookkeeping retention).": (
        "Sept ans (art. 60 du Code de la TVA / règles comptables du CIR 92)."
    ),
    "Seven years, with the documents it describes.": ("Sept ans, avec les documents qu'il décrit."),
    "Five years after the consent is withdrawn or superseded.": (
        "Cinq ans après le retrait ou le remplacement du consentement."
    ),
    # --- subprocessors ---
    "Source code and CI. No customer data, unless a log is pasted into an issue.": (
        "Code source et intégration continue. Aucune donnée client, sauf si un "
        "journal est collé dans un ticket."
    ),
    "Hosts the pre-sale marketing site and its capture form.": (
        "Héberge le site vitrine de pré-lancement et son formulaire de captation."
    ),
    "Runs the API and the database.": "Exécute l'API et la base de données.",
    "Delivers invoices, reminders and password resets.": (
        "Achemine les factures, les rappels et les réinitialisations de mot de passe."
    ),
    "Takes payment for BillGen subscriptions.": ("Encaisse les abonnements BillGen."),
    "Transmits e-invoices to the recipient's access point.": (
        "Transmet les factures électroniques vers le point d'accès du destinataire."
    ),
    "United States": "États-Unis",
    "United States / EU edge": "États-Unis / points de présence UE",
    "To be chosen — an EU region is required.": "À choisir — une région UE est requise.",
    "To be chosen.": "À choisir.",
    "To be chosen — an EU-established provider.": ("À choisir — un prestataire établi dans l'UE."),
    "Hosting provider (VPS)": "Hébergeur (VPS)",
    "Email provider": "Prestataire d'envoi d'e-mails",
    "Merchant of Record": "Marchand de référence (Merchant of Record)",
    "Peppol Access Point": "Point d'accès Peppol",
    # --- consent ---
    "session token": "jeton de session",
    "refresh token": "jeton de rafraîchissement",
    "interface language": "langue de l'interface",
    "theme choice": "choix du thème",
}

_MISSING: list[str] = []


def _fr(value: str) -> str:
    """Translate a registry string, or mark it loudly as untranslated."""
    if value in FR:
        return FR[value]
    _MISSING.append(value)
    return f"{value} « ⚠ à traduire »"


PREAMBLE = """\
# BillGen — note de synthèse à l'attention du conseil juridique

*Document généré depuis `core/trust/` le {today} par
`scripts/generate_legal_brief.py`. Merci de ne pas le modifier à la main : les
tableaux sont lus directement dans le code, une correction manuelle serait
écrasée et — plus grave — finirait par diverger du système réellement en
production.*

---

## Objet de ce document

Il s'agit d'une **note factuelle**, et non d'un projet de texte. Elle décrit ce
que BillGen fait des données à caractère personnel, quels documents lui
manquent, et quelles questions relèvent exclusivement d'un professionnel belge.

Elle ne contient **délibérément aucune proposition de rédaction juridique**. La
raison est inscrite dans le code lui-même : un DPA généré automatiquement, qui
*ressemble* à un vrai, est pire qu'un DPA absent — **parce qu'il serait signé**.
L'équipe technique assume le registre de ce qui manque et de ce que chaque
manque bloque ; la rédaction revient au conseil.

## Ce qu'est BillGen, en fait

Un logiciel de facturation en ligne (SaaS) belge, destiné aux TPE et aux
indépendants. Il émet des factures TVA légalement valables, produit des
factures électroniques structurées au format Peppol BIS 3.0 / EN 16931, et
assure le suivi des paiements et des dépenses.

Trois éléments déterminent tout ce qui suit :

1. **BillGen traite les données des clients de ses clients.** Un utilisateur de
   BillGen facture *ses* propres clients : le système détient donc des noms,
   adresses et numéros de TVA de personnes qui ne se sont jamais inscrites chez
   nous. C'est la raison pour laquelle le DPA n'est pas optionnel.
2. **L'obligation comptable belge prime sur le droit à l'effacement.** Les
   factures, et les fiches clients auxquelles elles sont adressées, doivent
   survivre à une demande fondée sur l'article 17 du RGPD — les supprimer
   constituerait une infraction fiscale. Le système encode déjà ce principe :
   voir le registre ci-dessous.
3. **Rien n'est encore en production.** Aucun client, aucun paiement, aucun
   hébergement. Chacun des documents ci-dessous peut donc encore être établi
   correctement *avant* qu'il ne soit engageant — c'est la seule raison pour
   laquelle cette démarche reste peu coûteuse.

## État actuel : aucun document n'est rédigé

Les sept documents sont à l'état de manque. Il s'agit d'un choix assumé et non
d'un oubli : le registre enregistre la lacune plutôt que de la combler par un
texte généré.
"""

QUESTIONS = """\
---

## Questions relevant exclusivement du conseil

Voici les points où la rigueur technique ne suffit pas à garantir la justesse
juridique. Chacun est **déjà implémenté d'une certaine manière** ; la question
est de savoir si cette manière est la bonne.

### Q1 · La conservation prime sur l'effacement — sept ans, à partir de quand ?

Le système conserve les factures et les fiches clients malgré une demande
d'effacement fondée sur l'article 17, sur la base de l'article 60 du Code de la
TVA et des règles comptables du CIR 92. Les fiches clients sont conservées
**sept ans après la dernière facture**, et non sept ans après leur création.

- Sept ans est-il le bon délai pour les deux, et « après la dernière facture »
  est-il le bon point de départ pour les fiches clients ?
- Le journal d'audit est **anonymisé** plutôt qu'effacé : l'auteur de l'action
  est détaché, la trace subsiste. Cet équilibre entre l'article 17 et
  l'obligation d'intégrité est-il défendable ?

### Q2 · La frontière de l'indépendant (personne physique)

Les fonctions d'IA de BillGen classifient des **transactions** (cette dépense
est-elle déductible à la TVA ?), jamais des **personnes**. C'est ce qui les
maintient au niveau de risque minimal/limité du règlement européen sur l'IA,
et hors de l'annexe III (haut risque) — voir `docs/ARCHITECTURE/ADR-0005`.

**Or, lorsque le client est un indépendant, l'entreprise et la personne
physique se confondent.** Notre lecture est que le résultat porte toujours sur
une *transaction*, et que la qualification tient donc. C'est l'hypothèse de
toute notre position sur le règlement IA que nous souhaitons le plus voir
confirmée ou corrigée : les deux issues diffèrent d'une évaluation de
conformité de six à douze mois.

### Q3 · Les mentions obligatoires sur une facture

`core/services/invoice_compliance.py` **refuse d'émettre** une facture à
laquelle il manque une mention légale, sur la base de l'AR n° 1 du 29 décembre
1992, art. 5, et des art. 39bis / 51 §2 du Code de la TVA.

**Cette énumération devrait être validée par un comptable belge** : une règle
trop stricte enferme un client payant ; une règle trop permissive fait partir
une facture illégale. (Cette question relève du comptable plutôt que du
juriste, mais elle est signalée ici car elle appartient à la même réunion.)

### Q4 · Mentions légales du site vitrine

Le site est en ligne (billgenbe.vercel.app) et **collecte déjà des adresses
e-mail, avant l'existence d'une politique de confidentialité**. Que doit-il
comporter, et quelle est l'urgence réelle de cette lacune ?

### Q5 · Responsable du traitement ou sous-traitant, jeu de données par jeu de données ?

Notre analyse : BillGen est **responsable du traitement** pour les données de
compte (ses propres clients) et **sous-traitant** pour les données de factures
et de fiches clients (les clients de ses clients). Le contenu du DPA dépend
entièrement de la justesse de cette répartition.

### Q6 · Convention de bêta / pilote

Avant le lancement payant, un petit nombre d'utilisateurs pilotes est prévu,
éventuellement à titre gratuit. Cela nécessite-t-il une convention propre, ou
les conditions générales assorties d'un DPA suffisent-elles ?

---

## Ce que nous ne demandons pas

- Une politique de confidentialité rédigée à partir d'un modèle que nous
  fournirions. Le registre ci-dessus est la matière première ; la rédaction
  doit être celle du conseil.
- Un avis complet sur le règlement IA au-delà de la Q2. La position est
  documentée et les obligations sont de niveau faible ; nous souhaitons faire
  vérifier l'hypothèse relative aux indépendants, pas commander une revue.

## Note pratique sur l'ordre de priorité

Si le temps est compté, l'ordre qui débloque le plus est le suivant :
**le DPA et les conditions générales d'abord** (ils bloquent tout revenu),
puis **les mentions légales et la politique de confidentialité** (le site
collecte déjà des adresses), puis le reste.

---

*Contact : Henri — h.enri@outlook.com. Le registre dont ce document est extrait
se trouve dans `core/trust/legal.py`, `core/trust/personal_data.py` et
`core/trust/consent.py`.*
"""


def _table(rows: list[list[str]], head: list[str]) -> str:
    out = ["| " + " | ".join(head) + " |", "|" + "|".join(["---"] * len(head)) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def render() -> str:
    _MISSING.clear()
    parts = [PREAMBLE.format(today=date.today().strftime("%d/%m/%Y"))]

    parts.append("\n### Les sept documents\n")
    parts.append(
        _table(
            [
                [
                    _fr(d.title),
                    "public" if d.audience is legal.Audience.PUBLIC else "client",
                    "oui" if d.requires_acceptance else "—",
                    " ; ".join(_fr(b) for b in d.blocks) or "—",
                ]
                for d in legal.documents()
            ],
            ["Document", "Lecteur", "Acceptation signée ?", "Bloqué tant qu'il manque"],
        )
    )
    parts.append(
        "\n*« Acceptation signée » signifie qu'un enregistrement par utilisateur et par "
        "version est requis. Seuls les deux documents contractuels tirent un effet de leur "
        "acceptation ; les autres sont des informations, et placer une barrière de "
        "consentement devant une politique de cookies serait une erreur.*\n"
    )

    parts.append("\n---\n\n## Registre des activités de traitement\n")
    parts.append(
        "Quelles données à caractère personnel le système détient, pourquoi, pendant "
        "combien de temps, et ce qu'une demande d'effacement produit sur chacune. "
        "C'est la matière de l'article 30 du RGPD.\n"
    )
    parts.append(
        _table(
            [
                [
                    ds.key,
                    _fr(ds.purpose),
                    _fr(ds.retention),
                    {
                        "erase": "effacé",
                        "retain": "**conservé**",
                        "anonymise": "anonymisé",
                    }[ds.erasure.value],
                ]
                for ds in personal_data.register()
            ],
            ["Jeu de données", "Finalité", "Conservation", "En cas de demande d'effacement"],
        )
    )
    retained = ", ".join(sorted(ds.key for ds in personal_data.retained_on_erasure()))
    parts.append(
        f"\n*Conservés malgré une demande d'effacement : **{retained}**. C'est l'objet de "
        "la question Q1 — le système refuse déjà de les supprimer, et il revient au conseil "
        "de confirmer le fondement et les durées.*\n"
    )

    parts.append("\n---\n\n## Sous-traitants ultérieurs\n")
    live = [s for s in personal_data.subprocessors() if s.in_use]
    planned = [s for s in personal_data.subprocessors() if not s.in_use]
    parts.append(f"\n**En service aujourd'hui ({len(live)}) :**\n")
    parts.append(
        _table(
            [
                [_fr(s.name) if s.name in FR else s.name, _fr(s.purpose), _fr(s.location)]
                for s in live
            ],
            ["Nom", "Finalité", "Localisation"],
        )
    )
    parts.append(
        f"\n**Prévus, non encore engagés ({len(planned)}).** Mentionnés parce que le DPA "
        "doit renvoyer à une liste de sous-traitants, et parce que plusieurs d'entre eux "
        "posent en réalité la question du mécanisme de transfert :\n"
    )
    parts.append(
        _table(
            [[_fr(s.name), _fr(s.purpose), _fr(s.location)] for s in planned],
            ["Nom", "Finalité", "Localisation"],
        )
    )

    parts.append("\n---\n\n## Cookies et stockage équivalent\n")
    parts.append(
        "\nSeuls les stockages strictement nécessaires et fonctionnels sont utilisés à ce "
        "jour — c'est l'unique raison pour laquelle aucune bannière de consentement n'est "
        "encore affichée. Dès l'ajout d'un script de mesure d'audience, la politique "
        "cookies et la bannière deviennent exigibles ensemble.\n"
    )
    parts.append(
        _table(
            [
                [
                    c.category.value,
                    "activé" if c.default_on else "désactivé",
                    ", ".join(_fr(u) for u in c.in_use) if c.in_use else "— rien ne s'exécute",
                ]
                for c in consent.categories()
            ],
            ["Catégorie", "Par défaut", "Ce qui s'exécute réellement"],
        )
    )
    parts.append(
        "\n*Aucune catégorie optionnelle n'est activée par défaut. Une décision de "
        "consentement enregistre ce à quoi il a été consenti, sous quelle version de "
        "politique, et à quelle date.*\n"
    )

    parts.append(QUESTIONS)
    return "\n".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if the file is out of date")
    args = ap.parse_args()

    body = render()
    if _MISSING:
        print("Untranslated registry strings (add them to FR in this script):")
        for m in dict.fromkeys(_MISSING):
            print(f"  - {m!r}")

    if args.check:
        stale = not OUT.exists() or OUT.read_text(encoding="utf-8") != body
        if stale:
            print(f"{OUT.name} is STALE — run scripts/generate_legal_brief.py")
        else:
            print(f"{OUT.name} is in sync.")
        return 1 if (stale or _MISSING) else 0

    OUT.write_text(body, encoding="utf-8")
    print(f"Wrote {OUT}  ({len(body):,} bytes)")
    return 1 if _MISSING else 0


if __name__ == "__main__":
    raise SystemExit(main())
