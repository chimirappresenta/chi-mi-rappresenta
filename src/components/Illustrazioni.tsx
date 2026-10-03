// Illustrazioni piatte dei quattro livelli istituzionali. Colori dai token del livello: funzionano in chiaro e scuro.
type P = { className?: string };

const base = "var(--surface)";

export function Municipio({ className }: P) {
  const c = "var(--lv-comune)";
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <rect x="20" y="100" width="120" height="4" rx="2" fill={c} opacity=".25" />
      <rect x="35" y="50" width="90" height="50" rx="3" fill={base} stroke={c} strokeWidth="2.5" />
      <path d="M30 52 80 28l50 24Z" fill={c} />
      <rect x="70" y="10" width="20" height="22" rx="2" fill={base} stroke={c} strokeWidth="2.5" />
      <circle cx="80" cy="20" r="5" fill="none" stroke={c} strokeWidth="2" />
      <path d="M80 17v3l2 1" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {[45, 62, 92, 109].map((x) => (
        <rect key={x} x={x} y="62" width="9" height="14" rx="4.5" fill={c} opacity=".75" />
      ))}
      <path d="M72 100V84a8 8 0 0 1 16 0v16Z" fill={c} />
      <path d="M80 10V2" stroke={c} strokeWidth="2" />
      <path d="M80 2h10l-3 3 3 3H80" fill="var(--lv-parlamento)" />
    </svg>
  );
}

export function PalazzoRegione({ className }: P) {
  const c = "var(--lv-regione)";
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <rect x="15" y="100" width="130" height="4" rx="2" fill={c} opacity=".25" />
      <rect x="28" y="30" width="104" height="70" rx="3" fill={base} stroke={c} strokeWidth="2.5" />
      <rect x="28" y="30" width="104" height="10" fill={c} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3, 4].map((k) => (
          <rect key={`${r}-${k}`} x={38 + k * 18} y={48 + r * 16} width="10" height="9" rx="2" fill={c} opacity={r === 2 && k === 2 ? 0 : 0.6} />
        )),
      )}
      <rect x="72" y="80" width="16" height="20" rx="2" fill={c} />
      <path d="M118 30V8" stroke={c} strokeWidth="2" />
      <path d="M118 8h16v10h-16Z" fill="var(--lv-comune)" />
    </svg>
  );
}

export function Parlamento({ className }: P) {
  const c = "var(--lv-parlamento)";
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <rect x="15" y="100" width="130" height="4" rx="2" fill={c} opacity=".25" />
      <path d="M50 46a30 30 0 0 1 60 0Z" fill={base} stroke={c} strokeWidth="2.5" />
      <path d="M80 16v-8" stroke={c} strokeWidth="2.5" />
      <circle cx="80" cy="7" r="3" fill={c} />
      <rect x="38" y="46" width="84" height="8" rx="2" fill={c} />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <rect key={k} x={44 + k * 14} y="56" width="6" height="36" rx="2" fill={c} opacity=".7" />
      ))}
      <rect x="32" y="92" width="96" height="8" rx="2" fill={c} />
    </svg>
  );
}

export function Europa({ className }: P) {
  const c = "var(--lv-europa)";
  const stelle = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return { x: Math.round((80 + 34 * Math.cos(a)) * 10) / 10, y: Math.round((52 + 34 * Math.sin(a)) * 10) / 10 };
  });
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <circle cx="80" cy="52" r="46" fill={base} stroke={c} strokeWidth="2.5" />
      {stelle.map((s, i) => (
        <path
          key={i}
          transform={`translate(${s.x} ${s.y})`}
          d="M0-6 1.8-1.9 6.2-1.9 2.7.8 4 5 0 2.5-4 5-2.7.8-6.2-1.9-1.8-1.9Z"
          fill={c}
        />
      ))}
    </svg>
  );
}

export const ILLUSTRAZIONE = { comune: Municipio, regione: PalazzoRegione, parlamento: Parlamento, europa: Europa };
