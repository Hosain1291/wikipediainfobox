/* =========================================================
   선거 인포박스 빌더
   하나의 상태(state) → 위키백과/나무위키 두 렌더러 → 세 가지 코드
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 기본 필드 구성 ---------- */
  const DEFAULT_FIELDS = {
    presidential: [
      { id: "image", label: "사진", type: "image" },
      { id: "votes", label: "득표수", type: "text" },
      { id: "percentage", label: "득표율", type: "text" }
    ],
    legislative: [
      { id: "image", label: "사진", type: "image" },
      { id: "alliance", label: "소속 연합", type: "text" },
      { id: "lastElection", label: "이전 선거", type: "text" },
      { id: "seatsWon", label: "획득 의석", type: "text" },
      { id: "seatChange", label: "의석 증감", type: "text" },
      { id: "constituencyVote", label: "지역구 득표", type: "text" },
      { id: "constituencyPercent", label: "지역구 득표율", type: "text" },
      { id: "regionalVote", label: "비례대표 득표", type: "text" },
      { id: "regionalPercent", label: "비례대표 득표율", type: "text" }
    ],
    local: [
      { id: "image", label: "사진", type: "image" },
      { id: "regionalSeatsLast", label: "직전 광역", type: "text" },
      { id: "municipalSeatsLast", label: "직전 기초", type: "text" },
      { id: "regionalSeatsWon", label: "획득 광역", type: "text" },
      { id: "municipalSeatsWon", label: "획득 기초", type: "text" },
      { id: "regionalSeatsChange", label: "광역 증감", type: "text" },
      { id: "municipalSeatsChange", label: "기초 증감", type: "text" }
    ],
    next_legislative: [{ id: "seatsWon", label: "현재 의석", type: "text" }],
    legislative_election: [
      { id: "percentage", label: "득표율", type: "text" },
      { id: "seatsWon", label: "의석", type: "text" },
      { id: "lastElection", label: "이전 선거 의석", type: "text" }
    ],
    referendum: []
  };
  const FIELD_LABEL_EN = {
    image: "Image", votes: "Popular vote", percentage: "Percentage", alliance: "Alliance", lastElection: "Last election",
    seatsWon: "Seats won", seatChange: "Seat change", constituencyVote: "Constituency vote", constituencyPercent: "Constituency %",
    regionalVote: "List vote", regionalPercent: "List %", regionalSeatsLast: "Metro. last election", municipalSeatsLast: "Mun. last election",
    regionalSeatsWon: "Metro. seats won", municipalSeatsWon: "Mun. seats won", regionalSeatsChange: "Metro. change", municipalSeatsChange: "Mun. change"
  };
  const defaultFields = (type) => {
    const f = clone(DEFAULT_FIELDS[type] || []);
    if (state.outputLang === "en") f.forEach((x) => { if (FIELD_LABEL_EN[x.id]) x.label = FIELD_LABEL_EN[x.id]; });
    if (type === "next_legislative" && state.outputLang === "en") f[0].label = "Current seats";
    if (type === "legislative_election" && state.outputLang === "en") f.forEach((x) => { x.label = { percentage: "Vote %", seatsWon: "Seats", lastElection: "Last election" }[x.id] || x.label; });
    return f;
  };
  const isEn = () => state.outputLang === "en";
  const CHOICE_COLORS = ["#2e8540", "#c62828", "#1f5fbf", "#b7791f", "#6b46c1", "#2c7a7b"];
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  let state = {
    electionType: "presidential", electionName: "", country: "", electionDate: "",
    flagImage: "", beforeElectionYear: "", afterElectionYear: "",
    turnoutDetails: "", registeredVoters: "", turnoutText: "",
    mapImage: "", mapCaption: "", previewWidth: 320, title: "",
    beforeElection: "", beforeParty: "", afterElection: "", afterParty: "",
    candidates: [], customStats: [], candidateFieldsConfig: [],
    referendumQuestion: "", referendumChoices: [],
    editingCandidateId: "1", candidatesPerRow: "auto",
    outputLang: "ko", selectedFont: "wikipedia",
    infoboxStyle: "wikipedia", namuThemeColor: "", namuBallotNo: true, ongoing: false,
    legisNoLeader: false, legisNoPct: false, legisFirst: false,
    codeTab: "wiki-ko"
  };

  const $ = (id) => document.getElementById(id);

  /* ---------- 이스케이프 · 서식 변환 ---------- */
  const escHtml = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = (s) => escHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const hexOf = (c) => {
    c = String(c || "").trim();
    if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c)) return (c[0] === "#" ? c : "#" + c).toLowerCase();
    if (/^[a-z]+$/i.test(c)) return c.toLowerCase();
    return "#202122";
  };
  const COLOR_RE = /\{\{\s*colou?r\s*\|\s*([^|}]+?)\s*\|\s*(.*?)\s*\}\}/g;
  const LINK_RE = /\*([^*\n]+?)\*/g;

  // 입력 서식 → 미리보기 HTML
  function fmt(text) {
    if (text == null || text === "") return "";
    let s = escHtml(text).replace(/&lt;br\s*\/?&gt;/gi, "\n");
    s = s.replace(/'''(.+?)'''/g, "<b>$1</b>")
      .replace(/''(.+?)''/g, "<i>$1</i>")
      .replace(/\{\{\s*increase\s*\}\}/gi, '<span class="up">▲</span>')
      .replace(/\{\{\s*decrease\s*\}\}/gi, '<span class="down">▼</span>')
      .replace(/\{\{\s*(steady|nochange)\s*\}\}/gi, '<span class="steady">▬</span>')
      .replace(COLOR_RE, (m, c, t) => `<span style="color:${hexOf(c)}">${t}</span>`)
      .replace(/\^\{(.*?)\}/g, "<sup>$1</sup>")
      .replace(/\^\[(.*?)\]/g, "<sup>[$1]</sup>")
      .replace(LINK_RE, "<a>$1</a>")
      .replace(/--/g, "—")
      .replace(/\n/g, "<br>");
    return s;
  }
  // 입력 서식 → 위키텍스트
  function toWiki(text) {
    if (text == null) return "";
    return String(text)
      .replace(/\{\{\s*nochange\s*\}\}/gi, "{{steady}}")
      .replace(/\^\{(.*?)\}/g, "<sup>$1</sup>")
      .replace(/\^\[(.*?)\]/g, "<sup>[$1]</sup>")
      .replace(LINK_RE, "[[$1]]")
      .replace(/--/g, "—")
      .replace(/\r?\n/g, "<br />");
  }
  // 입력 서식 → 나무마크
  function toNamu(text) {
    if (text == null) return "";
    return String(text)
      .replace(/\{\{\s*increase\s*\}\}/gi, "{{{#00a86b ▲}}}")
      .replace(/\{\{\s*decrease\s*\}\}/gi, "{{{#e0242f ▼}}}")
      .replace(/\{\{\s*(steady|nochange)\s*\}\}/gi, "{{{#888 ▬}}}")
      .replace(COLOR_RE, (m, c, t) => `{{{${hexOf(c)} ${t}}}}`)
      .replace(/\^\{(.*?)\}/g, "^^$1^^")
      .replace(/\^\[(.*?)\]/g, "^^[$1]^^")
      .replace(LINK_RE, "[[$1]]")
      .replace(/--/g, "—")
      .replace(/<br\s*\/?>/gi, "[br]")
      .replace(/\r?\n/g, "[br]")
      .replace(/\|\|/g, "|​|"); // 표 구분자 충돌 방지
  }
  const plain = (t) => String(t || "")
    .replace(/'{2,3}/g, "").replace(COLOR_RE, "$2").replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\^\{.*?\}|\^\[.*?\]/g, "").replace(/\*/g, "").replace(/\n/g, " ").trim();
  const hasMarkup = (t) => /'''|''|\{\{|\^\{|\^\[|\*|\n/.test(String(t || ""));

  function textOn(bg) {
    const h = hexOf(bg);
    if (!/^#[0-9a-f]{6}$/.test(h) && !/^#[0-9a-f]{3}$/.test(h)) return "#ffffff";
    let r, g, b;
    if (h.length === 4) { r = parseInt(h[1] + h[1], 16); g = parseInt(h[2] + h[2], 16); b = parseInt(h[3] + h[3], 16); }
    else { r = parseInt(h.slice(1, 3), 16); g = parseInt(h.slice(3, 5), 16); b = parseInt(h.slice(5, 7), 16); }
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return L > 0.62 ? "#1b1d1f" : "#ffffff";
  }
  const pctOf = (raw) => {
    const m = plain(raw).match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const digits = (raw) => plain(raw).replace(/[^\d]/g, "");

  // 이미지 주소 → 위키 파일명
  function fileNameOf(src, fallback) {
    if (!src) return "";
    if (String(src).startsWith("data:")) return fallback;
    try {
      const clean = String(src).split(/[?#]/)[0];
      const parts = clean.split("/");
      const ti = parts.indexOf("thumb");
      const name = ti !== -1 && parts[ti + 3] ? parts[ti + 3] : parts[parts.length - 1];
      return decodeURIComponent(name);
    } catch (e) { return fallback; }
  }
  // "2026년 제9회 ○○ 지방선거" + 2022 → "2022년 ○○ 지방선거" (회차는 틀릴 수 있어 뺌)
  function sisterTitle(year) {
    const m = String(state.electionName || "").match(/^\s*(\d{3,4})(년)?\s*(.+)$/);
    if (m) return `${year}${m[2] || ""} ${m[3].replace(/제\s*\d+\s*회\s*/, "")}`.trim();
    return `${year}년 선거`;
  }
  const isTotalChoice = (label) => /총|합계|유효|무효|기권|백지|등록|선거인|Total|Valid|Invalid|Blank|Registered|Electorate/i.test(String(label || ""));

  /* ---------- 공통 판단 ---------- */
  function perRow() {
    const n = state.candidates.length;
    const v = state.candidatesPerRow;
    if (v === "1" || v === "2" || v === "3") return Math.max(1, Math.min(parseInt(v, 10), Math.max(n, 1)));
    if (n <= 1) return 1;
    if (n === 2 || n === 4) return 2;
    return 3;
  }
  function chunks() {
    const k = perRow(), out = [];
    for (let i = 0; i < state.candidates.length; i += k) out.push(state.candidates.slice(i, i + k));
    return out;
  }
  const fields = () => state.candidateFieldsConfig || [];
  const imageField = () => fields().find((f) => f.type === "image");
  const textFields = () => fields().filter((f) => f.type !== "image");
  const leaderLabel = () => state.electionType === "presidential" ? "후보" : "대표";
  const isBoldField = (f) => /^(seatsWon|seats|percentage)$/.test(f.id) || /획득 의석|Seats won/.test(f.label);
  const percentField = () => textFields().find((f) => f.id === "percentage") || textFields().find((f) => /득표율/.test(f.label));

  // Infobox election data15:
  //   왼쪽  '''{title} before election'''  (ongoing=yes → '''Incumbent {title}''')
  //   오른쪽 '''Elected {title}''' 또는 posttitle  (ongoing=yes → 비움, 결과 없으면 TBD)
  function baHeads() {
    const t = plain(state.title);
    if (state.electionType === "referendum" || !t) return ["이전", "이후"];
    if (state.ongoing) return [`현직 ${t}`, ""];
    return [`선거 전 ${t}`, `선출된 ${t}`];
  }
  const isIncumbent = () => !!state.ongoing && state.electionType !== "referendum";
  const incumbentHead = () => baHeads()[0];
  const hasBA = () => !!(state.beforeElection || state.beforeParty || state.afterElection || state.afterParty);
  const partyColor = (name) => {
    const c = state.candidates.find((x) => plain(x.party) && plain(x.party) === plain(name));
    return c ? c.color : "";
  };

  function choiceRows() {
    const list = state.referendumChoices || [];
    const opts = list.filter((c) => !isTotalChoice(c.label));
    let winner = null, best = -1;
    opts.forEach((c) => { const p = pctOf(c.percentage); if (!isNaN(p) && p > best) { best = p; winner = c; } });
    return { list, opts, winner };
  }

  /* ---------- 이미지 태그 ---------- */
  const SILHOUETTE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.1c-3 0-8.4 1.5-8.4 4.5v2.1h16.8v-2.1c0-3-5.4-4.5-8.4-4.5Z"/></svg>';
  const placeholder = (label) => `<div class="ph">${SILHOUETTE}${label ? `<span>${escHtml(label)}</span>` : ""}</div>`;
  const portrait = (src, name) => src
    ? `<img src="${escAttr(src)}" alt="${escAttr(plain(name))}" crossorigin="anonymous" data-ph="${escAttr(plain(name))}" onerror="window.__imgFail(this)">`
    : placeholder(plain(name).slice(0, 4));
  window.__imgFail = function (img) {
    const d = document.createElement("div");
    d.innerHTML = placeholder(img.dataset.ph || "");
    img.replaceWith(d.firstChild);
  };
  window.__hideFail = function (img) { const row = img.closest("tr"); if (row) row.remove(); };
  window.__mapFail = function (img) {
    const d = document.createElement("div");
    d.className = "ph ph-map";
    d.textContent = (window.__infobox && window.__infobox.state().outputLang === "en" && window.__infobox.state().infoboxStyle === "wikipedia") ? "Map image could not be loaded" : "지도 이미지를 불러오지 못했습니다";
    img.replaceWith(d);
  };

  /* =========================================================
     위키백과 렌더러 — Template:Infobox election / Template:Infobox referendum 소스 기준
     (Module:Infobox 표 구조: title=caption, subheader, header, label/data, below)
     ========================================================= */

  // Infobox election 후보 칸 행 순서와 라벨 (매개변수 → 표시 이름)

  /* ---------- 위키백과 미리보기 문구 (한국어 / 영어) ---------- */
  const ORD_EN = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"];
  const WP_TXT = {
    ko: {
      registered: "선거인수", turnout: "투표율", nominee: "후보", leader: "대표", party: "정당",
      partyHead: (n) => `제${n}당`, majority: ["다수당", "소수당"],
      before: (t) => `선거 전 ${t}`, elected: (t) => `선출된 ${t}`, incumbent: (t) => `현직 ${t}`, tbd: "미정",
      results: "결과", choice: "선택", votes: "득표수", resultsBy: "지역별 결과",
      electorate: "선거인수", empty: "후보를 추가하세요", untitled: "선거 명칭",
      rows: { alliance: "연합", leader_since: "대표 취임", leaders_seat: "대표 지역구", home_state: "출신 주", running_mate: "러닝메이트",
        last_election: "이전 선거", seats_before: "선거 전 의석", seats_needed: "과반 필요 의석", seats: "획득 의석", seats_after: "선거 후 의석",
        seat_change: "의석 변화", electoral_vote: "선거인단", states_carried: "승리 주", delegate_count: "대의원", popular_vote: "득표수",
        percentage: "득표율", swing: "변동" },
      nlParty: "정당", nlLeader: "대표", nlSeats: "현재 의석"
    },
    en: {
      registered: "Registered", turnout: "Turnout", nominee: "Nominee", leader: "Leader", party: "Party",
      partyHead: (n) => `${ORD_EN[n - 1] || n + "th"} party`, majority: ["Majority party", "Minority party"],
      before: (t) => `${t} before election`, elected: (t) => `Elected ${t}`, incumbent: (t) => `Incumbent ${t}`, tbd: "TBD",
      results: "Results", choice: "Choice", votes: "Votes", resultsBy: "Results by county",
      electorate: "Registered voters", empty: "Add a candidate", untitled: "Election",
      rows: { alliance: "Alliance", leader_since: "Leader since", leaders_seat: "Leader's seat", home_state: "Home state", running_mate: "Running mate",
        last_election: "Last election", seats_before: "Seats before", seats_needed: "Seats needed", seats: "Seats won", seats_after: "Seats after",
        seat_change: "Seat change", electoral_vote: "Electoral vote", states_carried: "States carried", delegate_count: "Delegate count",
        popular_vote: "Popular vote", percentage: "Percentage", swing: "Swing" },
      nlParty: "Party", nlLeader: "Leader", nlSeats: "Current seats"
    }
  };
  const W = () => WP_TXT[state.outputLang === "en" ? "en" : "ko"];
  function wpHeads() {
    const t = plain(state.title), w = W();
    if (state.ongoing) return [w.incumbent(t), ""];
    return [w.before(t), w.elected(t)];
  }
  const WP_ROWS = [
    ["alliance", "연합"], ["leader_since", "대표 취임"], ["leaders_seat", "대표 지역구"],
    ["home_state", "출신 주"], ["running_mate", "러닝메이트"],
    ["last_election", "이전 선거"], ["seats_before", "선거 전 의석"], ["seats_needed", "과반 필요 의석"],
    ["seats", "획득 의석"], ["seats_after", "선거 후 의석"], ["seat_change", "의석 변화"],
    ["electoral_vote", "선거인단"], ["states_carried", "승리 주"], ["delegate_count", "대의원"],
    ["popular_vote", "득표수"], ["percentage", "득표율"], ["swing", "변동"]
  ];
  const FIELD_PARAM = {
    votes: "popular_vote", popularVote: "popular_vote", percentage: "percentage",
    seatsWon: "seats", seats: "seats", seatChange: "seat_change", lastElection: "last_election",
    alliance: "alliance", swing: "swing", seatsBefore: "seats_before", seatsAfter: "seats_after",
    seatsNeeded: "seats_needed", runningMate: "running_mate", homeState: "home_state",
    electoralVote: "electoral_vote", statesCarried: "states_carried", delegateCount: "delegate_count",
    leaderSince: "leader_since", leadersSeat: "leaders_seat"
  };
  // 입력 항목을 틀 매개변수(이름 있는 행)와 1blank~6blank 보조 행으로 나눔
  function wpFieldPlan() {
    const named = {}, blanks = [];
    textFields().forEach((f) => {
      const p = FIELD_PARAM[f.id];
      if (p && !named[p]) named[p] = f; else blanks.push(f);
    });
    return { named, blanks: blanks.slice(0, 6), dropped: blanks.slice(6) };
  }
  const wpType = () => (state.electionType === "presidential" ? "presidential" : "parliamentary");
  const wpHr = () => `<tr><td colspan="2" class="wp-hrcell"><hr></td></tr>`;

  // {{succession links}}: 왼쪽 20% / 가운데 60% / 오른쪽 20%
  function wpSuccession(prev, center, next) {
    if (!prev && !center && !next) return "";
    return `<tr><td colspan="2" class="infobox-subheader"><table class="wp-succ"><tr>
      <td style="width:20%" class="l">${prev ? `← <a>${fmt(prev)}</a>` : ""}</td>
      <td style="width:60%" class="c">${center ? `<b>${fmt(center)}</b>` : ""}</td>
      <td style="width:20%" class="r">${next ? `<a>${fmt(next)}</a> →` : ""}</td></tr></table></td></tr>`;
  }
  const wpFlag = () => state.flagImage
    ? `<tr><td colspan="2" class="infobox-subheader"><img class="wp-flag50" src="${escAttr(state.flagImage)}" alt="" crossorigin="anonymous" onerror="window.__hideFail(this)"><hr></td></tr>`
    : "";
  const wpLabel = (label, data) => `<tr><th scope="row" class="infobox-label">${label}</th><td class="infobox-data">${data}</td></tr>`;
  function wpExtraStats() {
    return (state.customStats || []).filter((x) => x.label && x.label.trim()).map((x) => wpLabel(fmt(x.label), fmt(x.value))).join("");
  }
  function wpMapBlock(defaultCaption) {
    const s = state;
    if (!s.mapImage) return "";
    const cap = s.mapCaption ? fmt(s.mapCaption) : (defaultCaption || "");
    return wpHr() + `<tr><td colspan="2" class="infobox-full-data">
      <img class="wp-map300" src="${escAttr(s.mapImage)}" alt="" crossorigin="anonymous" onerror="window.__mapFail(this)">
      ${cap ? `<div>${cap}</div>` : ""}</td></tr>`;
  }

  // data10: Module:Infobox election row — 한 줄 최대 3칸, 줄 사이 <hr />
  function wpCandidateRows() {
    const s = state, k = Math.min(3, perRow()), img = imageField();
    const { named, blanks } = wpFieldPlan();
    const parl = wpType() === "parliamentary";
    const nameLabel = s.electionType === "presidential" ? W().nominee : W().leader;
    let ordinal = 0, html = "";
    chunks().forEach((row, ri) => {
      const cols = row.length;
      const w = (100 / cols).toFixed(3);
      const cellsFor = (fn) => row.map((c, i) => `<td style="width:${w}%">${fn(c, i)}</td>`).join("");
      const rowsOut = [];
      if (parl) rowsOut.push(`<tr class="wp-head">${row.map(() => `<th style="width:${w}%">${W().partyHead(++ordinal)}</th>`).join("")}</tr>`);
      if (img) rowsOut.push(`<tr class="wp-imgrow">${cellsFor((c) => `<div class="wp-portrait">${portrait(c.fieldValues && c.fieldValues[img.id], c.name)}</div>`)}</tr>`);
      rowsOut.push(`<tr class="wp-colorbar">${row.map((c) => `<td style="background:${hexOf(c.color)}"></td>`).join("")}</tr>`);
      const lines = [];
      lines.push([nameLabel, (c) => `<a>${fmt(c.name)}</a>`]);
      lines.push([W().party, (c) => `<a>${fmt(c.party)}</a>`]);
      WP_ROWS.forEach(([p]) => { if (named[p]) lines.push([W().rows[p], (c) => fmt(c.fieldValues && c.fieldValues[named[p].id])]); });
      blanks.forEach((f) => lines.push([fmt(f.label), (c) => fmt(c.fieldValues && c.fieldValues[f.id])]));
      lines.forEach(([lab, fn]) => {
        if (!row.some((c) => String(fn(c)).replace(/<[^>]*>/g, "").trim())) return; // 빈 행은 틀처럼 생략
        rowsOut.push(`<tr><th scope="row" class="wp-rowlabel">${lab}</th>${cellsFor(fn)}</tr>`);
      });
      html += `${ri > 0 ? "<hr>" : ""}<table class="wp-cands"><colgroup><col class="wp-labcol" style="width:${isEn() ? 31 : 25}%">${row.map(() => "<col>").join("")}</colgroup><tbody>${rowsOut.map((r) => r.replace(/^<tr class="(wp-head|wp-imgrow|wp-colorbar)">/, '<tr class="$1"><td></td>')).join("")}</tbody></table>`;
    });
    return `<tr><td colspan="2" class="infobox-full-data">${html || W().empty}</td></tr>`;
  }

  function wpBeforeAfter() {
    const s = state;
    if (!plain(s.title)) return ""; // {{#if:{{{title|}}}| … }}
    const [hb, ha] = wpHeads();
    const left = (s.beforeElection || s.beforeParty)
      ? `<b>${escHtml(hb)}</b><br>${fmt(s.beforeElection)}<br>${s.beforeParty ? `<a>${fmt(s.beforeParty)}</a>` : ""}` : "";
    let right = "";
    if (!s.ongoing) {
      right = `<b>${escHtml(ha)}</b><br>${fmt(s.afterElection) || (s.afterParty ? "" : W().tbd)}<br>${s.afterParty ? `<a>${fmt(s.afterParty)}</a>` : ""}`;
    }
    return wpHr() + `<tr><td colspan="2" class="infobox-full-data"><table class="wp-ba" role="presentation"><tr>
      <td style="width:50%;text-align:left">${left}</td><td style="width:50%;text-align:right">${right}</td></tr></table></td></tr>`;
  }

  function wpNextLeg() {
    const rows = state.candidates.map((c) => `<tr>
      <td class="sw" style="background:${hexOf(c.color)}"></td>
      <td><a>${fmt(c.party) || "—"}</a></td><td>${fmt(c.name) || "—"}</td>
      <td class="num">${fmt(c.fieldValues && c.fieldValues.seatsWon) || "0"}</td></tr>`).join("");
    return `<tr><td colspan="2" class="infobox-full-data"><table class="wp-table"><thead><tr><th colspan="2">${W().nlParty}</th><th>${W().nlLeader}</th><th>${W().nlSeats}</th></tr></thead><tbody>${rows}</tbody></table></td></tr>`;
  }

  function renderElection() {
    const s = state;
    let b = "";
    b += wpFlag();
    b += wpSuccession(s.beforeElectionYear, s.electionDate, s.afterElectionYear);
    // header1: <hr />{{{seats_for_election}}} / {{{votes_for_election}}}
    if (s.turnoutDetails) b += `<tr><th colspan="2" class="infobox-header"><hr>${fmt(s.turnoutDetails)}</th></tr>`;
    if (s.registeredVoters) b += wpLabel(W().registered, fmt(s.registeredVoters));
    if (s.turnoutText) b += wpLabel(W().turnout, fmt(s.turnoutText));
    b += wpExtraStats();
    b += s.electionType === "next_legislative" ? wpNextLeg() : wpCandidateRows();
    b += wpMapBlock();
    b += wpBeforeAfter();
    return b;
  }

  // Infobox referendum/results 자리: 찬반 표
  function wpRefResults() {
    const s = state;
    const { list, opts, winner } = choiceRows();
    const hasVotes = list.some((c) => String(c.votes || "").trim());
    const span = hasVotes ? 2 : 1;
    let t = `<table class="wp-results"><thead><tr><th>${W().choice}</th>${hasVotes ? `<th>${W().votes}</th>` : ""}<th>%</th></tr></thead><tbody>`;
    list.forEach((c) => {
      const tot = isTotalChoice(c.label);
      let mark = "";
      if (!tot && winner) mark = c === winner ? '<span class="mark yes">✓</span>' : '<span class="mark no">✗</span>';
      const cls = tot ? (/총|Total/i.test(c.label) ? "total" : "sub") : (c === winner ? "win" : "");
      t += `<tr class="${cls}"><td>${mark}${fmt(c.label)}</td>${hasVotes ? `<td class="num">${fmt(c.votes)}</td>` : ""}<td class="num">${fmt(c.percentage)}</td></tr>`;
    });
    if (s.turnoutText) t += `<tr class="sub"><td>${W().turnout}</td><td class="num" colspan="${span}">${fmt(s.turnoutText)}</td></tr>`;
    if (s.registeredVoters) t += `<tr class="sub"><td>${W().electorate}</td><td class="num" colspan="${span}">${fmt(s.registeredVoters)}</td></tr>`;
    return t + "</tbody></table>";
  }
  // {{bar box}} + {{bar percent}} — 기본 색 #47729E, #8B8B54, red, orange, teal
  const REF_BAR_DEFAULTS = ["#47729e", "#8b8b54", "red", "orange", "teal"];
  function wpRefBars(opts) {
    return `<div class="wp-barbox">${opts.slice(0, 5).map((c, i) => {
      const p = pctOf(c.percentage), col = c.color ? hexOf(c.color) : REF_BAR_DEFAULTS[i];
      return `<div class="wp-barrow"><div>${fmt(c.label)}</div><div class="wp-bar"><span style="width:${isNaN(p) ? 0 : Math.min(100, p)}%;background:${col}"></span></div><span class="wp-barpct">${isNaN(p) ? "" : p.toFixed(2) + "%"}</span></div>`;
    }).join("")}</div>`;
  }

  function renderReferendum() {
    const s = state;
    const { list, opts } = choiceRows();
    let b = "";
    b += wpFlag();
    b += wpSuccession(s.beforeElectionYear, s.electionDate, s.afterElectionYear);
    // subheader3: {{box|title/question}} 테두리 2px #A2A9B1, 배경 #f8f9fa
    if (s.referendumQuestion) b += `<tr><td colspan="2" class="infobox-subheader"><div class="wp-qbox">${fmt(s.referendumQuestion)}</div></td></tr>`;
    b += wpExtraStats(); // voting_system / outcome 자리
    if (list.length) {
      b += `<tr><th colspan="2" class="infobox-header wp-refhead">${W().results}</th></tr>`;
      b += opts.length > 2
        ? `<tr><td colspan="2" class="infobox-full-data">${wpRefBars(opts)}</td></tr>`
        : `<tr><td colspan="2" class="infobox-full-data">${wpRefResults()}</td></tr>`;
    }
    // map: 캡션이 없으면 "Results by {mapdivision|county}"
    b += wpMapBlock(W().resultsBy);
    if (s.turnoutDetails) b += `<tr><td colspan="2" class="infobox-below wp-refbelow">${fmt(s.turnoutDetails)}</td></tr>`;
    return b;
  }

  /* =========================================================
     Template:Infobox legislative election — 정당 표 형식
     ========================================================= */
  const LEG_TXT = {
    ko: {
      party: "정당", leader: "대표", pct: "득표율", seats: "의석", change: "+/–", current: "현재 의석", before: "선거 전 의석",
      turnout: "투표율", disclaimer: "의석을 얻은 정당만 표시합니다. 전체 결과는 아래를 참고하세요.",
      bHead: (t) => `선거 전 ${t}`, aHead: (t) => `선거 후 ${t}`, incumbent: (t) => `현직 ${t}`
    },
    en: {
      party: "Party", leader: "Leader", pct: "Vote %", seats: "Seats", change: "+/–", current: "Current seats", before: "Seats before",
      turnout: "Turnout", disclaimer: "This lists parties that won seats. See the complete results below.",
      bHead: (t) => `${t} before`, aHead: (t) => `${t} after`, incumbent: (t) => `Incumbent ${t}`
    }
  };
  const LT = () => LEG_TXT[isEn() ? "en" : "ko"];
  const legField = (re, ids) => textFields().find((f) => ids.includes(f.id)) || textFields().find((f) => re.test(f.label));
  function legFields() {
    return {
      pct: legField(/득표율|Vote %|Percentage/i, ["percentage"]),
      seats: legField(/^의석$|Seats( won)?$|획득/i, ["seatsWon", "seats"]),
      last: legField(/이전 선거|Last election/i, ["lastElection"]),
      current: legField(/현재 의석|Current seats/i, ["currentSeats"]),
      heading: textFields().find((f) => f.id === "heading")
    };
  }
  function legColumns() {
    const s = state, o = [];
    o.push("party");
    if (!s.legisNoLeader) o.push("leader");
    if (s.ongoing) { if (!s.legisFirst) o.push("current"); }
    else {
      if (!s.legisNoPct) o.push("pct");
      o.push("seats");
      if (!s.legisFirst) o.push("change");
    }
    return o;
  }
  const num = (v) => { const d = digits(v); return d === "" ? NaN : parseInt(d, 10); };
  function legChange(c, F) {
    const a = num(F.seats && c.fieldValues[F.seats.id]), b = num(F.last && c.fieldValues[F.last.id]);
    if (isNaN(a) || isNaN(b)) return "";
    const d = a - b;
    return d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0";
  }
  function legCellValue(col, c, F) {
    const fv = c.fieldValues || {};
    if (col === "leader") return c.name;
    if (col === "pct") return F.pct ? fv[F.pct.id] : "";
    if (col === "seats") return F.seats ? fv[F.seats.id] : "";
    if (col === "current") return F.current ? fv[F.current.id] : (F.seats ? fv[F.seats.id] : "");
    if (col === "change") return legChange(c, F);
    return "";
  }
  const legHead = (col) => {
    const t = LT();
    if (col === "current") return state.ongoing === "counting" ? t.before : t.current;
    return t[col];
  };

  function wpLegTable() {
    const s = state, F = legFields(), cols = legColumns();
    const numCols = cols.filter((x) => x !== "party");
    let h = `<table class="wikitable ib-legis-elect-results"><thead><tr><th colspan="2">${LT().party}</th>${numCols.map((c) => `<th>${legHead(c)}</th>`).join("")}</tr></thead><tbody>`;
    s.candidates.forEach((c) => {
      const heading = F.heading && c.fieldValues[F.heading.id];
      if (heading) h += `<tr><th colspan="${cols.length + 1}" class="leg-heading">${fmt(heading)}</th></tr>`;
      h += `<tr><td class="leg-sw" style="background:${hexOf(c.color)}"></td><th scope="row" class="leg-party"><a>${fmt(c.party)}</a></th>${numCols.map((col) => {
        const v = legCellValue(col, c, F);
        return `<td class="${col === "leader" ? "leg-leader" : "leg-num"}">${col === "leader" ? `<a>${fmt(v)}</a>` : fmt(v)}</td>`;
      }).join("")}</tr>`;
    });
    h += "</tbody></table>";
    if (!s.ongoing) h += `<div class="ib-legis-elect-disclaimer">${LT().disclaimer}</div>`;
    return h;
  }

  function renderLegislative() {
    const s = state, t = LT();
    let b = "";
    b += wpFlag();
    // previous_election / next_election 이 있으면 succession links, 없으면 날짜만
    if (s.beforeElectionYear || s.afterElectionYear) b += wpSuccession(s.beforeElectionYear, s.electionDate, s.afterElectionYear);
    else if (s.electionDate) b += `<tr><td colspan="2" class="infobox-subheader"><b>${fmt(s.electionDate)}</b></td></tr>`;
    if (s.turnoutDetails) b += `<tr><td colspan="2" class="infobox-full-data"><hr>${fmt(s.turnoutDetails)}</td></tr>`;
    if (s.turnoutText) b += wpLabel(t.turnout, fmt(s.turnoutText));
    b += wpExtraStats();
    if (s.candidates.length) b += `<tr><td colspan="2" class="infobox-full-data">${wpLegTable()}</td></tr>`;
    if (s.mapImage) {
      b += `<tr><td colspan="2" class="infobox-full-data"><table class="ib-legis-elect-map"><tr><td class="infobox-image">
        <img class="wp-map300" src="${escAttr(s.mapImage)}" alt="" crossorigin="anonymous" onerror="window.__mapFail(this)">
        ${s.mapCaption ? `<div class="infobox-caption">${fmt(s.mapCaption)}</div>` : ""}</td></tr></table></td></tr>`;
    }
    if (s.beforeElection || s.afterElection) {
      const ti = plain(s.title);
      const lh = s.beforeElection ? (s.ongoing ? t.incumbent(ti) : t.bHead(ti)) : "";
      const rh = !s.ongoing && s.afterElection ? t.aHead(ti) : "";
      const party = (p) => (p ? `<br><a>${fmt(p)}</a>` : "");
      b += `<tr><td colspan="2" class="infobox-full-data"><table class="ib-legis-elect-befaft"><tr><th scope="col">${escHtml(lh)}</th><th scope="col" class="r">${escHtml(rh)}</th></tr>
        <tr><td class="half">${fmt(s.beforeElection)}${s.beforeElection ? party(s.beforeParty) : ""}</td>
        <td class="half r">${s.ongoing ? "" : (s.afterElection ? fmt(s.afterElection) + party(s.afterParty) : "")}</td></tr></table></td></tr>`;
    }
    return b;
  }

  function wikiLegislative(lang) {
    const s = state, P = [];
    const add = (k, v) => P.push([k, v]);
    const F = legFields();
    const link = (y) => `[[${sisterTitle(plain(y))}|${plain(y)}]]`;
    add("election_name", toWiki(s.electionName));
    add("country", s.country || "");
    if (s.flagImage) add("flag_image", fileNameOf(s.flagImage, "Flag.svg"));
    if (s.beforeElectionYear) add("previous_election", link(s.beforeElectionYear));
    add("election_date", toWiki(s.electionDate));
    if (s.afterElectionYear) add("next_election", link(s.afterElectionYear));
    if (s.turnoutDetails) add("seats_for_election", toWiki(s.turnoutDetails));
    if (s.turnoutText) add("turnout", toWiki(s.turnoutText));
    if (s.ongoing) add("ongoing", "yes");
    if (s.legisNoLeader) add("noleader", "yes");
    if (s.legisNoPct) add("nopercentage", "yes");
    if (s.legisFirst) add("first_election", "yes");
    if (lang === "ko") add("party_title", "정당");
    s.candidates.slice(0, 70).forEach((c, i) => {
      const n = i + 1, fv = c.fieldValues || {};
      P.push([null, ""]);
      if (F.heading && fv[F.heading.id]) add(`heading${n}`, toWiki(fv[F.heading.id]));
      add(`party${n}`, toWiki(c.party));
      add(`colour${n}`, hexOf(c.color));
      if (!s.legisNoLeader) add(`leader${n}`, toWiki(c.name));
      if (s.ongoing) add(`current_seats${n}`, toWiki(legCellValue("current", c, F)));
      else {
        if (!s.legisNoPct) add(`percentage${n}`, toWiki(F.pct ? fv[F.pct.id] : ""));
        add(`seats${n}`, toWiki(F.seats ? fv[F.seats.id] : ""));
        if (!s.legisFirst) add(`last_election${n}`, toWiki(F.last ? fv[F.last.id] : ""));
      }
    });
    P.push([null, ""]);
    if (s.mapImage) { add("map_image", fileNameOf(s.mapImage, "Election_map.png")); add("map_caption", toWiki(s.mapCaption)); }
    add("title", toWiki(s.title));
    add("before_election", toWiki(s.beforeElection));
    add("before_party", toWiki(s.beforeParty));
    add("after_election", toWiki(s.afterElection));
    add("after_party", toWiki(s.afterParty));
    return `{{Infobox legislative election\n${paramBlock(P)}\n}}`;
  }

  // 나무위키: 같은 정당 표를 나무마크 표로
  function namuLegRows(lab, rows, N) {
    const F = legFields(), cols = legColumns();
    rows.push(cols.map((c) => lab(c === "party" ? "정당" : { leader: "대표", pct: "득표율", seats: "의석", change: "+/–", current: state.ongoing === "counting" ? "선거 전 의석" : "현재 의석" }[c])));
    state.candidates.forEach((c) => {
      const heading = F.heading && c.fieldValues[F.heading.id];
      if (heading) rows.push([T(heading, { span: cols.length, bg: "#f5f6f7", th: true })]);
      rows.push(cols.map((col) => {
        if (col === "party") {
          return cell(`<span class="nm-sw" style="background:${hexOf(c.color)}"></span>${hasMarkup(c.party) ? fmt(c.party) : `<a>${fmt(c.party)}</a>`}`,
            `{{{${hexOf(c.color)} ■}}} ${hasMarkup(c.party) ? toNamu(c.party) : `[[${plain(c.party)}]]`}`, { align: "l" });
        }
        const v = legCellValue(col, c, F);
        if (col === "leader") return L(v);
        if (col === "seats" || col === "current") return cell(`<b>${fmt(v)}</b>`, boldM(toNamu(v)), { align: "r" });
        return T(v, { align: "r" });
      }));
    });
    if (!state.ongoing) rows.push([T("의석을 얻은 정당만 표시합니다.", { span: cols.length, align: "l" })]);
  }

  function renderWikipedia() {
    const s = state, ref = s.electionType === "referendum", leg = s.electionType === "legislative_election";
    const body = ref ? renderReferendum() : leg ? renderLegislative() : renderElection();
    return `<table class="infobox wp-ib ${ref ? "ib-referendum" : leg ? "ib-legis-elect" : "ib-election"}" style="width:${s.previewWidth}px">
      <caption class="infobox-title">${fmt(s.electionName) || W().untitled}</caption><tbody>${body}</tbody></table>`;
  }

  /* =========================================================
     나무위키 — 셀 모델 하나로 HTML 미리보기와 나무마크를 함께 만듦
     ========================================================= */
  const cell = (html, mark, o) => Object.assign({ html, mark, span: 1, bg: "", fg: "", align: "c", th: false }, o || {});
  const T = (raw, o) => cell(fmt(raw), toNamu(raw), o);
  const L = (raw, o) => hasMarkup(raw) || !plain(raw)
    ? T(raw, o)
    : cell(`<a>${fmt(raw)}</a>`, `[[${plain(raw)}]]`, o);
  const BLANK = (o) => cell("", "", o);
  const boldM = (m) => (!m || /^'''[\s\S]*'''$/.test(m) ? m : "'''" + m + "'''");

  function namuTheme() {
    if (state.namuThemeColor) return hexOf(state.namuThemeColor);
    if (state.electionType === "referendum") return "#34495e";
    const c = state.candidates[0];
    return c ? hexOf(c.color) : "#00a495";
  }
  function barCell(segs, span) {
    const html = `<div class="nm-bar">${segs.map((g) => `<span style="width:${g.pct}%;background:${g.color};color:${textOn(g.color)}" title="${escAttr(g.label)} ${g.pct}%">${g.pct >= 9 ? g.pct.toFixed(1) + "%" : ""}</span>`).join("")}</div>`;
    const mark = '{{{#!wiki style="display:flex; height:22px; border-radius:4px; overflow:hidden; font-size:.78em; font-weight:bold; line-height:22px; text-align:center"\n'
      + segs.map((g) => `{{{#!wiki style="width:${g.pct}%; background:${g.color}; color:${textOn(g.color)}"\n${g.pct >= 9 ? g.pct.toFixed(1) + "%" : ""}}}}`).join("")
      + "\n}}}";
    return cell(html, mark, { span, align: "c" });
  }
  function shareSegs(items) {
    const segs = items.filter((g) => !isNaN(g.pct) && g.pct > 0).map((g) => ({ ...g, pct: Math.round(g.pct * 100) / 100 }));
    if (segs.length < 2) return null;
    const sum = segs.reduce((a, g) => a + g.pct, 0);
    if (sum < 99.5 && sum < 100) segs.push({ label: "기타", pct: Math.round((100 - sum) * 100) / 100, color: "#b8bec4" });
    return segs;
  }

  function namuRows() {
    const s = state, th = namuTheme(), on = textOn(th);
    const lab = (txt, o) => T(txt, Object.assign({ th: true, bg: th, fg: on }, o));
    const rows = [];
    const ref = s.electionType === "referendum";
    const nextLeg = s.electionType === "next_legislative";
    const { list, opts, winner } = choiceRows();
    const hasVotes = ref && list.some((c) => String(c.votes || "").trim());
    const k = perRow();
    const legElect = s.electionType === "legislative_election";
    const N = ref ? (hasVotes ? 3 : 2) : nextLeg ? 3 : legElect ? legColumns().length : 1 + k;
    const rest = N - 1;

    // 머리
    const titleHtml = `<div class="nm-title">${fmt(s.electionName) || "선거 명칭"}</div>${s.electionDate ? `<div class="nm-sub">${fmt(s.electionDate)}</div>` : ""}`;
    const titleMark = `'''{{{+1 ${toNamu(s.electionName) || "선거 명칭"}}}}'''${s.electionDate ? `[br]{{{-1 ${toNamu(s.electionDate)}}}}` : ""}`;
    rows.push([cell(titleHtml, titleMark, { span: N, bg: th, fg: on, cls: "on-color" })]);
    if (s.flagImage) {
      rows.push([cell(`<div class="nm-flag"><img src="${escAttr(s.flagImage)}" alt="" crossorigin="anonymous" onerror="window.__hideFail(this)"></div>`,
        `[[파일:${fileNameOf(s.flagImage, "국기.svg")}|height=40]]`, { span: N })]);
    }
    if (s.beforeElectionYear || s.afterElectionYear) {
      const pv = s.beforeElectionYear, nx = s.afterElectionYear;
      rows.push([cell(
        `<div class="nm-nav"><span>${pv ? `← <a>${fmt(pv)}</a>` : ""}</span><span>${nx ? `<a>${fmt(nx)}</a> →` : ""}</span></div>`,
        `${pv ? `← [[${sisterTitle(plain(pv))}|${plain(pv)}]]` : ""}${pv && nx ? " 　|　 " : ""}${nx ? `[[${sisterTitle(plain(nx))}|${plain(nx)}]] →` : ""}`,
        { span: N })]);
    }
    if (ref && s.referendumQuestion) rows.push([lab("질문"), T(s.referendumQuestion, { span: rest, align: "l" })]);
    if (s.turnoutDetails) rows.push([lab(ref ? "주제" : "개요"), T(s.turnoutDetails, { span: rest })]);

    const stats = [];
    if (s.registeredVoters) stats.push(["선거인수", s.registeredVoters]);
    if (s.turnoutText) stats.push(["투표율", s.turnoutText]);
    (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) stats.push([x.label, x.value]); });
    if (!ref) stats.forEach(([a, b]) => rows.push([lab(a), T(b, { span: rest })]));

    if (ref) {
      rows.push([lab("선택지"), ...(hasVotes ? [lab("득표수")] : []), lab("득표율")]);
      list.forEach((c, i) => {
        const tot = isTotalChoice(c.label);
        const col = hexOf(c.color || CHOICE_COLORS[opts.indexOf(c)] || "#888");
        const win = c === winner && opts.length >= 2;
        const bg = tot ? "#f5f6f7" : "";
        const sw = tot ? "" : `<span class="nm-sw" style="background:${col}"></span>`;
        const swM = tot ? "" : `{{{${col} ■}}} `;
        const lbl = (win ? "✔ " : "") + (c.label || "—");
        const b = tot || win;
        const wrapH = (h) => (b ? `<b>${h}</b>` : h), wrapM = (m) => (b ? boldM(m) : m);
        rows.push([
          cell(sw + wrapH(fmt(lbl)), swM + wrapM(toNamu(lbl)), { align: "l", bg }),
          ...(hasVotes ? [cell(wrapH(fmt(c.votes)), wrapM(toNamu(c.votes)), { align: "r", bg })] : []),
          cell(wrapH(fmt(c.percentage)), wrapM(toNamu(c.percentage)), { align: "r", bg })
        ]);
      });
      const segs = shareSegs(opts.map((c, i) => ({ label: plain(c.label), pct: pctOf(c.percentage), color: hexOf(c.color || CHOICE_COLORS[i]) })));
      if (segs) rows.push([barCell(segs, N)]);
      stats.forEach(([a, b]) => rows.push([lab(a), T(b, { span: rest })]));
    } else if (legElect) {
      namuLegRows(lab, rows, N);
    } else if (nextLeg) {
      rows.push([lab("정당"), lab("대표"), lab("현재 의석")]);
      s.candidates.forEach((c) => rows.push([
        cell(`<span class="nm-sw" style="background:${hexOf(c.color)}"></span>${hasMarkup(c.party) ? fmt(c.party) : `<a>${fmt(c.party)}</a>`}`,
          `{{{${hexOf(c.color)} ■}}} ${hasMarkup(c.party) ? toNamu(c.party) : `[[${plain(c.party)}]]`}`, { align: "l" }),
        T(c.name), T(`'''${(c.fieldValues && c.fieldValues.seatsWon) || "0"}'''`, { align: "r" })
      ]));
    } else {
      const img = imageField(), tfs = textFields(), ballot = s.namuBallotNo;
      let no = 0;
      chunks().forEach((row) => {
        const pad = () => Array.from({ length: k - row.length }, () => BLANK());
        // 기호·정당 머리
        rows.push([lab(ballot ? "기호" : "정당"), ...row.map((c) => {
          const n = ++no, bg = hexOf(c.color), fg = textOn(bg);
          const party = hasMarkup(c.party) ? fmt(c.party) : `<a>${fmt(c.party)}</a>`;
          const partyM = hasMarkup(c.party) ? toNamu(c.party) : (plain(c.party) ? `[[${plain(c.party)}|{{{${fg} ${plain(c.party)}}}}]]` : "");
          return cell(
            `${ballot ? `<div class="nm-no">기호 ${n}</div>` : ""}<b>${party || "—"}</b>`,
            `${ballot ? `{{{-1 기호 ${n}}}}[br]` : ""}'''${partyM || "—"}'''`,
            { bg, fg, cls: "on-color" });
        }), ...pad()]);
        if (img) {
          rows.push([lab(""), ...row.map((c, i) => {
            const src = c.fieldValues && c.fieldValues[img.id];
            return cell(`<div class="nm-portrait">${portrait(src, c.name)}</div>`,
              src ? `[[파일:${fileNameOf(src, `후보${no - row.length + i + 1}.jpg`)}|width=100%]]` : "", {});
          }), ...pad()]);
        }
        rows.push([lab(leaderLabel()), ...row.map((c) => L(c.name, { cls: "nm-name" })), ...pad()]);
        tfs.forEach((f) => {
          rows.push([lab(f.label), ...row.map((c) => {
            const v = (c.fieldValues && c.fieldValues[f.id]) || "";
            if (!v) return T("—");
            return isBoldField(f) ? cell(`<b>${fmt(v)}</b>`, boldM(toNamu(v))) : T(v);
          }), ...pad()]);
        });
      });
      const pf = percentField();
      if (pf && state.candidates.length >= 2) {
        const segs = shareSegs(state.candidates.map((c) => ({ label: plain(c.name), pct: pctOf(c.fieldValues && c.fieldValues[pf.id]), color: hexOf(c.color) })));
        if (segs) rows.push([barCell(segs, N)]);
      }
    }

    if (s.mapImage) {
      rows.push([cell(
        `<div class="nm-map"><img src="${escAttr(s.mapImage)}" alt="선거 결과 지도" crossorigin="anonymous" onerror="window.__mapFail(this)"></div>${s.mapCaption ? `<div class="nm-cap">${fmt(s.mapCaption)}</div>` : ""}`,
        `[[파일:${fileNameOf(s.mapImage, "선거 결과 지도.png")}|width=100%]]${s.mapCaption ? `[br]{{{-1 ${toNamu(s.mapCaption)}}}}` : ""}`,
        { span: N })]);
    }
    if (hasBA()) {
      const [hb, ha] = baHeads();
      const whoH = (n, p) => `<b>${hasMarkup(n) ? fmt(n) : `<a>${fmt(n) || "—"}</a>`}</b>${p ? `<br><span style="font-size:.88em">${hasMarkup(p) ? fmt(p) : `<a>${fmt(p)}</a>`}</span>` : ""}`;
      const whoM = (n, p) => boldM(hasMarkup(n) ? toNamu(n) : (plain(n) ? `[[${plain(n)}]]` : "—")) + (p ? `[br]{{{-1 ${hasMarkup(p) ? toNamu(p) : `[[${plain(p)}]]`}}}}` : "");
      if (isIncumbent()) {
        rows.push([cell(`<div class="nm-ba-h">${escHtml(incumbentHead())}</div>${whoH(s.beforeElection, s.beforeParty)}`,
          `{{{-1 ${boldM(incumbentHead())}}}}[br]${whoM(s.beforeElection, s.beforeParty)}`, { span: N })]);
        return { rows, N, theme: th };
      }
      const html = `<div class="nm-ba"><div><div class="nm-ba-h">${escHtml(hb)}</div>${whoH(s.beforeElection, s.beforeParty)}</div><div class="arr">→</div><div class="r"><div class="nm-ba-h">${escHtml(ha)}</div>${whoH(s.afterElection, s.afterParty)}</div></div>`;
      const mark = '{{{#!wiki style="display:flex; justify-content:space-between; align-items:center; gap:8px"\n'
        + `{{{#!wiki style="text-align:left"\n{{{-1 ${boldM(hb)}}}}[br]${whoM(s.beforeElection, s.beforeParty)}}}}`
        + '{{{#!wiki style="color:#888"\n→}}}'
        + `{{{#!wiki style="text-align:right"\n{{{-1 ${boldM(ha)}}}}[br]${whoM(s.afterElection, s.afterParty)}}}}`
        + "\n}}}";
      rows.push([cell(html, mark, { span: N })]);
    }
    return { rows, N, theme: th };
  }

  function renderNamu() {
    const { rows, theme } = namuRows();
    const body = rows.map((r) => `<tr>${r.map((c) => {
      const tag = c.th ? "th" : "td";
      const st = [c.bg && `background:${c.bg}`, c.fg && `color:${c.fg}`, `text-align:${c.align === "l" ? "left" : c.align === "r" ? "right" : "center"}`].filter(Boolean).join(";");
      return `<${tag}${c.span > 1 ? ` colspan="${c.span}"` : ""} class="${c.cls || ""}" style="${st}">${c.html}</${tag}>`;
    }).join("")}</tr>`).join("");
    const { N } = namuRows();
    const labW = state.electionType === "referendum" ? (N === 3 ? 38 : 50) : N === 2 ? 30 : N === 3 ? 26 : 22;
    const cols = `<colgroup><col style="width:${labW}%">${Array.from({ length: N - 1 }, () => `<col style="width:${(100 - labW) / (N - 1)}%">`).join("")}</colgroup>`;
    return `<div class="nm-ib"><table class="nm-tb" style="width:${state.previewWidth}px;--nm-theme:${theme}">${cols}<tbody>${body}</tbody></table></div>`;
  }

  function namuMark() {
    const { rows, theme } = namuRows();
    const out = rows.map((r, ri) => "||" + r.map((c, ci) => {
      let a = "";
      if (ri === 0 && ci === 0) a += `<tablewidth=${state.previewWidth}><tablealign=right><tablebordercolor=${theme}><tablebgcolor=#ffffff,#1f2023><tablecolor=#373a3c,#dddddd>`;
      if (c.span > 1) a += `<-${c.span}>`;
      if (c.bg) a += `<bgcolor=${c.bg}>`;
      if (c.fg) a += `<color=${c.fg}>`;
      a += c.align === "l" ? "<(>" : c.align === "r" ? "<)>" : "<:>";
      let m = c.mark || "";
      if (c.th) m = boldM(m);
      return `${a} ${m} `;
    }).join("||") + "||");
    return out.join("\n");
  }

  /* =========================================================
     위키텍스트 — Template:Infobox election / Template:Infobox referendum 매개변수
     ========================================================= */
  function paramBlock(pairs) {
    const w = Math.min(22, Math.max(...pairs.map(([k]) => (k ? k.length : 0)), 0));
    return pairs.map(([k, v]) => (k === null ? v : `| ${k.padEnd(w)} = ${v == null ? "" : v}`)).join("\n");
  }
  // 틀의 row 1 = 1~3번, row 2 = 4~6번, row 3 = 7~9번. 한 줄에 2명이면 1·2 / 4·5 / 7·8
  function templateSlots() {
    const k = Math.min(3, perRow());
    return state.candidates.map((c, i) => Math.floor(i / k) * 3 + (i % k) + 1);
  }

  function wikiElection(lang) {
    const s = state, P = [];
    const add = (k, v) => P.push([k, v]);
    const com = (t) => P.push([null, `<!-- ${t} -->`]);
    const type = wpType();
    add("election_name", toWiki(s.electionName));
    add("country", s.country || "");
    if (s.flagImage) add("flag_image", fileNameOf(s.flagImage, "Flag.svg"));
    add("type", type);
    add("ongoing", s.ongoing ? "yes" : "no");
    if (s.beforeElectionYear) { add("previous_election", sisterTitle(plain(s.beforeElectionYear))); add("previous_year", plain(s.beforeElectionYear)); }
    add("election_date", toWiki(s.electionDate));
    if (s.afterElectionYear) { add("next_election", sisterTitle(plain(s.afterElectionYear))); add("next_year", plain(s.afterElectionYear)); }
    if (s.turnoutDetails) add(type === "presidential" ? "votes_for_election" : "seats_for_election", toWiki(s.turnoutDetails));
    if (s.registeredVoters) add("registered", toWiki(s.registeredVoters));
    if (s.turnoutText) add("turnout", toWiki(s.turnoutText));
    (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) com(`${plain(x.label)}: ${plain(x.value)} — 틀에 해당 매개변수가 없어 주석으로 남김`); });

    const img = imageField();
    const { named, blanks, dropped } = wpFieldPlan();
    if (blanks.length) {
      P.push([null, ""]);
      blanks.forEach((f, i) => add(`${i + 1}blank`, toWiki(f.label)));
      if (dropped.length) com(`보조 행은 6개까지라 생략: ${dropped.map((f) => plain(f.label)).join(", ")}`);
    }
    const slots = templateSlots();
    const nameParam = s.electionType === "presidential" ? "nominee" : "leader";
    s.candidates.forEach((c, i) => {
      const n = slots[i];
      if (n > 9) { if (n === slots.find((x) => x > 9)) com("틀은 9칸까지만 지원하므로 나머지는 생략"); return; }
      P.push([null, ""]);
      const fv = c.fieldValues || {};
      if (img) add(`image${n}`, fileNameOf(fv[img.id], `Candidate_${n}.png`));
      add(`colour${n}`, hexOf(c.color).replace("#", ""));
      add(`${nameParam}${n}`, toWiki(c.name));
      add(`party${n}`, toWiki(c.party));
      WP_ROWS.forEach(([p]) => { if (named[p]) add(`${p}${n}`, toWiki(fv[named[p].id] || "")); });
      blanks.forEach((f, bi) => add(`${bi + 1}data${n}`, toWiki(fv[f.id] || "")));
    });
    P.push([null, ""]);
    if (s.mapImage) {
      add("map_image", fileNameOf(s.mapImage, "Election_map.png"));
      add("map_size", "300px");
      add("map_caption", toWiki(s.mapCaption));
    }
    add("title", toWiki(s.title));
    add("before_election", toWiki(s.beforeElection));
    add("before_party", toWiki(s.beforeParty));
    add("after_election", toWiki(s.afterElection));
    add("after_party", toWiki(s.afterParty));
    return `{{${lang === "ko" ? "선거 정보" : "Infobox election"}\n${paramBlock(P)}\n}}`;
  }

  function wikiNextLeg(lang) {
    const ko = lang === "ko";
    let code = `{| class="wikitable" style="text-align:left"\n! colspan="2" | ${ko ? "정당" : "Party"} !! ${ko ? "대표" : "Leader"} !! ${ko ? "현재 의석" : "Current seats"}\n`;
    state.candidates.forEach((c) => {
      code += `|-\n| style="background:${hexOf(c.color)}; width:4px" | \n| [[${plain(c.party)}]] || ${toWiki(c.name)} || style="text-align:right" | ${toWiki((c.fieldValues && c.fieldValues.seatsWon) || "0")}\n`;
    });
    return code + "|}";
  }

  function wikiReferendum() {
    const s = state, P = [];
    const add = (k, v) => P.push([k, v]);
    const { list, opts } = choiceRows();
    const find = (re) => list.find((c) => re.test(c.label || ""));
    add("name", toWiki(s.electionName));
    add("country", s.country || "");
    if (s.flagImage) add("flag_image", fileNameOf(s.flagImage, "Flag.svg"));
    if (s.beforeElectionYear) { add("previous_referendum", sisterTitle(plain(s.beforeElectionYear))); add("previous_year", plain(s.beforeElectionYear)); }
    add("date", toWiki(s.electionDate));
    if (s.afterElectionYear) { add("next_referendum", sisterTitle(plain(s.afterElectionYear))); add("next_year", plain(s.afterElectionYear)); }
    add("title", toWiki(s.referendumQuestion));
    (s.customStats || []).forEach((x) => {
      if (!x.label || !x.label.trim()) return;
      if (/투표 ?방식|결정 ?방식|voting/i.test(x.label)) add("voting_system", toWiki(x.value));
      else if (/결과|outcome/i.test(x.label)) add("outcome", toWiki(x.value));
    });
    P.push([null, ""]);
    if (opts.length > 2) {
      // header8 "Results" + bar box: choiceN / choiceN_color / percentageN (최대 5개)
      opts.slice(0, 5).forEach((c, i) => {
        const n = i + 1, p = pctOf(c.percentage);
        add(`choice${n}`, toWiki(c.label));
        if (c.color) add(`choice${n}_color`, hexOf(c.color));
        add(`percentage${n}`, isNaN(p) ? "" : String(p));
      });
    } else {
      const yes = opts[0], no = opts[1];
      const invalid = find(/무효|기권|백지|Invalid|Blank/i);
      const total = find(/^(?!.*유효).*(총|Total)/i);
      if (yes && !/^(찬성|yes)$/i.test(plain(yes.label))) add("yes_text", toWiki(yes.label));
      add("yes", yes ? digits(yes.votes) : "");
      if (no && !/^(반대|no)$/i.test(plain(no.label))) add("no_text", toWiki(no.label));
      add("no", no ? digits(no.votes) : "");
      if (invalid) add("invalid", digits(invalid.votes));
      if (total) add("total", digits(total.votes));
      const tp = pctOf(s.turnoutText);
      if (!isNaN(tp)) add("turnoutpct", String(tp));
      add("electorate", digits(s.registeredVoters));
    }
    P.push([null, ""]);
    if (s.mapImage) {
      add("map", fileNameOf(s.mapImage, "Referendum_map.png"));
      add("map_size", "300px");
      if (s.mapCaption) add("map_caption", toWiki(s.mapCaption));
    }
    if (s.turnoutDetails) add("notes", toWiki(s.turnoutDetails));
    return `{{Infobox referendum\n${paramBlock(P)}\n}}`;
  }

  function codeFor(tab) {
    if (tab === "namu") return namuMark();
    const lang = tab === "wiki-en" ? "en" : "ko";
    if (state.electionType === "referendum") return wikiReferendum();
    if (state.electionType === "next_legislative") return wikiNextLeg(lang);
    if (state.electionType === "legislative_election") return wikiLegislative(lang);
    return wikiElection(lang);
  }
  const CODE_NOTE = {
    "wiki-ko": "한국어 위키백과 {{선거 정보}} 틀 양식입니다. 매개변수 이름은 영어판 Infobox election과 같습니다.",
    "wiki-en": "영어 위키백과 {{Infobox election}} 틀 양식입니다. 색은 # 없이 colourN에, 후보는 한 줄 3칸 슬롯 번호로 들어갑니다.",
    "namu": "나무위키 편집창에 그대로 붙여 넣으면 미리보기와 같은 표가 됩니다. 다크 모드 색도 함께 지정했습니다."
  };

  /* =========================================================
     화면 갱신
     ========================================================= */
  function renderPreview() {
    const cap = $("capture");
    const nm = state.infoboxStyle === "namu";
    cap.className = state.selectedFont && state.selectedFont !== "wikipedia" ? `ff-${state.selectedFont}` : "";
    cap.innerHTML = nm ? renderNamu() : renderWikipedia();
  }
  function renderCode() {
    const ref = state.electionType === "referendum";
    document.querySelectorAll("[data-code]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.code === state.codeTab));
    });
    $("code-out").value = codeFor(state.codeTab);
    $("code-note").textContent = ref && state.codeTab !== "namu"
      ? "{{Infobox referendum}} 틀 양식입니다. 숫자는 쉼표 없이 들어가며 비율과 투표율은 틀이 계산합니다."
      : CODE_NOTE[state.codeTab];
  }
  let rafId = 0;
  function refresh() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { renderPreview(); renderCode(); });
  }

  /* ---------- 편집기: 기본 ---------- */
  function syncMetaForm() {
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const v = state[el.dataset.bind] || "";
      el.value = el.dataset.image && String(v).startsWith("data:") ? "[올린 파일]" : v;
      if (el.classList.contains("grow")) autoGrow(el);
    });
    $("in-type").value = state.electionType;
    $("in-perrow").value = state.candidatesPerRow || "auto";
    $("in-ongoing").checked = !!state.ongoing;
    $("in-noleader").checked = !!state.legisNoLeader; $("in-nopct").checked = !!state.legisNoPct; $("in-first").checked = !!state.legisFirst;
  }
  function autoGrow(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }

  function applyTypeUI() {
    const ref = state.electionType === "referendum";
    $("cands-area").classList.toggle("hidden", ref);
    $("ref-area").classList.toggle("hidden", !ref);
    $("step2-label").textContent = ref ? "투표 결과" : "후보·정당";
    $("label-details").textContent = ref ? "투표 주제" : "개요 (선출 의석 등)";
    const nextLeg = state.electionType === "next_legislative";
    const legElect = state.electionType === "legislative_election";
    $("fields-fold").classList.toggle("hidden", nextLeg);
    $("in-perrow").classList.toggle("hidden", legElect || nextLeg);
    $("legis-opts").classList.toggle("hidden", !legElect);
    $("cand-name-label").textContent = legElect || state.electionType !== "presidential" ? "대표" : "이름";
  }

  function renderStats() {
    const box = $("stats-list");
    const list = state.customStats || [];
    box.innerHTML = list.length ? list.map((x) => `
      <div class="list-row">
        <input class="input" value="${escAttr(x.label)}" data-stat="${escAttr(x.id)}" data-key="label" placeholder="항목 이름" aria-label="항목 이름">
        <input class="input" value="${escAttr(x.value)}" data-stat="${escAttr(x.id)}" data-key="value" placeholder="값" aria-label="값">
        <button class="icon-btn" type="button" data-del-stat="${escAttr(x.id)}" aria-label="항목 삭제">${ICON_X}</button>
      </div>`).join("") : `<div class="empty">개표율, 조사 기관처럼 따로 보여줄 내용이 있으면 추가하세요</div>`;
  }

  /* ---------- 편집기: 후보 ---------- */
  const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const ICON_L = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg>';
  const ICON_R = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';
  const ICON_U = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10 8 5.5l4.5 4.5"/></svg>';
  const ICON_D = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6 8 10.5 12.5 6"/></svg>';

  const activeCand = () => state.candidates.find((c) => String(c.id) === String(state.editingCandidateId));
  const candLabel = (c) => plain(/next_legislative|legislative_election/.test(state.electionType) ? c.party : c.name) || "이름 없음";

  function renderChips() {
    const box = $("cand-chips");
    const n = state.candidates.length;
    box.innerHTML = state.candidates.map((c, i) => `
      <div class="chip${String(c.id) === String(state.editingCandidateId) ? " active" : ""}">
        <button class="chip-main" type="button" data-pick="${escAttr(c.id)}"><span class="dot" style="background:${hexOf(c.color)}"></span><span>${escHtml(candLabel(c))}</span></button>
        <button class="icon-btn" type="button" data-move="${escAttr(c.id)}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="앞으로">${ICON_L}</button>
        <button class="icon-btn" type="button" data-move="${escAttr(c.id)}" data-dir="1" ${i === n - 1 ? "disabled" : ""} aria-label="뒤로">${ICON_R}</button>
      </div>`).join("") + `<button class="chip-add" type="button" id="btn-add-cand">+ ${state.electionType === "presidential" ? "후보" : "정당"} 추가</button>`;
  }

  function renderCandCard() {
    const c = activeCand();
    $("cand-card").classList.toggle("hidden", !c);
    if (!c) return;
    $("cand-dot").style.background = hexOf(c.color);
    $("cand-heading").textContent = candLabel(c);
    $("cand-name").value = c.name || "";
    $("cand-party").value = c.party || "";
    $("cand-color").value = /^#[0-9a-f]{6}$/i.test(c.color || "") ? c.color : "#808080";
    $("cand-color-text").value = c.color || "";
    const fv = c.fieldValues || (c.fieldValues = {});
    const fs = fields();
    $("cand-values").innerHTML = fs.length ? fs.map((f) => {
      const v = String(fv[f.id] || "");
      if (f.type === "image") {
        return `<div class="field"><label for="fv-${escAttr(f.id)}">${escHtml(f.label)}</label>
          <div class="inline"><input id="fv-${escAttr(f.id)}" class="input" data-fv="${escAttr(f.id)}" data-image="1" value="${escAttr(v.startsWith("data:") ? "[올린 파일]" : v)}" placeholder="이미지 주소 또는 파일">
          <button class="btn" type="button" data-upload-fv="${escAttr(f.id)}">파일 선택</button></div></div>`;
      }
      return `<div class="field"><label for="fv-${escAttr(f.id)}">${escHtml(f.label)}</label>
        <textarea id="fv-${escAttr(f.id)}" class="textarea grow" rows="1" data-fv="${escAttr(f.id)}">${escHtml(v)}</textarea></div>`;
    }).join("") : `<div class="empty">표에 나올 항목이 없습니다. 아래 ‘표에 나올 항목 구성’에서 추가하세요</div>`;
    $("cand-values").querySelectorAll(".grow").forEach(autoGrow);
  }

  function renderFieldsCfg() {
    const fs = fields();
    $("fields-count").textContent = `${fs.length}개`;
    $("fields-list").innerHTML = fs.map((f, i) => `
      <div class="field-cfg">
        <input class="input" value="${escAttr(f.label)}" data-fcfg="${escAttr(f.id)}" aria-label="항목 이름">
        <select class="select" data-ftype="${escAttr(f.id)}" aria-label="항목 종류">
          <option value="text" ${f.type !== "image" ? "selected" : ""}>글</option>
          <option value="image" ${f.type === "image" ? "selected" : ""}>사진</option>
        </select>
        <button class="icon-btn" type="button" data-fmove="${escAttr(f.id)}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="위로">${ICON_U}</button>
        <button class="icon-btn" type="button" data-fmove="${escAttr(f.id)}" data-dir="1" ${i === fs.length - 1 ? "disabled" : ""} aria-label="아래로">${ICON_D}</button>
        <button class="icon-btn" type="button" data-fdel="${escAttr(f.id)}" aria-label="항목 삭제">${ICON_X}</button>
      </div>`).join("") || `<div class="empty">항목이 없습니다</div>`;
  }

  function renderChoices() {
    const list = state.referendumChoices || [];
    let ci = 0;
    $("choices-list").innerHTML = list.map((c) => {
      const tot = isTotalChoice(c.label);
      const col = hexOf(c.color || CHOICE_COLORS[ci] || "#888888");
      if (!tot) ci++;
      return `<div class="choice${tot ? " is-total" : ""}">
        <input type="color" value="${/^#[0-9a-f]{6}$/.test(col) ? col : "#888888"}" data-choice="${escAttr(c.id)}" data-key="color" aria-label="선택지 색" ${tot ? 'style="visibility:hidden"' : ""}>
        <input class="input" value="${escAttr(c.label)}" data-choice="${escAttr(c.id)}" data-key="label" placeholder="선택지 이름" aria-label="선택지 이름">
        <button class="icon-btn" type="button" data-del-choice="${escAttr(c.id)}" aria-label="행 삭제">${ICON_X}</button>
        <div class="nums">
          <input class="input" value="${escAttr(c.votes)}" data-choice="${escAttr(c.id)}" data-key="votes" placeholder="득표수" aria-label="득표수" inputmode="numeric">
          <input class="input" value="${escAttr(c.percentage)}" data-choice="${escAttr(c.id)}" data-key="percentage" placeholder="비율 (예: 49.42%)" aria-label="비율">
        </div>
        ${tot ? '<span class="tag">합계 행</span>' : ""}
      </div>`;
    }).join("") || `<div class="empty">찬성·반대처럼 선택지를 추가하세요</div>`;
  }

  function renderEditor() {
    syncMetaForm();
    applyTypeUI();
    renderStats();
    renderChips();
    renderCandCard();
    renderFieldsCfg();
    renderChoices();
  }

  /* ---------- 툴바 ---------- */
  function applyToolbar() {
    document.querySelectorAll("[data-style]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.style === state.infoboxStyle)));
    document.querySelectorAll(".namu-only").forEach((el) => el.classList.toggle("hidden", state.infoboxStyle !== "namu"));
    document.querySelectorAll(".wiki-only").forEach((el) => el.classList.toggle("hidden", state.infoboxStyle !== "wikipedia"));
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === (state.outputLang === "en" ? "en" : "ko"))));
    $("in-width").value = state.previewWidth;
    $("in-width-range").value = state.previewWidth;
    $("in-font").value = state.selectedFont || "wikipedia";
    $("in-ballot").checked = state.namuBallotNo !== false;
    const t = namuTheme();
    $("in-theme").value = /^#[0-9a-f]{6}$/.test(t) ? t : "#00a495";
    $("btn-theme-auto").classList.toggle("hidden", !state.namuThemeColor);
  }

  /* ---------- 상태 불러오기 ---------- */
  function normalize(d) {
    d = clone(d || {});
    if (!d.electionType) d.electionType = "presidential";
    if (d.electionType === "referendum") d.referendumChoices = d.referendumChoices || [];
    if (!d.candidateFieldsConfig || !d.candidateFieldsConfig.length) d.candidateFieldsConfig = defaultFields(DEFAULT_FIELDS[d.electionType] ? d.electionType : "presidential");
    d.candidateFieldsConfig.forEach((f) => {
      if (!f.type) f.type = f.id === "image" || /이미지|사진/.test(f.label || "") ? "image" : "text";
      if (!f.label) f.label = "새 항목";
    });
    (d.candidates || []).forEach((c) => {
      c.id = String(c.id);
      c.fieldValues = c.fieldValues || {};
      ["image", "votes", "percentage", "regionalSeatsLast", "municipalSeatsLast", "regionalSeatsWon", "municipalSeatsWon", "regionalSeatsChange", "municipalSeatsChange",
        "alliance", "lastElection", "seatsWon", "seatChange", "constituencyVote", "constituencyPercent", "regionalVote", "regionalPercent"]
        .forEach((k) => { if (c[k] !== undefined && c.fieldValues[k] === undefined) c.fieldValues[k] = c[k]; });
      if (c.legislativeValues) Object.assign(c.fieldValues, c.legislativeValues);
      if (!c.color) c.color = "#808080";
    });
    (d.referendumChoices || []).forEach((c) => {
      c.id = c.id || uid("rc_");
      // 예전 빌더는 라벨에 ✔️/❌ 를 직접 넣었음 — 이제는 결과에 따라 자동 표시
      c.label = String(c.label || "").replace(/^\s*(✔️|✔|❌|✖️|✖)\s*/, "");
      c.votes = c.votes == null ? "" : String(c.votes);
      c.percentage = c.percentage == null ? "" : String(c.percentage);
    });
    (d.customStats || []).forEach((x) => { x.id = x.id || uid("s_"); });
    return d;
  }
  function loadData(data, keepView) {
    const d = normalize(data);
    const view = { infoboxStyle: state.infoboxStyle, selectedFont: state.selectedFont, codeTab: state.codeTab, namuBallotNo: state.namuBallotNo, outputLang: state.outputLang };
    const keys = Object.keys(state);
    keys.forEach((k) => { if (d[k] !== undefined) state[k] = d[k]; });
    ["electionName", "country", "electionDate", "flagImage", "beforeElectionYear", "afterElectionYear", "turnoutDetails", "registeredVoters", "turnoutText", "mapImage", "mapCaption", "title", "beforeElection", "beforeParty", "afterElection", "afterParty", "referendumQuestion"]
      .forEach((k) => { if (d[k] === undefined) state[k] = ""; });
    state.customStats = d.customStats || [];
    state.candidates = d.candidates || [];
    state.referendumChoices = d.referendumChoices || [];
    state.candidatesPerRow = d.candidatesPerRow || "auto";
    state.previewWidth = clampWidth(d.previewWidth || 320);
    state.namuThemeColor = d.namuThemeColor || "";
    state.ongoing = d.ongoing === true || d.ongoing === "yes";
    state.legisNoLeader = !!d.legisNoLeader; state.legisNoPct = !!d.legisNoPct; state.legisFirst = !!d.legisFirst;
    state.editingCandidateId = state.candidates.length ? String(state.candidates[0].id) : "";
    if (keepView) {
      Object.assign(state, view);
      if (state.infoboxStyle === "namu" && state.previewWidth === 320) state.previewWidth = 400;
    }
    if (!["wiki-ko", "wiki-en", "namu"].includes(state.codeTab)) state.codeTab = state.infoboxStyle === "namu" ? "namu" : "wiki-ko";
    renderEditor();
    applyToolbar();
    refresh();
  }
  const clampWidth = (v) => { v = parseInt(v, 10); if (isNaN(v)) v = 320; return Math.max(260, Math.min(600, v)); };

  /* ---------- 예제: 언어별로 불러오고, 고치지 않았으면 언어 전환 때 바꿔 끼움 ---------- */
  let presetKey = "", presetDirty = false;
  function loadPreset(key) {
    const src = (isEn() ? window.PRESETS_EN : window.PRESETS) || {};
    const p = src[key] || (window.PRESETS || {})[key];
    if (!p) return null;
    loadData(p, true);
    presetKey = key; presetDirty = false;
    return p;
  }
  function setLang(lang) {
    state.outputLang = lang;
    if (state.codeTab !== "namu") state.codeTab = lang === "en" ? "wiki-en" : "wiki-ko";
    if (presetKey && !presetDirty) loadPreset(presetKey);
    applyToolbar(); refresh();
  }

  /* =========================================================
     이벤트
     ========================================================= */
  function goto(step) {
    ["meta", "cands", "outcome"].forEach((k) => {
      $(`sect-${k}`).classList.toggle("hidden", k !== step);
      $(`tab-${k}`).setAttribute("aria-selected", String(k === step));
    });
  }

  function bind() {
    // 탭
    document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => goto(b.dataset.step)));
    document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => { goto(b.dataset.goto); window.scrollTo({ top: 0, behavior: "smooth" }); }));

    // 입력 일괄 처리
    document.addEventListener("input", (e) => {
      const el = e.target;
      if (el.closest && el.closest(".editor")) presetDirty = true;
      if (el.classList && el.classList.contains("grow")) autoGrow(el);
      if (el.dataset.bind) { state[el.dataset.bind] = el.value; refresh(); return; }
      if (el.dataset.cand) {
        const c = activeCand(); if (!c) return;
        c[el.dataset.cand] = el.value;
        $("cand-heading").textContent = candLabel(c);
        renderChips(); refresh(); return;
      }
      if (el.dataset.fv) {
        const c = activeCand(); if (!c) return;
        c.fieldValues[el.dataset.fv] = el.value; refresh(); return;
      }
      if (el.dataset.stat) {
        const x = state.customStats.find((s) => s.id === el.dataset.stat);
        if (x) { x[el.dataset.key] = el.value; refresh(); } return;
      }
      if (el.dataset.choice) {
        const x = state.referendumChoices.find((s) => s.id === el.dataset.choice);
        if (!x) return;
        x[el.dataset.key] = el.value;
        if (el.dataset.key === "label") {
          // 합계 행 여부가 바뀌면 색 칸 표시를 갱신
          const wasTotal = el.closest(".choice").classList.contains("is-total");
          if (wasTotal !== isTotalChoice(el.value)) { renderChoices(); const again = document.querySelector(`[data-choice="${CSS.escape(x.id)}"][data-key="label"]`); if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); } }
        }
        refresh(); return;
      }
      if (el.dataset.fcfg) {
        const f = fields().find((x) => x.id === el.dataset.fcfg);
        if (f) { f.label = el.value; refresh(); clearTimeout(bind._t); bind._t = setTimeout(renderCandCard, 300); } return;
      }
    });

    document.addEventListener("change", (e) => {
      const el = e.target;
      if (el.closest && el.closest(".editor")) presetDirty = true;
      if (el.dataset.ftype) {
        const f = fields().find((x) => x.id === el.dataset.ftype);
        if (f) { f.type = el.value; renderCandCard(); refresh(); }
      }
    });

    // 클릭 일괄 처리
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.closest(".editor") && !t.dataset.step && !t.dataset.goto && !t.dataset.pick) presetDirty = true;
      const d = t.dataset;
      if (d.pick) { state.editingCandidateId = d.pick; renderChips(); renderCandCard(); return; }
      if (d.move) {
        const i = state.candidates.findIndex((c) => String(c.id) === d.move), j = i + Number(d.dir);
        if (i < 0 || j < 0 || j >= state.candidates.length) return;
        [state.candidates[i], state.candidates[j]] = [state.candidates[j], state.candidates[i]];
        renderChips(); refresh(); return;
      }
      if (t.id === "btn-add-cand") {
        const maxC = state.electionType === "legislative_election" ? 70 : 9;
        if (state.candidates.length >= maxC) { toast(`이 틀은 ${maxC}개까지 지원합니다`); return; }
        const id = String(state.candidates.reduce((m, c) => Math.max(m, parseInt(c.id, 10) || 0), 0) + 1);
        const palette = ["#004ea2", "#e61e2b", "#ff7016", "#00a85a", "#7b2d8e", "#ffc800", "#0aa1dd", "#8b5a2b", "#4d4d4d"];
        state.candidates.push({ id, name: isEn() ? `Candidate ${id}` : `후보 ${id}`, party: isEn() ? "Party" : "정당", color: palette[(state.candidates.length) % palette.length], fieldValues: {} });
        state.editingCandidateId = id;
        renderChips(); renderCandCard(); refresh();
        setTimeout(() => { $("cand-name").focus(); $("cand-name").select(); }, 0);
        return;
      }
      if (d.delStat) { state.customStats = state.customStats.filter((x) => x.id !== d.delStat); renderStats(); refresh(); return; }
      if (d.delChoice) { state.referendumChoices = state.referendumChoices.filter((x) => x.id !== d.delChoice); renderChoices(); refresh(); return; }
      if (d.fdel) { state.candidateFieldsConfig = fields().filter((x) => x.id !== d.fdel); renderFieldsCfg(); renderCandCard(); refresh(); return; }
      if (d.fmove) {
        const fs = fields(), i = fs.findIndex((x) => x.id === d.fmove), j = i + Number(d.dir);
        if (i < 0 || j < 0 || j >= fs.length) return;
        [fs[i], fs[j]] = [fs[j], fs[i]];
        renderFieldsCfg(); renderCandCard(); refresh(); return;
      }
      if (d.uploadFv) { pickImage((data, name) => { const c = activeCand(); if (!c) return; c.fieldValues[d.uploadFv] = data; renderCandCard(); refresh(); toast(`${name} 사진을 넣었습니다`); }); return; }
      if (d.upload) { pickImage((data, name) => { state[d.upload] = data; syncMetaForm(); refresh(); toast(`${name} 사진을 넣었습니다`); }); return; }
      if (d.style) {
        state.infoboxStyle = d.style;
        state.codeTab = d.style === "namu" ? "namu" : (state.outputLang === "en" ? "wiki-en" : "wiki-ko");
        if (d.style === "namu" && state.previewWidth === 320) state.previewWidth = 400;
        else if (d.style === "wikipedia" && state.previewWidth === 400) state.previewWidth = 320;
        applyToolbar(); refresh(); return;
      }
      if (d.code) {
        state.codeTab = d.code;
        if (d.code !== "namu" && (d.code === "wiki-en") !== isEn()) { setLang(d.code === "wiki-en" ? "en" : "ko"); return; }
        applyToolbar(); refresh(); return;
      }
      if (d.lang) { setLang(d.lang); return; }
    });

    $("btn-del-cand").addEventListener("click", () => {
      if (state.candidates.length <= 1) { toast("후보는 한 명 이상 있어야 합니다"); return; }
      const c = activeCand();
      state.candidates = state.candidates.filter((x) => x !== c);
      state.editingCandidateId = String(state.candidates[0].id);
      renderChips(); renderCandCard(); refresh();
      toast(`${candLabel(c)} 삭제됨`);
    });
    const setColor = (v) => {
      const c = activeCand(); if (!c) return;
      c.color = v; $("cand-dot").style.background = v; renderChips(); refresh();
      if (state.infoboxStyle === "namu" && !state.namuThemeColor) applyToolbar();
    };
    $("cand-color").addEventListener("input", (e) => { $("cand-color-text").value = e.target.value; setColor(e.target.value); });
    $("cand-color-text").addEventListener("input", (e) => {
      let v = e.target.value.trim(); if (v && v[0] !== "#") v = "#" + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) { $("cand-color").value = v; setColor(v); }
    });

    $("btn-add-stat").addEventListener("click", () => { state.customStats.push({ id: uid("s_"), label: "", value: "" }); renderStats(); refresh(); const ins = $("stats-list").querySelectorAll("input"); if (ins.length) ins[ins.length - 2].focus(); });
    $("btn-add-choice").addEventListener("click", () => { state.referendumChoices.push({ id: uid("rc_"), label: "", votes: "", percentage: "" }); renderChoices(); refresh(); });
    $("btn-add-field").addEventListener("click", () => { state.candidateFieldsConfig.push({ id: uid("field_"), label: isEn() ? "New row" : "새 항목", type: "text" }); renderFieldsCfg(); renderCandCard(); refresh(); });
    $("btn-reset-fields").addEventListener("click", () => { state.candidateFieldsConfig = defaultFields(state.electionType); renderFieldsCfg(); renderCandCard(); refresh(); toast("항목 구성을 기본값으로 되돌렸습니다"); });

    $("in-type").addEventListener("change", (e) => {
      state.electionType = e.target.value;
      state.candidateFieldsConfig = defaultFields(state.electionType);
      if (state.electionType === "referendum" && !state.referendumChoices.length) {
        const L = isEn() ? ["Yes", "No", "Valid votes", "Invalid or blank votes", "Total votes"] : ["찬성", "반대", "유효 투표수", "무효·기권표", "총 투표수"];
        state.referendumChoices = L.map((label, i) => ({ id: uid("rc_"), label, votes: "", percentage: "", ...(i < 2 ? { color: CHOICE_COLORS[i] } : {}) }));
      }
      if (state.electionType !== "referendum" && !state.candidates.length) {
        state.candidates = [{ id: "1", name: isEn() ? "Candidate 1" : "후보 1", party: isEn() ? "Party" : "정당", color: "#004ea2", fieldValues: {} }];
        state.editingCandidateId = "1";
      }
      renderEditor(); applyToolbar(); refresh();
    });
    $("in-ongoing").addEventListener("change", (e) => { state.ongoing = e.target.checked; refresh(); });
    $("in-noleader").addEventListener("change", (e) => { state.legisNoLeader = e.target.checked; refresh(); });
    $("in-nopct").addEventListener("change", (e) => { state.legisNoPct = e.target.checked; refresh(); });
    $("in-first").addEventListener("change", (e) => { state.legisFirst = e.target.checked; refresh(); });
    $("in-perrow").addEventListener("change", (e) => { state.candidatesPerRow = e.target.value; refresh(); });

    // 툴바
    const setW = (v) => { state.previewWidth = clampWidth(v); $("in-width").value = state.previewWidth; $("in-width-range").value = state.previewWidth; refresh(); };
    $("in-width-range").addEventListener("input", (e) => setW(e.target.value));
    $("in-width").addEventListener("change", (e) => setW(e.target.value));
    $("in-font").addEventListener("change", (e) => { state.selectedFont = e.target.value; refresh(); });
    $("in-theme").addEventListener("input", (e) => { state.namuThemeColor = e.target.value; $("btn-theme-auto").classList.remove("hidden"); refresh(); });
    $("btn-theme-auto").addEventListener("click", () => { state.namuThemeColor = ""; applyToolbar(); refresh(); });
    $("in-ballot").addEventListener("change", (e) => { state.namuBallotNo = e.target.checked; refresh(); });
    $("btn-png").addEventListener("click", savePng);
    $("btn-copy").addEventListener("click", copyCode);

    // 데이터
    $("preset-select").addEventListener("change", (e) => {
      const p = loadPreset(e.target.value);
      if (p) toast(`${p.electionName} 예제를 불러왔습니다`);
      e.target.value = "";
    });
    $("btn-export").addEventListener("click", exportJson);
    $("btn-import").addEventListener("click", () => $("json-import-input").click());
    $("json-import-input").addEventListener("change", importJson);
  }

  /* ---------- 파일 · 내보내기 ---------- */
  function pickImage(cb) {
    const inp = $("image-upload");
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => cb(r.result, f.name);
      r.readAsDataURL(f);
      inp.value = "";
    };
    inp.click();
  }
  const safeName = () => (plain(state.electionName) || "election_infobox").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_");
  function download(href, name) {
    const a = document.createElement("a");
    a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function exportJson() {
    const data = clone(state);
    delete data.editingCandidateId;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    download(url, `${safeName()}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("JSON 파일로 저장했습니다");
  }
  function importJson(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || (!d.electionType && !d.candidates && !d.referendumChoices)) throw new Error("bad");
        loadData(d, false);
        presetKey = ""; presetDirty = false;
        if (d.infoboxStyle) applyToolbar();
        toast("JSON 파일을 불러왔습니다");
      } catch (err) {
        toast("불러오지 못했습니다. 이 빌더에서 저장한 JSON 파일인지 확인하세요");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  }
  function savePng() {
    const target = $("capture").firstElementChild;
    if (!target || typeof html2canvas !== "function") { toast("이미지 도구를 아직 불러오는 중입니다. 잠시 후 다시 눌러 주세요"); return; }
    toast("PNG로 바꾸는 중…");
    html2canvas(target, { useCORS: true, backgroundColor: null, scale: 2 })
      .then((canvas) => {
        try { download(canvas.toDataURL("image/png"), `${safeName()}_${state.infoboxStyle === "namu" ? "namu" : "wiki"}.png`); toast("PNG로 저장했습니다"); }
        catch (err) { toast("다른 사이트의 이미지가 저장을 막았습니다. 이미지를 파일로 올린 뒤 다시 저장하세요"); }
      })
      .catch(() => toast("PNG로 바꾸지 못했습니다. 이미지를 파일로 올린 뒤 다시 시도하세요"));
  }
  function copyCode() {
    const v = $("code-out").value;
    const ok = () => toast("코드를 복사했습니다");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(v).then(ok, fallback);
    } else fallback();
    function fallback() {
      const ta = $("code-out"); ta.focus(); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("코드를 직접 선택해서 복사하세요"); }
    }
  }
  let toastT = 0;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- 시작 ---------- */
  function init() {
    bind();
    if (!loadPreset("ko_pres_2025_fictional")) loadData({}, true);
    window.__infobox = { state: () => state, codeFor, loadData }; // 디버깅용
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
