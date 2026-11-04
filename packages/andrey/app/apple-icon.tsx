import { ImageResponse } from 'next/og';
import { BRAND, MARK_SVG, svgDataUri } from '@/lib/brandMark';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS rounds the corners itself, so the home-screen icon is the mark drawn edge to edge on its own ink. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: BRAND.ink }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={svgDataUri(MARK_SVG)} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
