import type { Metadata } from "next";
import Link from "next/link";
import { regione, regioni } from "@/lib/data";
import { ComuneSearch } from "@/components/ComuneSearch";
import { Condividi } from "@/components/Condividi";
import { ChiediDocumento, type EnteAccesso } from "@/components/ChiediDocumento";
import { AccessoCivicoInfo } from "@/components/AccessoCivicoInfo";

export const metadata: Metadata = {
  title: "Chiedi un documento: l'accesso civico in parole semplici",
  description:
    "Quanto è costato un lavoro, cosa dice un contratto, che esito hanno avuto i controlli: chiunque può chiederlo a Comune, ASL e Regione. Ti prepariamo la richiesta.",
};

export default function ChiediUnDocumentoPage() {
  // Le 20 Regioni (PEC dall'IPA), più il Consiglio regionale della Campania.
  const enti: EnteAccesso[] = [
    ...regioni.flatMap((r) =>
      r.contatti?.pec ? [{ id: r.slug, nome: `Regione ${r.nome}`, pec: r.contatti.pec, descrizione: "Sanità, trasporti, ambiente, fondi europei" }] : [],
    ),
    ...(regione.contattiConsiglio?.pec
      ? [{ id: "consiglio-campania", nome: "Consiglio regionale della Campania", pec: regione.contattiConsiglio.pec, descrizione: "Atti, leggi e spese del Consiglio" }]
      : []),
  ];

  return (
    <div className="contenitore py-8">
      <nav aria-label="Percorso" className="text-base text-ink-3">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › <span className="text-ink-2">Chiedi un documento</span>
      </nav>
      <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <h1 className="display text-6xl sm:text-7xl">Chiedi un documento</h1>
          <p className="mt-4 max-w-2xl text-xl text-ink-2">
            Quanto è costata quella strada? Cosa dice il contratto dei rifiuti? Che esito hanno avuto i controlli? Con l&apos;
            <strong>accesso civico</strong> chiunque può chiederlo a qualsiasi ente pubblico, gratis e senza dire perché.
          </p>
          <div className="mt-5">
            <Condividi
              path="/chiedi-un-documento/"
              titolo="Chiedi un documento"
              testo="Contratti, spese, controlli: chiunque può chiederli a qualsiasi ente pubblico. Una guida semplice e la richiesta già pronta."
            />
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-surface p-4 shadow-[0_20px_60px_-30px_rgba(20,34,31,0.35)]">
          <p className="mb-3 px-1 text-base text-ink-2">
            <strong>Al tuo Comune o alla tua ASL?</strong> Scegli il comune: ti prepariamo la richiesta con gli indirizzi giusti.
          </p>
          <ComuneSearch etichetta="Il tuo comune" sezione="documento" />
        </div>
      </header>

      <section aria-labelledby="come-funziona" className="mt-12">
        <h2 id="come-funziona" className="display text-4xl sm:text-5xl">
          Come funziona
        </h2>
        <div className="mt-5">
          <AccessoCivicoInfo />
        </div>
      </section>

      <section aria-labelledby="alla-regione" className="mt-12">
        <h2 id="alla-regione" className="display text-4xl sm:text-5xl">
          Prepara la richiesta a una Regione o a un altro ente
        </h2>
        <p className="mt-2 max-w-3xl text-lg text-ink-2">
          Scegli una delle 20 Regioni oppure &quot;un altro ente pubblico&quot; (INPS, un ministero, una scuola, un&apos;università…) e
          scrivi tu il nome e la PEC. Per il Comune o l&apos;ASL è più comodo partire dal tuo comune, qui sopra.
        </p>
        <div className="mt-6 rounded-[32px] border-2 border-line bg-surface p-4 sm:p-6">
          <ChiediDocumento enti={enti} altroEnte />
        </div>
      </section>
    </div>
  );
}
