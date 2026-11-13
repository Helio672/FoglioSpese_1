# Spec — Patrimonio

Vocabolario: [CONTEXT.md](../../CONTEXT.md). Decisioni: [ADR-0001](../adr/0001-movimenti-e-quotazioni-per-gli-investimenti.md), [ADR-0002](../adr/0002-quotazioni-automatiche-da-yahoo-finance.md), [ADR-0003](../adr/0003-migrazioni-versionate-con-user-version.md).

## Obiettivo

Una nuova tab **Patrimonio** dove l'utente registra i propri Conti (liquidità, investimenti, passività) e vede il Net worth attuale, la sua Variazione nel periodo, il Rendimento degli investimenti e un grafico dell'andamento. Prima tutto a mano, poi con Quotazioni automatiche da Yahoo Finance.

## Fuori ambito (v1)

- Collegamento con le Spese (una Spesa non tocca alcun Conto).
- Valute diverse dall'euro (la colonna `currency` esiste, vale sempre `EUR`).
- Crypto e beni reali (auto, immobili).
- Tasse, ritenute, frazionamenti azionari.
- Rendimento ponderato nel tempo (TWR).
- Aggiornamento in background e notifiche.

## Modello dati (migrazione v2)

Importi in **centesimi** (`INTEGER`), come le Spese. Quantità come `REAL`. Date `YYYY-MM-DD` (testo). Id testuali come nel resto dello schema.

| Tabella | Colonne principali |
|---|---|
| `accounts` | `id`, `name`, `kind` (`liquidity` \| `investment` \| `liability`), `currency`, `sort_order`, `archived_at`, `created_at`, `updated_at` |
| `instruments` | `id`, `name`, `isin` (obbligatorio se quotato, univoco quando presente), `instrument_type` (`etf` \| `stock` \| `fund` \| `bond` \| `other`), `price_symbol` (Simbolo, nullable), `currency`, `created_at` |
| `transactions` | `id`, `account_id` → accounts (solo `investment`), `instrument_id` → instruments, `kind` (`buy` \| `sell` \| `income`), `date`, `quantity` (null per `income`), `unit_price_cents` (null per `income`), `fees_cents`, `amount_cents` (solo `income`), `note`, `created_at`, `updated_at` |
| `prices` | `instrument_id`, `date`, `price_cents`, `source` (`manual` \| `yahoo`); PK (`instrument_id`, `date`); una manuale non viene sovrascritta da una automatica nello stesso giorno |
| `balances` | `id`, `account_id` → accounts (solo `liquidity`/`liability`), `date`, `amount_cents` (sempre ≥ 0; per le passività è il debito), `note`; univoco (`account_id`, `date`) |

Indici su `transactions(account_id, date)`, `transactions(instrument_id)`, `balances(account_id, date)`.

## Logica di dominio (pura, testata con jest-expo, in `src/domain/`)

- `computeHoldings(transactions, atDate)` → quantità per (Conto, Strumento). Vendite oltre la quantità detenuta: errore di validazione in inserimento.
- `accountValueAt(account, data, atDate)` → Valore: ultimo Saldo ≤ data, oppure Σ quantità × ultima Quotazione ≤ data. Strumento senza Quotazione: valore a costo d'acquisto, segnalato in UI come "senza prezzo".
- `netWorthAt(atDate)` → liquidità + investimenti − passività.
- `netWorthSeries(range, step)` → punti `(date, value)`; `step` giornaliero per 1M/3M/6M, settimanale per YTD/1A/Tutto; carry-forward dell'ultimo valore noto.
- `periodChange(series)` → Variazione in € e % (% assente se il valore iniziale è 0).
- `investmentReturn(atDate)` → Versato, Proventi, Rendimento in € e % sul Versato.

## Fonte prezzi

Interfaccia unica nel layer dati, es.:

```ts
type PriceSource = {
  searchByIsin(isin: string): Promise<SymbolCandidate[]>; // borsa, simbolo, nome
  latest(symbol: string): Promise<{ date: string; priceCents: number }>;
  history(symbol: string, from: string): Promise<{ date: string; priceCents: number }[]>;
};
```

- v1: solo inserimento manuale (nessuna implementazione remota).
- Yahoo (ticket 7): implementazione validata prima dal prototipo `prototype/yahoo-quotes`. Errori di rete o di formato non bloccano mai l'app: si mostra l'ultima Quotazione nota e la sua data.
- Aggiornamento (ticket 8): all'apertura della tab, se l'ultimo aggiornamento è di un altro giorno, e con pull-to-refresh; recupero dello storico mancante dal primo Movimento dello Strumento.

## Schermate (Expo Router, `app/`)

- **Tab Patrimonio** (`app/(tabs)/patrimonio.tsx`): in alto Net worth e Variazione del periodo selezionato; selettore periodo 1M/3M/6M/YTD/1A/Tutto; grafico ad area (`react-native-gifted-charts`, con pointer); riquadro Rendimento investimenti; lista Conti raggruppati per Tipo con il loro Valore.
- **Conto** (`app/patrimonio/conto/[id].tsx`): per liquidità/passività lo storico dei Saldi + "Aggiorna saldo"; per investimenti le Posizioni (quantità, ultima Quotazione e data, Valore) e i Movimenti.
- **Nuovo/modifica Conto, Movimento, Saldo, Quotazione**: form in stile `src/components/ExpenseForm.tsx` (importi con `parseEuroToCents`, date con il DatePicker a calendario già usato).
- **Strumento** (`app/patrimonio/strumento/[id].tsx`): anagrafica, Simbolo, storico Quotazioni, inserimento manuale.

Nota: le route oggi stanno in `app/` alla radice (non in `src/app/` come dice AGENTS.md); restiamo coerenti con il codice esistente.

## Ticket

| # | Titolo | Bloccato da |
|---|---|---|
| 1 | Migrazioni versionate con `user_version` + jest-expo | — |
| 2 | Schema v2, Conti e tab Patrimonio | 1 |
| 3 | Saldi di liquidità/passività e Net worth attuale | 2 |
| 4 | Strumenti, Movimenti, Quotazioni manuali e Posizioni | 2 |
| 5 | Serie del Net worth, Variazione e Rendimento | 3, 4 |
| 6 | Grafico dell'andamento con selettore periodo | 5 |
| 7 | Fonte prezzi Yahoo: ricerca per ISIN, ultima Quotazione, storico | 4 (+ esito prototipo) |
| 8 | Aggiornamento automatico Quotazioni e recupero storico | 6, 7 |

Ogni ticket: branch `feat/patrimonio-<n>-<slug>`, PR verso `dev`, `npx expo lint` + `npx tsc --noEmit` (+ `npx jest` dal ticket 1) puliti, prova in Expo Go tramite la preview EAS della PR.
