import type { Metadata } from "next";
import "./globals.css";

// Date-based text (days until a deadline) must match between server and browser, so render per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Surge — The Opportunity Decision Engine",
  description: "The global opportunity market, ranked for your startup—source-backed fit across grants, accelerators, and hackathons.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
