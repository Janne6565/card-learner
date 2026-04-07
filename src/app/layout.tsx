import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Learner",
  description: "Spaced-repetition flashcards with QR-based phone study sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 font-sans">
        {children}
      </body>
    </html>
  );
}
