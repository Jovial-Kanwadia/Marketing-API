"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/date-range-picker"
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
    const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() })
    const [isLoading, setIsLoading] = useState(true)
    const [adData, setAdData] = useState<AdPerformanceData[]>([])
    const [campaignData, setCampaignData] = useState<CampaignPerformanceData[]>([])

    useEffect(() => {
        if (status === "authenticated" && selectedAccount) {
            fetchAdData(selectedAccount)
        }
    }, [status, selectedAccount, dateRange])

    const fetchAdData = async (accountId: string) => {
        setIsLoading(true)
        try {
            // Include date range in the API call
            const fromDate = dateRange.from.toISOString().split('T')[0]
            const toDate = dateRange.to.toISOString().split('T')[0]

            const response = await fetch(
                `/api/ads?accountId=${accountId}&from=${fromDate}&to=${toDate}`
            )
            const data = await response.json()
            setAdData(data.ads || [])
            setCampaignData(data.campaigns || [])
        } catch (error) {
            console.error("Failed to fetch ad data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDateRangeChange = (range: { from: Date; to: Date }) => {
        setDateRange(range)
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
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Select an ad account and date range to view performance data</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 sm:flex-row">
                        <AdAccountSelector onSelectAccount={setSelectedAccount} className="w-full sm:w-1/3" />
                        <DatePickerWithRange
                            className="w-full sm:w-2/3"
                            onChange={handleDateRangeChange}
                            value={dateRange}
                        />
                    </CardContent>
                </Card>

                <Tabs defaultValue="campaigns">
                    <TabsList>
                        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                        <TabsTrigger value="ads">Ads</TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaigns">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaign Performance</CardTitle>
                                <CardDescription>Overview of your campaign performance metrics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CampaignPerformanceTable data={campaignData} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="ads">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ad Performance</CardTitle>
                                <CardDescription>Detailed performance metrics for individual ads</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AdPerformanceTable data={adData} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardShell>
    )
}