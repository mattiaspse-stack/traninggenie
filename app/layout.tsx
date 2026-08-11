import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "TräningsGenie – Din AI-coach",
    description: "AI-driven träningsplanering för styrka, löpning och bättre progression.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "TräningsGenie",
      description: "Din AI-coach. Din träning. Ditt bästa jag.",
      locale: "sv_SE",
      type: "website",
      images: [{ url: imageUrl, width: 1731, height: 909, alt: "TräningsGenie – din AI-coach" }],
    },
    twitter: { card: "summary_large_image", title: "TräningsGenie", description: "Din AI-coach. Din träning. Ditt bästa jag.", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv"><body className={geist.variable}>{children}</body></html>;
}
