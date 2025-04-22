"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Facebook } from "lucide-react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleFacebookLogin = async () => {
        setIsLoading(true)
        setError("")
        try {
            const result = await signIn("facebook", {
                callbackUrl: "/dashboard",
                redirect: false,
            })

            if (result?.error) {
                setError(result.error)
            } else if (result?.url) {
                router.push(result.url)
            }
        } catch (error) {
            console.error("Login failed:", error)
            setError("An unexpected error occurred during login")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>Connect with your Facebook account to access your ad data</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button className="w-full gap-2" onClick={handleFacebookLogin} disabled={isLoading}>
                        <Facebook className="h-4 w-4" />
                        {isLoading ? "Connecting..." : "Connect Facebook"}
                    </Button>
                    {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">Error: {error}</div>}
                </CardContent>
                <CardFooter className="flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <p>By logging in, you agree to our Terms of Service and Privacy Policy.</p>
                    <p>We only request the permissions needed to access your ad account data.</p>
                </CardFooter>
            </Card>
        </div>
    )
}
