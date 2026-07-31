import { supabase } from "./supabase_init.js";

const TEAMS = [
  "planeswalkers",
  "trailblazers",
  "conquerers",
  "heartweavers",
  "pathmakers",
  "truthseekers",
  "descenders",
  "lightbearers",
];

const TOTAL_STATIONS = 11;
const appEl = document.getElementById("race-app");

let userRole = null; // 'station' | 'team' | 'mod'
let userIdentity = null; // e.g., 1 (station int), 'planeswalkers', or 'mod'

// Helper to format string capitalize
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

// --- Core Initialization --- //
async function initRace() {
  if (!appEl) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // Auth guard handles redirect

  const email = user.email.toLowerCase();
  const prefix = email.split("@")[0];

  // Role detection
  if (prefix === "mod") {
    userRole = "mod";
    userIdentity = "mod";
  } else if (!isNaN(parseInt(prefix, 10))) {
    userRole = "station";
    userIdentity = parseInt(prefix, 10);
  } else if (TEAMS.includes(prefix)) {
    userRole = "team";
    userIdentity = prefix;
  } else {
    appEl.innerHTML = `
      <div class="mod-panel" style="text-align:center;">
        <h2>Unrecognized Credentials</h2>
        <p>Your account email (${email}) is not assigned to a team, station, or moderator role.</p>
      </div>`;
    return;
  }

  await render();
  subscribeToRealtime();
}

// Main Render router
async function render() {
  const { data: raceData, error } = await supabase
    .from("amazing-race")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching race data:", error);
    appEl.innerHTML = `<div class="mod-panel"><p style="color:var(--blood);">Failed to load game state.</p></div>`;
    return;
  }

  if (userRole === "station") {
    renderStationView(raceData);
  } else if (userRole === "team") {
    renderTeamView(raceData);
  } else if (userRole === "mod") {
    renderModView(raceData);
  }
}

// =========================================================================
// 1. STATION ACCOUNT VIEW
// =========================================================================
function renderStationView(raceData) {
  // Check if there is an ongoing attempt at this specific station
  const activeSession = raceData.find(
    (row) => row.station_tried === userIdentity && row.status === "ongoing",
  );

  if (activeSession) {
    // Stage 2: Team is playing right now
    appEl.innerHTML = `
      <div class="mod-panel" style="max-width: 480px; margin: 0 auto;">
        <div class="mod-title">
          <h2>Station ${userIdentity}</h2>
          <p>Challenge in Progress</p>
        </div>
        
        <div class="tracker-status is-live" style="margin: 1.5rem 0;">
          <div class="dot"></div>
          <span style="font-size:1.1rem; color:var(--gold-bright); text-transform:capitalize;">
            ${activeSession.team_name}
          </span>
        </div>

        <p style="text-align:center; color:var(--parchment-dim); font-size:0.9rem;">
          Select the outcome once the team completes or fails the station challenge.
        </p>

        <div class="race-btn-group">
          <button type="button" class="race-btn race-btn--win" id="btn-win">
            ✦ Victory (Win)
          </button>
          <button type="button" class="race-btn race-btn--loss" id="btn-loss">
            ✕ Defeat (Lost)
          </button>
        </div>
      </div>
    `;

    const btnWin = document.getElementById("btn-win");
    const btnLoss = document.getElementById("btn-loss");

    btnWin.onclick = async function () {
      // Disable both buttons
      btnWin.disabled = true;
      btnLoss.disabled = true;

      // Update visual states
      btnWin.innerHTML = "Processing...";
      btnWin.style.cursor = "wait";
      btnLoss.style.opacity = "0.3";

      await updateStationStatus(activeSession.id, "won");
    };

    btnLoss.onclick = async function () {
      // Disable both buttons
      btnWin.disabled = true;
      btnLoss.disabled = true;

      // Update visual states
      btnLoss.innerHTML = "Processing...";
      btnLoss.style.cursor = "wait";
      btnWin.style.opacity = "0.3";

      await updateStationStatus(activeSession.id, "lost");
    };
  } else {
    // Stage 1: Dropdown selection
    const optionsHtml = TEAMS.map(
      (t) => `<option value="${t}">${capitalize(t)}</option>`,
    ).join("");

    appEl.innerHTML = `
      <div class="mod-panel" style="max-width: 480px; margin: 0 auto;">
        <div class="mod-title">
          <h2>Station ${userIdentity}</h2>
          <p>Select an arriving house to start their challenge</p>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="display:block; margin-bottom:0.5rem; color:var(--gold-dim); font-size:0.85rem;">
            SELECT TEAM
          </label>
          <select id="team-select" class="race-select">
            <option value="" disabled selected>-- Choose House --</option>
            ${optionsHtml}
          </select>
        </div>

        <button type="button" class="rune-button" id="btn-start" style="width:100%; justify-content:center;">
          ✦ Start Challenge
        </button>
      </div>
    `;

    document.getElementById("btn-start").onclick = async function () {
      const selectedTeam = document.getElementById("team-select").value;
      if (!selectedTeam) {
        alert("Please select a team first.");
        return;
      }

      // 1. Check if the team has already won this station
      const alreadyWon = raceData.some(
        (r) =>
          r.team_name === selectedTeam &&
          r.station_tried === userIdentity &&
          r.status === "won",
      );

      if (alreadyWon) {
        alert(
          `The ${capitalize(selectedTeam)} have already conquered Station ${userIdentity}!`,
        );
        return;
      }

      // 2. Check if the team is already attempting this station
      const alreadyOngoing = raceData.some(
        (r) =>
          r.team_name === selectedTeam &&
          r.station_tried === userIdentity &&
          r.status === "ongoing",
      );

      if (alreadyOngoing) {
        alert(
          `The ${capitalize(selectedTeam)} are already attempting this station.`,
        );
        return;
      }

      // 3. Disable button to prevent double-clicks
      const btn = this;
      btn.disabled = true;
      btn.innerHTML = "Consulting the Arcana...";
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";

      await startStationSession(selectedTeam);
    };
  }
}

async function startStationSession(teamName) {
  const { error } = await supabase.from("amazing-race").insert({
    team_name: teamName,
    station_tried: userIdentity,
    status: "ongoing",
  });

  if (error) {
    console.error("Error starting station challenge:", error);
    alert("Could not start challenge: " + error.message);
  } else {
    await render();
  }
}

async function updateStationStatus(rowId, statusResult) {
  const { error } = await supabase
    .from("amazing-race")
    .update({ status: statusResult })
    .eq("id", rowId);

  if (error) {
    console.error("Error resolving station challenge:", error);
    alert("Could not update status: " + error.message);
  } else {
    await render();
  }
}

// =========================================================================
// 2. TEAM ACCOUNT VIEW
// =========================================================================
function renderTeamView(raceData) {
  const boxes = [];

  for (let stationNum = 1; stationNum <= TOTAL_STATIONS; stationNum++) {
    // 1. Check if logged-in team won this station
    const myVictory = raceData.some(
      (r) =>
        r.station_tried === stationNum &&
        r.team_name === userIdentity &&
        r.status === "won",
    );

    // 2. Check if ANY team is currently occupying this station
    const occupiedSession = raceData.find(
      (r) => r.station_tried === stationNum && r.status === "ongoing",
    );

    let statusClass = "is-free";
    let statusLabel = "Free";
    let extraText = "";

    if (myVictory) {
      statusClass = "is-won";
      statusLabel = "Won";
    } else if (occupiedSession) {
      statusClass = "is-occupied";
      statusLabel = "Occupied";
      extraText = `<div class="occupant-tag">By ${occupiedSession.team_name}</div>`;
    }

    boxes.push(`
      <div class="station-box ${statusClass}">
        <h3>${stationNum < 10 ? "0" + stationNum : stationNum}</h3>
        <p>${statusLabel}</p>
        ${extraText}
      </div>
    `);
  }

  appEl.innerHTML = `
    <div class="mod-title" style="margin-bottom: 1.5rem;">
      <h2 style="text-transform: capitalize;">${userIdentity} Dashboard</h2>
      <p>11 Stations Overview</p>
    </div>

    <div style="display:flex; justify-content:center; gap:1.25rem; margin-bottom:1.5rem; font-size:0.8rem; flex-wrap:wrap;">
      <span style="display:inline-flex; align-items:center; gap:0.4rem; color:#81c784;">
        <span style="width:10px; height:10px; border-radius:50%; background:#4caf50;"></span> Green = Won
      </span>
      <span style="display:inline-flex; align-items:center; gap:0.4rem; color:#ef5350;">
        <span style="width:10px; height:10px; border-radius:50%; background:#e53935;"></span> Red = Occupied
      </span>
      <span style="display:inline-flex; align-items:center; gap:0.4rem; color:#ffca28;">
        <span style="width:10px; height:10px; border-radius:50%; background:#ff9800;"></span> Orange = Free
      </span>
    </div>

    <div class="race-grid">
      ${boxes.join("")}
    </div>
  `;
}

// =========================================================================
// 3. MOD ACCOUNT VIEW
// =========================================================================
function renderModView(raceData) {
  // A. Build Station Occupancy List (1 through 11)
  const stationRows = [];
  for (let s = 1; s <= TOTAL_STATIONS; s++) {
    const active = raceData.find(
      (r) => r.station_tried === s && r.status === "ongoing",
    );
    stationRows.push(`
      <tr>
        <td style="color:var(--gold-bright); font-family:var(--font-display);">
          Station ${s < 10 ? "0" + s : s}
        </td>
        <td style="text-align:right;">
          ${
            active
              ? `<span style="color:#ef5350; text-transform:capitalize;">Occupied by ${active.team_name}</span>`
              : `<span style="color:#ffca28;">Free</span>`
          }
        </td>
      </tr>
    `);
  }

  // B. Build Team Standings
  const standings = TEAMS.map((team) => {
    const wins = raceData.filter(
      (r) => r.team_name === team && r.status === "won",
    ).length;
    const ongoingSession = raceData.find(
      (r) => r.team_name === team && r.status === "ongoing",
    );
    return {
      team,
      wins,
      currentStation: ongoingSession ? ongoingSession.station_tried : null,
    };
  }).sort((a, b) => b.wins - a.wins);

  const teamRows = standings
    .map(
      (item, idx) => `
    <tr class="${idx === 0 ? "is-leader" : ""}">
      <td class="rank">${idx + 1}</td>
      <td style="text-transform:capitalize;">${item.team}</td>
      <td style="font-size:0.85rem; color:var(--parchment-dim);">
        ${
          item.currentStation
            ? `<span style="color:#ef5350;">Station ${item.currentStation}</span>`
            : "In Transit"
        }
      </td>
      <td class="score">${item.wins}</td>
    </tr>
  `,
    )
    .join("");

  // C. Build History Log
  const historyRows = raceData
    .map((row) => {
      // Format timestamp (e.g., 10:42 AM)
      const timeString = new Date(row.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let actionText = "";
      let actionColor = "";

      if (row.status === "ongoing") {
        actionText = "entered";
        actionColor = "var(--gold-bright)";
      } else if (row.status === "won") {
        actionText = "won in";
        actionColor = "#4caf50";
      } else if (row.status === "lost") {
        actionText = "lost in";
        actionColor = "#e53935";
      }

      const paddedStation =
        row.station_tried < 10 ? "0" + row.station_tried : row.station_tried;

      return `
      <tr>
        <td style="color:var(--parchment-dim); font-size:0.75rem; white-space:nowrap;">${timeString}</td>
        <td style="text-transform:capitalize; color:var(--parchment);">${row.team_name}</td>
        <td style="color:${actionColor};">${actionText} Station ${paddedStation}</td>
      </tr>
    `;
    })
    .join("");

  appEl.innerHTML = `
    <div class="mod-dashboard">
      <!-- Left Panel: Stations Status -->
      <div class="mod-panel">
        <div class="mod-title">
          <h2>Stations Overview</h2>
          <p>Real-time occupancy tracking</p>
        </div>
        <table class="round-table leaderboard-table">
          <tbody>
            ${stationRows.join("")}
          </tbody>
        </table>
      </div>

      <!-- Right Panel: Leaderboard -->
      <div class="mod-panel">
        <div class="mod-title">
          <h2>Team Standings</h2>
          <p>Completed station victories</p>
        </div>
        <table class="round-table leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>House</th>
              <th>Location</th>
              <th style="text-align:right;">Wins</th>
            </tr>
          </thead>
          <tbody>
            ${teamRows}
          </tbody>
        </table>
      </div>

      <!-- Bottom Panel: History Log -->
      <div class="mod-panel" style="grid-column: 1 / -1;">
        <div class="mod-title">
          <h2>History Log</h2>
          <p>Chronological station activities</p>
        </div>
        <div style="max-height: 350px; overflow-y: auto; padding-right: 10px;">
          <table class="round-table leaderboard-table" style="width: 100%;">
            <tbody>
              ${historyRows || '<tr><td colspan="3" style="text-align:center; color:var(--parchment-dim);">The Arcana is silent. No events yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// REALTIME SUBSCRIPTION
// =========================================================================
function subscribeToRealtime() {
  supabase
    .channel("amazing-race-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "amazing-race" },
      () => {
        render();
      },
    )
    .subscribe();
}

// Start application
initRace();
