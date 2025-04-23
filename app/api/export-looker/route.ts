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

        // Process all data into a single main MarketingAPI sheet
        // Enhanced headers for better Looker Studio visualization
        const adHeaders = [
            'Type', 'Name', 'Campaign', 'Impressions', 'Clicks', 'Spend', 'CTR', 'CPC', 'Conversions', 'Date', 'Week', 'Month', 'Quarter', 'Year'
        ];

        // Create consolidated arrays for both types of data
        const consolidatedData = [];

        // Process ad data if present with enhanced date dimensions
        if (Array.isArray(data.ads) && data.ads.length > 0) {
            const processedAds = data.ads.map((item: any) => {
                const date = item.date || new Date().toISOString().split('T')[0];
                const dateObj = new Date(date);
                
                // Extract date dimensions for better reporting
                const week = getWeekNumber(dateObj);
                const month = dateObj.getMonth() + 1;
                const quarter = Math.floor(month / 3) + 1;
                const year = dateObj.getFullYear();
                
                return [
                    'Ad',  // Type identifier
                    item.ad_name || item.name || '',
                    item.campaign_name || '',
                    parseInt(item.impressions, 10) || 0,
                    parseInt(item.clicks, 10) || 0,
                    parseFloat(item.spend) || 0,
                    parseFloat(item.ctr) || 0,
                    parseFloat(item.cpc) || 0,
                    parseInt(item.conversions, 10) || 0,
                    date,
                    week,
                    month,
                    quarter,
                    year
                ];
            });
            consolidatedData.push(...processedAds);
            results.ads = { success: true, count: processedAds.length };
        }

        // Process campaign data if present with enhanced date dimensions
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            const processedCampaigns = data.campaigns.map((item: any) => {
                const date = item.date || new Date().toISOString().split('T')[0];
                const dateObj = new Date(date);
                
                // Extract date dimensions for better reporting
                const week = getWeekNumber(dateObj);
                const month = dateObj.getMonth() + 1;
                const quarter = Math.floor(month / 3) + 1;
                const year = dateObj.getFullYear();
                
                return [
                    'Campaign',  // Type identifier
                    item.name || item.campaign_name || '',
                    '', // No parent campaign 
                    parseInt(item.impressions, 10) || 0,
                    parseInt(item.clicks, 10) || 0,
                    parseFloat(item.spend) || 0,
                    parseFloat(item.ctr) || 0,
                    parseFloat(item.cpc) || 0,
                    parseInt(item.conversions, 10) || 0,
                    date,
                    week,
                    month,
                    quarter,
                    year
                ];
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

        // Also keep separate sheets for backward compatibility
        if (Array.isArray(data.ads) && data.ads.length > 0) {
            await ensureSeparateSheet(sheetId, 'Ads', [
                'Ad Name', 'Campaign Name', 'Impressions', 'Clicks', 'Spend', 'CTR', 'CPC', 'Conversions', 'Date'
            ], data.ads, 'ad');
        }

        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            await ensureSeparateSheet(sheetId, 'Campaigns', [
                'Campaign Name', 'Status', 'Impressions', 'Clicks', 'Spend', 'CTR', 'CPC', 'Conversions', 'Date'
            ], data.campaigns, 'campaign');
        }

        // Calculate and add performance metrics sheet for better visualization
        await calculatePerformanceMetrics(sheetId, consolidatedData);

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

// NEW: GET endpoint to generate Looker Studio link
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
        
        // Add template configuration parameters for better initial setup
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
                        { "field": "SUM(Clicks)", "name": "Total Clicks" },
                        { "field": "SUM(Spend)", "name": "Total Spend" },
                        { "field": "SUM(Conversions)", "name": "Total Conversions" }
                    ]
                },
                {
                    "type": "TIME_SERIES",
                    "title": "Performance Trends",
                    "position": { "x": 0, "y": 2, "width": 12, "height": 4 },
                    "dimensions": ["Date"],
                    "metrics": ["SUM(Impressions)", "SUM(Clicks)", "SUM(Conversions)"]
                },
                {
                    "type": "TABLE",
                    "title": "Campaign Performance",
                    "position": { "x": 0, "y": 6, "width": 12, "height": 4 },
                    "dimensions": ["Type", "Name", "Campaign"],
                    "metrics": ["SUM(Impressions)", "SUM(Clicks)", "SUM(Spend)", "AVG(CTR)", "AVG(CPC)", "SUM(Conversions)"]
                },
                {
                    "type": "PIE_CHART",
                    "title": "Spend Distribution by Type",
                    "position": { "x": 4, "y": 0, "width": 4, "height": 2 },
                    "dimensions": ["Type"],
                    "metrics": ["SUM(Spend)"]
                },
                {
                    "type": "BAR_CHART",
                    "title": "Top Campaigns by Spend",
                    "position": { "x": 8, "y": 0, "width": 4, "height": 2 },
                    "dimensions": ["Name"],
                    "metrics": ["SUM(Spend)"],
                    "sort": { "field": "SUM(Spend)", "direction": "DESC" },
                    "limit": 5
                }
            ],
            "filters": [
                { "field": "Date", "name": "Date Range" },
                { "field": "Type", "name": "Ad Type" }
            ],
            "fields": [
                {"id": "Type", "name": "Type", "type": "TEXT"},
                {"id": "Name", "name": "Name", "type": "TEXT"},
                {"id": "Campaign", "name": "Campaign", "type": "TEXT"},
                {"id": "Impressions", "name": "Impressions", "type": "NUMBER"},
                {"id": "Clicks", "name": "Clicks", "type": "NUMBER"},
                {"id": "Spend", "name": "Spend", "type": "CURRENCY"},
                {"id": "CTR", "name": "CTR", "type": "PERCENT"},
                {"id": "CPC", "name": "CPC", "type": "CURRENCY"},
                {"id": "Conversions", "name": "Conversions", "type": "NUMBER"},
                {"id": "Date", "name": "Date", "type": "DATE"},
                {"id": "Week", "name": "Week", "type": "NUMBER"},
                {"id": "Month", "name": "Month", "type": "NUMBER"},
                {"id": "Quarter", "name": "Quarter", "type": "NUMBER"},
                {"id": "Year", "name": "Year", "type": "NUMBER"}
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

    // Process data rows
    const rows = items.map(item => {
        if (dataType === 'ad') {
            return [
                item.ad_name || item.name || '',
                item.campaign_name || '',
                parseInt(item.impressions, 10) || 0,
                parseInt(item.clicks, 10) || 0,
                parseFloat(item.spend) || 0,
                parseFloat(item.ctr) || 0,
                parseFloat(item.cpc) || 0,
                parseInt(item.conversions, 10) || 0,
                item.date || new Date().toISOString().split('T')[0]
            ];
        } else {
            // Campaign data
            return [
                item.name || item.campaign_name || '',
                item.status || 'Active',
                parseInt(item.impressions, 10) || 0,
                parseInt(item.clicks, 10) || 0,
                parseFloat(item.spend) || 0,
                parseFloat(item.ctr) || 0,
                parseFloat(item.cpc) || 0,
                parseInt(item.conversions, 10) || 0,
                item.date || new Date().toISOString().split('T')[0]
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

// NEW: Helper function to calculate performance metrics and save to a dedicated sheet
async function calculatePerformanceMetrics(spreadsheetId: string, data: any[]): Promise<void> {
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
        'Date', 'Type', 'ROI', 'CPA', 'ConversionRate', 'DailyBudget', 'SpendEfficiency', 'WeekDay'
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
        // Group by date and type for aggregated metrics
        const dateTypeMap = new Map();
        
        data.forEach(row => {
            const date = row[9]; // Date is at index 9
            const type = row[0]; // Type is at index 0
            const key = `${date}_${type}`;
            
            const spend = parseFloat(row[5]) || 0; // Spend
            const conversions = parseInt(row[8]) || 0; // Conversions
            const clicks = parseInt(row[4]) || 0; // Clicks
            
            if (!dateTypeMap.has(key)) {
                dateTypeMap.set(key, {
                    date,
                    type,
                    spend: 0,
                    conversions: 0,
                    clicks: 0
                });
            }
            
            const entry = dateTypeMap.get(key);
            entry.spend += spend;
            entry.conversions += conversions;
            entry.clicks += clicks;
        });
        
        // Calculate performance metrics
        const performanceRows = Array.from(dateTypeMap.values()).map(entry => {
            const { date, type, spend, conversions, clicks } = entry;
            const dateObj = new Date(date);
            
            // Calculate metrics
            const roi = conversions > 0 ? (conversions * 100 - spend) / spend : 0; // Assuming $100 value per conversion
            const cpa = conversions > 0 ? spend / conversions : 0;
            const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
            const dailyBudget = spend; // Simplistic, in real scenario might be target/actual
            const spendEfficiency = dailyBudget > 0 ? spend / dailyBudget : 0;
            const weekDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            
            return [
                date,
                type,
                roi.toFixed(2),
                cpa.toFixed(2),
                conversionRate.toFixed(2),
                dailyBudget.toFixed(2),
                spendEfficiency.toFixed(2),
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

// Helper function to get week number from date
function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}