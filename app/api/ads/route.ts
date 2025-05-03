// File: /app/api/ads/route.ts
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import fetch from 'node-fetch';

// Interface for the session, extended to include accessToken
interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
  accessToken?: string;
}

// Generic API response structure from Facebook Graph API
interface ApiResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

// Data structures for Facebook API responses
interface Campaign {
  id: string;
  name: string;
  objective: string;
  buying_type: string;
}

interface AdSet {
  id: string;
  name: string;
  bid_strategy: string;
  campaign_id: string;
}

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  spend: string;
  impressions: string;
  clicks: string;
  outbound_clicks: Array<{ action_type: string; value: string }>;
  actions: Array<{ action_type: string; value: string }>;
  reach: string;
  date_start: string;
  date_stop: string;
}

interface AdInsight {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  outbound_clicks: Array<{ action_type: string; value: string }>;
  landing_page_views: string;
  reach: string;
  actions: Array<{ action_type: string; value: string }>;
  action_values: Array<{ action_type: string; value: string }>;
}

// Output formats
interface CampaignOutput {
  Date: string;
  "ISO Week": string;
  Month: string;
  Year: string;
  "Campaing Name": string; // Typo preserved as per original code
  "Campaing Objective": string; // Typo preserved
  "Buying Type": string;
  "Bid Strategy": string;
  "Amount Spent": string;
  Reach: string;
  Impressions: string;
  "Clicks (all)": string;
  "Link Clicks": string;
  "Landing Page views": string;
}

interface AdOutput {
  Date: string;
  "ISO Week": string;
  Month: string;
  Year: string;
  "Ad Name": string;
  "Ad Set Name": string;
  "Campaing Name": string; // Typo preserved
  "Campaing Objective": string; // Typo preserved
  "Buying Type": string;
  "Bid Strategy": string;
  "Amount Spent": string;
  Reach: string;
  Impressions: string;
  "Clicks (all)": string;
  "Link Clicks": string;
  "Landing Page views": string;
  "View Content": string;
  "View Content Conversion Value": string;
  "Add To Wishlist": string;
  "Add To Wishlist Conversion Value": string;
  "Add To Cart": string;
  "Add To Cart Conversion Value": string;
  "Initiated Checkout": string;
  "Initiated Checkout Conversion Value": string;
  "Adds Payment Info": string;
  "Add Payment Info Conversion Value": string;
  "Purchase": string;
  "Purchase Conversion Value": string;
  "Leads": string;
  "Lead Conversion Value": string;
  "Contact": string;
  "Contact Conversion Value": string;
}

// Generic fetch function for type safety
async function fetchJson<T>(url: string): Promise<T> {
  console.log(`Fetching data from URL: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    const errorData: any = await response.json();
    console.error(`Fetch failed with status ${response.status}:`, errorData);
    throw new Error(errorData.error?.message || `Failed to fetch: ${response.status}`);
  }
  const data = await response.json();
  console.log(`Fetch successful, received data:`, JSON.stringify(data).slice(0, 200) + "...");
  return data as T;
}

// API route handler
export async function GET(request: Request) {
  console.log("Starting GET request processing");
  const session = (await getServerSession(authOptions)) as ExtendedSession | null;
  console.log("Session retrieved:", session ? "Session exists" : "No session");

  if (!session || !session.accessToken) {
    console.error("Unauthorized: No session or access token");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  console.log("Query parameters:", { accountId, fromDate, toDate });

  if (!accountId || !fromDate || !toDate) {
    console.error("Missing required parameters:", { accountId, fromDate, toDate });
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
  }

  try {
    // Fetch campaigns
    console.log("Fetching campaigns...");
    const campaignsData = await fetchJson<ApiResponse<Campaign>>(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,objective,buying_type&access_token=${session.accessToken}`
    );
    console.log(`Fetched ${campaignsData.data.length} campaigns`);

    // Fetch ad sets
    console.log("Fetching ad sets...");
    const adsetsData = await fetchJson<ApiResponse<AdSet>>(
      `https://graph.facebook.com/v18.0/${accountId}/adsets?fields=id,name,bid_strategy,campaign_id&access_token=${session.accessToken}`
    );
    console.log(`Fetched ${adsetsData.data.length} ad sets`);

    // Fetch campaign insights
    console.log("Fetching campaign insights...");
    const campaignInsightsData = await fetchJson<ApiResponse<CampaignInsight>>(
      `https://graph.facebook.com/v18.0/${accountId}/insights?level=campaign&time_range={'since':'${fromDate}','until':'${toDate}'}&time_increment=1&fields=campaign_id,campaign_name,objective,spend,impressions,clicks,outbound_clicks,actions,reach&access_token=${session.accessToken}`
    );
    console.log(`Fetched ${campaignInsightsData.data.length} campaign insights`);

    // Fetch ad insights
    // Fetch ad insights
    console.log("Fetching ad insights...");
    const adInsightsData = await fetchJson<ApiResponse<AdInsight>>(
      `https://graph.facebook.com/v18.0/${accountId}/insights?level=ad&time_range={'since':'${fromDate}','until':'${toDate}'}&time_increment=1&fields=ad_id,ad_name,adset_id,campaign_id,date_start,date_stop,spend,impressions,clicks,outbound_clicks,reach,actions,action_values&access_token=${session.accessToken}`
    );
    console.log(`Fetched ${adInsightsData.data.length} ad insights`);

    // Create lookup maps
    console.log("Creating campaign map...");
    const campaignMap: { [key: string]: Campaign } = {};
    campaignsData.data.forEach((campaign) => {
      campaignMap[campaign.id] = campaign;
    });
    console.log(`Campaign map created with ${Object.keys(campaignMap).length} entries`);

    console.log("Creating ad set map...");
    const adsetMap: { [key: string]: AdSet } = {};
    adsetsData.data.forEach((adset) => {
      adsetMap[adset.id] = adset;
    });
    console.log(`Ad set map created with ${Object.keys(adsetMap).length} entries`);

    // Map campaign insights to output format
    console.log("Mapping campaign insights...");
    const campaigns: CampaignOutput[] = campaignInsightsData.data.map((insight, index) => {
      const campaign = campaignMap[insight.campaign_id] || {};
      const date = insight.date_start;
      const outboundClicks = insight.outbound_clicks || [];
      const actions = insight.actions || [];
      console.log(`Processing campaign insight ${index + 1}/${campaignInsightsData.data.length}`);

      return {
        Date: date,
        "ISO Week": getISOWeek(new Date(date)),
        Month: new Date(date).toLocaleString("default", { month: "long" }),
        Year: new Date(date).getFullYear().toString(),
        "Campaing Name": campaign.name || insight.campaign_name || "Unknown",
        "Campaing Objective": campaign.objective || insight.objective || "Unknown",
        "Buying Type": campaign.buying_type || "AUCTION",
        "Bid Strategy": "",
        "Amount Spent": insight.spend || "0",
        Reach: insight.reach || "0",
        Impressions: insight.impressions || "0",
        "Clicks (all)": insight.clicks || "0",
        "Link Clicks": outboundClicks.find((a) => a.action_type === "link_click")?.value || "0",
        "Landing Page views": actions.find((a) => a.action_type === "landing_page_view")?.value || "0",
      };
    });
    console.log(`Mapped ${campaigns.length} campaigns`);

    // Map ad insights to output format
    console.log("Mapping ad insights...");
    const ads: AdOutput[] = adInsightsData.data.map((insight, index) => {
      const adset = adsetMap[insight.adset_id] || {};
      const campaign = campaignMap[insight.campaign_id] || {};
      const date = insight.date_start;
      const actions = insight.actions || [];
      const actionValues = insight.action_values || [];
      const outboundClicks = insight.outbound_clicks || [];
      console.log(`Processing ad insight ${index + 1}/${adInsightsData.data.length}`);

      const landingPageViews = actions
        .find(a => a.action_type === "landing_page_view")
        ?.value || "0";
      const getActionValue = (actionType: string) =>
        actions.find((a) => a.action_type === actionType)?.value || "0";
      const getActionValueSum = (actionType: string) =>
        actionValues.find((a) => a.action_type === actionType)?.value || "0";

      console.log(`Processing ad insight ${index + 1}/${adInsightsData.data.length}`);
      return {
        Date: date,
        "ISO Week": getISOWeek(new Date(date)),
        Month: new Date(date).toLocaleString("default", { month: "long" }),
        Year: new Date(date).getFullYear().toString(),
        "Ad Name": insight.ad_name || "Unknown",
        "Ad Set Name": adset.name || "Unknown",
        "Campaing Name": campaign.name || "Unknown",
        "Campaing Objective": campaign.objective || "Unknown",
        "Buying Type": campaign.buying_type || "AUCTION",
        "Bid Strategy": adset.bid_strategy || "Unknown",
        "Amount Spent": insight.spend || "0",
        Reach: insight.reach || "0",
        Impressions: insight.impressions || "0",
        "Clicks (all)": insight.clicks || "0",
        "Link Clicks": outboundClicks.find((a) => a.action_type === "link_click")?.value || "0",
        "Landing Page views": landingPageViews,
        "View Content": getActionValue("view_content"),
        "View Content Conversion Value": getActionValueSum("view_content"),
        "Add To Wishlist": getActionValue("add_to_wishlist"),
        "Add To Wishlist Conversion Value": getActionValueSum("add_to_wishlist"),
        "Add To Cart": getActionValue("add_to_cart"),
        "Add To Cart Conversion Value": getActionValueSum("add_to_cart"),
        "Initiated Checkout": getActionValue("initiate_checkout"),
        "Initiated Checkout Conversion Value": getActionValueSum("initiate_checkout"),
        "Adds Payment Info": getActionValue("add_payment_info"),
        "Add Payment Info Conversion Value": getActionValueSum("add_payment_info"),
        "Purchase": getActionValue("purchase"),
        "Purchase Conversion Value": getActionValueSum("purchase"),
        "Leads": getActionValue("lead"),
        "Lead Conversion Value": getActionValueSum("lead"),
        "Contact": getActionValue("contact"),
        "Contact Conversion Value": getActionValueSum("contact"),
      };
    });
    console.log(`Mapped ${ads.length} ads`);

    // Combine results
    console.log("Combining results...");
    const result = { campaigns, ads };
    console.log("Returning response with campaigns and ads");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET handler:", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
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