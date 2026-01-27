import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aggregator",
  description: "Neutral Nigerian news aggregation MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-zinc-50 text-zinc-900 antialiased dark:bg-[#0E0E0E] dark:text-zinc-100`}
      >
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0E0E0E]/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
            <Link className="flex items-center gap-3" href="/events">
              <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white" />
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Aggregator</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Neutral Nigerian news MVP</div>
              </div>
            </Link>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Events</div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
