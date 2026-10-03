import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  citazioniDi,
  consiglio,
  europa,
  fonte,
  comuniDaPreparare,
  getComune,
  mediaRegione,
  parlamento,
  prossimeElezioni,
  regione,
} from "@/lib/data";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Avatar, Avviso, Espandibile, Gruppo, Livello, PersonaRow, stileLivello, type LivelloId } from "@/components/ui";
import { EmicicloRemoto } from "@/components/EmicicloRemoto";
import { Condividi } from "@/components/Condividi";
import { AttoRow, LeggeCard } from "@/components/consiglio";
import { ScriviA } from "@/components/ScriviA";
import { GuidaProblemi } from "@/components/GuidaProblemi";
import { CopiaTesto } from "@/components/CopiaTesto";
import { SegnalaErrore } from "@/components/SegnalaErrore";
import { RisultatiElezioni } from "@/components/RisultatiElezioni";
import { ChiediDocumento, type EnteAccesso } from "@/components/ChiediDocumento";
import { AccessoCivicoInfo } from "@/components/AccessoCivicoInfo";
import { Segui } from "@/components/Segui";
import { SITE_URL } from "@/lib/sito";

// Pagine preparate alla build solo per i comuni più grandi; le altre si creano alla prima visita
// e poi restano in cache fino alla pubblicazione successiva (dynamicParams = true, il valore predefinito).
export function generateStaticParams() {
  return comuniDaPreparare().map((c) => ({ istat: c.istat }));
}

export async function generateMetadata({ params }: PageProps<"/comune/[istat]">): Promise<Metadata> {
  const c = getComune((await params).istat);
  return c
    ? {
        title: `${c.nome}: chi ti rappresenta`,
        description: `Sindaco, contatti del Comune, consiglieri regionali, deputati, senatori ed eurodeputati di chi vive a ${c.nome} (${c.sigla}). E a chi rivolgersi per i problemi più comuni.`,
      }
    : {};
}

/** "CAMPANIA 1 - U02" → "Campania 1, collegio 2" */
const etichettaCollegio = (k: string) => {
  const [circ, cod] = k.split(" - ");
  return `${circ.charAt(0) + circ.slice(1).toLowerCase()}, collegio ${Number(cod.slice(1))}`;
};

const NOTA_COLLEGI_MULTIPLI =
  "Il comune è diviso in più zone elettorali: cerca il tuo quartiere. Il riferimento esatto è la sezione indicata sulla tessera elettorale.";

/** Il ruolo dalla fonte è già declinato ("Deputata", "Senatrice"): lo usiamo anche per i titoli delle sezioni. */
const femminile = (p?: { ruolo: string }) => !!p && /^(Deputata|Senatrice|Sindaca|Eurodeputata|Consigliera)/.test(p.ruolo);

/** Confronto con la media campana, in parole: "più alta della media (52)". */
function confronto(valore: number | undefined, media: number | undefined, unita = "") {
  if (valore === undefined || media === undefined) return "";
  const d = valore - media;
  if (Math.abs(d) <= 2) return `in linea con la media campana (${media}${unita})`;
  return `${d > 0 ? "più alta" : "più bassa"} della media campana (${media}${unita})`;
}

export default async function ComunePage({ params }: PageProps<"/comune/[istat]">) {
  const c = getComune((await params).istat);
  if (!c) notFound();

  const a = c.amministrazione;
  const circ = c.circoscrizioneRegionale;
  const consiglieriCirc = regione.consiglieri.filter((x) => x.circoscrizione === circ);
  const col = c.collegi;
  const citazioni = citazioniDi(c);
  const numeri = c.numeri;
  const prossime = a?.tipo === "ordinaria" ? prossimeElezioni(a.dataElezione) : undefined;

  const deputatiU = (col?.cameraU ?? []).flatMap((k) => parlamento.camera[k] ?? []);
  const senatoriU = (col?.senatoU ?? []).flatMap((k) => parlamento.senato.uninominali[k] ?? []);
  const sintesi: { id: LivelloId; etichetta: string; nome: string; ruolo: string; extra: string }[] = [
    {
      id: "comune",
      etichetta: "Comune",
      nome: a?.tipo === "commissariata" ? (a.commissari[0]?.nome ?? "Commissario") : (a?.sindaco?.nome ?? "Dati in aggiornamento"),
      ruolo: a?.tipo === "commissariata" ? "Comune commissariato" : (a?.sindaco?.ruolo ?? "Sindaco"),
      extra: a?.tipo === "ordinaria" ? `${a.giunta.length} assessori e ${a.consiglio.length} consiglieri comunali` : "Nessun sindaco in carica",
    },
    {
      id: "regione",
      etichetta: "Regione",
      nome: regione.presidente?.nome ?? "Presidente",
      ruolo: "Presidente della Regione",
      extra: `${consiglieriCirc.length} consiglieri regionali eletti in provincia di ${c.provincia}`,
    },
    {
      id: "parlamento",
      etichetta: "Parlamento",
      nome: deputatiU[0]?.nome ?? "—",
      ruolo: deputatiU.length > 1 ? `e altri ${deputatiU.length - 1} deputati della città` : `${femminile(deputatiU[0]) ? "Deputata" : "Deputato"} della tua zona`,
      extra: senatoriU.length ? `Al Senato: ${senatoriU.map((p) => p.nome).join(", ")}` : "",
    },
    {
      id: "europa",
      etichetta: "Europa",
      nome: `${europa.eurodeputati.length} eurodeputati`,
      ruolo: "Eletti nel Sud Italia",
      extra: "Abruzzo, Molise, Campania, Puglia, Basilicata e Calabria",
    },
  ];

  const azioni = [
    { href: "#contatti", icona: "🏛️", titolo: "Contattare il Comune", testo: "PEC, sito e indirizzo ufficiali" },
    { href: "#problemi", icona: "🧭", titolo: "Ho un problema", testo: "A chi mi rivolgo? Strade, ASL, pensioni…" },
    { href: "#chi", icona: "👥", titolo: "Chi mi rappresenta", testo: "Sindaco, Regione, Parlamento, Europa" },
    { href: "#documento", icona: "📄", titolo: "Chiedi un documento", testo: "Contratti, spese, controlli: hai diritto di sapere" },
    { href: "#voto", icona: "🗳️", titolo: "Come si è votato", testo: "Risultati e affluenza delle ultime elezioni" },
  ];

  // Enti a cui chiedere un documento: il Comune, la sua ASL, la Regione e il Consiglio regionale (PEC dall'IPA).
  const enti: EnteAccesso[] = [
    c.contatti?.pec && { id: "comune", nome: `Comune di ${c.nome}`, pec: c.contatti.pec, descrizione: "Lavori, rifiuti, scuole, urbanistica, tributi locali" },
    c.asl?.pec && { id: "asl", nome: c.asl.nome, pec: c.asl.pec, descrizione: "Sanità: servizi, attese, controlli" },
    regione.contatti?.pec && { id: "regione", nome: "Regione Campania", pec: regione.contatti.pec, descrizione: "Sanità, trasporti, ambiente, fondi europei" },
    regione.contattiConsiglio?.pec && {
      id: "consiglio",
      nome: "Consiglio regionale della Campania",
      pec: regione.contattiConsiglio.pec,
      descrizione: "Atti, leggi e spese del Consiglio",
    },
  ].filter((e): e is EnteAccesso => !!e);

  return (
    <div className="contenitore py-8">
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › <span className="text-ink-2">{c.nome}</span>
      </nav>

      <header className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-ink-2">
            {c.provincia === c.nome ? "Capoluogo di provincia" : `Provincia di ${c.provincia}`} · Campania
            {c.cap.length > 0 && <> · CAP {c.cap.length > 3 ? `${c.cap[0]}–${c.cap[c.cap.length - 1]}` : c.cap.join(", ")}</>}
          </p>
          <h1 className="display mt-4 text-6xl sm:text-8xl">{c.nome}</h1>
          {c.frazioni.length > 0 && (
            <p className="mt-3 max-w-3xl text-base text-ink-3">
              Comprende anche: {c.frazioni.slice(0, 8).join(", ")}
              {c.frazioni.length > 8 && ` e altre ${c.frazioni.length - 8} località`}.
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
        <Condividi
          path={`/comune/${c.istat}/`}
          titolo={`${c.nome}: chi ti rappresenta`}
          testo={`Chi rappresenta chi vive a ${c.nome}? Sindaco, Regione, Parlamento ed Europa in una pagina, con le fonti ufficiali.`}
        />
          <a href="#segui" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-base font-medium text-ink-2 hover:border-ink-3">
            <span aria-hidden>🔔</span> Segui le novità su {c.nome}
          </a>
        </div>
      </header>

      {/* COSA VUOI FARE: tre strade chiare, con pulsanti grandi */}
      <section aria-labelledby="cosa-fare" className="mt-8">
        <h2 id="cosa-fare" className="text-xl font-semibold">
          Cosa vuoi fare?
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {azioni.map((x) => (
            <a
              key={x.href}
              href={x.href}
              data-umami-event="cosa-vuoi-fare"
              data-umami-event-scelta={x.href.slice(1)}
              className="group flex min-h-20 items-center gap-4 rounded-3xl border-2 border-line bg-surface p-4 hover:border-accent focus-visible:border-accent"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl" aria-hidden>
                {x.icona}
              </span>
              <span>
                <span className="block text-xl font-semibold group-hover:text-accent">{x.titolo}</span>
                <span className="block text-base text-ink-3">{x.testo}</span>
              </span>
              <span className="ml-auto text-2xl text-ink-3 group-hover:text-accent" aria-hidden>
                ↓
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* CONTATTI DEL COMUNE */}
      <section id="contatti" aria-labelledby="titolo-contatti" className="mt-10 scroll-mt-24">
        <div style={stileLivello("comune")} className="puntini rounded-[32px] bg-[var(--lv-bg)] p-2 sm:p-3">
          <div className="grid gap-6 rounded-[26px] bg-surface p-5 sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <h2 id="titolo-contatti" className="display text-4xl sm:text-5xl">
                Contatti del Comune di {c.nome}
              </h2>
              {c.contatti ? (
                <dl className="mt-5 space-y-4 text-lg">
                  {c.contatti.pec && (
                    <div>
                      <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">PEC (posta certificata)</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2">
                        <a href={`mailto:${c.contatti.pec}`} className="break-all font-semibold text-accent underline">
                          {c.contatti.pec}
                        </a>
                        <CopiaTesto testo={c.contatti.pec} etichetta="Copia" />
                      </dd>
                    </div>
                  )}
                  {c.contatti.sito && (
                    <div>
                      <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Sito ufficiale</dt>
                      <dd className="mt-1">
                        <a href={c.contatti.sito} target="_blank" rel="noreferrer" className="break-all font-semibold text-accent underline">
                          {c.contatti.sito.replace(/^https?:\/\//, "")} ↗
                        </a>
                        <p className="text-base text-ink-3">Orari degli uffici, numeri di telefono e moduli li trovi qui.</p>
                      </dd>
                    </div>
                  )}
                  {c.contatti.indirizzo && (
                    <div>
                      <dt className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Sede</dt>
                      <dd className="mt-1">{c.contatti.indirizzo}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <Avviso>Contatti non disponibili nell&apos;Indice delle Pubbliche Amministrazioni.</Avviso>
              )}
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-3xl bg-[var(--lv-bg)] p-5">
              <div>
                <p className="text-lg font-semibold">Vuoi scrivere al sindaco?</p>
                <p className="mt-1 text-base text-ink-2">
                  Prepariamo per te un messaggio chiaro, che arriva alla PEC del Comune all&apos;attenzione del sindaco.
                </p>
              </div>
              {c.contatti?.pec && (a?.sindaco || a?.tipo === "commissariata") && (
                <ScriviA
                  nome={a?.sindaco?.nome ?? `Commissario del Comune di ${c.nome}`}
                  tipo="sindaco"
                  pec={c.contatti.pec}
                  allaCortese={`Alla cortese attenzione ${a?.sindaco ? `del Sindaco di ${c.nome}` : `della Commissione straordinaria del Comune di ${c.nome}`}`}
                  comune={c.nome}
                  etichetta={a?.sindaco ? `Scrivi al sindaco ${a.sindaco.nome}` : "Scrivi al Comune"}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 px-3 pt-3 pb-1 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-ink-2">
              <span className="font-semibold">Dati aggiornati: </span>
              <a href={fonte("ipa").url} target="_blank" rel="noreferrer" className="underline decoration-ink-3/40 underline-offset-2">
                Indice delle Pubbliche Amministrazioni
              </a>
              {c.contatti?.aggiornato && <> al {c.contatti.aggiornato}</>}
            </p>
            <SegnalaErrore sezione={`Contatti del Comune di ${c.nome}`} />
          </div>
        </div>
      </section>

      {/* CHI TI RAPPRESENTA: in breve, poi i dettagli */}
      <section id="chi" aria-labelledby="titolo-chi" className="mt-12 scroll-mt-24">
        <h2 id="titolo-chi" className="display text-5xl sm:text-6xl">
          Chi ti rappresenta
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">Quattro livelli, dal Comune all&apos;Europa. Tocca un riquadro per vedere tutti i nomi.</p>
        <nav aria-label="In breve" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sintesi.map((x) => (
            <a
              key={x.id}
              href={`#${x.id}`}
              style={stileLivello(x.id)}
              className="group puntini flex flex-col rounded-[28px] bg-[var(--lv-bg)] p-1.5 transition-transform hover:-translate-y-0.5"
            >
              <span className="flex flex-1 flex-col rounded-[22px] bg-surface p-4">
                <span className="text-sm font-semibold tracking-wider text-[var(--lv)] uppercase">{x.etichetta}</span>
                <span className="mt-3 flex items-center gap-3">
                  <Avatar nome={x.nome} />
                  <span className="min-w-0">
                    <span className="display block text-3xl leading-tight">{x.nome}</span>
                    <span className="block text-base text-ink-3">{x.ruolo}</span>
                  </span>
                </span>
                <span className="mt-3 text-base text-ink-2">{x.extra}</span>
                <span className="mt-auto pt-3 text-base font-semibold text-[var(--lv)] group-hover:underline">Vedi tutti →</span>
              </span>
            </a>
          ))}
        </nav>

        <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
          {/* 1. COMUNE */}
          <Livello
            id="comune"
            numero={1}
            titolo={`Comune di ${c.nome}`}
            sottotitolo="Decide sui servizi vicini a te: rifiuti, strade, asili, urbanistica, tributi locali, anagrafe."
            fonti={[fonte("viminale")]}
          >
            {!a && (
              <Avviso>
                Il Ministero dell&apos;Interno non riporta amministratori in carica per questo Comune (può accadere durante un
                rinnovo o subito dopo le elezioni). Controlla il sito ufficiale del Comune.
              </Avviso>
            )}
            {a?.tipo === "commissariata" && (
              <>
                <Avviso>
                  Il Comune è <strong>commissariato</strong>
                  {a.dataCommissariamento && ` dal ${a.dataCommissariamento}`}: non ci sono sindaco né consiglio eletti in
                  carica. Lo guida {a.commissari.length > 1 ? "una commissione nominata" : "un commissario nominato"} dallo Stato.
                </Avviso>
                <Gruppo titolo={a.commissari.length > 1 ? "Commissione straordinaria" : "Commissario"}>
                  {a.commissari.map((p) => (
                    <PersonaRow key={p.nome} p={p} />
                  ))}
                </Gruppo>
              </>
            )}
            {a?.tipo === "ordinaria" && (
              <>
                {a.sindaco && (
                  <Gruppo titolo={a.sindaco.ruolo} nota={a.dataElezione && `Eletto il ${a.dataElezione}`.replace("Eletto", a.sindaco.sesso === "F" ? "Eletta" : "Eletto")}>
                    <PersonaRow p={a.sindaco} evidenza />
                  </Gruppo>
                )}
                {numeri && (
                  <div className="rounded-3xl border border-line p-4 sm:p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">Il Comune in numeri</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {a.popolazione && (
                        <div className="rounded-2xl bg-[var(--lv-bg)] p-3">
                          <dt className="text-sm text-ink-2">Abitanti</dt>
                          <dd className="display text-4xl">{a.popolazione.toLocaleString("it-IT")}</dd>
                          <dd className="text-xs text-ink-3">al voto del {a.dataElezione?.slice(-4)}</dd>
                        </div>
                      )}
                      {numeri.etaMedia && (
                        <div className="rounded-2xl bg-[var(--lv-bg)] p-3">
                          <dt className="text-sm text-ink-2">Età media degli eletti</dt>
                          <dd className="display text-4xl">{numeri.etaMedia} anni</dd>
                          <dd className="text-xs text-ink-3">{confronto(numeri.etaMedia, mediaRegione.etaMedia)}</dd>
                        </div>
                      )}
                      {numeri.donne !== undefined && (
                        <div className="rounded-2xl bg-[var(--lv-bg)] p-3">
                          <dt className="text-sm text-ink-2">Donne tra gli eletti</dt>
                          <dd className="display text-4xl">{numeri.donne}%</dd>
                          <dd className="text-xs text-ink-3">{confronto(numeri.donne, mediaRegione.donne, "%")}</dd>
                        </div>
                      )}
                      {numeri.laureati !== undefined && (
                        <div className="rounded-2xl bg-[var(--lv-bg)] p-3">
                          <dt className="text-sm text-ink-2">Laureati</dt>
                          <dd className="display text-4xl">{numeri.laureati}%</dd>
                          <dd className="text-xs text-ink-3">{confronto(numeri.laureati, mediaRegione.laureati, "%")}</dd>
                        </div>
                      )}
                    </dl>
                    {prossime && (
                      <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-base">
                        🗳️ <strong>Prossime elezioni comunali:</strong> previste nel <strong>{prossime}</strong> (il mandato dura 5
                        anni; la data esatta la fissa il Ministero dell&apos;Interno).
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink-3">
                      Calcolati su {numeri.persone} persone tra sindaco, giunta e consiglio, con i dati del Ministero dell&apos;Interno.
                    </p>
                  </div>
                )}
                {a.giunta.length > 0 && (
                  <Gruppo titolo={`Giunta comunale (${a.giunta.length})`} nota="Gli assessori, scelti dal sindaco: ognuno segue un settore.">
                    {a.giunta.map((p) => (
                      <PersonaRow key={p.nome + p.ruolo} p={p} />
                    ))}
                  </Gruppo>
                )}
                {a.consiglio.length > 0 && (
                  <Espandibile titolo="Consiglio comunale" conteggio={a.consiglio.length}>
                    {a.consiglio.map((p) => (
                      <PersonaRow key={p.nome + p.ruolo} p={p} />
                    ))}
                  </Espandibile>
                )}
              </>
            )}
            <p className="text-base text-ink-3">
              Come spende i soldi il Comune? Vedi la scheda di {c.nome} su{" "}
              <a className="text-accent underline" href="https://www.dovevannoinostrisoldi.com/comuni" target="_blank" rel="noreferrer">
                DoveVannoINostriSoldi ↗
              </a>
            </p>
          </Livello>

          {/* 2. REGIONE */}
          <Livello
            id="regione"
            numero={2}
            titolo="Regione Campania"
            sottotitolo="Decide su sanità, trasporti regionali, lavoro e formazione, ambiente e fondi europei."
            fonti={[fonte("cr"), fonte("cr-atti"), fonte("giunta"), fonte("wiki-regionali")]}
          >
            {regione.presidente && (
              <Gruppo titolo="Presidente della Regione">
                <PersonaRow p={regione.presidente} evidenza />
              </Gruppo>
            )}
            <div>
              <h3 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">I consiglieri della tua provincia</h3>
              <p className="mt-1 text-base text-ink-2">
                In evidenza i <strong>{consiglieriCirc.length} consiglieri eletti in provincia di {c.provincia}</strong>. Tocca un
                punto o un nome per vedere la scheda e scrivergli.
              </p>
              <div className="mt-3">
                <EmicicloRemoto circoscrizione={circ} comune={c.nome} />
              </div>
            </div>
            <p className="text-base text-ink-3">
              Assessori regionali e tutti i {regione.consiglieri.length} consiglieri:{" "}
              <Link href="/regione/" className="text-accent underline">
                Giunta e Consiglio regionale →
              </Link>
            </p>
            {citazioni.leggi.length + citazioni.atti.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">Di {c.nome} si è parlato in Regione</h3>
                <p className="mt-1 text-base text-ink-3">Leggi e atti che citano il comune nel titolo, dall&apos;inizio della legislatura.</p>
                <div className="mt-2 divide-y divide-line rounded-2xl border border-line">
                  {citazioni.leggi.map((l) => (
                    <LeggeCard key={l.id} legge={l} />
                  ))}
                  {citazioni.atti.slice(0, 5).map((x) => (
                    <AttoRow key={x.id} atto={x} tipi={consiglio.tipi} />
                  ))}
                </div>
                {citazioni.atti.length > 5 && (
                  <div className="mt-2">
                    <Espandibile titolo="Altri atti" conteggio={citazioni.atti.length - 5}>
                      {citazioni.atti.slice(5).map((x) => (
                        <AttoRow key={x.id} atto={x} tipi={consiglio.tipi} />
                      ))}
                    </Espandibile>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-base text-ink-3">
                Nessun atto del Consiglio regionale cita {c.nome} nel titolo in questa legislatura.{" "}
                <Link href="/regione/attivita/" className="text-accent underline">
                  Vedi cosa fanno i consiglieri →
                </Link>
              </p>
            )}
            <Segui
              feed={`${SITE_URL}/comune/${c.istat}/feed.xml`}
              titolo={`Resta aggiornato su ${c.nome}`}
              testo={`Ricevi un avviso quando in Consiglio regionale si parla di ${c.nome} e quando esce una nuova legge regionale.`}
            />
          </Livello>

          {/* 3. PARLAMENTO */}
          <Livello
            id="parlamento"
            numero={3}
            titolo="Parlamento italiano"
            sottotitolo="Camera e Senato fanno le leggi dello Stato. Ogni zona d'Italia elegge direttamente un deputato e un senatore: ecco quelli della tua."
            fonti={[fonte("istat-collegi"), fonte("camera"), fonte("senato")]}
          >
            {!col ? (
              <Avviso>Zone elettorali non disponibili per questo comune.</Avviso>
            ) : (
              <>
                <Gruppo
                  titolo={col.cameraU.length > 1 ? "Alla Camera: i deputati della città" : `Alla Camera: ${femminile(deputatiU[0]) ? "la deputata" : "il deputato"} della tua zona`}
                  nota={
                    col.cameraU.length > 1
                      ? NOTA_COLLEGI_MULTIPLI
                      : `${femminile(deputatiU[0]) ? "Eletta" : "Eletto"} direttamente nella zona (collegio) che comprende il tuo comune.`
                  }
                >
                  {col.cameraU.flatMap((k) =>
                    (parlamento.camera[k] ?? []).map((p) => (
                      <PersonaRow
                        key={k + p.nome}
                        p={{ ...p, ruolo: `${p.ruolo} · ${etichettaCollegio(k)}` }}
                        evidenza={col.cameraU.length === 1}
                        nota={col.cameraU.length > 1 && col.quartieri?.[k] ? `Quartieri: ${col.quartieri[k].join(", ")}` : undefined}
                        azione={<ScriviA nome={p.nome} tipo="deputato" modulo={p.modulo} comune={c.nome} etichetta={`Scrivi a ${p.nome}`} />}
                      />
                    )),
                  )}
                </Gruppo>
                <Gruppo
                  titolo={col.senatoU.length > 1 ? "Al Senato: i senatori della città" : `Al Senato: ${femminile(senatoriU[0]) ? "la senatrice" : "il senatore"} della tua zona`}
                  nota={
                    col.senatoU.length > 1
                      ? NOTA_COLLEGI_MULTIPLI
                      : `${femminile(senatoriU[0]) ? "Eletta" : "Eletto"} direttamente nella zona che comprende il tuo comune.`
                  }
                >
                  {col.senatoU.map((k) => {
                    const p = parlamento.senato.uninominali[k];
                    return p ? (
                      <PersonaRow
                        key={k}
                        p={{ ...p, ruolo: `${p.ruolo} · Campania, collegio ${Number(k.slice(1))}` }}
                        evidenza={col.senatoU.length === 1}
                        azione={<ScriviA nome={p.nome} tipo="senatore" email={p.email} comune={c.nome} etichetta={`Scrivi a ${p.nome}`} />}
                      />
                    ) : null;
                  })}
                </Gruppo>
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-ink-3 uppercase">Gli altri eletti della tua area</h3>
                  <p className="mt-1 mb-2 text-base text-ink-3">Eletti con le liste dei partiti (sistema proporzionale) nella tua area.</p>
                  <div className="space-y-2">
                    {col.cameraP.map((k) => (
                      <Espandibile key={k} titolo={`Deputati · ${etichettaCollegio(k).replace("collegio", "area")}`} conteggio={(parlamento.camera[k] ?? []).length}>
                        {(parlamento.camera[k] ?? []).map((p) => (
                          <PersonaRow
                            key={p.nome}
                            p={p}
                            azione={<ScriviA nome={p.nome} tipo="deputato" modulo={p.modulo} comune={c.nome} etichetta={`Scrivi a ${p.nome}`} />}
                          />
                        ))}
                      </Espandibile>
                    ))}
                    <Espandibile titolo="Senatori eletti con le liste in Campania" conteggio={parlamento.senato.proporzionale.length}>
                      {parlamento.senato.proporzionale.map((p) => (
                        <PersonaRow
                          key={p.nome}
                          p={p}
                          azione={<ScriviA nome={p.nome} tipo="senatore" email={p.email} comune={c.nome} etichetta={`Scrivi a ${p.nome}`} />}
                        />
                      ))}
                    </Espandibile>
                  </div>
                </div>
              </>
            )}
            <p className="text-base text-ink-3">
              Voti, presenze e incarichi dei parlamentari:{" "}
              <a className="text-accent underline" href="https://www.dovevannoinostrisoldi.com/politici" target="_blank" rel="noreferrer">
                Atlante della politica su DoveVannoINostriSoldi ↗
              </a>
            </p>
          </Livello>

          {/* 4. EUROPA */}
          <Livello
            id="europa"
            numero={4}
            titolo="Parlamento europeo"
            sottotitolo="La Campania vota insieme ad Abruzzo, Molise, Puglia, Basilicata e Calabria (circoscrizione Sud). Gli eurodeputati votano le leggi e il bilancio dell'Unione europea."
            fonti={[fonte("pe")]}
          >
            <Espandibile titolo="Gli eurodeputati del Sud Italia" conteggio={europa.eurodeputati.length}>
              {europa.eurodeputati.map((p) => (
                <PersonaRow
                  key={p.nome}
                  p={p}
                  azione={<ScriviA nome={p.nome} tipo="eurodeputato" email={p.email} comune={c.nome} etichetta={`Scrivi a ${p.nome}`} />}
                />
              ))}
            </Espandibile>
          </Livello>
        </div>
      </section>

      {/* HO UN PROBLEMA */}
      <section id="problemi" aria-labelledby="titolo-problemi" className="mt-14 scroll-mt-24">
        <h2 id="titolo-problemi" className="display text-5xl sm:text-6xl">
          Ho un problema: a chi mi rivolgo?
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-2">
          Scegli il tipo di problema: ti diciamo chi decide, il primo passo e a chi scrivere a {c.nome}.
        </p>
        <div className="mt-6">
          <GuidaProblemi
            ctx={{ comune: c, sindaco: a?.sindaco, consiglieriProvincia: consiglieriCirc.length, deputati: deputatiU, senatori: senatoriU }}
          />
        </div>
      </section>

      {/* CHIEDI UN DOCUMENTO (accesso civico) */}
      <section id="documento" aria-labelledby="titolo-documento" className="mt-14 scroll-mt-24">
        <h2 id="titolo-documento" className="display text-5xl sm:text-6xl">
          Chiedi un documento
        </h2>
        <p className="mt-2 max-w-3xl text-lg text-ink-2">
          Quanto è costata quella strada? Cosa dice il contratto dei rifiuti? Con l&apos;<strong>accesso civico</strong> puoi chiedere al
          Comune, all&apos;ASL o alla Regione documenti e dati che hanno già. Ti prepariamo la richiesta, pronta da inviare.
        </p>
        <div className="mt-6 rounded-[32px] border-2 border-line bg-surface p-4 sm:p-6">
          {enti.length > 0 ? (
            <ChiediDocumento enti={enti} luogo={c.nome} />
          ) : (
            <Avviso>Indirizzi PEC non disponibili: usa il modulo per l&apos;accesso civico sul sito del Comune.</Avviso>
          )}
        </div>
        <div className="mt-6">
          <AccessoCivicoInfo />
        </div>
      </section>

      {/* COME SI È VOTATO */}
      <section id="voto" aria-labelledby="titolo-voto" className="mt-14 scroll-mt-24">
        <h2 id="titolo-voto" className="display text-5xl sm:text-6xl">
          Come si è votato a {c.nome}
        </h2>
        <p className="mt-2 max-w-3xl text-lg text-ink-2">
          I risultati delle ultime elezioni nel comune e quante persone sono andate a votare, confrontate con la media della Campania.
        </p>
        <div className="mt-6">
          <RisultatiElezioni elezioni={c.elezioni} comune={c.nome} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-2">
            <span className="font-semibold">Fonte: </span>
            <a href={fonte("eligendo").url} target="_blank" rel="noreferrer" className="underline decoration-ink-3/40 underline-offset-2">
              Ministero dell&apos;Interno, open data delle elezioni (Eligendo)
            </a>
            . Alle politiche e alle europee contano i voti alle liste; i comuni divisi in più collegi sono sommati.
          </p>
          <SegnalaErrore sezione={`Risultati elettorali di ${c.nome}`} />
        </div>
      </section>

      <div className="mt-14 flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:flex-row lg:items-center">
        <p className="text-lg font-semibold lg:w-64">Cerca un altro comune</p>
        <div className="w-full max-w-2xl">
          <ComuneSearch etichetta="Comune, frazione o CAP" />
        </div>
      </div>
    </div>
  );
}
