import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentCheck — is your Irish rent increase legal?",
  description:
    "Check a rent review notice against the Irish rent control rules in force from 1 March 2026. Works out the legal maximum, checks whether the notice itself is valid, and drafts the letter back.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RentCheck", statusBarStyle: "default" },
  openGraph: {
    title: "RentCheck — is your Irish rent increase legal?",
    description:
      "Free check of an Irish rent review notice against the rules in force from 1 March 2026.",
    locale: "en_IE",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#11141c" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
