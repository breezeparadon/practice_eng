import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Gentium_Plus, IBM_Plex_Sans_Thai } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
// IPA symbols: Geist lacks many of them.
const gentium = Gentium_Plus({
  variable: "--font-gentium",
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wordbook",
  description: "ฝึกคำศัพท์ภาษาอังกฤษสำหรับชีวิตประจำวันและการทำงาน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={cn(geist.variable, geistMono.variable, plexThai.variable, gentium.variable, "h-full antialiased")}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
