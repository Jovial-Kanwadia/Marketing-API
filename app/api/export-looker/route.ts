import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize service-account JWT auth
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function GET() {
    try {
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
        if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_ID in environment');

        // Fetch spreadsheet metadata without grid data
        const response = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
        const sheetsMeta = response.data.sheets;
        if (!sheetsMeta || sheetsMeta.length === 0) throw new Error('Spreadsheet contains no sheets');

        // Explicitly look for the MarketingAPI sheet that contains combined data
        const targetSheet = sheetsMeta.find(s => s.properties?.title === 'MarketingAPI');
        
        if (!targetSheet) {
            throw new Error('MarketingAPI sheet not found in spreadsheet');
        }
        
        const worksheetId = targetSheet.properties?.sheetId;
        if (worksheetId == null) throw new Error('Could not determine worksheetId');

        console.log(`Using sheet "${targetSheet.properties?.title}" with ID ${worksheetId}`);

        // Build Looker Studio Linking API URL with proper parameters 
        const url = new URL('https://lookerstudio.google.com/reporting/create');
        url.searchParams.set('ds.connector', 'googleSheets');
        url.searchParams.set('ds.spreadsheetId', spreadsheetId);
        url.searchParams.set('ds.worksheetId', worksheetId.toString());
        url.searchParams.set('ds.refreshFields', 'true'); // Force field refresh
        url.searchParams.set('r.reportName', 'Facebook Marketing API Dashboard');
        
        // Add template configuration parameters for better initial setup
        url.searchParams.set('c.reportConfig', encodeURIComponent(JSON.stringify({
            "reportType": "TABLE",
            "style": "DEFAULT",
            "fields": [
                {"id": "Type", "name": "Type"},
                {"id": "Name", "name": "Name"},
                {"id": "Campaign", "name": "Campaign"},
                {"id": "Impressions", "name": "Impressions", "type": "NUMBER"},
                {"id": "Clicks", "name": "Clicks", "type": "NUMBER"},
                {"id": "Spend", "name": "Spend", "type": "NUMBER"},
                {"id": "CTR", "name": "CTR", "type": "PERCENT"},
                {"id": "CPC", "name": "CPC", "type": "CURRENCY"},
                {"id": "Conversions", "name": "Conversions", "type": "NUMBER"},
                {"id": "Date", "name": "Date", "type": "DATE"}
            ]
        })));

        return NextResponse.json({ success: true, url: url.toString() });
    } catch (err: any) {
        console.error('Looker Studio export error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}