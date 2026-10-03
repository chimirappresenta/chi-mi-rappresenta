# Piano: da Campania a tutta Italia

Obiettivo della **fase 1 ("base nazionale")**: ogni comune d'Italia (7.899) ha la sua pagina con Comune, Regione (essenziale),
Parlamento, Europa, contatti, uffici, ASL, "A chi mi rivolgo?", "Chiedi un documento", "Come si è votato" e feed.
La Campania resta l'esempio completo, con il Consiglio regionale "in chiaro" (atti, leggi, emiciclo).

## Cosa è già nazionale (basta togliere il filtro sulla regione)

| Dato | Fonte | Note |
|---|---|---|
| Comuni, frazioni, CAP | ISTAT, Wikidata | |
| Sindaci, giunte, consigli comunali | Ministero dell'Interno (`ammcom`, tutta Italia) | |
| Presidenti, giunte e consiglieri regionali | Ministero dell'Interno (`ammreg`, tutta Italia, 869 persone) | manca la circoscrizione: si mostra l'intero consiglio regionale, non "i consiglieri della tua provincia" |
| Contatti e uffici dei Comuni, PEC di Regioni e ASL | IPA | |
| Collegi di Camera e Senato | ISTAT (già nazionale) | |
| Deputati per collegio | Camera (SPARQL) | |
| Risultati elettorali | Eligendo | i file sono già nazionali |
| Comune → ASL | Ministero della Salute, "Corrispondenze ASL-Comuni" (CSV, IODL 2.0) | sostituisce l'abbinamento manuale della provincia di Napoli |

## Cosa va costruito

1. **Senatori eletti nei collegi uninominali (74).** Il Senato non pubblica il collegio: lo ricaviamo dai risultati 2022
   per collegio (vincitore) e lo confrontiamo con i senatori in carica (SPARQL) per intercettare le elezioni suppletive.
   Le email dei senatori non sono leggibili dagli script: fuori dalla Campania si mostra il link alla scheda ufficiale.
2. **Eurodeputati per circoscrizione (76, 5 circoscrizioni).** L'API del Parlamento europeo non dice la circoscrizione:
   elenco curato una volta (come oggi per il Sud), con il controllo automatico che siano ancora in carica.
3. **Guida "A chi mi rivolgo?" per regione.** Alcune voci oggi citano enti campani (EAV, ARPA Campania): diventano
   generiche ("l'azienda di trasporto regionale", "l'ARPA della tua regione") con il link giusto per ogni regione
   (tabella di 20 righe).
4. **Pagine regionali leggere.** `/regione/<nome>/` con presidente, giunta e consiglieri dal Ministero dell'Interno.
   La pagina ricca (emiciclo, atti, leggi) resta solo dove esiste un "adattatore" del Consiglio regionale (oggi: Campania).
5. **Indirizzi.** `/comune/<istat>/` resta uguale (i link già condivisi continuano a funzionare). Le pagine regionali
   attuali della Campania passano sotto `/regione/campania/…`, con reindirizzamenti dai vecchi indirizzi.

## Il cambiamento tecnico necessario

Oggi tutte le pagine sono generate al momento della pubblicazione. Con 7.899 comuni sarebbero circa 24.000 file
(pagina, immagine di anteprima, feed) e una build di oltre mezz'ora, vicina al limite del piano gratuito di Vercel.
Inoltre il file unico dei dati passerebbe da 3 a circa 50 MB.

- **Dati divisi:** un file per comune (`src/data/comuni/<istat>.json`) più un indice leggero, invece di un file unico.
- **Pagine generate alla prima visita e poi conservate** (`generateStaticParams` solo per i capoluoghi, le altre
  generate su richiesta e messe in cache). Il visitatore non nota differenze; la build resta di pochi minuti.
- **Ricerca:** l'indice dei comuni passa da 550 a 7.899 voci (circa 1 MB): si carica a pezzi per regione o con
  una ricerca per prefisso.
- **Aggiornamento del lunedì:** invariato, scarica gli stessi file nazionali.

## Ordine di lavoro proposto

1. ✅ Dati divisi per comune e pagine su richiesta (ancora solo Campania), funzioni a Francoforte: fatto il 2026-10-03, contenuto delle pagine identico.
2. Pipeline nazionale: comuni, amministratori, contatti, ASL, collegi, deputati, risultati elettorali.
3. Senatori e eurodeputati per tutta Italia.
4. Guida e pagine regionali generalizzate.
5. Controllo a campione (un capoluogo e un piccolo comune per regione) e pubblicazione.

## Fase 2 (dopo): Consigli regionali "in chiaro"

Un adattatore per ogni Consiglio regionale (atti, leggi, gruppi, circoscrizioni), cominciando da quelli con dati
aperti più accessibili. Da verificare regione per regione. Il modello è `scripts/build-data.mjs` sezione 5b
(Campania); con la licenza MIT chiunque può contribuire l'adattatore della propria regione.
