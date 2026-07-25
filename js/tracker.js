(function () {
  const SHEET_ID = "1YGH-HYiP9ZXvrVkhD7yDs8gbfJs8osGZmYH5Tr6PfzY";
  const chartEl = document.getElementById("chart");
  const statusEl = document.getElementById("tracker-status");
  const refreshBtn = document.getElementById("refresh-btn");
 
  function setStatus(mode, text) {
    statusEl.className = `tracker-status ${mode === "live" ? "is-live" : mode === "error" ? "is-error" : ""}`;
    statusEl.innerHTML = `<span class="dot"></span>${text}`;
  }
 
  function renderPlaceholder() {
    return [
      { name: "Descenders", total: 42 },
      { name: "Planeswalkers", total: 58 },
      { name: "Conquerers", total: 35 },
      { name: "Heartweavers", total: 61 },
      { name: "Pathmakers", total: 27 },
      { name: "Truthseekers", total: 49 },
      { name: "Trailblazers", total: 33 },
      { name: "Lightbearers", total: 55 },
    ];
  }
 
  function renderChart(data) {
    const max = Math.max(...data.map((d) => d.total), 1);
    chartEl.innerHTML = "";
 
    data
      .slice()
      .sort((a, b) => b.total - a.total)
      .forEach((house, i) => {
        const col = document.createElement("div");
        col.className = "bar-col" + (i === 0 ? " is-leader" : "");
        col.innerHTML = `
          <span class="bar-col__value">${house.total}</span>
          <span class="bar-col__rank">${ordinal(i + 1)}</span>
          <div class="bar-col__bar" data-target="${(house.total / max) * 100}"></div>
          <span class="bar-col__name">${house.name}</span>
        `;
        chartEl.appendChild(col);
      });
 
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chartEl.querySelectorAll(".bar-col__bar").forEach((bar) => {
          const pct = parseFloat(bar.dataset.target);
          bar.style.height = `${Math.max(pct, 3)}%`;
        });
      });
    });
  }
 
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
 
  function fetchSheetJSONP() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const callbackName = "sheetCallback_" + Date.now();
 
      window[callbackName] = function (data) {
        delete window[callbackName];
        script.remove();
        resolve(data);
      };
 
      script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&range=A4:O12&headers=1`;
 
      script.onerror = function () {
        delete window[callbackName];
        script.remove();
        reject(new Error());
      };
 
      document.head.appendChild(script);
    });
  }
 
  function computeHouseTotals(data) {
    const cols = data.table.cols;
    const rows = data.table.rows;
    const houses = [
      "Descenders", "Planeswalkers", "Conquerers", "Heartweavers",
      "Pathmakers", "Truthseekers", "Trailblazers", "Lightbearers"
    ];
 
    const results = houses.map(name => ({ name, total: 0 }));
    let totalColIndex = cols.findIndex(c => c && c.label && String(c.label).toUpperCase().trim() === "TOTAL");
 
    if (totalColIndex === -1) {
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i] || !rows[i].c) continue;
        const idx = rows[i].c.findIndex(cell => cell && cell.v && String(cell.v).toUpperCase().trim() === "TOTAL");
        if (idx !== -1) {
          totalColIndex = idx;
          break;
        }
      }
    }
 
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || !rows[i].c || !rows[i].c[0] || !rows[i].c[0].v) continue;
 
      const rowName = String(rows[i].c[0].v).trim();
      const houseMatch = results.find(r => r.name.toLowerCase() === rowName.toLowerCase());
 
      if (houseMatch) {
        let totalVal = 0;
 
        // Try getting value from the TOTAL column first
        if (totalColIndex !== -1 && rows[i].c[totalColIndex]) {
          const cell = rows[i].c[totalColIndex];
          const raw = cell.f !== undefined && cell.f !== "" ? cell.f : cell.v;
          const parsed = Number(raw);
          if (!isNaN(parsed)) {
            totalVal = parsed;
          }
        }
        if (totalVal === 0) {
          for (let j = 1; j < rows[i].c.length; j++) {
            if (j === totalColIndex) continue;
            const cell = rows[i].c[j];
            if (cell) {
              const val = cell.f !== undefined && cell.f !== "" ? cell.f : cell.v;
              const num = Number(val);
              if (!isNaN(num)) {
                totalVal += num;
              } else if (val !== null && val !== undefined && String(val).trim() !== "") {
                totalVal += 1;
              }
            }
          }
        }
 
        houseMatch.total = totalVal;
      }
    }
    return results;
  }
 
  async function load() {

    chartEl.setAttribute("aria-busy", "true");
 
    try {
      const data = await fetchSheetJSONP();
      const totals = computeHouseTotals(data);
      renderChart(totals);
    } catch (err) {
      renderChart(renderPlaceholder());
      setStatus("error", "The veil is unclear \u2014 showing last known scores");
    }
  }
 
  if (refreshBtn) refreshBtn.addEventListener("click", load);
  load();
})();
