import Link from "next/link";
import type { ReactNode } from "react";
import { BannerCaroVita } from "./CaroVita";
import { Condividi } from "./Condividi";
import { RegioneNav } from "./RegioneNav";

/** Intestazione comune alle pagine della Regione: torna indietro, titolo, introduzione, condivisione e menu di sezione. */
export function IntestazioneRegione({
  regione,
  titolo,
  sottotitolo,
  intro,
  attiva,
  indietro = { href: "/regione/", label: "Tutte le regioni" },
  condividi,
}: {
  /** Slug della regione in chiaro ("campania"). */
  regione: string;
  titolo: string;
  sottotitolo?: ReactNode;
  intro: ReactNode;
  attiva: "regione" | "attivita" | "leggi" | null;
  indietro?: { href: string; label: string };
  condividi: { path: string; testo: string };
}) {
  return (
    <>
      <nav className="text-sm text-ink-3">
        <Link href={indietro.href} className="hover:text-ink">
          ← {indietro.label}
        </Link>
      </nav>
      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display text-4xl sm:text-5xl">{titolo}</h1>
          {sottotitolo && <p className="mt-2 text-ink-2">{sottotitolo}</p>}
          <p className="mt-3 max-w-2xl text-base text-ink-2">{intro}</p>
        </div>
        <Condividi path={condividi.path} titolo={titolo} testo={condividi.testo} />
      </header>
      <RegioneNav regione={regione} attiva={attiva} />
      <div className="mt-4">
        <BannerCaroVita regione={regione} />
      </div>
    </>
  );
}
