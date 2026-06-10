#!/usr/bin/env node
/**
 * VaxPlan Documentation Site Builder
 * Generates docs-site/index.html from docs/USER_GUIDE.md
 * Run: node docs-site/build.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Read source markdown files
const userGuide = fs.readFileSync(path.join(root, "docs/USER_GUIDE.md"), "utf8");
const quickstart = fs.readFileSync(path.join(root, "docs/QUICKSTART_FACILITY.md"), "utf8");

// ─── Tiny Markdown → HTML converter (no deps) ─────────────────────────────
function mdToHtml(md) {
  return md
    // code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="code-block"><code class="language-${lang}">${esc(code.trim())}</code></pre>`)
    // headings
    .replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
      const level = hashes.length;
      const id = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      return `<h${level} id="${id}">${text}</h${level}>`;
    })
    // blockquotes
    .replace(/^>\s?(.+)$/gm, "<blockquote>$1</blockquote>")
    // horizontal rules
    .replace(/^---$/gm, "<hr>")
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // unordered list items
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    // ordered list items
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // wrap li groups in ul
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
    // paragraphs (lines not starting with block elements)
    .replace(/^(?!<[hupbol]|<pre|<blockquote|<hr)(.+)$/gm, "<p>$1</p>")
    // clean up empty paragraphs
    .replace(/<p><\/p>/g, "")
    .replace(/<p>\s*<\/p>/g, "");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Extract sections from USER_GUIDE.md ──────────────────────────────────
function extractSections(md) {
  const lines = md.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)(?:\s*$)/);
    if (h2) {
      if (current) sections.push(current);
      const title = h2[1];
      const id = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      current = { id, title, body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  if (current) sections.push(current);
  return sections.filter(s => !/table of contents/i.test(s.title));
}

const sections = extractSections(userGuide);

// ─── Build sidebar nav ────────────────────────────────────────────────────
const navItems = sections.map(s =>
  `<li><a href="#${s.id}" class="nav-link" onclick="navigate('${s.id}')">${s.title}</a></li>`
).join("\n");

// ─── Build content sections ───────────────────────────────────────────────
const contentSections = sections.map(s =>
  `<section id="${s.id}" class="doc-section">
    <h2>${s.title}</h2>
    ${mdToHtml(s.body)}
  </section>`
).join("\n");

// ─── Build quickstart section ─────────────────────────────────────────────
const quickstartHtml = mdToHtml(quickstart);

// ─── Current date ─────────────────────────────────────────────────────────
const buildDate = new Date().toISOString().slice(0, 10);

// ─── Full HTML ────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VaxPlan Documentation — Reference Manual</title>
  <meta name="description" content="Complete reference manual for VaxPlan — the GIS-powered health microplanning platform for Ministries of Health.">
  <meta name="keywords" content="VaxPlan, microplanning, immunization, vaccination, GIS, health, WHO, UNICEF">
  <meta property="og:title" content="VaxPlan Documentation">
  <meta property="og:description" content="Reference manual for the VaxPlan health microplanning platform.">
  <meta property="og:url" content="https://doc.vaxplan.org">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --bg-card: #1e293b;
      --bg-sidebar: #0f172a;
      --border: #334155;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-light: #60a5fa;
      --accent: #0ea5e9;
      --green: #22c55e;
      --sidebar-width: 280px;
      --header-height: 60px;
    }
    .light {
      --bg: #f8fafc;
      --bg-card: #ffffff;
      --bg-sidebar: #f1f5f9;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 15px;
      transition: background 0.2s, color 0.2s;
    }

    /* ── Header ─────────────────────────────────────────── */
    header {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: var(--header-height);
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .header-logo {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #3b82f6, #0ea5e9);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      color: white;
      font-weight: 700;
      flex-shrink: 0;
    }
    .header-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .header-subtitle {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 400;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: var(--text-muted);
      min-width: 200px;
      transition: border-color 0.2s;
    }
    .search-box:focus-within { border-color: var(--primary); }
    .search-box input {
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 0.85rem;
      width: 100%;
      outline: none;
    }
    .search-box input::placeholder { color: var(--text-muted); }
    .btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 1rem;
      transition: all 0.2s;
    }
    .btn-icon:hover { background: var(--bg-card); color: var(--text); border-color: var(--primary); }
    .btn-pdf {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.4rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s, transform 0.15s;
      cursor: pointer;
    }
    .btn-pdf:hover { opacity: 0.9; transform: translateY(-1px); }

    /* ── Layout ──────────────────────────────────────────── */
    .layout {
      display: flex;
      margin-top: var(--header-height);
      min-height: calc(100vh - var(--header-height));
    }

    /* ── Sidebar ─────────────────────────────────────────── */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      position: fixed;
      top: var(--header-height);
      bottom: 0;
      left: 0;
      overflow-y: auto;
      padding: 1.5rem 0;
      transition: transform 0.3s;
      z-index: 50;
    }
    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .sidebar-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 0 1.25rem 0.5rem;
      margin-top: 0.75rem;
    }
    .sidebar nav ul {
      list-style: none;
      padding: 0 0.75rem;
    }
    .sidebar nav ul li { margin: 1px 0; }
    .nav-link {
      display: block;
      padding: 0.45rem 0.75rem;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 400;
      transition: all 0.15s;
      line-height: 1.4;
    }
    .nav-link:hover { background: var(--bg-card); color: var(--text); }
    .nav-link.active {
      background: rgba(59,130,246,0.15);
      color: var(--primary-light);
      font-weight: 600;
    }

    /* ── Main content ────────────────────────────────────── */
    .main {
      margin-left: var(--sidebar-width);
      flex: 1;
      padding: 2.5rem 3rem;
      max-width: 860px;
    }

    /* ── Search overlay ──────────────────────────────────── */
    .search-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 200;
      backdrop-filter: blur(4px);
    }
    .search-overlay.open { display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; }
    .search-modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 90%;
      max-width: 620px;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .search-modal-input {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }
    .search-modal-input input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      font-size: 1rem;
    }
    .search-results {
      max-height: 400px;
      overflow-y: auto;
      padding: 0.5rem;
    }
    .search-result {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .search-result:hover { background: var(--bg); }
    .search-result-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.2rem;
    }
    .search-result-snippet {
      font-size: 0.78rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .search-empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    /* ── Documentation typography ────────────────────────── */
    .doc-section {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    .doc-section:last-child { border-bottom: none; }
    .doc-section h2 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
      margin-bottom: 1.25rem;
      padding-top: 0.5rem;
      background: linear-gradient(135deg, var(--primary-light), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.6rem; color: var(--text); }
    h4 { font-size: 0.95rem; font-weight: 600; margin: 1rem 0 0.4rem; color: var(--text-muted); }
    p { margin-bottom: 0.85rem; color: var(--text); line-height: 1.75; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 0.85rem; }
    li { margin-bottom: 0.35rem; color: var(--text); line-height: 1.65; }
    li::marker { color: var(--primary); }
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82em;
      background: rgba(59,130,246,0.12);
      color: var(--primary-light);
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    pre.code-block {
      background: #0a0e1a;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    pre.code-block code {
      background: transparent;
      color: #e2e8f0;
      padding: 0;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    blockquote {
      border-left: 3px solid var(--primary);
      padding: 0.75rem 1.25rem;
      margin: 1rem 0;
      background: rgba(59,130,246,0.06);
      border-radius: 0 8px 8px 0;
      color: var(--text-muted);
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 1.5rem 0;
    }
    strong { color: var(--text); font-weight: 600; }
    a { color: var(--primary-light); text-decoration: none; transition: color 0.2s; }
    a:hover { color: var(--accent); text-decoration: underline; }

    /* ── Hero section ────────────────────────────────────── */
    .hero {
      text-align: center;
      padding: 3rem 0 4rem;
      margin-bottom: 2rem;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(59,130,246,0.15);
      color: var(--primary-light);
      border: 1px solid rgba(59,130,246,0.3);
      border-radius: 100px;
      padding: 0.3rem 0.9rem;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      background: linear-gradient(135deg, #e2e8f0 0%, #60a5fa 50%, #0ea5e9 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
      margin-bottom: 1rem;
    }
    .hero p {
      color: var(--text-muted);
      font-size: 1.05rem;
      max-width: 540px;
      margin: 0 auto 2rem;
    }
    .hero-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white;
      border: none;
      border-radius: 10px;
      padding: 0.65rem 1.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59,130,246,0.35); }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.65rem 1.4rem;
      font-size: 0.9rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: var(--bg-card); border-color: var(--primary); }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .info-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: border-color 0.2s, transform 0.15s;
    }
    .info-card:hover { border-color: var(--primary); transform: translateY(-2px); }
    .info-card-icon { font-size: 1.5rem; margin-bottom: 0.6rem; }
    .info-card-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.3rem; }
    .info-card-desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }

    /* ── Version badge ───────────────────────────────────── */
    .version-footer {
      margin-top: 4rem;
      padding: 1.5rem;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* ── Responsive ──────────────────────────────────────── */
    .menu-toggle {
      display: none;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 36px; height: 36px;
      align-items: center; justify-content: center;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 1.1rem;
    }
    @media (max-width: 900px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; padding: 1.5rem; }
      .menu-toggle { display: flex; }
      .hero h1 { font-size: 2rem; }
      .search-box { min-width: 140px; }
    }

    /* ── Print styles ────────────────────────────────────── */
    @media print {
      header, .sidebar, .search-overlay { display: none !important; }
      .main { margin: 0; padding: 1rem; max-width: none; }
      .doc-section h2 { -webkit-text-fill-color: #1e40af; color: #1e40af; }
    }
  </style>
</head>
<body class="">

<!-- Search Overlay -->
<div class="search-overlay" id="searchOverlay" onclick="closeSearch(event)">
  <div class="search-modal" onclick="event.stopPropagation()">
    <div class="search-modal-input">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" id="searchInput" placeholder="Search the documentation…" oninput="doSearch()" autofocus>
      <button class="btn-icon" onclick="closeSearch()" title="Close" style="border:none;font-size:1.2rem;">✕</button>
    </div>
    <div class="search-results" id="searchResults">
      <p class="search-empty">Start typing to search…</p>
    </div>
  </div>
</div>

<!-- Header -->
<header>
  <a href="#top" class="header-brand" onclick="scrollToTop()">
    <div class="header-logo">V</div>
    <div>
      <div class="header-title">VaxPlan Docs</div>
      <div class="header-subtitle">Reference Manual</div>
    </div>
  </a>
  <div class="header-actions">
    <div class="search-box" onclick="openSearch()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" placeholder="Search docs…" readonly onclick="openSearch()" style="cursor:pointer;">
      <span style="font-size:0.7rem;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:0.1rem 0.4rem;color:var(--text-muted);flex-shrink:0;">Ctrl K</span>
    </div>
    <button class="btn-icon" onclick="toggleTheme()" id="themeBtn" title="Toggle dark/light mode">🌙</button>
    <button class="menu-toggle" onclick="toggleSidebar()" title="Menu">☰</button>
    <a href="/VaxPlan-User-Guide.pdf" download class="btn-pdf" id="pdfBtn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      PDF
    </a>
    <a href="https://vaxplan.org" target="_blank" class="btn-secondary" style="padding:0.4rem 0.85rem;font-size:0.8rem;">
      Launch App →
    </a>
  </div>
</header>

<!-- Layout -->
<div class="layout">
  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-label">Getting Started</div>
    <nav>
      <ul>
        <li><a href="#top" class="nav-link" onclick="navigate('top')">🏠 Overview</a></li>
        <li><a href="#quickstart" class="nav-link" onclick="navigate('quickstart')">⚡ Facility Quick-Start</a></li>
      </ul>
    </nav>
    <div class="sidebar-label">User Guide</div>
    <nav>
      <ul>
        ${navItems}
      </ul>
    </nav>
    <div style="padding:1.25rem 1.25rem 0.5rem;margin-top:0.5rem;border-top:1px solid var(--border)">
      <div style="font-size:0.72rem;color:var(--text-muted)">Built ${buildDate}</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">VaxPlan v1.4.0</div>
    </div>
  </aside>

  <!-- Main content -->
  <main class="main" id="main">
    <!-- Hero -->
    <div class="hero" id="top">
      <div class="hero-badge">📖 Reference Manual</div>
      <h1>VaxPlan Documentation</h1>
      <p>Complete role-by-role manual for the VaxPlan GIS microplanning platform — built for Ministries of Health.</p>
      <div class="hero-actions">
        <button class="btn-primary" onclick="navigate('1-what-vaxplan-does')">Read the Guide →</button>
        <a href="/VaxPlan-User-Guide.pdf" download class="btn-secondary">⬇ Download PDF</a>
      </div>
    </div>

    <!-- Quick nav cards -->
    <div class="cards-grid">
      <div class="info-card" onclick="navigate('5-facility-staff--your-daily-workflow')" style="cursor:pointer">
        <div class="info-card-icon">🏥</div>
        <div class="info-card-title">Facility Staff</div>
        <div class="info-card-desc">Microplanning, session management, and daily workflows.</div>
      </div>
      <div class="info-card" onclick="navigate('6-district-managers--review-and-oversight')" style="cursor:pointer">
        <div class="info-card-icon">🗺️</div>
        <div class="info-card-title">District Managers</div>
        <div class="info-card-desc">Review, oversight and approval workflows.</div>
      </div>
      <div class="info-card" onclick="navigate('7-provincial-coordinators--approvals-and-visibility')" style="cursor:pointer">
        <div class="info-card-icon">🌍</div>
        <div class="info-card-title">Provincial Coordinators</div>
        <div class="info-card-desc">Provincial-level approvals and visibility.</div>
      </div>
      <div class="info-card" onclick="navigate('8-national-administrators')" style="cursor:pointer">
        <div class="info-card-icon">⚙️</div>
        <div class="info-card-title">National Admins</div>
        <div class="info-card-desc">System configuration, user management, country setup.</div>
      </div>
      <div class="info-card" onclick="navigate('11-settlement-intelligence-and-zero-dose-targeting')" style="cursor:pointer">
        <div class="info-card-icon">🛰️</div>
        <div class="info-card-title">GIS & Settlement</div>
        <div class="info-card-desc">Zero-dose targeting, satellite analysis, mapping.</div>
      </div>
      <div class="info-card" onclick="navigate('15-troubleshooting')" style="cursor:pointer">
        <div class="info-card-icon">🔧</div>
        <div class="info-card-title">Troubleshooting</div>
        <div class="info-card-desc">Common issues, offline mode, and sync problems.</div>
      </div>
    </div>

    <!-- Quickstart section -->
    <section id="quickstart" class="doc-section">
      <h2>Facility Quick-Start</h2>
      <div class="info-card" style="background:rgba(34,197,94,0.06);border-color:rgba(34,197,94,0.2);margin-bottom:1.5rem">
        <strong>⚡ New to VaxPlan?</strong> This quick-start covers the essential steps for facility staff to get up and running in minutes.
      </div>
      ${quickstartHtml}
    </section>

    <!-- User Guide sections -->
    ${contentSections}

    <!-- Footer -->
    <div class="version-footer">
      <div style="margin-bottom:0.5rem">📚 VaxPlan Reference Manual · Built ${buildDate} · v1.4.0</div>
      <div>
        <a href="https://vaxplan.org" target="_blank" style="margin:0 0.75rem">Launch App</a>
        <a href="/VaxPlan-User-Guide.pdf" download style="margin:0 0.75rem">Download PDF</a>
        <a href="https://vaxplan.org/data-sources" target="_blank" style="margin:0 0.75rem">Data Sources</a>
      </div>
    </div>
  </main>
</div>

<script>
  // ── Section data for search ──────────────────────────────────────
  const SECTIONS = ${JSON.stringify(sections.map(s => ({ id: s.id, title: s.title, preview: s.body.replace(/[#*`\[\]]/g, "").trim().slice(0, 200) })))};

  // ── Navigation ────────────────────────────────────────────────────
  function navigate(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', '#' + id);
      updateActiveNav(id);
    }
    closeSidebar();
    closeSearch();
  }
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.pushState(null, '', '#');
    updateActiveNav('top');
  }
  function updateActiveNav(id) {
    document.querySelectorAll('.nav-link').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#' + id);
    });
  }

  // ── Scroll spy ────────────────────────────────────────────────────
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) updateActiveNav(e.target.id);
    });
  }, { rootMargin: '-60px 0px -70% 0px' });
  document.querySelectorAll('.doc-section, #top, #quickstart').forEach(s => observer.observe(s));

  // ── Search ────────────────────────────────────────────────────────
  function openSearch() {
    document.getElementById('searchOverlay').classList.add('open');
    setTimeout(() => document.getElementById('searchInput').focus(), 50);
  }
  function closeSearch(event) {
    if (!event || event.target === document.getElementById('searchOverlay')) {
      document.getElementById('searchOverlay').classList.remove('open');
      document.getElementById('searchInput').value = '';
      document.getElementById('searchResults').innerHTML = '<p class="search-empty">Start typing to search…</p>';
    }
  }
  function doSearch() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const container = document.getElementById('searchResults');
    if (!q) {
      container.innerHTML = '<p class="search-empty">Start typing to search…</p>';
      return;
    }
    const results = SECTIONS.filter(s =>
      s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q)
    ).slice(0, 10);
    if (!results.length) {
      container.innerHTML = '<p class="search-empty">No results for "' + q + '"</p>';
      return;
    }
    container.innerHTML = results.map(r => {
      const titleHl = r.title.replace(new RegExp(q, 'gi'), m => '<mark style="background:rgba(59,130,246,0.3);color:var(--primary-light);border-radius:2px;">' + m + '</mark>');
      const idx = r.preview.toLowerCase().indexOf(q);
      const snippet = idx >= 0 ? '…' + r.preview.slice(Math.max(0, idx - 40), idx + 120) + '…' : r.preview.slice(0, 120) + '…';
      return '<div class="search-result" onclick="navigate(\\'' + r.id + '\\')"><div class="search-result-title">' + titleHl + '</div><div class="search-result-snippet">' + snippet + '</div></div>';
    }).join('');
  }

  // Ctrl+K shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch({ target: document.getElementById('searchOverlay') });
  });

  // ── Theme ─────────────────────────────────────────────────────────
  const stored = localStorage.getItem('vaxplan-docs-theme');
  if (stored === 'light') { document.body.classList.add('light'); document.getElementById('themeBtn').textContent = '☀️'; }
  function toggleTheme() {
    const isLight = document.body.classList.toggle('light');
    document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('vaxplan-docs-theme', isLight ? 'light' : 'dark');
  }

  // ── Sidebar ───────────────────────────────────────────────────────
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

  // ── Hash navigation on load ───────────────────────────────────────
  if (location.hash) navigate(location.hash.slice(1));
</script>
</body>
</html>`;

// ─── Write output ─────────────────────────────────────────────────────────
const outPath = path.join(__dirname, "index.html");
fs.writeFileSync(outPath, html, "utf8");
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✅  Generated docs-site/index.html (${sizeKb} KB)`);
console.log(`    Sections: ${sections.length}`);
console.log(`    Deploy to: /var/www/doc.vaxplan.org/`);
