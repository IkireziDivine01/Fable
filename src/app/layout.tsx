import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Fable | The Modern Archivist',
  description:
    'An offline-first PWA designed to bridge generations through gesture-driven storytelling. Preserve heritage and make Kinyarwanda language learning accessible for everyone.',
  keywords: ['Kinyarwanda', 'language learning', 'cultural preservation', 'education', 'PWA'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Fredoka:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body 
        className="antialiased" 
        style={{ WebkitFontSmoothing: 'antialiased' }}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}