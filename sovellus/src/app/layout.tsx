import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { BackgroundMarks } from "@/components/background-marks";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blackboard",
  description: "Tehtävien anto ja seuranta yhdelle opettajalle ja hänen oppilailleen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fi"
      data-theme="tausta"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("teema")==="selkea"?"selkea":"tausta";}catch(e){}`,
          }}
        />
        <BackgroundMarks />
        <div className="relative z-10 flex min-h-full flex-col pb-20">{children}</div>
        <ThemeToggle />
      </body>
    </html>
  );
}
