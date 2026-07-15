/**
 * functions/getFormData.js
 *
 * Cloudflare Pages Function — GET /getFormData
 * Replaces the Apps Script getFormData() function.
 * Reads the "Data" sheet: column A = budgets, column H = suppliers.
 */
import { getAccessToken, getCredentials, jsonResponse, CORS_HEADERS } from './_utils.js';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ env }) {
  try {
    const credentials = getCredentials(env);
    const spreadsheetId = env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('SPREADSHEET_ID environment variable is not set');

    const accessToken = await getAccessToken(credentials);

    const range = 'Data!A2:H';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to read Data sheet');

    const rows = data.values || [];
    const budgets = [];
    const suppliers = [];

    rows.forEach(row => {
      if (row[0]) budgets.push(row[0]);   // Column A
      if (row[7]) suppliers.push(row[7]); // Column H
    });

    return jsonResponse({
      budgets: [...new Set(budgets)].sort(),
      suppliers: [...new Set(suppliers)].sort(),
    });
  } catch (err) {
    console.error('getFormData error:', err);
    return jsonResponse({ error: err.message, budgets: [], suppliers: [] }, 500);
  }
}
