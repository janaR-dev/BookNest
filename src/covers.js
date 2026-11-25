// Cover artwork. `coverArt` is the pattern behind a live cover, `coverSvg`
// renders the same design as a standalone image for assets/covers/*.svg.

export const coverFallback = { bg: '#3a3f45', ink: '#eee7d8', motif: 'rule' }

const MOTIFS = {
  waves: (y) => `<path d="M-10 ${y} C 40 ${y - 20}, 70 ${y + 20}, 110 ${y} S 180 ${y - 16}, 215 ${y + 4}"/>`,
  arch: (i) => {
    const w = 46 + i * 34
    const x = 100 - w / 2
    return `<path d="M ${x} 290 V ${150 - i * 6} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 V 290"/>`
  },
  steps: (i) => `<path d="M ${i * 18 - 20} 300 V ${250 - i * 34} H ${i * 18 + 40} V ${216 - i * 34} H ${i * 18 + 100} V ${182 - i * 34} H 220"/>`,
  rule: (i) => `<line x1="0" y1="${18 + i * 24}" x2="200" y2="${18 + i * 24}" opacity="${i % 3 === 0 ? 0.5 : 1}"/>`,
}

export function coverArtBody(motif) {
  if (motif === 'waves') return [34, 66, 98, 130, 162, 194, 226, 258, 290].map(MOTIFS.waves).join('')
  if (motif === 'arch') return [0, 1, 2, 3, 4].map(MOTIFS.arch).join('')
  if (motif === 'steps') return [0, 1, 2, 3, 4, 5].map(MOTIFS.steps).join('')
  if (motif === 'rule') return Array.from({ length: 12 }, (_, i) => MOTIFS.rule(i)).join('')
  if (motif === 'orbit') {
    let body = [28, 54, 80, 106].map((r) => `<circle cx="100" cy="150" r="${r}"/>`).join('')
    body += '<ellipse cx="100" cy="150" rx="118" ry="38" transform="rotate(-24 100 150)"/><circle cx="100" cy="150" r="6" fill="currentColor" stroke="none"/>'
    return body
  }
  if (motif === 'sun') {
    let body = '<circle cx="100" cy="112" r="42"/>'
    body += [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
      .map((deg) => {
        const rad = (deg * Math.PI) / 180
        return `<line x1="${(100 + Math.cos(rad) * 56).toFixed(1)}" y1="${(112 + Math.sin(rad) * 56).toFixed(1)}" x2="${(100 + Math.cos(rad) * 88).toFixed(1)}" y2="${(112 + Math.sin(rad) * 88).toFixed(1)}"/>`
      })
      .join('')
    body += [168, 190, 212, 234, 256, 278].map((y) => `<line x1="0" y1="${y}" x2="200" y2="${y}"/>`).join('')
    return body
  }
  let body = Array.from({ length: 8 }, (_, i) => `<line x1="${i * 28 + 4}" y1="0" x2="${i * 28 + 4}" y2="300"/>`).join('')
  body += Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 28 + 4}" x2="200" y2="${i * 28 + 4}"/>`).join('')
  return body
}

export const coverArt = (motif) =>
  `<svg viewBox="0 0 200 300" fill="none" stroke="currentColor" stroke-width="1.2" preserveAspectRatio="none" aria-hidden="true">${coverArtBody(motif)}</svg>`

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function titleLines(title) {
  const lines = []
  let line = ''
  for (const word of String(title).split(/\s+/)) {
    if (!line) line = word
    else if (line.length + word.length + 1 <= 20) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}

// A complete 400×600 cover image, matching the on-page cover component.
export function coverSvg(book) {
  const cover = book.cover || coverFallback
  const lines = titleLines(book.title)
  const size = lines.some((line) => line.length > 14) ? 30 : 34
  const first = 500 - (lines.length - 1) * 40
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600" role="img" aria-label="${esc(book.title)} by ${esc(book.author)}">
  <title>${esc(book.title)} — ${esc(book.author)}</title>
  <defs>
    <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="edge" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="${cover.bg}"/>
  <g fill="none" stroke="${cover.ink}" stroke-width="2.4" opacity="0.2" transform="scale(2)">${coverArtBody(cover.motif)}</g>
  <rect width="28" height="600" fill="url(#spine)"/>
  <rect x="390" width="10" height="600" fill="url(#edge)"/>
  <text x="42" y="58" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="3" fill="${cover.ink}" opacity="0.55">BOOKNEST</text>
  ${lines.map((line, i) => `<text x="42" y="${first + i * 40}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="${cover.ink}">${esc(line)}</text>`).join('\n  ')}
  <rect x="42" y="521" width="52" height="1.5" fill="${cover.ink}" opacity="0.4"/>
  <text x="42" y="556" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="2.2" fill="${cover.ink}" opacity="0.8">${esc(String(book.author).toUpperCase())}</text>
</svg>`
}
