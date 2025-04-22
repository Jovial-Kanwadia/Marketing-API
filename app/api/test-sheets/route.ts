import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize Google auth and sheets client
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function GET() {
    try {
        // Get the Google Sheets ID from environment variables
        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!sheetId) {
            return NextResponse.json(
                { error: 'Google Sheets ID is missing in environment variables' },
                { status: 500 }
            );
        }

        // Test authentication and access
        try {
            // Verify access to the spreadsheet
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });

            // Get list of sheets
            const sheetsList = spreadsheet.data.sheets?.map(sheet => ({
                title: sheet.properties?.title,
                sheetId: sheet.properties?.sheetId,
                index: sheet.properties?.index
            })) || [];

            return NextResponse.json({
                success: true,
                spreadsheetTitle: spreadsheet.data.properties?.title,
                spreadsheetId: sheetId,
                sheets: sheetsList,
                authInfo: {
                    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    keyProvided: !!process.env.GOOGLE_PRIVATE_KEY,
                }
            });
        } catch (error: any) {
            return NextResponse.json({
                success: false,
                error: error.message,
                code: error.code,
                authInfo: {
                    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    keyProvided: !!process.env.GOOGLE_PRIVATE_KEY
                }
            }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}