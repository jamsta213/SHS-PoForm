# Purchase Order Form — GitHub + Cloudflare Pages

This is a direct port of your Google Apps Script Purchase Order form. The form
UI and behaviour are unchanged — two Cloudflare Pages Functions replace
`getFormData()` and `submitPO()`, talking to the Google Sheets REST API
directly (no `googleapis` npm package needed, so there's nothing to install
and no build-credit usage).

## File structure

```
po-form-cf/
├── index.html                ← the form page
├── style.css                 ← all styles
├── script.js                 ← all client-side JS (fetch calls instead of google.script.run)
├── README.md                 ← this file
└── functions/
    ├── _utils.js              ← shared JWT/auth helper (Web Crypto API)
    ├── getFormData.js         ← GET /getFormData  → replaces getFormData()
    └── submitPO.js            ← POST /submitPO    → replaces submitPO()
```

Cloudflare Pages auto-detects anything in `/functions` and turns each file
into a matching route (`functions/getFormData.js` → `/getFormData`), so no
extra config file is required.

---

## ✅ Setup checklist

### 1 — Google Sheet

- [ ] Confirm your spreadsheet ID (the long string in the sheet's URL between `/d/` and `/edit`).
- [ ] Confirm it has a **Data** tab (budgets in column A, suppliers in column H) and a **Responses** tab.
- [ ] The `code.gs` Apps Script file can stay in the sheet untouched — it won't interfere and you can delete it later if you like.

### 2 — Google Cloud service account

- [ ] Go to [console.cloud.google.com](https://console.cloud.google.com) and create (or select) a project.
- [ ] **APIs & Services → Library** → enable the **Google Sheets API**.
- [ ] **APIs & Services → Credentials → Create Credentials → Service Account** → give it any name → Create and continue → skip roles → Done.
- [ ] Click into the new service account → **Keys** tab → **Add Key → Create new key → JSON** → download it.
- [ ] Open the JSON file, copy the `client_email` value, and **share your Google Sheet** with that email address, giving it **Editor** access.

### 3 — GitHub repo

- [ ] Create a new GitHub repository.
- [ ] Add all the files above, keeping the folder structure exactly as shown (the `functions/` folder must sit at the repo root, not inside a subfolder).

### 4 — Cloudflare Pages

- [ ] Go to the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
- [ ] Select your GitHub repo (you may need to install the Cloudflare GitHub App first — GitHub → Settings → Applications → Cloudflare Pages → choose the repo).
- [ ] Build settings: framework preset **None**, build command **(leave blank)**, output directory **/** (or leave default — this is a static site, no build step needed).
- [ ] Before the first deploy (or right after), go to **Settings → Environment variables** and add, for the **Production** environment:

  | Variable | Value |
  |---|---|
  | `SPREADSHEET_ID` | Your spreadsheet ID |
  | `GOOGLE_SERVICE_ACCOUNT_JSON` | The **entire contents** of the downloaded JSON key file (paste it as one block) |

- [ ] Click **Save and Deploy** (or **Retry deployment** if variables were added after the first build).

### 5 — Test

- [ ] Visit `https://your-project.pages.dev/getFormData` — you should see JSON with `budgets` and `suppliers` arrays.
- [ ] Visit the site itself and confirm the Budget and Supplier dropdowns populate.
- [ ] Submit a test order and confirm a new row appears in the **Responses** tab, with a sequential PO number in column BP.

### 6 (optional) — Custom domain

- [ ] Cloudflare Pages project → **Custom domains** → add your subdomain (e.g. `po.yourdomain.co.uk`).
- [ ] If the domain is already on Cloudflare, DNS/SSL are handled automatically.

---

## Notes

- No `package.json` or npm install is required — the JWT signing uses the Web
  Crypto API, which is built into the Cloudflare Workers/Pages runtime.
- Never commit the service account JSON key into the repo — it only ever
  lives in the Cloudflare environment variable.
- Cloudflare Pages' free plan includes 500 builds/month, which is far more
  than a form like this will ever need.
- To reuse this for a different form/sheet later: new sheet shared with the
  same service account email, new GitHub repo, new Pages project, new
  `SPREADSHEET_ID` variable (the same `GOOGLE_SERVICE_ACCOUNT_JSON` can be
  reused across projects).
 
