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
          <div className="contenitore grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="display text-2xl">Chi mi rappresenta</span>
              </div>
              <p className="mt-3 max-w-md text-base text-ink-2">
                Chi ti rappresenta, dal tuo Comune a Bruxelles. Progetto civico indipendente costruito solo con dati pubblici
                ufficiali: prima di agire, verifica sempre la fonte.
              </p>
              <p className="mt-3 max-w-md text-sm text-ink-2">
                Un progetto di{" "}
                <a href="https://www.linkedin.com/in/gerardodellaquila/" target="_blank" rel="noreferrer" className="font-semibold underline hover:text-ink">
                  Gerardo Dell&apos;Aquila
                </a>
                . Contatti:{" "}
                <a href="mailto:infochimirappresenta@gmail.com" className="underline hover:text-ink">
                  infochimirappresenta@gmail.com
                </a>
              </p>
              <p className="mt-3 max-w-md text-sm text-ink-3">
                Usiamo anche l&apos;intelligenza artificiale per costruire il sito e spiegare le leggi in parole semplici. Sono possibili
                errori: prima di decidere, verifica sempre la fonte ufficiale.
              </p>
              <p className="mt-3 max-w-md text-sm text-ink-3">
                Sito ufficiale: <strong className="font-semibold text-ink-2">chi-mi-rappresenta.vercel.app</strong>. Il codice è aperto, ma copie
                pubblicate ad altri indirizzi non sono gestite da noi.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Esplora</p>
              <ul className="mt-3 space-y-2 text-base">
                {MENU.map((m) => (
                  <li key={m.href}>
                    <Link href={m.href} className="text-ink-2 hover:text-ink">
                      {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Vedi anche</p>
              <p className="mt-3 text-sm text-ink-2">
                Spesa pubblica, conti dei Comuni e attività del Parlamento su{" "}
                <a className="underline hover:text-ink" href="https://www.dovevannoinostrisoldi.com" target="_blank" rel="noreferrer">
                  DoveVannoINostriSoldi
                </a>
                . Servizi pubblici spiegati su{" "}
                <a className="underline hover:text-ink" href="https://www.italiaaperta.it" target="_blank" rel="noreferrer">
                  Italia Aperta
                </a>
                .
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
