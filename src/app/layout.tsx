import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Spartan Quant AI Bot - Institutional Portal",
  description: "Institutional AI Spartan Quant Trading Bot & Admin Portal",
};

import { LanguageProvider } from "@/contexts/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="bg-[#080c14] text-white min-h-screen font-sans antialiased selection:bg-[#00ff88] selection:text-black">
        <LanguageProvider>
          <div className="w-full min-h-screen flex flex-col bg-[#080c14] relative">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
