'use client'
import { useSession, signOut, signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Facebook, LogOut } from "lucide-react"
import { useState } from "react"

export function DashboardShell({ children }: any) {
    const { data: session, status } = useSession()
    const isAuthenticated = status === "authenticated" && session
    const [isConnecting, setIsConnecting] = useState(false)

    const handleSignOut = () => {
        signOut({ callbackUrl: '/dashboard' })
    }

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            await signIn("facebook", {
                callbackUrl: "/dashboard",
                redirect: true,
            })
        } catch (error) {
            console.error("Login failed:", error)
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background">
                <div className="container flex h-16 items-center justify-between">
                    <div className="text-xl font-bold mx-2">
                    <Link href="/">Marketing API</Link>
                    </div>
                    <nav className="flex gap-4 m-2">
                        <Link href="/dashboard">Dashboard</Link>
                    </nav>
                </div>
            </header>
            <main className="flex-1">
                <div className="container grid gap-6 py-6">
                    {isAuthenticated ? (
                        <>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                                    <p className="text-muted-foreground">
                                        Connected as {session.user?.name || "Facebook User"}
                                    </p>
                                </div>
                                <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                                    <LogOut className="h-4 w-4" />
                                    Disconnect Facebook
                                </Button>
                            </div>
                            {children}
                        </>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Connect to Facebook</CardTitle>
                                <CardDescription>You need to connect your Facebook account to see your ad data</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="mb-4 text-muted-foreground">Please connect your Facebook account to access ad performance metrics</p>
                                <Button 
                                    className="w-full sm:w-auto gap-2" 
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                >
                                    <Facebook className="h-4 w-4" />
                                    {isConnecting ? "Connecting..." : "Connect Facebook"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}
