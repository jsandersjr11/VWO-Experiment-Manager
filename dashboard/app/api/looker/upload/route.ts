import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import Papa from 'papaparse';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const experimentId = formData.get('experimentId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Create data directory
        const dbPath = path.join(process.cwd(), 'data', 'looker-data.json');
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Load existing data
        let lookerData: Record<string, any> = {};
        if (fs.existsSync(dbPath)) {
            try {
                const raw = fs.readFileSync(dbPath, 'utf-8');
                lookerData = JSON.parse(raw);
            } catch (e) {
                console.error('Failed to parse existing DB', e);
            }
        }

        // Initialize experiment entry if missing
        if (!lookerData[experimentId]) {
            lookerData[experimentId] = { variations: {} };
        }

        // Helper to clean numbers
        const cleanNumber = (val: any) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            return parseFloat(val.toString().replace(/[^0-9.-]+/g, ""));
        };

        // Helper to process standard CSV data
        const processCSV = (csvContent: string, isSessions: boolean) => {
            const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
            parsed.data.forEach((row: any) => {
                // Find variation identifier
                // Looker export might have "Variation ID", "Variation Name", "Variation", etc.
                const varId = row['Variation ID'] || row['Variation Name'] || row['Variation'];
                if (!varId) return;

                if (!lookerData[experimentId].variations[varId]) {
                    lookerData[experimentId].variations[varId] = {};
                }

                const entry = lookerData[experimentId].variations[varId];

                if (isSessions) {
                    // Sessions/Visitors file
                    // Look for "Sessions", "Visitors", "Users"
                    const visitors = cleanNumber(row['Sessions'] || row['Visitors'] || row['Users']);
                    if (visitors) entry.visitors = visitors;
                } else {
                    // Orders/Revenue file
                    // Look for "Orders", "Conversions", "Revenue", "Total Revenue"
                    // "orders_per_session" file usually has totals too? Or checking the headers.
                    const conversions = cleanNumber(row['Orders'] || row['Conversions'] || row['Leads']);
                    const revenue = cleanNumber(row['Revenue'] || row['Total Revenue'] || row['Sale Amount']);

                    if (conversions) entry.conversions = conversions;
                    if (revenue) entry.revenue = revenue;
                }
            });
        };

        // Handle ZIP vs CSV
        if (file.name.endsWith('.zip')) {
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();

            for (const entry of zipEntries) {
                if (entry.entryName.endsWith('.csv')) {
                    const content = entry.getData().toString('utf8');
                    const lowerName = entry.entryName.toLowerCase();

                    // Check filenames based on user provided list
                    // sessions_by_variation.csv
                    if (lowerName.includes('sessions_by_variation') || lowerName.includes('sessions.csv')) {
                        processCSV(content, true);
                    }
                    // orders_per_session_by_variation.csv, revenue_per_session_by_variation.csv
                    else if (lowerName.includes('orders_per_session') || lowerName.includes('revenue_per_session') || lowerName.includes('leads_per_session')) {
                        processCSV(content, false);
                    }
                }
            }
        } else {
            // Single CSV upload (fallback) if they unzip it themselves
            const content = buffer.toString('utf-8');
            // Heuristic: does it have "Sessions" or "Orders"?
            // Better to just try parsing both fields from one file
            const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
            parsed.data.forEach((row: any) => {
                const varId = row['Variation ID'] || row['Variation Name'] || row['Variation'];
                if (!varId) return;

                if (!lookerData[experimentId].variations[varId]) {
                    lookerData[experimentId].variations[varId] = {};
                }
                const entry = lookerData[experimentId].variations[varId];

                const visitors = cleanNumber(row['Sessions'] || row['Visitors'] || row['Users']);
                const conversions = cleanNumber(row['Orders'] || row['Conversions'] || row['Leads']);
                const revenue = cleanNumber(row['Revenue'] || row['Total Revenue']);

                if (visitors) entry.visitors = visitors;
                if (conversions) entry.conversions = conversions;
                if (revenue) entry.revenue = revenue;
            });
        }

        // Save Updated DB
        lookerData[experimentId].updatedAt = new Date().toISOString();
        lookerData[experimentId].fileName = file.name;
        fs.writeFileSync(dbPath, JSON.stringify(lookerData, null, 2));

        return NextResponse.json({ success: true, message: 'Looker data processed successfully' });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
