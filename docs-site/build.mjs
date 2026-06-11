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
const quickstartHtml = mdToHtml(quickstart);
const buildDate = new Date().toISOString().slice(0, 10);

// Build build-time fallback data
const fallbackData = {
  pages: sections.map((s, idx) => ({
    id: idx + 1,
    slug: s.id,
    title: s.title,
    sort_order: idx + 1,
    is_published: true,
    updated_at: buildDate
  })),
  cache: sections.reduce((acc, s) => {
    acc[s.id] = {
      slug: s.id,
      title: s.title,
      body: s.body,
      renderedHtml: mdToHtml(s.body)
    };
    return acc;
  }, {})
};

// ─── Full HTML ────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VaxPlan Documentation Wiki — Reference Manual</title>
  <meta name="description" content="Dynamic reference manual and learning hub for VaxPlan — the GIS-powered health microplanning platform.">
  <meta name="keywords" content="VaxPlan, wiki, microplanning, immunization, vaccination, GIS, health, WHO, UNICEF">
  <meta property="og:title" content="VaxPlan Documentation Wiki">
  <meta property="og:description" content="Dynamic reference manual for the VaxPlan health microplanning platform.">
  <meta property="og:url" content="https://doc.vaxplan.org">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- marked.js for client-side Markdown rendering of live edits -->
  <script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
  
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

    /* ── Sticky slim progress bar ───────────────────────── */
    #topProgressBarContainer {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: transparent;
      z-index: 9999;
    }
    #topProgressBar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #3b82f6, #0ea5e9, #22c55e);
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    }

    /* ── Header ─────────────────────────────────────────── */
    header {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: var(--header-height);
      background: rgba(30, 41, 59, 0.75);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      z-index: 100;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .light header {
      background: rgba(255, 255, 255, 0.75);
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
    .header-title { font-size: 1rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .header-subtitle { font-size: 0.7rem; color: var(--text-muted); font-weight: 400; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; }
    .search-box {
      display: flex; align-items: center; gap: 0.5rem;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 0.4rem 0.75rem;
      cursor: pointer; font-size: 0.8rem; color: var(--text-muted);
      min-width: 200px; transition: border-color 0.2s;
    }
    .search-box:focus-within { border-color: var(--primary); }
    .search-box input { border: none; background: transparent; color: var(--text); font-size: 0.85rem; width: 100%; outline: none; }
    .search-box input::placeholder { color: var(--text-muted); }
    .btn-icon {
      background: transparent; border: 1px solid var(--border);
      border-radius: 8px; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-muted); font-size: 1rem;
      transition: all 0.2s;
    }
    .btn-icon:hover { background: var(--bg-card); color: var(--text); border-color: var(--primary); }
    .btn-pdf {
      display: flex; align-items: center; gap: 0.4rem;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white; border: none; border-radius: 8px;
      padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 600;
      text-decoration: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
    }
    .btn-pdf:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white; border: none; border-radius: 10px;
      padding: 0.65rem 1.4rem; font-size: 0.9rem; font-weight: 600;
      text-decoration: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.35); }
    .btn-secondary {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: transparent; color: var(--text); border: 1px solid var(--border);
      border-radius: 10px; padding: 0.65rem 1.4rem; font-size: 0.9rem; font-weight: 500;
      text-decoration: none; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-secondary:hover { background: var(--bg-card); border-color: var(--primary); transform: translateY(-1px); }

    /* ── Layout ──────────────────────────────────────────── */
    .layout { display: flex; margin-top: var(--header-height); min-height: calc(100vh - var(--header-height)); }

    /* ── Sidebar ─────────────────────────────────────────── */
    .sidebar {
      width: var(--sidebar-width); background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      position: fixed; top: var(--header-height); bottom: 0; left: 0;
      overflow-y: auto; padding: 1rem 0; transition: transform 0.3s; z-index: 50;
    }
    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .sidebar-label {
      font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--text-muted);
      padding: 0 1.25rem 0.5rem; margin-top: 0.75rem;
    }
    .sidebar nav ul { list-style: none; padding: 0 0.75rem; }
    .sidebar nav ul li { margin: 1px 0; }
    .nav-link {
      display: block; padding: 0.45rem 0.75rem; color: var(--text-muted);
      text-decoration: none; border-radius: 6px; font-size: 0.82rem;
      font-weight: 400; transition: all 0.15s; line-height: 1.4;
    }
    .nav-link:hover { background: var(--bg-card); color: var(--text); }
    .nav-link.active { background: rgba(59,130,246,0.15); color: var(--primary-light); font-weight: 600; }

    /* ── Main content ────────────────────────────────────── */
    .main { margin-left: var(--sidebar-width); flex: 1; padding: 2.5rem 3rem; max-width: 860px; }

    /* ── Search overlay ──────────────────────────────────── */
    .search-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.6); z-index: 200; backdrop-filter: blur(4px);
    }
    .search-overlay.open { display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; }
    .search-modal {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; width: 90%; max-width: 620px;
      overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .search-modal-input {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
    }
    .search-modal-input input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-size: 1rem; }
    .search-results { max-height: 400px; overflow-y: auto; padding: 0.5rem; }
    .search-result { padding: 0.75rem 1rem; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
    .search-result:hover { background: var(--bg); }
    .search-result-title { font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 0.2rem; }
    .search-result-snippet { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .search-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem; }

    /* ── Documentation typography ────────────────────────── */
    .doc-section { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); }
    .doc-section:last-child { border-bottom: none; }
    .doc-section h2 {
      font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em;
      color: var(--text); margin-bottom: 1.25rem; padding-top: 0.5rem;
      background: linear-gradient(135deg, var(--primary-light), var(--accent));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    /* Rendered markdown styles */
    .doc-section h1, .doc-section h2, .doc-section h3 { color: var(--text); margin: 1.5rem 0 0.6rem; }
    .doc-section h1 { font-size: 1.6rem; font-weight: 700; background: linear-gradient(135deg, var(--primary-light), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .doc-section h2 { font-size: 1.3rem; font-weight: 600; background: none; -webkit-text-fill-color: var(--text); }
    .doc-section h3 { font-size: 1.05rem; font-weight: 600; color: var(--text); }
    .doc-section h4 { font-size: 0.95rem; font-weight: 600; color: var(--text-muted); margin: 1rem 0 0.4rem; }
    .doc-section p { margin-bottom: 0.85rem; color: var(--text); line-height: 1.75; }
    .doc-section ul, .doc-section ol { padding-left: 1.5rem; margin-bottom: 0.85rem; }
    .doc-section li { margin-bottom: 0.35rem; color: var(--text); line-height: 1.65; }
    .doc-section li::marker { color: var(--primary); }
    .doc-section code {
      font-family: 'JetBrains Mono', monospace; font-size: 0.82em;
      background: rgba(59,130,246,0.12); color: var(--primary-light);
      padding: 0.15em 0.4em; border-radius: 4px;
    }
    .doc-section img {
      max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;
      cursor: zoom-in; transition: transform 0.3s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .doc-section img:hover { transform: scale(1.01); }
    .doc-section pre {
      background: #0a0e1a; border: 1px solid var(--border);
      border-radius: 10px; padding: 1.25rem 1.5rem; overflow-x: auto; margin: 1rem 0;
    }
    .doc-section pre code { background: transparent; color: #e2e8f0; padding: 0; font-size: 0.85rem; line-height: 1.6; }
    .doc-section blockquote {
      border-left: 3px solid var(--primary); padding: 0.75rem 1.25rem;
      margin: 1rem 0; background: rgba(59,130,246,0.06);
      border-radius: 0 8px 8px 0; color: var(--text-muted); font-style: italic;
    }
    .doc-section hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
    .doc-section strong { color: var(--text); font-weight: 600; }
    .doc-section a { color: var(--primary-light); text-decoration: none; transition: color 0.2s; }
    .doc-section a:hover { color: var(--accent); text-decoration: underline; }
    .doc-section table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.88rem; }
    .doc-section th { background: var(--bg-card); color: var(--text); font-weight: 600; padding: 0.6rem 0.9rem; border: 1px solid var(--border); text-align: left; }
    .doc-section td { padding: 0.5rem 0.9rem; border: 1px solid var(--border); color: var(--text); }
    .doc-section tr:nth-child(even) td { background: rgba(255,255,255,0.02); }

    /* ── Hero section ────────────────────────────────────── */
    .hero { text-align: center; padding: 3rem 0 4rem; margin-bottom: 2rem; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      background: rgba(59,130,246,0.15); color: var(--primary-light);
      border: 1px solid rgba(59,130,246,0.3); border-radius: 100px;
      padding: 0.3rem 0.9rem; font-size: 0.75rem; font-weight: 600; margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-size: 3rem; font-weight: 800; letter-spacing: -0.04em;
      background: linear-gradient(135deg, #e2e8f0 0%, #60a5fa 50%, #0ea5e9 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      line-height: 1.1; margin-bottom: 1rem;
    }
    .hero p { color: var(--text-muted); font-size: 1.05rem; max-width: 540px; margin: 0 auto 2rem; }
    .hero-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .info-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 1.25rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .info-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 12px 20px -10px rgba(59, 130, 246, 0.3); }
    .info-card-icon { font-size: 1.5rem; margin-bottom: 0.6rem; }
    .info-card-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.3rem; }
    .info-card-desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }

    /* ── Version badge ───────────────────────────────────── */
    .version-footer {
      margin-top: 4rem; padding: 1.5rem; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: 12px;
      text-align: center; font-size: 0.8rem; color: var(--text-muted);
    }

    /* ── Loading skeleton ────────────────────────────────── */
    .skeleton-pulse {
      background: linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%);
      background-size: 400% 100%;
      animation: pulse 1.5s ease-in-out infinite;
      border-radius: 6px;
    }
    @keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Responsive ──────────────────────────────────────── */
    .menu-toggle {
      display: none; background: transparent; border: 1px solid var(--border);
      border-radius: 8px; width: 36px; height: 36px;
      align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-muted); font-size: 1.1rem;
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
      .doc-section h1 { -webkit-text-fill-color: #1e40af; color: #1e40af; }
    }
  </style>
</head>
<body class="">

<!-- Slim Progress Bar -->
<div id="topProgressBarContainer">
  <div id="topProgressBar"></div>
</div>

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
      <div class="header-title">VaxPlan Docs Wiki</div>
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

    <!-- Reading Progress panel -->
    <div class="sidebar-progress-panel" style="padding: 0.75rem 1.25rem 1rem; border-bottom: 1px solid var(--border); background: rgba(59,130,246,0.03);">
      <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
        <span>Academy Progress</span>
        <span id="progressText">0%</span>
      </div>
      <div style="height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
        <div id="sidebarProgressBar" style="height: 100%; width: 0%; background: var(--primary); transition: width 0.3s;"></div>
      </div>
    </div>

    <!-- Achievements badges -->
    <div class="sidebar-label">Achievements</div>
    <div id="sidebarBadges" style="padding: 0 1.25rem 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
      <!-- Populated dynamically -->
    </div>

    <div class="sidebar-label">User Guide</div>
    <nav>
      <ul id="sidebarNav">
        <!-- Populated dynamically from API -->
        <li><div class="skeleton-pulse" style="height:28px;margin:4px 8px;"></div></li>
        <li><div class="skeleton-pulse" style="height:28px;margin:4px 8px;"></div></li>
        <li><div class="skeleton-pulse" style="height:28px;margin:4px 8px;"></div></li>
        <li><div class="skeleton-pulse" style="height:28px;margin:4px 8px;"></div></li>
      </ul>
    </nav>
    <div style="padding:1.25rem 1.25rem 0.5rem;margin-top:0.5rem;border-top:1px solid var(--border)">
      <div style="font-size:0.72rem;color:var(--text-muted)" id="buildDate">Loading…</div>
      <div style="font-size:0.72rem;color:var(--text-muted)">VaxPlan v1.4.0</div>
    </div>
  </aside>

  <!-- Main content -->
  <main class="main" id="main">
    <!-- Hero -->
    <div class="hero" id="top">
      <div class="hero-badge">📖 Learning &amp; Training Academy</div>
      <h1>VaxPlan Wiki Hub</h1>
      <p>Dynamic handbook and interactive reference manual for the VaxPlan GIS microplanning platform.</p>
      <div class="hero-actions">
        <button class="btn-primary" id="readGuideBtn" onclick="navigateFirstSection()">Read the Guide →</button>
        <a href="/VaxPlan-User-Guide.pdf" download class="btn-secondary">⬇ Download PDF</a>
      </div>
    </div>

    <!-- Quick nav cards -->
    <div class="cards-grid">
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('facility staff')">
        <div class="info-card-icon">🏥</div>
        <div class="info-card-title">Facility Staff</div>
        <div class="info-card-desc">Microplanning, session management, and daily workflows.</div>
      </div>
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('district managers')">
        <div class="info-card-icon">🗺️</div>
        <div class="info-card-title">District Managers</div>
        <div class="info-card-desc">Review, oversight and approval workflows.</div>
      </div>
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('provincial coordinators')">
        <div class="info-card-icon">🌍</div>
        <div class="info-card-title">Provincial Coordinators</div>
        <div class="info-card-desc">Provincial-level approvals and visibility.</div>
      </div>
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('national administrators')">
        <div class="info-card-icon">⚙️</div>
        <div class="info-card-title">National Admins</div>
        <div class="info-card-desc">System configuration, user management, country setup.</div>
      </div>
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('settlement intelligence')">
        <div class="info-card-icon">🛰️</div>
        <div class="info-card-title">GIS &amp; Settlement</div>
        <div class="info-card-desc">Zero-dose targeting, satellite analysis, mapping.</div>
      </div>
      <div class="info-card" style="cursor:pointer" onclick="navigateByTitle('troubleshooting')">
        <div class="info-card-icon">🔧</div>
        <div class="info-card-title">Troubleshooting</div>
        <div class="info-card-desc">Common issues, offline mode, and sync problems.</div>
      </div>
    </div>

    <!-- Quickstart section -->
    <section id="quickstart" class="doc-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
        <h2 style="margin:0; background:none; -webkit-text-fill-color:var(--text); font-size:1.5rem; font-weight:700;">
          ⚡ Facility Quick-Start
        </h2>
        <button class="btn-secondary" id="read-btn-quickstart" onclick="toggleRead('quickstart')" style="padding:0.3rem 0.75rem; font-size:0.75rem;">
          📖 Mark as Read
        </button>
      </div>
      <div class="info-card" style="background:rgba(34,197,94,0.06);border-color:rgba(34,197,94,0.2);margin-bottom:1.5rem">
        <strong>⚡ New to VaxPlan?</strong> This quick-start covers the essential steps for facility staff to get up and running in minutes.
      </div>
      <div class="doc-body">
        ${quickstartHtml}
      </div>
    </section>

    <!-- Content populated dynamically -->
    <div id="wikiContent">
      <!-- Skeleton loaders -->
      <div class="doc-section">
        <div class="skeleton-pulse" style="height:36px;width:60%;margin-bottom:1rem;"></div>
        <div class="skeleton-pulse" style="height:16px;width:100%;margin-bottom:0.5rem;"></div>
        <div class="skeleton-pulse" style="height:16px;width:90%;margin-bottom:0.5rem;"></div>
        <div class="skeleton-pulse" style="height:16px;width:80%;"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="version-footer" id="siteFooter" style="display:none">
      <div style="margin-bottom:0.5rem">📚 VaxPlan Reference Manual · v1.4.0</div>
      <div>
        <a href="https://vaxplan.org" target="_blank" style="margin:0 0.75rem">Launch App</a>
        <a href="/VaxPlan-User-Guide.pdf" download style="margin:0 0.75rem">Download PDF</a>
        <a href="https://vaxplan.org/data-sources" target="_blank" style="margin:0 0.75rem">Data Sources</a>
      </div>
    </div>
  </main>
</div>

<!-- Lightbox Modal -->
<div id="lightbox" onclick="closeLightbox()" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:99999; backdrop-filter:blur(5px); justify-content:center; align-items:center; padding:2rem; cursor:zoom-out;">
  <button onclick="closeLightbox()" style="position:absolute; top:1.5rem; right:1.5rem; background:rgba(255,255,255,0.1); border:none; border-radius:50%; width:40px; height:40px; color:white; font-size:1.25rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
  <img id="lightboxImg" src="" alt="Zoomed Screenshot" style="max-width:100%; max-height:90vh; object-fit:contain; border-radius:8px; box-shadow:0 25px 50px rgba(0,0,0,0.5);">
</div>

<!-- Fallback JSON loaded at build-time -->
<script id="fallback-data" type="application/json">
  ${JSON.stringify(fallbackData)}
</script>

<script>
  // ── API base ──────────────────────────────────────────────────────────────
  const API_BASE = '';

  // ── State variables ───────────────────────────────────────────────────────
  let PAGES = [];          // [{ id, slug, title, sort_order, updated_at }]
  let PAGE_CACHE = {};     // slug → { slug, title, body, renderedHtml }
  let readSections = [];
  let completedQuizzes = [];
  let quizSelectedAnswers = {};

  const BADGES = [
    { id: "quickstart", name: "Quick-Start Pro", description: "Read the Facility Quick-Start guide.", icon: "⚡" },
    { id: "gis_intel", name: "GIS Navigator", description: "Complete the Settlement Intelligence section and pass the quiz.", icon: "🛰️" },
    { id: "routine_plan", name: "Field Commander", description: "Complete the Routine Microplanning section and pass the quiz.", icon: "🗺️" },
    { id: "scholar", name: "Wiki Scholar", description: "Mark all available wiki user guide sections as read.", icon: "🎓" },
  ];

  const QUIZZES = {
    "11-settlement-intelligence-and-zero-dose-targeting": {
      id: "gis_intel",
      title: "Settlement Intelligence & Zero-Dose Quiz",
      questions: [
        {
          question: "What does the Outreach Site Suitability Score represent?",
          options: [
            "The percentage of completed supervision visits.",
            "An abstract population density indicator.",
            "A 0-100 score prioritizing unserved building clusters based on size, zero-dose risk, distance, and road travel time."
          ],
          correctAnswer: 2,
          explanation: "The Outreach Site Suitability Score aggregates multiple factors (unserved size, zero-dose children, distance, accessibility) to help planners choose the optimal location for new outreach sessions."
        },
        {
          question: "What is the spatial resolution of the WorldPop gridded population data in VaxPlan?",
          options: [
            "100 meters × 100 meters (approx. 1 hectare)",
            "1 kilometer × 1 kilometer",
            "5 kilometers × 5 kilometers"
          ],
          correctAnswer: 0,
          explanation: "VaxPlan fuses high-resolution WorldPop raster data, which maps population density at 100m grid cells, letting planners click the map and get a precise headcount of people."
        }
      ]
    },
    "5-facility-staff--your-daily-workflow": {
      id: "routine_plan",
      title: "Routine Microplanning Quiz",
      questions: [
        {
          question: "How far in advance must a vaccination session date be scheduled?",
          options: [
            "At least 24 hours in advance",
            "At least 7 days in advance",
            "No advance scheduling is required"
          ],
          correctAnswer: 1,
          explanation: "To allow for logistics and cold chain planning, all itinerary days must be scheduled at least 7 days in the future."
        },
        {
          question: "Which role is responsible for reviewing and approving microplans?",
          options: [
            "Facility Clerks",
            "WHO external monitors only",
            "District Managers and Provincial Coordinators"
          ],
          correctAnswer: 2,
          explanation: "Authoring is done at the facility level, while review and approvals are routed hierarchically to District Managers and Provincial Coordinators."
        }
      ]
    }
  };

  const FALLBACK_DATA = JSON.parse(document.getElementById('fallback-data').textContent);

  // ── Load state ────────────────────────────────────────────────────────────
  function loadState() {
    try {
      const rs = localStorage.getItem('vaxplan.docs.readSections');
      if (rs) readSections = JSON.parse(rs);
      
      const cq = localStorage.getItem('vaxplan.quizzes.completed');
      if (cq) completedQuizzes = JSON.parse(cq);
    } catch(e) {}
  }

  function saveState() {
    try {
      localStorage.setItem('vaxplan.docs.readSections', JSON.stringify(readSections));
      localStorage.setItem('vaxplan.quizzes.completed', JSON.stringify(completedQuizzes));
    } catch(e) {}
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  async function boot() {
    loadState();

    let localPages = [];
    let localCache = {};
    try {
      const sp = localStorage.getItem('vaxplan.docs.pages');
      if (sp) localPages = JSON.parse(sp);
      
      const sc = localStorage.getItem('vaxplan.docs.cache');
      if (sc) localCache = JSON.parse(sc);
    } catch(e){}

    try {
      const res = await fetch(API_BASE + '/api/wiki/pages');
      if (res.ok) {
        const json = await res.json();
        PAGES = json.data || [];
        try {
          localStorage.setItem('vaxplan.docs.pages', JSON.stringify(PAGES));
        } catch(e){}
      } else {
        throw new Error('API status ' + res.status);
      }
    } catch (e) {
      console.warn('[wiki] Could not load pages from API, using offline fallback.', e);
      PAGES = localPages.length ? localPages : FALLBACK_DATA.pages;
    }

    renderSidebar();
    await renderAllContent(localCache);
    renderAchievements();
    updateProgressBar();
    updateReadButtonStates();

    document.getElementById('buildDate').textContent = 'Updated ' + new Date().toISOString().slice(0,10);
    document.getElementById('siteFooter').style.display = '';

    // Scroll to hash on load
    if (location.hash) {
      setTimeout(() => navigate(location.hash.slice(1)), 250);
    }
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  function renderSidebar() {
    const nav = document.getElementById('sidebarNav');
    if (!PAGES.length) {
      nav.innerHTML = '<li style="padding:0.5rem 1rem;font-size:0.8rem;color:var(--text-muted)">No pages yet.</li>';
      return;
    }
    let navHtml = '';
    for (let i = 0; i < PAGES.length; i++) {
      const p = PAGES[i];
      navHtml += '<li><a href="#' + p.slug + '" class="nav-link" onclick="navigate(' + String.fromCharCode(39) + p.slug + String.fromCharCode(39) + ')" id="nav-' + p.slug + '">' + escHtml(p.title) + '</a></li>';
    }
    nav.innerHTML = navHtml;
  }

  // ── Render Content ────────────────────────────────────────────────────────
  async function renderAllContent(localCache) {
    if (!PAGES.length) {
      document.getElementById('wikiContent').innerHTML =
        '<div class="doc-section"><h2>Welcome to VaxPlan Docs</h2><p>No pages have been published yet. National admins can add content via VaxPlan application.</p></div>';
      return;
    }

    const fetched = await Promise.all(PAGES.map(p => fetchPage(p.slug, localCache)));
    const html = fetched.map(p => p ? sectionHtml(p) : '').join('\\n');
    document.getElementById('wikiContent').innerHTML = html;

    // Attach scroll spy
    attachScrollSpy();
  }

  async function fetchPage(slug, localCache) {
    if (PAGE_CACHE[slug]) return PAGE_CACHE[slug];
    if (localCache && localCache[slug]) {
      PAGE_CACHE[slug] = localCache[slug];
      return localCache[slug];
    }
    try {
      const res = await fetch(API_BASE + '/api/wiki/pages/' + encodeURIComponent(slug));
      if (res.ok) {
        const json = await res.json();
        const page = json.data;
        page.renderedHtml = marked.parse(page.body || '');
        PAGE_CACHE[slug] = page;
        
        // Save to localCache
        try {
          const freshCache = { ...localCache, [slug]: page };
          localStorage.setItem('vaxplan.docs.cache', JSON.stringify(freshCache));
        } catch(e){}
        return page;
      }
    } catch(e) {
      console.warn('[wiki] Failed to fetch page ' + slug + ' online, checking fallback:', e);
    }
    if (FALLBACK_DATA.cache[slug]) {
      PAGE_CACHE[slug] = FALLBACK_DATA.cache[slug];
      return FALLBACK_DATA.cache[slug];
    }
    return null;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function sectionHtml(p) {
    const isRead = readSections.includes(p.slug);
    const quiz = QUIZZES[p.slug];
    const isQuizPassed = quiz && completedQuizzes.includes(quiz.id);

    let quizHtml = '';
    if (quiz) {
      let questionsHtml = '';
      for (let qIdx = 0; qIdx < quiz.questions.length; qIdx++) {
        const q = quiz.questions[qIdx];
        let optionsHtml = '';
        for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
          const opt = q.options[optIdx];
          optionsHtml += '<button type="button" onclick="selectQuizOption(' + String.fromCharCode(39) + p.slug + String.fromCharCode(39) + ', ' + qIdx + ', ' + optIdx + ')" id="btn-' + p.slug + '-' + qIdx + '-' + optIdx + '" class="quiz-option-btn" ' + (isQuizPassed ? 'disabled' : '') + ' style="text-align:left; font-size:0.8rem; padding:0.6rem 0.85rem; border:1px solid var(--border); border-radius:6px; background:var(--bg-card); color:var(--text); cursor:' + (isQuizPassed ? 'default' : 'pointer') + '; transition:all 0.2s; width:100%; margin-bottom:0.25rem;">' + escHtml(opt) + '</button>';
        }
        questionsHtml += '<div id="q-' + p.slug + '-' + qIdx + '" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;"><p style="font-weight:600; font-size:0.88rem; margin-bottom:0.25rem; color:var(--text);">' + (qIdx + 1) + '. ' + escHtml(q.question) + '</p><div style="display:flex; flex-direction:column; gap:0.25rem;">' + optionsHtml + '</div><div id="feedback-' + p.slug + '-' + qIdx + '" style="display:none; font-size:0.75rem; padding:0.5rem 0.75rem; border-radius:6px; margin-top:0.25rem;"></div></div>';
      }

      quizHtml = '<div class="quiz-container" id="quiz-' + p.slug + '" style="margin-top:2rem; padding:1.5rem; background:rgba(59,130,246,0.05); border:1px solid var(--border); border-radius:12px;"><h4 style="margin-top:0; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; font-weight:700; color:var(--text);">📝 ' + quiz.title + '</h4><div style="display:flex; flex-direction:column; gap:1rem;">' + questionsHtml + '</div><div style="margin-top:1.25rem; display:flex; flex-direction:column; align-items:center; gap:0.5rem;">' + (isQuizPassed ? '<div style="color:var(--green); font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.25rem; margin-top:0.5rem;">🏆 Quiz Passed Successfully!</div>' : '<button class="btn-primary" onclick="submitQuiz(' + String.fromCharCode(39) + p.slug + String.fromCharCode(39) + ')" style="width:100%; justify-content:center; padding:0.5rem 1rem; font-size:0.8rem;">Submit Quiz Answers</button>') + '</div></div>';
    }

    return '<section id="' + p.slug + '" class="doc-section"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;"><h2 style="margin:0; background:none; -webkit-text-fill-color:var(--text); font-size:1.5rem; font-weight:700;">' + escHtml(p.title) + '</h2><div style="display:flex; align-items:center; gap:0.5rem;"><button class="btn-secondary" id="read-btn-' + p.slug + '" onclick="toggleRead(' + String.fromCharCode(39) + p.slug + String.fromCharCode(39) + ')" style="padding:0.3rem 0.75rem; font-size:0.75rem;">' + (isRead ? '✅ Read' : '📖 Mark as Read') + '</button></div></div><div class="doc-body">' + p.renderedHtml + '</div>' + quizHtml + '</section>';
  }

  // ── Progress & Badges ─────────────────────────────────────────────────────
  function toggleRead(slug) {
    const idx = readSections.indexOf(slug);
    if (idx >= 0) {
      readSections.splice(idx, 1);
    } else {
      readSections.push(slug);
    }
    saveState();
    updateReadButtonStates();
    updateProgressBar();
    renderAchievements();
  }

  function updateReadButtonStates() {
    const qsBtn = document.getElementById('read-btn-quickstart');
    if (qsBtn) {
      qsBtn.textContent = readSections.includes('quickstart') ? '✅ Read' : '📖 Mark as Read';
    }
    PAGES.forEach(p => {
      const btn = document.getElementById('read-btn-' + p.slug);
      if (btn) {
        btn.textContent = readSections.includes(p.slug) ? '✅ Read' : '📖 Mark as Read';
      }
    });
  }

  function updateProgressBar() {
    const total = PAGES.length + 1; // pages + quickstart
    const readCount = readSections.filter(slug => slug === 'quickstart' || PAGES.some(p => p.slug === slug)).length;
    const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
    
    document.getElementById('progressText').textContent = pct + '%';
    document.getElementById('sidebarProgressBar').style.width = pct + '%';
    document.getElementById('topProgressBar').style.width = pct + '%';
  }

  function renderAchievements() {
    const container = document.getElementById('sidebarBadges');
    if (!container) return;
    
    const unlocked = [];
    if (readSections.includes('quickstart')) unlocked.push('quickstart');
    if (completedQuizzes.includes('gis_intel')) unlocked.push('gis_intel');
    if (completedQuizzes.includes('routine_plan')) unlocked.push('routine_plan');
    
    const allPagesRead = PAGES.length > 0 && PAGES.every(p => readSections.includes(p.slug));
    if (allPagesRead) unlocked.push('scholar');
    
    let badgesHtml = '';
    for (let i = 0; i < BADGES.length; i++) {
      const badge = BADGES[i];
      const isUnlocked = unlocked.includes(badge.id);
      badgesHtml += '<div title="' + escHtml(badge.name) + ': ' + escHtml(badge.description) + ' (' + (isUnlocked ? 'Unlocked' : 'Locked') + ')" style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.6rem; border-radius:20px; font-size:0.75rem; font-weight:600; border:1px solid ' + (isUnlocked ? 'transparent' : 'var(--border)') + '; background:' + (isUnlocked ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,255,255,0.02)') + '; color:' + (isUnlocked ? 'white' : 'var(--text-muted)') + '; opacity:' + (isUnlocked ? '1' : '0.5') + '; transition:all 0.3s; select-none;"><span style="font-size:0.9rem;">' + badge.icon + '</span><span style="flex:1;">' + escHtml(badge.name) + '</span><span>' + (isUnlocked ? '🔓' : '🔒') + '</span></div>';
    }
    container.innerHTML = badgesHtml;
  }

  // ── Quiz Interactions ─────────────────────────────────────────────────────
  function selectQuizOption(slug, qIdx, optIdx) {
    quizSelectedAnswers[slug + '_' + qIdx] = optIdx;
    const quiz = QUIZZES[slug];
    if (!quiz) return;
    
    quiz.questions[qIdx].options.forEach((_, oIdx) => {
      const btn = document.getElementById('btn-' + slug + '-' + qIdx + '-' + oIdx);
      if (btn) {
        if (oIdx === optIdx) {
          btn.style.borderColor = 'var(--primary)';
          btn.style.background = 'rgba(59,130,246,0.15)';
          btn.style.fontWeight = '600';
        } else {
          btn.style.borderColor = 'var(--border)';
          btn.style.background = 'var(--bg-card)';
          btn.style.fontWeight = 'normal';
        }
      }
    });
  }

  function submitQuiz(slug) {
    const quiz = QUIZZES[slug];
    if (!quiz) return;
    
    let allCorrect = true;
    quiz.questions.forEach((q, qIdx) => {
      const selected = quizSelectedAnswers[slug + '_' + qIdx];
      const feedback = document.getElementById('feedback-' + slug + '-' + qIdx);
      
      if (selected === undefined) {
        allCorrect = false;
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(239,68,68,0.1)';
          feedback.style.color = 'var(--text)';
          feedback.innerHTML = '⚠️ Please select an answer.';
        }
        return;
      }
      
      const isCorrect = selected === q.correctAnswer;
      if (!isCorrect) allCorrect = false;
      
      if (feedback) {
        feedback.style.display = 'block';
        if (isCorrect) {
          feedback.style.background = 'rgba(34,197,94,0.1)';
          feedback.style.color = 'var(--green)';
          feedback.innerHTML = '<strong>Correct!</strong> ' + escHtml(q.explanation);
        } else {
          feedback.style.background = 'rgba(239,68,68,0.1)';
          feedback.style.color = '#f87171';
          feedback.innerHTML = '<strong>Incorrect.</strong> ' + escHtml(q.explanation);
        }
      }
      
      q.options.forEach((_, oIdx) => {
        const btn = document.getElementById('btn-' + slug + '-' + qIdx + '-' + oIdx);
        if (btn) {
          btn.disabled = true;
          if (oIdx === q.correctAnswer) {
            btn.style.borderColor = 'var(--green)';
            btn.style.background = 'rgba(34,197,94,0.15)';
          } else if (oIdx === selected) {
            btn.style.borderColor = '#ef4444';
            btn.style.background = 'rgba(239,68,68,0.15)';
          }
        }
      });
    });
    
    if (allCorrect) {
      if (!completedQuizzes.includes(quiz.id)) {
        completedQuizzes.push(quiz.id);
        saveState();
      }
      if (!readSections.includes(slug)) {
        toggleRead(slug);
      }
      renderAchievements();
      
      const quizContainer = document.getElementById('quiz-' + slug);
      if (quizContainer) {
        const footer = quizContainer.querySelector('div:last-child');
        if (footer) {
          footer.innerHTML = '<div style="color:var(--green); font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.25rem; margin-top:0.5rem;">🏆 Quiz Passed Successfully!</div>';
        }
      }
    }
  }

  // ── Lightbox screenshot zoom ──────────────────────────────────────────────
  document.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && e.target.closest('.doc-body, #quickstart')) {
      openLightbox(e.target.src);
    }
  });

  function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    lb.style.display = 'flex';
  }
  
  function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
  }

  // ── Navigation ────────────────────────────────────────────────────────────
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

  function navigateFirstSection() {
    if (PAGES.length) navigate(PAGES[0].slug);
  }

  function navigateByTitle(keyword) {
    const kw = keyword.toLowerCase();
    if (kw === 'quickstart') {
      navigate('quickstart');
      return;
    }
    const match = PAGES.find(p => p.title.toLowerCase().includes(kw));
    if (match) navigate(match.slug);
  }

  function updateActiveNav(id) {
    document.querySelectorAll('.nav-link').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#' + id);
    });
  }

  // ── Scroll spy ────────────────────────────────────────────────────────────
  function attachScrollSpy() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) updateActiveNav(e.target.id); });
    }, { rootMargin: '-60px 0px -70% 0px' });
    document.querySelectorAll('.doc-section, #top, #quickstart').forEach(s => observer.observe(s));
  }

  // ── Search ────────────────────────────────────────────────────────────────
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
    if (!q) { container.innerHTML = '<p class="search-empty">Start typing to search…</p>'; return; }
    
    const results = [];
    if ('facility quick-start'.includes(q)) {
      results.push({ slug: 'quickstart', title: '⚡ Facility Quick-Start', preview: 'Facility Quick-Start covers the essential steps for facility staff to get up and running.' });
    }
    
    PAGES.forEach(p => {
      const cached = PAGE_CACHE[p.slug];
      if (p.title.toLowerCase().includes(q) || (cached && cached.body.toLowerCase().includes(q))) {
        results.push({
          slug: p.slug,
          title: p.title,
          preview: cached ? cached.body.split('#').join('').split('*').join('').split('[').join('').split(']').join('').split(String.fromCharCode(96)).join('').trim() : ''
        });
      }
    });

    const sliced = results.slice(0, 10);
    if (!sliced.length) { container.innerHTML = '<p class="search-empty">No results for "' + escHtml(q) + '"</p>'; return; }
    
    container.innerHTML = sliced.map(r => {
      const titleHl = r.title.replace(new RegExp(q, 'gi'), m => '<mark style="background:rgba(59,130,246,0.3);color:var(--primary-light);border-radius:2px;">' + m + '</mark>');
      const idx = r.preview.toLowerCase().indexOf(q);
      const snippet = idx >= 0 ? '…' + r.preview.slice(Math.max(0,idx-40), idx+120) + '…' : r.preview.slice(0, 120) + '…';
      return '<div class="search-result" onclick="navigate(' + String.fromCharCode(39) + r.slug + String.fromCharCode(39) + ')"><div class="search-result-title">' + titleHl + '</div><div class="search-result-snippet">' + snippet + '</div></div>';
    }).join('');
  }

  // Ctrl+K shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch({ target: document.getElementById('searchOverlay') });
  });

  // ── Theme ─────────────────────────────────────────────────────────────────
  const stored = localStorage.getItem('vaxplan-docs-theme');
  if (stored === 'light') { document.body.classList.add('light'); document.getElementById('themeBtn').textContent = '☀️'; }
  
  function toggleTheme() {
    const isLight = document.body.classList.toggle('light');
    document.getElementById('themeBtn').textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('vaxplan-docs-theme', isLight ? 'light' : 'dark');
  }

  // ── Sidebar toggling ──────────────────────────────────────────────────────
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

  // ── Start ─────────────────────────────────────────────────────────────────
  boot();
</script>
</body>
</html>`;

// ─── Write output ─────────────────────────────────────────────────────────
const outPath = path.join(__dirname, "index.html");
fs.writeFileSync(outPath, html, "utf8");
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`\u001b[32m✅  Generated docs-site/index.html (${sizeKb} KB)\u001b[0m`);
console.log(`    Sections: ${sections.length}`);
console.log(`    Deploy to: /var/www/doc.vaxplan.org/`);
