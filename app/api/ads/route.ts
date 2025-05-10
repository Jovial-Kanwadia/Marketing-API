import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// Helper function to fetch paginated data from Facebook API
async function fetchPaginated(url: string, accessToken: string) {
  let data = [];
  let nextUrl = url;
  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Facebook API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const json = await response.json();
      
      if (!json.data) {
        console.error("Unexpected response format:", json);
        if (json.error) {
          throw new Error(`Facebook API error: ${json.error.message}`);
        }
        break;
      }
      
      data = data.concat(json.data);
      nextUrl = json.paging?.next;
    } catch (error) {
      console.error("Error in fetchPaginated:", error);
      throw error;
    }
  }
  return data;
}

// Helper function to get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return weekNumber.toString().padStart(2, "0");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  
  // Set default date range to fetch data for the last 90 days (safer default)
  const toDate = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  if (!accountId) {
    return new NextResponse(
      JSON.stringify({ error: "Ad account ID is required" }),
      { status: 400 }
    );
  }
  
  // Clean up the accountId - some clients might include "act_" prefix already
  const cleanAccountId = accountId.startsWith("act_") ? accountId.substring(4) : accountId;

  try {
    if (!session.accessToken) {
      return new NextResponse(JSON.stringify({ error: "No access token found in session" }), {
        status: 401,
      });
    }
    
    const accessToken = session.accessToken;
    
    // Properly format the time range parameter for Facebook API
    const timeRangeParam = encodeURIComponent(`{"since":"${fromDate}","until":"${toDate}"}`);

    // Fetch campaigns
    const campaignsUrl = `https://graph.facebook.com/v17.0/act_${cleanAccountId}/campaigns?fields=id,name,objective,buying_type,bid_strategy&limit=100`;
    console.log("Fetching campaigns from:", campaignsUrl);
    const campaigns = await fetchPaginated(campaignsUrl, accessToken);

    // Fetch ad sets
    const adsetsUrl = `https://graph.facebook.com/v17.0/act_${cleanAccountId}/adsets?fields=id,name,bid_strategy,campaign_id&limit=100`;
    console.log("Fetching ad sets from:", adsetsUrl);
    const adsets = await fetchPaginated(adsetsUrl, accessToken);

    // Fetch ad insights with fixed date range
    const adInsightsUrl = `https://graph.facebook.com/v17.0/act_${cleanAccountId}/insights?level=ad&time_increment=1&time_range=${timeRangeParam}&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,date_start,date_stop,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values&limit=100`;
    console.log("Fetching ad insights from:", adInsightsUrl);
    const adInsights = await fetchPaginated(adInsightsUrl, accessToken);

    // Fetch campaign insights with fixed date range
    const campaignInsightsUrl = `https://graph.facebook.com/v17.0/act_${cleanAccountId}/insights?level=campaign&time_increment=1&time_range=${timeRangeParam}&fields=campaign_id,campaign_name,date_start,date_stop,spend,impressions,reach,clicks,inline_link_clicks,actions&limit=100`;
    console.log("Fetching campaign insights from:", campaignInsightsUrl);
    const campaignInsights = await fetchPaginated(campaignInsightsUrl, accessToken);

    // Create maps for quick lookup
    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));
    const adsetMap = new Map(adsets.map((a) => [a.id, a]));

    // Process ad insights
    const ads = adInsights.map((insight) => {
      const campaign = campaignMap.get(insight.campaign_id);
      const adset = adsetMap.get(insight.adset_id);
      const date = insight.date_start;
      const isoWeek = getISOWeek(new Date(date));
      const month = new Date(date).toLocaleString("default", { month: "long" });
      const year = new Date(date).getFullYear().toString();

      return {
        "Date": date,
        "ISO Week": isoWeek,
        "Month": month,
        "Year": year,
        "Ad Name": insight.ad_name || "",
        "Ad Set Name": insight.adset_name || "",
        "Campaing Name": insight.campaign_name || "",
        "Campaing Objective": campaign?.objective || "",
        "Buying Type": campaign?.buying_type || "",
        "Bid Strategy": adset?.bid_strategy || "",
        "Amount Spent": insight.spend || "0",
        "Reach": insight.reach || "0",
        "Impressions": insight.impressions || "0",
        "Clicks (all)": insight.clicks || "0",
        "Link Clicks": insight.inline_link_clicks || "0",
        "Landing Page views": insight.actions?.find((a) => a.action_type === "landing_page_view")?.value || "0",
        "View Content": insight.actions?.find((a) => a.action_type === "view_content")?.value || "0",
        "View Content Conversion Value": insight.action_values?.find((a) => a.action_type === "view_content")?.value || "0",
        "Add To Wishlist": insight.actions?.find((a) => a.action_type === "add_to_wishlist")?.value || "0",
        "Add To Wishlist Conversion Value": insight.action_values?.find((a) => a.action_type === "add_to_wishlist")?.value || "0",
        "Add To Cart": insight.actions?.find((a) => a.action_type === "add_to_cart")?.value || "0",
        "Add To Cart Conversion Value": insight.action_values?.find((a) => a.action_type === "add_to_cart")?.value || "0",
        "Initiated Checkout": insight.actions?.find((a) => a.action_type === "initiate_checkout")?.value || "0",
        "Initiated Checkout Conversion Value": insight.action_values?.find((a) => a.action_type === "initiate_checkout")?.value || "0",
        "Adds Payment Info": insight.actions?.find((a) => a.action_type === "add_payment_info")?.value || "0",
        "Add Payment Info Conversion Value": insight.action_values?.find((a) => a.action_type === "add_payment_info")?.value || "0",
        "Purchase": insight.actions?.find((a) => a.action_type === "purchase")?.value || "0",
        "Purchase Conversion Value": insight.action_values?.find((a) => a.action_type === "purchase")?.value || "0",
        "Leads": insight.actions?.find((a) => a.action_type === "lead")?.value || "0",
        "Lead Conversion Value": insight.action_values?.find((a) => a.action_type === "lead")?.value || "0",
        "Contact": insight.actions?.find((a) => a.action_type === "contact")?.value || "0",
        "Contact Conversion Value": insight.action_values?.find((a) => a.action_type === "contact")?.value || "0",
      };
    });

    // Process campaign insights
    const campaignsData = campaignInsights.map((insight) => {
      const campaign = campaignMap.get(insight.campaign_id);
      const date = insight.date_start;
      const isoWeek = getISOWeek(new Date(date));
      const month = new Date(date).toLocaleString("default", { month: "long" });
      const year = new Date(date).getFullYear().toString();

      return {
        "Date": date,
        "ISO Week": isoWeek,
        "Month": month,
        "Year": year,
        "Campaing Name": insight.campaign_name || "",
        "Campaing Objective": campaign?.objective || "",
        "Buying Type": campaign?.buying_type || "",
        "Bid Strategy": campaign?.bid_strategy || "",
        "Amount Spent": insight.spend || "0",
        "Reach": insight.reach || "0",
        "Impressions": insight.impressions || "0",
        "Clicks (all)": insight.clicks || "0",
        "Link Clicks": insight.inline_link_clicks || "0",
        "Landing Page views": insight.actions?.find((a) => a.action_type === "landing_page_view")?.value || "0",
      };
    });

    return new NextResponse(JSON.stringify({
      ads,
      campaigns: campaignsData,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching ad data:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to fetch ad data";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new NextResponse(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
    });
  }
}