import Link from "next/link";
import { AVVERTENZA_GUIDA, GUIDA, LIVELLI_GUIDA, type Destinatari, type LivelloGuida, type VoceGuida } from "@/lib/guida";
import type { Comune, Persona } from "@/lib/types";
import { ScriviA } from "./ScriviA";
import { SegnalaUfficio } from "./SegnalaUfficio";
import { stileLivello } from "./ui";

export type ContestoComune = {
  comune: Comune;
  sindaco?: Persona | null;
  /** Consiglieri regionali da proporre: quanti e "dove" (es. "eletti in provincia di Napoli"). */
  consiglieriRegionali: { numero: number; dove: string };
  deputati: Persona[];
  senatori: Persona[];
};

/** Il riquadro "a chi scrivere" di una voce: con il comune scelto mostra nomi e pulsanti, altrimenti spiega. */
function ChiScrivere({ dest, ctx }: { dest: Destinatari; ctx?: ContestoComune }) {
  if (!ctx) {
    const testo: Record<Destinatari, string> = {
      sindaco: "al sindaco del tuo comune",
      "consiglieri-regionali": "ai consiglieri regionali eletti nella tua provincia",
      parlamentari: "al deputato e al senatore della tua zona",
      eurodeputati: "agli eurodeputati del Sud Italia",
    };
    return <p className="text-ink-2">Se non risolvi: scrivi {testo[dest]}. Scegli il tuo comune qui sopra per vedere nomi e contatti.</p>;
  }
  const { comune } = ctx;
  if (dest === "sindaco") {
    if (!comune.contatti?.pec) return <p className="text-ink-2">Se non risolvi: scrivi al sindaco tramite il sito del Comune.</p>;
    return (
      <div className="space-y-2">
        <p className="text-ink-2">
          Se non risolvi: scrivi {ctx.sindaco ? <>al sindaco <strong>{ctx.sindaco.nome}</strong></> : "al Comune"} (il messaggio arriva alla PEC del Comune).
        </p>
        <ScriviA
          nome={ctx.sindaco?.nome ?? `Sindaco di ${comune.nome}`}
          tipo="sindaco"
          pec={comune.contatti.pec}
          allaCortese={`Alla cortese attenzione del Sindaco di ${comune.nome}`}
          comune={comune.nome}
          etichetta={ctx.sindaco ? `Scrivi al sindaco` : "Scrivi al Comune"}
        />
      </div>
    );
  }
  if (dest === "consiglieri-regionali")
    return (
      <p className="text-ink-2">
        Se non risolvi: scrivi a uno dei <strong>{ctx.consiglieriRegionali.numero} consiglieri regionali</strong> {ctx.consiglieriRegionali.dove}.{" "}
        <a href="#regione" className="font-semibold text-accent underline">
          Scegli a chi scrivere →
        </a>
      </p>
    );
  if (dest === "parlamentari") {
    const persone = [...ctx.deputati, ...ctx.senatori];
    return (
      <div className="space-y-2">
        <p className="text-ink-2">Se il problema riguarda una legge nazionale, scrivi ai parlamentari della tua zona:</p>
        <div className="flex flex-wrap gap-2">
          {persone.map((p) => (
            <ScriviA
              key={p.nome}
              nome={p.nome}
              tipo={p.ruolo.startsWith("Senat") ? "senatore" : "deputato"}
              email={p.email}
              modulo={p.modulo}
              comune={comune.nome}
              etichetta={`Scrivi a ${p.nome}`}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <p className="text-ink-2">
      Se il tema riguarda l&apos;Unione europea, scrivi a uno degli eurodeputati del Sud.{" "}
      <a href="#europa" className="font-semibold text-accent underline">
        Vedi gli eurodeputati →
      </a>
    </p>
  );
}

/** "0813000425" → "081 300 0425": i numeri si leggono e si dettano meglio a gruppi. */
function leggibile(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("3")) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim();
  const pref = /^0(6|2)/.test(d) ? 2 : /^0(81|89)/.test(d) ? 3 : 4;
  const resto = d.slice(pref);
  const gruppi = resto.length > 4 ? [resto.slice(0, resto.length - 4), resto.slice(-4)] : [resto];
  return [d.slice(0, pref), ...gruppi].join(" ");
}

const btn = "inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold";

/** Contatti concreti di una voce: l'ufficio giusto del Comune, l'ASL, i servizi online e i numeri utili. */
function ContattiVoce({ v, ctx }: { v: VoceGuida; ctx?: ContestoComune }) {
  const comune = ctx?.comune;
  const uff = v.ufficio && comune ? comune.uffici?.[v.ufficio] : undefined;
  const asl = v.asl && comune ? comune.asl : undefined;
  return (
    <>
      {comune && v.ufficio && (
        <div className="rounded-xl border border-line bg-surface p-4">
          {uff ? (
            <>
              <p className="text-sm font-semibold tracking-wide text-ink-3 uppercase">L&apos;ufficio giusto a {comune.nome}</p>
              <p className="mt-1 text-lg font-semibold">{uff.nome}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {uff.tel && (
                  <a href={`tel:${uff.tel}`} data-umami-event="chiama" data-umami-event-chi="ufficio-comune" className={`${btn} bg-[var(--lv)] text-white hover:opacity-90`}>
                    <span aria-hidden>📞</span> Chiama {leggibile(uff.tel)}
                  </a>
                )}
                {(uff.email || uff.pec) && (
                  <a
                    href={`mailto:${uff.email ?? uff.pec}`}
                    className={`${btn} border-2 border-[var(--lv)] text-[var(--lv)] hover:bg-[var(--lv-bg)]`}
                  >
                    <span aria-hidden>📧</span> {uff.email ? "Email dell'ufficio" : "PEC dell'ufficio"}
                  </a>
                )}
              </div>
              {(uff.email || uff.pec) && <p className="mt-2 text-sm break-all text-ink-3">{uff.email ?? uff.pec}</p>}
              <p className="mt-2 text-sm text-ink-3">Contatti pubblicati dal Comune nell&apos;Indice delle Pubbliche Amministrazioni.</p>
            </>
          ) : (
            <p className="text-ink-2">
              Il Comune di {comune.nome} non ha indicato un ufficio specifico per questo nell&apos;Indice delle Pubbliche Amministrazioni: chiama il
              centralino (lo trovi sul sito del Comune) oppure scrivi alla PEC del Comune
              {comune.contatti?.pec && (
                <>
                  {" "}
                  <a href={`mailto:${comune.contatti.pec}`} className="font-semibold break-all text-[var(--lv)] underline">
                    {comune.contatti.pec}
                  </a>
                </>
              )}
              .
            </p>
          )}
        </div>
      )}
      {comune && v.segnalazione && (
        <SegnalaUfficio
          comune={comune.nome}
          problema={v.titolo}
          esempio={v.esempi.toLowerCase()}
          ufficio={uff && (uff.email || uff.pec) ? uff : undefined}
          pecComune={comune.contatti?.pec}
        />
      )}
      {asl && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold tracking-wide text-ink-3 uppercase">La tua ASL</p>
          <p className="mt-1 text-lg font-semibold">{asl.nome}</p>
          <p className="mt-1 text-ink-2">Sul sito trovi il distretto sanitario più vicino, gli orari e l&apos;URP per i reclami.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {asl.sito && (
              <a href={asl.sito} target="_blank" rel="noreferrer" data-umami-event="asl-sito" className={`${btn} bg-[var(--lv)] text-white hover:opacity-90`}>
                Sito della {asl.nome} ↗
              </a>
            )}
            {asl.pec && (
              <a href={`mailto:${asl.pec}`} className={`${btn} border-2 border-[var(--lv)] text-[var(--lv)] hover:bg-[var(--lv-bg)]`}>
                <span aria-hidden>📧</span> PEC
              </a>
            )}
          </div>
        </div>
      )}
      {v.asl && !comune && <p className="text-ink-2">Scegli il tuo comune per sapere qual è la tua ASL e come contattarla.</p>}
      {v.ufficio && !comune && (
        <p className="text-ink-2">Scegli il tuo comune per vedere l&apos;ufficio giusto, con telefono ed email{v.segnalazione ? ", e preparare la segnalazione" : ""}.</p>
      )}
      {v.servizi && (
        <div>
          <p className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Puoi farlo online</p>
          <ul className="mt-2 grid gap-2">
            {v.servizi.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" data-umami-event="servizio-online" data-umami-event-servizio={s.label} className="block rounded-xl border border-line bg-surface p-3 hover:border-[var(--lv)]">
                  <span className="block font-semibold text-[var(--lv)]">{s.label} ↗</span>
                  <span className="block text-sm text-ink-2">{s.descrizione}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {v.numeri && (
        <div>
          <p className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Numeri utili</p>
          <ul className="mt-2 grid gap-2">
            {v.numeri.map((n) => (
              <li key={n.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a href={`tel:${n.numero.replace(/\s/g, "")}`} data-umami-event="chiama" data-umami-event-chi={n.numero} className={`${btn} bg-surface-2 text-lg text-ink hover:bg-[var(--lv-bg)]`}>
                  <span aria-hidden>📞</span> {n.numero}
                </a>
                <span className="min-w-0 text-ink-2">
                  {n.label}
                  {n.nota && <span className="text-ink-3"> · {n.nota}</span>}
                  {n.fonte && (
                    <>
                      {" "}
                      <a href={n.fonte} target="_blank" rel="noreferrer" className="text-sm text-ink-3 underline">
                        fonte
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** "Ho un problema: a chi mi rivolgo?" — le voci più comuni, raggruppate per chi decide. */
export function GuidaProblemi({ ctx }: { ctx?: ContestoComune }) {
  const livelli = Object.keys(LIVELLI_GUIDA) as LivelloGuida[];
  return (
    <div className="space-y-8">
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-base text-ink-2">
        <strong className="text-ink">Prima di tutto: </strong>
        {AVVERTENZA_GUIDA}
      </p>
      {livelli.map((lv) => (
        <section key={lv} style={stileLivello(lv)} aria-labelledby={`guida-${lv}`}>
          <h3 id={`guida-${lv}`} className="flex items-center gap-2 text-xl font-semibold">
            <span className="size-3 rounded-full bg-[var(--lv)]" aria-hidden />
            {LIVELLI_GUIDA[lv].titolo}
          </h3>
          <p className="mt-1 text-ink-2">{LIVELLI_GUIDA[lv].descrizione}</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {GUIDA.filter((v) => v.livello === lv).map((v) => {
              const sito = v.linkComune && ctx?.comune.contatti?.sito;
              return (
                <details key={v.id} id={`problema-${v.id}`} className="group rounded-2xl border-2 border-line bg-surface open:border-[var(--lv)]">
                  <summary data-umami-event="guida-voce" data-umami-event-voce={v.id} className="flex min-h-16 items-center gap-4 px-4 py-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--lv-bg)] text-2xl" aria-hidden>
                      {v.icona}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold">{v.titolo}</span>
                      <span className="block text-sm text-ink-3">{v.esempi}</span>
                    </span>
                    <span className="chevron grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg transition-transform" aria-hidden>
                      ›
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-4 pt-4 pb-5 text-base">
                    <p>
                      <strong>Chi decide: </strong>
                      {v.chiDecide}
                    </p>
                    <div className="rounded-xl bg-[var(--lv-bg)] p-4">
                      <p className="text-sm font-semibold tracking-wide text-[var(--lv)] uppercase">Primo passo</p>
                      <p className="mt-1">{v.primoPasso}</p>
                      {(sito || v.link) && (
                        <a
                          href={sito || v.link!.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-surface px-4 font-semibold text-[var(--lv)] hover:underline"
                        >
                          {sito ? `Sito del Comune di ${ctx!.comune.nome}` : v.link!.label} ↗
                        </a>
                      )}
                    </div>
                    <ContattiVoce v={v} ctx={ctx} />
                    {v.nota && <p className="text-sm text-ink-3">Attenzione: {v.nota}</p>}
                    <ChiScrivere dest={v.scrivi} ctx={ctx} />
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
      {!ctx && (
        <p className="text-ink-2">
          Non trovi il tuo caso? Guarda chi ti rappresenta nel tuo comune:{" "}
          <Link href="/" className="font-semibold text-accent underline">
            cerca il tuo comune
          </Link>
          .
        </p>
      )}
    </div>
  );
}
