# Quotazioni automatiche da Yahoo Finance, dietro un'unica interfaccia

Le Quotazioni arrivano da una Fonte prezzi intercambiabile: prima solo manuale, poi Yahoo Finance. Yahoo è stato scelto (decisione dell'utente) perché non richiede chiave e copre Milano, Xetra e la ricerca per ISIN, anche se gli endpoint non sono ufficiali: possono cambiare senza preavviso e i termini consentono solo uso personale. Per questo la Fonte manuale resta sempre disponibile come ripiego, e il resto dell'app non sa da quale Fonte arriva una Quotazione.

## Considered Options

- **EODHD**: copertura europea e ISIN confermate, API ufficiale; piano gratuito 20 chiamate/giorno, "All World" 19,99 $/mese. Prima alternativa se Yahoo smette di funzionare.
- **Twelve Data**: copertura globale, ma il piano gratuito è solo USA; Europa dal piano Grow (29 $/mese).
- Alpha Vantage, FMP, Finnhub: piani gratuiti troppo limitati o solo USA.

## Consequences

- Nessun backend: le chiamate partono dal telefono. Le chiavi di Fonti future (es. CoinGecko) sono inserite dall'utente e salvate in `expo-secure-store`, mai nel database né nell'app.
- Il Simbolo di ogni Strumento è scelto dall'utente tra le borse trovate per ISIN e resta modificabile.
- Prima di costruire la Fonte prezzi Yahoo, un prototipo (`prototype/yahoo-quotes`) verifica su dispositivo ricerca per ISIN, prezzo e storico.
