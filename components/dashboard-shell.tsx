'use client'
import { useSession, signOut, signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Facebook, LogOut, Key, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useRouter } from 'next/navigation'

export function DashboardShell({ children }: any) {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const isAuthenticated = status === "authenticated" && session
    const [isConnecting, setIsConnecting] = useState(false)
    const [accessToken, setAccessToken] = useState("")
    const [isTokenConnecting, setIsTokenConnecting] = useState(false)
    const [tokenError, setTokenError] = useState("")

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

    const handleConnectWithToken = async () => {
        if (!accessToken || accessToken.trim() === "") {
            setTokenError("Please enter a valid access token")
            return
        }

        setIsTokenConnecting(true)
        setTokenError("")

        try {
            // Call your API endpoint to validate and store the token
            const response = await fetch("/api/auth/connect-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ accessToken }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Failed to connect with access token")
            }

            // Update the session with the new token information
            await update({
                ...session,
                accessToken: accessToken,
                user: data.user,
            })

            // Refresh the page to show authenticated content
            router.refresh()
        } catch (error: any) {
            console.error("Token connection failed:", error)
            setTokenError(error.message || "Failed to connect with token. Please check if it's valid.")
        } finally {
            setIsTokenConnecting(false)
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
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="mb-4 text-muted-foreground">Choose a method to connect your Facebook account</p>
                                        <Button
                                            className="w-full sm:w-auto gap-2"
                                            onClick={handleConnect}
                                            disabled={isConnecting}
                                        >
                                            <Facebook className="h-4 w-4" />
                                            {isConnecting ? "Connecting..." : "Connect with Facebook Login"}
                                        </Button>
                                    </div>
                                    
                                    <div className="relative my-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t"></span>
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                                        </div>
                                    </div>
                                    
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="token-input">
                                            <AccordionTrigger className="text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Key className="h-4 w-4" />
                                                    Connect with Access Token
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pt-2">
                                                    <div className="grid w-full gap-1.5">
                                                        <Label htmlFor="access-token">Facebook Access Token</Label>
                                                        <Input 
                                                            id="access-token" 
                                                            placeholder="Enter your Facebook access token" 
                                                            value={accessToken}
                                                            onChange={(e) => setAccessToken(e.target.value)}
                                                        />
                                                        {tokenError && (
                                                            <p className="text-sm text-red-500 mt-1">{tokenError}</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            The token needs to have the following permissions: ads_management, ads_read, business_management
                                                        </p>
                                                    </div>
                                                    <Button 
                                                        className="w-full gap-2"
                                                        onClick={handleConnectWithToken}
                                                        disabled={isTokenConnecting}
                                                    >
                                                        <Key className="h-4 w-4" />
                                                        {isTokenConnecting ? "Connecting..." : "Connect with Token"}
                                                    </Button>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}