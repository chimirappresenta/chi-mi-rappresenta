import Link from "next/link";
import { caroVita, COME_SI_OTTIENE, nomeTappa, regioniCaroVita, specialeAttivo, TAPPE_MISURA, type Fatto } from "@/lib/caroVita";
import { regioni } from "@/lib/data";
import { dataLunga } from "@/lib/format";

/** Elenco di fatti con le loro fonti: solo cronaca verificata, nessun giudizio. */
export function Fatti({ fatti, colonne = 2 }: { fatti: Fatto[]; colonne?: 2 | 4 }) {
  return (
    <ul className={`mt-3 grid gap-5 ${colonne === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
      {fatti.map((f) => (
        <li key={f.titolo}>
          <p className="font-semibold">{f.titolo}</p>
          <p className="mt-1 text-sm text-ink-2">{f.testo}</p>
          <p className="mt-1.5 text-xs text-ink-3">
            Fonti:{" "}
            {f.fonti.map((s, i) => (
              <span key={s.url}>
                {i > 0 && " · "}
                <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {s.nome}
                </a>
              </span>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Richiamo allo speciale (home e pagine delle regioni coperte): sparisce da solo quando lo speciale è chiuso. */
export function BannerCaroVita({ regione }: { regione?: string }) {
  if (!specialeAttivo || (regione && !regioniCaroVita.includes(regione))) return null;
  const nomeRegione = regione && regioni.find((r) => r.slug === regione)?.nome;
  return (
    <Link
      href={regione ? `/caro-vita/${regione}/` : "/caro-vita/"}
      className="flex flex-col gap-1 rounded-[22px] border border-accent/30 bg-accent-soft px-5 py-4 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <span>
        <span className="text-xs font-semibold tracking-wider text-accent uppercase">Speciale caro vita</span>
        <span className="mt-0.5 block font-semibold text-ink">
          {nomeRegione ? `Proteste e caro vita: cosa fa la Regione ${nomeRegione}` : "Proteste e caro vita: cosa fanno le Regioni"}
        </span>
        <span className="block text-sm text-ink-2">I fatti con le fonti, le misure annunciate, le leggi e gli atti del Consiglio.</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-accent">Apri lo speciale →</span>
    </Link>
  );
}

/** Avviso in cima alle pagine dello speciale dopo la chiusura: le notizie si fermano a quella data. */
export function AvvisoArchivio() {
  if (!caroVita.chiuso) return null;
  return (
    <p className="mb-6 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
      <span className="font-semibold text-ink">Speciale chiuso il {dataLunga(caroVita.chiuso)}.</span> Le notizie si fermano a quella data;
      leggi e atti del Consiglio restano validi, ma per gli aggiornamenti consulta le pagine della tua Regione.
    </p>
  );
}

function Fonti({ fonti }: { fonti: Fatto["fonti"] }) {
  return (
    <p className="mt-1.5 text-xs text-ink-3">
      Fonti:{" "}
      {fonti.map((s, i) => (
        <span key={s.url}>
          {i > 0 && " · "}
          <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            {s.nome}
          </a>
        </span>
      ))}
    </p>
  );
}

/** Misura della Regione con il percorso a tappe: annunciata → approvata → domande aperte. */
export function Misura({ misura }: { misura: Fatto }) {
  const raggiunta = TAPPE_MISURA.findIndex((t) => t.id === misura.stato);
  return (
    <li className="rounded-[22px] border border-line bg-surface p-4 sm:p-5">
      <p className="text-lg font-semibold leading-snug">{misura.titolo}</p>
      {misura.importo && <p className="text-sm font-semibold text-warn">{misura.importo}</p>}
      <ol className="mt-4 mb-3 flex items-start" aria-label={`A che punto è: ${misura.stato ? nomeTappa(misura.stato, misura.accesso) : ""}`}>
        {TAPPE_MISURA.map((t, i) => (
          <li key={t.id} className={`flex items-start ${i > 0 ? "flex-1" : ""}`}>
            {i > 0 && <span aria-hidden className={`mt-3.5 h-0.5 flex-1 ${i <= raggiunta ? "bg-warn" : "bg-line"}`} />}
            <span className={`flex w-20 flex-col items-center gap-1.5 text-center text-xs font-semibold ${i <= raggiunta ? "text-warn" : "text-ink-3"}`}>
              <span
                aria-hidden
                className={`grid size-7 place-items-center rounded-full border-2 text-sm ${i <= raggiunta ? "border-warn bg-warn text-white" : "border-line bg-surface"}`}
              >
                {i <= raggiunta ? "✓" : ""}
              </span>
              {nomeTappa(t.id, misura.accesso)}
              {i === raggiunta && <span className="sr-only"> (tappa raggiunta)</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-ink-2">
        <span aria-hidden>{COME_SI_OTTIENE[misura.accesso ?? "nd"].icona}</span> {COME_SI_OTTIENE[misura.accesso ?? "nd"].testo}
      </p>
      <p className="text-sm text-ink-2">{misura.testo}</p>
      <Fonti fonti={misura.fonti} />
    </li>
  );
}

/** Notizie come cronologia: un pallino per fatto, con le fonti. */
export function Cronologia({ fatti }: { fatti: Fatto[] }) {
  return (
    <ul className="mt-4 space-y-5 border-l-2 border-line pl-5">
      {fatti.map((f) => (
        <li key={f.titolo} className="relative">
          <span aria-hidden className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-ink-3 bg-bg" />
          <p className="font-semibold">{f.titolo}</p>
          <p className="mt-0.5 text-sm text-ink-2">{f.testo}</p>
          <Fonti fonti={f.fonti} />
        </li>
      ))}
    </ul>
  );
}

/** Tappa in piccolo, per gli elenchi: tre pallini (●●○) e il nome della tappa. */
export function TappaMini({ stato, accesso }: { stato: NonNullable<Fatto["stato"]>; accesso?: Fatto["accesso"] }) {
  const raggiunta = TAPPE_MISURA.findIndex((t) => t.id === stato);
  const fatta = stato === "disponibile" ? "bg-accent" : "bg-warn";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold ${stato === "disponibile" ? "text-accent" : "text-warn"}`}>
      <span aria-hidden className="flex gap-0.5">
        {TAPPE_MISURA.map((t, i) => (
          <span key={t.id} className={`size-2 rounded-full ${i <= raggiunta ? fatta : "bg-line"}`} />
        ))}
      </span>
      {nomeTappa(stato, accesso)}
      <span className="sr-only">
        {" "}
        (tappa {raggiunta + 1} di {TAPPE_MISURA.length})
      </span>
    </span>
  );
}
