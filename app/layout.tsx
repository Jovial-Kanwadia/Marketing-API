import type React from "react"
import { Providers } from "./providers"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"

export const metadata = {
  title: "Marketing API Dashboard",
  description: "Connect your Facebook account, analyze your ad performance, and export data to Looker Studio.",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
    </ClerkProvider>
  )
}
