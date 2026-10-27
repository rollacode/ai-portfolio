import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import config from "@/portfolio/config.json";
import CookieConsent from "@ai-portfolio/core/components/ui/CookieConsent";
import { Analytics } from "@vercel/analytics/next";
import { PortfolioProvider } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  display: "swap",
});

// Domios type: Inter for the interface, JetBrains Mono for small technical labels.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

const title = `${config.name} — ${config.title}`;
const description = `${config.bio}. Interactive AI-powered portfolio.`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: config.theme.darkBg },
    { media: "(prefers-color-scheme: light)", color: config.theme.lightBg },
  ],
  maximumScale: 1,
};

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = localStorage.getItem('theme');
                if (stored === 'fallout') {
                  document.documentElement.classList.add('dark', 'fallout');
                } else {
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored ? stored === 'dark' : prefersDark;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <PortfolioProvider>
          {children}
        </PortfolioProvider>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
