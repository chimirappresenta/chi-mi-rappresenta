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

/** Cosa succede dopo la tappa raggiunta, o cosa si può fare già adesso. */
function passoSuccessivo(m: Fatto): { etichetta: string; testo: string } | null {
  if (m.stato === "annunciata") return { etichetta: "Prossimo passo", testo: "l'approvazione con una delibera di Giunta o una legge." };
  if (m.stato === "approvata")
    return {
      etichetta: "Prossimo passo",
      testo:
        m.accesso === "domanda"
          ? "l'apertura delle domande."
          : m.accesso === "automatico"
            ? "l'avvio dei pagamenti, senza bisogno di domanda."
            : "le regole per ottenerlo: con una domanda o in automatico.",
    };
  if (m.stato === "disponibile")
    return m.accesso === "automatico"
      ? { etichetta: "Pagamenti partiti", testo: "l'aiuto arriva senza domanda." }
      : { etichetta: "Si può chiedere ora", testo: "dove e fino a quando è scritto qui sotto." };
  return null;
}

/** Misura della Regione con la barra a tre tappe: annunciata → approvata → disponibile. */
export function Misura({ misura }: { misura: Fatto }) {
  const raggiunta = TAPPE_MISURA.findIndex((t) => t.id === misura.stato);
  const fatta = misura.stato === "disponibile" ? "bg-accent" : "bg-warn";
  const colore = misura.stato === "disponibile" ? "text-accent" : "text-warn";
  const passo = passoSuccessivo(misura);
  return (
    <li className="rounded-[22px] border border-line bg-surface p-4 sm:p-5">
      <p className="text-lg leading-snug font-semibold">{misura.titolo}</p>
      {misura.importo && <p className="text-sm font-semibold text-warn">{misura.importo}</p>}
      <div className="mt-4" role="img" aria-label={`A che punto è: ${misura.stato ? nomeTappa(misura.stato, misura.accesso) : ""}, tappa ${raggiunta + 1} di ${TAPPE_MISURA.length}`}>
        <div aria-hidden className="grid grid-cols-3 gap-1.5">
          {TAPPE_MISURA.map((t, i) => (
            <span key={t.id} className={`h-2.5 rounded-full ${i <= raggiunta ? fatta : "bg-surface-2"}`} />
          ))}
        </div>
        <div aria-hidden className="mt-1.5 grid grid-cols-3 gap-1.5 text-xs font-medium text-ink-3">
          {TAPPE_MISURA.map((t, i) => (
            <span key={t.id} className={i === raggiunta ? `font-bold ${colore}` : ""}>
              {i === raggiunta && "● "}
              {nomeTappa(t.id, misura.accesso)}
            </span>
          ))}
        </div>
      </div>
      {passo && (
        <p className="mt-3 border-l-[3px] border-line pl-2.5 text-sm text-ink-2">
          <span className="font-semibold text-ink">{passo.etichetta}:</span> {passo.testo}
        </p>
      )}
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-ink-2">
        <span aria-hidden>{COME_SI_OTTIENE[misura.accesso ?? "nd"].icona}</span> {COME_SI_OTTIENE[misura.accesso ?? "nd"].testo}
      </p>
      <p className="mt-3 text-sm text-ink-2">{misura.testo}</p>
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
