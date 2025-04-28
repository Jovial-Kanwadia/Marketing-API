// import { getServerSession } from "next-auth/next"
// import { NextResponse } from "next/server"
// import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Adjust this path to where your auth options are defined

// // Define a custom session type that includes accessToken
// interface ExtendedSession {
//   user?: {
//     name?: string | null
//     email?: string | null
//     image?: string | null
//   }
//   expires: string
//   accessToken?: string
// }

// export async function GET(request: Request) {
//   // Pass authOptions to getServerSession to ensure it has access to your configuration
//   const session = await getServerSession(authOptions) as ExtendedSession

//   if (!session || !session.accessToken) {
//     return NextResponse.json({ error: "You must be logged in to access this endpoint" }, { status: 401 })
//   }

//   const { searchParams } = new URL(request.url)
//   const accountId = searchParams.get("accountId")

//   if (!accountId) {
//     return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
//   }

//   try {
//     // Fetch campaigns
//     const campaignsResponse = await fetch(
//       `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,objective,status,spend,insights{impressions,clicks,ctr,cpc}&access_token=${session.accessToken}`,
//     )

//     if (!campaignsResponse.ok) {
//       const errorData = await campaignsResponse.json()
//       throw new Error(errorData.error?.message || `Failed to fetch campaigns: ${campaignsResponse.status}`)
//     }

//     const campaignsData = await campaignsResponse.json()

//     // Fetch ads
//     const adsResponse = await fetch(
//       `https://graph.facebook.com/v18.0/${accountId}/ads?fields=id,name,status,adset_name,creative,insights{impressions,clicks,ctr,cpc,spend}&access_token=${session.accessToken}`,
//     )

//     if (!adsResponse.ok) {
//       const errorData = await adsResponse.json()
//       throw new Error(errorData.error?.message || `Failed to fetch ads: ${adsResponse.status}`)
//     }

//     const adsData = await adsResponse.json()

//     // Transform campaign data
//     const campaigns = campaignsData.data?.map((campaign: any) => {
//       const insights = campaign.insights?.data?.[0] || {}

//       return {
//         id: campaign.id,
//         name: campaign.name,
//         objective: campaign.objective,
//         status: campaign.status,
//         spend: campaign.spend || "0",
//         impressions: insights.impressions || 0,
//         clicks: insights.clicks || 0,
//         ctr: insights.ctr || 0,
//         cpc: insights.cpc || 0,
//       }
//     }) || []

//     // Transform ad data
//     const ads = adsData.data?.map((ad: any) => {
//       const insights = ad.insights?.data?.[0] || {}

//       return {
//         id: ad.id,
//         name: ad.name,
//         status: ad.status,
//         adset_name: ad.adset_name,
//         spend: insights.spend || "0",
//         impressions: insights.impressions || 0,
//         clicks: insights.clicks || 0,
//         ctr: insights.ctr || 0,
//         cpc: insights.cpc || 0,
//       }
//     }) || []

//     return NextResponse.json({ campaigns, ads })
//   } catch (error) {
//     console.error("Error fetching ad data:", error)
//     return NextResponse.json({
//       error: error instanceof Error ? error.message : "Failed to fetch ad data"
//     }, { status: 500 })
//   }
// }

// File: /app/api/ads/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"


export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    })
  }

  // Get query parameters
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId")
  const fromDate = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const toDate = searchParams.get("to") || new Date().toISOString().split("T")[0]

  if (!accountId) {
    return new NextResponse(JSON.stringify({ error: "Ad account ID is required" }), {
      status: 400,
    })
  }

  try {
    // Here you would fetch the data from your data source (Facebook Marketing API, database, etc.)
    // For this example, we'll return mock data that matches the requested format
    
    // Fetch data from your API/database with appropriate auth tokens
    // const fbResponse = await fetch(`https://graph.facebook.com/v17.0/${accountId}/insights?fields=...`, {
    //   headers: { Authorization: `Bearer ${session.accessToken}` }
    // })
    // const data = await fbResponse.json()
    
    // For now, generate mock data matching the required fields
    const ads = generateMockAdData(fromDate, toDate)
    const campaigns = generateMockCampaignData(fromDate, toDate)

    return new NextResponse(JSON.stringify({
      ads,
      campaigns
    }), {
      status: 200,
    })
  } catch (error) {
    console.error("Error fetching ad data:", error)
    return new NextResponse(JSON.stringify({ error: "Failed to fetch ad data" }), {
      status: 500,
    })
  }
}

function generateMockAdData(fromDate: string, toDate: string) {
  // Generate dates between the range
  const dates = getDatesInRange(new Date(fromDate), new Date(toDate))
  
  // Campaign and ad set names for variety
  const campaigns = ["Summer Sale", "Black Friday", "Holiday Promo", "Spring Collection"]
  const adSets = ["Desktop Users", "Mobile Users", "Retargeting", "New Customers"]
  const adNames = ["Ad Creative 1", "Video Ad", "Carousel Ad", "Collection Ad", "Story Ad"]
  
  // Generate mock ad data
  return dates.flatMap(date => {
    return Array(3).fill(0).map((_, i) => {
      const campaignName = campaigns[Math.floor(Math.random() * campaigns.length)]
      const adSetName = adSets[Math.floor(Math.random() * adSets.length)]
      const adName = `${adNames[Math.floor(Math.random() * adNames.length)]} ${i + 1}`
      
      // Calculate ISO week, month, and year
      const isoWeek = getISOWeek(new Date(date))
      const month = new Date(date).toLocaleString('default', { month: 'long' })
      const year = new Date(date).getFullYear().toString()
      
      // Random spending amount
      const amountSpent = (Math.random() * 1000).toFixed(2)
      
      // Random metrics with some correlation to spending
      const impressions = Math.floor(Math.random() * 10000) + 1000
      const reach = Math.floor(impressions * (0.6 + Math.random() * 0.3))
      const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.05))
      const linkClicks = Math.floor(clicks * (0.7 + Math.random() * 0.2))
      const landingPageViews = Math.floor(linkClicks * (0.8 + Math.random() * 0.15))
      const viewContent = Math.floor(landingPageViews * (0.7 + Math.random() * 0.2))
      const viewContentValue = (viewContent * (10 + Math.random() * 5)).toFixed(2)
      const wishlist = Math.floor(viewContent * (0.4 + Math.random() * 0.2))
      const wishlistValue = (wishlist * (15 + Math.random() * 10)).toFixed(2)
      const addToCart = Math.floor(viewContent * (0.3 + Math.random() * 0.2))
      const cartValue = (addToCart * (20 + Math.random() * 15)).toFixed(2)
      const checkout = Math.floor(addToCart * (0.5 + Math.random() * 0.3))
      const checkoutValue = (checkout * (25 + Math.random() * 20)).toFixed(2)
      const addPayment = Math.floor(checkout * (0.8 + Math.random() * 0.15))
      const addPaymentValue = (addPayment * (30 + Math.random() * 25)).toFixed(2)
      const purchase = Math.floor(addPayment * (0.9 + Math.random() * 0.1))
      const purchaseValue = (purchase * (35 + Math.random() * 30)).toFixed(2)
      const leads = Math.floor(linkClicks * (0.03 + Math.random() * 0.02))
      const leadValue = (leads * (5 + Math.random() * 5)).toFixed(2)
      const contacts = Math.floor(leads * (0.5 + Math.random() * 0.3))
      const contactValue = (contacts * (10 + Math.random() * 10)).toFixed(2)
      
      // Map campaign objective based on campaign name
      let objective
      if (campaignName.includes("Sale")) {
        objective = "CONVERSIONS"
      } else if (campaignName.includes("Black Friday")) {
        objective = "CATALOG_SALES"
      } else if (campaignName.includes("Holiday")) {
        objective = "REACH"
      } else {
        objective = "TRAFFIC"
      }
      
      // Return structured data in the requested format
      return {
        "Date": date,
        "ISO Week": isoWeek,
        "Month": month,
        "Year": year,
        "Ad Name": adName,
        "Ad Set Name": adSetName,
        "Campaing Name": campaignName,
        "Campaing Objective": objective,
        "Buying Type": Math.random() > 0.5 ? "AUCTION" : "REACH_AND_FREQUENCY",
        "Bid Strategy": Math.random() > 0.5 ? "LOWEST_COST_WITHOUT_CAP" : "LOWEST_COST_WITH_BID_CAP",
        "Amount Spent": amountSpent,
        "Reach": reach,
        "Impressions": impressions,
        "Clicks (all)": clicks,
        "Link Clicks": linkClicks,
        "Landing Page views": landingPageViews,
        "View Content": viewContent,
        "View Content Conversion Value": viewContentValue,
        "Add To Wishlist": wishlist,
        "Add To Wishlist Conversion Value": wishlistValue,
        "Add To Cart": addToCart,
        "Add To Cart Conversion Value": cartValue,
        "Initiated Checkout": checkout,
        "Initiated Checkout Conversion Value": checkoutValue,
        "Adds Payment Info": addPayment,
        "Add Payment Info Conversion Value": addPaymentValue,
        "Purchase": purchase,
        "Purchase Conversion Value": purchaseValue,
        "Leads": leads,
        "Lead Conversion Value": leadValue,
        "Contact": contacts,
        "Contact Conversion Value": contactValue
      }
    })
  })
}

function generateMockCampaignData(fromDate: string, toDate: string) {
  // Generate dates between the range
  const dates = getDatesInRange(new Date(fromDate), new Date(toDate))
  
  // Campaign names
  const campaigns = ["Summer Sale", "Black Friday", "Holiday Promo", "Spring Collection"]
  
  // Generate mock campaign data
  return dates.flatMap(date => {
    return campaigns.map(campaignName => {
      // Calculate ISO week, month, and year
      const isoWeek = getISOWeek(new Date(date))
      const month = new Date(date).toLocaleString('default', { month: 'long' })
      const year = new Date(date).getFullYear().toString()
      
      // Random spending amount
      const amountSpent = (Math.random() * 3000).toFixed(2)
      
      // Random metrics with some correlation to spending
      const impressions = Math.floor(Math.random() * 30000) + 5000
      const reach = Math.floor(impressions * (0.6 + Math.random() * 0.3))
      const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.05))
      const linkClicks = Math.floor(clicks * (0.7 + Math.random() * 0.2))
      const landingPageViews = Math.floor(linkClicks * (0.8 + Math.random() * 0.15))
      
      // Map campaign objective based on campaign name
      let objective
      if (campaignName.includes("Sale")) {
        objective = "CONVERSIONS"
      } else if (campaignName.includes("Black Friday")) {
        objective = "CATALOG_SALES"
      } else if (campaignName.includes("Holiday")) {
        objective = "REACH"
      } else {
        objective = "TRAFFIC"
      }
      
      // Return structured data in the requested format
      return {
        "Date": date,
        "ISO Week": isoWeek,
        "Month": month,
        "Year": year,
        "Campaing Name": campaignName,
        "Campaing Objective": objective,
        "Buying Type": Math.random() > 0.5 ? "AUCTION" : "REACH_AND_FREQUENCY",
        "Bid Strategy": Math.random() > 0.5 ? "LOWEST_COST_WITHOUT_CAP" : "LOWEST_COST_WITH_BID_CAP",
        "Amount Spent": amountSpent,
        "Reach": reach,
        "Impressions": impressions,
        "Clicks (all)": clicks,
        "Link Clicks": linkClicks,
        "Landing Page views": landingPageViews
      }
    })
  })
}

// Helper function to get dates between a range
function getDatesInRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split('T')[0])
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

// Helper function to get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNumber.toString().padStart(2, '0')
}