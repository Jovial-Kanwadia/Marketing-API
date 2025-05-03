import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/options" // Updated path

// Define the extended session type that includes accessToken
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
  accessToken?: string
}

export async function GET() {
  // Pass authOptions to getServerSession
  const session = await getServerSession(authOptions) as ExtendedSession

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "You must be logged in to access this endpoint" }, { status: 401 })
  }

  try {
    // Fetch ad accounts from Facebook Marketing API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id,account_status&access_token=${session.accessToken}`,
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `API request failed with status: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to a more usable format
    const accounts = data.data?.map((account: any) => ({
      id: account.id,
      name: account.name,
      accountId: account.account_id,
      status: account.account_status === 1 ? "Active" : "Inactive",
    })) || []

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Error fetching ad accounts:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to fetch ad accounts"
    }, { status: 500 })
  }
}
