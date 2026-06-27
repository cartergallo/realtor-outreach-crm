import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach — Realtor CRM",
  description: "Private SMS outreach for one rep.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
