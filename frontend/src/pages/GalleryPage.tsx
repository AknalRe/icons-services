import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, RefreshCw, Search, Terminal } from "lucide-react";
import { api } from "../lib/api";
import { withBasePath } from "../lib/basePath";
import type { Category, IconItem, PublicStats } from "../types";
import { IconDetailModal } from "../components/IconDetailModal";

const SIZE_OPTIONS = [24, 32, 44];
const COLOR_SWATCHES = [
  { label: "Bawaan tema", value: "currentColor" },
  { label: "Biru Reneo", value: "#2563eb" },
  { label: "Hijau", value: "#10b981" },
  { label: "Kuning", value: "#f59e0b" },
  { label: "Merah", value: "#ef4444" },
];

export function GalleryPage() {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeStyle, setActiveStyle] = useState("");
  const [activeSource, setActiveSource] = useState<"" | "official" | "community">("");
  const [sort, setSort] = useState("featured");

  const [previewSize, setPreviewSize] = useState(32);
  const [previewColor, setPreviewColor] = useState("currentColor");
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  const [copiedCdn, setCopiedCdn] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [iconsRes, catRes] = await Promise.all([
        api.listPublicIcons({
          q: search.trim() || undefined,
          category: activeCategory || undefined,
          style: activeStyle || undefined,
          source: activeSource || undefined,
          sort,
        }),
        api.listCategories(),
      ]);
      setIcons(iconsRes.icons);
      setStats(iconsRes.stats);
      setCategories(catRes.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat galeri ikon.");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, activeStyle, activeSource, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const hasFilters = Boolean(search.trim() || activeCategory || activeStyle || activeSource);
  const resetFilters = () => {
    setSearch("");
    setActiveCategory("");
    setActiveStyle("");
    setActiveSource("");
    setSort("featured");
  };

  const sampleSlug = icons[0]?.slug || "reneo-icons";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sampleCdn = `${origin}${withBasePath(`/api/icons/${sampleSlug}.svg`)}`;
  const bundleUrl = withBasePath(
    activeCategory ? `/api/icons/bundle.zip?category=${encodeURIComponent(activeCategory)}` : "/api/icons/bundle.zip"
  );

  const copyCdn = async () => {
    try {
      await navigator.clipboard.writeText(sampleCdn);
      setCopiedCdn(true);
      window.setTimeout(() => setCopiedCdn(false), 1800);
    } catch {
      setCopiedCdn(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
      {/* Header + inline metrics + direct SVG CDN bar */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]" style={{ color: "var(--ink)" }}>
            Galeri Ikon SVG Reneo
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-[15px]" style={{ color: "var(--ink-body)" }}>
            Layanan terpusat untuk menyimpan, meninjau, dan mengambil ikon SVG brand maupun antarmuka melalui URL CDN
            langsung, React JSX, PNG, dan paket ZIP.
          </p>

          {stats && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="status-dot" style={{ backgroundColor: "var(--emerald)" }} aria-hidden="true" />
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>
                  {stats.total_published}
                </strong>{" "}
                ikon terbit
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>
                  {stats.total_official}
                </strong>{" "}
                Official Reneo
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>
                  {stats.total_downloads}
                </strong>{" "}
                unduhan
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 lg:col-span-5">
          <div
            className="overflow-hidden rounded-[10px] border"
            style={{ backgroundColor: "var(--code-bg)", borderColor: "var(--code-border)" }}
          >
            <div
              className="flex items-center justify-between border-b px-3.5 py-2"
              style={{ borderColor: "var(--code-border)" }}
            >
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Terminal size={12} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                <span className="truncate font-mono">Endpoint CDN langsung</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void copyCdn()}
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/70 px-2 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700"
                >
                  {copiedCdn ? <Check size={11} strokeWidth={2} aria-hidden="true" /> : <Copy size={11} strokeWidth={1.75} aria-hidden="true" />}
                  {copiedCdn ? "Tersalin" : "Salin"}
                </button>
                <a
                  href={bundleUrl}
                  className="inline-flex h-6 items-center gap-1 rounded-md border border-blue-500/40 bg-blue-600/20 px-2 text-[11px] font-medium text-blue-200 no-underline transition-colors hover:bg-blue-600/35"
                >
                  <Download size={11} strokeWidth={1.75} aria-hidden="true" />
                  ZIP
                </a>
              </div>
            </div>
            <pre className="reneo-code-scroll overflow-x-auto px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-slate-200">
              <code>{sampleCdn}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Flat borderless filter & live preview customizer toolbar */}
      <section
        aria-label="Filter dan kustomisasi pratinjau ikon"
        className="mt-7 border-y py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <label htmlFor="icon-search" className="sr-only">
              Cari nama ikon, slug, atau tag
            </label>
            <Search
              size={15}
              strokeWidth={1.75}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-muted)" }}
            />
            <input
              id="icon-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama ikon, slug, atau tag..."
              className="reneo-field h-9 w-full pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter gaya ikon"
              value={activeStyle}
              onChange={(e) => setActiveStyle(e.target.value)}
              className="reneo-field reneo-select h-9 pl-3 text-xs font-medium"
            >
              <option value="">Semua gaya</option>
              <option value="brand">Brand (Berwarna)</option>
              <option value="outline">Outline (Monokrom)</option>
              <option value="solid">Solid (Monokrom)</option>
            </select>

            <select
              aria-label="Urutkan ikon"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="reneo-field reneo-select h-9 pl-3 text-xs font-medium"
            >
              <option value="featured">Unggulan</option>
              <option value="name">Nama (A-Z)</option>
              <option value="downloads">Terbanyak</option>
              <option value="newest">Terbaru</option>
            </select>

            {/* Live size control */}
            <div
              className="inline-flex h-9 items-center rounded-lg border p-0.5"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
              role="group"
              aria-label="Ukuran pratinjau ikon"
            >
              {SIZE_OPTIONS.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPreviewSize(sz)}
                  aria-pressed={previewSize === sz}
                  className="h-7 rounded-md px-2 font-mono text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: previewSize === sz ? "var(--surface-elevated)" : "transparent",
                    color: previewSize === sz ? "var(--accent-text)" : "var(--ink-muted)",
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Live color swatches for mono icons */}
            <div
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-2"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
              role="group"
              aria-label="Warna pratinjau ikon monokrom"
            >
              {COLOR_SWATCHES.map((swatch) => {
                const active = previewColor === swatch.value;
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    aria-label={swatch.label}
                    aria-pressed={active}
                    onClick={() => setPreviewColor(swatch.value)}
                    className="h-4 w-4 rounded-full border transition-transform"
                    style={{
                      backgroundColor: swatch.value === "currentColor" ? "var(--ink)" : swatch.value,
                      borderColor: active ? "var(--accent)" : "var(--border-strong)",
                      transform: active ? "scale(1.18)" : "scale(1)",
                    }}
                  />
                );
              })}
              <input
                type="color"
                aria-label="Pilih warna kustom"
                value={previewColor === "currentColor" ? "#2563eb" : previewColor}
                onChange={(e) => setPreviewColor(e.target.value)}
                className="h-5 w-5 rounded border-0 bg-transparent p-0"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              aria-label="Muat ulang galeri ikon"
              className="reneo-btn-ghost inline-flex h-9 w-9 items-center justify-center"
            >
              <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter kategori">
            <button
              type="button"
              onClick={() => setActiveCategory("")}
              className="h-7 rounded-md border px-2.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeCategory === "" ? "var(--accent-tint)" : "transparent",
                borderColor: activeCategory === "" ? "var(--accent-border)" : "transparent",
                color: activeCategory === "" ? "var(--accent-text)" : "var(--ink-muted)",
              }}
            >
              Semua kategori
            </button>
            {categories.map((cat) => {
              const active = activeCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.slug)}
                  className="h-7 rounded-md border px-2.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--accent-tint)" : "transparent",
                    borderColor: active ? "var(--accent-border)" : "transparent",
                    color: active ? "var(--accent-text)" : "var(--ink-muted)",
                  }}
                >
                  {cat.name}{" "}
                  <span className="font-mono text-[11px] opacity-75">({cat.published_count ?? 0})</span>
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex h-7 items-center rounded-md border p-0.5"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
            role="group"
            aria-label="Filter sumber ikon"
          >
            {(
              [
                { value: "", label: "Semua" },
                { value: "official", label: "Official Reneo" },
                { value: "community", label: "Non-Official" },
              ] as const
            ).map((opt) => {
              const active = activeSource === opt.value;
              return (
                <button
                  key={opt.value || "all"}
                  type="button"
                  onClick={() => setActiveSource(opt.value)}
                  aria-pressed={active}
                  className="h-6 rounded px-2 text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--surface-elevated)" : "transparent",
                    color: active ? "var(--accent-text)" : "var(--ink-muted)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Icon Grid */}
      <section aria-label="Daftar ikon" className="mt-6">
        {loading && (
          <div role="status" className="py-12 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
            Memuat galeri ikon...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "var(--danger-bg)",
              borderColor: "var(--danger)",
              color: "var(--danger-text)",
            }}
          >
            <p className="text-sm font-semibold">Gagal memuat galeri ikon</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="reneo-btn-ghost mt-3 inline-flex h-8 items-center px-3 text-xs font-semibold"
              style={{ borderColor: "var(--danger)", color: "var(--danger-text)" }}
            >
              Muat ulang daftar
            </button>
          </div>
        )}

        {!loading && !error && icons.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
              {hasFilters ? "Tidak ada ikon yang cocok dengan filter" : "Belum ada ikon yang dipublikasikan"}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
              {hasFilters
                ? "Ubah kata kunci pencarian atau hapus filter kategori dan gaya untuk melihat seluruh koleksi."
                : "Masuk ke Panel Admin untuk mengunggah ikon SVG pertama."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="reneo-btn-primary mt-4 inline-flex h-9 items-center px-4 text-xs"
              >
                Reset semua filter
              </button>
            )}
          </div>
        )}

        {!loading && !error && icons.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {icons.map((icon) => {
              const isMono = icon.style !== "brand";
              return (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className="reneo-card reneo-card--interactive group relative flex flex-col items-center justify-between gap-2.5 p-3.5 text-center"
                >
                  {icon.is_official && (
                    <span
                      className="absolute right-2 top-2 rounded border px-1 py-0.5 text-[9px] font-semibold leading-none"
                      style={{
                        backgroundColor: "var(--accent-tint)",
                        borderColor: "var(--accent-border)",
                        color: "var(--accent-text)",
                      }}
                    >
                      Official
                    </span>
                  )}

                  <div className="flex h-16 w-full items-center justify-center pt-2">
                    <div
                      className="icon-preview-box transition-transform duration-150 group-hover:scale-110"
                      style={{
                        width: `${previewSize}px`,
                        height: `${previewSize}px`,
                        color: isMono && previewColor !== "currentColor" ? previewColor : "var(--ink)",
                      }}
                      dangerouslySetInnerHTML={{ __html: icon.svg_content }}
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <div className="truncate text-xs font-semibold" style={{ color: "var(--ink)" }}>
                      {icon.name}
                    </div>
                    <div className="truncate font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                      {icon.slug}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <IconDetailModal
        icon={selectedIcon}
        previewColor={previewColor}
        onClose={() => setSelectedIcon(null)}
      />
    </main>
  );
}
