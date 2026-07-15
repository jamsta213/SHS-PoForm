/**
 * functions/submitPO.js
 *
 * Cloudflare Pages Function — POST /submitPO
 * Replaces the Apps Script submitPO() function.
 *
 * Row layout in "Responses" (matches the original Apps Script):
 *   A        Timestamp
 *   B        Name
 *   C        Budget
 *   D        Supplier
 *   E        Order Description
 *   F        Comments
 *   G..BN    10 items x 6 columns each (Name, Code, Link, Price, Qty, Total)
 *   BO (67)  Grand Total
 *   BP (68)  PO Number (001, 002, ...)
 */
import { getAccessToken, getCredentials, jsonResponse, CORS_HEADERS } from './_utils.js';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();
    const credentials = getCredentials(env);
    const spreadsheetId = env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('SPREADSHEET_ID environment variable is not set');

    const accessToken = await getAccessToken(credentials);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // 1. Read column BP to work out the next sequential PO number
    const bpUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Responses!BP2:BP')}`;
    const bpRes = await fetch(bpUrl, { headers: authHeader });
    const bpData = await bpRes.json();
    if (!bpRes.ok) throw new Error(bpData.error?.message || 'Failed to read PO numbers');

    const bpValues = (bpData.values || []).flat().filter(v => v !== '');
    let nextNumber = 1;
    if (bpValues.length > 0) {
      const last = parseInt(bpValues[bpValues.length - 1], 10);
      if (!isNaN(last)) nextNumber = last + 1;
    }
    const poID = nextNumber.toString().padStart(3, '0');

    // 2. Build the row
    const rowData = new Array(68).fill('');
    rowData[0] = new Date().toISOString(); // A: Timestamp
    rowData[1] = payload.name || '';       // B: Name
    rowData[2] = payload.budget || '';     // C: Budget
    rowData[3] = payload.supplier || '';   // D: Supplier
    rowData[4] = payload.description || '';// E: Order Description
    rowData[5] = payload.comments || '';   // F: Comments

    let grandTotal = 0;
    (payload.items || []).forEach((item, i) => {
      const base = 6 + i * 6;
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty, 10) || 0;
      const itemTotal = price * qty;
      grandTotal += itemTotal;

      rowData[base]     = item.name || '';
      rowData[base + 1] = item.code || '';
      rowData[base + 2] = item.link || '';
      rowData[base + 3] = price > 0 ? price.toFixed(2) : '';
      rowData[base + 4] = qty > 0 ? qty : '';
      rowData[base + 5] = itemTotal > 0 ? itemTotal.toFixed(2) : '';
    });

    rowData[66] = grandTotal.toFixed(2); // BO: Grand Total
    rowData[67] = poID;                  // BP: PO Number

    // 3. Append to the next free row in Responses
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Responses!A:BP')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [rowData] }),
    });
    const appendData = await appendRes.json();
    if (!appendRes.ok) throw new Error(appendData.error?.message || 'Failed to write to Responses sheet');

    return jsonResponse({ success: true, poID });
  } catch (err) {
    console.error('submitPO error:', err);
    return jsonResponse({ error: err.message }, 500);
  }
}
