import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Instrument_Serif } from "next/font/google";
import { Logo } from "@/components/Logo";
import { MenuMobile } from "@/components/MenuMobile";
import Script from "next/script";
import { SITE_URL } from "@/lib/sito";
import { UMAMI_DOMINI, UMAMI_WEBSITE_ID } from "@/lib/traccia";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Chi mi rappresenta", locale: "it_IT", type: "website" },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Chi mi rappresenta: dal tuo Comune all'Europa",
    template: "%s · Chi mi rappresenta",
  },
  description:
    "Scrivi il tuo comune e scopri chi ti rappresenta a ogni livello: sindaco e consiglio comunale, Regione, Parlamento ed Europa. Solo fonti ufficiali.",
};

// Voci principali, in ordine di importanza per chi visita il sito.
const MENU = [
  { href: "/", label: "Cerca il tuo comune", descrizione: "Chi ti rappresenta, dal sindaco all'Europa" },
  { href: "/a-chi-rivolgersi/", label: "A chi mi rivolgo?", descrizione: "Strade, ASL, pensioni, treni: chi decide e a chi scrivere" },
  { href: "/chiedi-un-documento/", label: "Chiedi un documento", descrizione: "Contratti, spese, controlli: il diritto di sapere" },
  { href: "/regione/", label: "Regioni", descrizione: "Presidenti, giunte e consiglieri delle 20 regioni" },
  { href: "/consigli-in-chiaro/", label: "Consigli regionali in chiaro", descrizione: "Atti, leggi e mappa del Consiglio: la Campania e le regioni in arrivo" },
  { href: "/fonti/", label: "Fonti e metodo", descrizione: "Da dove vengono i dati e quanto sono aggiornati" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${geistSans.variable} ${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenuto"
          className="sr-only z-50 rounded-full bg-ink px-5 py-3 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Vai al contenuto
        </a>
        <p className="border-b border-line bg-surface-2/60 px-4 py-1.5 text-center text-xs text-ink-3">
          Progetto civico indipendente: non è un sito della Pubblica Amministrazione. Ogni dato rimanda alla fonte ufficiale.
        </p>
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
          <div className="contenitore flex h-[var(--altezza-header)] items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="display text-xl whitespace-nowrap">Chi mi rappresenta</span>
            </Link>
            <div className="flex items-center gap-2">
              <nav aria-label="Principale" className="hidden items-center gap-0.5 text-sm xl:flex">
                {MENU.slice(1, 5).map((m) => (
                  <Link key={m.href} href={m.href} className="rounded-full px-3 py-2 whitespace-nowrap text-ink-2 hover:bg-surface hover:text-ink">
                    {m.label}
                  </Link>
                ))}
              </nav>
              <Link href="/" className="hidden min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold whitespace-nowrap text-bg hover:opacity-90 md:flex">
                Cerca il tuo comune
              </Link>
              <div className="xl:hidden">
                <MenuMobile voci={MENU} />
              </div>
            </div>
          </div>
        </header>

        <main id="contenuto" className="flex-1" tabIndex={-1}>
          {children}
        </main>

        <footer className="mt-16 border-t border-line bg-surface">
          <div className="contenitore grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="display text-xl">Chi mi rappresenta</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-ink-2">
                Chi ti rappresenta, dal tuo Comune a Bruxelles. Progetto civico indipendente, solo con dati pubblici ufficiali.
              </p>
            </div>
            <ColonnaFooter titolo="Esplora" voci={MENU.map((m) => ({ href: m.href, label: m.label }))} />
            <ColonnaFooter
              titolo="Il progetto"
              voci={[
                { href: "https://www.linkedin.com/in/gerardodellaquila/", label: "Di Gerardo Dell'Aquila", esterno: true },
                { href: "mailto:infochimirappresenta@gmail.com", label: "Scrivici una email" },
                { href: "https://github.com/chimirappresenta/chi-mi-rappresenta", label: "Codice su GitHub", esterno: true },
                { href: "/privacy/", label: "Privacy" },
                { href: "/termini/", label: "Termini d'uso" },
              ]}
            />
            <ColonnaFooter
              titolo="Vedi anche"
              voci={[
                { href: "https://www.dovevannoinostrisoldi.com", label: "DoveVannoINostriSoldi", nota: "Spesa pubblica e Parlamento", esterno: true },
                { href: "https://www.italiaaperta.it", label: "Italia Aperta", nota: "Servizi pubblici spiegati", esterno: true },
              ]}
            />
          </div>
          <div className="border-t border-line">
            <div className="contenitore flex flex-col gap-2 py-4 text-xs text-ink-3 md:flex-row md:items-start md:justify-between md:gap-8">
              <p className="max-w-3xl">
                Usiamo anche l&apos;intelligenza artificiale per costruire il sito e spiegare le leggi in parole semplici: sono possibili
                errori, verifica sempre la fonte ufficiale. Il sito non fornisce consulenza.
              </p>
              <p className="shrink-0">
                Sito ufficiale: <span className="font-medium text-ink-2">chi-mi-rappresenta.vercel.app</span>
              </p>
            </div>
          </div>
        </footer>
        {/* statistiche anonime, senza cookie; contano solo sul sito pubblicato */}
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id={UMAMI_WEBSITE_ID}
          data-domains={UMAMI_DOMINI}
          data-do-not-track="true"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

type VoceFooter = { href: string; label: string; nota?: string; esterno?: boolean };

function ColonnaFooter({ titolo, voci }: { titolo: string; voci: VoceFooter[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">{titolo}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {voci.map((v) => (
          <li key={v.href}>
            {v.esterno || v.href.startsWith("mailto:") ? (
              <a href={v.href} {...(v.esterno ? { target: "_blank", rel: "noreferrer" } : {})} className="text-ink-2 [overflow-wrap:anywhere] hover:text-ink hover:underline">
                {v.label}
                {v.esterno && " ↗"}
              </a>
            ) : (
              <Link href={v.href} className="text-ink-2 hover:text-ink hover:underline">
                {v.label}
              </Link>
            )}
            {v.nota && <span className="block text-xs text-ink-3">{v.nota}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
