/** Spiegazione semplice dell'accesso civico: cos'è, cosa si può chiedere, cosa succede dopo. */
export function AccessoCivicoInfo() {
  const passi = [
    { t: "Entro 30 giorni", d: "l'ente deve risponderti: ti manda i documenti oppure spiega per iscritto perché non può (art. 5, comma 6)." },
    {
      t: "Se non rispondono o dicono di no",
      d: "puoi chiedere un riesame al Responsabile per la trasparenza dell'ente, che deve decidere entro 20 giorni (art. 5, comma 7).",
    },
    {
      t: "Se ancora non va",
      d: "per Comuni e Regione puoi rivolgerti al difensore civico regionale, gratis, oppure fare ricorso al tribunale amministrativo (TAR).",
    },
  ];
  return (
    <div className="space-y-5 text-base">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-2xl" aria-hidden>
            🙋
          </p>
          <p className="mt-1 font-semibold">Chiunque può chiedere</p>
          <p className="text-ink-2">Non serve essere residenti né spiegare il motivo.</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-2xl" aria-hidden>
            💶
          </p>
          <p className="mt-1 font-semibold">È gratis</p>
          <p className="text-ink-2">Si paga solo l&apos;eventuale costo delle copie su carta.</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-2xl" aria-hidden>
            📄
          </p>
          <p className="mt-1 font-semibold">Documenti che l&apos;ente ha già</p>
          <p className="text-ink-2">Non è tenuto a fare nuove elaborazioni o a rispondere a domande generiche.</p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Cosa succede dopo</h3>
        <ol className="mt-2 space-y-3">
          {passi.map((p, i) => (
            <li key={p.t} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-ink">{i + 1}</span>
              <span>
                <strong>{p.t}:</strong> {p.d}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-sm text-ink-3">
        Alcune informazioni possono essere negate per proteggere la privacy delle persone, la sicurezza o le indagini in corso (art. 5-bis).
        Se il documento dovrebbe già essere pubblicato nella sezione &quot;Amministrazione trasparente&quot; del sito e non c&apos;è, puoi
        chiederne la pubblicazione con l&apos;accesso civico &quot;semplice&quot;. Fonte:{" "}
        <a
          href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2013-03-14;33~art5"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          d.lgs. 33/2013, art. 5 ↗
        </a>
        .
      </p>
    </div>
  );
}
