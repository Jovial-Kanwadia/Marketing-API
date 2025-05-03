// app/api/auth/connect-token/route.js
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        // Check if user is already logged in
        const session = await getServerSession(authOptions)

        // Get the token from the request body
        const body = await request.json()
        const { accessToken } = body

        if (!accessToken) {
            return NextResponse.json(
                { message: "Access token is required" },
                { status: 400 }
            )
        }

        // Validate the token by making a request to Facebook API
        const fbResponse = await fetch(
            `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`
        )

        const userData = await fbResponse.json()

        if (!fbResponse.ok || userData.error) {
            return NextResponse.json(
                { message: userData.error?.message || "Invalid access token" },
                { status: 401 }
            )
        }

        // Check if the token has the required permissions
        const permissionsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${userData.id}/permissions?access_token=${accessToken}`
        )

        const permissionsData = await permissionsResponse.json()

        if (!permissionsResponse.ok || permissionsData.error) {
            return NextResponse.json(
                { message: "Could not verify permissions" },
                { status: 401 }
            )
        }

        // Check if all required permissions are granted
        const requiredPermissions = ["ads_management", "ads_read", "business_management"]
        const grantedPermissions = permissionsData.data.filter((p: { status: string }) => p.status === "granted").map((p: { permission: any }) => p.permission)

        const missingPermissions = requiredPermissions.filter(p => !grantedPermissions.includes(p))

        if (missingPermissions.length > 0) {
            return NextResponse.json(
                { message: `Missing required permissions: ${missingPermissions.join(", ")}` },
                { status: 403 }
            )
        }

        // Return user data to update the client-side session
        return NextResponse.json({
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                image: `https://graph.facebook.com/${userData.id}/picture?type=large`
            }
        })
    } catch (error) {
        console.error("Token connection error:", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
}
