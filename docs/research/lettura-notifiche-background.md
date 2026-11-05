# Leggere le Notifiche bancarie in background (Expo SDK 58, Android)

> Ricerca per l'issue #5. Data: 2026-11-05. Contesto: `expo` ^58.0.21, `react-native` 0.88.0 (minSdk 24 / targetSdk 36, da `react-native/gradle/libs.versions.toml`), `expo-sqlite` + Drizzle, solo Android, development build, CNG (niente `android/` a mano).
> Terminologia come in `CONTEXT.md`: **Notifica bancaria**, **Fonte**, **Movimento rilevato**.

## TL;DR / Raccomandazione

1. **Un modulo Expo locale** (`npx create-expo-module@latest --local` → `modules/notifiche-bancarie/`), scritto in Kotlin, con dentro una classe `NotificationListenerService`. Il `<service>` va dichiarato nell'`AndroidManifest.xml` **del modulo**: Gradle lo fonde nel manifest dell'app, quindi con CNG non serve un config plugin. Un config plugin serve solo se si vogliono opzioni configurabili da `app.json`.
2. **Il servizio nativo salva subito su SQLite, lato nativo**, in una tabella "inbox" grezza (consigliato: un file DB separato, es. `notifiche_inbox.db`). Accetta solo i pacchetti delle Fonti ammesse, scarta i doppioni con un indice `UNIQUE` e non avvia mai JS.
3. **Il lato JS svuota la coda** all'avvio e ogni volta che l'app torna in primo piano. Il parsing (importo, esercente) è in TypeScript ed è testabile. Ne escono i **Movimenti rilevati** dentro `fogliospese.db` (Drizzle), poi le righe dell'inbox vengono marcate come elaborate. Quando l'app è aperta, un evento del modulo (`sendEvent`) può far partire subito lo svuotamento.
4. **Niente Headless JS e niente librerie npm esistenti**: quelle compatibili con Expo sono progetti di una sola persona, nati da poco, e/o perdono notifiche quando l'app è chiusa (dettagli sotto).
5. **Distribuzione**: un APK personale (EAS Build, profilo development/preview) installato fuori dallo store. Su Android 13 e successivi bisogna prima sbloccare "Consenti impostazioni con limitazioni" dalle info dell'app, poi concedere l'"Accesso alle notifiche". Non serve pubblicare sul Play Store.

## 1. NotificationListenerService: libreria o modulo locale?

### Cosa chiede la piattaforma

- Il servizio va dichiarato con il permesso `BIND_NOTIFICATION_LISTENER_SERVICE` e un intent-filter con azione `android.service.notification.NotificationListenerService` ([NotificationListenerService](https://developer.android.com/reference/android/service/notification/NotificationListenerService)). L'esempio ufficiale:
  ```xml
  <service android:name=".NotificationListener"
           android:label="@string/service_name"
           android:exported="false"
           android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
      <intent-filter>
          <action android:name="android.service.notification.NotificationListenerService" />
      </intent-filter>
  </service>
  ```
  Facoltativi: i meta-data `default_filter_types` / `disabled_filter_types` (`ongoing|conversations|alerting|silent`), per non ricevere ad esempio le notifiche `ongoing`. La pagina si contraddice sul separatore (pipe o virgola): va verificato.
- Callback: `onListenerConnected()` (API 21), `onListenerDisconnected()` (API 24), `onNotificationPosted(sbn)`, `onNotificationRemoved(sbn, rankingMap, reason)` (API 26). *"From Android N onward all callbacks are called on the main thread"*: le scritture su disco vanno quindi spostate su un thread di I/O (stessa fonte).
- *"Notification listeners cannot get notification access or be bound by the system on low-RAM devices running Android Q (and below). The system also ignores notification listeners running in a work profile."* (stessa fonte)
- A legare il servizio è il **sistema**, non l'app. Per questo il listener riceve le notifiche anche a UI chiusa, senza foreground service e senza notifica persistente. La documentazione non lo scrive in modo esplicito: lo si ricava dal modello (servizio vincolato da `system_server` dopo l'autorizzazione dell'utente). Va confermato con un test sul dispositivo (§6).

### Il manifest di un modulo locale viene unito automaticamente

*"When building your app, the Gradle build merges all manifest files into a single manifest file … Manifest file from an included library"* ([Manage manifest files](https://developer.android.com/build/manage-manifests)). Un modulo Expo locale è una libreria Gradle collegata da autolinking, quindi il suo `android/src/main/AndroidManifest.xml` finisce nell'APK anche con CNG. Tutte e quattro le librerie esaminate qui sotto dichiarano il servizio proprio così.

Modulo locale ([Expo Modules: Get started](https://docs.expo.dev/modules/get-started.md)): `npx create-expo-module@latest --local` crea `modules/<nome>/` con `android/`, `src/`, `expo-module.config.json` e `index.ts`. *"This is the recommended way to create a local Expo module."* Ogni modifica nativa richiede una nuova build (development build), perché Expo Go non basta.

I config plugin ([tutorial](https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial.md)) restano utili se si vuole, per esempio, passare da `app.json` l'elenco dei pacchetti delle Fonti tramite `withAndroidManifest` / meta-data. Per partire non servono.

Gli *inline modules* (codice Kotlin dentro `src/`) sono *"experimental"*, introdotti in SDK 56, e la documentazione non dice se supportino voci di manifest o classi `Service` ([riferimento](https://docs.expo.dev/modules/inline-modules-reference.md)). Da evitare in questo caso.

### Librerie esistenti (verificate leggendo il sorgente pubblicato su npm, 2026-11-05)

| Pacchetto | Ultima release | Come consegna i dati ad app chiusa | Note |
|---|---|---|---|
| `react-native-android-notification-listener` 5.0.1 | 2022-12-22 | **Headless JS** (`HeadlessJsTaskService`, timeout 15 s) avviato con `context.startService(...)` | Non aggiornata da quasi 4 anni. Modulo RN "classico" (peer `react ^18`), non un Expo module: va verificato se funziona con RN 0.88 / New Architecture. Richiede anche `READ_PHONE_STATE` e `BOOT_COMPLETED`. Serve un config plugin. |
| `expo-android-notification-listener-service` 1.1.0 | 2025-01-20 | **Nessuna**: `onNotificationPosted` fa `getInstance() ?: return`. Se il modulo JS non è inizializzato, la notifica **va persa** | Non adatta: perde proprio i casi ad app chiusa. |
| `expo-notification-listener` 0.1.3 | 2026-07-10 | Headless JS (timeout 5 s) | 3 versioni, autore singolo. Il pacchetto npm contiene la cartella `android/build/` (pubblicazione poco curata). |
| `@lund133369/expo-notification-listener` 0.2.1 | 2026-10-21 | **Persistenza nativa** in un file JSON (`filesDir`), scritto in modo asincrono, coda FIFO limitata a 300 elementi (le più vecchie vengono scartate) | È l'architettura giusta, ma il pacchetto ha due settimane e un solo autore, il JSON con tetto è lossy, e `requestRebind` viene chiamato via reflection su `NotificationManager`, mentre il metodo è statico su `NotificationListenerService` (API 24): di fatto non fa nulla. |

Conclusione: nessuna libreria offre insieme manutenzione, consegna garantita ad app chiusa e persistenza senza perdite. Il codice nativo necessario è poco (un service, un helper SQLite, 4–5 funzioni del modulo). Conviene il **modulo locale**, prendendo come riferimento il pattern di `@lund133369` (persistenza nel service) ma con SQLite al posto del JSON.

## 2. Come il servizio nativo passa i dati a JS

| Opzione | Pro | Contro |
|---|---|---|
| **A. Scrittura nativa in una coda SQLite, letta da JS all'avvio/al foreground** (consigliata) | Nessuna dipendenza dal runtime JS. La notifica è su disco in pochi ms. Funziona allo stesso modo ad app chiusa o aperta. Idempotente con `UNIQUE`. | Il parsing avviene solo alla successiva apertura dell'app. Va bene, perché un Movimento rilevato aspetta comunque una conferma manuale ("Da valutare"). |
| B. Headless JS (`HeadlessJsTaskService`) | Parsing e salvataggio subito, in TypeScript | Avvia React Native/Hermes in background per ogni notifica, con timeout (5–15 s nelle librerie viste). `startService` è soggetto ai limiti di esecuzione in background (Android 8+). Il supporto in bridgeless / New Architecture con RN 0.88 non è verificato (reactnative.dev non era raggiungibile da questa sessione). Bisogna aprire `expo-sqlite`/Drizzle e lanciare le migrazioni in un contesto senza UI. |
| C. Scrittura nativa direttamente in `fogliospese.db` (tabella dei Movimenti rilevati) | Un solo DB | Lega il codice Kotlin allo schema Drizzle e alle migrazioni JS (`src/db/migrate.ts`). Il servizio può partire **prima** che le migrazioni siano mai girate. Il parsing degli importi finirebbe in Kotlin. Due connessioni scrivono sullo stesso file. |

Dettagli dell'opzione A:

- **Dove**: un file separato, es. `context.getDatabasePath("notifiche_inbox.db")` aperto con `android.database.sqlite.SQLiteOpenHelper`, `enableWriteAheadLogging()`. Lo schema appartiene al nativo: `CREATE TABLE IF NOT EXISTS notifiche_grezze (id INTEGER PK, pacchetto, titolo, testo, testo_esteso, righe, post_time, chiave, ricevuta_il, elaborata INTEGER DEFAULT 0, UNIQUE(pacchetto, post_time, chiave, hash_contenuto))`.
- **Lettura da JS**: la strada più semplice è `drain(): Promise<NotificaGrezza[]>` + `ack(ids: number[])` esposte dal modulo (Expo Modules API `AsyncFunction`), così JS non deve conoscere il percorso del file. In alternativa, `expo-sqlite` ha l'opzione `directory` di `openDatabaseAsync` ([docs v58](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/)). La documentazione però non parla di accesso concorrente con codice nativo, quindi la mediazione attraverso il modulo è più sicura.
- **Processo**: il service gira nello stesso processo dell'app (nessun `android:process`), quindi lo stato statico è condiviso con il modulo. Se il modulo è vivo, il service gli notifica `onNuovaNotifica` e JS svuota subito la coda.
- **Filtro**: lasciare passare **solo** i pacchetti delle Fonti (allowlist), così si evita di salvare chat e notifiche private. Gli ID dei pacchetti di Intesa Sanpaolo, PayPal, Google Pay/Wallet e Fineco **non sono stati verificati** in questa ricerca: conviene ricavarli sul telefono con una modalità diagnostica temporanea che registra `packageName` per ogni notifica.

## 3. Campi disponibili per ogni notifica e loro affidabilità

Da `StatusBarNotification` ([ref](https://developer.android.com/reference/android/service/notification/StatusBarNotification)):

| Campo | API | Note |
|---|---|---|
| `getPackageName()` | 18 | *"The package that the notification belongs to."* È la chiave per riconoscere la Fonte. |
| `getKey()` | 20 | *"A unique instance key for this notification record."* Identifica il **record** (pacchetto + id + tag + utente): un'app che aggiorna o riusa lo stesso id ripropone la stessa chiave, quindi **non basta** per deduplicare. |
| `getPostTime()` | 18 | *"…the notification was posted, which may be different than `Notification#when`."* |
| `getId()`, `getTag()` | 18 | id e tag passati a `notify()`. |
| `isOngoing()`, `isGroup()` | 18 / 24 | Da scartare: le ongoing e i riepiloghi di gruppo (`Notification.FLAG_GROUP_SUMMARY`), che duplicano il contenuto. |

Da `Notification.extras` ([ref](https://developer.android.com/reference/android/app/Notification)), tutti `CharSequence` (vanno letti con `getCharSequence(...)?.toString()`):

- `EXTRA_TITLE`: titolo (`setContentTitle`)
- `EXTRA_TEXT`: testo principale (`setContentText`)
- `EXTRA_BIG_TEXT` (`"android.bigText"`, API 21): testo esteso di `BigTextStyle`. Spesso è l'unico campo che contiene l'importo completo.
- `EXTRA_SUB_TEXT`, `EXTRA_SUMMARY_TEXT`, `EXTRA_TITLE_BIG`
- `EXTRA_TEXT_LINES`: array di righe per `InboxStyle` (le notifiche raggruppate di alcune banche)
- `Notification.when`: *"A timestamp related to this notification"*

Affidabilità:

- Il contenuto dipende interamente dall'app della Fonte: formati diversi, possibili cambi a ogni aggiornamento, campi che possono essere null. Conviene salvare **tutti** i campi testuali grezzi e fare il parsing in TS con test per ogni Fonte, così un parser rotto si può correggere e rieseguire sulle righe già salvate.
- **Android 15, oscuramento degli OTP**: *"Android will stop untrusted apps that implement a NotificationListenerService from reading unredacted content from notifications where an OTP has been detected."* ([Android 15 behavior changes](https://developer.android.com/about/versions/15/behavior-changes-all)). Il permesso `RECEIVE_SENSITIVE_NOTIFICATIONS` che lo evita ha livello `signature|preinstalled|knownSigner|role` ([Manifest.permission](https://developer.android.com/reference/android/Manifest.permission)), quindi non è ottenibile. Le notifiche di 3DS/OTP arriveranno oscurate. Non è un problema, ma una notifica di movimento con un numero che "sembra" un codice potrebbe essere oscurata per errore: va verificato sui testi reali.
- Le notifiche cancellate in "lockdown" vengono riproposte quando l'utente esce dalla modalità (`REASON_LOCKDOWN`, API 34): un motivo in più per l'indice `UNIQUE`.
- Se l'utente ha disattivato le notifiche dell'app bancaria, o l'app nasconde l'importo, non c'è nulla da leggere.

## 4. Permesso "Accesso alle notifiche"

- **Verifica**: `NotificationManager.isNotificationListenerAccessGranted(ComponentName)`, API 27: *"Checks whether the user has approved a given NotificationListenerService. The listener service must belong to the calling app."* ([NotificationManager](https://developer.android.com/reference/android/app/NotificationManager)). Il minSdk del progetto è 24, quindi su 24–26 serve il fallback `NotificationManagerCompat.getEnabledListenerPackages(context).contains(packageName)` ([androidx](https://developer.android.com/reference/androidx/core/app/NotificationManagerCompat)).
- **Aprire le impostazioni** ([Settings](https://developer.android.com/reference/android/provider/Settings)):
  - API 30+: `ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS` (`"android.settings.NOTIFICATION_LISTENER_DETAIL_SETTINGS"`) con l'extra `EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME`, che apre direttamente l'interruttore della nostra app.
  - Fallback: `ACTION_NOTIFICATION_LISTENER_SETTINGS` (API 22). *"In some cases, a matching Activity may not exist, so ensure you safeguard against this."* Va quindi gestito `ActivityNotFoundException` (con fallback sulle info dell'app).
  - Senza codice nativo, `expo-intent-launcher` espone `ActivityAction.NOTIFICATION_LISTENER_SETTINGS` ([docs v58](https://docs.expo.dev/versions/v58.0.0/sdk/intent-launcher/)). Avendo comunque un modulo nativo, conviene una funzione `apriImpostazioniAccesso()` nel modulo che gestisca le due varianti.
- **Revoca**: il sistema chiama `onListenerDisconnected()` e da quel momento non arrivano più eventi. All'avvio e a ogni foreground l'app deve ricontrollare `isAccessGranted()` e mostrare un banner in "Da valutare" se l'accesso è stato tolto.
- **Riavvio / aggiornamento dell'app**: un listener autorizzato viene ricollegato dal sistema, senza bisogno di `BOOT_COMPLETED` (che comunque è tra i broadcast esenti dai limiti, [broadcast exceptions](https://developer.android.com/develop/background-work/background-tasks/broadcasts/broadcast-exceptions)). La documentazione non lo dice in modo esplicito: **da verificare sul dispositivo**. Se il listener risulta scollegato con l'accesso ancora concesso, si può chiamare `NotificationListenerService.requestRebind(ComponentName)` (statico, API 24: *"This method will fail for listeners that have not been granted the permission by the user."*), per esempio all'avvio dell'app.
- **Arresto forzato**: in Android 15 lo stato "stopped" viene tolto solo da un'azione dell'utente ([Android 15](https://developer.android.com/about/versions/15/behavior-changes-all#enhanced-stop-states)). Con ogni probabilità, dopo "Forza interruzione" il listener resta fermo finché l'app non viene riaperta (da verificare).
- **Ottimizzazione batteria**: il listener è vincolato dal sistema, quindi non serve esentarlo. `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` esiste, ma la documentazione dice che *"most applications should not use this"*. Il rischio vero sono gli OEM aggressivi (Xiaomi/Huawei/Samsung "app in sospensione"): conviene una schermata di aiuto che rimandi alle impostazioni dell'app (`ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`) solo se i test mostrano perdite. Fonti OEM (dontkillmyapp.com) non raggiungibili da questa sessione.

## 5. Vincoli di Play Store e sideload (uso personale)

- **Sideload e "impostazioni con limitazioni" (Android 13+)**: per le app installate fuori da uno store, Android blocca l'attivazione di Accessibilità e **Accesso alle notifiche** finché l'utente non sblocca da *Info app → ⋮ → Consenti impostazioni con limitazioni*. Android 15 estende il meccanismo ("Enhanced Confirmation Mode"). Fonti **secondarie** ([Android Authority](https://androidauthority.com/android-15-restricted-settings-sideloading-3481098), [9to5Google](https://9to5google.com/?p=640287)): la pagina di supporto Google (support.google.com) non era raggiungibile da questa sessione. Va comunque previsto nell'onboarding.
- **Verifica sviluppatore Android** ([FAQ ufficiale](https://developer.android.com/developer-verification/guides/faq)): l'applicazione parte dal 30/09/2026 solo in Brasile, Indonesia, Singapore e Thailandia, e diventa globale "in 2027". Per uso personale:
  - *"Apps installed using ADB won't require verification."* Lo stesso vale per `npx expo run:android` e `adb install`.
  - Account "limited distribution": gratuito, senza documento d'identità, *"up to 20 specific devices for testing and personal use"*.
  - Il "flusso avanzato" consente di installare app non verificate dopo una configurazione una tantum (modalità sviluppatore, riavvio, attesa di 24 h).
  - Per l'Italia oggi non cambia nulla. Dal 2027 conviene registrare il package con un account limited distribution, oppure installare via ADB.
- **Play Store**: per un uso personale non serve. Pubblicare un'app che legge notifiche finanziarie richiederebbe di rispettare le norme su dati utente e permessi sensibili (le pagine delle policy su play.google.com non erano raggiungibili da questa sessione, quindi non sono verificate). Si sconsiglia.
- **EAS Update**: il modulo nativo cambia il runtime. *"any time native code is updated, we're required to make a new build before publishing an update"* ([runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)). Con `runtimeVersion.policy: "appVersion"` bisogna **aumentare `version`** in `app.json` quando si aggiunge il modulo, altrimenti le preview OTA dei PR finirebbero su build senza il codice nativo.

## 6. Da verificare con un prototipo sul dispositivo

1. Notifica ricevuta ad app **chiusa con swipe** dai recenti → riga presente nell'inbox.
2. Dopo un **riavvio** del telefono, senza aprire l'app → riga presente.
3. Dopo **Forza interruzione** → comportamento atteso: nessuna riga finché l'app non viene riaperta.
4. Dopo l'**aggiornamento dell'APK** → il listener si ricollega da solo? Se no, provare `requestRebind`.
5. ID dei pacchetti reali delle 4 Fonti e testi di esempio (`title` / `text` / `bigText` / `textLines`) per scrivere i parser.
6. Install via EAS (APK) → compare la schermata "impostazioni con limitazioni"? E via `adb install`?

## Fonti

- https://developer.android.com/reference/android/service/notification/NotificationListenerService
- https://developer.android.com/reference/android/service/notification/StatusBarNotification
- https://developer.android.com/reference/android/app/Notification
- https://developer.android.com/reference/android/app/NotificationManager
- https://developer.android.com/reference/androidx/core/app/NotificationManagerCompat
- https://developer.android.com/reference/android/provider/Settings
- https://developer.android.com/reference/android/Manifest.permission
- https://developer.android.com/about/versions/15/behavior-changes-all
- https://developer.android.com/build/manage-manifests
- https://developer.android.com/develop/background-work/background-tasks/broadcasts/broadcast-exceptions
- https://developer.android.com/developer-verification/guides/faq
- https://docs.expo.dev/llms.txt
- https://docs.expo.dev/modules/get-started.md
- https://docs.expo.dev/modules/config-plugin-and-native-module-tutorial.md
- https://docs.expo.dev/modules/inline-modules-reference.md
- https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
- https://docs.expo.dev/versions/v58.0.0/sdk/intent-launcher/
- https://docs.expo.dev/eas-update/runtime-versions/
- Sorgenti npm (tarball del registry, 2026-11-05): `react-native-android-notification-listener@5.0.1`, `expo-android-notification-listener-service@1.1.0`, `expo-notification-listener@0.1.3`, `@lund133369/expo-notification-listener@0.2.1`, `react-native@0.88.0` (`gradle/libs.versions.toml`)
- Secondarie (impostazioni con limitazioni): androidauthority.com, 9to5google.com

Non raggiungibili da questa sessione (da consultare se serve): reactnative.dev (Headless JS), support.google.com (impostazioni con limitazioni), play.google.com (policy), dontkillmyapp.com.
