import type { Metadata } from "next";
import Link from "next/link";
import { caroVita, regioniCaroVita } from "@/lib/caroVita";
import { getConsiglio } from "@/lib/data";
import { dataLunga } from "@/lib/format";
import { Condividi } from "@/components/Condividi";
import { AvvisoArchivio, Fatti } from "@/components/CaroVita";

export const metadata: Metadata = {
  title: "Caro vita: cosa fanno le Regioni",
  description:
    "Proteste di autotrasportatori, agricoltori e studenti: cosa sta succedendo, cosa hanno annunciato le Regioni e cosa hanno fatto i Consigli regionali, con le fonti.",
};

export default function CaroVitaPage() {
  const regioni = regioniCaroVita
    .map((slug) => {
      const cr = getConsiglio(slug)!;
      const sel = caroVita.regioni[slug];
      return {
        slug,
        nome: cr.nome,
        leggi: Object.keys(sel.leggi).length,
        atti: Object.keys(sel.atti).length,
        annunci: caroVita.contesto.regioni[slug]?.regione ?? [],
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="contenitore py-8">
      <AvvisoArchivio />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-accent uppercase">Speciale caro vita</p>
          <h1 className="display mt-1.5 text-4xl sm:text-5xl">Cosa fanno le Regioni</h1>
          <p className="mt-3 max-w-2xl text-base text-ink-2">
            Camionisti, agricoltori, pescatori e studenti protestano contro il caro vita. Qui trovi i fatti, con le fonti, e cosa hanno fatto
            davvero Regioni e Consigli regionali: leggi in vigore, atti presentati e a chi rivolgerti.
          </p>
        </div>
        <Condividi
          path="/caro-vita/"
          titolo="Caro vita: cosa fanno le Regioni"
          testo="Caro vita: cosa sta succedendo e cosa hanno fatto davvero Regioni e Consigli regionali, con le fonti."
        />
      </header>

      <section className="mt-8 rounded-[28px] bg-surface-2 p-5 sm:p-6">
        <h2 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Cosa sta succedendo</h2>
        <Fatti fatti={caroVita.contesto.generale} colonne={4} />
        <p className="mt-4 text-xs text-ink-3">Aggiornato al {dataLunga(caroVita.aggiornato)}. Ogni fatto è confermato da almeno due fonti.</p>
      </section>

      <h2 className="display mt-10 text-3xl">Scegli la tua regione</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {regioni.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/caro-vita/${r.slug}/`}
              className="flex h-full flex-col rounded-[28px] border border-line bg-surface p-5 transition-colors hover:border-ink-3"
            >
              <span className="display text-2xl">{r.nome}</span>
              <span className="mt-1 text-sm text-ink-3">
                {r.leggi} {r.leggi === 1 ? "legge" : "leggi"} · {r.atti} atti in Consiglio
              </span>
              {r.annunci.length > 0 && (
                <span className="mt-3 text-sm text-ink-2">
                  <span className="font-semibold text-ink">La Regione: </span>
                  {r.annunci.map((a) => a.titolo).join(" · ")}
                </span>
              )}
              <span className="mt-auto pt-4 text-sm font-medium text-accent">Apri →</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-2xl text-sm text-ink-3">
        Le altre regioni arriveranno insieme ai loro Consigli regionali in chiaro. Prezzo del carburante e accise sono decisioni nazionali: per
        deputati e senatori del tuo collegio{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-ink">
          cerca il tuo comune
        </Link>
        .
      </p>
    </div>
  );
}
