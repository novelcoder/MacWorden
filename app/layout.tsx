import type { Metadata, Viewport } from "next";
import "./globals.css";
import SnowOverlay from "@/components/SnowOverlay";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "Mac Worden — Mystery & Thriller Author",
    template: "%s — Mac Worden",
  },
  description:
    "Mac Worden writes mysteries and thrillers about ordinary people pulled into extraordinary trouble.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Antonio:wght@400;500;600&family=Archivo+Narrow:wght@500;600;700&family=Barlow+Condensed:wght@300;400;500;600;700&family=Bebas+Neue&family=Big+Shoulders+Stencil+Display:wght@400;600;700;800&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Oswald:wght@300;400;500;600&family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONTS_URL} rel="stylesheet" />
      </head>
      <body>
        <SnowOverlay />
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
