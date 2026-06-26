import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WA Assistant",
  description: "AI Business WhatsApp Assistant SaaS"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
