"use client";

import { useState, useSyncExternalStore } from "react";

type Props = {
  /** Percorso della pagina da condividere (es. "/comune/063060/"); l'URL completo si calcola dal dominio corrente. */
  path: string;
  /** Testo che accompagna il link nei messaggi. */
  testo: string;
  /** Titolo per la condivisione nativa del telefono. */
  titolo?: string;
  compatto?: boolean;
};

const Icona = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d={d} />
  </svg>
);

// Icone semplificate (24×24).
const ICONE = {
  whatsapp:
    "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3Z",
  telegram:
    "M21.9 4.3 18.7 19c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9L1.7 11.4c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5Z",
  x: "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
  facebook:
    "M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.6 3.4 10.6 6.1v2.4H8V12h2.6v10H14V12h2.7l.4-3.5H14Z",
  linkedin:
    "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-4.95c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z",
  link: "M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0Zm-2.8 5.1a3.5 3.5 0 0 1-2.5-6l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a1.5 1.5 0 0 0 2.1 2.1l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a3.5 3.5 0 0 1-2.4 1.1Zm7.1-5.6a1 1 0 0 1-.7-1.7l2.1-2.1a1.5 1.5 0 0 0-2.1-2.1l-2.1 2.1a1 1 0 0 1-1.4-1.4l2.1-2.1a3.5 3.5 0 1 1 4.9 4.9l-2.1 2.1a1 1 0 0 1-.7.3Z",
  share:
    "M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z",
};

// Valori che esistono solo nel browser: sul server (e al primo render) valgono i fallback, poi React aggiorna.
const nessunaSottoscrizione = () => () => {};

export function Condividi({ path, testo, titolo, compatto = false }: Props) {
  const origin = useSyncExternalStore(nessunaSottoscrizione, () => window.location.origin, () => "");
  const nativa = useSyncExternalStore(nessunaSottoscrizione, () => typeof navigator.share === "function", () => false);
  const [copiato, setCopiato] = useState(false);
  const url = origin ? new URL(path, origin).toString() : path;

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(testo);
  const reti = [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${testo} ${url}`)}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
  ] as const;

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      window.prompt("Copia il link:", url);
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:border-ink-3 hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Condividi questa pagina">
      {!compatto && <span className="text-sm text-ink-3">Condividi:</span>}
      {nativa && (
        <button
          type="button"
          onClick={() => navigator.share({ title: titolo, text: testo, url }).catch(() => {})}
          className={`${btn} border-accent bg-accent text-accent-ink hover:text-accent-ink`}
        >
          <Icona d={ICONE.share} /> Condividi
        </button>
      )}
      {reti.map((r) => (
        <a key={r.id} href={r.href} target="_blank" rel="noreferrer" className={btn} aria-label={`Condividi su ${r.label}`} title={r.label}>
          <Icona d={ICONE[r.id]} />
          {!compatto && <span className="hidden sm:inline">{r.label}</span>}
        </a>
      ))}
      <button type="button" onClick={copia} className={btn} aria-live="polite">
        <Icona d={ICONE.link} /> {copiato ? "Link copiato!" : "Copia link"}
      </button>
    </div>
  );
}
