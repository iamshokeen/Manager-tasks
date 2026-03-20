// scripts/sheets-middleware.gs
// Deploy as: Web App → Execute as: Me → Access: Anyone with link
// Configure named range "revenue_data" in your Google Sheet
// Sheet columns: metric (A), value (B), period (C), updated_at (D)
//
// Setup:
// 1. Go to script.google.com → New project
// 2. Paste the contents of this file
// 3. Replace SECRET_TOKEN with the value from your .env.local SHEETS_SCRIPT_TOKEN
// 4. Click Deploy → New deployment → Web app
// 5. Execute as: Me, Who has access: Anyone
// 6. Copy the deployment URL → paste into .env.local as SHEETS_SCRIPT_URL
// 7. In your Google Sheet: select the data range, Define named range as "revenue_data"

const SECRET_TOKEN = 'REPLACE_WITH_YOUR_SHEETS_SCRIPT_TOKEN';

function doGet(e) {
  if (e.parameter.token !== SECRET_TOKEN) {
    return json({ error: 'Unauthorized' });
  }

  const action = e.parameter.action;
  if (action === 'getMetrics') return getMetrics();
  return json({ error: 'Unknown action' });
}

function getMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName('revenue_data');
  if (!range) return json({ error: 'Named range "revenue_data" not found' });

  const values = range.getValues();
  const metrics = values
    .filter(function(row) { return row[0] && row[1] !== ''; })
    .map(function(row) {
      return {
        metric: String(row[0]).trim(),
        value: Number(row[1]),
        period: String(row[2]).trim(),
        updatedAt: row[3] ? new Date(row[3]).toISOString() : null,
      };
    });

  return json({ metrics: metrics });
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
