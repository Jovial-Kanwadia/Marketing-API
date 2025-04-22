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
        const adsData = await request.json();

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!sheetId) {
            return NextResponse.json(
                { error: 'Google Sheets ID is missing in environment variables' },
                { status: 500 }
            );
        }

        // Verify we can access the spreadsheet and get the correct sheet name
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });

        const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

        // Define the expected headers
        const expectedHeaders = [
            'Campaign Name', 'Ad Name', 'Impressions', 'Clicks', 'Spend', 'CTR', 'CPC', 'Conversions', 'Date'
        ];

        // Check if headers already exist
        const headersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!1:1`,
        });

        const headers = headersResponse.data.values?.[0] || [];

        // Add headers if they don't exist or are different
        if (headers.length === 0 || !arraysMatchIgnoreCase(headers, expectedHeaders)) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [expectedHeaders]
                }
            });
        }

        // Clear existing data (except headers) to avoid duplicates
        await sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: `${sheetName}!A2:Z`, // Clear from row 2 onwards
        });

        // Process ad data
        let rows = [];

        // Handle both ad-level and campaign-level data
        if (Array.isArray(adsData.ads) && adsData.ads.length > 0) {
            // Ad-level data
            rows = adsData.ads.map((ad: any) => [
                ad.campaign_name || '',
                ad.ad_name || ad.name || '',
                parseInt(ad.impressions, 10) || 0,
                parseInt(ad.clicks, 10) || 0,
                parseFloat(ad.spend) || 0,
                parseFloat(ad.ctr) || 0,
                parseFloat(ad.cpc) || 0,
                parseInt(ad.conversions, 10) || 0,
                ad.date || new Date().toISOString().split('T')[0]
            ]);
        } else if (Array.isArray(adsData.campaigns) && adsData.campaigns.length > 0) {
            // Campaign-level data
            rows = adsData.campaigns.map((campaign: any) => [
                campaign.name || campaign.campaign_name || '',
                'Campaign Total', // No ad name for campaign data
                parseInt(campaign.impressions, 10) || 0,
                parseInt(campaign.clicks, 10) || 0,
                parseFloat(campaign.spend) || 0,
                parseFloat(campaign.ctr) || 0,
                parseFloat(campaign.cpc) || 0,
                parseInt(campaign.conversions, 10) || 0,
                campaign.date || new Date().toISOString().split('T')[0]
            ]);
        } else if (Array.isArray(adsData) && adsData.length > 0) {
            // Direct array of data
            rows = adsData.map((item: any) => [
                item.campaign_name || '',
                item.ad_name || item.name || '',
                parseInt(item.impressions, 10) || 0,
                parseInt(item.clicks, 10) || 0,
                parseFloat(item.spend) || 0,
                parseFloat(item.ctr) || 0,
                parseFloat(item.cpc) || 0,
                parseInt(item.conversions, 10) || 0,
                item.date || new Date().toISOString().split('T')[0]
            ]);
        }

        // If we have rows to add
        if (rows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: `${sheetName}!A2`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rows },
            });

            return NextResponse.json({
                success: true,
                message: `Successfully added ${rows.length} rows of ad data to Google Sheets`,
                rowCount: rows.length
            });
        } else {
            return NextResponse.json(
                { error: 'No valid ad data provided' },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error('Error saving ads to Google Sheets:', error);
        return NextResponse.json(
            { error: `Failed to save ad data: ${error.message}` },
            { status: 500 }
        );
    }
}

// Helper to check if arrays match (case insensitive)
function arraysMatchIgnoreCase(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, i) => item.toLowerCase() === arr2[i].toLowerCase());
}