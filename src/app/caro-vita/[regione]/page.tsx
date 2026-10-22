import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caroVita, regioniCaroVita, TAPPE_MISURA } from "@/lib/caroVita";
import { getConsiglio, regioni } from "@/lib/data";
import { dataLunga, dellaRegione, slugConsigliere } from "@/lib/format";
import type { Atto, Legge } from "@/lib/types";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Condividi } from "@/components/Condividi";
import { AvvisoArchivio, Cronologia, Misura } from "@/components/CaroVita";
import { AttiCaroVita, ICONE_TEMI } from "@/components/AttiCaroVita";
import { FontiNote } from "@/components/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return regioniCaroVita.map((regione) => ({ regione }));
}

export async function generateMetadata({
  params,
}: PageProps<"/caro-vita/[regione]">): Promise<Metadata> {
  const { regione } = await params;
  const reg = regioni.find((r) => r.slug === regione);
  return reg
    ? {
        title: `Caro vita: cosa fa la Regione ${reg.nome}`,
        description: `Proteste e caro vita: gli aiuti della Regione ${reg.nome} e a che punto sono${
          reg.inChiaro
            ? ", cosa si discute in Consiglio regionale su carburanti, trasporti, agricoltura, casa e redditi"
            : ""
        } e le notizie, con le fonti.`,
      }
    : {};
}

/** "Carburanti, energia e bollette" → "Carburanti": nei filtri e sulle schede basta la prima parola chiave. */
const nomeBreve = (nome: string) =>
  nome.split(",")[0].replace(/ e pendolari$/, "");

/** Tre mesi prima della data dell'ultimo aggiornamento: da lì in poi un atto conta come recente. */
const treMesiPrima = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 3);
  return d.toISOString().slice(0, 10);
};

const plurale = (n: number, uno: string, tanti: string) =>
  `${n} ${n === 1 ? uno : tanti}`;

export default async function CaroVitaRegionePage({
  params,
}: PageProps<"/caro-vita/[regione]">) {
  const slug = (await params).regione;
  const reg = regioni.find((r) => r.slug === slug);
  const contesto = caroVita.contesto.regioni[slug];
  if (!reg || !contesto) notFound();
  const nome = reg.nome;
  // leggi e atti solo dove il Consiglio è in chiaro; altrove la pagina mostra aiuti, notizie e a chi rivolgersi
  const cr = getConsiglio(slug);
  const sel = caroVita.regioni[slug];
  const consiglio = cr && sel ? cr.consiglio : undefined;

  const temi = caroVita.temi.map((t) => ({
    id: t.id,
    nome: t.nome,
    breve: nomeBreve(t.nome),
  }));
  const atti = consiglio
    ? (consiglio.atti
        .filter((a) => sel.atti[a.id])
        .sort((a, b) => b.data.localeCompare(a.data)) as Atto[])
    : [];
  const leggi = consiglio
    ? (consiglio.leggi
        .filter((l) => sel.leggi[l.id])
        .sort((a, b) => b.data.localeCompare(a.data)) as Legge[])
    : [];
  const approvati = atti.filter((a) => a.esito === "approvata").length;
  const respinti = atti.filter(
    (a) => a.esito === "non-approvata" || a.esito === "respinta",
  ).length;

  // misure della Regione (con la tappa raggiunta) e altre notizie dalla Regione (incontri, richieste)
  const misure = contesto.regione.filter((f) => f.stato);
  const altreDallaRegione = contesto.regione.filter((f) => !f.stato);
  const misureAperte = misure.filter((m) => m.stato === "aperta");

  // chi ha presentato (primo firmatario) atti su questi temi: in ordine alfabetico per cognome, senza conteggi,
  // perché una classifica premierebbe chi presenta più interrogazioni (di solito l'opposizione)
  const firmatari = new Map<string, { nome: string; username: string }>();
  for (const a of atti) {
    const primo = a.firmatari[0];
    if (primo?.username)
      firmatari.set(primo.username, {
        nome: primo.nome,
        username: primo.username,
      });
  }
  // il cognome è la parte dell'identificativo prima del punto ("de-luca.cateno", "ALAIA.VIN"): vale anche per i cognomi composti
  const cognome = (username: string) =>
    username.split(".")[0].replace(/[-_]/g, " ");
  const proponenti = [...firmatari.values()].sort(
    (a, b) =>
      cognome(a.username).localeCompare(cognome(b.username), "it", {
        sensitivity: "base",
      }) || a.nome.localeCompare(b.nome, "it"),
  );
  const gruppoDi = (username: string) => {
    const c = cr?.regione.consiglieri.find((x) => x.username === username);
    return c?.gruppo
      ? cr?.regione.gruppi.find((g) => g.nome === c.gruppo)
      : undefined;
  };

  const indice = [
    ["breve", "In breve"],
    ...(contesto.regione.length ? [["aiuti", "Aiuti"]] : []),
    ...(consiglio ? [["consiglio", "Consiglio"]] : []),
    ["notizie", "Notizie"],
    ["tu", "Cosa puoi fare"],
  ];

  return (
    <div className="contenitore py-8">
      <AvvisoArchivio />
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
        <Link href="/caro-vita/" className="hover:text-ink">
          ← Speciale caro vita
        </Link>
        <Link href={`/regione/${slug}/`} className="hover:text-ink">
          {cr
            ? `Consiglio regionale ${dellaRegione(nome)}`
            : `Regione ${nome}: giunta e consiglieri`}
        </Link>
      </nav>

      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-accent uppercase">
            Speciale caro vita
          </p>
          <h1 className="display mt-1.5 text-4xl sm:text-5xl">
            Cosa fa la Regione {nome}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink-2">
            {consiglio
              ? "Aiuti, decisioni e atti del Consiglio regionale sul caro vita, in una pagina."
              : "Aiuti della Regione, notizie e a chi rivolgerti sul caro vita."}
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Aggiornato al {dataLunga(caroVita.aggiornato)} · ogni fatto è
            confermato da almeno due fonti
          </p>
        </div>
        <Condividi
          path={`/caro-vita/${slug}/`}
          titolo={`Caro vita: cosa fa la Regione ${nome}`}
          testo={`Caro vita: gli aiuti della Regione ${nome} e a che punto sono, con le fonti.`}
        />
      </header>

      {/* indice sempre a portata di mano, sotto l'intestazione del sito */}
      <nav
        aria-label="Sezioni della pagina"
        className="sticky top-[var(--altezza-header)] z-20 -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-line/70 bg-bg/90 px-4 py-2.5 backdrop-blur sm:mx-0 sm:px-0"
      >
        {indice.map(([id, etichetta]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 hover:border-ink-3 hover:text-ink"
          >
            {etichetta}
          </a>
        ))}
      </nav>

      <div className="space-y-12">
        {/* In breve: la risposta in pochi secondi */}
        <section id="breve" className="mt-8 scroll-mt-36">
          <h2 className="display text-3xl">In breve</h2>
          <div
            className={`mt-4 grid gap-3 ${consiglio ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {misure.length > 0 ? (
              <a
                href="#aiuti"
                className="rounded-[22px] border border-warn/25 bg-warn-soft p-5 hover:border-warn/50"
              >
                <p className="display text-6xl leading-none">{misure.length}</p>
                <p className="mt-1 font-semibold">
                  {misure.length === 1
                    ? "aiuto della Regione"
                    : "aiuti della Regione"}
                </p>
                <p className="mt-1.5 text-sm text-ink-2">
                  {TAPPE_MISURA.map(
                    (t) =>
                      [
                        t,
                        misure.filter((m) => m.stato === t.id).length,
                      ] as const,
                  )
                    .filter(([, n]) => n > 0)
                    .map(([t, n]) =>
                      t.id === "aperta"
                        ? `${n} con domande aperte`
                        : `${n} ${t.id === "annunciata" ? (n === 1 ? "annunciato" : "annunciati") : n === 1 ? "approvato" : "approvati"}`,
                    )
                    .join(" · ")}
                  {misureAperte.length === 0 && (
                    <strong className="block text-ink">
                      Nessuno ha ancora le domande aperte.
                    </strong>
                  )}
                </p>
              </a>
            ) : (
              <div className="rounded-[22px] border border-line bg-surface p-5">
                <p className="font-semibold">Aiuti della Regione</p>
                <p className="mt-1.5 text-sm text-ink-2">
                  Nelle fonti che abbiamo consultato non risultano misure
                  regionali specifiche in queste settimane. Le misure nazionali
                  sono nel{" "}
                  <a
                    href="#notizie"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    quadro d&apos;Italia
                  </a>
                  .
                </p>
              </div>
            )}
            {consiglio && (
              <div className="rounded-[22px] border border-[var(--lv-regione)]/20 bg-[var(--lv-regione-bg)] p-5">
                <p className="display text-6xl leading-none">{atti.length}</p>
                <p className="mt-1 font-semibold">
                  atti in Consiglio su questi temi
                </p>
                {atti.length > 0 && approvati + respinti === 0 && (
                  <p className="mt-2 text-sm text-ink-2">
                    {consiglio.tipi
                      .map(
                        (t) =>
                          [
                            t,
                            atti.filter((a) => a.tipo === t.id).length,
                          ] as const,
                      )
                      .filter(([, n]) => n > 0)
                      .map(
                        ([t, n]) =>
                          `${n} ${(n === 1 ? t.nome : t.plurale).toLowerCase()}`,
                      )
                      .join(" · ")}
                  </p>
                )}
                {atti.length > 0 && approvati + respinti > 0 && (
                  <>
                    <div
                      className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface"
                      aria-hidden
                    >
                      <span
                        className="bg-accent"
                        style={{ width: `${(approvati / atti.length) * 100}%` }}
                      />
                      <span
                        className="bg-warn"
                        style={{ width: `${(respinti / atti.length) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
                      <span>
                        <span
                          aria-hidden
                          className="mr-1 inline-block size-2 rounded-full bg-accent"
                        />
                        {plurale(approvati, "approvato", "approvati")}
                      </span>
                      {respinti > 0 && (
                        <span>
                          <span
                            aria-hidden
                            className="mr-1 inline-block size-2 rounded-full bg-warn"
                          />
                          {plurale(respinti, "respinto", "respinti")}
                        </span>
                      )}
                      <span>
                        <span
                          aria-hidden
                          className="mr-1 inline-block size-2 rounded-full bg-surface ring-1 ring-line"
                        />
                        {atti.length - approvati - respinti} con esito non
                        indicato
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}
            {consiglio ? (
              <div className="rounded-[22px] border border-line bg-surface p-5">
                <p className="display text-6xl leading-none">{leggi.length}</p>
                <p className="mt-1 font-semibold">
                  {leggi.length === 1
                    ? "legge in vigore collegata"
                    : "leggi in vigore collegate"}
                </p>
                <p className="mt-1.5 text-sm text-ink-2">
                  {leggi.length
                    ? "Leggi regionali che toccano questi temi, spiegate in parole semplici."
                    : "Nessuna legge regionale specifica su questi temi in questa legislatura."}
                </p>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-line p-5">
                <p className="font-semibold">
                  Il Consiglio regionale {dellaRegione(nome)} non è ancora in
                  chiaro
                </p>
                <p className="mt-1.5 text-sm text-ink-2">
                  Leggi e atti arriveranno con le prossime regioni. Intanto
                  trovi giunta e consiglieri con i contatti.
                </p>
                <p className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    href={`/regione/${slug}/`}
                    className="rounded-full bg-ink px-3.5 py-1.5 font-medium text-bg hover:opacity-90"
                  >
                    Giunta e consiglieri →
                  </Link>
                  {reg.consiglio && (
                    <a
                      href={reg.consiglio.sito}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-3.5 py-1.5 text-ink-2 hover:border-ink-3"
                    >
                      Sito del Consiglio ↗
                    </a>
                  )}
                </p>
              </div>
            )}
          </div>
          <a
            href="#tu"
            className="mt-3 flex items-center justify-between gap-4 rounded-[22px] bg-accent px-5 py-4 text-accent-ink hover:opacity-95"
          >
            <span>
              <span className="block text-lg font-semibold">
                Chi ti rappresenta in Regione?
              </span>
              <span className="block text-sm opacity-90">
                {consiglio
                  ? "Trova i consiglieri eletti nella tua provincia, con i contatti"
                  : "Trova presidente, giunta e consiglieri, con i contatti"}
              </span>
            </span>
            <span aria-hidden className="text-2xl">
              →
            </span>
          </a>
        </section>

        {/* Aiuti della Regione: a che punto è ogni misura */}
        {contesto.regione.length > 0 && (
          <section id="aiuti" className="scroll-mt-36">
            <h2 className="display text-3xl">Aiuti della Regione</h2>
            <p className="mt-1 text-sm text-ink-3">
              Dall&apos;annuncio alle domande: a che punto è ogni misura. Un
              annuncio diventa un aiuto solo quando sono aperte le domande.
            </p>
            {misure.length > 0 ? (
              <ul className="mt-4 grid gap-3 lg:grid-cols-2">
                {misure.map((m) => (
                  <Misura key={m.titolo} misura={m} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-2">
                Nelle fonti che abbiamo consultato non risultano misure
                regionali specifiche annunciate in queste settimane.
              </p>
            )}
            {altreDallaRegione.length > 0 && (
              <div className="mt-4 rounded-[22px] bg-surface-2 p-4 sm:p-5">
                <h3 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
                  Altro dalla Regione
                </h3>
                <Cronologia fatti={altreDallaRegione} />
              </div>
            )}
          </section>
        )}

        {consiglio && (
          <section id="consiglio" className="scroll-mt-36">
            <h2 className="display text-3xl">Cosa si discute in Consiglio</h2>
            <p className="mt-1 text-sm text-ink-3">
              Mozioni, interrogazioni e proposte di legge su carburanti,
              trasporti, agricoltura, casa e redditi, dalla più recente. Tocca
              un tema per filtrare.
            </p>
            {atti.length > 0 ? (
              <AttiCaroVita
                atti={atti}
                temaDi={sel.atti}
                temi={temi}
                tipi={consiglio.tipi}
                regione={slug}
                recentiDal={treMesiPrima(caroVita.aggiornato)}
              />
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-2">
                Nessun atto su questi temi tra quelli pubblicati dal Consiglio.
              </p>
            )}

            {leggi.length > 0 && (
              <>
                <h3 className="mt-8 text-xs font-semibold tracking-wider text-ink-3 uppercase">
                  Leggi in vigore
                </h3>
                <div className="mt-2 grid items-start gap-3 lg:grid-cols-2">
                  {leggi.map((l) => {
                    const t = temi.find((x) => x.id === sel.leggi[l.id]);
                    return (
                      <details
                        key={l.id}
                        className="group rounded-[22px] border border-line bg-surface"
                      >
                        <summary className="cursor-pointer list-none p-4 sm:p-5">
                          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent">
                              Legge n. {l.numero}
                            </span>
                            <time dateTime={l.data}>{dataLunga(l.data)}</time>
                            {t && (
                              <span className="ml-auto">
                                <span aria-hidden>{ICONE_TEMI[t.id]}</span>{" "}
                                {t.breve}
                              </span>
                            )}
                          </p>
                          <p className="mt-2 line-clamp-3 group-open:line-clamp-none">
                            {l.riassunto?.testo ?? l.oggetto ?? l.intestazione}
                          </p>
                          <span className="mt-2 inline-block text-sm font-semibold text-accent group-open:hidden">
                            Leggi tutto ›
                          </span>
                        </summary>
                        <div className="-mt-2 px-4 pb-4 sm:px-5 sm:pb-5">
                          {l.riassunto && (
                            <>
                              <p className="text-sm text-ink-3">
                                <span className="font-medium text-ink-2">
                                  Titolo ufficiale:
                                </span>{" "}
                                {l.oggetto ?? l.intestazione}
                              </p>
                              <p className="mt-2 inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink-3">
                                ✦ Riassunto generato con l&apos;AI dal testo
                                ufficiale: fa fede la legge
                              </p>
                            </>
                          )}
                          <p className="mt-3 flex flex-wrap gap-2 text-sm">
                            {l.pdf && (
                              <a
                                href={l.pdf}
                                className="rounded-full bg-ink px-3 py-1.5 font-medium text-bg hover:opacity-90"
                              >
                                Testo della legge ↓
                              </a>
                            )}
                            {l.url !== l.pdf && (
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-line px-3 py-1.5 text-ink-2 hover:border-ink-3"
                              >
                                Scheda ufficiale ↗
                              </a>
                            )}
                          </p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        <section id="notizie" className="scroll-mt-36">
          <h2 className="display text-3xl">Cosa sta succedendo</h2>
          <p className="mt-1 text-sm text-ink-3">
            Le notizie principali in {nome}, con le fonti.
          </p>
          {contesto.fatti.length ? (
            <Cronologia fatti={contesto.fatti} />
          ) : (
            <p className="mt-4 text-sm text-ink-2">
              Nelle fonti che abbiamo consultato non risultano proteste
              specifiche in questa regione: qui sotto il quadro nazionale.
            </p>
          )}
          <details
            open={!contesto.fatti.length}
            className="mt-5 rounded-[22px] bg-surface-2 p-4 sm:p-5"
          >
            <summary className="cursor-pointer text-sm font-semibold text-ink-2 hover:text-ink">
              Il quadro nel resto d&apos;Italia
            </summary>
            <Cronologia fatti={caroVita.contesto.generale} />
          </details>
        </section>

        <section id="tu" className="scroll-mt-36">
          <h2 className="display text-3xl">Cosa puoi fare tu</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-[22px] bg-[var(--lv-regione-bg)] p-5">
              <p aria-hidden className="text-2xl">
                ✉️
              </p>
              <p className="mt-1 font-semibold">
                {consiglio
                  ? "Scrivi ai consiglieri della tua provincia"
                  : "Trova chi ti rappresenta in Regione"}
              </p>
              <p className="mt-1 text-sm text-ink-2">
                {consiglio
                  ? "Cerca il tuo comune: trovi i consiglieri regionali eletti nella tua zona, con i contatti e un messaggio già impostato. Il sito non invia e non salva nulla."
                  : "Cerca il tuo comune: trovi presidente, giunta e consiglieri regionali con i contatti ufficiali, e chi ti rappresenta in Comune, in Parlamento e in Europa."}
              </p>
              <div className="mt-3">
                <ComuneSearch sezione="regione" />
              </div>
            </div>
            {consiglio && (
              <div className="rounded-[22px] bg-[var(--lv-regione-bg)] p-5">
                <p aria-hidden className="text-2xl">
                  ❓
                </p>
                <p className="mt-1 font-semibold">
                  Chiedi a che punto è un atto
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  Sotto ogni atto trovi chi l&apos;ha presentato: puoi
                  chiedergli se la Giunta ha risposto o se la mozione è stata
                  votata.
                </p>
              </div>
            )}
            <div className="rounded-[22px] bg-[var(--lv-regione-bg)] p-5">
              <p aria-hidden className="text-2xl">
                📋
              </p>
              <p className="mt-1 font-semibold">
                Chiedi come accedere agli aiuti
              </p>
              <p className="mt-1 text-sm text-ink-2">
                Per bandi e contributi regionali gli uffici della Regione e le
                associazioni di categoria sanno indicare requisiti e scadenze.
                Prezzo del carburante e accise sono invece decisioni nazionali:
                per deputati e senatori del tuo collegio cerca il tuo comune.
              </p>
            </div>
          </div>

          {proponenti.length > 0 && (
            <details className="mt-4 rounded-[22px] border border-line bg-surface p-4 sm:p-5">
              <summary className="cursor-pointer font-semibold">
                Chi ha presentato atti su questi temi{" "}
                <span className="text-sm font-normal text-ink-3">
                  (in ordine alfabetico)
                </span>
              </summary>
              <p className="mt-1 text-sm text-ink-3">
                I consiglieri che hanno presentato per primi gli atti di questa
                pagina. Puoi scrivere loro per chiedere a che punto sono.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {proponenti.map((c) => {
                  const g = gruppoDi(c.username);
                  return (
                    <li key={c.username}>
                      <Link
                        href={`/regione/${slug}/consiglieri/${slugConsigliere(c.username)}/`}
                        className="flex h-full flex-col justify-center rounded-2xl border border-line bg-surface px-4 py-3 hover:border-ink-3"
                      >
                        <span className="font-medium">{c.nome}</span>
                        {g && (
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: g.colore }}
                            />
                            {g.nome}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-1">
        <p className="text-xs text-ink-3">
          Notizie, misure e selezione di leggi e atti a cura della redazione,
          aggiornate al {dataLunga(caroVita.aggiornato)}. Ti sembra che manchi
          qualcosa? Segnalacelo.
        </p>
        {cr && <FontiNote fonti={[cr.fonti.atti]} />}
      </div>
    </div>
  );
}
