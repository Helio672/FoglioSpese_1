# Ricerca: cifrare l'archivio locale delle notifiche (issue #6)

**Domanda.** In Expo SDK 58 (Android, CNG), qual è il modo supportato per tenere l'archivio delle **Notifiche bancarie** catturate e dei **Movimenti rilevati** *cifrato a riposo* e *fisicamente separato* dal DB delle Spese (che in futuro sarà sincronizzato su cloud, es. Google Drive)?

**Data.** 2026-11-05. Versioni verificate: `expo` ^58.0.21, `expo-sqlite` ~58.0.14 (ramo `sdk-58` di expo/expo), SQLite 3.53.3, SQLCipher 4.17.0 community.

---

## TL;DR / Raccomandazione

1. **Usare un secondo file SQLite (es. `archivio.db`) cifrato con SQLCipher tramite `expo-sqlite`** (`useSQLCipher: true` nel config plugin), separato da `spese.db` che resta in chiaro. Drizzle continua a funzionare senza modifiche: la cifratura è trasparente a livello di pagina.
2. **Chiave**: 32 byte casuali generati al primo avvio, salvati in `expo-secure-store` (su Android: SharedPreferences cifrate con una chiave dell'Android Keystore). Passarla a SQLCipher come **chiave raw** `PRAGMA key = "x'<64 hex>'"` così si salta la derivazione PBKDF2 (256 000 iterazioni) a ogni apertura.
3. **Perdita della chiave = perdita dell'archivio**, per scelta. Su Android i dati di SecureStore non sopravvivono alla disinstallazione e non sono ripristinabili da backup; l'archivio va quindi trattato come **dato locale e sacrificabile** (log di cattura), mentre le Spese confermate vivono nel DB sincronizzato. Va verificato `PRAGMA cipher_version` all'avvio e, se la chiave manca ma il file esiste, si cancella e si ricrea l'archivio.
4. **Escludere l'archivio dal backup automatico Android** con un piccolo config plugin locale che scrive `data_extraction_rules` (Android 12+) e `full_backup_content` (≤ 11) con `<exclude domain="file" path="SQLite/archivio.db"/>` (+ `-wal`, `-shm`), mantenendo l'esclusione di `SecureStore`. In alternativa, più semplice e più netto: `android.allowBackup: false` in `app.json` (nessun plugin), accettando che anche `spese.db` non finisca nel backup Android (che comunque sarà sostituito dalla sync Drive esplicita).
5. **Servizio nativo (NotificationListenerService)**: **non** far scrivere il servizio nativo direttamente nello stesso file cifrato con una seconda libreria SQLCipher. L'API nativa di `expo-sqlite` è `internal` e non riutilizzabile da un altro modulo; una seconda copia di SQLite/SQLCipher nello stesso processo che apre lo stesso file è un caso noto di corruzione (lock POSIX). Due strade sicure, in ordine di preferenza:
   - **A (consigliata per l'MVP)**: il servizio nativo mette la notifica grezza in una piccola coda cifrata propria (file o DB in `noBackupFilesDir`, cifrato AES-GCM con chiave dell'Android Keystore) ed emette un evento; il lato JS la drena nell'archivio SQLCipher. La coda resta breve (solo notifiche non ancora drenate).
   - **B**: il modulo locale *possiede* l'archivio (es. `net.zetetic:sqlcipher-android` o Room + SQLCipher), e JS lo legge solo tramite funzioni del modulo; in questo caso l'archivio **non** passa da `expo-sqlite`/Drizzle. Più lavoro nativo, un solo writer.
6. **Cifratura per campo** (expo-crypto AES-GCM sulle colonne sensibili) è un ripiego valido se si vuole evitare SQLCipher, ma lascia in chiaro schema, indici, metadati e timestamp, e rende impossibili ricerche/filtri SQL sui campi cifrati.

---

## 1. SQLCipher in `expo-sqlite` (SDK 58)

### Configurazione
- Il config plugin di `expo-sqlite` accetta `useSQLCipher` (default `false`), globale o per piattaforma (`android.useSQLCipher`). È una proprietà di build: richiede prebuild/nuovo binario. — [Expo SDK 58, SQLite › Configurable properties](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md#configurable-properties)
- Sorgente: il plugin scrive la proprietà Gradle `expo.sqlite.useSQLCipher`; `android/build.gradle` allora compila `vendor/sqlcipher/sqlite3.c` al posto di `vendor/sqlite3/sqlite3.c` con `-DSQLITE_HAS_CODEC=1 ... -DSQLCIPHER_CRYPTO_OPENSSL` e linka `openssl::crypto` (prefab `io.github.ronickg:openssl:3.3.2-1`). — `packages/expo-sqlite/plugin/src/withSQLite.ts`, `packages/expo-sqlite/android/build.gradle` righe 17–34 e 99–100, `android/CMakeLists.txt` righe 47–60 (expo/expo @ `sdk-58`)
- **La scelta vale per tutto il binario**: con `useSQLCipher: true` *ogni* DB aperto con `expo-sqlite` usa la libreria SQLCipher. Un DB su cui non si esegue `PRAGMA key` resta un normale file SQLite in chiaro (il codec viene agganciato solo quando si imposta una chiave). Quindi `spese.db` può restare in chiaro e leggibile/esportabile, `archivio.db` cifrato. — sorgente SQLCipher vendorizzato (`vendor/sqlcipher/sqlite3.c`, codec attivato da `sqlite3_key`/`PRAGMA key`); comportamento documentato anche da Zetetic (vedi nota fonti)
- Non funziona in Expo Go (serve comunque una development build per il NotificationListenerService). — [Expo SQLite › SQLCipher](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md#sqlcipher)
- Versioni: CHANGELOG `expo-sqlite`: "Updated SQLite to 3.53.3 and SQLCipher to 4.17.0 on all platforms" (#48544); "Fixed Android 16kb page size issue when enabling `useSQLCipher`" (#40781). — `packages/expo-sqlite/CHANGELOG.md`

### Uso
- Subito dopo l'apertura: `await db.execAsync("PRAGMA key = '...'")`. — [Expo SQLite › SQLCipher](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md#sqlcipher)
- **Trappola silenziosa**: se il binario non include SQLCipher, `PRAGMA key` *non ha effetto e non lancia errori* e il DB viene salvato in chiaro. Va controllato `PRAGMA cipher_version` (restituisce una riga solo con SQLCipher) e fallire in modo esplicito. — stessa pagina
- Chiave raw: se il valore è `x'<hex>'` con esattamente 64 caratteri hex (chiave a 256 bit), viene usato direttamente; altrimenti la chiave è derivata con PBKDF2 (`PBKDF2_ITER 256000`, HMAC SHA512). — `vendor/sqlcipher/sqlite3.c` righe ~110888 e 112583–112600 (`sqlcipher_cipher_ctx_key_derive`)
- Disponibili anche `PRAGMA rekey` e `sqlcipher_export()` (migrazione da DB in chiaro a cifrato tramite `ATTACH`). — `vendor/sqlcipher/sqlite3.c` (`sqlcipher_export_init`)

### Drizzle
- Il progetto già usa `drizzle(sqlite, { schema })` sull'istanza `SQLiteDatabase` di `expo-sqlite` (`src/db/client.ts`, `src/hooks/useAppDb.ts`). La cifratura SQLCipher è sotto il pager, quindi Drizzle (query builder + migrazioni) non vede differenze: basta eseguire `PRAGMA key` sull'istanza **prima** di passarla a `drizzle()` e prima delle migrazioni. — Drizzle/expo-sqlite integration: [Expo SQLite › Drizzle ORM](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md#drizzle-orm)
- Separazione: il secondo DB va aperto con `openDatabaseAsync('archivio.db')` (o un secondo `SQLiteProvider`), con il suo schema Drizzle e la sua cartella di migrazioni `drizzle-kit`. Non usare `ATTACH` tra i due: si vuole che siano file e connessioni indipendenti.
- Percorso del file su Android: `context.filesDir/SQLite/<nome>` — `SQLiteModule.kt` riga 40 (`androidContext.filesDir.canonicalPath + File.separator + "SQLite"`). Serve per le regole di backup.

### Costo in dimensione/prestazioni
- Dimensione APK: con SQLCipher si aggiunge la `libcrypto` di OpenSSL (prefab) per ciascuna ABI; la sorgente SQLite viene sostituita, non duplicata. Non ho trovato un numero ufficiale: **da misurare** confrontando due build EAS (atteso nell'ordine di qualche MB per ABI, ridotto dagli AAB per-ABI del Play Store).
- Runtime: cifratura AES a livello di pagina (overhead tipicamente modesto per un archivio di qualche migliaio di righe); il costo dominante è PBKDF2 all'apertura, che si **elimina con la chiave raw** `x'…'`. Il numero preciso di overhead pubblicato da Zetetic non è stato verificabile in questa sessione (vedi nota fonti).

## 2. Gestione della chiave

- **Generazione**: 32 byte casuali crittograficamente sicuri, es. `Crypto.getRandomBytesAsync(32)` di `expo-crypto` (oppure `AESEncryptionKey.generate(256)` + `encoded('hex')`), codificati in hex. — [Expo SDK 58, Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto.md)
- **Conservazione**: `expo-secure-store`. Su Android i valori sono in `SharedPreferences`, cifrati con una chiave dell'**Android Keystore**. — [Expo SDK 58, SecureStore › Platform value storage](https://docs.expo.dev/versions/v58.0.0/sdk/securestore.md)
- **Disinstallazione / reinstallazione**: "On Android: Data saved using `expo-secure-store` **will not be preserved upon app uninstallation**." — stessa pagina
- **Backup / cambio telefono**: le voci di SecureStore vanno escluse dal backup "as it's impossible to decrypt them after restoring the backup — app's entries are deleted from the Android Key Store when the app is uninstalled". Il plugin di `expo-secure-store` (`configureAndroidBackup`, default `true`) imposta da solo le regole di esclusione, **ma solo se non esistono altre regole di backup**; altrimenti emette un warning e bisogna escludere a mano `sharedpref/SecureStore` e mettere `configureAndroidBackup: false`. — [SecureStore › Android Auto Backup](https://docs.expo.dev/versions/v58.0.0/sdk/securestore.md#android-auto-backup); `packages/expo-secure-store/plugin/src/withSecureStore.ts` righe 42–64
- **`requireAuthentication`**: sconsigliato per la chiave dell'archivio. La chiave viene invalidata quando cambiano le biometrie (nuova impronta), il `getItem` blocca il thread JS in attesa dell'utente, e soprattutto il servizio in background non può mostrare un prompt biometrico. — [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore.md#getitemasynckey-options)
- **Conseguenza progettuale**: chiave persa ⇒ archivio illeggibile. Scenari: reinstallazione, cambio telefono, "Cancella dati". È accettabile *se* l'archivio è un registro locale delle catture e tutto ciò che conta (Spese confermate) sta nel DB sincronizzato. Logica all'avvio: chiave assente + file presente ⇒ `deleteDatabaseAsync('archivio.db')` e ricrea; chiave presente ma `PRAGMA key` fallisce (`SQLITE_NOTADB` alla prima query) ⇒ stesso trattamento, con log.
- Se in futuro si volesse un archivio *recuperabile*, la chiave dovrebbe essere derivata da un segreto dell'utente (passphrase → PBKDF2, che SQLCipher fa da sé) o sincronizzata cifrata nel cloud: fuori scopo per l'MVP.

## 3. Scrittura dal servizio nativo (NotificationListenerService)

- `expo-sqlite` espone le API native tramite `NativeDatabaseBinding`, dichiarata `internal class` in Kotlin (visibile solo nel modulo Gradle di expo-sqlite): un modulo Expo locale **non** può riusarla. — `packages/expo-sqlite/android/src/main/java/expo/modules/sqlite/NativeDatabaseBinding.kt` riga 13
- Un modulo locale dovrebbe quindi portarsi una propria SQLCipher (es. `net.zetetic:sqlcipher-android:4.20.0@aar` + `androidx.sqlite`, API 23+, `System.loadLibrary("sqlcipher")`). — [sqlcipher/sqlcipher-android README](https://github.com/sqlcipher/sqlcipher-android)
- Avere **due copie di SQLite nello stesso processo che aprono lo stesso file** è una causa documentata di corruzione: i lock POSIX di una copia vengono annullati dalla `close()` dell'altra. — SQLite, "How To Corrupt An SQLite Database File", § "Multiple copies of SQLite linked into the same application" (https://www.sqlite.org/howtocorrupt.html; non scaricabile in questa sessione, vedi nota fonti). Il servizio e l'app JS girano di default nello stesso processo, quindi il rischio è reale.
- Inoltre il servizio può partire senza che il runtime JS sia attivo, e deve poter leggere la chiave: con SecureStore la chiave sta in SharedPreferences cifrate dal formato interno di expo-secure-store, che un modulo nativo non dovrebbe leggere direttamente (dettaglio d'implementazione). Meglio che il modulo abbia **una propria chiave nel Keystore** per la coda.
- **Opzioni**:
  - **A – coda nativa + drenaggio JS (consigliata)**: il servizio filtra le Fonti note, cifra il payload con AES-GCM (chiave Keystore non esportabile, generata dal modulo) e lo appende in un file/DB in `noBackupFilesDir` (escluso sempre dal backup). Quando l'app è attiva (o via evento del modulo), JS legge, decifra tramite il modulo, scrive in `archivio.db` (SQLCipher + Drizzle) e svuota la coda. Un solo writer per `archivio.db`, nessuna doppia libreria sullo stesso file.
  - **B – archivio posseduto dal nativo**: il modulo apre `archivio.db` con sqlcipher-android (o Room + SupportOpenHelperFactory di SQLCipher) e JS interroga tramite funzioni del modulo. Un solo writer, ma niente Drizzle sull'archivio e più codice Kotlin.
  - **Da evitare**: stesso file aperto sia da `expo-sqlite` (JS) sia da sqlcipher-android (nativo).

## 4. Esclusione dal backup automatico Android

- Auto Backup include per default i file in `getFilesDir()` (dove `expo-sqlite` mette `SQLite/`) e `getDatabasePath()`; esclude sempre `getCacheDir()`, `getCodeCacheDir()`, `getNoBackupFilesDir()`. Limite 25 MB. — [Android, Back up user data with Auto Backup](https://developer.android.com/identity/data/autobackup)
- Regole: `android:fullBackupContent` (Android ≤ 11) e `android:dataExtractionRules` (Android 12+ con targetSdk ≥ 31; sezioni `<cloud-backup>` e `<device-transfer>`, più `<cross-platform-transfer>` da Android 16 QPR2). `<exclude domain="file" path="SQLite/archivio.db"/>`; il path non accetta wildcard, una directory vale ricorsivamente. Se una sezione manca, quella modalità è abilitata per tutto. — stessa pagina
- `app.json` → `android.allowBackup` (default `true`): "If this is set to false, no backup or restore of the application will ever be performed (this is useful if your app deals with sensitive information)." — [Expo SDK 58, app config › android.allowBackup](https://docs.expo.dev/versions/v58.0.0/config/app.md)
  - Nota Android: per app con target ≥ 31, su alcuni produttori `allowBackup="false"` disabilita il backup cloud ma **non** il trasferimento device-to-device. — pagina Auto Backup, nota in "Enable and disable backup". Anche per questo conviene che l'archivio sia cifrato con chiave Keystore: copiato su un altro telefono resta illeggibile.
- Non esiste in Expo una proprietà di app config per regole di backup personalizzate: serve un **config plugin locale** (es. `plugins/withArchiveBackupRules.ts`) che, con `withAndroidManifest` + `withDangerousMod`, scriva `res/xml/` e imposti i due attributi. Deve includere anche l'esclusione `sharedpref/SecureStore` e il plugin di secure-store va configurato con `configureAndroidBackup: false`, altrimenti i due plugin si contendono gli stessi attributi. — `withSecureStore.ts` righe 42–64
- Bozza delle regole:

```xml
<!-- res/xml/data_extraction_rules.xml (Android 12+) -->
<data-extraction-rules>
  <cloud-backup disableIfNoEncryptionCapabilities="true">
    <exclude domain="file" path="SQLite/archivio.db"/>
    <exclude domain="file" path="SQLite/archivio.db-wal"/>
    <exclude domain="file" path="SQLite/archivio.db-shm"/>
    <exclude domain="file" path="SQLite/archivio.db-journal"/>
    <exclude domain="sharedpref" path="SecureStore"/>
  </cloud-backup>
  <device-transfer>
    <!-- stesse exclude -->
  </device-transfer>
</data-extraction-rules>
<!-- res/xml/full_backup_content.xml (Android <= 11): stesse <exclude> dentro <full-backup-content> -->
```

  (Con solo `<exclude>` e nessun `<include>`, tutto il resto resta incluso secondo i default.)

## 5. Alternative e trade-off

| Opzione | Cosa cifra | Pro | Contro |
| --- | --- | --- | --- |
| **SQLCipher su `archivio.db` (consigliata)** | intero file (pagine, schema, indici, WAL) | trasparente per Drizzle; query/filtri SQL normali; supportato ufficialmente da expo-sqlite | binario più grande (OpenSSL); vale per tutti i DB del binario (ma i DB senza chiave restano in chiaro); trappola "PRAGMA key ignorato" da controllare |
| Cifratura per campo con `expo-crypto` (AES-GCM) in un DB normale | solo le colonne scelte (testo notifica, esercente, importo) | nessuna dipendenza nativa nuova; funziona anche in Expo Go | schema, timestamp, Fonte, conteggi in chiaro; niente ricerche/ordinamenti SQL sui campi cifrati; gestione IV/tag per riga; facile dimenticare una colonna |
| Archivio posseduto dal modulo nativo (sqlcipher-android/Room) | intero file | un solo writer anche col servizio in background | niente expo-sqlite/Drizzle per l'archivio; più Kotlin |
| Nessuna cifratura, solo `noBackupFilesDir`/`allowBackup:false` | niente | semplicissimo | dati bancari in chiaro su disco (root, backup ADB, D2D di alcuni OEM) — non soddisfa la issue |

## Fonti

Primarie consultate in questa sessione:
- Expo SDK 58 — SQLite: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite.md (sezioni Configuration, SQLCipher, Drizzle ORM, API)
- Expo SDK 58 — SecureStore: https://docs.expo.dev/versions/v58.0.0/sdk/securestore.md
- Expo SDK 58 — Crypto: https://docs.expo.dev/versions/v58.0.0/sdk/crypto.md
- Expo SDK 58 — app config (`android.allowBackup`): https://docs.expo.dev/versions/v58.0.0/config/app.md
- Sorgente expo/expo @ `sdk-58`: `packages/expo-sqlite/{plugin/src/withSQLite.ts, android/build.gradle, android/CMakeLists.txt, android/src/main/java/expo/modules/sqlite/SQLiteModule.kt, NativeDatabaseBinding.kt, vendor/sqlcipher/sqlite3.c, CHANGELOG.md}`, `packages/expo-secure-store/plugin/src/withSecureStore.ts`
- Android — Auto Backup: https://developer.android.com/identity/data/autobackup
- SQLCipher for Android README: https://github.com/sqlcipher/sqlcipher-android

Non raggiungibili da questa sessione (host bloccati dal proxy; citate ma **non riverificate**):
- SQLite, How To Corrupt: https://www.sqlite.org/howtocorrupt.html (§ 2.2 copie multiple di SQLite)
- Zetetic, SQLCipher design / API / performance: https://www.zetetic.net/sqlcipher/design/ , https://www.zetetic.net/sqlcipher/sqlcipher-api/

## Domande aperte
- Misurare l'aumento di dimensione dell'AAB/APK con `useSQLCipher: true` su una build EAS di preview.
- Decidere se l'archivio deve sopravvivere al cambio telefono (oggi: no). Se sì, serve una chiave derivata da passphrase o un export cifrato esplicito.
- Il NotificationListenerService gira nel processo principale o in un processo separato (`android:process`)? Con un processo separato il rischio di accesso concorrente cresce: un motivo in più per l'opzione A.
