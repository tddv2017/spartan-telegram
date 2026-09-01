import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spartan Quant AI Bot - Telegram Mini App",
  description: "Institutional AI Spartan Quant Trading Bot Mini App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="bg-[#080c14] text-white min-h-screen font-sans selection:bg-[#00ff88] selection:text-black">
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#080c14] relative shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
