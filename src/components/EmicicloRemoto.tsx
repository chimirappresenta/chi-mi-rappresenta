"use client";

import { useEffect, useState } from "react";
import type { GruppoConsiliare, TipoAtto } from "@/lib/types";
import { Emiciclo, type ConsigliereEmiciclo } from "./Emiciclo";

type Dati = { consiglieri: ConsigliereEmiciclo[]; gruppi: GruppoConsiliare[]; tipi: TipoAtto[] };

let datiPromise: Promise<Dati> | null = null;

/** Emiciclo che scarica i dati da /dati/emiciclo.json (una volta per sessione) invece di riceverli nella pagina. */
export function EmicicloRemoto({ circoscrizione, comune }: { circoscrizione?: string; comune?: string }) {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    datiPromise ??= fetch("/dati/emiciclo.json").then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Dati>;
    });
    datiPromise.then(setDati).catch(() => {
      datiPromise = null;
      setErrore(true);
    });
  }, []);

  if (errore) return <p className="text-sm text-warn">Non è stato possibile caricare il Consiglio regionale. Riprova più tardi.</p>;
  if (!dati) return <div className="aspect-[400/214] w-full animate-pulse rounded-xl bg-surface-2" aria-label="Caricamento del Consiglio regionale" />;
  return <Emiciclo consiglieri={dati.consiglieri} gruppi={dati.gruppi} tipi={dati.tipi} circoscrizione={circoscrizione} comune={comune} />;
}
