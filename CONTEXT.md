# FoglioSpese

App personale per registrare le spese sul proprio smartphone Android. Le spese si inseriscono a mano oppure nascono dalle notifiche delle app bancarie.

## Language

**Spesa**:
Un'uscita di denaro confermata e categorizzata (categoria e sottocategoria). Conta nei totali e nei filtri ed è il dato destinato alla futura sincronizzazione.
_Avoid_: Transazione, Movimento (quando si intende una spesa confermata)

**Categoria / Sottocategoria**:
Classificazione a due livelli di una **Spesa**; ogni Sottocategoria appartiene a una sola Categoria.

**Notifica bancaria**:
Una notifica Android pubblicata da una **Fonte** che annuncia un'operazione su un conto o una carta.

**Fonte**:
Un'app bancaria o di pagamento le cui **Notifiche bancarie** l'app sa leggere (oggi: Intesa Sanpaolo, PayPal, Google Pay, Fineco). L'elenco può cambiare nel tempo.

**Movimento rilevato**:
Un'uscita di denaro estratta da una **Notifica bancaria**, in attesa di essere valutata. Non è ancora una **Spesa** e non conta nei totali.
_Avoid_: Spesa da categorizzare, spesa provvisoria

**Da valutare**:
La sezione dell'app che raccoglie i **Movimenti rilevati** non ancora valutati.

**Regola di categorizzazione**:
Associa una ragione sociale riconoscibile a una **Categoria/Sottocategoria** suggerita per un **Movimento rilevato**. Il suggerimento va comunque confermato.

## Relationships

- Una **Notifica bancaria** proviene da una sola **Fonte** e può produrre al massimo un **Movimento rilevato**
- Un **Movimento rilevato**, una volta categorizzato e confermato, diventa una **Spesa**
- Una **Regola di categorizzazione** suggerisce, non decide: nessun **Movimento rilevato** diventa **Spesa** senza conferma

## Example dialogue

> **Dev:** "Arriva una notifica di Google Pay da 12,40 € da ESSELUNGA: creo una Spesa?"
> **Utente:** "No, crei un Movimento rilevato che compare in Da valutare, con Alimentari/Supermercato suggerito dalla regola. Diventa Spesa quando lo confermo."

## Flagged ambiguities

- "spesa senza categoria" nella richiesta iniziale: risolto come **Movimento rilevato** (entità separata), non come Spesa con categoria vuota.
