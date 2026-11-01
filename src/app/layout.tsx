import type { Metadata, Viewport } from "next";
import { Kanit, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-kanit",
});
const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Legendia Nexus — RPG de Invocaciones",
  description: "RPG táctico de anime con invocaciones gacha, colección de héroes y combates por turnos. Servidor privado.",
  openGraph: {
    title: "Legendia Nexus — RPG de Invocaciones",
    description: "RPG táctico de anime con invocaciones gacha, colección de héroes y combates por turnos. Servidor privado.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a1224",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${kanit.variable} ${nunito.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}