
const SHEET_CONFIG = {
  SHEET_ID: "PASTE_YOUR_GOOGLE_SHEET_ID_HERE",
  SHEET_TAB: "Sheet1",
};

async function fetchSheetTable(sheetId = SHEET_CONFIG.SHEET_ID, tab = SHEET_CONFIG.SHEET_TAB) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status})`);
  const raw = await res.text();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Unexpected response from Google Sheets");
  const json = JSON.parse(raw.slice(start, end + 1));

  const cols = json.table.cols.map((c, i) => c.label || c.id || `Col ${i}`);
  const rows = json.table.rows.map((r) => r.c.map((cell) => (cell ? cell.v : null)));

  return { cols, rows };
}

function computeHouseTotals({ cols, rows }) {
  const totalIdx = cols.findIndex((c) => String(c).trim().toUpperCase() === "TOTAL");

  const results = rows
    .filter((r) => r[0] !== null && r[0] !== "")
    .map((r) => {
      const name = String(r[0]);
      let total;
      if (totalIdx !== -1 && typeof r[totalIdx] === "number") {
        total = r[totalIdx];
      } else {
        total = r
          .slice(1, totalIdx !== -1 ? totalIdx : undefined)
          .reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
      }
      return { name, total };
    });

  results.sort((a, b) => b.total - a.total);
  return results;
}
