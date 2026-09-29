import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dayflow — A little more focus",
  description: "Your tasks, projects and focus time, together in one calm workspace.",
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

