const fs = require("fs");

const filePath = "public/assets/aistudio/My-Apps-Hub_f6c97383.html";
const text = fs.readFileSync(filePath, "utf8");

const startMarker = 'const NUTRITRACK_SRC = "';
const startIdx = text.indexOf(startMarker);
if (startIdx === -1) {
  console.error("Start marker not found");
  process.exit(1);
}

const endMarker = '";\n    const nutriFrame = document.getElementById("nutritrackFrame");';
const endIdx = text.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error("End marker not found");
  process.exit(1);
}

const rawString = text.slice(startIdx + startMarker.length, endIdx);
let decoded;
try {
  decoded = JSON.parse('"' + rawString + '"');
  console.log("Decoded successfully! Length:", decoded.length);
} catch (e) {
  console.error("JSON parse error:", e);
  process.exit(1);
}

// 1. Add CSS into decoded HTML style
const styleMarker = "</style>";
const styleIdx = decoded.indexOf(styleMarker);
if (styleIdx === -1) {
  console.error("Style marker not found");
  process.exit(1);
}

const fitCalCSS = `
    /* Fitness Calendar & Streaks */
    .fit-streak-banner {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      text-align: center;
    }
    .fit-streak-chip {
      padding: 10px 6px;
      border-radius: 16px;
      background: var(--bg);
      border: 1px solid var(--line);
    }
    .fit-streak-chip b {
      display: block;
      font-size: 1.15rem;
      font-weight: 900;
      color: var(--yd);
    }
    .fit-streak-chip span {
      font-size: 0.68rem;
      color: var(--mute);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .fit-cal-day {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      border: 1.5px solid var(--line);
      background: var(--card);
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
      min-height: 44px;
    }
    .fit-cal-day:hover {
      border-color: var(--g);
      transform: translateY(-1px);
    }
    .fit-cal-day.selected {
      border-color: var(--y);
      background: var(--yl);
      color: var(--yd);
      box-shadow: 0 0 0 1.5px var(--y);
      font-weight: 900;
    }
    .fit-cal-day.today {
      border: 2px solid var(--b);
    }
    .fit-cal-day.has-activity {
      background: color-mix(in srgb, var(--gl) 55%, var(--card));
      border-color: var(--g);
      color: var(--gd);
    }
    .fit-cal-day.goal-reached {
      background: var(--gl);
      border-color: var(--gd);
      color: var(--gd);
      font-weight: 900;
    }
    .fit-cal-badge-dot {
      font-size: 0.62rem;
      line-height: 1;
      margin-top: 1px;
    }
    .fit-cal-min-text {
      font-size: 0.62rem;
      font-weight: 800;
      color: var(--mute);
      margin-top: 1px;
      line-height: 1;
    }
    .fit-cal-day.selected .fit-cal-min-text {
      color: var(--yd);
    }
    .fit-cal-legend {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--mute);
    }
    .fit-cal-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cal-dot-legend {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .cal-dot-legend.goal-met { background: var(--g); }
    .cal-dot-legend.active-day { background: var(--gl); border: 1px solid var(--g); }
    .cal-dot-legend.streak-day { background: var(--y); }
    .cal-dot-legend.rest-day { background: var(--line); }
    .fit-date-detail-box {
      margin-top: 14px;
      padding: 14px;
      border-radius: 16px;
      background: var(--bg);
      border: 1px solid var(--line);
    }
    .fit-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
`;

decoded = decoded.slice(0, styleIdx) + fitCalCSS + decoded.slice(styleIdx);

// 2. Add Calendar HTML card into view-fit section right before "Last 7 days" card
const fitWeekCardMarker = '<div class="card">\n      <div class="card-title"><span>Last 7 days</span>';
const fitWeekIdx = decoded.indexOf(fitWeekCardMarker);
if (fitWeekIdx === -1) {
  console.error("Last 7 days marker not found");
  process.exit(1);
}

const fitCalHTML = `    <div class="card" id="fitCalCard">
      <div class="card-title">
        <span>Workout Calendar & Streaks 📅</span>
        <span class="fit-badge" id="fitCalStreakBadge">🔥 0-day streak</span>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <button type="button" class="pill-btn" onclick="changeFitCalMonth(-1)">◀ Prev</button>
        <h3 style="margin:0;font-size:1.05rem;font-weight:900" id="fitCalMonthTitle">November 2026</h3>
        <button type="button" class="pill-btn" onclick="changeFitCalMonth(1)">Next ▶</button>
      </div>

      <div class="fit-streak-banner" id="fitStreakBanner"></div>

      <div class="cal-grid" id="fitCalDayHeaders">
        <div class="cal-day-header">Su</div>
        <div class="cal-day-header">Mo</div>
        <div class="cal-day-header">Tu</div>
        <div class="cal-day-header">We</div>
        <div class="cal-day-header">Th</div>
        <div class="cal-day-header">Fr</div>
        <div class="cal-day-header">Sa</div>
      </div>

      <div class="cal-grid" id="fitCalGrid" style="margin-top:6px"></div>

      <div class="fit-cal-legend">
        <span><span class="cal-dot-legend goal-met"></span> Goal Met (≥30m)</span>
        <span><span class="cal-dot-legend active-day"></span> Active (1-29m)</span>
        <span><span class="cal-dot-legend streak-day"></span> 🔥 Streak</span>
        <span><span class="cal-dot-legend rest-day"></span> Rest</span>
      </div>

      <div class="fit-date-detail-box" id="fitDateDetailBox">
        <div class="fit-detail-header">
          <div>
            <b id="fitDetailDateTitle" style="font-size:0.95rem">Today's Workout Log</b>
            <span id="fitDetailDateSub" style="display:block;font-size:0.75rem;color:var(--mute)">0 min logged</span>
          </div>
          <button type="button" class="pill-btn" id="fitDetailTodayBtn" onclick="selectFitCalDate(getTodayKey())" style="display:none">Back to Today</button>
        </div>
        <div id="fitDetailWorkoutsList" style="display:grid;gap:6px;margin-top:8px"></div>
        <button type="button" class="btn secondary" id="fitLogForDayBtn" onclick="focusFitLogger()" style="margin-top:10px;padding:9px 14px;font-size:0.85rem">
          + Log Activity for This Date 💪
        </button>
      </div>
    </div>\n\n`;

decoded = decoded.slice(0, fitWeekIdx) + fitCalHTML + decoded.slice(fitWeekIdx);

// 3. Add JavaScript functions for the Fitness Calendar before renderFitness
const renderFitnessMarker = "function renderFitness() {";
const renderFitnessIdx = decoded.indexOf(renderFitnessMarker);
if (renderFitnessIdx === -1) {
  console.error("renderFitness marker not found");
  process.exit(1);
}

const fitCalJS = `  let fitCalViewDate = new Date();

  function changeFitCalMonth(delta) {
    fitCalViewDate.setMonth(fitCalViewDate.getMonth() + delta);
    renderFitCalendar();
  }

  function selectFitCalDate(dateKey) {
    activeDateKey = dateKey;
    renderFitness();
  }

  function focusFitLogger() {
    const input = document.getElementById("fitMin");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus();
    }
  }

  function renderFitCalendar() {
    const year = fitCalViewDate.getFullYear();
    const month = fitCalViewDate.getMonth();
    const monthName = fitCalViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const titleEl = document.getElementById("fitCalMonthTitle");
    if (titleEl) titleEl.textContent = monthName;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = document.getElementById("fitCalGrid");
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement("div");
      blank.style.opacity = "0.15";
      grid.appendChild(blank);
    }

    const todayStr = getTodayKey();
    const kids = fitIsKids();
    const dailyGoal = kids ? 60 : 30;

    let monthActiveDays = 0;
    let monthTotalMin = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = \`\${year}-\${String(month + 1).padStart(2, "0")}-\${String(day).padStart(2, "0")}\`;
      const dayMins = fitMinutes(dateKey);
      const dayActs = fitList(dateKey);
      const isSelected = dateKey === activeDateKey;
      const isToday = dateKey === todayStr;
      const hasActivity = dayMins > 0;
      const goalReached = dayMins >= dailyGoal;

      if (hasActivity) {
        monthActiveDays++;
        monthTotalMin += dayMins;
      }

      const cell = document.createElement("div");
      cell.className = "fit-cal-day" +
        (isSelected ? " selected" : "") +
        (isToday ? " today" : "") +
        (goalReached ? " goal-reached" : (hasActivity ? " has-activity" : ""));

      let icon = "";
      if (goalReached) icon = "🏆";
      else if (dayMins >= 10) icon = "🔥";
      else if (hasActivity) icon = "⚡";

      cell.innerHTML = \`
        <span>\${day}</span>
        \${dayMins > 0 ? \`<span class="fit-cal-min-text">\${dayMins}m</span>\` : ""}
        \${icon ? \`<span class="fit-cal-badge-dot">\${icon}</span>\` : ""}
      \`;

      cell.title = \`\${dateKey}: \${dayMins} min (\${dayActs.length} workouts logged)\`;
      cell.onclick = () => selectFitCalDate(dateKey);

      grid.appendChild(cell);
    }

    const curStreak = fitStreak();
    const bestStreak = fitBestStreak();
    const bannerEl = document.getElementById("fitStreakBanner");
    if (bannerEl) {
      bannerEl.innerHTML = \`
        <div class="fit-streak-chip">
          <b>🔥 \${curStreak}</b>
          <span>Current Streak</span>
        </div>
        <div class="fit-streak-chip">
          <b>⚡ \${bestStreak}</b>
          <span>Best Streak</span>
        </div>
        <div class="fit-streak-chip">
          <b style="color:var(--g)">\${monthActiveDays}d · \${monthTotalMin}m</b>
          <span>\${monthName.split(" ")[0]} Total</span>
        </div>
      \`;
    }

    const badgeEl = document.getElementById("fitCalStreakBadge");
    if (badgeEl) {
      badgeEl.textContent = \`🔥 \${curStreak}-day streak (best: \${bestStreak})\`;
    }

    renderFitSelectedDateDetails();
  }

  function renderFitSelectedDateDetails() {
    const dateObj = new Date(activeDateKey + "T00:00:00");
    const isToday = activeDateKey === getTodayKey();
    const formatted = dateObj.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const titleEl = document.getElementById("fitDetailDateTitle");
    const subEl = document.getElementById("fitDetailDateSub");
    const todayBtn = document.getElementById("fitDetailTodayBtn");
    const listEl = document.getElementById("fitDetailWorkoutsList");
    const logForDayBtn = document.getElementById("fitLogForDayBtn");

    if (titleEl) titleEl.textContent = isToday ? \`Today's Workout Log (\${formatted})\` : \`Workout Log for \${formatted}\`;
    if (todayBtn) todayBtn.style.display = isToday ? "none" : "inline-flex";

    const acts = fitList(activeDateKey);
    const mins = fitMinutes(activeDateKey);
    const burn = fitBurn(activeDateKey);
    const kids = fitIsKids();
    const goal = kids ? 60 : 30;

    if (subEl) {
      subEl.textContent = \`\${mins} min active · \${burn} kcal estimated · \${acts.length} logged · \${mins >= goal ? "Daily Goal Met! 🏆" : (goal - mins) + " min to daily goal"}\`;
    }

    if (logForDayBtn) {
      logForDayBtn.textContent = isToday ? "+ Log Today's Activity 💪" : \`+ Log Activity for \${formatted} 💪\`;
    }

    if (listEl) {
      listEl.innerHTML = "";
      if (!acts.length) {
        listEl.innerHTML = \`<p style="font-size:0.82rem;color:var(--mute);margin:4px 0;text-align:center">No workouts or activities logged on this date.</p>\`;
      } else {
        acts.forEach((a, i) => {
          const row = document.createElement("div");
          row.className = "fit-row";
          row.style.margin = "0";
          row.innerHTML = \`
            <div>
              <b>\${a.emoji} \${a.name}</b>
              <small>\${a.min} min · ~\${a.kcal} kcal \${a.src === "workout" ? "· timed workout" : ""}</small>
            </div>
            <button type="button" class="pill-btn" onclick="removeActivity(\${i})">✕</button>
          \`;
          listEl.appendChild(row);
        });
      }
    }
  }\n\n  `;

decoded = decoded.slice(0, renderFitnessIdx) + fitCalJS + decoded.slice(renderFitnessIdx);

// 4. In renderFitness(), add call to renderFitCalendar() at the end
const endRenderFitnessMarker = "document.getElementById(\"fitBadges\").innerHTML = bdgs.map";
const endRenderFitnessIdx = decoded.indexOf(endRenderFitnessMarker);
if (endRenderFitnessIdx === -1) {
  console.error("endRenderFitnessMarker not found");
  process.exit(1);
}

// Find closing brace of renderFitness
const closeBraceIdx = decoded.indexOf("\n  }", endRenderFitnessIdx);
if (closeBraceIdx === -1) {
  console.error("closeBraceIdx not found");
  process.exit(1);
}

const injectRenderFitCal = "\n    renderFitCalendar();";
decoded = decoded.slice(0, closeBraceIdx) + injectRenderFitCal + decoded.slice(closeBraceIdx);

// Encode back to JSON string literal
const reEncoded = JSON.stringify(decoded);
// JSON.stringify adds leading and trailing quotes: `"..."`
const finalRaw = reEncoded.slice(1, -1);

const newText = text.slice(0, startIdx + startMarker.length) + finalRaw + text.slice(endIdx);

fs.writeFileSync(filePath, newText, "utf8");
console.log("Successfully updated My-Apps-Hub_f6c97383.html with Fitness Calendar!");
