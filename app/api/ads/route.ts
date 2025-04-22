import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Adjust this path to where your auth options are defined

// Define a custom session type that includes accessToken
interface ExtendedSession {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  expires: string
  accessToken?: string
}

export async function GET(request: Request) {
  // Pass authOptions to getServerSession to ensure it has access to your configuration
  const session = await getServerSession(authOptions) as ExtendedSession

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "You must be logged in to access this endpoint" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")

  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
  }

  try {
    // Fetch campaigns
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,objective,status,spend,insights{impressions,clicks,ctr,cpc}&access_token=${session.accessToken}`,
    )

    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json()
      throw new Error(errorData.error?.message || `Failed to fetch campaigns: ${campaignsResponse.status}`)
    }

    const campaignsData = await campaignsResponse.json()

    // Fetch ads
    const adsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/ads?fields=id,name,status,adset_name,creative,insights{impressions,clicks,ctr,cpc,spend}&access_token=${session.accessToken}`,
    )

    if (!adsResponse.ok) {
      const errorData = await adsResponse.json()
      throw new Error(errorData.error?.message || `Failed to fetch ads: ${adsResponse.status}`)
    }

    const adsData = await adsResponse.json()

    // Transform campaign data
    const campaigns = campaignsData.data?.map((campaign: any) => {
      const insights = campaign.insights?.data?.[0] || {}

      return {
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        spend: campaign.spend || "0",
        impressions: insights.impressions || 0,
        clicks: insights.clicks || 0,
        ctr: insights.ctr || 0,
        cpc: insights.cpc || 0,
      }
    }) || []

    // Transform ad data
    const ads = adsData.data?.map((ad: any) => {
      const insights = ad.insights?.data?.[0] || {}

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        adset_name: ad.adset_name,
        spend: insights.spend || "0",
        impressions: insights.impressions || 0,
        clicks: insights.clicks || 0,
        ctr: insights.ctr || 0,
        cpc: insights.cpc || 0,
      }
    }) || []

    return NextResponse.json({ campaigns, ads })
  } catch (error) {
    console.error("Error fetching ad data:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to fetch ad data"
    }, { status: 500 })
  }
}