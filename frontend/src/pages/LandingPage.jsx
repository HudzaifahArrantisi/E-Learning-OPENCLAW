/**
 * NF StudentHub — Single Page Application
 * Merged: Landing + Curriculum + Visi & Misi + Academic Calendar
 * Design System: Editorial Noir
 * Fonts: Cabin × Google Sans × Quicksand × Space Mono
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────── */
const CSS = `
:root {
  --bg:       #040609;
  --bg1:      #07090f;
  --surface:  #090c18;
  --card:     #0b0e1e;
  --border:   rgba(255,255,255,0.06);
  --border-a: rgba(75,115,255,0.22);
  --accent:   #4B73FF;
  --accent-s: rgba(75,115,255,0.1);
  --atext:    #8BA4FF;
  --text:     #EDF0FF;
  --text2:    #5D6E8F;
  --text3:    #252E42;
  --green:    #4ADE80;
  --ff-s:    'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff:      'Cabin', 'Google Sans', 'Quicksand', system-ui, sans-serif;
  --ff-m:    'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  --nav-h:   56px;
}

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

.lp {
  background: var(--bg);
  color: var(--text);
  font-family: var(--ff);
  font-weight: 300;
  overflow-x: hidden;
  line-height: 1.6;
  min-height: 100vh;
}

/* ── CONTAINER ── */
.w { max-width: 1120px; margin: 0 auto; padding: 0 28px; }
.sec { padding: 104px 0; }
.sep { border: none; border-top: 1px solid var(--border); }
section[id] { scroll-margin-top: calc(var(--nav-h) + 44px); }

/* ── SECTION LABELING ── */
.sec-eyebrow {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 40px;
}
.sec-eyebrow span { font-family: var(--ff-m); color: var(--text3); }
.sec-eyebrow::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── TYPOGRAPHY ── */
.t-display {
  font-family: var(--ff-s);
  font-size: clamp(2.8rem, 5.5vw, 4.5rem);
  font-weight: 400;
  line-height: 1.06;
  letter-spacing: -0.025em;
  color: var(--text);
}
.t-display em { font-style: italic; }
.t-body { font-size: 16px; font-weight: 300; color: var(--text2); line-height: 1.8; }

/* ── BUTTONS ── */
.btn-prim {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--text); color: var(--bg);
  font-family: var(--ff); font-size: 13px; font-weight: 600;
  padding: 11px 24px; border-radius: 100px;
  text-decoration: none; transition: all .2s;
  letter-spacing: 0.01em; border: none; cursor: pointer;
}
.btn-prim:hover { background: var(--atext); transform: translateY(-1px); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  color: var(--text2); font-family: var(--ff); font-size: 13px; font-weight: 400;
  text-decoration: none; transition: color .18s;
  background: none; border: none; cursor: pointer; padding: 0;
}
.btn-ghost:hover { color: var(--text); }
.btn-ghost .arr { transition: transform .18s; display: inline-block; }
.btn-ghost:hover .arr { transform: translateX(4px); }

/* ── REVEAL ANIMATION ── */
.rv { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease; }
.rv.in { opacity: 1; transform: none; }
.rv.d1 { transition-delay: .1s; }
.rv.d2 { transition-delay: .2s; }
.rv.d3 { transition-delay: .3s; }

/* ── FADE IN ── */
.fade-in { animation: fadeIn .4s ease both; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ═══════════════════════════════════════════
   NAV
═══════════════════════════════════════════ */
.nav {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  z-index: 1000; display: flex; align-items: center;
  background: rgba(4,6,9,0.82); backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px); border: 1px solid var(--border);
  border-radius: 100px; padding: 5px 6px 5px 18px; white-space: nowrap; gap: 2px;
  width: max-content; max-width: calc(100% - 24px); overflow-x: auto;
  scrollbar-width: none; box-shadow: 0 10px 28px rgba(0,0,0,0.35);
}
.nav::-webkit-scrollbar { display: none; }
.nav-brand { font-size: 11.5px; font-weight: 600; color: var(--text); letter-spacing: 0.07em; margin-right: 10px; }
.nav-link { color: var(--text2); text-decoration: none; font-size: 12.5px; font-weight: 400; padding: 7px 15px; border-radius: 100px; transition: all .18s; }
.nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--atext); background: rgba(75,115,255,0.08); }
.nav-enter { background: var(--text); color: var(--bg); text-decoration: none; font-size: 12.5px; font-weight: 600; padding: 8px 20px; border-radius: 100px; transition: all .18s; margin-left: 4px; letter-spacing: 0.01em; }
.nav-enter:hover { background: var(--atext); }
.btn-prim:focus-visible, .btn-ghost:focus-visible, .nav-link:focus-visible, .nav-enter:focus-visible {
  outline: 2px solid rgba(139,164,255,0.45);
  outline-offset: 2px;
}

/* ═══════════════════════════════════════════
   HERO
═══════════════════════════════════════════ */
.hero {
  position: relative; min-height: 100vh;
  display: flex; align-items: flex-end;
  padding-bottom: 90px; overflow: hidden;
}
.hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.024) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.024) 1px, transparent 1px);
  background-size: 64px 64px;
}
.hero-fog { position: absolute; inset: 0; background: radial-gradient(ellipse 120% 80% at 50% 50%, transparent 0%, rgba(4,6,9,.55) 50%, var(--bg) 100%); }
.hero-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(transparent, var(--bg)); }
.hero-scan {
  position: absolute; left: 0; right: 0; height: 160px;
  background: linear-gradient(180deg, transparent, rgba(75,115,255,0.01) 35%, rgba(75,115,255,0.024) 50%, rgba(75,115,255,0.01) 65%, transparent);
  animation: scanAnim 18s linear infinite; pointer-events: none;
}
@keyframes scanAnim { from { top: -160px; } to { top: 100%; } }
.hero-inner { position: relative; z-index: 2; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 9px;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 100px;
  padding: 5px 15px 5px 10px; font-size: 11.5px; font-weight: 400;
  color: var(--text2); letter-spacing: 0.03em; margin-bottom: 40px;
  animation: fadeUp .6s .1s ease both;
}
.badge-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 3s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }
.hero-h1 {
  font-family: var(--ff-s); font-size: clamp(3.8rem, 7.4vw, 6.6rem);
  font-weight: 400; line-height: .96; letter-spacing: -0.035em;
  color: var(--text); margin-bottom: 30px; animation: fadeUp .9s .35s ease both;
}
.hero-h1 em { font-style: italic; color: rgba(255,255,255,.42); }
.hero-sub {
  font-size: 17px; font-weight: 300; color: var(--text2);
  max-width: 560px; line-height: 1.75; margin-bottom: 44px;
  animation: fadeUp .9s .5s ease both;
}
.hero-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; animation: fadeUp .9s .65s ease both; }
.hero-scroll { position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%); z-index: 2; display: flex; flex-direction: column; align-items: center; animation: fadeUp .9s 1s ease both; }
.hero-scroll-line { width: 1px; height: 48px; background: linear-gradient(180deg, rgba(255,255,255,.3), transparent); animation: scrollAnim 2.8s ease-in-out infinite; }
@keyframes scrollAnim { 0%,100%{opacity:.25;transform:scaleY(.5) translateY(-10px)} 50%{opacity:1;transform:scaleY(1) translateY(0)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

/* ═══════════════════════════════════════════
   OPENCLAW
═══════════════════════════════════════════ */
.oc-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 88px; align-items: center; }
.oc-text .t-display { margin-bottom: 20px; }
.oc-text .t-body { margin-bottom: 28px; max-width: 380px; }
.oc-detail { font-size: 12px; font-weight: 400; color: var(--text3); font-family: var(--ff-m); letter-spacing: 0.05em; }
.terminal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.terminal-bar { display: flex; align-items: center; gap: 7px; padding: 13px 18px; border-bottom: 1px solid var(--border); background: var(--card); }
.t-dot { width: 10px; height: 10px; border-radius: 50%; }
.t-dot-r { background: #FF5F57; } .t-dot-y { background: #FEBC2E; } .t-dot-g { background: #28C840; }
.terminal-path { font-family: var(--ff-m); font-size: 11px; color: var(--text3); margin-left: 10px; letter-spacing: 0.04em; }
.terminal-body { padding: 24px 26px 28px; font-family: var(--ff-m); font-size: 12.5px; font-weight: 300; line-height: 2; }
.t-prompt { color: var(--text3); } .t-cmd { color: var(--atext); } .t-ok { color: var(--green); }
.t-dim { color: var(--text3); } .t-val { color: var(--text2); }
.t-line { display: block; } .t-spacer { display: block; height: 0.4em; }
.t-divider { display: block; color: var(--text3); margin: 4px 0; }
.t-time { color: var(--text3); font-size: 11.5px; }

/* ═══════════════════════════════════════════
   ECOSYSTEM ROLES
═══════════════════════════════════════════ */
.roles-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 56px; }
.role-card { border: 1px solid var(--border); border-radius: 14px; padding: 24px 20px; transition: border-color .28s, background .28s; cursor: default; }
.role-card:hover { border-color: var(--border-a); background: rgba(75,115,255,0.04); }
.role-idx { font-family: var(--ff-m); font-size: 9.5px; color: var(--text3); letter-spacing: 0.1em; display: block; margin-bottom: 14px; }
.role-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 9px; letter-spacing: -0.01em; line-height: 1.3; }
.role-desc { font-size: 12px; font-weight: 300; color: var(--text2); line-height: 1.65; margin-bottom: 18px; }
.role-access { display: flex; flex-direction: column; gap: 5px; }
.role-access-item { font-family: var(--ff-m); font-size: 10.5px; color: var(--text3); letter-spacing: 0.02em; }
.role-access-item::before { content: '↳ '; color: var(--accent); opacity: .6; }

/* ═══════════════════════════════════════════
   CURRICULUM OVERVIEW (landing section)
═══════════════════════════════════════════ */
.curr-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 48px; gap: 24px; }
.curr-header-left .t-display { max-width: 420px; }
.curr-header-right .t-body { max-width: 280px; font-size: 14px; }
.semesters { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
.sem { border: 1px solid var(--border); border-radius: 12px; padding: 20px 16px; transition: border-color .22s; cursor: default; position: relative; overflow: hidden; }
.sem::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--accent); transform: scaleX(0); transition: transform .28s; transform-origin: left; }
.sem:hover { border-color: var(--border-a); }
.sem:hover::after { transform: scaleX(1); }
.sem-n { font-family: var(--ff-m); font-size: 9.5px; color: var(--text3); letter-spacing: 0.1em; display: block; margin-bottom: 12px; }
.sem-credits { font-family: var(--ff-s); font-size: 2.6rem; font-weight: 400; color: var(--text); line-height: 1; display: block; margin-bottom: 4px; }
.sem-label { font-size: 10.5px; font-weight: 300; color: var(--text2); }
.curr-footer { margin-top: 36px; display: flex; align-items: center; justify-content: space-between; padding-top: 28px; border-top: 1px solid var(--border); }
.curr-total { display: flex; align-items: baseline; gap: 8px; }
.curr-total-n { font-family: var(--ff-s); font-size: 2rem; color: var(--text); letter-spacing: -0.02em; }
.curr-total-l { font-size: 12px; color: var(--text2); font-weight: 300; }

/* ═══════════════════════════════════════════
   FULL CURRICULUM SECTION
═══════════════════════════════════════════ */
.prog-tabs { display: flex; gap: 8px; margin-bottom: 48px; overflow-x: auto; scrollbar-width: none; }
.prog-tabs::-webkit-scrollbar { display: none; }
.prog-tab {
  display: inline-flex; flex-direction: column; gap: 3px;
  padding: 12px 20px; border-radius: 12px; border: 1px solid var(--border);
  cursor: pointer; background: none; font-family: var(--ff);
  transition: all .22s; text-align: left; min-width: 160px; flex-shrink: 0;
}
.prog-tab:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.025); }
.prog-tab.active { border-color: var(--border-a); background: rgba(75,115,255,0.07); }
.prog-tab-label { font-size: 10px; font-family: var(--ff-m); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); transition: color .22s; }
.prog-tab.active .prog-tab-label { color: var(--atext); }
.prog-tab-name { font-size: 13px; font-weight: 500; color: var(--text2); line-height: 1.35; transition: color .22s; }
.prog-tab.active .prog-tab-name { color: var(--text); }

.curr-prog-title { font-family: var(--ff-s); font-size: clamp(1.5rem, 2.8vw, 2.2rem); font-weight: 400; color: var(--text); line-height: 1.25; letter-spacing: -0.015em; margin-bottom: 8px; }
.curr-prog-meta { font-size: 11px; font-weight: 300; color: var(--text3); font-family: var(--ff-m); letter-spacing: 0.08em; margin-bottom: 40px; display: block; }

.curr-table { width: 100%; border-collapse: collapse; }
.curr-table thead tr { border-bottom: 1px solid var(--border); }
.curr-table th { font-family: var(--ff-m); font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); padding: 0 0 16px 0; text-align: left; font-weight: 500; }
.curr-table th:last-child { text-align: right; }
.curr-table tbody tr { border-bottom: 1px solid var(--border); transition: background .15s; }
.curr-table tbody tr:last-child { border-bottom: none; }
.curr-table tbody tr:hover { background: rgba(75,115,255,0.025); }
.curr-table td { padding: 16px 0; vertical-align: top; }
.curr-td-sem { font-family: var(--ff-m); font-size: 10px; color: var(--text3); letter-spacing: 0.06em; white-space: nowrap; padding-right: 32px; padding-top: 18px; }
.curr-td-name { font-size: 14px; font-weight: 400; color: var(--text); line-height: 1.4; }
.curr-td-type { font-size: 11.5px; font-weight: 300; color: var(--text2); margin-top: 3px; }
.curr-td-sks { font-family: var(--ff-s); font-size: 1.4rem; color: var(--text); text-align: right; padding-top: 14px; letter-spacing: -0.02em; }
.curr-td-sks span { font-size: 11px; font-family: var(--ff); font-weight: 300; color: var(--text2); margin-left: 4px; }
.curr-sem-header td { padding-top: 32px; padding-bottom: 8px; }
.curr-sem-label { font-family: var(--ff-m); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); opacity: .7; }

/* ═══════════════════════════════════════════
   VISI MISI SECTION
═══════════════════════════════════════════ */
.vm-grid { display: grid; grid-template-columns: 5fr 6fr; gap: 100px; align-items: start; }
.visi-statement { font-family: var(--ff-s); font-style: italic; font-size: clamp(1.5rem, 2.8vw, 2.1rem); line-height: 1.48; color: var(--text); letter-spacing: -0.01em; margin-bottom: 32px; }
.visi-source { font-size: 12px; font-weight: 300; color: var(--text3); font-family: var(--ff-m); letter-spacing: 0.06em; text-transform: uppercase; }

/* Full visi-misi deep section */
.inst-selector { padding: 0 0 36px 0; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.inst-selector::-webkit-scrollbar { display: none; }
.inst-btn {
  display: inline-flex; flex-direction: column; gap: 3px;
  padding: 12px 20px; border-radius: 12px; border: 1px solid var(--border);
  cursor: pointer; background: none; font-family: var(--ff);
  transition: all .22s; text-align: left; min-width: 160px; flex-shrink: 0;
}
.inst-btn:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.025); }
.inst-btn.active { border-color: var(--border-a); background: rgba(75,115,255,0.07); }
.inst-btn-label { font-size: 10px; font-family: var(--ff-m); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); transition: color .22s; }
.inst-btn.active .inst-btn-label { color: var(--atext); }
.inst-btn-name { font-size: 13px; font-weight: 500; color: var(--text2); line-height: 1.35; transition: color .22s; }
.inst-btn.active .inst-btn-name { color: var(--text); }
.inst-fn-label { font-size: 11px; font-weight: 300; color: var(--text3); font-family: var(--ff-m); letter-spacing: 0.08em; margin-bottom: 8px; display: block; }
.inst-fn-name { font-family: var(--ff-s); font-size: clamp(1.5rem, 2.8vw, 2.2rem); font-weight: 400; color: var(--text); line-height: 1.25; letter-spacing: -0.015em; margin-bottom: 40px; }
.block-label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text3); font-family: var(--ff-m); display: block; margin-bottom: 28px; }
.visi-block { margin-bottom: 72px; padding-bottom: 72px; border-bottom: 1px solid var(--border); }
.visi-quote { font-family: var(--ff-s); font-style: italic; font-size: clamp(1.8rem, 3.5vw, 2.8rem); line-height: 1.4; color: var(--text); letter-spacing: -0.015em; max-width: 820px; position: relative; padding-left: 32px; }
.visi-quote::before { content: ''; position: absolute; left: 0; top: 0.2em; bottom: 0.2em; width: 2px; background: var(--accent); opacity: .5; border-radius: 2px; }
.vm-content-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 80px; }
.vm-block-title { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); font-family: var(--ff-m); display: block; margin-bottom: 28px; }
.misi-list { list-style: none; }
.misi-item { display: flex; gap: 22px; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid var(--border); }
.misi-item:last-child { border-bottom: none; }
.misi-idx { font-family: var(--ff-m); font-size: 10px; color: var(--text3); flex-shrink: 0; padding-top: 3px; min-width: 28px; }
.misi-text { font-size: 15px; font-weight: 300; color: var(--text2); line-height: 1.72; }
.tujuan-list { list-style: none; }
.tujuan-item { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid var(--border); }
.tujuan-item:last-child { border-bottom: none; }
.tujuan-arrow { font-family: var(--ff-m); font-size: 11px; color: var(--accent); opacity: .6; flex-shrink: 0; padding-top: 3px; }
.tujuan-text { font-size: 14px; font-weight: 300; color: var(--text2); line-height: 1.65; }

/* ═══════════════════════════════════════════
   ACADEMIC CALENDAR SECTION
═══════════════════════════════════════════ */
.cal-layout { display: grid; grid-template-columns: 1fr 280px; gap: 48px; align-items: flex-start; }
.cal-months { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.cal-month { border: 1px solid var(--border); border-radius: 14px; padding: 24px; background: var(--card); }
.cal-month-name { font-family: var(--ff-s); font-size: 1.05rem; font-weight: 400; color: var(--text); margin-bottom: 18px; letter-spacing: -0.01em; }
.cal-day-headers { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
.cal-day-hdr { font-family: var(--ff-m); font-size: 9px; text-align: center; color: var(--text3); padding: 4px 0; letter-spacing: 0.06em; }
.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-day { position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 5px; cursor: pointer; transition: background .14s; font-size: 11.5px; font-weight: 300; color: var(--text2); }
.cal-day:hover { background: rgba(255,255,255,0.04); }
.cal-day { cursor: default; }
.cal-day.has-event { color: var(--text); font-weight: 500; cursor: pointer; }
.cal-day.has-event:hover { background: rgba(75,115,255,0.08); }
.cal-day-dots { position: absolute; bottom: 1px; left: 50%; transform: translateX(-50%); display: flex; gap: 2px; }
.cal-dot { width: 3px; height: 3px; border-radius: 50%; }
.cal-sidebar { display: flex; flex-direction: column; gap: 16px; }
.cal-panel { border: 1px solid var(--border); border-radius: 14px; padding: 20px; background: var(--card); }
.cal-panel-title { font-family: var(--ff-m); font-size: 9.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); margin-bottom: 16px; display: block; }
.legend-list { list-style: none; }
.legend-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); }
.legend-item:last-child { border-bottom: none; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.legend-label { font-size: 12.5px; font-weight: 300; color: var(--text2); }
.sel-date-label { font-family: var(--ff-s); font-size: 1rem; font-weight: 400; color: var(--text); margin-bottom: 14px; line-height: 1.3; }
.sel-event-list { list-style: none; }
.sel-event { padding: 10px 0; border-bottom: 1px solid var(--border); }
.sel-event:last-child { border-bottom: none; }
.sel-event-type { font-family: var(--ff-m); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 3px; display: block; }
.sel-event-name { font-size: 12.5px; font-weight: 400; color: var(--text); line-height: 1.5; }
.sel-event-dates { font-size: 10.5px; color: var(--text2); margin-top: 3px; font-family: var(--ff-m); }
.upcoming-list { list-style: none; }
.upcoming-item { padding: 10px 0; border-bottom: 1px solid var(--border); }
.upcoming-item:last-child { border-bottom: none; }
.upcoming-name { font-size: 12.5px; font-weight: 300; color: var(--text2); line-height: 1.5; margin-bottom: 3px; }
.upcoming-date { font-family: var(--ff-m); font-size: 10px; color: var(--text3); }

/* ═══════════════════════════════════════════
   PLATFORM FEATURES
═══════════════════════════════════════════ */
.features-list { border-top: 1px solid var(--border); margin-top: 52px; }
.feat { display: grid; grid-template-columns: 1fr 1.4fr; gap: 80px; align-items: start; padding: 28px 0; border-bottom: 1px solid var(--border); transition: background .2s; }
.feat:hover { background: rgba(75,115,255,0.02); border-radius: 10px; }
.feat-name { font-size: 15px; font-weight: 500; color: var(--text); letter-spacing: -0.01em; line-height: 1.4; }
.feat-desc { font-size: 13.5px; font-weight: 300; color: var(--text2); line-height: 1.75; }

/* ═══════════════════════════════════════════
   STATS
═══════════════════════════════════════════ */
.stats-container { border: 1px solid var(--border); border-radius: 20px; overflow: hidden; display: grid; grid-template-columns: repeat(4, 1fr); }
.stat { padding: 52px 40px; border-right: 1px solid var(--border); }
.stat:last-child { border-right: none; }
.stat-n { font-family: var(--ff-s); font-size: 4rem; font-weight: 400; color: var(--text); line-height: 1; letter-spacing: -0.04em; display: block; margin-bottom: 10px; }
.stat-l { font-size: 13px; font-weight: 300; color: var(--text2); line-height: 1.55; max-width: 140px; }

/* ═══════════════════════════════════════════
   CTA
═══════════════════════════════════════════ */
.cta-section { text-align: center; padding: 118px 24px 112px; position: relative; overflow: hidden; }
.cta-glow { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 640px; height: 360px; background: radial-gradient(ellipse at 50% 100%, rgba(75,115,255,0.06), transparent 72%); pointer-events: none; }
.cta-overline { font-size: 10.5px; font-family: var(--ff-m); color: var(--text3); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 28px; display: block; }
.cta-h { font-family: var(--ff-s); font-size: clamp(3.2rem, 7vw, 6rem); font-weight: 400; letter-spacing: -0.04em; line-height: .97; color: var(--text); margin-bottom: 24px; position: relative; }
.cta-h em { font-style: italic; }
.cta-sub { font-size: 16px; font-weight: 300; color: var(--text2); max-width: 360px; margin: 0 auto 48px; line-height: 1.75; }

/* ═══════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════ */
.footer { border-top: 1px solid var(--border); padding: 64px 0 44px; }
.footer-grid { display: grid; grid-template-columns: 2.4fr 1fr 1fr 1fr; gap: 64px; margin-bottom: 52px; }
.footer-brand-name { font-size: 12.5px; font-weight: 600; color: var(--text); letter-spacing: 0.06em; display: block; margin-bottom: 14px; }
.footer-brand-desc { font-size: 13.5px; font-weight: 300; color: var(--text2); line-height: 1.75; max-width: 270px; margin-bottom: 28px; }
.footer-col-title { font-size: 11px; font-weight: 500; color: var(--text); letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 20px; }
.footer-links { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.footer-link { color: var(--text2); text-decoration: none; font-size: 13.5px; font-weight: 300; transition: color .18s; }
.footer-link:hover { color: var(--text); }
.footer-bottom { border-top: 1px solid var(--border); padding-top: 28px; display: flex; justify-content: space-between; align-items: center; }
.footer-copy { font-size: 12px; color: var(--text3); font-weight: 300; }
.footer-legal { display: flex; gap: 24px; }
.footer-legal a { font-size: 12px; color: var(--text3); text-decoration: none; transition: color .18s; }
.footer-legal a:hover { color: var(--text2); }

/* ═══════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════ */
@media (max-width: 1024px) {
  .oc-grid { grid-template-columns: 1fr; gap: 52px; }
  .roles-grid { grid-template-columns: repeat(3, 1fr); }
  .semesters { grid-template-columns: repeat(4, 1fr); }
  .vm-grid { grid-template-columns: 1fr; gap: 52px; }
  .cal-layout { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 44px; }
}
@media (max-width: 768px) {
  .w { padding: 0 24px; }
  .sec { padding: 84px 0; }
  .hero-h1 { font-size: clamp(3.2rem, 10vw, 5rem); }
  .hero-actions { flex-direction: column; align-items: flex-start; gap: 14px; }
  .roles-grid { grid-template-columns: 1fr 1fr; }
  .semesters { grid-template-columns: repeat(4, 1fr); }
  .curr-header { flex-direction: column; align-items: flex-start; }
  .feat { grid-template-columns: 1fr; gap: 8px; }
  .feat:hover { margin: 0; padding: 28px 0; }
  .stats-container { grid-template-columns: 1fr 1fr; }
  .stat { border-bottom: 1px solid var(--border); }
  .stat:nth-child(odd) { border-right: 1px solid var(--border); }
  .stat:nth-child(even) { border-right: none; }
  .stat:nth-last-child(-n+2) { border-bottom: none; }
  .vm-content-grid { grid-template-columns: 1fr; gap: 52px; }
  .cal-months { grid-template-columns: 1fr; }
}
@media (max-width: 580px) {
  .nav { left: 12px; right: 12px; transform: none; width: auto; }
  .nav-brand { display: none; }
  .nav-link { display: none; }
  .nav-enter { margin-left: 0; }
  .roles-grid { grid-template-columns: 1fr; }
  .semesters { grid-template-columns: repeat(2, 1fr); }
  .stats-container { grid-template-columns: 1fr; }
  .stat { border-right: none; border-bottom: 1px solid var(--border); }
  .stat:last-child { border-bottom: none; }
  .footer-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
}
@media (prefers-reduced-motion: reduce) {
  .rv, .fade-in, .hero-badge, .hero-h1, .hero-sub, .hero-actions, .hero-scroll, .badge-pulse, .hero-scan, .hero-scroll-line {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`

/* ─────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────── */
const roles = [
  { idx: '01', name: 'Mahasiswa',   desc: 'Full access to courses, tasks, and campus social feed.',         access: ['Materi & Tugas', 'Absensi QR', 'Feed Kampus', 'Pembayaran UKT'] },
  { idx: '02', name: 'Dosen',       desc: 'Teaching management with deep class control.',                   access: ['Upload Materi', 'Kelola Nilai', 'Monitor Absensi', 'Chat Mahasiswa'] },
  { idx: '03', name: 'Admin / BAK', desc: 'Institutional administration and financial oversight.',          access: ['Manajemen Akun', 'Pantau Pembayaran', 'Kontrol Akses', 'Laporan Sistem'] },
  { idx: '04', name: 'Orang Tua',   desc: 'Read-only monitoring for student performance.',                  access: ['Nilai & Absensi', 'Status UKT', 'Info Kampus'] },
  { idx: '05', name: 'UKM / Ormawa',desc: 'Campus organization tools and event publishing.',               access: ['Post Kegiatan', 'Feed Filter', 'Kolaborasi'] },
]

const semesters = [
  { n: 'SEM 01', credits: 21, courses: 8 },
  { n: 'SEM 02', credits: 21, courses: 8 },
  { n: 'SEM 03', credits: 21, courses: 8 },
  { n: 'SEM 04', credits: 21, courses: 8 },
  { n: 'SEM 05', credits: 21, courses: 7 },
  { n: 'SEM 06', credits: 20, courses: 6 },
  { n: 'SEM 07', credits: 20, courses: 6 },
  { n: 'SEM 08', credits: 4,  courses: 1 },
]

const visiData = {
  statement: 'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
  source: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
  misi: [
    'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
    'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
    'Pengabdian masyarakat dengan teknologi tepat guna.',
    'Membangun lingkungan akademik kondusif dan berbudaya inovasi.',
  ],
}

const features = [
  { name: 'OpenClaw Automation Engine',  desc: 'Automated notifications, reminders, and reporting delivered via Telegram. Zero manual intervention required from faculty.' },
  { name: 'QR-based Attendance',         desc: 'Students scan unique session QR codes. Attendance data syncs to faculty dashboards in real time.' },
  { name: 'Role-based Access Control',   desc: "JWT-secured endpoints with middleware validation. Every user sees only what they're authorized to access." },
  { name: 'Academic Social Feed',        desc: 'Campus-wide information channel with filtering by organization, department, or event type.' },
  { name: 'UKT Payment Tracking',        desc: 'Students view invoices, payment history, and outstanding balances. Parents get read-only visibility.' },
  { name: 'Transcript & Grade Archive',  desc: 'Full semester-by-semester academic record accessible to students and viewable by authorized staff.' },
  { name: 'Integrated Chat System',      desc: 'Direct messaging between students, faculty, and administration within the platform ecosystem.' },
  { name: 'Multi-platform Architecture', desc: 'React + Vite frontend, Golang REST backend, JWT auth layer. Built for stability, speed, and extensibility.' },
]

const stats = [
  { n: '5', label: 'Distinct user roles with granular access control' },
  { n: '8', label: 'Semesters of structured curriculum content' },
  { n: '∞', label: 'Automated workflows via OpenClaw engine' },
  { n: '1', label: 'Unified platform for every campus need' },
]

const footerLinks = {
  Platform: [
    { label: 'Kurikulum',        href: '#kurikulum'  },
    { label: 'Visi & Misi',      href: '#visi-misi'  },
    { label: 'Kalender Akademik',href: '#kalender'   },
    { label: 'Masuk',            href: '/login'      },
  ],
  Institusi: [
    { label: 'Tentang STT-NF',    href: '#' },
    { label: 'Teknik Informatika',href: '#' },
    { label: 'Sistem Informasi',  href: '#' },
    { label: 'Bisnis Digital',    href: '#' },
  ],
  Perusahaan: [
    { label: 'Tentang Kami', href: '#' },
    { label: 'Karir',        href: '#' },
    { label: 'Blog',         href: '#' },
    { label: 'Kontak',       href: '#' },
  ],
}

/* ── CURRICULUM DATA ── */
const programs = {
  ti: {
    abbr: 'TI', label: 'Teknik Informatika',
    fullName: 'Program Studi Teknik Informatika',
    totalSks: 149,
    courses: [
      { sem: 1, name: 'Kalkulus',                     type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Fisika Dasar',                  type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Algoritma & Pemrograman',       type: 'Wajib',   sks: 4 },
      { sem: 1, name: 'Logika Matematika',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pendidikan Agama',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Bahasa Inggris I',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pancasila & Kewarganegaraan',   type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Struktur Data',                 type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Pemrograman Berorientasi Objek',type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Matematika Diskret',            type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Basis Data',                    type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Statistika Dasar',              type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Bahasa Inggris II',             type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Kewirausahaan',                 type: 'Umum',    sks: 2 },
      { sem: 3, name: 'Rekayasa Perangkat Lunak',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Jaringan Komputer',             type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Sistem Operasi',                type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Pemrograman Web',               type: 'Wajib',   sks: 4 },
      { sem: 3, name: 'Analisis & Desain Sistem',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Aljabar Linear',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Arsitektur & Organisasi Komputer', type: 'Wajib', sks: 3 },
      { sem: 4, name: 'Pemrograman Mobile',            type: 'Wajib',   sks: 4 },
      { sem: 4, name: 'Keamanan Siber',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Kecerdasan Buatan',             type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Manajemen Proyek TI',           type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Etika Profesi',                 type: 'Umum',    sks: 2 },
      { sem: 5, name: 'Machine Learning',              type: 'Wajib',   sks: 4 },
      { sem: 5, name: 'Cloud Computing',               type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Pengembangan Aplikasi Enterprise', type: 'Wajib', sks: 4 },
      { sem: 5, name: 'Metodologi Penelitian',         type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan II',        type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Big Data & Analytics',          type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'DevOps & Automation',           type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan III',       type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan IV',        type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 7, name: 'Mata Kuliah Pilihan V',         type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Mata Kuliah Pilihan VI',        type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Pengabdian Masyarakat',         type: 'Wajib',   sks: 3 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
  si: {
    abbr: 'SI', label: 'Sistem Informasi',
    fullName: 'Program Studi Sistem Informasi',
    totalSks: 144,
    courses: [
      { sem: 1, name: 'Pengantar Sistem Informasi',    type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Algoritma & Pemrograman',       type: 'Wajib',   sks: 4 },
      { sem: 1, name: 'Matematika Bisnis',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Pendidikan Agama',              type: 'Umum',    sks: 2 },
      { sem: 1, name: 'Bahasa Inggris I',              type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Basis Data',                    type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Pemrograman Web',               type: 'Wajib',   sks: 4 },
      { sem: 2, name: 'Analisis Proses Bisnis',        type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Statistika',                    type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Analisis & Desain Sistem',      type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'ERP & Sistem Bisnis',           type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Manajemen Data',                type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Keamanan Sistem Informasi',     type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Business Intelligence',         type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Manajemen Proyek SI',           type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Data Warehouse',                type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 6, name: 'Mata Kuliah Pilihan II',        type: 'Pilihan', sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
  bd: {
    abbr: 'BD', label: 'Bisnis Digital',
    fullName: 'Program Studi Bisnis Digital',
    totalSks: 144,
    courses: [
      { sem: 1, name: 'Pengantar Bisnis Digital',      type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Dasar Pemrograman',             type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Ekonomi Mikro',                 type: 'Wajib',   sks: 3 },
      { sem: 1, name: 'Bahasa Indonesia',              type: 'Umum',    sks: 2 },
      { sem: 2, name: 'Digital Marketing',             type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'E-Commerce',                    type: 'Wajib',   sks: 3 },
      { sem: 2, name: 'Basis Data Bisnis',             type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Manajemen Platform Digital',    type: 'Wajib',   sks: 3 },
      { sem: 3, name: 'Analitik Bisnis',               type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'Strategi Transformasi Digital', type: 'Wajib',   sks: 3 },
      { sem: 4, name: 'UI/UX Design',                  type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Startup & Inovasi',             type: 'Wajib',   sks: 3 },
      { sem: 5, name: 'Mata Kuliah Pilihan I',         type: 'Pilihan', sks: 3 },
      { sem: 6, name: 'Kerja Praktik',                 type: 'Wajib',   sks: 3 },
      { sem: 7, name: 'Seminar Tugas Akhir',           type: 'Wajib',   sks: 2 },
      { sem: 8, name: 'Tugas Akhir',                   type: 'Wajib',   sks: 4 },
    ],
  },
}

/* ── VISI-MISI DATA ── */
const institutions = {
  'stt-nf': {
    key: 'stt-nf', abbr: 'STT-NF',
    fullName: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
    visi: 'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
      'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
      'Pengabdian masyarakat dengan teknologi tepat guna.',
      'Membangun lingkungan akademik kondusif dan berbudaya inovasi.',
    ],
    tujuan: [
      'Menghasilkan sarjana kompeten, profesional, dan berakhlak mulia.',
      'Menghasilkan karya ilmiah inovatif dan terbuka (open source & open access).',
      'Menerapkan IPTEK tepat guna bagi masyarakat.',
      'Membangun kultur akademik inovatif dan kompetitif.',
    ],
  },
  ti: {
    key: 'ti', abbr: 'TI',
    fullName: 'Program Studi Teknik Informatika',
    visi: 'Pada tahun 2045 menjadi program studi teknik informatika yang unggul, berbudaya inovasi, dan berkarakter religius.',
    misi: [
      'Menyelenggarakan pendidikan teknik informatika berkualitas.',
      'Melaksanakan penelitian berorientasi teknologi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Menghasilkan sarjana TI profesional dan berakhlak mulia.',
      'Melahirkan karya ilmiah terbuka & inovatif di bidang TI.',
      'Menerapkan teknologi tepat guna bagi masyarakat.',
    ],
  },
  si: {
    key: 'si', abbr: 'SI',
    fullName: 'Program Studi Sistem Informasi',
    visi: 'Pada tahun 2045 menjadi program studi sistem informasi yang unggul, inovatif, dan religius.',
    misi: [
      'Pendidikan berkualitas bidang Sistem Informasi.',
      'Penelitian inovatif dan berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi tepat guna.',
      'Membangun budaya akademik inovatif dan mandiri.',
    ],
    tujuan: [
      'Lulusan kompeten & profesional di bidang Sistem Informasi.',
      'Karya ilmiah terbuka dan inovatif.',
      'Implementasi teknologi tepat guna bagi masyarakat.',
    ],
  },
  bd: {
    key: 'bd', abbr: 'BD',
    fullName: 'Program Studi Bisnis Digital',
    visi: 'Pada tahun 2045 menjadi program studi bisnis digital yang unggul, inovatif, dan berkarakter religius.',
    misi: [
      'Pendidikan berkualitas bidang bisnis digital.',
      'Penelitian inovatif berorientasi masa depan.',
      'Pengabdian masyarakat berbasis teknologi bisnis.',
      'Membangun budaya akademik inovatif.',
    ],
    tujuan: [
      'Lulusan profesional & berakhlak mulia.',
      'Karya ilmiah di bidang bisnis digital.',
      'Penerapan teknologi tepat guna untuk masyarakat.',
    ],
  },
}

/* ── CALENDAR DATA ── */
const academicCalendar = [
  { date: '2025-08-13',                        event: 'Dies Natalis STT NF',                              type: 'event'     },
  { date: '2025-09-08', endDate: '2025-09-13', event: 'Bimbingan Akademik (PA) 1',                       type: 'academic'  },
  { date: '2025-09-15', endDate: '2025-09-20', event: 'Orientasi Akademik Mahasiswa Baru 2025',          type: 'important' },
  { date: '2025-09-15', endDate: '2025-09-20', event: 'Isi KRS Mahasiswa Semester Ganjil',               type: 'academic'  },
  { date: '2025-09-15', endDate: '2025-09-30', event: 'Pengajuan Cuti Kuliah',                           type: 'academic'  },
  { date: '2025-09-22',                        event: 'Kuliah Perdana Semester Ganjil',                   type: 'important' },
  { date: '2025-09-22', endDate: '2025-11-08', event: 'Perkuliahan Pekan Ke-1 s.d Ke-7',                type: 'academic'  },
  { date: '2025-10-07',                        event: 'Kuliah Umum',                                      type: 'event'     },
  { date: '2025-10-15',                        event: 'Pengumuman Dosen Pembimbing Tugas Akhir',          type: 'academic'  },
  { date: '2025-11-10', endDate: '2025-11-15', event: 'Pelaksanaan UTS dan Ujian Tugas Akhir',           type: 'exam'      },
  { date: '2026-01-12', endDate: '2026-01-17', event: 'Pelaksanaan UAS',                                  type: 'exam'      },
  { date: '2026-01-19', endDate: '2026-01-24', event: 'Pelaksanaan Sidang TA Ganjil',                    type: 'exam'      },
  { date: '2026-02-06',                        event: 'Pengumuman Yudisium',                              type: 'important' },
]

const calendarMonths = [
  { name: 'Agustus 2025',   year: 2025, month: 7  },
  { name: 'September 2025', year: 2025, month: 8  },
  { name: 'Oktober 2025',   year: 2025, month: 9  },
  { name: 'November 2025',  year: 2025, month: 10 },
  { name: 'Desember 2025',  year: 2025, month: 11 },
  { name: 'Januari 2026',   year: 2026, month: 0  },
  { name: 'Februari 2026',  year: 2026, month: 1  },
]

const EVENT_COLORS = { important: '#4B73FF', exam: '#F97316', event: '#A78BFA', academic: '#8BA4FF' }
const EVENT_LABELS = { important: 'Penting', exam: 'Ujian', event: 'Acara', academic: 'Akademik' }

/* ── CALENDAR HELPER ── */
function getEventsForDate(date) {
  return academicCalendar.filter(ev => {
    const start = new Date(ev.date)
    if (ev.endDate) return date >= start && date <= new Date(ev.endDate)
    return date.toDateString() === start.toDateString()
  })
}
function fmtDate(str) {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  /* Scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) } }),
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.rv').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* Curriculum state */
  const [activeProg, setActiveProg] = useState('ti')

  /* Visi-Misi state */
  const [activeInst, setActiveInst] = useState('stt-nf')
  const inst = institutions[activeInst]

  /* Calendar state */
  const [selectedDate, setSelectedDate] = useState(null)

  /* Curriculum helpers */
  const prog = programs[activeProg]
  const semNumbers = [...new Set(prog.courses.map(c => c.sem))].sort((a, b) => a - b)

  return (
    <>
      <style>{CSS}</style>
      <div className="lp">

        {/* ═════════ NAV ═════════ */}
        <nav className="nav">
          <span className="nav-brand">NF STUDENTHUB</span>
          <a href="#platform"    className="nav-link">Platform</a>
          <a href="#kurikulum"   className="nav-link">Kurikulum</a>
          <a href="#visi-misi"   className="nav-link">Visi Misi</a>
          <a href="#kalender"    className="nav-link">Kalender</a>
          <Link to="/login" className="nav-enter">Masuk</Link>
        </nav>

        {/* ═════════ HERO ═════════ */}
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-fog" />
          <div className="hero-bottom" />
          <div className="hero-scan" />
          <div className="hero-inner w" style={{ width: '100%' }}>
            <div className="hero-badge">
              <span className="badge-pulse" />
              Academic Management Platform · Powered by OpenClaw
            </div>
            <h1 className="hero-h1">
              Academic intelligence,<br />
              <em>automated.</em>
            </h1>
            <p className="hero-sub">
              NF StudentHub brings learning, administration, and communication
              together — with OpenClaw handling everything in between.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn-prim">Enter Platform →</Link>
              <a href="#platform" className="btn-ghost">See how it works <span className="arr">→</span></a>
            </div>
          </div>
          <div className="hero-scroll"><div className="hero-scroll-line" /></div>
        </section>

        {/* ═════════ 01 — OPENCLAW ═════════ */}
        <hr className="sep" />
        <section id="platform" className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>01</span> Automation Engine</div>
            <div className="oc-grid">
              <div className="oc-text rv d1">
                <h2 className="t-display" style={{ marginBottom: '20px' }}>
                  OpenClaw handles<br /><em>the repetitive.</em>
                </h2>
                <p className="t-body" style={{ marginBottom: '28px', maxWidth: '380px' }}>
                  OpenClaw is the automation layer beneath NF StudentHub. It synchronizes
                  assignments, dispatches Telegram reminders, monitors attendance, and
                  generates reports — automatically, every session.
                </p>
                <p className="oc-detail">RUNS ON GOLANG · REST API · TELEGRAM GATEWAY</p>
              </div>
              <div className="rv d2">
                <div className="terminal">
                  <div className="terminal-bar">
                    <span className="t-dot t-dot-r" /><span className="t-dot t-dot-y" /><span className="t-dot t-dot-g" />
                    <span className="terminal-path">~ / openclaw / automation</span>
                  </div>
                  <div className="terminal-body">
                    <span className="t-line"><span className="t-prompt">$ </span><span className="t-cmd">openclaw run --session morning-sync</span></span>
                    <span className="t-spacer" />
                    <span className="t-line"><span className="t-ok">✓ </span><span className="t-val">247 students notified via Telegram</span></span>
                    <span className="t-line"><span className="t-ok">✓ </span><span className="t-val">12 new assignments synced to feed</span></span>
                    <span className="t-line"><span className="t-ok">✓ </span><span className="t-val">Attendance QR codes generated (18 classes)</span></span>
                    <span className="t-line"><span className="t-ok">✓ </span><span className="t-val">UKT reminders dispatched (34 students)</span></span>
                    <span className="t-line"><span className="t-ok">✓ </span><span className="t-val">Daily digest compiled and sent</span></span>
                    <span className="t-spacer" />
                    <span className="t-divider">───────────────────────────────</span>
                    <span className="t-line"><span className="t-time">completed in 0.84s · 0 errors · next run in 6h</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ 02 — ECOSYSTEM ═════════ */}
        <hr className="sep" />
        <section className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>02</span> Academic Ecosystem</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '32px' }} className="rv d1">
              <h2 className="t-display">Built for<br /><em>everyone on campus.</em></h2>
              <p className="t-body" style={{ maxWidth: '320px', fontSize: '14px', paddingBottom: '8px' }}>
                Five distinct roles. One shared platform. Every access level precisely controlled at the backend.
              </p>
            </div>
            <div className="roles-grid">
              {roles.map((r, i) => (
                <div key={r.idx} className={`role-card rv d${Math.min(i + 1, 3)}`}>
                  <span className="role-idx">{r.idx}</span>
                  <div className="role-name">{r.name}</div>
                  <div className="role-desc">{r.desc}</div>
                  <div className="role-access">
                    {r.access.map(a => <span key={a} className="role-access-item">{a}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════ 03 — CURRICULUM OVERVIEW ═════════ */}
        <hr className="sep" />
        <section className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>03</span> Curriculum Structure</div>
            <div className="curr-header rv d1">
              <div className="curr-header-left">
                <h2 className="t-display">8 semesters.<br /><em>One clear path.</em></h2>
              </div>
              <div className="curr-header-right">
                <p className="t-body" style={{ fontSize: '14px' }}>
                  Teknik Informatika curriculum — structured from fundamentals to capstone project.
                </p>
              </div>
            </div>
            <div className="semesters rv d2">
              {semesters.map(s => (
                <div key={s.n} className="sem">
                  <span className="sem-n">{s.n}</span>
                  <span className="sem-credits">{s.credits}</span>
                  <span className="sem-label">SKS · {s.courses} MK</span>
                </div>
              ))}
            </div>
            <div className="curr-footer rv d3">
              <div className="curr-total">
                <span className="curr-total-n">149</span>
                <span className="curr-total-l">Total SKS</span>
              </div>
              <a href="#kurikulum" className="btn-ghost" style={{ color: 'var(--atext)', fontWeight: 500 }}>
                View full curriculum <span className="arr">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ═════════ 04 — FULL CURRICULUM ═════════ */}
        <hr className="sep" />
        <section id="kurikulum" className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>04</span> Kurikulum Lengkap</div>
            <div className="rv d1" style={{ marginBottom: '48px' }}>
              <h2 className="t-display" style={{ marginBottom: '16px' }}>
                Struktur mata kuliah<br /><em>per program studi.</em>
              </h2>
              <p className="t-body" style={{ fontSize: '14px', maxWidth: '480px' }}>
                Kurikulum terstruktur dari semester 1 hingga tugas akhir, mencakup mata kuliah wajib, umum, dan pilihan.
              </p>
            </div>

            {/* Program tabs */}
            <div className="prog-tabs rv d2">
              {Object.values(programs).map(p => (
                <button
                  key={p.abbr}
                  className={`prog-tab${activeProg === p.abbr.toLowerCase() ? ' active' : ''}`}
                  onClick={() => setActiveProg(p.abbr.toLowerCase())}
                >
                  <span className="prog-tab-label">{p.abbr}</span>
                  <span className="prog-tab-name">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Program detail */}
            <div key={activeProg} className="fade-in">
              <div className="curr-prog-title">{prog.fullName}</div>
              <span className="curr-prog-meta">Total {prog.totalSks} SKS · {prog.courses.length} Mata Kuliah</span>

              <table className="curr-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Sem</th>
                    <th>Mata Kuliah</th>
                    <th>SKS</th>
                  </tr>
                </thead>
                <tbody>
                  {semNumbers.map(sem => (
                    <>
                      <tr key={`sem-hdr-${sem}`} className="curr-sem-header">
                        <td colSpan={3}>
                          <span className="curr-sem-label">SEMESTER {sem}</span>
                        </td>
                      </tr>
                      {prog.courses.filter(c => c.sem === sem).map((c, i) => (
                        <tr key={`${sem}-${i}`}>
                          <td className="curr-td-sem">–</td>
                          <td>
                            <div className="curr-td-name">{c.name}</div>
                            <div className="curr-td-type">{c.type}</div>
                          </td>
                          <td className="curr-td-sks">{c.sks}<span>SKS</span></td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═════════ 05 — VISION & MISSION PREVIEW ═════════ */}
        <hr className="sep" />
        <section className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>05</span> Vision & Mission</div>
            <div className="vm-grid">
              <div className="rv d1">
                <p className="visi-statement">"{visiData.statement}"</p>
                <p className="visi-source">{visiData.source}</p>
              </div>
              <div className="rv d2">
                <ul className="misi-list">
                  {visiData.misi.map((m, i) => (
                    <li key={i} className="misi-item">
                      <span className="misi-idx">0{i + 1}</span>
                      <span className="misi-text">{m}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '28px' }}>
                  <a href="#visi-misi" className="btn-ghost" style={{ color: 'var(--atext)', fontWeight: 500 }}>
                    See all institutional vision <span className="arr">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ 06 — FULL VISI MISI ═════════ */}
        <hr className="sep" />
        <section id="visi-misi" className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>06</span> Visi &amp; Misi Lengkap</div>
            <div className="rv d1" style={{ marginBottom: '48px' }}>
              <h2 className="t-display" style={{ marginBottom: '16px' }}>
                Institusi &amp; <em>program studi.</em>
              </h2>
              <p className="t-body" style={{ fontSize: '14px', maxWidth: '480px' }}>
                Integritas, inovasi, dan karakter religius sebagai fondasi membangun generasi teknologi unggul Indonesia 2045.
              </p>
            </div>

            {/* Institution selector */}
            <div className="inst-selector rv d2">
              {Object.values(institutions).map(i => (
                <button
                  key={i.key}
                  className={`inst-btn${activeInst === i.key ? ' active' : ''}`}
                  onClick={() => setActiveInst(i.key)}
                >
                  <span className="inst-btn-label">{i.abbr}</span>
                  <span className="inst-btn-name">{i.fullName.split(' ').slice(0, 3).join(' ')}</span>
                </button>
              ))}
            </div>

            {/* Institution content */}
            <div key={activeInst} className="fade-in">
              <span className="inst-fn-label">Institusi / Program Studi</span>
              <div className="inst-fn-name">{inst.fullName}</div>

              <div className="visi-block">
                <span className="block-label">Visi</span>
                <blockquote className="visi-quote">{inst.visi}</blockquote>
              </div>

              <div className="vm-content-grid">
                <div>
                  <span className="vm-block-title">Misi</span>
                  <ul className="misi-list">
                    {inst.misi.map((m, i) => (
                      <li key={i} className="misi-item">
                        <span className="misi-idx">0{i + 1}</span>
                        <span className="misi-text">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="vm-block-title">Tujuan</span>
                  <ul className="tujuan-list">
                    {inst.tujuan.map((t, i) => (
                      <li key={i} className="tujuan-item">
                        <span className="tujuan-arrow">→</span>
                        <span className="tujuan-text">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ 07 — ACADEMIC CALENDAR ═════════ */}
        <hr className="sep" />
        <section id="kalender" className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>07</span> Kalender Akademik</div>
            <div className="rv d1" style={{ marginBottom: '52px' }}>
              <h2 className="t-display" style={{ marginBottom: '16px' }}>
                Semester Ganjil<br /><em>2025 / 2026.</em>
              </h2>
              <p className="t-body" style={{ fontSize: '14px', maxWidth: '480px' }}>
                Jadwal lengkap kegiatan akademik. Klik tanggal untuk melihat detail kegiatan.
              </p>
            </div>

            <div className="cal-layout rv d2">
              {/* Calendar months */}
              <div className="cal-months">
                {calendarMonths.map(m => {
                  const firstDay = new Date(m.year, m.month, 1).getDay()
                  const daysInMonth = new Date(m.year, m.month + 1, 0).getDate()
                  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
                  return (
                    <div key={m.name} className="cal-month">
                      <div className="cal-month-name">{m.name}</div>
                      <div className="cal-day-headers">
                        {['M','S','S','R','K','J','S'].map((d, i) => <div key={i} className="cal-day-hdr">{d}</div>)}
                      </div>
                      <div className="cal-days">
                        {cells.map((day, i) => {
                          if (day === null) return <div key={i} />
                          const date = new Date(m.year, m.month, day)
                          const evs  = getEventsForDate(date)
                          return (
                            <div
                              key={i}
                              className={`cal-day${evs.length ? ' has-event' : ''}`}
                              onClick={() => evs.length && setSelectedDate({ date, events: evs })}
                              title={evs.map(e => e.event).join(', ') || undefined}
                            >
                              {day}
                              {evs.length > 0 && (
                                <div className="cal-day-dots">
                                  {evs.slice(0, 3).map((ev, j) => (
                                    <div key={j} className="cal-dot" style={{ background: EVENT_COLORS[ev.type] }} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sidebar */}
              <div className="cal-sidebar">
                {/* Legend */}
                <div className="cal-panel">
                  <span className="cal-panel-title">Keterangan</span>
                  <ul className="legend-list">
                    {Object.entries(EVENT_LABELS).map(([type, label]) => (
                      <li key={type} className="legend-item">
                        <div className="legend-dot" style={{ background: EVENT_COLORS[type] }} />
                        <span className="legend-label">{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selected date detail */}
                {selectedDate && (
                  <div className="cal-panel">
                    <span className="cal-panel-title">Detail</span>
                    <div className="sel-date-label">
                      {selectedDate.date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <ul className="sel-event-list">
                      {selectedDate.events.map((ev, i) => (
                        <li key={i} className="sel-event">
                          <span className="sel-event-type">{EVENT_LABELS[ev.type]}</span>
                          <div className="sel-event-name">{ev.event}</div>
                          <div className="sel-event-dates">
                            {ev.endDate ? `${fmtDate(ev.date)} — ${fmtDate(ev.endDate)}` : fmtDate(ev.date)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming */}
                <div className="cal-panel">
                  <span className="cal-panel-title">Agenda</span>
                  <ul className="upcoming-list">
                    {academicCalendar.slice(0, 6).map((ev, i) => (
                      <li key={i} className="upcoming-item">
                        <div className="upcoming-name">{ev.event}</div>
                        <div className="upcoming-date">
                          {ev.endDate ? `${fmtDate(ev.date)} — ${fmtDate(ev.endDate)}` : fmtDate(ev.date)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ 08 — PLATFORM FEATURES ═════════ */}
        <hr className="sep" />
        <section className="sec">
          <div className="w">
            <div className="sec-eyebrow rv"><span>08</span> Platform Features</div>
            <div className="rv d1">
              <h2 className="t-display" style={{ maxWidth: '480px' }}>
                Everything your campus needs.<br /><em>Nothing it doesn't.</em>
              </h2>
            </div>
            <div className="features-list rv d2">
              {features.map(f => (
                <div key={f.name} className="feat">
                  <div className="feat-name">{f.name}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════ 09 — STATS ═════════ */}
        <hr className="sep" />
        <section className="sec">
          <div className="w">
            <div className="stats-container rv">
              {stats.map(s => (
                <div key={s.n} className="stat">
                  <span className="stat-n">{s.n}</span>
                  <p className="stat-l">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════ CTA ═════════ */}
        <hr className="sep" />
        <div className="cta-section rv">
          <div className="cta-glow" />
          <span className="cta-overline">NF StudentHub · Academic Platform</span>
          <h2 className="cta-h">Start with your<br />campus <em>today.</em></h2>
          <p className="cta-sub">Join institutions already running on NF StudentHub. Setup takes minutes, not months.</p>
          <Link to="/login" className="btn-prim" style={{ fontSize: '14px', padding: '13px 28px' }}>
            Enter Platform →
          </Link>
        </div>

        {/* ═════════ FOOTER ═════════ */}
        <footer className="footer">
          <div className="w">
            <div className="footer-grid">
              <div>
                <span className="footer-brand-name">NF STUDENTHUB</span>
                <p className="footer-brand-desc">
                  Academic infrastructure for the modern campus. Powered by OpenClaw automation.
                  Built for institutions that take education seriously.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <a href="#" className="footer-link" style={{ fontSize: '12px' }}>Twitter</a>
                  <a href="#" className="footer-link" style={{ fontSize: '12px' }}>Instagram</a>
                  <a href="#" className="footer-link" style={{ fontSize: '12px' }}>LinkedIn</a>
                </div>
              </div>
              {Object.entries(footerLinks).map(([col, links]) => (
                <div key={col}>
                  <span className="footer-col-title">{col}</span>
                  <ul className="footer-links">
                    {links.map(l => <li key={l.label}><a href={l.href} className="footer-link">{l.label}</a></li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="footer-bottom">
              <span className="footer-copy">© {new Date().getFullYear()} NF StudentHub. All rights reserved.</span>
              <div className="footer-legal">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}