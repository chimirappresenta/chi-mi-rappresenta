"use client";

import Link from "next/link";
import { useRef } from "react";

type Voce = { href: string; label: string; descrizione: string };

/** Menu a tutto schermo per il telefono: voci grandi, con una riga che spiega dove portano. */
export function MenuMobile({ voci }: { voci: Voce[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const chiudi = () => dialog.current?.close();
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-base font-semibold"
        aria-haspopup="dialog"
      >
        <span aria-hidden>☰</span> Menu
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        onClick={(e) => e.target === dialog.current && chiudi()}
        className="m-0 h-full max-h-none w-full max-w-none bg-bg p-0 text-ink backdrop:bg-black/40"
      >
        <div className="contenitore py-4">
          <div className="flex items-center justify-between">
            <span className="display text-2xl">Menu</span>
            <button type="button" onClick={chiudi} className="flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-base font-semibold">
              Chiudi ✕
            </button>
          </div>
          <nav aria-label="Menu principale" className="mt-5">
            <ul className="space-y-3">
              {voci.map((v) => (
                <li key={v.href}>
                  <Link href={v.href} onClick={chiudi} className="block rounded-3xl border border-line bg-surface p-4 hover:border-accent">
                    <span className="block text-lg font-semibold">{v.label}</span>
                    <span className="block text-base text-ink-3">{v.descrizione}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
