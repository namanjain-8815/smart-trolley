import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTrolley — Supermarket Self-Checkout System",
  description: "Scan products, pay via UPI, and skip the checkout line with our smart trolley system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
