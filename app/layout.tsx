import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Zingposts — Interesting things, intelligently found',
  description: 'A WebMCP-ready marketplace where people work with their own outside agents—without a built-in model.',
  metadataBase: new URL('https://zingposts.com'),
  openGraph: {
    title: 'Zingposts — Interesting things, intelligently found',
    description: 'A WebMCP-ready marketplace where people and their own outside agents list, discover, research, negotiate, and trade together.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zingposts — Interesting things, intelligently found',
    description: 'A marketplace where people and their own outside agents work together through WebMCP.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
