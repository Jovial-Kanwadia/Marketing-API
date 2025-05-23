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
        const dataType = searchParams.get('type') || 'all'; // 'ads', 'campaigns', or 'all'

        if (format !== 'csv' && format !== 'excel') {
            return NextResponse.json(
                { error: 'Invalid format. Use "csv" or "excel".' },
                { status: 400 }
            );
        }

        if (dataType !== 'ads' && dataType !== 'campaigns' && dataType !== 'all') {
            return NextResponse.json(
                { error: 'Invalid type. Use "ads", "campaigns", or "all".' },
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

        console.log(`Fetching ${dataType} data from Google Sheet ID: ${sheetId}`);

        // First, verify if we can access the spreadsheet at all
        try {
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });

            console.log(`Successfully connected to spreadsheet: ${spreadsheet.data.properties?.title}`);

            // Define sheet names for different data types
            const sheetMap = {
                ads: 'Ads',
                campaigns: 'Campaigns',
                all: 'MarketingAPI'
            };

            const sheetName = sheetMap[dataType as keyof typeof sheetMap];
            console.log(`Using sheet name: ${sheetName}`);

            // Fetch all data from the sheet
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: sheetName,
            });

            const values = response.data.values || [];
            console.log(`Retrieved ${values.length} rows of data`);

            // If there's no data, let's create a sample row based on data type
            if (values.length === 0) {
                console.log('No data found, creating sample headers');

                let headers: string[] = [];

                // Create appropriate headers based on data type
                if (dataType === 'ads' || dataType === 'all') {
                    headers = [
                        'Date', 'ISO Week', 'Month', 'Year', 'Ad Name', 'Ad Set Name', 'Campaign Name',
                        'Campaign Objective', 'Buying Type', 'Bid Strategy', 'Amount Spent', 'Reach', 'Impressions',
                        'Clicks (all)', 'Link Clicks', 'Landing Page views', 'View Content', 'View Content Conversion Value',
                        'Add To Wishlist', 'Add To Wishlist Conversion Value', 'Add To Cart', 'Add To Cart Conversion Value',
                        'Initiated Checkout', 'Initiated Checkout Conversion Value', 'Adds Payment Info', 'Add Payment Info Conversion Value',
                        'Purchase', 'Purchase Conversion Value', 'Leads', 'Lead Conversion Value', 'Contact', 'Contact Conversion Value'
                    ];
                } else if (dataType === 'campaigns') {
                    headers = [
                        'Date', 'ISO Week', 'Month', 'Year', 'Campaign Name', 'Campaign Objective',
                        'Buying Type', 'Bid Strategy', 'Amount Spent', 'Reach', 'Impressions',
                        'Clicks (all)', 'Link Clicks', 'Landing Page views'
                    ];
                }

                // Create header row if sheet is empty
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [headers]
                    }
                });

                // Return sample data for export
                const sampleData = [
                    headers,
                    headers.map((_, idx) => {
                        // Return appropriate sample values based on column type
                        if (idx === 0) return new Date().toISOString().split('T')[0]; // Date
                        if (idx === 1) return '18'; // ISO Week
                        if (idx === 2) return '4'; // Month 
                        if (idx === 3) return '2025'; // Year
                        if (idx === 4) return 'Sample Ad/Campaign (No real data yet)';
                        if (idx >= 10 && idx <= 31) return '0'; // Numeric values
                        return '';
                    })
                ];

                // Generate export with sample data
                if (format === 'csv') {
                    const csvContent = generateCSV(sampleData);
                    return new NextResponse(csvContent, {
                        headers: {
                            'Content-Type': 'text/csv',
                            'Content-Disposition': `attachment; filename="facebook-${dataType}-data.csv"`
                        }
                    });
                } else {
                    // Excel format
                    const excelBuffer = generateExcel(sampleData, dataType);
                    return new NextResponse(excelBuffer, {
                        headers: {
                            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'Content-Disposition': `attachment; filename="facebook-${dataType}-data.xlsx"`
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
                        'Content-Disposition': `attachment; filename="facebook-${dataType}-data.csv"`
                    }
                });
            } else {
                // Excel format
                const excelBuffer = generateExcel(values, dataType);
                return new NextResponse(excelBuffer, {
                    headers: {
                        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'Content-Disposition': `attachment; filename="facebook-${dataType}-data.xlsx"`
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

function generateExcel(rows: any[][], dataType: string): Buffer {
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Format date columns properly (assuming date is always in column A/0)
    if (rows.length > 1) {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
            const cell = ws[cellRef];
            if (cell && cell.v) {
                // Try to convert to date if it's a date string
                const dateValue = new Date(cell.v);
                if (!isNaN(dateValue.getTime())) {
                    cell.t = 'd'; // Set cell type to date
                    cell.v = dateValue;
                    cell.z = 'yyyy-mm-dd'; // Set date format
                }
            }
        }
    }

    // Add the worksheet to the workbook with appropriate name
    const sheetName = dataType === 'ads' ? 'Ad Performance' :
        dataType === 'campaigns' ? 'Campaign Performance' : 'Marketing Data';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate buffer
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}