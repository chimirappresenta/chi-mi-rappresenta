# Chi mi rappresenta

Scrivi il tuo comune e scopri chi ti rappresenta a ogni livello: **Comune, Regione, Parlamento, Europa**. Ogni dato ha una fonte ufficiale.

Il pilota copre la **Campania** (550 comuni). Si ispira a *Find your representative* (USA) e *WriteToThem* (UK), ed è complementare a [DoveVannoINostriSoldi](https://www.dovevannoinostrisoldi.com): loro coprono politica nazionale e spesa, noi il percorso *territorio → persone*.

## Come funziona

Tutte le pagine sono generate al build (Next.js, niente database): i dati vengono preparati prima, con uno script. L'unica parte dinamica è `/api/segnala`, la funzione che crea le segnalazioni degli utenti su GitHub.

```
npm run data          # scarica le fonti (con cache in data/raw/) e genera src/data/*.json
npm run data:refresh  # come sopra, ma riscarica tutto ignorando la cache
npm run riassunti     # riassume con Claude le leggi nuove (serve ANTHROPIC_API_KEY), poi rilanciare `npm run data`
npm run build         # genera il sito (pagine prerenderizzate + funzione /api/segnala)
npm run dev           # sviluppo locale
```

| Livello | Fonte | Note |
|---|---|---|
| Comuni | ISTAT, elenco comuni | codici e province |
| Sindaco, giunta, consiglio, commissari | Ministero dell'Interno – Anagrafe amministratori (`ammcom.csv`, `organistraordinariincarica.csv`) | i commissariamenti già conclusi vengono scartati se c'è un sindaco eletto dopo |
| Comune → collegi Camera/Senato | ISTAT, basi geografiche dei collegi 2020 (`UT_Collegi2020.dbf`) | per Napoli anche i quartieri di ogni collegio |
| Deputati | dati.camera.it (SPARQL) | solo i mandati in corso |
| Senatori | dati.senato.it (SPARQL) + `data/manual/senato-uninominali.json` | gli open data non riportano il collegio uninominale |
| Consiglio regionale | cr.campania.it (schede consiglieri) + `data/manual/consiglieri-regionali-circoscrizione.json` | circoscrizione dai risultati delle regionali 2025 |
| Giunta regionale | regione.campania.it | |
| Eurodeputati | API del Parlamento europeo + `data/manual/eurodeputati-sud.json` | email istituzionale dalla scheda di ogni eurodeputato; la pipeline segnala chi non è più in carica |
| Contatti dei Comuni | Indice delle PA (IPA, AgID) | solo PEC e sito: gli altri indirizzi a volte sono di singoli dipendenti |
| Uffici dei Comuni ("A chi mi rivolgo?") | IPA, unità organizzative (`ou.txt`) | ufficio scelto per parole chiave in `CATEGORIE_UFFICI`; si pubblicano solo telefono, email d'ufficio e PEC (niente nomi dei responsabili né email personali o per le fatture) |
| ASL di ogni comune | IPA (enti L7) + `data/manual/asl-napoli.json` | una ASL per provincia; in provincia di Napoli abbinamento verificato sui distretti delle tre ASL |
| Risultati elettorali | open data del Ministero dell'Interno (Eligendo/DAIT), via `scripts/elezioni.mjs` | ultime comunali del comune (la tornata in cui è stata eletta l'amministrazione in carica), regionali 2025, politiche 2022 (Camera, voti alle liste), europee 2024; in `data/raw/` si tengono solo le righe della regione. Alcune tornate sono in Excel: le legge `scripts/xlsx.mjs`, senza dipendenze |
| PEC di Regione e Consiglio regionale | IPA (`r_campan`, `cr_campa`) | per "Chiedi un documento" |
| Frazioni e località | ISTAT, località abitate del Censimento 2021 | centri e nuclei abitati con almeno 100 abitanti, per cercare il comune dalla frazione |
| CAP | Wikidata (CC0), più il CAP della sede dall'IPA | |
| Email dei senatori | schede ufficiali su senato.it → `data/manual/senatori-email.json` | il sito del Senato non è leggibile dagli script |
| Modulo per i deputati | `scrivi.camera.it` | la Camera non pubblica le email |

I file in `data/manual/` sono curati a mano: la pipeline li confronta con le fonti ufficiali e stampa un avviso se qualcosa non torna. Gli avvisi sono visibili anche nella pagina `/fonti`.

## Condivisione e contatti

- **Scrivi al tuo consigliere**: nella scheda di ogni consigliere (pannello dell'emiciclo e pagina completa) c'è un modulo che prepara un'email con oggetto e traccia del messaggio e la apre nel programma di posta dell'utente. Il sito non invia e non salva nulla.
- **Immagini di anteprima**: ogni comune e ogni consigliere ha un'immagine generata al build (`opengraph-image.tsx`, 1200×630) con i dati principali e l'emiciclo. Usano i font Instrument Serif e Geist in `assets/fonts/` (licenza OFL). In produzione va impostata la variabile `SITE_URL` (es. `https://chi-mi-rappresenta.it`); su Vercel si usa il dominio di produzione. 

## Pensato per tutti, anche per chi ha più di 60 anni

- **Strade chiare**: in home e in ogni pagina comune c'è "Cosa vuoi fare?" con pochi pulsanti grandi (chi mi rappresenta, ho un problema, contatta il Comune, scrivi a un eletto).
- **"A chi mi rivolgo?"** (`/a-chi-rivolgersi/` e in ogni pagina comune): per i problemi più comuni dice chi decide, il primo passo e a chi scrivere. Contenuti in `src/lib/guida.ts`.
- **Scrivi a…** per sindaco (alla PEC del Comune), consiglieri regionali, deputati (modulo ufficiale della Camera), senatori ed eurodeputati. Il sito prepara la bozza, non invia nulla.
- **Testo più grande** (17px di base); per ingrandire ancora si usa lo zoom del browser, che il layout regge.
- Contrasto ≥ 5:1, pulsanti di almeno 44px, contorno visibile per chi usa la tastiera, link "Vai al contenuto", menu a tutto schermo sul telefono, ruoli declinati al femminile quando la fonte lo indica.
- **Ricerca** per comune, frazione, quartiere (Napoli) o CAP.
- **Data di aggiornamento** in fondo a ogni sezione, con il pulsante **Segnala un errore**.

- **Chiedi un documento** (`/chiedi-un-documento/` e in ogni pagina comune): prepara una richiesta di accesso civico generalizzato (art. 5, comma 2, d.lgs. 33/2013) al Comune, all'ASL, alla Regione o al Consiglio regionale, con esempi pronti e la spiegazione di cosa succede dopo. Il sito non invia e non salva nulla.
- **Come si è votato** (in ogni pagina comune): risultati e affluenza delle ultime elezioni, confrontati con la media della Campania.
- **Segui le novità**: feed RSS statici per ogni comune (`/comune/<istat>/feed.xml`: atti e leggi regionali che citano il comune, più tutte le nuove leggi regionali) e per il Consiglio regionale (`/regione/feed.xml`), con pulsanti per Feedly e Inoreader. Niente email né account.

## Segnalazioni degli utenti

Come su DoveVannoINostriSoldi, ogni segnalazione diventa una **issue pubblica su GitHub**, creata dalla funzione `/api/segnala` a nome del progetto: l'utente non ha bisogno di un account. Su Vercel impostare:

- `GITHUB_TOKEN_SEGNALAZIONI`: token "fine-grained" con permesso *Issues: read and write* sul solo repository delle segnalazioni
- `GITHUB_REPO_SEGNALAZIONI`: `proprietario/repository`
- `NEXT_PUBLIC_REPO_SEGNALAZIONI` (facoltativo): stesso valore, per il link di riserva

Senza queste variabili il modulo funziona lo stesso: mostra la segnalazione già scritta da copiare. Protezioni: campo trappola per i bot, limite di invii per indirizzo, testo limitato a 2000 caratteri, nessun dato personale allegato.

## Estendere ad altre regioni

1. In `scripts/build-data.mjs`, rendere `REGIONE` configurabile.
2. Aggiungere per la regione le fonti del consiglio e della giunta regionale (ogni regione ha il suo sito).
3. Aggiungere i file manuali per circoscrizioni regionali, senatori uninominali ed eurodeputati.

## Consiglio regionale in chiaro (fase 2)

- `/regione/`: il Consiglio come emiciclo (un punto per consigliere, colorato per gruppo; maggioranza a sinistra, opposizione a destra). Si cerca per nome o gruppo, la legenda filtra per gruppo e un clic su un punto apre la scheda in un pannello laterale. Coalizione, colore e ordine dei gruppi stanno in `data/manual/gruppi-consiliari.json`: la pipeline avvisa se compare un gruppo nuovo.
- `/regione/attivita/`: tutti gli atti della legislatura (proposte di legge, interrogazioni, question time, mozioni, risoluzioni), con filtri, ricerca ed esito. Sotto, la tabella degli atti per consigliere.
- `/regione/consiglieri/<slug>/`: scheda di ogni consigliere, con contatti, commissioni e tutti i suoi atti.
- `/regione/leggi/`: le leggi approvate, con PDF ufficiale, relazione illustrativa e, se disponibile, un riassunto in parole semplici.
- In ogni pagina comune: lo stesso emiciclo con evidenziati gli eletti nella provincia, più gli atti e le leggi che citano il comune nel titolo. Le pagine comune caricano i dati dell'emiciclo da `/dati/emiciclo.json`, generato una sola volta al build, così non li ripetono 550 volte.

Gli atti vengono letti dalle viste del sito del Consiglio, che rispondono HTTP 404 ma con la pagina corretta: la pipeline lo accetta solo per queste pagine. I firmatari sono abbinati ai consiglieri confrontando le parole del nome.

I riassunti delle leggi (`scripts/riassumi-leggi.mjs`) usano Claude (`claude-opus-5-5`): ricevono il PDF ufficiale e restituiscono 2-4 frasi in italiano semplice. Ogni legge viene riassunta una sola volta e il risultato finisce in `data/manual/riassunti-leggi.json`, che si può correggere a mano. Le chiamate hanno attivo il fallback lato server (`fallbacks: "default"`): se la richiesta viene rifiutata per un falso positivo dei filtri di sicurezza, il server riprova su un altro modello.

## Licenza

Il codice è rilasciato con licenza MIT (vedi `LICENSE`). I dati restano soggetti alle licenze delle rispettive fonti ufficiali, indicate nella pagina "Fonti e metodo" del sito; i font in `assets/fonts/` hanno licenza OFL.
