import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Facebook } from "lucide-react"
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-xl font-bold m-2">Marketing API</div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard">Dashboard</Link>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <div className="flex gap-2">
                <SignInButton>
                  <Button className="flex items-center gap-2" variant="outline">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className="flex items-center gap-2" variant="outline">
                    Register
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-6 py-24 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tight">Facebook Ads Data Export</h1>
            <p className="text-xl text-muted-foreground">
              Connect your Facebook account, analyze your ad performance, and export data to Looker Studio.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg border bg-muted">
              <img
                src="/placeholder.svg?height=320&width=320"
                alt="Dashboard preview"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
        <section className="container py-12">
          <h2 className="mb-8 text-center text-3xl font-bold">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <h3 className="text-xl font-bold">Connect</h3>
              <p className="text-muted-foreground">
                Login with your Facebook account to grant access to your ad accounts.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <h3 className="text-xl font-bold">Analyze</h3>
              <p className="text-muted-foreground">View your ad performance metrics in our intuitive dashboard.</p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <h3 className="text-xl font-bold">Export</h3>
              <p className="text-muted-foreground">
                Export your data to Looker Studio for advanced visualization and reporting.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Marketing API Dashboard. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
