import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { AdPerformanceData, CampaignPerformanceData } from '@/app/dashboard/page';

// Initialize Google auth and sheets client
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function POST(request: NextRequest) {
    try {
        // Parse the request body to get ad data
        const data = await request.json();

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!sheetId) {
            return NextResponse.json(
                { error: 'Google Sheets ID is missing in environment variables' },
                { status: 500 }
            );
        }

        // Results object to track what was saved
        const results = {
            ads: { success: false, count: 0 },
            campaigns: { success: false, count: 0 }
        };

        // Check if we need to create or update the main sheet
        let mainSheetExists = true;
        try {
            await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'MarketingAPI!A1',
            });
        } catch (err) {
            mainSheetExists = false;
        }

        // Enhanced headers based on new dashboard data structure
        const adHeaders = [
            'Type', 'Date', 'ISO Week', 'Month', 'Year', 'Ad Name', 'Ad Set Name', 'Campaign Name',
            'Campaign Objective', 'Buying Type', 'Bid Strategy', 'Amount Spent', 'Reach', 'Impressions',
            'Clicks (all)', 'Link Clicks', 'Landing Page views', 'View Content', 'View Content Value',
            'Add To Wishlist', 'Add To Wishlist Value', 'Add To Cart', 'Add To Cart Value',
            'Initiated Checkout', 'Initiated Checkout Value', 'Adds Payment Info', 'Add Payment Info Value',
            'Purchase', 'Purchase Value', 'Leads', 'Lead Value', 'Contact', 'Contact Value'
        ];

        // Create consolidated arrays for both types of data
        const consolidatedData = [];

        // Process ad data if present with enhanced metrics
        if (Array.isArray(data.ads) && data.ads.length > 0) {
            const processedAds = data.ads.map((item: AdPerformanceData) => {
                return [
                    'Ad',  // Type identifier
                    item.Date || new Date().toISOString().split('T')[0],
                    item["ISO Week"] || '',
                    item.Month || '',
                    item.Year || new Date().getFullYear(),
                    item["Ad Name"] || '',
                    item["Ad Set Name"] || '',
                    item["Campaing Name"] || '', // Note: there's a typo in the original interface "Campaing"
                    item["Campaing Objective"] || '',
                    item["Buying Type"] || '',
                    item["Bid Strategy"] || '',
                    parseFloat(String(item["Amount Spent"])) || 0,
                    parseInt(String(item.Reach), 10) || 0,
                    parseInt(String(item.Impressions), 10) || 0,
                    parseInt(String(item["Clicks (all)"]), 10) || 0,
                    parseInt(String(item["Link Clicks"]), 10) || 0,
                    parseInt(String(item["Landing Page views"]), 10) || 0,
                    parseInt(String(item["View Content"]), 10) || 0,
                    parseFloat(String(item["View Content Conversion Value"])) || 0,
                    parseInt(String(item["Add To Wishlist"]), 10) || 0,
                    parseFloat(String(item["Add To Wishlist Conversion Value"])) || 0,
                    parseInt(String(item["Add To Cart"]), 10) || 0,
                    parseFloat(String(item["Add To Cart Conversion Value"])) || 0,
                    parseInt(String(item["Initiated Checkout"]), 10) || 0,
                    parseFloat(String(item["Initiated Checkout Conversion Value"])) || 0,
                    parseInt(String(item["Adds Payment Info"]), 10) || 0,
                    parseFloat(String(item["Add Payment Info Conversion Value"])) || 0,
                    parseInt(String(item.Purchase), 10) || 0,
                    parseFloat(String(item["Purchase Conversion Value"])) || 0,
                    parseInt(String(item.Leads), 10) || 0,
                    parseFloat(String(item["Lead Conversion Value"])) || 0,
                    parseInt(String(item.Contact), 10) || 0,
                    parseFloat(String(item["Contact Conversion Value"])) || 0
                ];
            });
            consolidatedData.push(...processedAds);
            results.ads = { success: true, count: processedAds.length };
        }

        // Process campaign data if present with enhanced metrics
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            const processedCampaigns = data.campaigns.map((item: CampaignPerformanceData) => {
                // For campaign data, create a similar array but with campaign-level data only
                const campaignRow = [
                    'Campaign',  // Type identifier
                    item.Date || new Date().toISOString().split('T')[0],
                    item["ISO Week"] || '',
                    item.Month || '',
                    item.Year || new Date().getFullYear(),
                    '', // No Ad Name
                    '', // No Ad Set Name
                    item["Campaing Name"] || '', // Note: there's a typo in the original interface "Campaing"
                    item["Campaing Objective"] || '',
                    item["Buying Type"] || '',
                    item["Bid Strategy"] || '',
                    parseFloat(String(item["Amount Spent"])) || 0,
                    parseInt(String(item.Reach), 10) || 0,
                    parseInt(String(item.Impressions), 10) || 0,
                    parseInt(String(item["Clicks (all)"]), 10) || 0,
                    parseInt(String(item["Link Clicks"]), 10) || 0,
                    parseInt(String(item["Landing Page views"]), 10) || 0
                ];

                // Fill remaining columns with zeros for campaign data since they don't have these metrics
                for (let i = campaignRow.length; i < adHeaders.length; i++) {
                    campaignRow.push(0);
                }

                return campaignRow;
            });
            consolidatedData.push(...processedCampaigns);
            results.campaigns = { success: true, count: processedCampaigns.length };
        }

        // If we need to create the sheet
        if (!mainSheetExists) {
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: sheetId,
                    requestBody: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: 'MarketingAPI'
                                    }
                                }
                            }
                        ]
                    }
                });
            } catch (error) {
                console.warn("Error creating MarketingAPI sheet:", error);
                // If this fails, we'll still try to write to the sheet
            }
        }

        // Add headers if needed and clear existing data
        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'MarketingAPI!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [adHeaders]
            }
        });

        // Clear existing data (except headers)
        await sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: 'MarketingAPI!A2:Z',
        });

        // If we have data to add
        if (consolidatedData.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: 'MarketingAPI!A2',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: consolidatedData },
            });
        }

        // Also keep separate sheets for detailed ad and campaign data
        if (Array.isArray(data.ads) && data.ads.length > 0) {
            await ensureSeparateSheet(sheetId, 'Ads', [
                'Date', 'ISO Week', 'Month', 'Year', 'Ad Name', 'Ad Set Name', 'Campaign Name',
                'Campaign Objective', 'Buying Type', 'Bid Strategy', 'Amount Spent', 'Reach', 'Impressions',
                'Clicks (all)', 'Link Clicks', 'Landing Page views', 'View Content', 'View Content Value',
                'Add To Wishlist', 'Add To Wishlist Value', 'Add To Cart', 'Add To Cart Value',
                'Initiated Checkout', 'Initiated Checkout Value', 'Adds Payment Info', 'Add Payment Info Value',
                'Purchase', 'Purchase Value', 'Leads', 'Lead Value', 'Contact', 'Contact Value'
            ], data.ads, 'ad');
        }

        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            await ensureSeparateSheet(sheetId, 'Campaigns', [
                'Date', 'ISO Week', 'Month', 'Year', 'Campaign Name', 'Campaign Objective',
                'Buying Type', 'Bid Strategy', 'Amount Spent', 'Reach', 'Impressions',
                'Clicks (all)', 'Link Clicks', 'Landing Page views'
            ], data.campaigns, 'campaign');
        }

        // Calculate and add performance metrics sheet for better visualization
        await calculatePerformanceMetrics(sheetId, consolidatedData, adHeaders);

        return NextResponse.json({
            success: true,
            message: `Saved ${results.ads.count} ads and ${results.campaigns.count} campaigns to Google Sheets`,
            results,
            lookerStudioUrl: `/api/marketing/looker-studio` // Reference to the GET endpoint for Looker Studio URL
        });

    } catch (error: any) {
        console.error('Error saving data to Google Sheets:', error);
        return NextResponse.json(
            { error: `Failed to save data: ${error.message}` },
            { status: 500 }
        );
    }
}

// GET endpoint to generate Looker Studio link
export async function GET() {
    try {
        // Ensure the spreadsheet ID is available
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (!spreadsheetId) {
            throw new Error('Missing GOOGLE_SHEETS_ID in environment');
        }

        // Fetch spreadsheet metadata to get the sheet ID
        const response = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
        const sheetsMeta = response.data.sheets;
        if (!sheetsMeta || sheetsMeta.length === 0) {
            throw new Error('Spreadsheet contains no sheets');
        }

        // Find the specific sheet (e.g., 'MarketingAPI')
        const marketingApiSheet = sheetsMeta.find(s => s.properties?.title === 'MarketingAPI');
        if (!marketingApiSheet) {
            throw new Error('MarketingAPI sheet not found in spreadsheet');
        }

        const sheetId = marketingApiSheet.properties?.sheetId;
        if (!sheetId) {
            throw new Error('Sheet ID not found for MarketingAPI');
        }

        // Create a simple Looker Studio URL with the data source connected
        const url = new URL('https://lookerstudio.google.com/reporting/create');
        url.searchParams.set('ds.connector', 'googleSheets'); // Specify Google Sheets as the connector
        url.searchParams.set('ds.spreadsheetId', spreadsheetId); // Your Google Sheet ID
        url.searchParams.set('ds.worksheetId', sheetId.toString()); // The specific sheet ID
        url.searchParams.set('ds.refreshFields', 'true'); // Ensure fields are refreshed
        url.searchParams.set('ds.dataSourceId', 'marketingData'); // A unique ID for the data source
        url.searchParams.set('r.reportName', 'Marketing Performance Dashboard'); // Default report name

        // Return the URL for redirection
        return NextResponse.json({ 
            success: true, 
            url: url.toString()
        });
    } catch (err: any) {
        console.error('Looker Studio redirect error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Helper function to ensure a sheet exists and save data to it
async function ensureSeparateSheet(
    spreadsheetId: string,
    sheetName: string,
    headers: string[],
    items: any[],
    dataType: 'ad' | 'campaign'
): Promise<void> {
    // Check if sheet exists
    try {
        await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1`,
        });
    } catch (err) {
        // Sheet doesn't exist, create it
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }
                ]
            }
        });
    }

    // Add headers
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers]
        }
    });

    // Clear existing data
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:Z`,
    });

    // Process data rows
    const rows = items.map(item => {
        if (dataType === 'ad') {
            return [
                item.Date || new Date().toISOString().split('T')[0],
                item["ISO Week"] || '',
                item.Month || '',
                item.Year || new Date().getFullYear(),
                item["Ad Name"] || '',
                item["Ad Set Name"] || '',
                item["Campaing Name"] || '',
                item["Campaing Objective"] || '',
                item["Buying Type"] || '',
                item["Bid Strategy"] || '',
                parseFloat(String(item["Amount Spent"])) || 0,
                parseInt(String(item.Reach), 10) || 0,
                parseInt(String(item.Impressions), 10) || 0,
                parseInt(String(item["Clicks (all)"]), 10) || 0,
                parseInt(String(item["Link Clicks"]), 10) || 0,
                parseInt(String(item["Landing Page views"]), 10) || 0,
                parseInt(String(item["View Content"]), 10) || 0,
                parseFloat(String(item["View Content Conversion Value"])) || 0,
                parseInt(String(item["Add To Wishlist"]), 10) || 0,
                parseFloat(String(item["Add To Wishlist Conversion Value"])) || 0,
                parseInt(String(item["Add To Cart"]), 10) || 0,
                parseFloat(String(item["Add To Cart Conversion Value"])) || 0,
                parseInt(String(item["Initiated Checkout"]), 10) || 0,
                parseFloat(String(item["Initiated Checkout Conversion Value"])) || 0,
                parseInt(String(item["Adds Payment Info"]), 10) || 0,
                parseFloat(String(item["Add Payment Info Conversion Value"])) || 0,
                parseInt(String(item.Purchase), 10) || 0,
                parseFloat(String(item["Purchase Conversion Value"])) || 0,
                parseInt(String(item.Leads), 10) || 0,
                parseFloat(String(item["Lead Conversion Value"])) || 0,
                parseInt(String(item.Contact), 10) || 0,
                parseFloat(String(item["Contact Conversion Value"])) || 0
            ];
        } else {
            // Campaign data
            return [
                item.Date || new Date().toISOString().split('T')[0],
                item["ISO Week"] || '',
                item.Month || '',
                item.Year || new Date().getFullYear(),
                item["Campaing Name"] || '',
                item["Campaing Objective"] || '',
                item["Buying Type"] || '',
                item["Bid Strategy"] || '',
                parseFloat(String(item["Amount Spent"])) || 0,
                parseInt(String(item.Reach), 10) || 0,
                parseInt(String(item.Impressions), 10) || 0,
                parseInt(String(item["Clicks (all)"]), 10) || 0,
                parseInt(String(item["Link Clicks"]), 10) || 0,
                parseInt(String(item["Landing Page views"]), 10) || 0
            ];
        }
    });

    // Add the data
    if (rows.length > 0) {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows },
        });
    }
}

// Helper function to calculate performance metrics and save to a dedicated sheet
async function calculatePerformanceMetrics(
    spreadsheetId: string, 
    data: any[],
    headers: string[]
): Promise<void> {
    // First ensure the PerformanceMetrics sheet exists
    try {
        await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'PerformanceMetrics!A1',
        });
    } catch (err) {
        // Sheet doesn't exist, create it
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: 'PerformanceMetrics'
                            }
                        }
                    }
                ]
            }
        });
    }

    // Define headers for performance metrics
    const metricsHeaders = [
        'Date', 'Type', 'Campaign', 'ROAS', 'CPA', 'CTR', 'ConversionRate', 
        'CPM', 'CPC', 'AddToCartRate', 'CheckoutRate', 'PurchaseRate', 'WeekDay'
    ];

    // Clear existing data
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'PerformanceMetrics!A1:Z',
    });

    // Add headers
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'PerformanceMetrics!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [metricsHeaders]
        }
    });

    // Calculate advanced metrics
    if (data.length > 0) {
        // Find indexes for important fields
        const typeIndex = headers.indexOf('Type');
        const dateIndex = headers.indexOf('Date');
        const campaignIndex = headers.indexOf('Campaign Name');
        const impressionsIndex = headers.indexOf('Impressions');
        const clicksIndex = headers.indexOf('Link Clicks');
        const spendIndex = headers.indexOf('Amount Spent');
        const purchaseIndex = headers.indexOf('Purchase');
        const purchaseValueIndex = headers.indexOf('Purchase Value');
        const addToCartIndex = headers.indexOf('Add To Cart');
        const checkoutIndex = headers.indexOf('Initiated Checkout');

        // Group by date, type, and campaign for aggregated metrics
        const metricMap = new Map();
        
        data.forEach(row => {
            const date = row[dateIndex];
            const type = row[typeIndex];
            const campaign = row[campaignIndex] || '';
            const key = `${date}_${type}_${campaign}`;
            
            if (!metricMap.has(key)) {
                metricMap.set(key, {
                    date,
                    type,
                    campaign,
                    spend: 0,
                    impressions: 0,
                    clicks: 0,
                    purchases: 0,
                    purchaseValue: 0,
                    addToCart: 0,
                    checkout: 0
                });
            }
            
            const entry = metricMap.get(key);
            entry.spend += parseFloat(String(row[spendIndex])) || 0;
            entry.impressions += parseInt(String(row[impressionsIndex]), 10) || 0;
            entry.clicks += parseInt(String(row[clicksIndex]), 10) || 0;
            
            if (purchaseIndex >= 0) {
                entry.purchases += parseInt(String(row[purchaseIndex]), 10) || 0;
            }
            
            if (purchaseValueIndex >= 0) {
                entry.purchaseValue += parseFloat(String(row[purchaseValueIndex])) || 0;
            }
            
            if (addToCartIndex >= 0) {
                entry.addToCart += parseInt(String(row[addToCartIndex]), 10) || 0;
            }
            
            if (checkoutIndex >= 0) {
                entry.checkout += parseInt(String(row[checkoutIndex]), 10) || 0;
            }
        });
        
        // Calculate performance metrics
        const performanceRows = Array.from(metricMap.values()).map(entry => {
            const dateObj = new Date(entry.date);
            
            // Calculate metrics
            const roas = entry.spend > 0 ? entry.purchaseValue / entry.spend : 0;
            const cpa = entry.purchases > 0 ? entry.spend / entry.purchases : 0;
            const ctr = entry.impressions > 0 ? (entry.clicks / entry.impressions) * 100 : 0;
            const conversionRate = entry.clicks > 0 ? (entry.purchases / entry.clicks) * 100 : 0;
            const cpm = entry.impressions > 0 ? (entry.spend / entry.impressions) * 1000 : 0;
            const cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0;
            const addToCartRate = entry.clicks > 0 ? (entry.addToCart / entry.clicks) * 100 : 0;
            const checkoutRate = entry.addToCart > 0 ? (entry.checkout / entry.addToCart) * 100 : 0;
            const purchaseRate = entry.checkout > 0 ? (entry.purchases / entry.checkout) * 100 : 0;
            const weekDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            return [
                entry.date,
                entry.type,
                entry.campaign,
                roas.toFixed(2),
                cpa.toFixed(2),
                ctr.toFixed(2),
                conversionRate.toFixed(2),
                cpm.toFixed(2),
                cpc.toFixed(2),
                addToCartRate.toFixed(2),
                checkoutRate.toFixed(2),
                purchaseRate.toFixed(2),
                weekDay
            ];
        });
        
        // Add performance metrics data
        if (performanceRows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'PerformanceMetrics!A2',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: performanceRows },
            });
        }
    }
}