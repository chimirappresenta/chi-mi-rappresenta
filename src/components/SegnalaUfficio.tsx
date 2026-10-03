"use client";

import { useId, useState } from "react";
import type { Ufficio } from "@/lib/types";

const DA_QUANDO = ["Da oggi", "Da qualche giorno", "Da qualche settimana", "Da mesi"];

/**
 * "Prepara la segnalazione all'ufficio": un messaggio chiaro e completo (cosa, dove, da quando), indirizzato
 * all'ufficio competente del Comune. Si apre nella posta dell'utente: il sito non invia e non salva nulla.
 */
export function SegnalaUfficio({
  comune,
  problema,
  esempio,
  ufficio,
  pecComune,
}: {
  comune: string;
  problema: string;
  esempio: string;
  ufficio?: Ufficio;
  pecComune?: string;
}) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const [cosa, setCosa] = useState("");
  const [dove, setDove] = useState("");
  const [quando, setQuando] = useState(DA_QUANDO[1]);
  const [nome, setNome] = useState("");
  const [recapito, setRecapito] = useState("");

  const indirizzo = ufficio?.email ?? ufficio?.pec ?? pecComune;
  if (!indirizzo) return null;
  const nomeUfficio = ufficio && (/^(uffic|settore|servizi|area|polizia|corpo)/i.test(ufficio.nome) ? ufficio.nome : `Ufficio ${ufficio.nome}`);
  const destinatario = nomeUfficio ? `${nomeUfficio} del Comune di ${comune}` : `Comune di ${comune}`;

  const oggetto = `Segnalazione: ${problema.toLowerCase()}${dove ? ` – ${dove}` : ""} (${comune})`;
  const corpo = [
    `Spett.le ${destinatario},`,
    "",
    "segnalo il seguente problema:",
    `- Cosa succede: ${cosa || "[descrivi il problema]"}`,
    `- Dove: ${dove || "[via e numero civico, o un punto di riferimento]"}, ${comune}`,
    `- Da quando: ${quando.toLowerCase()}`,
    "",
    "Chiedo cortesemente un intervento e, se possibile, di essere informato/a sui tempi previsti.",
    "Allego una foto del problema.",
    "",
    "Cordiali saluti,",
    nome || "[Nome e cognome]",
    recapito ? `Recapito: ${recapito}` : "",
  ]
    .filter((r, i, a) => r !== "" || (a[i - 1] !== "" && i < a.length - 1))
    .join("\n");
  const href = `mailto:${indirizzo}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;

  if (!aperto)
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90"
      >
        <span aria-hidden>📝</span> Prepara la segnalazione all&apos;ufficio
      </button>
    );

  const campo =
    "mt-1.5 w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
  return (
    <div className="-mx-1 rounded-3xl border-2 border-accent/40 bg-surface p-3 sm:mx-0 sm:p-5">
      <h4 className="text-lg font-semibold">La tua segnalazione</h4>
      <p className="text-base text-ink-2">
        Arriva a: <strong>{destinatario}</strong>
      </p>
      <p className="text-sm text-ink-3">Più dettagli dai, più è facile che intervengano in fretta.</p>
      <ol className="mt-4 space-y-4">
        <li>
          <label className="block text-base font-semibold">
            1. Cosa succede?
            <textarea rows={3} value={cosa} onChange={(e) => setCosa(e.target.value)} placeholder={`Per esempio: ${esempio}…`} className={campo} />
          </label>
        </li>
        <li>
          <label className="block text-base font-semibold">
            2. Dove, esattamente?
            <input value={dove} onChange={(e) => setDove(e.target.value)} placeholder="Via e numero civico, o vicino a…" className={campo} />
          </label>
        </li>
        <li>
          <fieldset>
            <legend className="text-base font-semibold">3. Da quando?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DA_QUANDO.map((q) => (
                <label
                  key={q}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30 ${
                    quando === q ? "border-accent bg-accent font-semibold text-accent-ink" : "border-line text-ink-2"
                  }`}
                >
                  <input type="radio" name={`${id}-quando`} checked={quando === q} onChange={() => setQuando(q)} className="sr-only" />
                  {q}
                </label>
              ))}
            </div>
          </fieldset>
        </li>
        <li className="grid gap-3 sm:grid-cols-2">
          <label className="block text-base font-semibold">
            Il tuo nome <span className="font-normal text-ink-3">(consigliato)</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} />
          </label>
          <label className="block text-base font-semibold">
            Telefono o email per risponderti <span className="font-normal text-ink-3">(facoltativo)</span>
            <input value={recapito} onChange={(e) => setRecapito(e.target.value)} className={campo} />
          </label>
        </li>
      </ol>
      <p className="mt-4 flex gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-base text-warn">
        <span aria-hidden>📷</span>
        <span>
          <strong>Allega una foto</strong> al messaggio prima di inviarlo: aiuta l&apos;ufficio a capire subito il problema.
        </span>
      </p>
      <a href={href} className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink hover:opacity-90">
        Apri il messaggio nella tua email
      </a>
      <p className="mt-2 text-sm text-ink-3">
        Destinatario: {indirizzo}
        {!ufficio?.email && " (posta certificata: se non accetta email normali, usa il modulo sul sito del Comune)"}. Il messaggio lo invii tu: questo
        sito non salva nulla.
      </p>
      <button type="button" onClick={() => setAperto(false)} className="mt-2 min-h-11 rounded-full px-3 text-base text-ink-2 underline hover:bg-surface-2">
        Chiudi il modulo
      </button>
    </div>
  );
}
