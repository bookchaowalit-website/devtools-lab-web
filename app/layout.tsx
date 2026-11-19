import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// The font variable sits on <html>: the App shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const description = "A notebook for experiments kept in your browser: the question, the area, what you observed and its state.";

export const metadata: Metadata = {
  title: "Lab notebook | Bookchaowalit",
  description,
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL("https://lab.bookchaowalit.com"),
  alternates: { canonical: "/" },
  openGraph: { type: "website", title: "Lab notebook | Bookchaowalit", description, siteName: "Bookchaowalit" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
