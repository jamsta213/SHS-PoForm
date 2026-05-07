/**
 * netlify/functions/getFormData.js
 *
 * Reads budgets (Col A) and suppliers (Col H) from the "Data" sheet.
 *
 * Required environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — the full JSON key for your service account
 *   SPREADSHEET_ID               — the ID portion of your spreadsheet URL
 */

const { google } = require('googleapis');

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Data!A:H',
    });

    const rows = response.data.values || [];
    const budgets = [];
    const suppliers = [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) budgets.push(rows[i][0]);   // Col A
      if (rows[i][7]) suppliers.push(rows[i][7]);  // Col H
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budgets: [...new Set(budgets)].sort(),
        suppliers: [...new Set(suppliers)].sort(),
      }),
    };

  } catch (err) {
    console.error('getFormData error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
