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
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.zIndex = "-1";
  document.body.appendChild(wrapper);
  try {
    await html2pdf()
    .set({
      margin: 0,
      filename: `${safeName(title)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        onclone: (clonedDocument: Document) => {
          // html2canvas cannot parse modern oklch theme tokens from the app shell.
          for (const style of clonedDocument.querySelectorAll('style, link[rel="stylesheet"]')) style.remove();
          const exportStyle = clonedDocument.createElement("style");
          exportStyle.textContent = `*{box-sizing:border-box}body{margin:0;background:#fff;color:#111}.doc-export{width:794px;font:12pt/1.6 'Times New Roman',serif;color:#111;background:#fff}.doc-sheet{width:794px;min-height:1122px;padding:64px 72px;background:#fff;break-inside:avoid}.doc-sheet:not(:first-child){break-before:page;page-break-before:always}.doc-sheet h1{font-size:18pt}.doc-sheet h2{font-size:15pt}.doc-sheet h3{font-size:13pt}.doc-sheet p{text-align:justify;margin:0 0 .8em}.doc-sheet ul,.doc-sheet ol{margin:0 0 .8em 1.4em}.doc-sheet table{width:100%;border-collapse:collapse}.doc-sheet td,.doc-sheet th{border:1px solid #999;padding:6px 8px}.doc-sheet img{max-width:100%}`;
          clonedDocument.head.appendChild(exportStyle);
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(wrapper)
      .save();
  } finally {
    wrapper.remove();
  }
}