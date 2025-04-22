import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';

// Initialize Google auth and sheets client
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function GET(request: NextRequest) {
    try {
        // Get format from URL params
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'csv';

        if (format !== 'csv' && format !== 'excel') {
            return NextResponse.json(
                { error: 'Invalid format. Use "csv" or "excel".' },
                { status: 400 }
            );
        }

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (!sheetId) {
            return NextResponse.json(
                { error: 'Google Sheets ID is missing in environment variables' },
                { status: 500 }
            );
        }

        console.log(`Fetching data from Google Sheet ID: ${sheetId}`);

        // First, verify if we can access the spreadsheet at all
        try {
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });

            console.log(`Successfully connected to spreadsheet: ${spreadsheet.data.properties?.title}`);

            // Get the first sheet name if available (in case "Sheet1" is not the correct name)
            const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
            console.log(`Using sheet name: ${sheetName}`);

            // Fetch all data from the sheet
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: sheetName,
            });

            const values = response.data.values || [];
            console.log(`Retrieved ${values.length} rows of data`);

            // If there's no data, let's create a sample row to avoid the error
            if (values.length === 0) {
                console.log('No data found, creating sample headers');

                // Create header row if sheet is empty
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [['Campaign Name', 'Impressions', 'Clicks', 'Spend', 'Date']]
                    }
                });

                // Return sample data for export
                const sampleData = [
                    ['Campaign Name', 'Impressions', 'Clicks', 'Spend', 'Date'],
                    ['Sample Campaign (No real data yet)', '0', '0', '0.00', new Date().toISOString().split('T')[0]]
                ];

                // Generate export with sample data
                if (format === 'csv') {
                    const csvContent = generateCSV(sampleData);
                    return new NextResponse(csvContent, {
                        headers: {
                            'Content-Type': 'text/csv',
                            'Content-Disposition': 'attachment; filename="facebook-ads-data.csv"'
                        }
                    });
                } else {
                    // Excel format
                    const excelBuffer = generateExcel(sampleData);
                    return new NextResponse(excelBuffer, {
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': 'attachment; filename="facebook-ads-data.xlsx"'
                        }
                    });
                }
            }

            // If we have data, proceed with normal export
            if (format === 'csv') {
                const csvContent = generateCSV(values);
                return new NextResponse(csvContent, {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': 'attachment; filename="facebook-ads-data.csv"'
                    }
                });
            } else {
                // Excel format
                const excelBuffer = generateExcel(values);
                return new NextResponse(excelBuffer, {
                    headers: {
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'Content-Disposition': 'attachment; filename="facebook-ads-data.xlsx"'
                    }
                });
            }
        } catch (sheetError: any) {
            console.error('Error accessing Google Sheet:', sheetError);
            return NextResponse.json(
                {
                    error: 'Error accessing Google Sheet',
                    details: sheetError.message,
                    code: sheetError.code
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

function generateCSV(rows: any[][]): string {
    return rows.map(row =>
        row.map(cell =>
            // Escape quotes and wrap cells with commas or quotes in quotes
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
        ).join(',')
    ).join('\n');
}

function generateExcel(rows: any[][]): Buffer {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Facebook Ads');

    // Generate buffer
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}