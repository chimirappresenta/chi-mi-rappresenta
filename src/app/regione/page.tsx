import type { Metadata } from "next";
import Link from "next/link";
import { regione, regioni } from "@/lib/data";
import { ComuneSearch } from "@/components/ComuneSearch";
import { stileLivello } from "@/components/ui";

export const metadata: Metadata = {
  title: "Le Regioni: presidenti, giunte e consigli regionali",
  description: "Le 20 regioni italiane: presidente, giunta e consiglieri regionali, con i contatti ufficiali. Per la Campania anche atti e leggi del Consiglio regionale.",
};

export default function RegioniPage() {
  return (
    <div className="contenitore py-8">
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › <span className="text-ink-2">Regioni</span>
      </nav>
      <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <h1 className="display text-6xl sm:text-7xl">Le Regioni</h1>
          <p className="mt-4 max-w-2xl text-xl text-ink-2">
            Decidono su sanità, trasporti regionali, formazione, ambiente e fondi europei. Scegli la tua regione per vedere presidente,
            giunta e consiglieri, con i contatti ufficiali.
          </p>
        </div>
        <div className="rounded-[28px] border border-line bg-surface p-4 shadow-[0_20px_60px_-30px_rgba(20,34,31,0.35)]">
          <p className="mb-3 px-1 text-base text-ink-2">
            <strong>Parti dal tuo comune.</strong> Trovi la tua Regione insieme a sindaco, parlamentari ed eurodeputati della tua zona.
          </p>
          <ComuneSearch etichetta="Il tuo comune" sezione="regione" />
        </div>
      </header>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" style={stileLivello("regione")}>
        {regioni.map((r) => {
          const presidente = r.inChiaro ? regione.presidente?.nome : r.presidente?.nome;
          const consiglieri = r.inChiaro ? regione.consiglieri.length : r.consiglieri.length;
          return (
            <li key={r.codice}>
              <Link
                href={`/regione/${r.slug}/`}
                className="group flex h-full flex-col rounded-[28px] border-2 border-line bg-surface p-5 hover:border-[var(--lv)]"
              >
                <span className="display text-4xl group-hover:text-[var(--lv)]">{r.nome}</span>
                <span className="mt-2 text-base text-ink-2">
                  {presidente ? (
                    <>
                      Presidente: <strong className="text-ink">{presidente}</strong>
                    </>
                  ) : (
                    "Presidente: dati in aggiornamento"
                  )}
                </span>
                <span className="text-base text-ink-3">{consiglieri ? `${consiglieri} consiglieri regionali` : "Consiglieri sul sito del Consiglio regionale"}</span>
                {r.inChiaro && (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-[var(--lv-bg)] px-3 py-1 text-sm font-semibold text-[var(--lv)]">
                    In chiaro: atti, leggi e mappa dei consiglieri
                  </span>
                )}
                <span className="mt-auto pt-4 text-base font-semibold text-[var(--lv)] group-hover:underline">Apri →</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 max-w-3xl text-base text-ink-3">
        Presidenti, giunte e consiglieri vengono dall&apos;anagrafe degli amministratori regionali del Ministero dell&apos;Interno, che dopo
        un&apos;elezione recente può essere incompleta. Per la Campania usiamo anche il sito del Consiglio regionale, con atti e leggi: è
        il modello che vorremmo estendere alle altre regioni.
      </p>
    </div>
  );
}
