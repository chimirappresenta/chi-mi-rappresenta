"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { CopiaTesto } from "./CopiaTesto";

export type EnteAccesso = { id: string; nome: string; pec: string; descrizione: string };

/** Esempi pronti: il testo si può poi cambiare liberamente. */
const ESEMPI = [
  {
    id: "lavori",
    titolo: "Quanto è costato un lavoro pubblico",
    testo: "gli atti di affidamento, il contratto e i pagamenti effettuati per i lavori di [descrivi il lavoro e dove si trova]",
  },
  {
    id: "contratto",
    titolo: "Il contratto di un servizio",
    testo: "il contratto in vigore, con il capitolato e gli allegati, per il servizio di [per esempio raccolta dei rifiuti, mensa scolastica, trasporto scolastico]",
  },
  {
    id: "controlli",
    titolo: "I controlli fatti su qualcosa",
    testo: "gli esiti dei controlli e dei sopralluoghi effettuati su [per esempio un cantiere, un locale, la qualità dell'acqua o dell'aria in una zona]",
  },
  {
    id: "delibera",
    titolo: "Una delibera o un verbale",
    testo: "la delibera o il verbale che riguarda [l'argomento], adottato in data [se la conosci]",
  },
  {
    id: "dati",
    titolo: "Dati su un servizio",
    testo: "i dati e i documenti già in vostro possesso su [per esempio posti negli asili nido e domande in lista d'attesa, tempi di attesa per una visita]",
  },
  { id: "altro", titolo: "Altro", testo: "" },
];

// La data esiste solo nel browser: al build mettiamo un segnaposto, così la pagina statica resta uguale per tutti.
const nessunaIscrizione = () => () => {};
const dataDiOggi = () => new Date().toLocaleDateString("it-IT");

const PERIODI = ["Non importa", "Ultimo anno", "Ultimi 3 anni", "Dal 2020 a oggi"];

/**
 * "Chiedi un documento": prepara una richiesta di accesso civico generalizzato (art. 5, comma 2, d.lgs. 33/2013),
 * il "FOIA italiano". Il testo si apre nella posta di chi scrive, o si copia: il sito non invia e non salva nulla.
 */
export function ChiediDocumento({ enti, luogo }: { enti: EnteAccesso[]; luogo?: string }) {
  const id = useId();
  const [enteId, setEnteId] = useState(enti[0]?.id);
  const [esempio, setEsempio] = useState<string | null>(null);
  const [cosa, setCosa] = useState("");
  const [periodo, setPeriodo] = useState(PERIODI[0]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const oggi = useSyncExternalStore(nessunaIscrizione, dataDiOggi, () => "[data]");
  const ente = enti.find((e) => e.id === enteId) ?? enti[0];
  if (!ente) return null;

  const scegliEsempio = (eid: string) => {
    setEsempio(eid);
    setCosa(ESEMPI.find((x) => x.id === eid)?.testo ?? "");
  };

  const oggetto = "Richiesta di accesso civico generalizzato (art. 5, comma 2, d.lgs. 33/2013)";
  const corpo = [
    `Spett.le ${ente.nome}`,
    "",
    `Oggetto: ${oggetto}`,
    "",
    `Il/La sottoscritto/a ${nome || "[nome e cognome]"}, ai sensi dell'art. 5, comma 2, del decreto legislativo 14 marzo 2013, n. 33,`,
    "",
    "CHIEDE",
    "",
    `di ricevere copia dei seguenti documenti, dati o informazioni: ${cosa.trim() || "[descrivi cosa vuoi ricevere]"}${
      periodo !== PERIODI[0] ? ` (periodo: ${periodo.toLowerCase()})` : ""
    }.`,
    "",
    `Chiede di ricevere quanto richiesto in formato elettronico${email ? ` all'indirizzo ${email}` : " a questo indirizzo email"}.`,
    "",
    "Si ricorda che, per legge, la richiesta non deve essere motivata (art. 5, comma 3), il rilascio in formato elettronico è gratuito (art. 5, comma 4) e l'amministrazione deve rispondere con un provvedimento espresso e motivato entro 30 giorni (art. 5, comma 6).",
    "",
    "Si allega copia di un documento d'identità.",
    "",
    `${luogo ? `${luogo}, ` : ""}${oggi}`,
    "",
    nome || "[Nome e cognome]",
  ].join("\n");
  const href = `mailto:${ente.pec}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;

  const campo =
    "mt-1.5 w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
  const scelta = (attivo: boolean) =>
    `flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2 text-base has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30 ${
      attivo ? "border-accent bg-accent-soft font-semibold" : "border-line hover:border-ink-3"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <ol className="space-y-6">
        {enti.length > 1 && (
          <li>
            <fieldset>
              <legend className="text-lg font-semibold">1. A chi lo chiedi?</legend>
              {enti.length > 4 ? (
                <label className="mt-2 block text-base">
                  <span className="sr-only">Ente</span>
                  <select value={ente.id} onChange={(e) => setEnteId(e.target.value)} className={campo}>
                    {enti.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-sm text-ink-3">{ente.descrizione}</span>
                </label>
              ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {enti.map((e) => (
                  <label key={e.id} className={scelta(e.id === ente.id)}>
                    <input type="radio" name={`${id}-ente`} checked={e.id === ente.id} onChange={() => setEnteId(e.id)} className="sr-only" />
                    <span>
                      <span className="block">{e.nome}</span>
                      <span className="block text-sm font-normal text-ink-3">{e.descrizione}</span>
                    </span>
                  </label>
                ))}
              </div>
              )}
            </fieldset>
          </li>
        )}
        <li>
          <fieldset>
            <legend className="text-lg font-semibold">{enti.length > 1 ? "2." : "1."} Cosa vuoi sapere?</legend>
            <p className="text-base text-ink-3">Scegli un esempio e completa le parti tra parentesi quadre, oppure scrivi tu.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ESEMPI.map((x) => (
                <label
                  key={x.id}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-base has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30 ${
                    esempio === x.id ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <input type="radio" name={`${id}-esempio`} checked={esempio === x.id} onChange={() => scegliEsempio(x.id)} className="sr-only" />
                  {x.titolo}
                </label>
              ))}
            </div>
            <label className="mt-3 block text-base font-semibold">
              Il documento o il dato che chiedi
              <textarea rows={4} value={cosa} onChange={(e) => setCosa(e.target.value)} placeholder="Più sei preciso, più è facile che te lo diano." className={campo} />
            </label>
            <label className="mt-3 block text-base font-semibold">
              Periodo
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={campo}>
                {PERIODI.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </fieldset>
        </li>
        <li>
          <fieldset>
            <legend className="text-lg font-semibold">{enti.length > 1 ? "3." : "2."} I tuoi dati</legend>
            <p className="text-base text-ink-3">Servono per legge: la richiesta deve dire chi la fa. Restano sul tuo dispositivo.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block text-base font-semibold">
                Nome e cognome
                <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className={campo} />
              </label>
              <label className="block text-base font-semibold">
                Email per la risposta <span className="font-normal text-ink-3">(facoltativa)</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={campo} />
              </label>
            </div>
          </fieldset>
        </li>
      </ol>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border-2 border-accent/40 bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold tracking-wide text-ink-3 uppercase">La tua richiesta</p>
          <p className="mt-1 text-base">
            Arriva a: <strong>{ente.nome}</strong>
            <br />
            <span className="break-all text-ink-2">{ente.pec}</span>
          </p>
          <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-surface-2 p-3 font-sans text-sm whitespace-pre-wrap">{corpo}</pre>
          <p className="mt-3 flex gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-base text-warn">
            <span aria-hidden>🪪</span>
            <span>
              <strong>Allega una copia del tuo documento d&apos;identità</strong> (fronte e retro), a meno che tu non scriva dalla tua PEC
              personale.
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a href={href} data-umami-event="documento-invia" data-umami-event-ente={ente.id} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90">
              Apri nella tua email
            </a>
            <CopiaTesto testo={corpo} etichetta="Copia il testo" evento="documento-copia" />
          </div>
          <p className="mt-2 text-sm text-ink-3">
            L&apos;indirizzo è una PEC: alcune accettano solo messaggi da altre PEC. Se il messaggio torna indietro, usa il modulo per
            l&apos;accesso civico sul sito dell&apos;ente (sezione &quot;Amministrazione trasparente&quot;) o consegna la richiesta stampata
            all&apos;ufficio protocollo.
          </p>
        </div>
      </div>
    </div>
  );
}
