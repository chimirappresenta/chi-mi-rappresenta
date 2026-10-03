// Guida "A chi mi rivolgo?": per i problemi più comuni, chi decide, il primo passo e a quale eletto scrivere.
// Contenuto curato a mano: indicazioni generali, con link solo a siti istituzionali.

export type LivelloGuida = "comune" | "regione" | "parlamento" | "europa";

/** A quali eletti scrivere se l'ufficio non risolve o se il problema riguarda molte persone. */
export type Destinatari = "sindaco" | "consiglieri-regionali" | "parlamentari" | "eurodeputati";

export type VoceGuida = {
  id: string;
  livello: LivelloGuida;
  icona: string;
  titolo: string;
  esempi: string;
  /** Chi decide, in parole semplici. */
  chiDecide: string;
  /** Primo passo pratico. "{comune}" viene sostituito con i contatti del Comune quando li conosciamo. */
  primoPasso: string;
  link?: { label: string; url: string };
  /** Usa il sito del Comune come link del primo passo. */
  linkComune?: boolean;
  nota?: string;
  scrivi: Destinatari;
  /** Quale ufficio del Comune cercare nei dati IPA (chiave di Comune.uffici). */
  ufficio?: string;
  /** Offre "Prepara la segnalazione all'ufficio" (per problemi sul territorio: buche, rifiuti, lampioni…). */
  segnalazione?: boolean;
  /** Usa l'ASL del comune come primo contatto. */
  asl?: boolean;
  /** Servizi online ufficiali che risolvono direttamente. */
  servizi?: { label: string; descrizione: string; url: string }[];
  /** Numeri utili, verificati sulla pagina indicata in "fonte". */
  numeri?: { label: string; numero: string; nota?: string; fonte?: string }[];
};

/** Il numero unico di emergenza: lo mostriamo dove serve. */
const N112 = { label: "Emergenze (Carabinieri, Polizia, Vigili del fuoco, ambulanza)", numero: "112", nota: "gratuito, sempre attivo" };

export const LIVELLI_GUIDA: Record<LivelloGuida, { titolo: string; descrizione: string }> = {
  comune: { titolo: "Ci pensa il Comune", descrizione: "Servizi vicini a casa: strade, rifiuti, anagrafe, scuole dell'infanzia, tributi locali." },
  regione: { titolo: "Ci pensa la Regione", descrizione: "Sanità, trasporti regionali, lavoro e formazione, ambiente." },
  parlamento: { titolo: "Decide lo Stato", descrizione: "Pensioni, tasse nazionali, scuola, sicurezza: le leggi le fa il Parlamento." },
  europa: { titolo: "Decide l'Europa", descrizione: "Fondi europei, diritti di chi viaggia, lavora o compra in un altro Paese UE." },
};

export const GUIDA: VoceGuida[] = [
  {
    id: "strade",
    livello: "comune",
    icona: "🚧",
    titolo: "Strade, buche e marciapiedi",
    esempi: "Buche, marciapiedi rotti, segnaletica, semafori",
    chiDecide: "Le strade comunali sono del Comune.",
    primoPasso: "Segnala il problema all'Ufficio tecnico o all'URP (Ufficio relazioni con il pubblico) del Comune: sul sito trovi i contatti e spesso un modulo per le segnalazioni.",
    linkComune: true,
    nota: "Le strade provinciali e statali non sono del Comune: dipendono dalla Provincia (o Città metropolitana) e dall'ANAS.",
    scrivi: "sindaco",
    ufficio: "strade",
    segnalazione: true,
  },
  {
    id: "rifiuti",
    livello: "comune",
    icona: "♻️",
    titolo: "Rifiuti e pulizia delle strade",
    esempi: "Raccolta differenziata, ingombranti, cassonetti, strade sporche",
    chiDecide: "Il servizio di raccolta lo organizza il Comune, spesso tramite un'azienda.",
    primoPasso: "Contatta l'Ufficio ambiente o igiene urbana del Comune (o l'azienda della raccolta): sul sito del Comune trovi calendario e numeri utili.",
    linkComune: true,
    scrivi: "sindaco",
    ufficio: "rifiuti",
    segnalazione: true,
  },
  {
    id: "anagrafe",
    livello: "comune",
    icona: "🆔",
    titolo: "Carta d'identità, certificati, residenza",
    esempi: "Rinnovo della carta d'identità, cambio di residenza, certificati",
    chiDecide: "L'anagrafe è un servizio del Comune.",
    primoPasso: "Rivolgiti all'Ufficio anagrafe del Comune. Molti certificati si scaricano gratis online dall'Anagrafe nazionale.",
    scrivi: "sindaco",
    ufficio: "anagrafe",
    servizi: [
      {
        label: "Prenota la carta d'identità",
        descrizione: "Agenda CIE: scegli giorno e ora per il rinnovo nel tuo Comune",
        url: "https://www.prenotazionicie.interno.gov.it/",
      },
      {
        label: "Scarica i certificati gratis",
        descrizione: "Anagrafe nazionale (ANPR): residenza, stato di famiglia e altri, con SPID o CIE",
        url: "https://www.anagrafenazionale.interno.it/servizi-al-cittadino/",
      },
    ],
  },
  {
    id: "scuola-infanzia",
    livello: "comune",
    icona: "🧸",
    titolo: "Asili nido, mense e scuolabus",
    esempi: "Iscrizione all'asilo nido, mensa scolastica, trasporto scolastico",
    chiDecide: "Nido, mensa e scuolabus sono servizi del Comune.",
    primoPasso: "Contatta l'Ufficio pubblica istruzione o servizi scolastici del Comune.",
    linkComune: true,
    scrivi: "sindaco",
    ufficio: "scuola-infanzia",
  },
  {
    id: "tributi",
    livello: "comune",
    icona: "🧾",
    titolo: "TARI, IMU e tributi comunali",
    esempi: "Bollette della TARI, IMU, avvisi di pagamento del Comune",
    chiDecide: "I tributi locali li decide e li riscuote il Comune.",
    primoPasso: "Rivolgiti all'Ufficio tributi del Comune per chiarimenti, rate o errori nell'avviso.",
    linkComune: true,
    scrivi: "sindaco",
    ufficio: "tributi",
  },
  {
    id: "sociale",
    livello: "comune",
    icona: "🤝",
    titolo: "Assistenza sociale e aiuti alle famiglie",
    esempi: "Assistenza ad anziani e persone con disabilità, contributi, servizi sociali",
    chiDecide: "I servizi sociali sono del Comune, spesso organizzati insieme ai Comuni vicini (Ambito territoriale).",
    primoPasso: "Prendi appuntamento con i Servizi sociali del Comune.",
    linkComune: true,
    scrivi: "sindaco",
    ufficio: "sociale",
  },
  {
    id: "verde",
    livello: "comune",
    icona: "🌳",
    titolo: "Parchi, verde pubblico e illuminazione",
    esempi: "Lampioni spenti, alberi pericolanti, giardini pubblici",
    chiDecide: "Verde e illuminazione pubblica sono del Comune.",
    primoPasso: "Segnala all'Ufficio tecnico o all'URP del Comune.",
    linkComune: true,
    scrivi: "sindaco",
    ufficio: "verde",
    segnalazione: true,
  },
  {
    id: "sanita",
    livello: "regione",
    icona: "🏥",
    titolo: "Medico di base, ASL, liste d'attesa, ospedali",
    esempi: "Cambio del medico, prenotazioni, tempi di attesa, pronto soccorso",
    chiDecide: "La sanità è organizzata dalla Regione, tramite le ASL e gli ospedali.",
    primoPasso: "Rivolgiti alla tua ASL: al distretto sanitario vicino a casa o all'URP (Ufficio relazioni con il pubblico). Per i reclami su un ospedale, all'URP dell'ospedale.",
    link: { label: "Regione Campania", url: "https://www.regione.campania.it/" },
    scrivi: "consiglieri-regionali",
    asl: true,
    numeri: [N112],
  },
  {
    id: "trasporti",
    livello: "regione",
    icona: "🚆",
    titolo: "Treni regionali, Circumvesuviana, autobus extraurbani",
    esempi: "Ritardi, corse soppresse, collegamenti tra comuni",
    chiDecide: "Il trasporto pubblico regionale lo programma e lo finanzia la Regione.",
    primoPasso: "Fai un reclamo all'azienda che gestisce la linea (per esempio EAV per Circumvesuviana e Cumana): è il primo passo previsto.",
    scrivi: "consiglieri-regionali",
    servizi: [{ label: "EAV – Ente Autonomo Volturno", descrizione: "Circumvesuviana, Cumana, Circumflegrea e bus EAV: orari, avvisi e reclami", url: "https://www.eavsrl.it/" }],
  },
  {
    id: "lavoro",
    livello: "regione",
    icona: "💼",
    titolo: "Centri per l'impiego e formazione",
    esempi: "Cercare lavoro, corsi di formazione professionale, tirocini",
    chiDecide: "Centri per l'impiego e formazione professionale sono gestiti dalla Regione.",
    primoPasso: "Rivolgiti al Centro per l'impiego più vicino a casa.",
    link: { label: "Regione Campania", url: "https://www.regione.campania.it/" },
    scrivi: "consiglieri-regionali",
  },
  {
    id: "ambiente",
    livello: "regione",
    icona: "🌊",
    titolo: "Ambiente, inquinamento, acqua e fiumi",
    esempi: "Scarichi, fumi, rifiuti abbandonati in campagna, qualità del mare",
    chiDecide: "La tutela dell'ambiente è soprattutto regionale, con l'agenzia ARPAC per i controlli.",
    primoPasso: "Per controlli e misurazioni rivolgiti all'ARPAC; per un'emergenza in corso chiama il 112.",
    link: { label: "ARPA Campania", url: "https://www.arpacampania.it/" },
    scrivi: "consiglieri-regionali",
    numeri: [N112],
  },
  {
    id: "pensioni",
    livello: "parlamento",
    icona: "👴",
    titolo: "Pensioni, contributi e invalidità",
    esempi: "Domanda di pensione, contributi mancanti, assegni, invalidità civile",
    chiDecide: "Le regole le fa lo Stato con le leggi del Parlamento; le pratiche le gestisce l'INPS.",
    primoPasso: "Per la tua pratica rivolgiti all'INPS (online, al contact center o in sede), anche tramite un patronato gratuito.",
    scrivi: "parlamentari",
    servizi: [{ label: "MyINPS", descrizione: "La tua area personale INPS: domande, pagamenti, estratto contributivo (con SPID o CIE)", url: "https://www.inps.it/it/it/myinps.html" }],
    numeri: [
      {
        label: "Contact center INPS da telefono fisso",
        numero: "803 164",
        nota: "gratuito; lun–ven 8–20, sabato 8–14",
        fonte: "https://www.inps.it/it/it/sedi-e-contatti/contatti/contact-center-multicanale.html",
      },
      {
        label: "Contact center INPS da cellulare",
        numero: "06 164 164",
        nota: "a pagamento secondo il tuo operatore",
        fonte: "https://www.inps.it/it/it/sedi-e-contatti/contatti/contact-center-multicanale.html",
      },
    ],
  },
  {
    id: "tasse",
    livello: "parlamento",
    icona: "🏛️",
    titolo: "Tasse nazionali e cartelle",
    esempi: "IRPEF, dichiarazione dei redditi, cartelle esattoriali",
    chiDecide: "Le tasse nazionali le decide il Parlamento; le gestisce l'Agenzia delle Entrate.",
    primoPasso: "Per la tua posizione rivolgiti all'Agenzia delle Entrate o a un CAF.",
    scrivi: "parlamentari",
    servizi: [
      {
        label: "Dichiarazione precompilata",
        descrizione: "Il 730 già compilato dall'Agenzia delle Entrate, da controllare e inviare (con SPID o CIE)",
        url: "https://infoprecompilata.agenziaentrate.gov.it/portale/",
      },
      {
        label: "Cartelle: controlla, paga o rateizza",
        descrizione: "Agenzia delle Entrate-Riscossione, servizi online",
        url: "https://www.agenziaentrateriscossione.gov.it/it/",
      },
    ],
    numeri: [
      { label: "Agenzia delle Entrate", numero: "800 90 96 96", nota: "numero verde", fonte: "https://www.agenziaentrate.gov.it/portale/contatta" },
      { label: "Agenzia delle Entrate-Riscossione (cartelle)", numero: "06 0101", fonte: "https://www.agenziaentrateriscossione.gov.it/it/" },
    ],
  },
  {
    id: "scuola",
    livello: "parlamento",
    icona: "🎒",
    titolo: "Scuola: insegnanti e organizzazione",
    esempi: "Classi, insegnanti, sostegno, programmi",
    chiDecide: "La scuola è statale: regole e personale dipendono dal Ministero.",
    primoPasso: "Parla prima con la segreteria o il dirigente della scuola.",
    nota: "Gli edifici delle scuole medie ed elementari sono del Comune; quelli delle superiori della Provincia o Città metropolitana.",
    scrivi: "parlamentari",
  },
  {
    id: "sicurezza",
    livello: "parlamento",
    icona: "🛡️",
    titolo: "Sicurezza e ordine pubblico",
    esempi: "Furti, spaccio, situazioni di pericolo",
    chiDecide: "La sicurezza è dello Stato (Polizia, Carabinieri, Prefettura); il Comune ha la Polizia locale.",
    primoPasso: "Per un'emergenza chiama il 112. Per una denuncia vai alla Polizia o ai Carabinieri. Per traffico, sosta e degrado nel tuo comune c'è la Polizia locale.",
    scrivi: "parlamentari",
    ufficio: "polizia",
    numeri: [N112],
    servizi: [
      {
        label: "Commissariato di PS online",
        descrizione: "Segnala truffe e reati commessi su internet alla Polizia Postale",
        url: "https://www.commissariatodips.it/",
      },
    ],
  },
  {
    id: "europa",
    livello: "europa",
    icona: "🌍",
    titolo: "Fondi europei, viaggi e diritti in UE",
    esempi: "Bandi europei, lavorare o studiare all'estero, diritti dei passeggeri e dei consumatori",
    chiDecide: "Molte regole su consumatori, ambiente e fondi sono decise dall'Unione europea.",
    primoPasso: "Il portale ufficiale «La tua Europa» spiega i tuoi diritti e a chi rivolgerti, paese per paese.",
    link: { label: "La tua Europa", url: "https://europa.eu/youreurope/index_it.htm" },
    scrivi: "eurodeputati",
  },
];

export const AVVERTENZA_GUIDA =
  "Gli eletti non gestiscono le pratiche dei singoli: per la tua pratica rivolgiti prima all'ufficio. Scrivi agli eletti se l'ufficio non risponde o se il problema riguarda tante persone.";
