// ============================================================
// LOHONO CMD — METRICS SYNC  v2
// ============================================================
// Setup steps (one-time):
//   1. Run setupMetricsSheet()  — creates the Metrics tab
//   2. Deploy as Web App (Execute as: Me, Who has access: Anyone)
//      Copy the Web App URL → set as SHEETS_SCRIPT_URL on Vercel
//   3. Run installDailyTrigger() — auto-pushes to Vercel every morning
// ============================================================
//
// ROW MAP (do not edit unless you restructure the sheet):
//   Targets  : B6=Leads  B7=L2P%  B8=P2B%  B9=Bookings
//              B10=Gross Rev  B11=CI Rev  B12=Prospects  B13=AOV
//   KPI data header: row 15,  data starts row 16
//   OTA-01..16  : rows 16–31   (OTA-01=D16, OTA-02=D17)
//   CI-01..17   : rows 32–48   (CI-05=D36, CI-10=D41, CI-11=D42, CI-12=D43)
//   FH-01..11   : rows 49–59   (FH-01=D49, FH-02=D50, FH-03=D51,
//                                FH-04=D52, FH-05=D53)
//   LI-01..03   : rows 60–62
//   NK-01..07   : rows 63–69   (all formula-calculated)
// ============================================================

var SHEET_NAME   = 'Metrics';
var VERCEL_URL   = 'https://lohono-command-center.vercel.app/api/cron/sheets-sync';
var CRON_SECRET  = 'lohono-cron-secret-2026';

function getToken() {
  return PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN') || CRON_SECRET;
}

// ── Web App entry point (Vercel pulls from here) ─────────────
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  if (params.token !== getToken()) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if ((params.action || 'getMetrics') === 'getMetrics') {
    return ContentService
      .createTextOutput(JSON.stringify(getMetrics()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Read all KPI rows from the sheet ────────────────────────
function getMetrics() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { metrics: [] };

  var data = sheet.getDataRange().getValues();
  var metrics = [];

  var headerRow = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === 'KPI_ID') { headerRow = i; break; }
  }
  if (headerRow === -1) return { metrics: [] };

  var headers   = data[headerRow];
  var valueCol  = headers.indexOf('Value');
  var periodCol = headers.indexOf('Period');
  var keyCol    = headers.indexOf('MetricKey');

  for (var r = headerRow + 1; r < data.length; r++) {
    var row = data[r];
    if (!row[0] || !row[keyCol]) continue;
    var value  = parseFloat(row[valueCol]);
    var period = String(row[periodCol]).trim();
    var key    = String(row[keyCol]).trim();
    if (isNaN(value) || !key || !period) continue;
    metrics.push({ metric: key, value: value, period: period });
  }

  Logger.log('getMetrics: returning ' + metrics.length + ' entries');
  return { metrics: metrics };
}

// ── Daily push: Apps Script → Vercel ────────────────────────
// Called automatically by the time-based trigger each morning.
function dailySync() {
  try {
    var response = UrlFetchApp.fetch(VERCEL_URL, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + CRON_SECRET },
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log('dailySync → HTTP ' + code + ' | ' + body);

    // Stamp the sheet so you can see when it last synced
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (sheet) {
      sheet.getRange('A2').setValue(
        'Last synced: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) +
        ' IST  |  HTTP ' + code
      );
    }
  } catch (err) {
    Logger.log('dailySync error: ' + err.message);
  }
}

// ── Install the daily trigger (run once from the editor) ─────
function installDailyTrigger() {
  // Remove any existing dailySync triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'dailySync') ScriptApp.deleteTrigger(t);
  });
  // Fire every day at 7:00–8:00 AM (Apps Script picks exact minute)
  ScriptApp.newTrigger('dailySync')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  Logger.log('Daily trigger installed — dailySync will run every morning at ~7 AM.');
  SpreadsheetApp.getUi().alert('Daily sync trigger installed! The dashboard will update every morning at ~7 AM IST automatically.');
}

// ── One-time sheet setup ─────────────────────────────────────
// Run this from Run → setupMetricsSheet in the editor.
function setupMetricsSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.clearContents();
  sheet.clearFormats();

  // Title
  sheet.getRange('A1').setValue('LOHONO CMD — FY27 METRICS')
    .setFontWeight('bold').setFontSize(14);
  sheet.getRange('A2').setValue('Last synced: never')
    .setFontStyle('italic').setFontColor('#888888');

  // ── TARGETS section (rows 4–13) ─────────────────────────
  // All from Targets.csv Grand Total row — update B values each FY.
  sheet.getRange('A4').setValue('FY27 TARGETS  ← sourced from Targets.csv, update each FY')
    .setFontWeight('bold').setFontColor('#C9A84C');
  sheet.getRange('A5:C5')
    .setValues([['Target Metric', 'Value', 'Source']])
    .setFontWeight('bold');
  sheet.getRange('A6:C13').setValues([
    ['Target Leads (FY27)',                     87471,         'Targets.csv Grand Total'],
    ['Target L2P% (decimal)',                   0.171206143,   'Targets.csv Grand Total'],
    ['Target P2B% (decimal)',                   0.450139922,   'Targets.csv Grand Total'],
    ['Target Bookings (FY27)',                  6482,          'Targets.csv Grand Total'],
    ['Target Gross Revenue (FY27, ₹)',          867896927,     'Targets.csv Grand Total'],
    ['Target Check-in Revenue (FY27, ₹)',       851910648,     'Targets.csv Grand Total'],  // B11
    ['Target Prospects (FY27)',                 14976,         'Targets.csv Grand Total'],  // B12
    ['Target Booking AOV (₹)',                  133315,        'Targets.csv Grand Total'],  // B13
  ]);
  sheet.getRange('B6:B13').setBackground('#fff9e6');  // highlight editable cells

  // ── KPI data header (row 15) ─────────────────────────────
  var HDR_ROW    = 15;
  var DATA_START = 16;

  sheet.getRange(HDR_ROW, 1, 1, 6)
    .setValues([['KPI_ID','Category','KPI_Name','Value','Period','MetricKey']])
    .setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');

  // ── KPI rows ─────────────────────────────────────────────
  // 'FORMULA' rows get an empty value; formulas are injected below.
  var rows = [
    // OTA Assessment — rows 16–31
    ['OTA-01','OTA Assessment','YTD Gross GMV (with Cancellations)', 34124698, 'FY27','ota_gross_gmv_ytd'],
    ['OTA-02','OTA Assessment','YTD Net GMV',                        18407535, 'FY27','ota_net_gmv_ytd'],
    ['OTA-03','OTA Assessment','Cancellation Rate',                  'FORMULA','FY27','ota_cancellation_rate'],
    ['OTA-04','OTA Assessment','YTD AOV (Net GMV ÷ OTA Bookings)',   47727,    'FY27','ota_aov'],
    ['OTA-05','OTA Assessment','Channel Mix — booking.com',          951136,   'FY27','ota_channel_bookingcom'],
    ['OTA-06','OTA Assessment','Channel Mix — Marriott',             5718722,  'FY27','ota_channel_marriott'],
    ['OTA-07','OTA Assessment','Channel Mix — MMT',                  25225924, 'FY27','ota_channel_mmt'],
    ['OTA-08','OTA Assessment','Channel Mix — Airbnb',               2228916,  'FY27','ota_channel_airbnb'],
    ['OTA-09','OTA Assessment','Channel Mix — EaseMyTrip',           0,        'FY27','ota_channel_emt'],
    ['OTA-10','OTA Assessment','Channel Mix — Other OTA',            0,        'FY27','ota_channel_other'],
    ['OTA-11','OTA Assessment','Region Mix — Goa',                   13053733, 'FY27','ota_region_goa'],
    ['OTA-12','OTA Assessment','Region Mix — Maharashtra',           10054658, 'FY27','ota_region_maharashtra'],
    ['OTA-13','OTA Assessment','Region Mix — North',                 7578130,  'FY27','ota_region_north'],
    ['OTA-14','OTA Assessment','Region Mix — South',                 3438177,  'FY27','ota_region_south'],
    ['OTA-15','OTA Assessment','MoM Gross GMV Growth',               -0.192,   'FY27','ota_mom_growth'],
    ['OTA-16','OTA Assessment','YoY Gross GMV Growth',               -0.0459,  'FY27','ota_yoy_growth'],

    // Check-in GMV — rows 32–48
    ['CI-01','Check-in GMV','Check-in Revenue (Occupied Month)',     42423545, '2026-03','ci_revenue_month'],
    ['CI-02','Check-in GMV','Weekday Revenue (Month)',               22613573, '2026-03','ci_revenue_weekday_month'],
    ['CI-03','Check-in GMV','Weekend Revenue (Month)',               16816376, '2026-03','ci_revenue_weekend_month'],
    ['CI-04','Check-in GMV','Peak Revenue (Month)',                  2993596,  '2026-03','ci_revenue_peak_month'],
    ['CI-05','Check-in GMV','Check-in Revenue YTD',                 576067864,'FY27',   'ci_revenue_ytd'],     // D36
    ['CI-06','Check-in GMV','Weekday Revenue YTD',                  250642751,'FY27',   'ci_revenue_weekday_ytd'],
    ['CI-07','Check-in GMV','Weekend Revenue YTD',                  207549456,'FY27',   'ci_revenue_weekend_ytd'],
    ['CI-08','Check-in GMV','Peak Revenue YTD',                     117875657,'FY27',   'ci_revenue_peak_ytd'],
    ['CI-09','Check-in GMV','ARR YTD',                              12215,    'FY27',   'ci_arr_ytd'],
    ['CI-10','Check-in GMV','Weekday ARR YTD',                      10884,    'FY27',   'ci_arr_weekday_ytd'],  // D41
    ['CI-11','Check-in GMV','Weekend ARR YTD',                      12405,    'FY27',   'ci_arr_weekend_ytd'],  // D42
    ['CI-12','Check-in GMV','Peak ARR YTD',                         15931,    'FY27',   'ci_arr_peak_ytd'],     // D43
    ['CI-13','Check-in GMV','Bedroom Night Count YTD',              12788,    'FY27',   'ci_bn_count_ytd'],
    ['CI-14','Check-in GMV','Weekday BN Count YTD',                 6263,     'FY27',   'ci_bn_weekday_ytd'],
    ['CI-15','Check-in GMV','Weekend BN Count YTD',                 4489,     'FY27',   'ci_bn_weekend_ytd'],
    ['CI-16','Check-in GMV','Peak BN Count YTD',                    2036,     'FY27',   'ci_bn_peak_ytd'],
    ['CI-17','Check-in GMV','Weekday Revenue Share %',              0.4351,   'FY27',   'ci_weekday_share_pct'],

    // Funnel Health — rows 49–59
    ['FH-01','Funnel Health','Total Leads YTD',                     80411,    'FY27','fh_total_leads'],      // D49
    ['FH-02','Funnel Health','L2P%',                                0.1559,   'FY27','fh_l2p_pct'],          // D50
    ['FH-03','Funnel Health','Total Prospects YTD',                 12535,    'FY27','fh_total_prospects'],   // D51
    ['FH-04','Funnel Health','P2B%',                                0.431,    'FY27','fh_p2b_pct'],           // D52
    ['FH-05','Funnel Health','Total Bookings YTD',                  5402,     'FY27','fh_total_bookings'],    // D53
    ['FH-06','Funnel Health','L2B% (End-to-End Conversion)',        0.0672,   'FY27','fh_l2b_pct'],
    ['FH-07','Funnel Health','Leads Attainment % vs Target',        'FORMULA','FY27','fh_leads_attainment'],  // D55
    ['FH-08','Funnel Health','L2P% Gap vs Target (pp)',             'FORMULA','FY27','fh_l2p_gap'],           // D56
    ['FH-09','Funnel Health','P2B% Gap vs Target (pp)',             'FORMULA','FY27','fh_p2b_gap'],           // D57
    ['FH-10','Funnel Health','Bookings Attainment % vs Target',     'FORMULA','FY27','fh_bookings_attainment'], // D58
    ['FH-11','Funnel Health','CI Revenue Attainment % vs Target',   'FORMULA','FY27','fh_revenue_attainment'], // D59  ← FIXED

    // Leading Indicators — rows 60–62
    ['LI-01','Leading Indicators','MoM Lead Volume Trend',          0.3265,   'FY27','li_mom_lead_volume'],
    ['LI-02','Leading Indicators','MoM L2P% Trend',                -0.0225,  'FY27','li_mom_l2p_trend'],
    ['LI-03','Leading Indicators','MoM P2B% Trend',                 0.0069,  'FY27','li_mom_p2b_trend'],

    // New KPIs — rows 63–69 (all formula-calculated)
    ['NK-01','New KPIs','Prospects Attainment % vs Target',         'FORMULA','FY27','fh_prospects_attainment'], // D63
    ['NK-02','New KPIs','Booking AOV — Actual (CI Rev ÷ Bookings)', 'FORMULA','FY27','fh_booking_aov'],          // D64
    ['NK-03','New KPIs','Booking AOV Attainment % vs Target',       'FORMULA','FY27','fh_booking_aov_attainment'], // D65
    ['NK-04','New KPIs','Revenue per Lead (CI Rev ÷ Leads)',        'FORMULA','FY27','fh_revenue_per_lead'],      // D66
    ['NK-05','New KPIs','OTA Mix % of Total CI Revenue',            'FORMULA','FY27','ota_mix_pct'],              // D67
    ['NK-06','New KPIs','Weekend ARR Premium (vs Weekday)',         'FORMULA','FY27','ci_weekend_arr_premium'],   // D68
    ['NK-07','New KPIs','Peak ARR Premium (vs Weekday)',            'FORMULA','FY27','ci_peak_arr_premium'],      // D69
  ];

  var writeRows = rows.map(function(r) {
    return [r[0], r[1], r[2], r[3] === 'FORMULA' ? '' : r[3], r[4], r[5]];
  });
  sheet.getRange(DATA_START, 1, writeRows.length, 6).setValues(writeRows);

  // ── Formulas ──────────────────────────────────────────────
  // OTA-03: Cancellation Rate = (Gross GMV - Net GMV) / Gross GMV
  sheet.getRange('D18').setFormula('=IF(D16=0,0,(D16-D17)/D16)');

  // FH-07: Leads Attainment — D49 / B6 * 100
  sheet.getRange('D55').setFormula('=IF($B$6=0,0,D49/$B$6*100)');

  // FH-08: L2P% Gap — D50 - B7 (both decimals; result in decimal pp)
  sheet.getRange('D56').setFormula('=D50-$B$7');

  // FH-09: P2B% Gap — D52 - B8
  sheet.getRange('D57').setFormula('=D52-$B$8');

  // FH-10: Bookings Attainment — D53 / B9 * 100
  sheet.getRange('D58').setFormula('=IF($B$9=0,0,D53/$B$9*100)');

  // FH-11: CI Revenue Attainment — D36 / B11 * 100  ← FIXED (was wrong OTA GMV / Gross Rev)
  sheet.getRange('D59').setFormula('=IF($B$11=0,0,D36/$B$11*100)');

  // NK-01: Prospects Attainment — D51 / B12 * 100
  sheet.getRange('D63').setFormula('=IF($B$12=0,0,D51/$B$12*100)');

  // NK-02: Booking AOV (actual) — CI Rev YTD / Total Bookings
  sheet.getRange('D64').setFormula('=IF(D53=0,0,D36/D53)');

  // NK-03: Booking AOV Attainment — D64 / B13 * 100
  sheet.getRange('D65').setFormula('=IF($B$13=0,0,D64/$B$13*100)');

  // NK-04: Revenue per Lead — CI Rev YTD / Total Leads
  sheet.getRange('D66').setFormula('=IF(D49=0,0,D36/D49)');

  // NK-05: OTA Mix % — OTA Gross GMV / CI Rev YTD * 100
  sheet.getRange('D67').setFormula('=IF(D36=0,0,D16/D36*100)');

  // NK-06: Weekend ARR Premium — Weekend ARR / Weekday ARR
  sheet.getRange('D68').setFormula('=IF(D41=0,0,D42/D41)');

  // NK-07: Peak ARR Premium — Peak ARR / Weekday ARR
  sheet.getRange('D69').setFormula('=IF(D41=0,0,D43/D41)');

  // ── Visual polish ─────────────────────────────────────────
  var GREY_BG   = '#f0f0f0';
  var GREY_FG   = '#666666';
  sheet.getRange('D18').setBackground(GREY_BG).setFontColor(GREY_FG);
  sheet.getRange('D55:D59').setBackground(GREY_BG).setFontColor(GREY_FG);
  sheet.getRange('D63:D69').setBackground(GREY_BG).setFontColor(GREY_FG);

  // Column widths
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 340);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 230);

  Logger.log('Setup complete: ' + rows.length + ' KPI rows.');
  SpreadsheetApp.getUi().alert(
    'Metrics sheet ready!\n\n' +
    'Next steps:\n' +
    '1. Deploy this script as a Web App (Deploy → New deployment)\n' +
    '2. Copy the Web App URL → Vercel env var SHEETS_SCRIPT_URL\n' +
    '3. Run installDailyTrigger() to auto-sync every morning at 7 AM IST\n\n' +
    'Each month, update Column D actuals. Greyed cells auto-calculate.'
  );
}
