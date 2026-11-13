# Investimenti come Movimenti + Quotazioni, liquidità e passività come Saldi

Per i Conti di investimento registriamo i Movimenti (acquisto, vendita, provento) e, separatamente, le Quotazioni di ogni Strumento; le Posizioni e il Valore si ricavano. Per liquidità e passività registriamo solo Saldi datati. Abbiamo scartato il modello a soli snapshot ("12 quote a 112,40 € il giorno X") perché non distingue il Versato dal Rendimento: un +8% potrebbe essere solo un bonifico. Il modello a Movimenti è anche la base per le Quotazioni automatiche (ADR-0002) e per un futuro collegamento con le Spese.

## Consequences

- Correggere un Movimento passato ricalcola tutta la storia: Posizioni e serie del Net worth sono sempre derivate, mai salvate.
- Liquidità e passività restano "a gradini": tra due Saldi vale l'ultimo noto.
- Rendimento ponderato nel tempo (TWR) non calcolato nella v1, ma ricavabile in futuro dagli stessi dati.
