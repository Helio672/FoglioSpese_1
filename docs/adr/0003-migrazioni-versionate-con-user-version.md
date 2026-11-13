# Migrazioni SQLite versionate con `PRAGMA user_version`

Lo schema evolve tramite un elenco ordinato di migrazioni SQL scritte a mano; la versione applicata è salvata in `PRAGMA user_version` e all'avvio si eseguono solo quelle successive. Lo script unico `CREATE TABLE IF NOT EXISTS` di prima non permetteva di modificare tabelle esistenti né di ordinare modifiche provenienti da feature parallele. Abbiamo scartato drizzle-kit (migrazioni generate dallo schema) per non aggiungere configurazione e file generati: Drizzle resta come query builder tipizzato, e `src/db/schema.ts` va tenuto allineato a mano alle migrazioni.

## Consequences

- La migrazione esistente è la v1; il Patrimonio introduce la v2; le notifiche prenderanno la v3. Chi arriva su `dev` dopo prende il numero successivo e fa rebase.
- Una migrazione già rilasciata non si modifica mai: si aggiunge la successiva.
