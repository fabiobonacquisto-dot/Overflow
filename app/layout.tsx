import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Overflow — Ledger",
  description: "SWC Elite Coaching Growth Platform — Ledger Core",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-200 bg-white print:hidden">
            <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight">Overflow</span>
                <span className="text-xs uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                  Ledger
                </span>
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900">
                  Dashboard
                </Link>
                <Link href="/clients" className="hover:text-slate-900">
                  Clients
                </Link>
                <Link href="/gauntlet" className="hover:text-slate-900">
                  The Gauntlet
                </Link>
                <Link href="/referrals" className="hover:text-slate-900">
                  Referrals
                </Link>
                <Link href="/coaches" className="hover:text-slate-900">
                  Coaches
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </main>
          <footer className="border-t border-slate-200 py-4 print:hidden">
            <div className="mx-auto max-w-6xl px-6 text-xs text-slate-400">
              Overflow Ledger Core — Southwestern Consulting
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
