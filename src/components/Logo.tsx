/** Marchio: un piccolo emiciclo a puntini, i colori dei quattro livelli. */
export function Logo({ size = 28 }: { size?: number }) {
  const colori = ["var(--lv-comune)", "var(--lv-regione)", "var(--lv-parlamento)", "var(--lv-europa)"];
  const punti: { x: number; y: number; c: string }[] = [];
  [9, 15].forEach((r, fila) => {
    const n = fila === 0 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i * Math.PI) / (n - 1);
      punti.push({
        x: Math.round((16 + r * Math.cos(a)) * 100) / 100,
        y: Math.round((22 - r * Math.sin(a)) * 100) / 100,
        c: colori[Math.min(3, Math.floor((i / n) * 4))],
      });
    }
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 26" aria-hidden>
      {punti.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={p.c} />
      ))}
      <circle cx={16} cy={21} r={3} fill="var(--ink)" />
    </svg>
  );
}
