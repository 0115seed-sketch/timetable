const SCHOOL = {
  officeCode: "N10",
  schoolCode: "8140253",
  grade: "2",
  classNm: "9"
};

const state = {
  mode: "daily"
};

const els = {
  datePicker: document.getElementById("datePicker"),
  btnDaily: document.getElementById("btnDaily"),
  btnWeekly: document.getElementById("btnWeekly"),
  loading: document.getElementById("loading"),
  errorMessage: document.getElementById("errorMessage"),
  emptyMessage: document.getElementById("emptyMessage"),
  timetableList: document.getElementById("timetableList"),
  weeklyContainer: document.getElementById("weeklyContainer"),
  weeklyTableBody: document.getElementById("weeklyTableBody"),
  wMon: document.getElementById("wMon"),
  wTue: document.getElementById("wTue"),
  wWed: document.getElementById("wWed"),
  wThu: document.getElementById("wThu"),
  wFri: document.getElementById("wFri")
};

function localISODate() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

function ymd(dateISO) {
  return dateISO.replaceAll("-", "");
}

function text(value) {
  return String(value || "").replaceAll("*", "").trim();
}

function toDateFromYmd(dateYmd) {
  return new Date(Number(dateYmd.slice(0, 4)), Number(dateYmd.slice(4, 6)) - 1, Number(dateYmd.slice(6, 8)));
}

function dateLabel(dateObj) {
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return `${month}/${day}`;
}

function weekMonFri(dateISO) {
  const target = new Date(dateISO);
  const dow = target.getDay();
  const diffToMon = target.getDate() - dow + (dow === 0 ? -6 : 1);
  const monday = new Date(target.setDate(diffToMon));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { monday, friday };
}

function renderWeekHeader(dateISO) {
  const { monday } = weekMonFri(dateISO);
  const days = ["월", "화", "수", "목", "금"];
  const refs = [els.wMon, els.wTue, els.wWed, els.wThu, els.wFri];
  refs.forEach((ref, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    ref.textContent = `${days[idx]} (${dateLabel(d)})`;
  });
}

function setMode(mode) {
  state.mode = mode;
  const isDaily = mode === "daily";
  els.btnDaily.classList.toggle("is-active", isDaily);
  els.btnWeekly.classList.toggle("is-active", !isDaily);
  els.btnDaily.setAttribute("aria-selected", String(isDaily));
  els.btnWeekly.setAttribute("aria-selected", String(!isDaily));
}

function hideAllStates() {
  els.loading.classList.add("hidden");
  els.errorMessage.classList.add("hidden");
  els.emptyMessage.classList.add("hidden");
  els.timetableList.classList.add("hidden");
  els.weeklyContainer.classList.add("hidden");
}

function showLoading() {
  hideAllStates();
  els.loading.classList.remove("hidden");
}

function showError(message) {
  hideAllStates();
  els.errorMessage.innerHTML = message;
  els.errorMessage.classList.remove("hidden");
}

function showEmpty(message) {
  hideAllStates();
  els.emptyMessage.innerHTML = message;
  els.emptyMessage.classList.remove("hidden");
}

function getApiKey() {
  return window.__APP_CONFIG__?.NICE_API_KEY || "";
}

async function fetchTimetable() {
  showLoading();

  const dateISO = els.datePicker.value;
  const mode = state.mode;
  const apiKey = getApiKey();

  if (!apiKey) {
    showError("API 키가 설정되지 않았습니다.<br />assets/js/config.js의 NICE_API_KEY를 확인해 주세요.");
    return;
  }

  const query = new URLSearchParams({
    KEY: apiKey,
    Type: "json",
    pIndex: "1",
    pSize: "300",
    ATPT_OFCDC_SC_CODE: SCHOOL.officeCode,
    SD_SCHUL_CODE: SCHOOL.schoolCode,
    GRADE: SCHOOL.grade,
    CLASS_NM: SCHOOL.classNm
  });

  if (mode === "weekly") {
    const { monday, friday } = weekMonFri(dateISO);
    query.set("TI_FROM_YMD", ymd(monday.toISOString().slice(0, 10)));
    query.set("TI_TO_YMD", ymd(friday.toISOString().slice(0, 10)));
  } else {
    query.set("ALL_TI_YMD", ymd(dateISO));
  }

  try {
    const response = await fetch(`https://open.neis.go.kr/hub/hisTimetable?${query.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error("시간표를 불러오지 못했습니다.");
    }

    if (payload.RESULT && payload.RESULT.CODE && payload.RESULT.CODE !== "INFO-000") {
      if (payload.RESULT.CODE === "INFO-200") {
        if (mode === "daily") {
          renderDaily([]);
        } else {
          renderWeekly([], dateISO);
        }
        return;
      }
      throw new Error(payload.RESULT.MESSAGE || "NEIS API 오류");
    }

    const rows = Array.isArray(payload?.hisTimetable?.[1]?.row) ? payload.hisTimetable[1].row : [];

    if (mode === "daily") {
      renderDaily(rows);
    } else {
      renderWeekly(rows, dateISO);
    }
  } catch (error) {
    showError(`오류가 발생했습니다: ${error.message}`);
  }
}

function renderDaily(rows) {
  if (rows.length === 0) {
    showEmpty("선택한 날짜에 시간표가 없습니다.<br />주말, 공휴일, 시험기간일 수 있습니다.");
    return;
  }

  const sorted = [...rows].sort((a, b) => Number(a.PERIO) - Number(b.PERIO));
  els.timetableList.innerHTML = sorted.map((row) => {
    return `
      <li class="daily-item">
        <span class="period">${row.PERIO}교시</span>
        <span class="subject">${text(row.ITRT_CNTNT)}</span>
      </li>
    `;
  }).join("");

  hideAllStates();
  els.timetableList.classList.remove("hidden");
}

function renderWeekly(rows, dateISO) {
  renderWeekHeader(dateISO);

  if (rows.length === 0) {
    showEmpty("선택한 주간에 시간표가 없습니다.");
    return;
  }

  const maxPeriod = Math.max(...rows.map((r) => Number(r.PERIO) || 0), 7);
  const table = Array.from({ length: maxPeriod }, () => Array(5).fill("-"));

  rows.forEach((row) => {
    const periodIdx = Number(row.PERIO) - 1;
    const dayIdx = toDateFromYmd(row.ALL_TI_YMD).getDay() - 1;
    if (periodIdx >= 0 && periodIdx < maxPeriod && dayIdx >= 0 && dayIdx < 5) {
      table[periodIdx][dayIdx] = text(row.ITRT_CNTNT) || "-";
    }
  });

  els.weeklyTableBody.innerHTML = table.map((periodRow, i) => {
    const tds = periodRow.map((subject) => {
      const cls = subject === "-" ? "weekly-empty" : "";
      return `<td class="${cls}">${subject}</td>`;
    }).join("");

    return `<tr><td>${i + 1}</td>${tds}</tr>`;
  }).join("");

  hideAllStates();
  els.weeklyContainer.classList.remove("hidden");
}

function bindEvents() {
  els.datePicker.addEventListener("change", fetchTimetable);
  els.btnDaily.addEventListener("click", () => {
    if (state.mode === "daily") return;
    setMode("daily");
    fetchTimetable();
  });
  els.btnWeekly.addEventListener("click", () => {
    if (state.mode === "weekly") return;
    setMode("weekly");
    fetchTimetable();
  });
}

function bootstrap() {
  els.datePicker.value = localISODate();
  setMode("daily");
  bindEvents();
  fetchTimetable();
}

window.addEventListener("DOMContentLoaded", bootstrap);
