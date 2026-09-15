# BillGen — note de synthèse à l'attention du conseil juridique

*Document généré depuis `core/trust/` le 15/09/2026 par
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


### Les sept documents

| Document | Lecteur | Acceptation signée ? | Bloqué tant qu'il manque |
|---|---|---|---|
| Conditions générales d'utilisation | public | oui | facturer quoi que ce soit ; toute inscription payante |
| Politique de confidentialité | public | — | collecter une adresse e-mail sur le site vitrine |
| Contrat de sous-traitance (DPA) | client | oui | vendre à toute entreprise disposant d'un DPO |
| Liste des sous-traitants ultérieurs | public | — | le DPA, qui doit y renvoyer |
| Politique en matière de cookies | public | — | activer la moindre mesure d'audience |
| Convention de niveau de service (SLA) | client | — | les offres entreprise qui l'exigent |
| Mentions légales | public | — | publier légalement le site vitrine |

*« Acceptation signée » signifie qu'un enregistrement par utilisateur et par version est requis. Seuls les deux documents contractuels tirent un effet de leur acceptation ; les autres sont des informations, et placer une barrière de consentement devant une politique de cookies serait une erreur.*


---

## Registre des activités de traitement

Quelles données à caractère personnel le système détient, pourquoi, pendant combien de temps, et ce qu'une demande d'effacement produit sur chacune. C'est la matière de l'article 30 du RGPD.

| Jeu de données | Finalité | Conservation | En cas de demande d'effacement |
|---|---|---|---|
| account | Authentifier la personne et s'adresser à elle dans sa langue. | Durée de vie du compte, puis 30 jours dans les sauvegardes. | effacé |
| sessions | Permettre à la personne de voir ses sessions actives et de clôturer celle qu'elle ne reconnaît pas. | Jusqu'à expiration ou révocation du jeton. | effacé |
| clients | Adresser une facture à une contrepartie légalement identifiée. | Sept ans après la dernière facture, en suivant les documents où elles figurent. | **conservé** |
| invoices | Émettre une facture légalement valable et alimenter la déclaration TVA du client. | Sept ans (art. 60 du Code de la TVA / règles comptables du CIR 92). | **conservé** |
| audit | Prouver qui a modifié quoi — la garantie d'intégrité sur laquelle repose le cœur de facturation. | Sept ans, avec les documents qu'il décrit. | anonymisé |
| consent | Prouver que le consentement a été donné, à quoi, et quand. | Cinq ans après le retrait ou le remplacement du consentement. | **conservé** |

*Conservés malgré une demande d'effacement : **clients, consent, invoices**. C'est l'objet de la question Q1 — le système refuse déjà de les supprimer, et il revient au conseil de confirmer le fondement et les durées.*


---

## Sous-traitants ultérieurs


**En service aujourd'hui (2) :**

| Nom | Finalité | Localisation |
|---|---|---|
| GitHub | Code source et intégration continue. Aucune donnée client, sauf si un journal est collé dans un ticket. | États-Unis |
| Vercel | Héberge le site vitrine de pré-lancement et son formulaire de captation. | États-Unis / points de présence UE |

**Prévus, non encore engagés (5).** Mentionnés parce que le DPA doit renvoyer à une liste de sous-traitants, et parce que plusieurs d'entre eux posent en réalité la question du mécanisme de transfert :

| Nom | Finalité | Localisation |
|---|---|---|
| Hébergeur (VPS) | Exécute l'API et la base de données. | À choisir — une région UE est requise. |
| Prestataire d'envoi d'e-mails transactionnels | Courriels liés au compte — vérification, réinitialisation de mot de passe, support. L'envoi de la facture au client de l'utilisateur est prévu mais non implémenté. | À choisir — une région UE est requise. |
| Prestataire d'envoi d'e-mails marketing | Lettres d'information et annonces produit, aux seules personnes ayant donné un consentement enregistré. | À choisir — une région UE est requise. |
| Marchand de référence (Merchant of Record) | Encaisse les abonnements BillGen. | À choisir. |
| Point d'accès Peppol | Transmet les factures électroniques vers le point d'accès du destinataire. | À choisir — un prestataire établi dans l'UE. |

---

## Cookies et stockage équivalent


Seuls les stockages strictement nécessaires et fonctionnels sont utilisés à ce jour — c'est l'unique raison pour laquelle aucune bannière de consentement n'est encore affichée. Dès l'ajout d'un script de mesure d'audience, la politique cookies et la bannière deviennent exigibles ensemble.

| Catégorie | Par défaut | Ce qui s'exécute réellement |
|---|---|---|
| essential | activé | jeton de session, jeton de rafraîchissement, langue de l'interface |
| functional | désactivé | choix du thème |
| analytics | désactivé | — rien ne s'exécute |
| marketing | désactivé | — rien ne s'exécute |

*Aucune catégorie optionnelle n'est activée par défaut. Une décision de consentement enregistre ce à quoi il a été consenti, sous quelle version de politique, et à quelle date.*

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

**Précision du 11/09/2026 — le bêta se fait en version bureau.** La décision
du 09/09/2026 (BETA_LAUNCH_PLAN) est que la testeuse reçoit une application
installée sur son portable, et non une instance hébergée. Ses données — et
celles de ses propres clients — ne quittent jamais sa machine : base SQLite
locale, PDF locaux, sauvegardes locales, aucun envoi d'e-mail, aucun Peppol.
Nous ne recevons que son nom, son adresse e-mail et une empreinte machine, aux
seules fins de la licence.

Notre lecture est donc qu'**aucun DPA n'est requis pour ce bêta** : elle est
responsable du traitement, et nous sommes fournisseur d'un logiciel, comme
l'éditeur de n'importe quel outil de bureau. La convention de bêta remplacerait
le DPA. Est-ce exact ? Et si oui, que doit impérativement contenir cette
convention, en particulier :

- le statut bêta et l'absence de garantie de conformité fiscale — ce qu'elle
  doit vérifier elle-même ;
- le canal d'assistance : le jour où elle nous transmet une sauvegarde pour un
  diagnostic, nous traitons bien les données de ses clients. Quelle clause
  couvre ce cas ponctuel, sans faire basculer tout le contrat en DPA ?
- la limitation de responsabilité, la propriété des données et leur
  restitution à la sortie.

### Q7 · Reprise d'une série de factures d'un système vers un autre

Une utilisatrice migre depuis notre ancien outil vers la nouvelle application
(TICKETS T-34). Son historique de factures doit être repris, et la numérotation
doit **continuer** la série existante plutôt que recommencer à 1 — sans quoi
deux factures du même assujetti porteraient le même numéro dans la même année.

Questions : la reprise d'une série émise par un autre système est-elle
admissible telle quelle ? Que faut-il conserver pour que la piste d'audit
fiable reste intacte (l'export d'origine, les documents d'origine, les deux) ?
Et si l'historique n'était **pas** repris, pendant combien de temps doit-elle
conserver l'ancien système ou son export pour satisfaire à la conservation de
sept ans ?

*(Cette question relève d'abord du comptable ; elle figure ici parce que la
réponse détermine ce que le logiciel doit écrire.)*

### Q8 · Preuve de l'acceptation, quand la seule copie est chez le client

L'application écrit le texte accepté en PDF dans le dossier de données de
l'utilisatrice, et enregistre l'acceptation (personne, version, date) dans sa
base — chez elle. **Nous n'en gardons aucune copie** : c'est cohérent avec une
application de bureau, mais cela signifie que nous ne pouvons pas prouver
qu'elle a accepté quoi que ce soit.

Un simple échange d'e-mails contresigné suffit-il pour un bêta B2B, ou faut-il
un dispositif de signature au sens d'eIDAS ? Notre lecture est qu'une signature
électronique simple est admissible (art. 25.1) et proportionnée ici, le
problème n'étant pas la forme de la signature mais la garde de la preuve.

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
