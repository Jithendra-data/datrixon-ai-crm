import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Datrixon AI CRM | Customer Intelligence & Revenue Operations",
  description:
    "An evidence-backed, governed CRM reference implementation. Synthetic data, explainable intelligence, human decisions.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
