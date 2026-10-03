"use client";

import { useId, useRef, useState } from "react";

const TIPI = [
  { id: "dato", label: "Un dato è sbagliato o vecchio" },
  { id: "funziona", label: "Qualcosa non funziona" },
  { id: "difficile", label: "È difficile da leggere o da usare" },
  { id: "idea", label: "Ho un suggerimento" },
  { id: "altro", label: "Altro" },
];

// Repository pubblico delle segnalazioni (es. "utente/chi-mi-rappresenta"): serve solo per il link di riserva.
const REPO = process.env.NEXT_PUBLIC_REPO_SEGNALAZIONI ?? "";

type Stato = { fase: "modulo" } | { fase: "invio" } | { fase: "ok"; url?: string } | { fase: "riserva"; testo: string };

/**
 * "Segnala un errore": un modulo semplice, come su DoveVannoINostriSoldi. La segnalazione diventa una issue pubblica
 * su GitHub, creata dal server del sito (l'utente non ha bisogno di un account). Se il server non è configurato,
 * mostriamo il testo già pronto da copiare.
 */
export function SegnalaErrore({ sezione, compatto = false }: { sezione: string; compatto?: boolean }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [stato, setStato] = useState<Stato>({ fase: "modulo" });
  const [tipo, setTipo] = useState(TIPI[0].id);
  const [cosa, setCosa] = useState("");
  const [atteso, setAtteso] = useState("");
  const [fonte, setFonte] = useState("");
  const [trappola, setTrappola] = useState(""); // campo invisibile: lo compilano solo i bot
  const [copiato, setCopiato] = useState(false);

  const apri = () => {
    setStato({ fase: "modulo" });
    dialog.current?.showModal();
  };
  const chiudi = () => dialog.current?.close();

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    const contesto = {
      pagina: window.location.pathname,
      titoloPagina: document.title,
      sezione,
      quando: new Date().toISOString(),
      schermo: `${window.innerWidth}×${window.innerHeight}`,
      browser: navigator.userAgent,
    };
    const dati = { tipo: TIPI.find((t) => t.id === tipo)?.label ?? tipo, cosa, atteso, fonte, website: trappola, contesto };
    setStato({ fase: "invio" });
    try {
      const r = await fetch("/api/segnala/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dati) });
      if (r.ok) {
        const j = (await r.json()) as { url?: string };
        setStato({ fase: "ok", url: j.url });
        setCosa("");
        setAtteso("");
        setFonte("");
        return;
      }
    } catch {
      // nessun server disponibile: si passa alla riserva
    }
    setStato({
      fase: "riserva",
      testo: [
        `Tipo: ${dati.tipo}`,
        `Pagina: ${contesto.pagina} (${sezione})`,
        "",
        `Cosa ho notato: ${cosa}`,
        atteso ? `Cosa mi aspettavo: ${atteso}` : "",
        fonte ? `Fonte: ${fonte}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  };

  const campo =
    "mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

  return (
    <>
      <button
        type="button"
        onClick={apri}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 hover:border-ink-3 hover:text-ink ${compatto ? "" : ""}`}
      >
        <span aria-hidden>⚑</span> Segnala un errore
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`${id}-titolo`}
        onClick={(e) => e.target === dialog.current && chiudi()}
        className="m-auto w-[min(100%-2rem,40rem)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
      >
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-titolo`} className="display text-4xl">
                Segnala un errore
              </h2>
              <p className="mt-1 text-sm text-ink-3">Sezione: {sezione}</p>
            </div>
            <button type="button" onClick={chiudi} aria-label="Chiudi" className="grid size-11 place-items-center rounded-full text-2xl text-ink-3 hover:bg-surface-2 hover:text-ink">
              ×
            </button>
          </div>

          {stato.fase === "ok" ? (
            <div className="mt-6 rounded-2xl bg-accent-soft p-5">
              <p className="text-lg font-semibold text-accent">Grazie! La segnalazione è arrivata.</p>
              <p className="mt-1 text-ink-2">La controlleremo sulla fonte ufficiale e, se serve, correggeremo il sito.</p>
              {stato.url && (
                <a href={stato.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-accent underline">
                  Segui la segnalazione ↗
                </a>
              )}
              <button type="button" onClick={chiudi} className="mt-4 block min-h-12 rounded-full bg-accent px-6 font-semibold text-accent-ink">
                Chiudi
              </button>
            </div>
          ) : stato.fase === "riserva" ? (
            <div className="mt-6 space-y-3">
              <p className="text-ink-2">
                In questo momento l&apos;invio automatico non è disponibile. Ecco la segnalazione già scritta: copiala e
                {REPO ? " incollala nella pagina che si apre." : " conservala: potrai inviarla appena il servizio torna attivo."}
              </p>
              <textarea readOnly rows={7} value={stato.testo} className="w-full rounded-xl border border-line bg-surface-2 p-3 text-sm" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(stato.testo);
                      setCopiato(true);
                    } catch {
                      setCopiato(false);
                    }
                  }}
                  className="min-h-12 rounded-full border border-line px-5 font-semibold hover:border-ink-3"
                >
                  {copiato ? "✓ Copiata" : "Copia la segnalazione"}
                </button>
                {REPO && (
                  <a
                    href={`https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`[Segnalazione] ${sezione}`)}&body=${encodeURIComponent(stato.testo)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink"
                  >
                    Apri su GitHub ↗
                  </a>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={invia} className="mt-5 space-y-5">
              <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
                La segnalazione sarà <strong>pubblica</strong>, così tutti vedono cosa è stato corretto. Non scrivere dati
                personali (nome, telefono, indirizzo, codice fiscale).
              </p>
              <fieldset>
                <legend className="text-base font-semibold">Di che cosa si tratta?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {TIPI.map((t) => (
                    <label
                      key={t.id}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/30 ${
                        tipo === t.id ? "border-accent bg-accent-soft font-semibold" : "border-line"
                      }`}
                    >
                      <input type="radio" name={`${id}-tipo`} value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} className="size-5 accent-[var(--accent)]" />
                      {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-base font-semibold">
                Cosa hai notato?
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={cosa}
                  onChange={(e) => setCosa(e.target.value)}
                  placeholder="Es. il sindaco indicato non è più in carica da giugno"
                  className={campo}
                />
              </label>
              <label className="block text-base font-semibold">
                Qual è l&apos;informazione giusta? <span className="font-normal text-ink-3">(facoltativo)</span>
                <textarea maxLength={2000} rows={2} value={atteso} onChange={(e) => setAtteso(e.target.value)} className={campo} />
              </label>
              <label className="block text-base font-semibold">
                Link a una fonte ufficiale <span className="font-normal text-ink-3">(facoltativo)</span>
                <input type="url" maxLength={500} value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="https://…" className={campo} />
              </label>
              {/* campo trappola per i bot: invisibile alle persone */}
              <label className="hidden" aria-hidden>
                Sito web
                <input tabIndex={-1} autoComplete="off" value={trappola} onChange={(e) => setTrappola(e.target.value)} />
              </label>
              <p className="text-sm text-ink-3">
                Allegheremo in automatico solo: pagina, sezione, data e ora, dimensione dello schermo e tipo di browser. Nessun
                nome, email o indirizzo IP.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={stato.fase === "invio" || !cosa.trim()}
                  className="min-h-12 rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-50"
                >
                  {stato.fase === "invio" ? "Invio in corso…" : "Invia la segnalazione"}
                </button>
                <button type="button" onClick={chiudi} className="min-h-12 rounded-full px-5 text-base text-ink-2 hover:bg-surface-2">
                  Annulla
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
