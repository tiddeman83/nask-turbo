// Pure SVG-grafiekgenerator (geen DOM nodig, dus ook testbaar in Node).
// series: [{ points: [[x,y],...], color, label, dashed }]

const W = 340, H = 260, PAD_L = 46, PAD_B = 38, PAD_T = 14, PAD_R = 14;

const nl = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');

export function svgGraph({ xLabel, yLabel, xMax, yMax, xStep, yStep, yMin = 0, series = [], marks = [] }) {
  const pw = W - PAD_L - PAD_R;
  const ph = H - PAD_T - PAD_B;
  const sx = (x) => PAD_L + (x / xMax) * pw;
  const sy = (y) => PAD_T + ph - ((y - yMin) / (yMax - yMin)) * ph;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="graph" role="img" aria-label="${yLabel} tegen ${xLabel}">`);
  parts.push(`<rect x="${PAD_L}" y="${PAD_T}" width="${pw}" height="${ph}" fill="#f7fbff" stroke="none"/>`);
  // fijn raster (halve stappen)
  for (let x = 0; x <= xMax + 1e-9; x += xStep / 2) {
    parts.push(`<line x1="${sx(x)}" y1="${PAD_T}" x2="${sx(x)}" y2="${PAD_T + ph}" stroke="#dbe7f3" stroke-width="${Math.abs((x / xStep) % 1) < 1e-6 ? 1 : 0.5}"/>`);
  }
  for (let y = yMin; y <= yMax + 1e-9; y += yStep / 2) {
    parts.push(`<line x1="${PAD_L}" y1="${sy(y)}" x2="${PAD_L + pw}" y2="${sy(y)}" stroke="#dbe7f3" stroke-width="${Math.abs(((y - yMin) / yStep) % 1) < 1e-6 ? 1 : 0.5}"/>`);
  }
  // assen
  parts.push(`<line x1="${PAD_L}" y1="${PAD_T + ph}" x2="${PAD_L + pw}" y2="${PAD_T + ph}" stroke="#334" stroke-width="1.5"/>`);
  parts.push(`<line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + ph}" stroke="#334" stroke-width="1.5"/>`);
  for (let x = 0; x <= xMax + 1e-9; x += xStep) {
    parts.push(`<text x="${sx(x)}" y="${PAD_T + ph + 15}" font-size="11" text-anchor="middle" fill="#334">${nl(x)}</text>`);
  }
  for (let y = yMin; y <= yMax + 1e-9; y += yStep) {
    parts.push(`<text x="${PAD_L - 6}" y="${sy(y) + 4}" font-size="11" text-anchor="end" fill="#334">${nl(y)}</text>`);
  }
  parts.push(`<text x="${PAD_L + pw}" y="${H - 4}" font-size="12" text-anchor="end" fill="#123" font-style="italic">→ ${xLabel}</text>`);
  parts.push(`<text x="4" y="${PAD_T + 2}" font-size="12" fill="#123" font-style="italic" transform="rotate(-90 10 ${PAD_T + ph / 2}) translate(${-(ph / 2) + 6} ${ph / 2 - 6})">${yLabel} ↑</text>`);
  for (const s of series) {
    const d = s.points.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
    parts.push(`<path d="${d}" fill="none" stroke="${s.color || '#d33'}" stroke-width="2.5" ${s.dashed ? 'stroke-dasharray="6 4"' : ''}/>`);
    if (s.label) {
      const [lx, ly] = s.points[Math.floor(s.points.length * 0.6)];
      parts.push(`<text x="${sx(lx) + 4}" y="${sy(ly) - 6}" font-size="12" font-weight="bold" fill="${s.color || '#d33'}">${s.label}</text>`);
    }
  }
  for (const m of marks) {
    parts.push(`<circle cx="${sx(m.x)}" cy="${sy(m.y)}" r="4" fill="#123"/>`);
    if (m.label) parts.push(`<text x="${sx(m.x) + 6}" y="${sy(m.y) + 14}" font-size="12" font-weight="bold" fill="#123">${m.label}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

// Bemonster een functie tot punten
export function sample(fn, x0, x1, n = 60) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, fn(x)]);
  }
  return pts;
}

// Stroboscopische 'foto': bolletjes op een meetlat (posities in cm)
export function svgStrobe(positions, maxCm) {
  const W2 = 340, H2 = 90, L = 14, R = 14;
  const sx = (cm) => L + (cm / maxCm) * (W2 - L - R);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" class="graph strobe" role="img" aria-label="stroboscopische foto">`];
  parts.push(`<rect x="0" y="0" width="${W2}" height="${H2}" rx="8" fill="#141a2b"/>`);
  parts.push(`<rect x="${L}" y="52" width="${W2 - L - R}" height="18" fill="#fff"/>`);
  const step = maxCm <= 100 ? 10 : 20;
  for (let c = 0; c <= maxCm; c += step) {
    parts.push(`<line x1="${sx(c)}" y1="52" x2="${sx(c)}" y2="60" stroke="#c22"/>`);
    parts.push(`<text x="${sx(c)}" y="68" font-size="8" text-anchor="middle" fill="#222">${c}</text>`);
  }
  positions.forEach((p, i) => {
    parts.push(`<circle cx="${sx(p)}" cy="40" r="7" fill="#f39c33" stroke="#fff" stroke-width="1"/>`);
    parts.push(`<text x="${sx(p)}" y="22" font-size="9" text-anchor="middle" fill="#fff">${String.fromCharCode(65 + i)}</text>`);
  });
  parts.push(`<text x="${W2 - 8}" y="84" font-size="9" text-anchor="end" fill="#aab">meetlat in cm</text>`);
  parts.push('</svg>');
  return parts.join('');
}
