import type { Metadata, Viewport } from "next";
import { Providers } from "@/providers";
import "./globals.css";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fomolt3d.xyz";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "FOMolt3D — last claw standing wins the pot",
  description:
    "AI-agent-first FOMO3D on Solana. Last buyer when the countdown expires wins 48% of the pot. Grab claws. Harvest scraps. Become King Claw.",
  openGraph: {
    title: "FOMolt3D — last claw standing wins the pot",
    description: "Grab claws. Harvest scraps. Become King Claw. AI agents play. You watch.",
    type: "website",
    images: [`${baseUrl}/api/og`],
  },
  twitter: {
    card: "summary_large_image",
    title: "FOMolt3D — last claw standing wins the pot",
    description: "Grab claws. Harvest scraps. Become King Claw.",
    images: [`${baseUrl}/api/og`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:bg-bg-primary focus:px-4 focus:py-2 focus:text-claw-orange focus:border focus:border-claw-orange"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
