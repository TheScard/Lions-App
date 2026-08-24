import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Barlow Condensed (fett, kursiv): dynamische, "broadcast"-artige
// Schrift fuer Ueberschriften -- naeher am Sport-Game-UI-Look (NBA 2K)
// als eine neutrale Condensed-Schrift ohne Italic.
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});
// Inter: gut lesbare Standardschrift fuer Fliesstext.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lions Adenau",
  description: "Vereins-App des Lions Club Adenau",
  manifest: "/manifest.json",
  // Favicon/Apple-Icon werden ueber die Next.js-Dateikonventionen
  // app/icon.png und app/apple-icon.png automatisch eingebunden.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lions Adenau",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${barlowCondensed.variable} ${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
