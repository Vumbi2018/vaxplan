#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import MarkdownIt from "markdown-it";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const inputPath = path.join(root, "docs/USER_GUIDE.md");
const outputPath = path.join(root, "exports/VaxPlan-User-Guide.pdf");
const publicPath = path.join(root, "client/public/VaxPlan-User-Guide.pdf");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(publicPath), { recursive: true });

const md = new MarkdownIt({ html: false, linkify: true });
const tokens = md.parse(fs.readFileSync(inputPath, "utf8"), {});

const BRAND = { primary: "#1e40af", accent: "#0ea5e9", muted: "#475569" };
const PAGE = { size: "A4", margins: { top: 56, bottom: 64, left: 56, right: 56 } };

const doc = new PDFDocument(PAGE);
doc.pipe(fs.createWriteStream(outputPath));

function header() {
  doc.save();
  doc.fillColor(BRAND.primary).fontSize(9).font("Helvetica-Bold")
    .text("VaxPlan — End-User Guide", PAGE.margins.left, 28, { align: "left" });
  doc.fillColor(BRAND.muted).font("Helvetica")
    .text(new Date().toISOString().slice(0, 10), PAGE.margins.left, 28,
      { align: "right", width: doc.page.width - PAGE.margins.left - PAGE.margins.right });
  doc.moveTo(PAGE.margins.left, 44)
     .lineTo(doc.page.width - PAGE.margins.right, 44)
     .strokeColor(BRAND.accent).lineWidth(0.5).stroke();
  doc.restore();
}
function footer() {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.save().fillColor(BRAND.muted).fontSize(8).font("Helvetica")
      .text(`VaxPlan User Guide  •  Page ${i + 1} of ${range.count}`,
        PAGE.margins.left, doc.page.height - 36,
        { align: "center", width: doc.page.width - PAGE.margins.left - PAGE.margins.right });
    doc.restore();
  }
}
doc.on("pageAdded", header);
header();

function coverPage() {
  doc.font("Helvetica-Bold").fontSize(36).fillColor(BRAND.primary)
    .text("VaxPlan", { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(20).fillColor("#0f172a")
    .text("End-User Guide", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(11).fillColor(BRAND.muted).font("Helvetica")
    .text("A role-by-role manual for the VaxPlan GIS microplanning platform.",
      { align: "center", width: 360, indent: 0 });
  doc.moveDown(8);
  doc.fontSize(9).text(`Generated ${new Date().toISOString().slice(0, 10)}`,
    { align: "center" });
  doc.addPage();
}
coverPage();

let listStack = [];

function renderInline(tokens) {
  if (!tokens) return;
  for (const t of tokens) {
    if (t.type === "text") {
      doc.fillColor("#0f172a").font(boldDepth ? "Helvetica-Bold" : (italicDepth ? "Helvetica-Oblique" : "Helvetica"))
         .text(t.content, { continued: true });
    } else if (t.type === "strong_open") boldDepth++;
    else if (t.type === "strong_close") boldDepth--;
    else if (t.type === "em_open") italicDepth++;
    else if (t.type === "em_close") italicDepth--;
    else if (t.type === "code_inline") {
      doc.font("Courier").fillColor(BRAND.primary).text(t.content, { continued: true });
    } else if (t.type === "softbreak" || t.type === "hardbreak") {
      doc.text(" ", { continued: true });
    } else if (t.type === "link_open") {
      const href = t.attrs?.find((a) => a[0] === "href")?.[1];
      linkHref = href;
    } else if (t.type === "link_close") {
      linkHref = null;
    } else if (t.type === "inline") {
      renderInline(t.children);
    }
  }
}

let boldDepth = 0;
let italicDepth = 0;
let linkHref = null;

function ensureSpace(lines = 3) {
  if (doc.y + lines * 14 > doc.page.height - PAGE.margins.bottom) doc.addPage();
}

let i = 0;
while (i < tokens.length) {
  const t = tokens[i];
  if (t.type === "heading_open") {
    const level = parseInt(t.tag.slice(1));
    const inline = tokens[i + 1];
    const text = inline.content;
    ensureSpace(4);
    doc.moveDown(level <= 2 ? 0.8 : 0.5);
    const size = { 1: 22, 2: 17, 3: 14, 4: 12, 5: 11, 6: 10 }[level] || 11;
    doc.font("Helvetica-Bold").fontSize(size).fillColor(BRAND.primary)
       .text(text, { align: "left" });
    if (level <= 2) {
      doc.moveTo(PAGE.margins.left, doc.y + 2)
         .lineTo(doc.page.width - PAGE.margins.right, doc.y + 2)
         .strokeColor(BRAND.accent).lineWidth(0.5).stroke();
    }
    doc.moveDown(0.3);
    i += 3;
  } else if (t.type === "paragraph_open") {
    const inline = tokens[i + 1];
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a")
       .text("", { paragraphGap: 4, lineGap: 1.5 });
    renderInline(inline.children);
    doc.text("");
    doc.moveDown(0.3);
    i += 3;
  } else if (t.type === "bullet_list_open" || t.type === "ordered_list_open") {
    listStack.push({ type: t.type === "bullet_list_open" ? "ul" : "ol", n: 1 });
    i += 1;
  } else if (t.type === "bullet_list_close" || t.type === "ordered_list_close") {
    listStack.pop();
    doc.moveDown(0.3);
    i += 1;
  } else if (t.type === "list_item_open") {
    const top = listStack[listStack.length - 1];
    const bullet = top.type === "ul" ? "•" : `${top.n}.`;
    top.n++;
    const indent = (listStack.length - 1) * 14;
    ensureSpace(2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.accent)
       .text(bullet, PAGE.margins.left + indent, doc.y, { continued: true, width: 14 });
    doc.font("Helvetica").fillColor("#0f172a").text(" ", { continued: true });
    i += 1;
  } else if (t.type === "list_item_close") {
    doc.text("");
    i += 1;
  } else if (t.type === "inline") {
    renderInline(t.children);
    i += 1;
  } else if (t.type === "paragraph_close") {
    i += 1;
  } else if (t.type === "fence" || t.type === "code_block") {
    ensureSpace(4);
    doc.font("Courier").fontSize(9).fillColor("#0f172a")
       .text(t.content, { paragraphGap: 6 });
    i += 1;
  } else if (t.type === "blockquote_open") {
    doc.save();
    i += 1;
    // simple: render inner paragraphs indented
  } else if (t.type === "blockquote_close") {
    doc.restore();
    doc.moveDown(0.4);
    i += 1;
  } else if (t.type === "hr") {
    doc.moveDown(0.5);
    doc.moveTo(PAGE.margins.left, doc.y)
       .lineTo(doc.page.width - PAGE.margins.right, doc.y)
       .strokeColor("#cbd5e1").lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    i += 1;
  } else if (t.type === "table_open") {
    // render tables as simple two-column text lines until table_close
    let j = i + 1;
    const rows = [];
    let currentRow = [];
    while (j < tokens.length && tokens[j].type !== "table_close") {
      if (tokens[j].type === "tr_open") currentRow = [];
      else if (tokens[j].type === "tr_close") rows.push(currentRow);
      else if (tokens[j].type === "inline") currentRow.push(tokens[j].content);
      j++;
    }
    ensureSpace(rows.length + 2);
    const colCount = rows[0]?.length || 1;
    const tableLeft = PAGE.margins.left;
    const tableWidth = doc.page.width - PAGE.margins.left - PAGE.margins.right;
    const colWidth = tableWidth / colCount;
    rows.forEach((row, idx) => {
      const y = doc.y;
      const isHeader = idx === 0;
      doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9)
         .fillColor(isHeader ? BRAND.primary : "#0f172a");
      row.forEach((cell, c) => {
        doc.text(cell, tableLeft + c * colWidth, y, { width: colWidth - 6, continued: false });
      });
      const rowHeights = row.map((cell, c) =>
        doc.heightOfString(cell, { width: colWidth - 6 }));
      doc.y = y + Math.max(...rowHeights) + 4;
      if (isHeader) {
        doc.moveTo(tableLeft, doc.y - 2)
           .lineTo(tableLeft + tableWidth, doc.y - 2)
           .strokeColor(BRAND.accent).lineWidth(0.5).stroke();
      }
    });
    doc.moveDown(0.6);
    i = j + 1;
  } else {
    i += 1;
  }
}

footer();
doc.end();

await new Promise((resolve, reject) => {
  doc.on("end", resolve);
  doc.on("error", reject);
});
// Wait for the underlying write stream to finish flushing to disk before copying.
await new Promise((resolve, reject) => {
  const stream = doc.pipe ? null : null;
  // doc was piped earlier to a write stream; reach it via doc._writableState's pipes if needed.
  // Simpler & robust: poll until file exists and size matches reported bytes written.
  const start = Date.now();
  (function check() {
    try {
      const stat = fs.statSync(outputPath);
      if (stat.size > 0) return resolve();
    } catch {}
    if (Date.now() - start > 5000) return reject(new Error("PDF write timeout"));
    setTimeout(check, 50);
  })();
});
fs.copyFileSync(outputPath, publicPath);
const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`Wrote ${outputPath} (${sizeKb} KB)`);
console.log(`Copied to ${publicPath} (served by Vite at /VaxPlan-User-Guide.pdf)`);
