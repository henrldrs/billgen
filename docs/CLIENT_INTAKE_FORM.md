# Client intake form — consultancy + BillGen beta

Paste-ready for Google Forms. Written for Emilia (NL, Portuguese-speaking) and
reusable for the next one.

**Two decisions baked in, both from the 2026-09-08 session — see
[BETA_LAUNCH_PLAN.md](BETA_LAUNCH_PLAN.md) §W5:**

1. **Owned by the henriOutai Google account, not `contact@billgen.be`.** Most of
   this is consultancy intake. Collecting it under `billgen.be` would make
   Google Forms a BillGen subprocessor and add an entry to a registry whose
   value is that it is short and true.
2. **Sent as a direct Forms link, not embedded on `billgen.be/en`.** An iframe
   makes the site the collection point, which is the exact thing
   *politique de confidentialité* blocks in
   [core/trust/legal.py](../core/trust/legal.py) while it is undrafted. The
   direct link costs the same (nothing) and ships today.

**It is trimmed to 16 questions from the 24 in the handoff.** The email promised
*"um formulário curto"*, and 24 is not short. What was cut is not lost — it is
better asked in conversation at meeting 2, where a follow-up is possible: what
she has already tried, which marketing channels she uses, what "more marketing"
means to her, what the spam-ish mail actually is, and the 1–5 confidence scale
(redundant with Q12, which is the stronger signal).

---

## Form title

> **henriOutai — Questionário inicial**

## Description (goes under the title)

> Olá Emilia,
>
> Este questionário serve para preparar a nossa segunda conversa: os primeiros
> blocos ajudam-me a configurar a versão beta do BillGen ao teu processo real,
> e os últimos a enquadrar a parte de consultoria.
>
> São 16 perguntas, cerca de 5 minutos. Se alguma não se aplicar, deixa em
> branco.

## Data note — put this at the end of the description, before the questions

> **Sobre os teus dados.** As respostas são recolhidas por Henrique Ribeiro
> (henriOutai) e ficam guardadas no Google Forms. Servem apenas para preparar a
> proposta e a configuração da beta — não são partilhadas com terceiros nem
> usadas para marketing. Podes pedir a consulta ou a eliminação das tuas
> respostas a qualquer momento através de henrioutai@proton.me.

This is the minimum honest disclosure, not a privacy policy. It is the kind of
text that is legitimate to write without a lawyer, and it is what makes
collecting the data defensible before the *politique de confidentialité* exists.

---

## Section A — O teu negócio

**1.** Nome do negócio ou marca
· *Resposta curta*

**2.** O que fazes, numa frase
· *Resposta curta*

**3.** Dimensão da equipa
· *Escolha múltipla* — Só eu · 2–3 pessoas · 4–10 pessoas · Mais de 10

**4.** Número de IVA (BTW) ou KvK, se já tiveres
· *Resposta curta*
· Help text: *Necessário para emitir faturas corretamente entre a Bélgica e os
  Países Baixos. Se ainda não tiveres, deixa em branco.*

## Section B — Faturação

**5.** Como fazes as faturas hoje?
· *Escolha múltipla* — Word ou Excel · Um software de faturação · O contabilista
  trata disso · Em papel · Outro

**6.** Quantas faturas por mês, aproximadamente?
· *Escolha múltipla* — 1–5 · 6–20 · 21–50 · Mais de 50

**7.** Precisas de Peppol / faturação eletrónica desde já?
· *Escolha múltipla* — Sim · Não · Não sei

**8.** O que não pode faltar na tua faturação?
· *Caixas de verificação* — Cálculo automático de IVA · Faturas recorrentes ·
  Modelos personalizados · Seguimento de pagamentos · Registo de despesas ·
  Várias moedas · Outro

## Section C — Organização e comunicação

**9.** Qual é hoje o teu maior problema de organização ou planeamento?
· *Parágrafo*

**10.** Destes três, qual te aliviaria mais se fosse resolvido primeiro?
· *Escolha múltipla* — Planeamento e organização · Marketing e divulgação ·
  Triagem e gestão de emails

**11.** Quantos emails recebes por dia, mais ou menos, e em que caixa?
· *Resposta curta*
· Help text: *Por exemplo: "uns 40, no Gmail".*

## Section D — Forma de trabalhar e orçamento

**12.** Como te sentes normalmente com software novo?
· *Escolha múltipla*
  — Experimento sozinha e descubro
  — Prefiro uma explicação rápida e depois desenrasco-me
  — Prefiro que alguém configure e me mostre o essencial
  — Prefiro que trates tu disso e eu uso o resultado

**13.** Que formato de pagamento te seria mais confortável?
· *Escolha múltipla*
  — Uma mensalidade fixa
  — Mensalidade mais baixa + um valor único de arranque
  — Preço fixo por projeto, em 2–3 prestações
  — Ainda não sei

**14.** Faixa de investimento mensal confortável, antes de falarmos de números
concretos *(opcional)*
· *Escolha múltipla* — Até €150 · €150–300 · €300–500 · €500–800 · Mais de €800 ·
  Prefiro discutir na reunião

## Section E — Logística

**15.** Melhores dias e horas para a nossa próxima conversa
· *Resposta curta*

**16.** Idioma preferido para a chamada
· *Escolha múltipla* — Português · Nederlands · English · Français

---

## Why these questions and not the others

- **Q4 is new and is the one with a real invoicing consequence.** Reverse charge
  on a B2B service to the Netherlands only applies against a *valid, verified*
  VAT number — verify it in VIES before issuing. Without one, Belgian VAT at 21%
  applies instead. The composer already emits the right treatment
  ([SOLO_RUN.md](SOLO_RUN.md) item 8: category `AE`, 0%, Article 51 §2), but it
  can only be right if this field is filled and checked.
- **Q12 is the highest-value question in the form.** "Prefiro que alguém
  configure e me mostre o essencial" means full-service onboarding, not a login
  handoff — and that changes the price more than the invoice volume does.
- **Q13 and Q14 exist so she sets the frame before a number is proposed.**
  Whatever is quoted at meeting 2 should land inside a range she already named.
  Q14 is explicitly optional; making it mandatory is how people abandon a form.
- **Q10 replaces three separate diagnostic questions.** The ranking is what
  decides where the first engagement starts; the detail behind it is a
  conversation, not a text box.
- **Nothing here mentions the demo it was built from.** See
  [BETA_LAUNCH_PLAN.md](BETA_LAUNCH_PLAN.md) §W5 — that reference should not be
  repeated to her, and her beta is seeded synthetically.

## Settings to check before sending

- **Collect email addresses:** on — otherwise a response cannot be tied back.
- **Limit to one response:** off — it requires a Google sign-in she may not have.
- **Response receipt:** on. It is a courtesy, and it confirms delivery.
- **Do not require sign-in.** A form that demands a Google account before a
  first-time client can answer is a form that does not get answered.
