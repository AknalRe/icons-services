import { useState } from "react";
import { Check, Code2, Copy, Download, ImageDown, Link2 } from "lucide-react";
import { withBasePath } from "../lib/basePath";
import { applyColorToSvg, downloadPngFromSvg, toReactJsx } from "../lib/svgExport";
import type { IconItem } from "../types";
import { Modal } from "./Modal";

interface IconDetailModalProps {
  icon: IconItem | null;
  previewColor: string;
  onClose: () => void;
}

const PNG_SIZES = [64, 128, 256, 512];

export function IconDetailModal({ icon, previewColor, onClose }: IconDetailModalProps) {
  const [codeTab, setCodeTab] = useState<"svg" | "jsx" | "url">("svg");
  const [pngSize, setPngSize] = useState(256);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadingPng, setDownloadingPng] = useState(false);

  if (!icon) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isMono = icon.style !== "brand";
  const effectiveColor = isMono ? previewColor : "";
  const colorQuery =
    effectiveColor && effectiveColor !== "currentColor"
      ? `?color=${encodeURIComponent(effectiveColor.replace(/^#/, ""))}`
      : "";

  const cdnUrl = `${origin}${withBasePath(`/api/icons/${encodeURIComponent(icon.slug)}.svg`)}${colorQuery}`;
  const downloadSvgUrl = `${withBasePath(`/api/icons/${encodeURIComponent(icon.slug)}/download`)}${colorQuery}`;
  const exportSvg = isMono ? applyColorToSvg(icon.svg_content, effectiveColor) : icon.svg_content;
  const jsxCode = toReactJsx(icon.slug, exportSvg);
  const imgTagCode = `<img src="${cdnUrl}" alt="${icon.name}" width="32" height="32" />`;

  const activeCode = codeTab === "svg" ? exportSvg : codeTab === "jsx" ? jsxCode : imgTagCode;

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleDownloadPng = async () => {
    setDownloadingPng(true);
    try {
      await downloadPngFromSvg(icon.slug, icon.svg_content, pngSize, isMono ? effectiveColor : undefined);
    } finally {
      setDownloadingPng(false);
    }
  };

  return (
    <Modal open={Boolean(icon)} title={icon.name} subtitle={`${icon.slug}.svg · viewBox ${icon.view_box}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <div
            className="icon-checker flex h-44 items-center justify-center rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="icon-preview-box h-24 w-24"
              style={{ color: isMono && previewColor !== "currentColor" ? previewColor : "var(--ink)" }}
              dangerouslySetInnerHTML={{ __html: icon.svg_content }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {icon.is_official && (
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--accent-tint)",
                  borderColor: "var(--accent-border)",
                  color: "var(--accent-text)",
                }}
              >
                Official Reneo
              </span>
            )}
            <span style={{ color: "var(--ink-muted)" }}>{icon.category_name || "Umum"}</span>
            <span style={{ color: "var(--ink-muted)" }}>·</span>
            <span className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
              {icon.style}
            </span>
          </div>

          {icon.description && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--ink-body)" }}>
              {icon.description}
            </p>
          )}

          {icon.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
              {icon.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 sm:col-span-7">
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void copyValue("svg", exportSvg)}
                className="reneo-btn-primary inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs"
              >
                {copiedKey === "svg" ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.75} aria-hidden="true" />}
                {copiedKey === "svg" ? "SVG Tersalin" : "Salin SVG"}
              </button>
              <button
                type="button"
                onClick={() => void copyValue("jsx", jsxCode)}
                className="reneo-btn-secondary inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs"
              >
                {copiedKey === "jsx" ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : <Code2 size={13} strokeWidth={1.75} aria-hidden="true" />}
                {copiedKey === "jsx" ? "JSX Tersalin" : "Salin React JSX"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void copyValue("url", cdnUrl)}
                className="reneo-btn-ghost inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs font-medium"
              >
                {copiedKey === "url" ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : <Link2 size={13} strokeWidth={1.75} aria-hidden="true" />}
                {copiedKey === "url" ? "URL Tersalin" : "Salin URL CDN"}
              </button>
              <a
                href={downloadSvgUrl}
                className="reneo-btn-ghost inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs font-medium no-underline"
              >
                <Download size={13} strokeWidth={1.75} aria-hidden="true" />
                Unduh .SVG
              </a>
            </div>

            <div
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
            >
              <div className="flex items-center gap-2">
                <label htmlFor="png-size-select" className="text-xs font-medium" style={{ color: "var(--ink-body)" }}>
                  Ekspor PNG
                </label>
                <select
                  id="png-size-select"
                  value={pngSize}
                  onChange={(e) => setPngSize(Number(e.target.value))}
                  className="reneo-field reneo-select h-7 pl-2 text-xs font-mono"
                >
                  {PNG_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}x{sz}px
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={downloadingPng}
                onClick={() => void handleDownloadPng()}
                className="reneo-btn-secondary inline-flex h-7 items-center gap-1.5 px-2.5 text-xs"
              >
                <ImageDown size={13} strokeWidth={1.75} aria-hidden="true" />
                {downloadingPng ? "Memproses..." : "Unduh PNG"}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="inline-flex gap-1" role="tablist">
                {(
                  [
                    { id: "svg", label: "SVG" },
                    { id: "jsx", label: "React JSX" },
                    { id: "url", label: "HTML <img>" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={codeTab === tab.id}
                    onClick={() => setCodeTab(tab.id)}
                    className="h-7 rounded-md px-2.5 text-[11px] font-semibold transition-colors"
                    style={{
                      backgroundColor: codeTab === tab.id ? "var(--accent-tint)" : "transparent",
                      color: codeTab === tab.id ? "var(--accent-text)" : "var(--ink-muted)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void copyValue("code", activeCode)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                style={{ color: "var(--accent-text)" }}
              >
                {copiedKey === "code" ? <Check size={11} strokeWidth={2} aria-hidden="true" /> : <Copy size={11} strokeWidth={1.75} aria-hidden="true" />}
                {copiedKey === "code" ? "Tersalin" : "Salin kode"}
              </button>
            </div>
            <pre
              className="reneo-code-scroll max-h-36 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed text-slate-200"
              style={{ backgroundColor: "var(--code-bg)", borderColor: "var(--code-border)" }}
            >
              <code>{activeCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </Modal>
  );
}
