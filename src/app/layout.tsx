import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { DialogProvider } from '@/components/ui/Dialog';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Tools - Analyze, Learn, and Improve",
  description: "A suite of chess tools to help you analyze games, learn from your mistakes, and improve your chess.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

function NavBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl inline-block">♞</span>
            <span className="font-bold hidden sm:inline-block">Chess Companion</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium flex-1 justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/rating-estimator" className="transition-colors hover:text-foreground/80">
              Rating Estimator
            </Link>
            <Link href="/scoresheet-scanner" className="transition-colors hover:text-foreground/80">
              Scoresheet Scanner
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground/80 hidden sm:inline-block">
              Resources
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none bg-primary text-primary-content hover:bg-primary-focus h-9 px-4 py-2"
            >
              <span className="hidden sm:inline-block mr-1">Theme</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[1.2rem] w-[1.2rem]">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full py-6 md:py-0 md:px-8 md:h-14 border-t border-neutral/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-14 max-w-screen-2xl">
        <p className="text-sm text-center md:text-left text-muted-foreground">
          © 2025 Chess Companion. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <DialogProvider>
          <NavBar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </DialogProvider>
      </body>
    </html>
  );
}
