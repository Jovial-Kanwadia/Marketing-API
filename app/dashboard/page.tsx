"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdAccountSelector } from "@/components/ad-account-selector"
import { AdPerformanceTable } from "@/components/ad-performance-table"
import { CampaignPerformanceTable } from "@/components/campaign-performance-table"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ExportButton } from "@/components/export-button"

// Define the data structure that matches your specified format
export interface AdPerformanceData {
    Date: string
    "ISO Week": string
    Month: string
    Year: string
    "Ad Name": string
    "Ad Set Name": string
    "Campaing Name": string
    "Campaing Objective": string
    "Buying Type": string
    "Bid Strategy": string
    "Amount Spent": number
    Reach: number
    Impressions: number
    "Clicks (all)": number
    "Link Clicks": number
    "Landing Page views": number
    "View Content": number
    "View Content Conversion Value": number
    "Add To Wishlist": number
    "Add To Wishlist Conversion Value": number
    "Add To Cart": number
    "Add To Cart Conversion Value": number
    "Initiated Checkout": number
    "Initiated Checkout Conversion Value": number
    "Adds Payment Info": number
    "Add Payment Info Conversion Value": number
    Purchase: number
    "Purchase Conversion Value": number
    Leads: number
    "Lead Conversion Value": number
    Contact: number
    "Contact Conversion Value": number
}

export interface CampaignPerformanceData {
    Date: string
    "ISO Week": string
    Month: string
    Year: string
    "Campaing Name": string
    "Campaing Objective": string
    "Buying Type": string
    "Bid Strategy": string
    "Amount Spent": number
    Reach: number
    Impressions: number
    "Clicks (all)": number
    "Link Clicks": number
    "Landing Page views": number
    // Add other campaign-level metrics as needed
}

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [selectedAccount, setSelectedAccount] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [adData, setAdData] = useState<AdPerformanceData[]>([])
    const [campaignData, setCampaignData] = useState<CampaignPerformanceData[]>([])

    useEffect(() => {
        if (status === "authenticated" && selectedAccount) {
            fetchAdData(selectedAccount)
        }
    }, [status, selectedAccount])

    const fetchAdData = async (accountId: string) => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/ads?accountId=${accountId}`)
            const data = await response.json()
            setAdData(data.ads || [])
            setCampaignData(data.campaigns || [])
        } catch (error) {
            console.error("Failed to fetch ad data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "loading") {
        return (
            <DashboardShell>
                <DashboardHeader heading="Dashboard" text="Loading your ad account data..." />
                <div className="grid gap-4">
                    <Card>
                        <CardContent className="flex h-40 items-center justify-center">
                            <p className="text-muted-foreground">Loading...</p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardShell>
        )
    }

    return (
        <DashboardShell>
            <DashboardHeader heading="Ad Performance Dashboard" text="View and analyze your Facebook ad performance metrics">
                <ExportButton adData={adData} campaignData={campaignData} />
            </DashboardHeader>
            <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Ad Account Selection</CardTitle>
                        <CardDescription>Select an ad account to view performance data</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AdAccountSelector onSelectAccount={setSelectedAccount} className="w-full md:w-1/2" />
                    </CardContent>
                </Card>

                <Tabs defaultValue="campaigns" className="w-full overflow-hidden">
                    <TabsList className="w-full flex justify-start mb-2">
                        <TabsTrigger value="campaigns" className="flex-1 max-w-[200px]">Campaigns</TabsTrigger>
                        <TabsTrigger value="ads" className="flex-1 max-w-[200px]">Ads</TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaigns" className="w-full">
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Campaign Performance</CardTitle>
                                <CardDescription>Overview of your campaign performance metrics</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-2 md:p-6">
                                <CampaignPerformanceTable data={campaignData} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="ads" className="w-full">
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Ad Performance</CardTitle>
                                <CardDescription>Detailed performance metrics for individual ads</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-2 md:p-6">
                                <AdPerformanceTable data={adData} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardShell>
    )
}