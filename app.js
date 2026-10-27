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
    referendum: []
  };
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
    infoboxStyle: "wikipedia", namuThemeColor: "", namuBallotNo: true,
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

  function baHeads() {
    const t = plain(state.title);
    if (state.electionType === "referendum" || !t) return ["이전", "이후"];
    if (state.electionType === "presidential") return [`선거 전 ${t}`, `${t} 당선인`];
    return [`선거 전 ${t}`, `선거 후 ${t}`];
  }
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

  /* =========================================================
     위키백과 렌더러 — Infobox election / Infobox referendum
     ========================================================= */
  function wpNavRow() {
    const s = state;
    if (!s.beforeElectionYear && !s.electionDate && !s.afterElectionYear) return "";
    return `<tr class="wp-nav">
      <td class="l">${s.beforeElectionYear ? `← <a>${fmt(s.beforeElectionYear)}</a>` : ""}</td>
      <td class="c">${fmt(s.electionDate)}</td>
      <td class="r">${s.afterElectionYear ? `<a>${fmt(s.afterElectionYear)}</a> →` : ""}</td></tr>`;
  }
  const wpHr = () => `<tr class="wp-hr"><td colspan="3"><div></div></td></tr>`;
  function wpStats(centered) {
    const s = state, rows = [];
    if (s.registeredVoters) rows.push(["선거인수", fmt(s.registeredVoters)]);
    if (s.turnoutText) rows.push(["투표율", fmt(s.turnoutText)]);
    (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) rows.push([fmt(x.label), fmt(x.value)]); });
    if (!rows.length) return "";
    return `<tr><td colspan="3"><table class="wp-kv${centered ? " centered" : ""}">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table></td></tr>`;
  }
  function wpMap(legend) {
    const s = state;
    if (!s.mapImage) return "";
    return `<tr><td colspan="3" class="wp-map">
      <img src="${escAttr(s.mapImage)}" alt="선거 결과 지도" crossorigin="anonymous" onerror="window.__imgFail(this)">
      ${s.mapCaption ? `<div class="wp-caption">${fmt(s.mapCaption)}</div>` : ""}${legend || ""}</td></tr>`;
  }
  function wpBA() {
    if (!hasBA()) return "";
    const s = state, [hb, ha] = baHeads();
    const chip = (p) => { const c = partyColor(p); return c ? `<span class="chip" style="background:${hexOf(c)}"></span>` : ""; };
    return wpHr() + `<tr><td colspan="3"><table class="wp-ba"><tr>
      <td class="b"><div class="h">${escHtml(hb)}</div><a>${fmt(s.beforeElection) || "—"}</a><br>${chip(s.beforeParty)}<a>${fmt(s.beforeParty)}</a></td>
      <td class="arr">→</td>
      <td class="a"><div class="h">${escHtml(ha)}</div><a>${fmt(s.afterElection) || "—"}</a><br><a>${fmt(s.afterParty)}</a>${chip(s.afterParty)}</td>
    </tr></table></td></tr>`;
  }

  function wpCandidates() {
    const s = state, k = perRow(), img = imageField(), tfs = textFields();
    const labW = 26, colW = (100 - labW) / k;
    const isLeg = s.electionType === "legislative" || s.electionType === "local";
    let ordinal = 0, html = "";
    chunks().forEach((row) => {
      const empty = k - row.length;
      const pad = (cls) => Array.from({ length: empty }, () => `<td class="${cls || ""}"></td>`).join("");
      html += `<table class="wp-cands"><colgroup><col style="width:${labW}%">${Array.from({ length: k }, () => `<col style="width:${colW}%">`).join("")}</colgroup><tbody>`;
      if (isLeg) {
        html += `<tr><th></th>${row.map(() => `<td><b>제${++ordinal}당</b></td>`).join("")}${pad()}</tr>`;
      }
      if (img) {
        html += `<tr class="img"><th></th>${row.map((c) => `<td><div class="wp-portrait">${portrait(c.fieldValues && c.fieldValues[img.id], c.name)}</div></td>`).join("")}${pad()}</tr>`;
      }
      html += `<tr class="wp-colorbar"><th></th>${row.map((c) => `<td style="background:${hexOf(c.color)}"></td>`).join("")}${pad("blank")}</tr>`;
      html += `<tr><th>${leaderLabel()}</th>${row.map((c) => `<td><a>${fmt(c.name) || "—"}</a></td>`).join("")}${pad()}</tr>`;
      html += `<tr><th>정당</th>${row.map((c) => `<td><a>${fmt(c.party) || "—"}</a></td>`).join("")}${pad()}</tr>`;
      tfs.forEach((f) => {
        html += `<tr><th>${fmt(f.label)}</th>${row.map((c) => {
          const v = fmt(c.fieldValues && c.fieldValues[f.id]);
          return `<td>${v ? (isBoldField(f) ? `<b>${v}</b>` : v) : "—"}</td>`;
        }).join("")}${pad()}</tr>`;
      });
      html += `</tbody></table>`;
    });
    return `<tr><td colspan="3">${html || '<div class="wp-note">후보를 추가하세요</div>'}</td></tr>`;
  }

  function wpNextLeg() {
    const rows = state.candidates.map((c) => `<tr>
      <td class="sw" style="background:${hexOf(c.color)}"></td>
      <td><a>${fmt(c.party) || "—"}</a></td><td>${fmt(c.name) || "—"}</td>
      <td class="num">${fmt(c.fieldValues && c.fieldValues.seatsWon) || "0"}</td></tr>`).join("");
    return `<tr><td colspan="3"><table class="wp-table"><thead><tr><th colspan="2">정당</th><th>대표</th><th>현재 의석</th></tr></thead><tbody>${rows}</tbody></table></td></tr>`;
  }

  function renderWikipedia() {
    const s = state, W = s.previewWidth;
    let b = `<tr><th colspan="3" class="wp-above">${fmt(s.electionName) || "선거 명칭"}</th></tr>`;

    if (s.electionType === "referendum") {
      // Infobox referendum: 명칭 → 투표 질문 → 결과 머리 → 표 → 지도 → 비고
      if (s.flagImage) b += `<tr><td colspan="3" class="wp-center wp-flag"><img src="${escAttr(s.flagImage)}" alt="" crossorigin="anonymous" onerror="window.__hideFail(this)"></td></tr>`;
      if (s.referendumQuestion) b += `<tr><td colspan="3" class="wp-center">${fmt(s.referendumQuestion)}</td></tr>`;
      b += `<tr><td colspan="3" class="wp-header">투표 결과</td></tr>`;
      const { list, opts, winner } = choiceRows();
      const hasVotes = list.some((c) => String(c.votes || "").trim());
      let t = `<table class="wp-results"><thead><tr><th>찬반</th>${hasVotes ? "<th>득표수</th>" : ""}<th>비율</th></tr></thead><tbody>`;
      list.forEach((c) => {
        const tot = isTotalChoice(c.label);
        let mark = "";
        if (!tot && opts.length >= 2 && winner) mark = c === winner ? '<span class="mark yes">✓</span>' : '<span class="mark no">✗</span>';
        const cls = tot ? (/총|Total/i.test(c.label) ? "total" : "") : (c === winner ? "win" : "");
        t += `<tr class="${cls}"><td>${mark}${fmt(c.label) || "—"}</td>${hasVotes ? `<td class="num">${fmt(c.votes)}</td>` : ""}<td class="num">${fmt(c.percentage)}</td></tr>`;
      });
      if (s.turnoutText) t += `<tr><td>투표율</td><td class="num" colspan="${hasVotes ? 2 : 1}">${fmt(s.turnoutText)}</td></tr>`;
      if (s.registeredVoters) t += `<tr><td>선거인수</td><td class="num" colspan="${hasVotes ? 2 : 1}">${fmt(s.registeredVoters)}</td></tr>`;
      if (!list.length) t += `<tr><td colspan="3" class="wp-center">결과가 아직 없습니다</td></tr>`;
      t += `</tbody></table>`;
      b += `<tr><td colspan="3">${t}</td></tr>`;
      const legend = opts.length >= 2
        ? `<div class="vbar-legend">${opts.slice(0, 4).map((c, i) => `<span><span class="chip" style="display:inline-block;width:.8em;height:.8em;margin-right:.3em;background:${hexOf(c.color || CHOICE_COLORS[i])}"></span>${escHtml(plain(c.label))}</span>`).join("")}</div>`
        : "";
      b += wpMap(legend);
      const notes = [];
      if (s.electionDate) notes.push(`<b>투표일</b> ${fmt(s.electionDate)}`);
      if (s.turnoutDetails) notes.push(fmt(s.turnoutDetails));
      (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) notes.push(`<b>${fmt(x.label)}</b> ${fmt(x.value)}`); });
      if (notes.length) b += `<tr><td colspan="3" class="wp-note">${notes.join("<br>")}</td></tr>`;
      b += wpBA();
    } else {
      // Infobox election: 명칭 → 국기 → ← 이전 | 선거일 | 다음 → → 개요 → 통계 → 후보 → 지도 → 선거 전/후
      if (s.flagImage) b += `<tr><td colspan="3" class="wp-center wp-flag"><img src="${escAttr(s.flagImage)}" alt="" crossorigin="anonymous" onerror="window.__hideFail(this)"></td></tr>`;
      b += wpNavRow();
      if (s.turnoutDetails) b += `<tr><td colspan="3" class="wp-note">${fmt(s.turnoutDetails)}</td></tr>`;
      b += wpStats(true);
      b += wpHr();
      b += s.electionType === "next_legislative" ? wpNextLeg() : wpCandidates();
      if (s.mapImage) b += wpHr() + wpMap();
      b += wpBA();
    }
    return `<table class="wp-ib" style="width:${W}px"><tbody>${b}</tbody></table>`;
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
    const N = ref ? (hasVotes ? 3 : 2) : nextLeg ? 3 : 1 + k;
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
        `<div class="nm-map"><img src="${escAttr(s.mapImage)}" alt="선거 결과 지도" crossorigin="anonymous" onerror="window.__imgFail(this)"></div>${s.mapCaption ? `<div class="nm-cap">${fmt(s.mapCaption)}</div>` : ""}`,
        `[[파일:${fileNameOf(s.mapImage, "선거 결과 지도.png")}|width=100%]]${s.mapCaption ? `[br]{{{-1 ${toNamu(s.mapCaption)}}}}` : ""}`,
        { span: N })]);
    }
    if (hasBA()) {
      const [hb, ha] = baHeads();
      const whoH = (n, p) => `<b>${hasMarkup(n) ? fmt(n) : `<a>${fmt(n) || "—"}</a>`}</b>${p ? `<br><span style="font-size:.88em">${hasMarkup(p) ? fmt(p) : `<a>${fmt(p)}</a>`}</span>` : ""}`;
      const whoM = (n, p) => boldM(hasMarkup(n) ? toNamu(n) : (plain(n) ? `[[${plain(n)}]]` : "—")) + (p ? `[br]{{{-1 ${hasMarkup(p) ? toNamu(p) : `[[${plain(p)}]]`}}}}` : "");
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
     위키텍스트 — Infobox election / Infobox referendum
     ========================================================= */
  const FIELD_PARAM = {
    votes: "popular_vote", percentage: "percentage", seatsWon: "seats", seats: "seats",
    seatChange: "seat_change", lastElection: "last_election", alliance: "alliance",
    swing: "swing", seatsBefore: "seats_before", runningMate: "running_mate", homeState: "home_state",
    electoralVote: "electoral_vote"
  };
  function paramBlock(pairs) {
    const w = Math.min(22, Math.max(...pairs.map(([k]) => (k ? k.length : 0)), 0));
    return pairs.map(([k, v]) => (k === null ? v : `| ${k.padEnd(w)} = ${v == null ? "" : v}`)).join("\n");
  }
  // 템플릿은 한 줄에 3명이므로, 2명씩 배치하면 1·2 / 4·5 / 7·8 칸을 씀
  function templateSlots() {
    const k = perRow();
    return state.candidates.map((c, i) => {
      if (k >= 3) return i + 1;
      const r = Math.floor(i / k), col = i % k;
      return r * 3 + col + 1;
    });
  }

  function wikiElection(lang) {
    const s = state, P = [];
    const add = (k, v) => P.push([k, v]);
    const com = (t) => P.push([null, `<!-- ${t} -->`]);
    const type = { presidential: "presidential", legislative: "legislative", local: "parliamentary" }[s.electionType] || "parliamentary";
    add("election_name", toWiki(s.electionName));
    add("country", s.country || "");
    add("type", type);
    add("ongoing", "no");
    if (s.beforeElectionYear) { add("previous_election", sisterTitle(plain(s.beforeElectionYear))); add("previous_year", plain(s.beforeElectionYear)); }
    if (s.afterElectionYear) { add("next_election", sisterTitle(plain(s.afterElectionYear))); add("next_year", plain(s.afterElectionYear)); }
    add("election_date", toWiki(s.electionDate));
    if (s.flagImage) add("flag_image", fileNameOf(s.flagImage, "Flag.svg"));
    if (s.turnoutDetails) add(type === "presidential" ? "votes_for_election" : "seats_for_election", toWiki(s.turnoutDetails));
    if (s.registeredVoters) add("registered", toWiki(s.registeredVoters));
    if (s.turnoutText) add("turnout", toWiki(s.turnoutText));
    (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) com(`추가 항목 · ${plain(x.label)}: ${plain(x.value)} (틀에 대응 매개변수 없음)`); });

    const img = imageField();
    const tfs = textFields();
    const used = new Set();
    const blanks = [];
    tfs.forEach((f) => {
      const p = FIELD_PARAM[f.id];
      if (p && !used.has(p)) { used.add(p); f.__param = p; }
      else { f.__param = null; blanks.push(f); }
    });
    if (blanks.length) {
      P.push([null, ""]);
      com("보조 행 (1blank~6blank)");
      blanks.slice(0, 6).forEach((f, i) => { f.__blank = i + 1; add(`${i + 1}blank`, toWiki(f.label)); });
      if (blanks.length > 6) com(`틀은 보조 행을 6개까지만 지원합니다: ${blanks.slice(6).map((f) => plain(f.label)).join(", ")} 생략`);
    }
    const slots = templateSlots();
    s.candidates.forEach((c, i) => {
      const n = slots[i];
      if (n > 9) { if (n === slots.find((x) => x > 9)) com("틀은 후보를 9명까지만 지원합니다"); return; }
      P.push([null, ""]);
      com(`${i + 1}번째 ${s.electionType === "presidential" ? "후보" : "정당"}`);
      const fv = c.fieldValues || {};
      if (img) add(`image${n}`, fileNameOf(fv[img.id], `Candidate_${n}.png`));
      add(`${s.electionType === "presidential" ? "nominee" : "leader"}${n}`, toWiki(c.name));
      add(`party${n}`, toWiki(c.party));
      add(`colour${n}`, hexOf(c.color).replace("#", ""));
      tfs.forEach((f) => {
        const v = toWiki(fv[f.id] || "");
        if (f.__param) add(`${f.__param}${n}`, v);
        else if (f.__blank) add(`${f.__blank}data${n}`, v);
      });
    });
    P.push([null, ""]);
    if (s.mapImage) { add("map_image", fileNameOf(s.mapImage, "Election_map.png")); add("map_caption", toWiki(s.mapCaption)); }
    if (s.title) add("title", toWiki(s.title));
    add("before_election", toWiki(s.beforeElection));
    add("before_party", toWiki(s.beforeParty));
    add("after_election", toWiki(s.afterElection));
    add("after_party", toWiki(s.afterParty));
    const name = lang === "ko" ? "선거 정보" : "Infobox election";
    return `{{${name}\n${paramBlock(P)}\n}}`;
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
    const com = (t) => P.push([null, `<!-- ${t} -->`]);
    const { list, opts } = choiceRows();
    const find = (re) => list.find((c) => re.test(c.label || ""));
    const yes = opts[0], no = opts[1];
    const total = find(/총|Total/i);
    add("name", toWiki(s.electionName));
    add("title", toWiki(s.referendumQuestion));
    add("yes", yes ? digits(yes.votes) : "");
    add("no", no ? digits(no.votes) : "");
    add("total", total ? digits(total.votes) : "");
    add("electorate", digits(s.registeredVoters));
    if (s.mapImage) { add("map", fileNameOf(s.mapImage, "Referendum_map.png")); }
    const notes = [];
    if (s.electionDate) notes.push(`투표일: ${toWiki(s.electionDate)}`);
    if (s.turnoutDetails) notes.push(toWiki(s.turnoutDetails));
    if (s.mapCaption) notes.push(toWiki(s.mapCaption));
    (s.customStats || []).forEach((x) => { if (x.label && x.label.trim()) notes.push(`${toWiki(x.label)}: ${toWiki(x.value)}`); });
    add("notes", notes.join("<br />"));
    if (yes || no) com(`찬성 = ${plain(yes && yes.label)}, 반대 = ${plain(no && no.label)} 로 넣었습니다. 비율·유효표·무효표·투표율은 틀이 계산합니다`);
    if (opts.length > 2) com(`이 틀은 찬반 두 선택지만 지원합니다: ${opts.slice(2).map((c) => plain(c.label)).join(", ")} 생략`);
    return `{{Infobox referendum\n${paramBlock(P)}\n}}`;
  }

  function codeFor(tab) {
    if (tab === "namu") return namuMark();
    const lang = tab === "wiki-en" ? "en" : "ko";
    if (state.electionType === "referendum") return wikiReferendum();
    if (state.electionType === "next_legislative") return wikiNextLeg(lang);
    return wikiElection(lang);
  }
  const CODE_NOTE = {
    "wiki-ko": "한국어 위키백과 {{선거 정보}} 틀 양식입니다. 매개변수 이름은 영어판 Infobox election과 같습니다.",
    "wiki-en": "영어 위키백과 {{Infobox election}} 틀 양식입니다. 색상은 # 없이 colourN에 들어갑니다.",
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
    const mock = $("mock");
    mock.className = `mock ${nm ? "mock-nm" : "mock-wp"}`;
    $("mock-title").textContent = plain(state.electionName) || "선거";
    $("mock-sub").textContent = nm ? "최근 수정 시각: 방금 전" : "위키백과, 우리 모두의 백과사전.";
  }
  function renderCode() {
    const ref = state.electionType === "referendum";
    document.querySelectorAll("[data-code]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.code === state.codeTab));
      if (b.dataset.code === "wiki-ko") b.textContent = ref ? "위키백과 국민투표" : "위키백과 한국어";
      if (b.dataset.code === "wiki-en") b.classList.toggle("hidden", ref);
    });
    if (ref && state.codeTab === "wiki-en") state.codeTab = "wiki-ko";
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
  }
  function autoGrow(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }

  function applyTypeUI() {
    const ref = state.electionType === "referendum";
    $("cands-area").classList.toggle("hidden", ref);
    $("ref-area").classList.toggle("hidden", !ref);
    $("step2-label").textContent = ref ? "투표 결과" : "후보·정당";
    $("label-details").textContent = ref ? "투표 주제" : "개요 (선출 의석 등)";
    const nextLeg = state.electionType === "next_legislative";
    $("fields-fold").classList.toggle("hidden", nextLeg);
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
  const candLabel = (c) => plain(state.electionType === "next_legislative" ? c.party : c.name) || "이름 없음";

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
    if (!d.candidateFieldsConfig || !d.candidateFieldsConfig.length) d.candidateFieldsConfig = clone(DEFAULT_FIELDS[d.electionType] || DEFAULT_FIELDS.presidential);
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
    const view = { infoboxStyle: state.infoboxStyle, selectedFont: state.selectedFont, codeTab: state.codeTab, namuBallotNo: state.namuBallotNo };
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
      if (el.dataset.ftype) {
        const f = fields().find((x) => x.id === el.dataset.ftype);
        if (f) { f.type = el.value; renderCandCard(); refresh(); }
      }
    });

    // 클릭 일괄 처리
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      const d = t.dataset;
      if (d.pick) { state.editingCandidateId = d.pick; renderChips(); renderCandCard(); return; }
      if (d.move) {
        const i = state.candidates.findIndex((c) => String(c.id) === d.move), j = i + Number(d.dir);
        if (i < 0 || j < 0 || j >= state.candidates.length) return;
        [state.candidates[i], state.candidates[j]] = [state.candidates[j], state.candidates[i]];
        renderChips(); refresh(); return;
      }
      if (t.id === "btn-add-cand") {
        if (state.candidates.length >= 9) { toast("인포박스 틀은 후보를 9명까지 지원합니다"); return; }
        const id = String(state.candidates.reduce((m, c) => Math.max(m, parseInt(c.id, 10) || 0), 0) + 1);
        const palette = ["#004ea2", "#e61e2b", "#ff7016", "#00a85a", "#7b2d8e", "#ffc800", "#0aa1dd", "#8b5a2b", "#4d4d4d"];
        state.candidates.push({ id, name: `후보 ${id}`, party: "정당", color: palette[(state.candidates.length) % palette.length], fieldValues: {} });
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
        state.codeTab = d.style === "namu" ? "namu" : (state.codeTab === "namu" ? "wiki-ko" : state.codeTab);
        if (d.style === "namu" && state.previewWidth === 320) state.previewWidth = 400;
        else if (d.style === "wikipedia" && state.previewWidth === 400) state.previewWidth = 320;
        applyToolbar(); refresh(); return;
      }
      if (d.code) { state.codeTab = d.code; renderCode(); return; }
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
    $("btn-add-field").addEventListener("click", () => { state.candidateFieldsConfig.push({ id: uid("field_"), label: "새 항목", type: "text" }); renderFieldsCfg(); renderCandCard(); refresh(); });
    $("btn-reset-fields").addEventListener("click", () => { state.candidateFieldsConfig = clone(DEFAULT_FIELDS[state.electionType] || []); renderFieldsCfg(); renderCandCard(); refresh(); toast("항목 구성을 기본값으로 되돌렸습니다"); });

    $("in-type").addEventListener("change", (e) => {
      state.electionType = e.target.value;
      state.candidateFieldsConfig = clone(DEFAULT_FIELDS[state.electionType] || []);
      if (state.electionType === "referendum" && !state.referendumChoices.length) {
        state.referendumChoices = [
          { id: uid("rc_"), label: "찬성", votes: "", percentage: "", color: CHOICE_COLORS[0] },
          { id: uid("rc_"), label: "반대", votes: "", percentage: "", color: CHOICE_COLORS[1] },
          { id: uid("rc_"), label: "유효 투표수", votes: "", percentage: "" },
          { id: uid("rc_"), label: "무효·기권표", votes: "", percentage: "" },
          { id: uid("rc_"), label: "총 투표수", votes: "", percentage: "" }
        ];
      }
      if (state.electionType !== "referendum" && !state.candidates.length) {
        state.candidates = [{ id: "1", name: "후보 1", party: "정당", color: "#004ea2", fieldValues: {} }];
        state.editingCandidateId = "1";
      }
      renderEditor(); applyToolbar(); refresh();
    });
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
      const p = window.PRESETS && window.PRESETS[e.target.value];
      if (p) { loadData(p, true); toast(`${p.electionName} 예제를 불러왔습니다`); }
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
    loadData(window.PRESETS ? window.PRESETS.ko_pres_2025_fictional : {}, true);
    window.__infobox = { state: () => state, codeFor, loadData }; // 디버깅용
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
