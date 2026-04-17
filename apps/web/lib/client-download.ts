export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function openPreviewHtml(title: string, html: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) {
    return;
  }

  previewWindow.document.write(`<!doctype html><html><head><title>${title}</title><meta charset=\"utf-8\"/></head><body>${html}</body></html>`);
  previewWindow.document.close();
}
