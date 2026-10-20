import Link from "next/link";

const VOCI = [
  { href: "", id: "regione", label: "Giunta e Consiglio" },
  { href: "attivita/", id: "attivita", label: "Cosa fanno i consiglieri" },
  { href: "leggi/", id: "leggi", label: "Leggi approvate" },
];

/** Menu delle pagine di un Consiglio in chiaro; `regione` è lo slug ("campania"). */
export function RegioneNav({ regione, attiva }: { regione: string; attiva: "regione" | "attivita" | "leggi" | null }) {
  return (
    <nav aria-label="Sezioni della Regione" className="mt-6 overflow-x-auto">
      <ul className="flex gap-2 text-sm whitespace-nowrap">
        {VOCI.map((v) => (
          <li key={v.id}>
            <Link
              href={`/regione/${regione}/${v.href}`}
              aria-current={attiva === v.id ? "page" : undefined}
              className={`block rounded-full border px-3 py-1 ${
                attiva === v.id ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-3"
              }`}
            >
              {v.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
