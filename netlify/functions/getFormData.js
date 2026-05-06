const { google } = require("googleapis");

exports.handler = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Data!A:H",
    });

    const rows = response.data.values || [];
    const budgets = [];
    const suppliers = [];

    // Skip header row (index 0), match Apps Script logic: Col A = budgets, Col H = suppliers
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) budgets.push(rows[i][0]);   // Column A
      if (rows[i][7]) suppliers.push(rows[i][7]);  // Column H
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgets: [...new Set(budgets)].sort(),
        suppliers: [...new Set(suppliers)].sort(),
      }),
    };
  } catch (err) {
    console.error("getFormData error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message, budgets: [], suppliers: [] }),
    };
  }
};
