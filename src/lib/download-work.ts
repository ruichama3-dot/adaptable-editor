import { splitPages } from "@/lib/doc-pages";

function safeName(title: string) {
  return (title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").trim().slice(0, 100) || "trabalho");
}

export function downloadWord(title: string, html: string) {
  const body = splitPages(html)
    .map((page, index) => `<div${index ? ' style="page-break-before:always"' : ""}>${page}</div>`)
    .join("");
  const word = `<!DOCTYPE html><html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6}p{text-align:justify}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}img{max-width:100%}</style></head><body>${body}</body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", word], { type: "application/msword" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName(title)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPdf(title: string, html: string) {
  // Load only when requested, so the document editor remains light on mobile.
  const { default: html2pdf } = await import("html2pdf.js");
  const pages = splitPages(html);
  const wrapper = document.createElement("div");
  wrapper.className = "doc-export";
  wrapper.style.width = "794px";
  for (const content of pages) {
    const sheet = document.createElement("div");
    sheet.className = "doc-sheet";
    sheet.innerHTML = content;
    wrapper.appendChild(sheet);
  }
  await html2pdf()
    .set({
      margin: 0,
      filename: `${safeName(title)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1200 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(wrapper)
    .save();
}