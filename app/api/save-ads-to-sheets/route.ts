import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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
            const processedAds = data.ads.map((item: any) => {
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
                    parseFloat(item["Amount Spent"]) || 0,
                    parseInt(item.Reach, 10) || 0,
                    parseInt(item.Impressions, 10) || 0,
                    parseInt(item["Clicks (all)"], 10) || 0,
                    parseInt(item["Link Clicks"], 10) || 0,
                    parseInt(item["Landing Page views"], 10) || 0,
                    parseInt(item["View Content"], 10) || 0,
                    parseFloat(item["View Content Conversion Value"]) || 0,
                    parseInt(item["Add To Wishlist"], 10) || 0,
                    parseFloat(item["Add To Wishlist Conversion Value"]) || 0,
                    parseInt(item["Add To Cart"], 10) || 0,
                    parseFloat(item["Add To Cart Conversion Value"]) || 0,
                    parseInt(item["Initiated Checkout"], 10) || 0,
                    parseFloat(item["Initiated Checkout Conversion Value"]) || 0,
                    parseInt(item["Adds Payment Info"], 10) || 0,
                    parseFloat(item["Add Payment Info Conversion Value"]) || 0,
                    parseInt(item.Purchase, 10) || 0,
                    parseFloat(item["Purchase Conversion Value"]) || 0,
                    parseInt(item.Leads, 10) || 0,
                    parseFloat(item["Lead Conversion Value"]) || 0,
                    parseInt(item.Contact, 10) || 0,
                    parseFloat(item["Contact Conversion Value"]) || 0
                ];
            });
            consolidatedData.push(...processedAds);
            results.ads = { success: true, count: processedAds.length };
        }

        // Process campaign data if present with enhanced metrics
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            const processedCampaigns = data.campaigns.map((item: any) => {
                // For campaign data, create a similar array but with different structure
                // Fill in the same columns as ads but with "Campaign" type and campaign-level data
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
                    parseFloat(item["Amount Spent"]) || 0,
                    parseInt(item.Reach, 10) || 0,
                    parseInt(item.Impressions, 10) || 0,
                    parseInt(item["Clicks (all)"], 10) || 0,
                    parseInt(item["Link Clicks"], 10) || 0,
                    parseInt(item["Landing Page views"], 10) || 0
                ];

                // Fill remaining columns with 0s or values if available
                for (let i = 16; i < adHeaders.length - 1; i++) {
                    const metricName = adHeaders[i];
                    campaignRow.push(item[metricName] || 0);
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
                'Clicks (all)', 'Link Clicks', 'Landing Page views', 'View Content', 'Add To Cart',
                'Initiated Checkout', 'Purchase'
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
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (!spreadsheetId) {
            throw new Error('Missing GOOGLE_SHEETS_ID in environment');
        }

        // Fetch spreadsheet metadata without grid data
        const response = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
        const sheetsMeta = response.data.sheets;
        if (!sheetsMeta || sheetsMeta.length === 0) {
            throw new Error('Spreadsheet contains no sheets');
        }

        // Get all available sheet IDs and names for reporting
        const availableSheets = sheetsMeta.map(sheet => ({
            title: sheet.properties?.title,
            id: sheet.properties?.sheetId
        })).filter(sheet => sheet.title && sheet.id !== undefined);

        // Find the main MarketingAPI sheet for primary data source
        const marketingApiSheet = availableSheets.find(s => s.title === 'MarketingAPI');
        const performanceSheet = availableSheets.find(s => s.title === 'PerformanceMetrics');

        if (!marketingApiSheet) {
            throw new Error('MarketingAPI sheet not found in spreadsheet');
        }

        // Build Looker Studio Linking API URL with advanced configuration
        const url = new URL('https://lookerstudio.google.com/reporting/create');

        // Configure primary data source
        url.searchParams.set('ds.connector', 'googleSheets');
        url.searchParams.set('ds.spreadsheetId', spreadsheetId);
        url.searchParams.set('ds.worksheetId', marketingApiSheet.id!.toString());
        url.searchParams.set('ds.refreshFields', 'true');
        url.searchParams.set('ds.dataSourceId', 'marketingData');
        url.searchParams.set('r.reportName', 'Marketing Performance Dashboard');

        // Add second data source if performance metrics sheet exists
        if (performanceSheet) {
            url.searchParams.set('ds2.connector', 'googleSheets');
            url.searchParams.set('ds2.spreadsheetId', spreadsheetId);
            url.searchParams.set('ds2.worksheetId', performanceSheet.id!.toString());
            url.searchParams.set('ds2.refreshFields', 'true');
            url.searchParams.set('ds2.dataSourceId', 'performanceMetrics');
        }

        // Updated Looker Studio report configuration based on enhanced metrics
        const reportConfig = {
            "reportType": "DASHBOARD",
            "style": "MODERN",
            "components": [
                {
                    "type": "SCORECARD",
                    "title": "Performance Overview",
                    "position": { "x": 0, "y": 0, "width": 4, "height": 2 },
                    "metrics": [
                        { "field": "SUM(Impressions)", "name": "Total Impressions" },
                        { "field": "SUM(\"Link Clicks\")", "name": "Total Link Clicks" },
                        { "field": "SUM(\"Amount Spent\")", "name": "Total Spend" },
                        { "field": "SUM(Purchase)", "name": "Total Purchases" }
                    ]
                },
                {
                    "type": "TIME_SERIES",
                    "title": "Performance Trends",
                    "position": { "x": 0, "y": 2, "width": 12, "height": 4 },
                    "dimensions": ["Date"],
                    "metrics": ["SUM(Impressions)", "SUM(\"Link Clicks\")", "SUM(Purchase)"]
                },
                {
                    "type": "TABLE",
                    "title": "Campaign Performance",
                    "position": { "x": 0, "y": 6, "width": 12, "height": 4 },
                    "dimensions": ["Type", "\"Campaign Name\"", "\"Ad Name\""],
                    "metrics": [
                        "SUM(Impressions)",
                        "SUM(\"Link Clicks\")",
                        "SUM(\"Amount Spent\")",
                        "SUM(\"Add To Cart\")",
                        "SUM(Purchase)",
                        "SUM(\"Purchase Value\")"
                    ]
                },
                {
                    "type": "PIE_CHART",
                    "title": "Spend Distribution by Campaign",
                    "position": { "x": 4, "y": 0, "width": 4, "height": 2 },
                    "dimensions": ["\"Campaign Name\""],
                    "metrics": ["SUM(\"Amount Spent\")"]
                },
                {
                    "type": "BAR_CHART",
                    "title": "Conversion Funnel",
                    "position": { "x": 8, "y": 0, "width": 4, "height": 2 },
                    "metrics": [
                        "SUM(\"View Content\")",
                        "SUM(\"Add To Cart\")",
                        "SUM(\"Initiated Checkout\")",
                        "SUM(Purchase)"
                    ]
                },
                {
                    "type": "BAR_CHART",
                    "title": "Top Ads by ROI",
                    "position": { "x": 0, "y": 10, "width": 6, "height": 4 },
                    "dimensions": ["\"Ad Name\""],
                    "metrics": ["AVG(ROI)"],
                    "sort": { "field": "AVG(ROI)", "direction": "DESC" },
                    "limit": 10
                },
                {
                    "type": "SCATTER_CHART",
                    "title": "Spend vs. Purchase Value",
                    "position": { "x": 6, "y": 10, "width": 6, "height": 4 },
                    "dimensions": ["\"Campaign Name\""],
                    "metrics": ["SUM(\"Amount Spent\")", "SUM(\"Purchase Value\")"]
                }
            ],
            "filters": [
                { "field": "Date", "name": "Date Range" },
                { "field": "Type", "name": "Ad Type" },
                { "field": "\"Campaign Name\"", "name": "Campaign" },
                { "field": "\"Campaign Objective\"", "name": "Objective" }
            ],
            "fields": [
                { "id": "Type", "name": "Type", "type": "TEXT" },
                { "id": "Date", "name": "Date", "type": "DATE" },
                { "id": "ISO Week", "name": "Week", "type": "NUMBER" },
                { "id": "Month", "name": "Month", "type": "NUMBER" },
                { "id": "Year", "name": "Year", "type": "NUMBER" },
                { "id": "Ad Name", "name": "Ad Name", "type": "TEXT" },
                { "id": "Ad Set Name", "name": "Ad Set Name", "type": "TEXT" },
                { "id": "Campaign Name", "name": "Campaign Name", "type": "TEXT" },
                { "id": "Campaign Objective", "name": "Campaign Objective", "type": "TEXT" },
                { "id": "Amount Spent", "name": "Amount Spent", "type": "CURRENCY" },
                { "id": "Impressions", "name": "Impressions", "type": "NUMBER" },
                { "id": "Clicks (all)", "name": "All Clicks", "type": "NUMBER" },
                { "id": "Link Clicks", "name": "Link Clicks", "type": "NUMBER" },
                { "id": "Purchase", "name": "Purchases", "type": "NUMBER" },
                { "id": "Purchase Value", "name": "Purchase Value", "type": "CURRENCY" },
                { "id": "ROI", "name": "ROI", "type": "PERCENT" }
            ]
        };

        url.searchParams.set('c.reportConfig', encodeURIComponent(JSON.stringify(reportConfig)));

        return NextResponse.json({
            success: true,
            url: url.toString(),
            availableSheets: availableSheets
        });
    } catch (err: any) {
        console.error('Looker Studio export error:', err);
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

    // Process data rows - adjust for the new data structure
    const rows = items.map(item => {
        if (dataType === 'ad') {
            return [
                item.Date || new Date().toISOString().split('T')[0],
                item["ISO Week"] || '',
                item.Month || '',
                item.Year || '',
                item["Ad Name"] || '',
                item["Ad Set Name"] || '',
                item["Campaing Name"] || '', // Note the typo in original
                item["Campaing Objective"] || '',
                item["Buying Type"] || '',
                item["Bid Strategy"] || '',
                parseFloat(item["Amount Spent"]) || 0,
                parseInt(item.Reach, 10) || 0,
                parseInt(item.Impressions, 10) || 0,
                parseInt(item["Clicks (all)"], 10) || 0,
                parseInt(item["Link Clicks"], 10) || 0,
                parseInt(item["Landing Page views"], 10) || 0,
                parseInt(item["View Content"], 10) || 0,
                parseInt(item["Add To Cart"], 10) || 0,
                parseInt(item["Initiated Checkout"], 10) || 0,
                parseInt(item.Purchase, 10) || 0
            ];
        } else {
            // Campaign data
            return [
                item.Date || new Date().toISOString().split('T')[0],
                item["ISO Week"] || '',
                item.Month || '',
                item.Year || '',
                item["Campaing Name"] || '', // Note the typo in original
                item["Campaing Objective"] || '',
                item["Buying Type"] || '',
                item["Bid Strategy"] || '',
                parseFloat(item["Amount Spent"]) || 0,
                parseInt(item.Reach, 10) || 0,
                parseInt(item.Impressions, 10) || 0,
                parseInt(item["Clicks (all)"], 10) || 0,
                parseInt(item["Link Clicks"], 10) || 0,
                parseInt(item["Landing Page views"], 10) || 0
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

// Helper function to calculate enhanced performance metrics and save to a dedicated sheet
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

    // Define headers for enhanced performance metrics
    const metricsHeaders = [
        'Date', 'Type', 'Campaign Name', 'Ad Name', 'ROI', 'ROAS', 'CPA', 'CPC', 'CTR',
        'Conversion Rate', 'Cart Abandonment Rate', 'Cost Per Purchase', 'AOV', 'WeekDay'
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
        // Find indices for better data access
        const typeIndex = 0;
        const dateIndex = 1;
        const adNameIndex = 5;
        const campaignNameIndex = 7;
        const spendIndex = 11;
        const impressionsIndex = 13;
        const clicksIndex = 15;
        const addToCartIndex = 21;
        const initCheckoutIndex = 23;
        const purchaseIndex = 27;
        const purchaseValueIndex = 28;

        // Process each row into performance metrics
        const performanceRows = data.map(row => {
            const date = row[dateIndex];
            const type = row[typeIndex];
            const adName = row[adNameIndex] || '';
            const campaignName = row[campaignNameIndex] || '';

            const spend = parseFloat(row[spendIndex]) || 0;
            const impressions = parseInt(row[impressionsIndex]) || 0;
            const clicks = parseInt(row[clicksIndex]) || 0;
            const addToCart = parseInt(row[addToCartIndex]) || 0;
            const initCheckout = parseInt(row[initCheckoutIndex]) || 0;
            const purchases = parseInt(row[purchaseIndex]) || 0;
            const purchaseValue = parseFloat(row[purchaseValueIndex]) || 0;

            // Calculate metrics
            const roi = spend > 0 ? ((purchaseValue - spend) / spend) * 100 : 0;
            const roas = spend > 0 ? purchaseValue / spend : 0;
            const cpa = clicks > 0 ? spend / clicks : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const convRate = clicks > 0 ? (purchases / clicks) * 100 : 0;
            const cartAbandonRate = addToCart > 0 ? ((addToCart - purchases) / addToCart) * 100 : 0;
            const costPerPurchase = purchases > 0 ? spend / purchases : 0;
            const aov = purchases > 0 ? purchaseValue / purchases : 0;

            const dateObj = new Date(date);
            const weekDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            return [
                date,
                type,
                campaignName,
                adName,
                roi.toFixed(2),
                roas.toFixed(2),
                cpa.toFixed(2),
                cpc.toFixed(2),
                ctr.toFixed(2),
                convRate.toFixed(2),
                cartAbandonRate.toFixed(2),
                costPerPurchase.toFixed(2),
                aov.toFixed(2),
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