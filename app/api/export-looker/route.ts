// /pages/api/createLookerReport.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize service-account JWT auth
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,                               // Service account email
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),                     // Private key with proper newlines
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],                       // Read/write access to Sheets API
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

        // Attempt to find sheet named "MarketingAPI", fallback to first sheet
        const targetSheet = sheetsMeta.find(s => s.properties?.title?.trim() === 'MarketingAPI')
            ?? sheetsMeta[0];
        const worksheetId = targetSheet.properties?.sheetId;
        if (worksheetId == null) throw new Error('Could not determine worksheetId');

        console.log(`Using sheet "${targetSheet.properties?.title}" with ID ${worksheetId}`);

        // Build Looker Studio Linking API URL with numeric worksheetId (e.g., "0")
        const url = new URL('https://lookerstudio.google.com/reporting/create');
        url.searchParams.set('ds.connector', 'googleSheets');
        url.searchParams.set('ds.spreadsheetId', spreadsheetId);
        url.searchParams.set('ds.worksheetId', worksheetId.toString());
        url.searchParams.set('r.reportName', 'Facebook Ads Data');

        return NextResponse.json({ success: true, url: url.toString() });
    } catch (err: any) {
        console.error('Looker Studio export error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}