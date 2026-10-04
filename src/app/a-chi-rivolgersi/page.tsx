import type { Metadata } from "next";
import Link from "next/link";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Condividi } from "@/components/Condividi";
import { GuidaProblemi } from "@/components/GuidaProblemi";

export const metadata: Metadata = {
  title: "Ho un problema: a chi mi rivolgo?",
  description:
    "Strade, rifiuti, sanità, pensioni, trasporti: per i problemi più comuni, chi decide, il primo passo da fare e a quale eletto scrivere.",
};

export default function AChiRivolgersiPage() {
  return (
    <div className="contenitore py-8">
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › <span className="text-ink-2">A chi mi rivolgo?</span>
      </nav>
      <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <h1 className="display text-4xl sm:text-5xl">Ho un problema: a chi mi rivolgo?</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">
            Scegli il tipo di problema: ti diciamo chi decide, qual è il primo passo e, se serve, a quale eletto scrivere.
          </p>
          <div className="mt-5">
            <Condividi
              path="/a-chi-rivolgersi/"
              titolo="A chi mi rivolgo?"
              testo="Buche, rifiuti, ASL, pensioni, treni: una guida semplice per capire a chi rivolgersi e a quale eletto scrivere."
            />
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-surface p-4 shadow-[0_20px_60px_-30px_rgba(20,34,31,0.35)]">
          <p className="mb-3 px-1 text-base text-ink-2">
            <strong>Vuoi i nomi e i contatti giusti?</strong> Scegli il tuo comune: la guida ti mostra il tuo sindaco, i tuoi
            consiglieri e i tuoi parlamentari.
          </p>
          <ComuneSearch etichetta="Il tuo comune" />
        </div>
      </header>
      <div className="mt-12">
        <GuidaProblemi />
      </div>
    </div>
  );
}
