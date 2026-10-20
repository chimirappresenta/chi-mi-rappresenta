"use client";

import { useEffect, useState } from "react";
import type { GruppoConsiliare, TipoAtto } from "@/lib/types";
import { Emiciclo, type ConsigliereEmiciclo } from "./Emiciclo";

type Dati = { consiglieri: ConsigliereEmiciclo[]; gruppi: GruppoConsiliare[]; tipi: TipoAtto[] };

const datiPromise = new Map<string, Promise<Dati>>();

/** Emiciclo che scarica i dati da /dati/<regione>/emiciclo.json (una volta per sessione) invece di riceverli nella pagina. */
export function EmicicloRemoto({ regione, circoscrizione, comune }: { regione: { slug: string; nome: string }; circoscrizione?: string; comune?: string }) {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    if (!datiPromise.has(regione.slug))
      datiPromise.set(
        regione.slug,
        fetch(`/dati/${regione.slug}/emiciclo.json`).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<Dati>;
        }),
      );
    datiPromise
      .get(regione.slug)!
      .then(setDati)
      .catch(() => {
        datiPromise.delete(regione.slug);
        setErrore(true);
      });
  }, [regione.slug]);

  if (errore) return <p className="text-sm text-warn">Non è stato possibile caricare il Consiglio regionale. Riprova più tardi.</p>;
  if (!dati) return <div className="aspect-[400/214] w-full animate-pulse rounded-xl bg-surface-2" aria-label="Caricamento del Consiglio regionale" />;
  return <Emiciclo regione={regione} consiglieri={dati.consiglieri} gruppi={dati.gruppi} tipi={dati.tipi} circoscrizione={circoscrizione} comune={comune} />;
}
