export type Persona = {
  nome: string;
  ruolo: string;
  /** Lista, partito, gruppo o deleghe. */
  dettaglio?: string;
  /** Scheda ufficiale della persona. */
  url?: string;
  email?: string;
  pec?: string;
  tel?: string;
  /** Modulo di contatto ufficiale (es. Camera dei deputati, che non pubblica le email). */
  modulo?: string;
  commissioni?: string[];
  /** Profilo dall'anagrafe degli amministratori (solo Comune). */
  eta?: number;
  sesso?: "M" | "F";
  studio?: string;
  professione?: string;
};

export type ConsigliereRegionale = Persona & {
  /** Circoscrizione provinciale di elezione; null se da verificare. */
  circoscrizione: string | null;
  username: string;
  gruppo?: string;
  /** "capogruppo", "vicecapogruppo"… se ha un ruolo nel gruppo. */
  ruoloGruppo?: string;
};

export type GruppoConsiliare = {
  nome: string;
  sigla: string;
  coalizione: "maggioranza" | "opposizione";
  colore: string;
};

export type Amministrazione = {
  tipo: "ordinaria" | "commissariata";
  dataElezione?: string;
  dataCommissariamento?: string;
  popolazione?: number;
  sindaco: Persona | null;
  giunta: Persona[];
  consiglio: Persona[];
  commissari: Persona[];
};

export type Ufficio = { nome: string; tel?: string; email?: string; pec?: string };

export type Comune = {
  istat: string;
  nome: string;
  provincia: string;
  sigla: string;
  capoluogo: boolean;
  circoscrizioneRegionale: string;
  collegi: {
    cameraU: string[];
    cameraP: string[];
    senatoU: string[];
    senatoP: string[];
    /** Solo per i comuni divisi tra più collegi: quartieri (ISTAT) compresi in ciascun collegio. */
    quartieri?: Record<string, string[]>;
  } | null;
  amministrazione: Amministrazione | null;
  /** Contatti ufficiali del Comune dall'Indice delle PA. */
  contatti: { pec?: string; sito?: string; indirizzo?: string; aggiornato?: string } | null;
  /** Uffici del Comune per tipo di problema (chiave = voce della guida), dall'IPA. Solo contatti d'ufficio. */
  uffici: Record<string, Ufficio>;
  /** Risultati delle ultime elezioni nel comune (comunali, regionali, politiche, europee). */
  elezioni: Elezione[];
  /** Numeri sulla squadra di governo del Comune, calcolati dalla pipeline. */
  numeri: NumeriComune | null;
  /** ASL competente per il comune. */
  asl: { nome: string; sito?: string; pec?: string } | null;
  /** Frazioni e località abitate (ISTAT 2021), dalla più popolosa. */
  frazioni: string[];
  cap: string[];
  /** Id degli atti ("interrogazione-12") e delle leggi ("legge-2026-11") che citano il comune nel titolo. */
  citazioni: string[];
};

export type ContattiEnte = { nome: string; pec?: string; sito?: string };

export type Regione = {
  nome: string;
  contatti: ContattiEnte | null;
  contattiConsiglio: ContattiEnte | null;
  presidente: (Persona & { gruppo?: string; username?: string }) | null;
  giunta: Persona[];
  consiglieri: ConsigliereRegionale[];
  /** In ordine da sinistra a destra nell'emiciclo. */
  gruppi: GruppoConsiliare[];
};

export type Parlamento = {
  camera: Record<string, Persona[]>;
  senato: { uninominali: Record<string, Persona>; proporzionale: Persona[] };
};

export type Europa = { circoscrizione: string; eurodeputati: Persona[] };

export type Fonte = {
  id: string;
  nome: string;
  ente: string;
  url: string;
  /** Data di aggiornamento dichiarata dalla fonte (es. "24/08/2026"). */
  aggiornato?: string;
  /** Quando l'abbiamo scaricata noi (yyyy-mm-dd). */
  raccolto?: string;
};

export type Meta = { generato: string; regione: string; fonti: Fonte[]; avvisi: string[] };

export type TipoAtto = { id: string; nome: string; plurale: string };

export type Atto = {
  id: string;
  tipo: string;
  numero: number;
  /** yyyy-mm-dd */
  data: string;
  titolo: string;
  esito?: "approvata" | "non-approvata" | "respinta" | "ritirata" | "decaduta";
  esitoData?: string;
  /** Commissione di merito (solo proposte di legge). */
  commissione?: string;
  firmatari: { nome: string; username?: string }[];
  url?: string;
};

export type Legge = {
  /** "2026-11" */
  id: string;
  numero: number;
  data: string;
  intestazione: string;
  oggetto?: string;
  url: string;
  pdf?: string;
  relazione?: string;
  riassunto?: { testo: string; modello: string; generato: string };
};

export type Attivita = { totale: number; primoFirmatario: number; perTipo: Record<string, number> };

export type Consiglio = {
  legislatura: string;
  inizio: string;
  tipi: TipoAtto[];
  atti: Atto[];
  leggi: Legge[];
  attivita: Record<string, Attivita>;
};

/** Voce minima per la ricerca lato client. */
export type ComuneIndice = Pick<Comune, "istat" | "nome" | "provincia" | "sigla"> & {
  /** Frazioni, località e quartieri: si può cercare il comune anche così. */
  alt?: string[];
  cap?: string[];
};

export type VotoVoce = { nome: string; voti: number; pct: number; eletto?: boolean; liste?: string[]; /** candidata donna */ f?: boolean };

export type Elezione = {
  id: "comunali" | "regionali" | "politiche" | "europee";
  titolo: string;
  /** "9 giugno 2024" */
  data: string;
  /** 2 = ballottaggio */
  turno?: number;
  elettori?: number;
  votanti?: number;
  affluenza?: number;
  affluenzaRegione?: number;
  candidati?: VotoVoce[];
  candidatiAltri?: number;
  liste?: VotoVoce[];
  listeAltre?: number;
};

export type NumeriComune = {
  /** Persone elette diverse (sindaco, giunta, consiglio: chi ha più ruoli conta una volta). */
  persone: number;
  etaMedia?: number;
  /** Percentuali 0-100, sul totale di chi ha il dato. */
  donne?: number;
  laureati?: number;
  under40?: number;
};

/** Voce leggera dell'elenco dei comuni (home, build): la scheda completa si legge solo quando serve. */
export type ComuneElenco = {
  istat: string;
  nome: string;
  provincia: string;
  sigla: string;
  capoluogo?: boolean;
  abitanti?: number;
  sindaco?: boolean;
};
