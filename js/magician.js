/*
  game.js / magician.js
  ------------------------------------------------------------------
  "Crack the Seal" — Player is the TEAM, Code is the FACILITATOR.
  1. The Team (Player) inputs their chosen 3-digit number (summing to 15).
  2. The Facilitator (Code) secretly generates its own 3-digit number (summing to 15).
  3. The Team asks unlimited Yes/No questions or makes a guess.
  4. The game ends when the Team correctly guesses the Facilitator's number or time runs out.
  5. State is preserved in localStorage across page refreshes, TIED TO THE USER.
*/

(function () {
  "use strict";

  // ================================================================
  // 1. PUZZLE MODEL & LOGIC
  // ================================================================

  function generateFacilitatorSecret() {
    const candidates = [];
    for (let a = 1; a <= 9; a++) {
      for (let b = 0; b <= 9; b++) {
        const c = 15 - a - b;
        if (c >= 0 && c <= 9) {
          candidates.push([a, b, c]);
        }
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function validateNumberString(str) {
    if (!/^\d{3}$/.test(str)) return "Must be exactly 3 digits.";
    if (str[0] === "0") return "First digit cannot be 0.";
    const sum = parseInt(str[0]) + parseInt(str[1]) + parseInt(str[2]);
    if (sum !== 15) return `Digits must sum to 15. Current sum is ${sum}.`;
    return null;
  }

  // ================================================================
  // 2. GAME STATE & STORAGE
  // ================================================================

  const state = {
    screen: "setup", // 'setup' | 'game' | 'end'
    teamNumber: null,
    facilitatorSecret: null,
    startTime: null,
    timerHandle: null,
    timeLimitSeconds: 900, // 15 minutes
    log: [],
    won: false,
    timeout: false,
  };

  // Generate a dynamic storage key based on the logged-in user
  function getStorageKey() {
    const userEl = document.getElementById("user-email");
    const userEmail = userEl ? userEl.textContent.trim() : "";
    const identifier = userEmail || "guest"; // Fallback to guest if no email found
    return `arcanaGameState_${identifier}`;
  }

  function saveState() {
    const { timerHandle, timeLimitSeconds, ...toSave } = state;
    localStorage.setItem(getStorageKey(), JSON.stringify(toSave));
  }

  function loadState() {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);

        // If the state was actively playing, restart the timer
        if (state.screen === "game") {
          state.timerHandle = setInterval(gameTick, 1000);
          checkTimeLimit(); // Immediately check if time expired while they were offline

          console.log(
            `[Loaded State for ${getStorageKey()}] Secret Number: ${state.facilitatorSecret.join("")}`,
          );
        }
        return true;
      } catch (e) {
        console.error("Failed to parse saved game state:", e);
      }
    }
    return false;
  }

  function resetState() {
    state.screen = "setup";
    state.teamNumber = null;
    state.facilitatorSecret = null;
    state.startTime = null;
    state.log = [];
    state.won = false;
    state.timeout = false;
    stopTimer();
    localStorage.removeItem(getStorageKey());
  }

  // ================================================================
  // 3. TIMER
  // ================================================================

  function stopTimer() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function elapsedSeconds() {
    if (!state.startTime) return 0;
    return Math.floor((Date.now() - state.startTime) / 1000);
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function checkTimeLimit() {
    if (state.screen !== "game") return;
    if (elapsedSeconds() >= state.timeLimitSeconds) {
      state.screen = "end";
      state.timeout = true;
      stopTimer();
      saveState();
      render();
    }
  }

  function gameTick() {
    checkTimeLimit();
    if (state.screen === "game") {
      const timerDisplay = document.getElementById("ag-timer-display");
      if (timerDisplay) {
        const remainingTime = Math.max(
          0,
          state.timeLimitSeconds - elapsedSeconds(),
        );
        timerDisplay.textContent = `Time Left: ${formatTime(remainingTime)}`;
      }
    }
  }

  // ================================================================
  // 4. ACTIONS
  // ================================================================

  function startGame(teamNumStr) {
    state.teamNumber = teamNumStr;
    state.facilitatorSecret = generateFacilitatorSecret();
    console.log(
      `Facilitator's Secret Number: ${state.facilitatorSecret.join("")}`,
    );

    state.screen = "game";
    state.startTime = Date.now();
    state.log = [];
    state.timerHandle = setInterval(gameTick, 1000);

    saveState();
    render();
  }

  function askDirectQuestion(i, j) {
    const facDigit = state.facilitatorSecret[i];
    const teamDigit = parseInt(state.teamNumber[j], 10);
    const isGreater = facDigit > teamDigit;

    const order = ["1st", "2nd", "3rd"];
    const text = `Is your ${order[i]} digit greater than my ${order[j]} digit?`;

    state.log.unshift({ type: "q", text, result: isGreater ? "Yes" : "No" });

    saveState();
    render();
  }

  function askSumQuestion(i, j, k, l) {
    const facSum = state.facilitatorSecret[i] + state.facilitatorSecret[j];
    const teamSum =
      parseInt(state.teamNumber[k], 10) + parseInt(state.teamNumber[l], 10);
    const isGreater = facSum > teamSum;

    const order = ["1st", "2nd", "3rd"];
    const text = `Is the sum of your ${order[i]} & ${order[j]} digits greater than the sum of my ${order[k]} & ${order[l]} digits?`;

    state.log.unshift({ type: "q", text, result: isGreater ? "Yes" : "No" });

    saveState();
    render();
  }

  function submitGuess(guessStr) {
    const isCorrect = guessStr === state.facilitatorSecret.join("");
    state.log.unshift({
      type: "g",
      text: `Guessed: ${guessStr}`,
      result: isCorrect ? "Correct!" : "Incorrect.",
    });

    if (isCorrect) {
      state.won = true;
      state.screen = "end";
      stopTimer();
    }

    saveState();
    render();
  }

  // ================================================================
  // 5. UI / RENDER
  // ================================================================

  let root = null;

  function injectStyles() {
    if (document.getElementById("ag-styles")) return;
    const style = document.createElement("style");
    style.id = "ag-styles";
    style.textContent = `
      .ag-panel {
        max-width: 550px;
        margin: 2rem auto;
        padding: 1.75rem;
        border-radius: 14px;
        border: 1px solid rgba(212, 175, 55, 0.35);
        background: rgba(20, 16, 28, 0.9);
        color: #ece6d8;
        font-family: "Caudex", serif, sans-serif;
      }
      .ag-panel h2 { margin: 0 0 1rem; font-size: 1.4rem; text-align: center; color: #e8cf7a; }
      .ag-panel h3 { margin: 0 0 0.5rem; font-size: 1.1rem; color: #e8cf7a; border-bottom: 1px solid rgba(212,175,55,0.3); padding-bottom: 0.2rem;}
      
      .ag-meta {
        display: flex; justify-content: space-between; font-size: 0.9rem;
        color: rgba(236, 230, 216, 0.8); margin-bottom: 1.25rem;
        padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 8px;
      }
      
      .ag-input-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .ag-input-group label { font-size: 0.9rem; }
      .ag-input {
        padding: 0.6rem; border-radius: 6px; border: 1px solid rgba(212, 175, 55, 0.5);
        background: rgba(0,0,0,0.5); color: #fff; font-size: 1rem; font-family: monospace;
      }
      
      .ag-select {
        padding: 0.4rem; border-radius: 4px; border: 1px solid rgba(212, 175, 55, 0.5);
        background: rgba(0,0,0,0.5); color: #fff; font-size: 0.9rem;
      }

      .ag-btn {
        padding: 0.65rem 1rem; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.75);
        background: linear-gradient(180deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08));
        color: #e8cf7a; font-size: 1rem; cursor: pointer; text-align: center; font-weight: bold;
      }
      .ag-btn:hover:not(:disabled) { background: linear-gradient(180deg, rgba(212,175,55,0.35), rgba(212,175,55,0.12)); }
      .ag-btn:disabled { opacity: 0.5; cursor: not-allowed; border-color: #666; color: #aaa; }
      
      .ag-section { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; }
      
      .ag-log {
        list-style: none; margin: 0; padding: 0; font-size: 0.9rem;
        max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem;
      }
      .ag-log li { padding: 0.5rem; background: rgba(0,0,0,0.2); border-left: 3px solid #e8cf7a; border-radius: 4px; }
      .ag-log li .ag-res { font-weight: bold; color: #e8cf7a; margin-left: 0.5rem; }
      
      .ag-builder { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
      .ag-error { color: #ff6b6b; font-size: 0.85rem; margin-top: 0.25rem; display: none; }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    root = document.getElementById("arcana-game");
    if (!root) {
      root = document.createElement("section");
      root.id = "arcana-game";
      document.body.appendChild(root);
    }
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // --- Screens ---

  function renderSetup(panel) {
    panel.appendChild(el("h2", null, "Crack the Seal: Preparation"));

    const desc = el(
      "p",
      null,
      "Before the game begins, create your secret 3-digit number. The digits must sum to exactly 15 (e.g., 780).",
    );
    desc.style.fontSize = "0.9rem";
    desc.style.marginBottom = "1rem";
    panel.appendChild(desc);

    const group = el("div", "ag-input-group");
    group.appendChild(el("label", null, "Enter Your Team's Number:"));

    const input = el("input", "ag-input");
    input.type = "text";
    input.maxLength = 3;
    input.placeholder = "e.g., 852";
    group.appendChild(input);

    const errorMsg = el("div", "ag-error");
    group.appendChild(errorMsg);

    const startBtn = el("button", "ag-btn", "Submit & Start Game");
    startBtn.style.marginTop = "0.5rem";

    startBtn.onclick = () => {
      const val = input.value.trim();
      const err = validateNumberString(val);
      if (err) {
        errorMsg.textContent = err;
        errorMsg.style.display = "block";
      } else {
        startGame(val);
      }
    };

    panel.appendChild(group);
    panel.appendChild(startBtn);
  }

  function renderGame(panel, updateOnly = false) {
    const meta = el("div", "ag-meta");
    const remainingTime = Math.max(
      0,
      state.timeLimitSeconds - elapsedSeconds(),
    );
    meta.appendChild(el("span", null, `Team's No: ${state.teamNumber}`));

    const timeSpan = el(
      "span",
      null,
      `Time Left: ${formatTime(remainingTime)}`,
    );
    timeSpan.id = "ag-timer-display";
    meta.appendChild(timeSpan);

    panel.appendChild(meta);

    const qSec = el("div", "ag-section");
    const qHeader = el("h3", null, `Ask Facilitator (Unlimited)`);
    qSec.appendChild(qHeader);

    const typeSelect = el("select", "ag-select");
    typeSelect.style.marginBottom = "1rem";
    typeSelect.innerHTML = `
      <option value="direct">Is your digit A > my digit B?</option>
      <option value="sum">Is sum of your(A, B) > sum of my(C, D)?</option>
    `;

    const builder = el("div", "ag-builder");

    const buildDirect = () => {
      builder.innerHTML = `
        <span>Is your</span>
        <select class="ag-select" id="d1"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>digit greater than my</span>
        <select class="ag-select" id="d2"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>digit?</span>
      `;
    };

    const buildSum = () => {
      builder.innerHTML = `
        <span>Is the sum of your</span>
        <select class="ag-select" id="s1"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>&</span>
        <select class="ag-select" id="s2"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>digits > the sum of my</span>
        <select class="ag-select" id="s3"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>&</span>
        <select class="ag-select" id="s4"><option value="0">1st</option><option value="1">2nd</option><option value="2">3rd</option></select>
        <span>digits?</span>
      `;
    };

    typeSelect.onchange = (e) => {
      if (e.target.value === "direct") buildDirect();
      else buildSum();
    };

    buildDirect();
    qSec.appendChild(typeSelect);
    qSec.appendChild(builder);

    const askBtn = el("button", "ag-btn", "Ask Question");
    askBtn.onclick = () => {
      if (typeSelect.value === "direct") {
        const d1 = parseInt(document.getElementById("d1").value);
        const d2 = parseInt(document.getElementById("d2").value);
        askDirectQuestion(d1, d2);
      } else {
        const s1 = parseInt(document.getElementById("s1").value);
        const s2 = parseInt(document.getElementById("s2").value);
        const s3 = parseInt(document.getElementById("s3").value);
        const s4 = parseInt(document.getElementById("s4").value);
        askSumQuestion(s1, s2, s3, s4);
      }
    };
    qSec.appendChild(askBtn);
    panel.appendChild(qSec);

    const gSec = el("div", "ag-section");
    gSec.appendChild(el("h3", null, "Make a Guess"));

    const gRow = el("div", "ag-builder");
    const gInput = el("input", "ag-input");
    gInput.type = "text";
    gInput.maxLength = 3;
    gInput.placeholder = "3-digit guess";

    const gBtn = el("button", "ag-btn", "Submit Guess");
    gBtn.onclick = () => {
      const val = gInput.value.trim();
      const err = validateNumberString(val);
      if (err) {
        alert("Invalid Guess: " + err);
      } else {
        submitGuess(val);
      }
    };

    gRow.appendChild(gInput);
    gRow.appendChild(gBtn);
    gSec.appendChild(gRow);
    panel.appendChild(gSec);

    if (state.log.length > 0) {
      const logSec = el("div", "ag-section");
      logSec.style.padding = "0";
      logSec.style.border = "none";
      const logHeader = el("h3", null, "Game Log");
      logSec.appendChild(logHeader);

      const ul = el("ul", "ag-log");
      for (const entry of state.log) {
        const li = el("li");
        li.textContent = entry.text;
        const res = el("span", "ag-res", `➔ ${entry.result}`);
        li.appendChild(res);
        ul.appendChild(li);
      }
      logSec.appendChild(ul);
      panel.appendChild(logSec);
    }
  }

  function renderEnd(panel) {
    panel.appendChild(el("h2", null, "Game Over"));

    const resultMsg = el("div", null);
    resultMsg.style.textAlign = "center";
    resultMsg.style.fontSize = "1.2rem";
    resultMsg.style.marginBottom = "1.5rem";

    if (state.timeout) {
      resultMsg.textContent =
        "Time Limit Expired! You failed to identify the Facilitator's number in time.";
      resultMsg.style.color = "#ff6b6b";
    } else if (state.won) {
      resultMsg.textContent = `Success! You cracked the seal in ${formatTime(elapsedSeconds())}.`;
      resultMsg.style.color = "#85e085";
    }

    panel.appendChild(resultMsg);

    const facReveal = el("p", null, `The Facilitator's Secret Number was: `);
    facReveal.style.textAlign = "center";
    const boldNum = el("strong", null, state.facilitatorSecret.join(""));
    boldNum.style.fontSize = "1.5rem";
    boldNum.style.color = "#e8cf7a";
    facReveal.appendChild(boldNum);
    panel.appendChild(facReveal);

    const restartBtn = el("button", "ag-btn", "Play Again");
    restartBtn.style.display = "block";
    restartBtn.style.margin = "2rem auto 0";
    restartBtn.onclick = () => {
      resetState();
      render();
    };
    panel.appendChild(restartBtn);
  }

  function render(updateOnly = false) {
    if (!root) return;
    root.innerHTML = "";

    const panel = el("div", "ag-panel");
    root.appendChild(panel);

    if (state.screen === "setup") {
      renderSetup(panel);
    } else if (state.screen === "game") {
      renderGame(panel, updateOnly);
    } else if (state.screen === "end") {
      renderEnd(panel);
    }
  }

  // ================================================================
  // 6. INIT & AUTH SYNC
  // ================================================================

  function init() {
    injectStyles();
    mount();

    // Attempt to load existing state, otherwise start fresh
    if (!loadState()) {
      resetState();
    }

    render();
  }

  // Wait for the auth script to populate the user email so we grab the right save file
  function initWhenUserReady() {
    const userEl = document.getElementById("user-email");

    // If there is no user element, fallback to standard init
    if (!userEl) {
      init();
      return;
    }

    // If it's already populated, init immediately
    if (userEl.textContent.trim() !== "") {
      init();
      return;
    }

    // Otherwise, listen for changes to the element (when user.js runs)
    const observer = new MutationObserver(() => {
      if (userEl.textContent.trim() !== "") {
        observer.disconnect(); // Stop listening
        init(); // Start the game with the correct user data
      }
    });

    observer.observe(userEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWhenUserReady);
  } else {
    initWhenUserReady();
  }
})();
