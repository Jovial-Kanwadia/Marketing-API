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
        // This works better with Looker Studio
        const adHeaders = [
            'Type', 'Name', 'Campaign', 'Impressions', 'Clicks', 'Spend', 'CTR', 'CPC', 'Conversions', 'Date'
        ];

        // Create consolidated arrays for both types of data
        const consolidatedData = [];

        // Process ad data if present
        if (Array.isArray(data.ads) && data.ads.length > 0) {
            const processedAds = data.ads.map((item: any ) => [
                'Ad',  // Type identifier
                item.ad_name || item.name || '',
                item.campaign_name || '',
                parseInt(item.impressions, 10) || 0,
                parseInt(item.clicks, 10) || 0,
                parseFloat(item.spend) || 0,
                parseFloat(item.ctr) || 0,
                parseFloat(item.cpc) || 0,
                parseInt(item.conversions, 10) || 0,
                item.date || new Date().toISOString().split('T')[0]
            ]);
            consolidatedData.push(...processedAds);
            results.ads = { success: true, count: processedAds.length };
        }

        // Process campaign data if present
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            const processedCampaigns = data.campaigns.map((item: any) => [
                'Campaign',  // Type identifier
                item.name || item.campaign_name || '',
                '', // No parent campaign 
                parseInt(item.impressions, 10) || 0,
                parseInt(item.clicks, 10) || 0,
                parseFloat(item.spend) || 0,
                parseFloat(item.ctr) || 0,
                parseFloat(item.cpc) || 0,
                parseInt(item.conversions, 10) || 0,
                item.date || new Date().toISOString().split('T')[0]
            ]);
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

        return NextResponse.json({
            success: true,
            message: `Saved ${results.ads.count} ads and ${results.campaigns.count} campaigns to Google Sheets`,
            results
        });

    } catch (error: any) {
        console.error('Error saving data to Google Sheets:', error);
        return NextResponse.json(
            { error: `Failed to save data: ${error.message}` },
            { status: 500 }
        );
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