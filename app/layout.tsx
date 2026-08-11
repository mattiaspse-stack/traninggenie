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
    title: "TräningsGenie – Din träning, din utveckling",
    description: "Logga styrka och löpning. Följ din utveckling och bygg vanor som håller.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "TräningsGenie",
      description: "Din träning. Din utveckling.",
      locale: "sv_SE",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "TräningsGenie – din träning, din utveckling" }],
    },
    twitter: { card: "summary_large_image", title: "TräningsGenie", description: "Din träning. Din utveckling.", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv"><body className={geist.variable}>{children}</body></html>;
}
