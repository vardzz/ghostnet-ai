import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono, Silkscreen } from "next/font/google";
import { GeistPixelLine } from "geist/font/pixel";
import type { ReactNode } from "react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pixel",
});

const geistPixelLine = GeistPixelLine;

export const metadata: Metadata = {
  title: "GhostNet AI",
  description: "Advanced AI threat monitoring and analysis platform."
};

// Use the public/GhostNet-AI.png image as the site icon (tab favicon + related icons)
metadata.icons = {
  icon: '/GhostNet-AI.png',
  shortcut: '/GhostNet-AI.png',
  apple: '/GhostNet-AI.png'
};
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${geistMono.variable} ${silkscreen.variable} ${geistPixelLine.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}