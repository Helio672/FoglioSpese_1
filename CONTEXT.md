# FoglioSpese

App personale, solo locale, per annotare le spese quotidiane e seguire nel tempo il proprio patrimonio (investimenti, liquidità, debiti).

## Spese

**Spesa**:
Un'uscita di denaro in euro avvenuta in un preciso momento, classificata con una Categoria e una Sottocategoria.
_Avoid_: Uscita, transazione, movimento

**Categoria**:
Raggruppamento di primo livello delle Spese (es. "Casa", "Trasporti"), gestibile dall'utente.

**Sottocategoria**:
Suddivisione di una Categoria; ogni Spesa ne ha esattamente una.

## Patrimonio

**Patrimonio**:
L'insieme dei Conti dell'utente e della loro storia nel tempo. È indipendente dalle Spese: una Spesa non modifica alcun Conto.
_Avoid_: Portafoglio (quando si intende il tutto)

**Conto**:
Un contenitore di valore identificato dall'utente (es. "Conto corrente BBVA", "Conto titoli Fineco", "Mutuo casa"), con un Tipo conto.
_Avoid_: Account, rapporto, deposito

**Tipo conto**:
La natura di un Conto: _liquidità_ (contanti, conti correnti e deposito), _investimento_ (contiene Posizioni) o _passività_ (un debito, sottratto dal Net worth).

**Strumento**:
Un titolo finanziario negoziabile (ETF, azione, fondo, obbligazione), identificato dall'ISIN quando è quotato. È condiviso: lo stesso Strumento può stare in più Conti.
_Avoid_: Titolo, asset, ticker

**Simbolo**:
Il codice con cui una Fonte prezzi riconosce uno Strumento su una specifica borsa (es. lo stesso ISIN quotato a Milano o su Xetra). Scelto dall'utente.
_Avoid_: Ticker (quando si intende l'identità dello Strumento)

**Movimento**:
Un'operazione su uno Strumento in un Conto di investimento a una data: _acquisto_, _vendita_ (entrambi con eventuali commissioni) o _provento_ (dividendo o cedola incassati).
_Avoid_: Transazione, operazione, trade

**Posizione**:
Quanto di uno Strumento è detenuto in un Conto di investimento; non si inserisce, si ricava dai Movimenti.
_Avoid_: Holding, quote possedute

**Quotazione**:
Il prezzo unitario di uno Strumento a una data, inserito a mano o ottenuto da una Fonte prezzi.
_Avoid_: Prezzo di mercato, valorizzazione

**Fonte prezzi**:
Da dove arrivano le Quotazioni: _manuale_ (l'utente) o _automatica_ (un servizio esterno). La fonte manuale è sempre disponibile.
_Avoid_: Provider, feed

**Saldo**:
Il valore di un Conto di liquidità, o il debito residuo di un Conto di passività, registrato dall'utente a una data. Vale fino al Saldo successivo.
_Avoid_: Snapshot, giacenza, valorizzazione

**Valore**:
Quanto vale un Conto a una data: il Saldo per liquidità e passività; la somma delle Posizioni per l'ultima Quotazione nota per gli investimenti.

**Net worth**:
Somma dei Valori dei Conti di liquidità e investimento meno quelli dei Conti di passività, a una data.
_Avoid_: Patrimonio netto (ok come etichetta UI), totale, saldo complessivo

**Versato**:
Il capitale netto messo negli investimenti: acquisti più commissioni, meno incassi da vendite.
_Avoid_: Investito, costo

**Rendimento**:
Valore degli investimenti più Proventi meno Versato, in euro e in percentuale sul Versato.
_Avoid_: Performance, guadagno, P&L

**Variazione**:
La differenza di Net worth tra l'inizio e la fine di un periodo, in euro e in percentuale. Include i soldi aggiunti, quindi non è un Rendimento.
_Avoid_: Scostamento (quando si intende il Rendimento), crescita
