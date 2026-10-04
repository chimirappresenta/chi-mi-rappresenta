import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { assegnaSeggi, CX, CY, H, R_DOT, W } from "./emiciclo";
import type { ConsigliereRegionale, GruppoConsiliare } from "./types";

// Elementi condivisi delle immagini di anteprima (Open Graph), generate alla prima richiesta e poi in cache.

export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  bg: "#f6f5f1",
  surface: "#ffffff",
  ink: "#14221f",
  ink2: "#44514d",
  ink3: "#6c7773",
  line: "#e2dfd7",
  accent: "#1f5a47",
};
export const OG_COLORI = C;

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

export async function ogFonts() {
  const [serif, sans, sansBold] = await Promise.all([
    font("instrument-serif-latin-400-normal.ttf"),
    font("geist-latin-400-normal.ttf"),
    font("geist-latin-600-normal.ttf"),
  ]);
  return [
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: sans, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: sansBold, weight: 600 as const, style: "normal" as const },
  ];
}

/** Cornice comune: intestazione, contenuto, piè di pagina con il nome del sito. */
export function OgFrame({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "Geist", color: C.ink, padding: "56px 64px" }}>
      <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 2, color: C.accent, textTransform: "uppercase" }}>{etichetta}</div>
      <div style={{ display: "flex", flex: 1 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.line}`, paddingTop: 20, fontSize: 24, color: C.ink3 }}>
        <span style={{ fontFamily: "Instrument Serif", fontSize: 40, color: C.ink, letterSpacing: -1 }}>Chi mi rappresenta</span>
        <span>Solo fonti ufficiali</span>
      </div>
    </div>
  );
}

/** Emiciclo statico in SVG: i consiglieri che soddisfano `evidenzia` sono pieni, gli altri sbiaditi. */
export function OgEmiciclo({
  consiglieri,
  gruppi,
  evidenzia = () => true,
  larghezza,
}: {
  consiglieri: ConsigliereRegionale[];
  gruppi: GruppoConsiliare[];
  evidenzia?: (c: ConsigliereRegionale) => boolean;
  larghezza: number;
}) {
  const colore = new Map(gruppi.map((g) => [g.nome, g.colore]));
  const seggi = assegnaSeggi(consiglieri, gruppi);
  return (
    <svg width={larghezza} height={(larghezza * H) / W} viewBox={`0 0 ${W} ${H}`}>
      {seggi.map(({ c, x, y }) => {
        const on = evidenzia(c);
        return (
          <circle
            key={c.username}
            cx={x}
            cy={y}
            r={R_DOT}
            fill={colore.get(c.gruppo ?? "") ?? C.ink3}
            fillOpacity={on ? 1 : 0.16}
            stroke={on ? C.ink : "none"}
            strokeWidth={on ? 1 : 0}
          />
        );
      })}
      <circle cx={CX} cy={CY - 18} r={R_DOT + 3} fill={C.ink3} fillOpacity={0.4} />
    </svg>
  );
}
