# cigarOS bundle

This bundle adds:
- `index.html` (Home with 4 icons: POS, Reports, Loyalty, Learn)
- `reports.html` (Bill History for a given day; totals + CSV export)
- `loyalty.html` and `learn.html` (stubs)
- `netlify/functions/list-bills.js` (reads Netlify Blobs: bills:pending:DAY, bills:confirmed:DAY, transactions:DAY)
- `netlify/functions/verify-token.js` (ADMIN_TOKEN checker)
- `img/placeholder.svg`

## How to use

1) Unzip into your repo **root** (it will not touch your `/img` logos or data if they already exist).
2) Ensure your working POS page is available at `/pos.html`.
   - If your POS is still at `/index.html`, copy its contents into a new file named `pos.html`.
3) In Netlify, set **ADMIN_TOKEN** under Site settings → Environment variables.
4) Deploy.
5) Visit:
   - `/` — Home
   - `/pos.html` — POS
   - `/reports.html` — Reports (set token once: `localStorage.setItem('ADMIN_TOKEN','YOUR_SECRET')`).

This bundle doesn’t overwrite your cigar data (stored in Netlify Blobs) or delete images.
