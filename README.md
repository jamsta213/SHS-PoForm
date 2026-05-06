# Purchase Order Form – Netlify

This is a direct port of your Google Apps Script PO form to Netlify.  
The form UI is identical. Two serverless functions replace `getFormData` and `submitPO`.

---

## File Structure

```
po-netlify/
├── index.html                        ← The form (static, served by Netlify)
├── netlify.toml                      ← Netlify build & function config
├── package.json                      ← googleapis dependency
└── netlify/
    └── functions/
        ├── getFormData.js            ← Reads Data sheet → budgets & suppliers
        └── submitPO.js               ← Writes to Responses sheet
```

---

## 1 · Google Cloud – Create a Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. Click **Create Credentials → Service Account**. Give it any name.
3. Click the new service account → **Keys** tab → **Add Key → JSON**. Download the file.
4. Enable the **Google Sheets API** for your project (APIs & Services → Library → search "Sheets").

---

## 2 · Share Your Spreadsheet with the Service Account

Open your Google Sheet → **Share** → paste the service account email (looks like `name@project.iam.gserviceaccount.com`) → give it **Editor** access.

---

## 3 · Netlify Environment Variables

In your Netlify site → **Site configuration → Environment variables**, add:

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The service account email from the JSON key file |
| `GOOGLE_PRIVATE_KEY` | The `private_key` value from the JSON file (paste the whole thing including `-----BEGIN...END-----` and the literal `\n` characters) |
| `SPREADSHEET_ID` | The ID from your sheet URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` |

> **Tip:** In the `private_key` field, keep the `\n` as literal backslash-n characters – the function handles converting them to real newlines.

---

## 4 · Deploy to Netlify

### Option A – Netlify CLI
```bash
npm install -g netlify-cli
cd po-netlify
netlify deploy --prod
```

### Option B – GitHub
1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import from Git** → select repo.
3. Build command: *(leave blank)*  
   Publish directory: `.`

---

## Sheet Requirements (unchanged from Apps Script)

- Sheet named **`Data`**: Column A = budgets, Column H = suppliers (row 1 = headers).
- Sheet named **`Responses`**: receives submissions in the same column layout as the original Apps Script version.
