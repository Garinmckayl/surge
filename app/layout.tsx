import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surge — Find your next yes",
  description: "A sourced opportunity radar for grants, accelerators, and hackathons, ranked for your startup.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
