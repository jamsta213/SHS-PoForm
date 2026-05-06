const { google } = require("googleapis");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const payload = JSON.parse(event.body);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // ── 1. Read Column A to find the next free row ──────────────────────────
    const colARes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Responses!A:A",
    });
    const colA = colARes.data.values || [];
    // First genuinely empty row (1-based)
    let nextRow = colA.length + 1;

    // ── 2. Read last PO number from Column BP (68) to generate next ID ──────
    let nextNumber = 1;
    if (nextRow > 2) {
      const bpRange = `Responses!BP${nextRow - 1}`;
      const bpRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: bpRange,
      });
      const lastVal = (bpRes.data.values || [[""]])[0][0];
      if (lastVal !== "" && !isNaN(parseInt(lastVal, 10))) {
        nextNumber = parseInt(lastVal, 10) + 1;
      }
    }
    const poID = nextNumber.toString().padStart(3, "0");

    // ── 3. Build the row (matches Apps Script column mapping exactly) ────────
    // Columns A–F: metadata (6 cols)
    // Columns G onwards: 10 items × 6 cols each = 60 cols → ends at col BN (66)
    // Column BO (67): Grand Total
    // Column BP (68): PO Number

    let grandTotal = 0;
    const rowData = new Array(68).fill("");

    rowData[0] = new Date().toISOString();  // A: Timestamp
    rowData[1] = payload.name;              // B: Name
    rowData[2] = payload.budget;            // C: Budget
    rowData[3] = payload.supplier;          // D: Supplier
    rowData[4] = payload.description;       // E: Order Description
    rowData[5] = payload.comments || "";    // F: Comments

    (payload.items || []).forEach((item, idx) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty, 10) || 0;
      const itemTotal = price * qty;
      grandTotal += itemTotal;

      const base = 6 + idx * 6; // G=6, M=12, S=18 … (0-indexed)
      rowData[base]     = item.name  || "";
      rowData[base + 1] = item.code  || "";
      rowData[base + 2] = item.link  || "";
      rowData[base + 3] = price > 0  ? price.toFixed(2)      : "";
      rowData[base + 4] = qty   > 0  ? qty                    : "";
      rowData[base + 5] = itemTotal > 0 ? itemTotal.toFixed(2) : "";
    });

    rowData[66] = grandTotal.toFixed(2); // BO: Grand Total
    rowData[67] = poID;                  // BP: PO Number

    // ── 4. Write row to sheet ────────────────────────────────────────────────
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Responses!A${nextRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, poID }),
    };
  } catch (err) {
    console.error("submitPO error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
