import Link from "next/link";
import { caroVita, regioniCaroVita, specialeAttivo, type Fatto } from "@/lib/caroVita";
import { getConsiglio } from "@/lib/data";
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
  const nomeRegione = regione && getConsiglio(regione)?.nome;
  return (
    <Link
      href={regione ? `/caro-vita/${regione}/` : "/caro-vita/"}
      className="flex flex-col gap-1 rounded-[22px] border border-accent/30 bg-accent-soft px-5 py-4 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <span>
        <span className="text-xs font-semibold tracking-wider text-accent uppercase">Speciale caro vita</span>
        <span className="mt-0.5 block font-semibold text-ink">
          {nomeRegione ? `Proteste e caro vita: cosa fa la Regione ${nomeRegione}` : "Proteste e caro vita: cosa fanno davvero le Regioni"}
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
