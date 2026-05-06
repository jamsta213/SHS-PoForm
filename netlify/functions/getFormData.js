const { google } = require("googleapis");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Validate all env vars are present
    if (!email || !rawKey || !spreadsheetId) {
      const missing = [
        !email && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        !rawKey && "GOOGLE_PRIVATE_KEY",
        !spreadsheetId && "SPREADSHEET_ID",
      ].filter(Boolean);
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }

    const privateKey = rawKey.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Data!A:H",
    });

    const rows = response.data.values || [];
    const budgets = [];
    const suppliers = [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) budgets.push(rows[i][0]);  // Col A
      if (rows[i][7]) suppliers.push(rows[i][7]); // Col H
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        budgets: [...new Set(budgets)].sort(),
        suppliers: [...new Set(suppliers)].sort(),
      }),
    };
  } catch (err) {
    console.error("getFormData error:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
