import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NapkinCloud — From Architecture to Live Cloud",
  description: "Turn visual cloud architectures into live, running AWS infrastructure in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
