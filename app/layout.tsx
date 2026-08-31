import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Nav } from "@/components/nav";
import { Providers } from "@/components/providers";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { getGrowthBookBootstrap } from "@/lib/growthbook-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPanda — The fast path from tutorial to production",
  description:
    "Learn TypeScript, React, Node.js, Docker, SQL, and more through focused, practical courses built for working developers.",
  icons: {
    icon: "/devpanda-logo.png",
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bootstrap = await getGrowthBookBootstrap();

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white">
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: false });
              `}
            </Script>
          </>
        )}
        <Providers bootstrap={bootstrap}>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
