'use client';

import Image from 'next/image';
import { usePortfolioData } from '@ai-portfolio/core/context';
import type { Recommendation } from '@ai-portfolio/core/types';

const LINKEDIN =
  'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z';

type Proof = Recommendation & Required<Pick<Recommendation, 'linkedin' | 'photo' | 'highlight'>>;

function ProofCard({ rec, copy }: { rec: Proof; copy?: boolean }) {
  return (
    <a
      href={rec.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={copy ? -1 : undefined}
      aria-hidden={copy || undefined}
      aria-label={`${rec.name} on LinkedIn: ${rec.highlight}`}
      className="proof-card group"
      data-copy={copy || undefined}
    >
      <p className="proof-card__quote">&ldquo;{rec.highlight}&rdquo;</p>
      <span className="proof-card__who">
        <Image src={rec.photo} alt="" width={28} height={28} className="proof-card__photo" />
        <span className="min-w-0 flex-1">
          <span className="proof-card__name">{rec.name}</span>
          {rec.byline && <span className="proof-card__byline">{rec.byline}</span>}
        </span>
        <svg viewBox="0 0 24 24" className="proof-card__in" aria-hidden="true">
          <path d={LINKEDIN} fill="currentColor" />
        </svg>
      </span>
    </a>
  );
}

/**
 * A slow ribbon of LinkedIn recommendations along the bottom of the welcome screen.
 * It is fixed, so the centered prompt never moves, and it leaves with the welcome.
 */
export default function SocialProof() {
  const { recommendations, config } = usePortfolioData();
  const proofs = recommendations.filter((r): r is Proof => Boolean(r.linkedin && r.photo && r.highlight));
  if (proofs.length === 0) return null;
  const firstName = config.firstName || config.name.split(' ')[0];

  return (
    <section className="social-proof" aria-label={`LinkedIn recommendations for ${firstName}`}>
      <p className="social-proof__caption">Recommended on LinkedIn by people who worked with {firstName}</p>
      <div className="social-proof__marquee">
        <div className="social-proof__track">
          {proofs.map((rec) => (
            <ProofCard key={rec.name} rec={rec} />
          ))}
          {/* A second pass makes the loop seamless; it is invisible to assistive tech and the keyboard. */}
          {proofs.map((rec) => (
            <ProofCard key={`${rec.name}-copy`} rec={rec} copy />
          ))}
        </div>
      </div>
    </section>
  );
}
