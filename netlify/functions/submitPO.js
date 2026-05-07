/**
 * netlify/functions/submitPO.js
 *
 * Appends a new purchase order to the "Responses" sheet.
 * Mirrors the original submitPO() Apps Script function.
 *
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full JSON key for your service account
 *   SPREADSHEET_ID               — the ID portion of your spreadsheet URL
 */

const { google } = require('googleapis');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    /* ── 1. Find next free row via Column A ── */
    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Responses!A:A',
    });

    const colAValues = colA.data.values || [];
    const nextRow = colAValues.length + 1;

    /* ── 2. Generate next PO number from Column BP (68) ── */
    let nextNumber = 1;
    if (nextRow > 2) {
      const bpRes = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `Responses!BP${nextRow - 1}`,
      });
      const lastVal = ((bpRes.data.values || [['']])[0] || [''])[0];
      if (lastVal !== '' && !isNaN(parseInt(lastVal, 10))) {
        nextNumber = parseInt(lastVal, 10) + 1;
      }
    }
    const poID = nextNumber.toString().padStart(3, '0');

    /* ── 3. Build row (matches original Apps Script column layout) ──
       A–F:  metadata (6 cols)
       G–BN: 10 items × 6 cols each (60 cols)
       BO:   Grand Total  (index 66)
       BP:   PO Number    (index 67)
    */
    let grandTotal = 0;
    const rowData = new Array(68).fill('');

    rowData[0] = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });
    rowData[1] = payload.name        || '';
    rowData[2] = payload.budget      || '';
    rowData[3] = payload.supplier    || '';
    rowData[4] = payload.description || '';
    rowData[5] = payload.comments    || '';

    (payload.items || []).forEach((item, idx) => {
      const price = parseFloat(item.price) || 0;
      const qty   = parseInt(item.qty, 10) || 0;
      const itemTotal = price * qty;
      grandTotal += itemTotal;

      const base = 6 + idx * 6;
      rowData[base]     = item.name  || '';
      rowData[base + 1] = item.code  || '';
      rowData[base + 2] = item.link  || '';
      rowData[base + 3] = price     > 0 ? price.toFixed(2)     : '';
      rowData[base + 4] = qty       > 0 ? qty                  : '';
      rowData[base + 5] = itemTotal > 0 ? itemTotal.toFixed(2) : '';
    });

    rowData[66] = grandTotal.toFixed(2);
    rowData[67] = poID;

    /* ── 4. Write to sheet ── */
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `Responses!A${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, poID }),
    };

  } catch (err) {
    console.error('submitPO error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
