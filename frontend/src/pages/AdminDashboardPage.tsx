import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { FolderPlus, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { api } from "../lib/api";
import type { AdminSummary, Category, IconItem, IconStyle } from "../types";
import { Modal } from "../components/Modal";

interface IconFormState {
  id?: number;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  style: IconStyle;
  tagsText: string;
  author: string;
  svg_content: string;
  status: "published" | "draft";
  featured: boolean;
  is_official: boolean;
}

const EMPTY_FORM: IconFormState = {
  name: "",
  slug: "",
  description: "",
  category_id: "",
  style: "outline",
  tagsText: "",
  author: "Tim Reneo",
  svg_content:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="12" cy="12" r="9" />\n</svg>',
  status: "published",
  featured: false,
  is_official: false,
};

export function AdminDashboardPage() {
  const [section, setSection] = useState<"icons" | "categories">("icons");
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<IconFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<IconItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [iconsRes, catRes] = await Promise.all([
        api.listAdminIcons({ q: query.trim() || undefined, status: statusFilter || undefined }),
        api.listCategories(),
      ]);
      setIcons(iconsRes.icons);
      setSummary(iconsRes.summary);
      setCategories(catRes.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data panel admin.");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditModal = (icon: IconItem) => {
    setForm({
      id: icon.id,
      name: icon.name,
      slug: icon.slug,
      description: icon.description,
      category_id: icon.category_id ? String(icon.category_id) : "",
      style: icon.style,
      tagsText: icon.tags.join(", "),
      author: icon.author,
      svg_content: icon.svg_content,
      status: icon.status,
      featured: icon.featured,
      is_official: icon.is_official,
    });
    setFormError(null);
    setEditorOpen(true);
  };

  const handleImportSvg = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.svg$/i, "");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setForm((prev) => ({
        ...prev,
        slug: prev.slug || baseName.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        name: prev.name || baseName.replace(/[-_]+/g, " "),
        svg_content: text,
      }));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSaveIcon = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      style: form.style,
      tags: form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      author: form.author.trim() || "Tim Reneo",
      svg_content: form.svg_content,
      status: form.status,
      featured: form.featured,
      is_official: form.is_official,
    };

    try {
      if (form.id) {
        await api.updateIcon(form.id, payload);
      } else {
        await api.createIcon(payload);
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan ikon.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteIcon(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus ikon.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setSavingCat(true);
    setCatError(null);
    try {
      await api.createCategory({ name: catName.trim(), description: catDesc.trim() });
      setCatName("");
      setCatDesc("");
      await loadAll();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Gagal menambahkan kategori.");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await api.deleteCategory(id);
      await loadAll();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : "Gagal menghapus kategori.");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Panel Admin Reneo Icons
          </h1>
          {summary && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>{summary.total}</strong> total
              </span>
              <span>·</span>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--emerald-text)" }}>{summary.published}</strong> terbit
              </span>
              <span>·</span>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>{summary.draft}</strong> draf
              </span>
              <span>·</span>
              <span>
                <strong className="font-mono font-semibold" style={{ color: "var(--ink)" }}>{summary.downloads}</strong> unduhan
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-lg border p-0.5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
            <button
              type="button"
              onClick={() => setSection("icons")}
              className="h-7 rounded-md px-3 text-xs font-semibold"
              style={{
                backgroundColor: section === "icons" ? "var(--surface-elevated)" : "transparent",
                color: section === "icons" ? "var(--accent-text)" : "var(--ink-muted)",
              }}
            >
              Ikon ({icons.length})
            </button>
            <button
              type="button"
              onClick={() => setSection("categories")}
              className="h-7 rounded-md px-3 text-xs font-semibold"
              style={{
                backgroundColor: section === "categories" ? "var(--surface-elevated)" : "transparent",
                color: section === "categories" ? "var(--accent-text)" : "var(--ink-muted)",
              }}
            >
              Kategori ({categories.length})
            </button>
          </div>

          {section === "icons" && (
            <button
              type="button"
              onClick={openCreateModal}
              className="reneo-btn-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-xs"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Tambah Ikon
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border px-4 py-3 text-xs font-medium"
          style={{ backgroundColor: "var(--danger-bg)", borderColor: "var(--danger)", color: "var(--danger-text)" }}
        >
          {error}
        </div>
      )}

      {section === "icons" ? (
        <section className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1">
              <Search size={14} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari ikon..."
                className="reneo-field h-9 w-full pl-9 pr-3 text-sm"
              />
            </div>
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="reneo-field reneo-select h-9 pl-3 text-xs font-medium"
            >
              <option value="">Semua status</option>
              <option value="published">Terbit</option>
              <option value="draft">Draf</option>
            </select>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
              Memuat daftar ikon...
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-elevated)" }}>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>
                    <th className="px-4 py-2.5 font-semibold">Ikon</th>
                    <th className="px-4 py-2.5 font-semibold">Kategori</th>
                    <th className="px-4 py-2.5 font-semibold">Gaya</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {icons.map((icon) => (
                    <tr key={icon.id} className="hover:bg-slate-500/[0.04]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="icon-preview-box flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border p-1.5"
                            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                            dangerouslySetInnerHTML={{ __html: icon.svg_content }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--ink)" }}>
                              <span>{icon.name}</span>
                              {icon.is_official && (
                                <span
                                  className="rounded border px-1 py-0.5 text-[9px] font-semibold leading-none"
                                  style={{ backgroundColor: "var(--accent-tint)", borderColor: "var(--accent-border)", color: "var(--accent-text)" }}
                                >
                                  Official
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                              {icon.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--ink-body)" }}>
                        {icon.category_name || "Umum"}
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--ink-muted)" }}>
                        {icon.style}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="font-semibold"
                          style={{ color: icon.status === "published" ? "var(--emerald-text)" : "var(--ink-muted)" }}
                        >
                          {icon.status === "published" ? "Terbit" : "Draf"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(icon)}
                            aria-label={`Ubah ${icon.name}`}
                            className="reneo-btn-ghost inline-flex h-7 w-7 items-center justify-center"
                          >
                            <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(icon)}
                            aria-label={`Hapus ${icon.name}`}
                            className="reneo-btn-ghost inline-flex h-7 w-7 items-center justify-center"
                            style={{ color: "var(--danger-text)" }}
                          >
                            <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
          <form onSubmit={(e) => void handleCreateCategory(e)} className="reneo-card space-y-3 p-4 md:col-span-5">
            <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--ink)" }}>
              <FolderPlus size={15} strokeWidth={1.75} aria-hidden="true" />
              Tambah Kategori
            </h2>
            {catError && (
              <p className="text-xs font-medium" style={{ color: "var(--danger-text)" }}>
                {catError}
              </p>
            )}
            <div>
              <label htmlFor="cat-name" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Nama Kategori
              </label>
              <input
                id="cat-name"
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Contoh: Sosial Media"
                className="reneo-field h-9 w-full px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cat-desc" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Deskripsi
              </label>
              <input
                id="cat-desc"
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="reneo-field h-9 w-full px-3 text-sm"
              />
            </div>
            <button type="submit" disabled={savingCat} className="reneo-btn-primary h-9 px-4 text-xs">
              {savingCat ? "Menyimpan..." : "Simpan Kategori"}
            </button>
          </form>

          <div className="divide-y rounded-xl border md:col-span-7" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-elevated)" }}>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {cat.name}{" "}
                    <span className="font-mono text-xs font-normal" style={{ color: "var(--ink-muted)" }}>
                      ({cat.total_count ?? 0})
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {cat.description || cat.slug}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteCategory(cat.id)}
                  aria-label={`Hapus kategori ${cat.name}`}
                  className="reneo-btn-ghost inline-flex h-8 w-8 shrink-0 items-center justify-center"
                  style={{ color: "var(--danger-text)" }}
                >
                  <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Icon Editor Modal */}
      <Modal
        open={editorOpen}
        title={form.id ? `Ubah Ikon: ${form.name}` : "Tambah Ikon SVG Baru"}
        onClose={() => setEditorOpen(false)}
      >
        <form onSubmit={(e) => void handleSaveIcon(e)} className="space-y-3.5">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border px-3 py-2 text-xs font-medium"
              style={{ backgroundColor: "var(--danger-bg)", borderColor: "var(--danger)", color: "var(--danger-text)" }}
            >
              {formError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
            <span className="text-xs" style={{ color: "var(--ink-body)" }}>
              Unggah file `.svg` dari komputer atau tempel kode SVG langsung di bawah.
            </span>
            <label htmlFor="upload-svg" className="reneo-btn-secondary inline-flex h-8 items-center gap-1.5 px-3 text-xs">
              <Upload size={12} strokeWidth={1.75} aria-hidden="true" />
              Pilih file SVG
              <input id="upload-svg" type="file" accept=".svg,image/svg+xml" onChange={handleImportSvg} className="sr-only" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="i-name" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Nama Ikon
              </label>
              <input
                id="i-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="reneo-field h-9 w-full px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="i-slug" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Slug (nama file .svg)
              </label>
              <input
                id="i-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="otomatis jika kosong"
                className="reneo-field h-9 w-full px-3 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="i-cat" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Kategori
              </label>
              <select
                id="i-cat"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="reneo-field reneo-select h-9 w-full pl-3 text-xs"
              >
                <option value="">Umum</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="i-style" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Gaya Ikon
              </label>
              <select
                id="i-style"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value as IconStyle })}
                className="reneo-field reneo-select h-9 w-full pl-3 text-xs"
              >
                <option value="outline">Outline (Monokrom)</option>
                <option value="solid">Solid (Monokrom)</option>
                <option value="brand">Brand (Berwarna)</option>
              </select>
            </div>
            <div>
              <label htmlFor="i-status" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Status
              </label>
              <select
                id="i-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "published" | "draft" })}
                className="reneo-field reneo-select h-9 w-full pl-3 text-xs"
              >
                <option value="published">Terbit (Publik)</option>
                <option value="draft">Draf (Privat)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="i-tags" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Tag (pisahkan koma)
              </label>
              <input
                id="i-tags"
                type="text"
                value={form.tagsText}
                onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                placeholder="brand, server, ui"
                className="reneo-field h-9 w-full px-3 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col justify-end gap-1.5 pb-0.5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                <input
                  type="checkbox"
                  checked={form.is_official}
                  onChange={(e) => setForm({ ...form, is_official: e.target.checked })}
                />
                Tandai sebagai Official Reneo
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Tandai sebagai unggulan
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-9">
              <label htmlFor="i-svg" className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Kode SVG
              </label>
              <textarea
                id="i-svg"
                required
                rows={5}
                value={form.svg_content}
                onChange={(e) => setForm({ ...form, svg_content: e.target.value })}
                className="reneo-field reneo-code-scroll w-full p-2.5 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <span className="mb-1 block text-xs font-semibold" style={{ color: "var(--ink-body)" }}>
                Pratinjau
              </span>
              <div
                className="icon-checker flex h-[116px] items-center justify-center rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="icon-preview-box h-12 w-12"
                  style={{ color: "var(--ink)" }}
                  dangerouslySetInnerHTML={{ __html: form.svg_content }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3.5" style={{ borderColor: "var(--border)" }}>
            <button type="button" onClick={() => setEditorOpen(false)} className="reneo-btn-ghost h-9 px-4 text-xs">
              Batal
            </button>
            <button type="submit" disabled={saving} className="reneo-btn-primary h-9 px-4 text-xs">
              {saving ? "Menyimpan..." : "Simpan Ikon"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        title="Hapus Ikon"
        maxWidthClass="max-w-md"
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-sm" style={{ color: "var(--ink-body)" }}>
          Hapus ikon <strong style={{ color: "var(--ink)" }}>{deleteTarget?.name}</strong> (
          <code className="font-mono text-xs">{deleteTarget?.slug}.svg</code>)? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="reneo-btn-ghost h-9 px-4 text-xs">
            Batal
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleConfirmDelete()}
            className="h-9 rounded-lg px-4 text-xs font-semibold text-white"
            style={{ backgroundColor: "var(--danger)" }}
          >
            {deleting ? "Menghapus..." : "Hapus Ikon"}
          </button>
        </div>
      </Modal>
    </main>
  );
}
