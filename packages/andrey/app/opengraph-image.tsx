import { ImageResponse } from 'next/og';
import config from '@/portfolio/config.json';
import { BRAND, MARK_SVG, svgDataUri } from '@/lib/brandMark';

export const alt = `${config.name}, ${config.title}. Interactive AI-powered portfolio at rollacode.org`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The page's own dot grid, caught mid-ripple: faint everywhere, lit in one ring around a single blue source dot. */
function rippleField() {
  const step = 24;
  const source = { x: 960, y: 312 };
  const reach = 190;
  const band = 34;
  let dots = '';
  for (let y = 12; y < size.height; y += step) {
    for (let x = 12; x < size.width; x += step) {
      const ring = Math.exp(-0.5 * ((Math.hypot(x - source.x, y - source.y) - reach) / band) ** 2);
      const glow = Math.exp(-0.5 * (Math.hypot(x - source.x, y - source.y) / 60) ** 2);
      const lit = Math.max(ring, glow * 0.8);
      dots += lit > 0.04
        ? `<circle cx="${x}" cy="${y}" r="${(1.3 + lit * 1.7).toFixed(2)}" fill="${BRAND.accent}" fill-opacity="${(0.12 + lit * 0.78).toFixed(2)}"/>`
        : `<circle cx="${x}" cy="${y}" r="1.2" fill="${BRAND.paper}" fill-opacity="0.07"/>`;
    }
  }
  dots += `<circle cx="${source.x}" cy="${source.y}" r="9" fill="${BRAND.accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}">${dots}</svg>`;
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: BRAND.ink, color: BRAND.paper }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgDataUri(rippleField())} width={size.width} height={size.height} alt="" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', width: 760 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgDataUri(MARK_SVG)} width={76} height={76} alt="" style={{ borderRadius: 18, boxShadow: `0 0 0 1px ${BRAND.paper}22` }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1 }}>{config.name}</div>
            <div style={{ marginTop: 22, fontSize: 38, color: BRAND.accent }}>{config.title}</div>
            <div style={{ marginTop: 18, fontSize: 26, color: BRAND.muted }}>14+ years building software. Creator of Domios.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', border: `1.5px solid ${BRAND.accent}66`, borderRadius: 14, fontSize: 24, color: BRAND.paper, background: '#0b101699' }}>
              Ask the portfolio anything
              <div style={{ width: 3, height: 28, marginLeft: 10, background: BRAND.accent }} />
            </div>
            <div style={{ fontSize: 24, color: BRAND.muted }}>rollacode.org</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
