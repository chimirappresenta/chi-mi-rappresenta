"use client";

import { useId, useState } from "react";

/** Che tipo di eletto: cambia cosa gli si può chiedere di fare. */
export type TipoDestinatario = "sindaco" | "consigliere-regionale" | "deputato" | "senatore" | "eurodeputato";

type Props = {
  /** Nome da usare nel saluto (es. "Mario Rossi", "Sindaco di Casagiove"). */
  nome: string;
  tipo: TipoDestinatario;
  email?: string;
  pec?: string;
  /** Modulo di contatto ufficiale, se non c'è un'email (Camera dei deputati). */
  modulo?: string;
  /** Per il sindaco si scrive alla PEC del Comune "alla cortese attenzione". */
  allaCortese?: string;
  /** Comune da cui arriva l'utente, se noto: precompila il messaggio. */
  comune?: string;
  etichetta?: string;
};

const SEDE: Record<TipoDestinatario, string> = {
  sindaco: "in Giunta o in Consiglio comunale",
  "consigliere-regionale": "in Consiglio regionale, anche con un'interrogazione alla Giunta",
  deputato: "in Parlamento, anche con un'interrogazione al Governo",
  senatore: "in Parlamento, anche con un'interrogazione al Governo",
  eurodeputato: "al Parlamento europeo",
};

const MOTIVI = [
  { id: "problema", label: "Segnalare un problema", richiesta: (t: TipoDestinatario) => `di approfondire la questione e di portarla, se lo ritiene utile, ${SEDE[t]}` },
  { id: "info", label: "Chiedere un'informazione", richiesta: () => "di farmi sapere come stanno le cose e quali iniziative sono in corso" },
  { id: "idea", label: "Proporre un'idea", richiesta: (t: TipoDestinatario) => `di valutare questa proposta e di portarla, se la condivide, ${SEDE[t]}` },
  { id: "incontro", label: "Chiedere un incontro", richiesta: () => "la disponibilità per un breve incontro o una telefonata" },
];

/**
 * Prepara un messaggio a un eletto e lo apre nel programma di posta dell'utente,
 * oppure (se c'è solo un modulo ufficiale) lo fa copiare e apre il modulo. Il sito non invia e non salva nulla.
 */
export function ScriviA({ nome, tipo, email, pec, modulo, allaCortese, comune: comuneIniziale = "", etichetta }: Props) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const [mittente, setMittente] = useState("");
  const [comune, setComune] = useState(comuneIniziale);
  const [argomento, setArgomento] = useState("");
  const [motivo, setMotivo] = useState(MOTIVI[0].id);
  const [copiato, setCopiato] = useState(false);

  const indirizzo = email ?? pec;
  if (!indirizzo && !modulo) return null;

  const m = MOTIVI.find((x) => x.id === motivo)!;
  const oggetto = `${allaCortese ? `${allaCortese} – ` : ""}${comune ? `[${comune}] ` : ""}${argomento || m.label}`;
  const corpo = [
    allaCortese ? `${allaCortese}\n` : "",
    `Gentile ${nome},`,
    "",
    `${mittente ? `sono ${mittente}` : "Le scrivo"}${comune ? `${mittente ? "," : ""} da cittadino/a di ${comune}` : ""}${argomento ? `, in merito a: ${argomento}` : ""}.`,
    "",
    "[Descriva qui la situazione: cosa succede, dove, da quanto tempo, chi è coinvolto.]",
    "",
    `Le chiedo ${m.richiesta(tipo)}.`,
    "",
    "Grazie per l'attenzione.",
    "Cordiali saluti,",
    mittente || "[Nome e cognome]",
  ]
    .filter((r, i) => r !== "" || i > 0)
    .join("\n");
  const href = indirizzo ? `mailto:${indirizzo}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}` : undefined;

  if (!aperto)
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-accent bg-accent-soft px-4 py-2 text-base font-semibold text-accent hover:opacity-90"
      >
        <span aria-hidden>✉</span> {etichetta ?? `Scrivi a ${nome}`}
      </button>
    );

  const input =
    "mt-1.5 w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
  return (
    <div className="w-full rounded-3xl border border-line bg-surface-2 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{etichetta ?? `Scrivi a ${nome}`}</h3>
        <button type="button" onClick={() => setAperto(false)} className="min-h-11 rounded-full px-3 text-sm text-ink-2 hover:bg-surface hover:text-ink">
          Chiudi
        </button>
      </div>
      <ol className="mt-3 space-y-4">
        <li>
          <fieldset>
            <legend className="text-sm font-semibold text-ink-2">1. Perché scrivi?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOTIVI.map((x) => (
                <label
                  key={x.id}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30 ${
                    motivo === x.id ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line bg-surface text-ink-2"
                  }`}
                >
                  <input type="radio" name={`${id}-motivo`} value={x.id} checked={motivo === x.id} onChange={() => setMotivo(x.id)} className="sr-only" />
                  {x.label}
                </label>
              ))}
            </div>
          </fieldset>
        </li>
        <li>
          <label className="block text-sm font-semibold text-ink-2">
            2. Di cosa si tratta? <span className="font-normal text-ink-3">(una frase)</span>
            <input value={argomento} onChange={(e) => setArgomento(e.target.value)} placeholder="es. chiusura del pronto soccorso di…" className={input} />
          </label>
        </li>
        <li className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-2">
            3. Il tuo comune
            <input value={comune} onChange={(e) => setComune(e.target.value)} className={input} />
          </label>
          <label className="block text-sm font-semibold text-ink-2">
            Il tuo nome <span className="font-normal text-ink-3">(facoltativo)</span>
            <input value={mittente} onChange={(e) => setMittente(e.target.value)} className={input} />
          </label>
        </li>
      </ol>

      {href ? (
        <>
          <a href={href} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90">
            Apri il messaggio nella tua email
          </a>
          {!email && pec && (
            <p className="mt-2 text-sm text-ink-3">
              L&apos;indirizzo è una PEC (posta certificata): alcune PEC non accettano email normali. In quel caso usa i contatti sul sito
              ufficiale.
            </p>
          )}
        </>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-ink-2">Questo eletto si contatta con il modulo ufficiale. Copia il testo e incollalo nel modulo:</p>
          <textarea readOnly value={`${oggetto}\n\n${corpo}`} rows={6} className="w-full rounded-xl border border-line bg-surface p-3 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${oggetto}\n\n${corpo}`);
                  setCopiato(true);
                } catch {
                  setCopiato(false);
                }
              }}
              className="min-h-12 rounded-full border border-line bg-surface px-5 text-base font-semibold text-ink hover:border-ink-3"
            >
              {copiato ? "✓ Testo copiato" : "1. Copia il testo"}
            </button>
            <a href={modulo} target="_blank" rel="noreferrer" className="flex min-h-12 items-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90">
              2. Apri il modulo ufficiale ↗
            </a>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm text-ink-3">Prepariamo solo una bozza: la invii tu. Questo sito non invia messaggi e non salva quello che scrivi.</p>
    </div>
  );
}
