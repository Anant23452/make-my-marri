import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const displayFont = localFont({
  src: [
    { path: "../../public/fonts/cormorant-regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/cormorant-italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = localFont({ src: "../../public/fonts/manrope-regular.ttf", variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Make My Marriage — A little less planning. A lot more love.",
  description: "Bring your Indian wedding celebrations, family tasks, budget, and invitations together in one thoughtful planning space.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
