import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import JSZip from "jszip";
import { requireAdmin } from "../auth";
import { applySvgParams, sanitizeSvg } from "../svg";

interface IconRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  style: "outline" | "solid" | "brand";
  tags: string;
  svg_content: string;
  view_box: string;
  author: string;
  status: "published" | "draft";
  featured: number;
  is_official: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

interface IconBody {
  slug?: string;
  name?: string;
  description?: string;
  category_id?: number | null;
  style?: "outline" | "solid" | "brand";
  tags?: string[];
  svg_content?: string;
  author?: string;
  status?: "published" | "draft";
  featured?: boolean;
  is_official?: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function safeParseArray(jsonText: string): string[] {
  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function formatIcon(row: IconRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name,
    category_slug: row.category_slug,
    style: row.style,
    tags: safeParseArray(row.tags),
    svg_content: row.svg_content,
    view_box: row.view_box,
    author: row.author,
    status: row.status,
    featured: Boolean(row.featured),
    is_official: Boolean(row.is_official),
    download_count: row.download_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function registerIconRoutes(app: FastifyInstance, db: DatabaseSync): void {
  // Public: list published icons with search, category, style, source, sort
  app.get<{
    Querystring: { q?: string; category?: string; style?: string; source?: string; sort?: string };
  }>("/api/icons", async (request) => {
    const q = (request.query.q || "").trim().toLowerCase();
    const category = (request.query.category || "").trim().toLowerCase();
    const style = (request.query.style || "").trim().toLowerCase();
    const source = (request.query.source || "").trim().toLowerCase();
    const sort = request.query.sort || "featured";

    let orderClause = "i.is_official DESC, i.featured DESC, i.name ASC";
    if (sort === "downloads") orderClause = "i.download_count DESC, i.name ASC";
    if (sort === "newest") orderClause = "i.created_at DESC";
    if (sort === "name") orderClause = "i.name ASC";

    const rows = db
      .prepare(`
        SELECT i.*, c.name AS category_name, c.slug AS category_slug
        FROM icons i
        LEFT JOIN categories c ON c.id = i.category_id
        WHERE i.status = 'published'
        ORDER BY ${orderClause}
      `)
      .all() as unknown as IconRow[];

    const filtered = rows.filter((row) => {
      if (source === "official" && !row.is_official) return false;
      if (source === "community" && row.is_official) return false;
      if (category && (row.category_slug || "").toLowerCase() !== category) return false;
      if (style && row.style !== style) return false;
      if (q) {
        const hay = `${row.name} ${row.slug} ${row.description} ${row.tags} ${row.author}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const stats = db
      .prepare(`
        SELECT
          COUNT(*) AS total_published,
          SUM(CASE WHEN is_official = 1 THEN 1 ELSE 0 END) AS total_official,
          COALESCE(SUM(download_count), 0) AS total_downloads
        FROM icons
        WHERE status = 'published'
      `)
      .get() as { total_published: number; total_official: number; total_downloads: number };

    return {
      icons: filtered.map(formatIcon),
      stats,
    };
  });

  // Public: ZIP bundle download (all, by category, or by comma-separated slugs)
  app.get<{ Querystring: { category?: string; slugs?: string } }>(
    "/api/icons/bundle.zip",
    async (request, reply) => {
      const category = (request.query.category || "").trim().toLowerCase();
      const slugsRaw = (request.query.slugs || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const rows = db
        .prepare(`
          SELECT i.id, i.slug, i.svg_content, c.slug AS category_slug
          FROM icons i
          LEFT JOIN categories c ON c.id = i.category_id
          WHERE i.status = 'published'
          ORDER BY i.slug ASC
        `)
        .all() as unknown as Array<{
          id: number;
          slug: string;
          svg_content: string;
          category_slug: string | null;
        }>;

      const selected = rows.filter((r) => {
        if (category && (r.category_slug || "").toLowerCase() !== category) return false;
        if (slugsRaw.length > 0 && !slugsRaw.includes(r.slug.toLowerCase())) return false;
        return true;
      });

      if (selected.length === 0) {
        return reply.code(404).send({ error: "Tidak ada ikon yang cocok untuk diunduh." });
      }

      const zip = new JSZip();
      const folderName = category ? `reneo-icons-${category}` : "reneo-icons";
      const folder = zip.folder(folderName);
      if (folder) {
        for (const icon of selected) {
          folder.file(`${icon.slug}.svg`, icon.svg_content);
        }
      }

      const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${folderName}.zip"`);
      return reply.send(buffer);
    }
  );

  // Public: direct SVG CDN endpoint (/api/icons/:slug.svg?color=2563eb&size=32)
  app.get<{ Params: { file: string }; Querystring: { color?: string; size?: string } }>(
    "/api/icons/:file",
    async (request, reply) => {
      const param = request.params.file;
      if (param.endsWith(".svg")) {
        const slug = param.slice(0, -4);
        const row = db
          .prepare("SELECT id, slug, svg_content FROM icons WHERE slug = ? AND status = 'published'")
          .get(slug) as { id: number; slug: string; svg_content: string } | undefined;

        if (!row) {
          return reply.code(404).send({ error: "Ikon SVG tidak ditemukan." });
        }

        const sizeNum = request.query.size ? Number(request.query.size) : undefined;
        const svgOut = applySvgParams(row.svg_content, {
          color: request.query.color,
          size: sizeNum,
        });

        reply.header("Content-Type", "image/svg+xml; charset=utf-8");
        reply.header("Cache-Control", "public, max-age=3600");
        reply.header("X-Content-Type-Options", "nosniff");
        return reply.send(svgOut);
      }

      // Single icon JSON detail
      const row = db
        .prepare(`
          SELECT i.*, c.name AS category_name, c.slug AS category_slug
          FROM icons i
          LEFT JOIN categories c ON c.id = i.category_id
          WHERE i.slug = ? AND i.status = 'published'
        `)
        .get(param) as unknown as IconRow | undefined;

      if (!row) {
        return reply.code(404).send({ error: "Ikon tidak ditemukan." });
      }

      return { icon: formatIcon(row) };
    }
  );

  // Public: single SVG download + increment download_count
  app.get<{ Params: { slug: string }; Querystring: { color?: string; size?: string } }>(
    "/api/icons/:slug/download",
    async (request, reply) => {
      const row = db
        .prepare("SELECT id, slug, svg_content FROM icons WHERE slug = ? AND status = 'published'")
        .get(request.params.slug) as { id: number; slug: string; svg_content: string } | undefined;

      if (!row) {
        return reply.code(404).send({ error: "Ikon tidak ditemukan." });
      }

      const sizeNum = request.query.size ? Number(request.query.size) : undefined;
      const svgOut = applySvgParams(row.svg_content, {
        color: request.query.color,
        size: sizeNum,
      });

      db.prepare("UPDATE icons SET download_count = download_count + 1 WHERE id = ?").run(row.id);

      reply.header("Content-Type", "image/svg+xml; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${row.slug}.svg"`);
      return reply.send(svgOut);
    }
  );

  // Admin: list all icons
  app.get<{ Querystring: { q?: string; status?: string } }>("/api/admin/icons", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const q = (request.query.q || "").trim().toLowerCase();
    const status = (request.query.status || "").trim().toLowerCase();

    const rows = db
      .prepare(`
        SELECT i.*, c.name AS category_name, c.slug AS category_slug
        FROM icons i
        LEFT JOIN categories c ON c.id = i.category_id
        ORDER BY i.updated_at DESC, i.id DESC
      `)
      .all() as unknown as IconRow[];

    const filtered = rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (q) {
        const hay = `${row.name} ${row.slug} ${row.description} ${row.tags}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const summary = db
      .prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
          COALESCE(SUM(download_count), 0) AS downloads
        FROM icons
      `)
      .get();

    return {
      icons: filtered.map(formatIcon),
      summary,
    };
  });

  // Admin: create icon
  app.post<{ Body: IconBody }>("/api/admin/icons", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const name = (request.body?.name || "").trim();
    const slug = slugify(request.body?.slug || name);
    const description = (request.body?.description || "").trim();
    const sanitized = sanitizeSvg(request.body?.svg_content || "");

    if (!name || !slug) {
      return reply.code(400).send({ error: "Nama dan slug ikon wajib diisi." });
    }
    if (!sanitized) {
      return reply.code(400).send({ error: "Kode SVG tidak valid. Pastikan diawali <svg dan diakhiri </svg>." });
    }

    const categoryId = request.body?.category_id ? Number(request.body.category_id) : null;
    const style =
      request.body?.style === "brand" || request.body?.style === "solid" ? request.body.style : "outline";
    const tags = Array.isArray(request.body?.tags)
      ? request.body.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const author = (request.body?.author || "Reneo").trim() || "Reneo";
    const status = request.body?.status === "draft" ? "draft" : "published";
    const featured = request.body?.featured ? 1 : 0;
    const isOfficial =
      request.body?.is_official !== undefined
        ? request.body.is_official
          ? 1
          : 0
        : slug.includes("reneo") || name.toLowerCase().includes("reneo")
          ? 1
          : 0;

    try {
      const info = db
        .prepare(`
          INSERT INTO icons (
            slug, name, description, category_id, style, tags,
            svg_content, view_box, author, status, featured, is_official
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          slug,
          name,
          description,
          categoryId,
          style,
          JSON.stringify(tags),
          sanitized.svg,
          sanitized.viewBox,
          author,
          status,
          featured,
          isOfficial
        );

      const created = db
        .prepare(`
          SELECT i.*, c.name AS category_name, c.slug AS category_slug
          FROM icons i
          LEFT JOIN categories c ON c.id = i.category_id
          WHERE i.id = ?
        `)
        .get(info.lastInsertRowid) as unknown as IconRow;

      return reply.code(201).send({ icon: formatIcon(created) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE")) {
        return reply.code(409).send({ error: `Ikon dengan slug "${slug}" sudah terdaftar.` });
      }
      throw err;
    }
  });

  // Admin: update icon
  app.patch<{ Params: { id: string }; Body: IconBody }>("/api/admin/icons/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const id = Number(request.params.id);
    const existing = db.prepare("SELECT * FROM icons WHERE id = ?").get(id) as unknown as IconRow | undefined;
    if (!existing) {
      return reply.code(404).send({ error: "Ikon tidak ditemukan." });
    }

    const name = request.body?.name !== undefined ? request.body.name.trim() : existing.name;
    const slug = request.body?.slug !== undefined ? slugify(request.body.slug) : existing.slug;
    const description =
      request.body?.description !== undefined ? request.body.description.trim() : existing.description;
    const categoryId =
      request.body?.category_id !== undefined
        ? request.body.category_id === null
          ? null
          : Number(request.body.category_id)
        : existing.category_id;
    const style =
      request.body?.style !== undefined
        ? request.body.style === "brand" || request.body.style === "solid"
          ? request.body.style
          : "outline"
        : existing.style;
    const tags =
      request.body?.tags !== undefined
        ? JSON.stringify(request.body.tags.map((t) => String(t).trim()).filter(Boolean))
        : existing.tags;
    const author = request.body?.author !== undefined ? request.body.author.trim() : existing.author;
    const status =
      request.body?.status !== undefined ? (request.body.status === "draft" ? "draft" : "published") : existing.status;
    const featured = request.body?.featured !== undefined ? (request.body.featured ? 1 : 0) : existing.featured;
    const isOfficial =
      request.body?.is_official !== undefined ? (request.body.is_official ? 1 : 0) : existing.is_official;

    let svgContent = existing.svg_content;
    let viewBox = existing.view_box;
    if (request.body?.svg_content !== undefined) {
      const sanitized = sanitizeSvg(request.body.svg_content);
      if (!sanitized) {
        return reply.code(400).send({ error: "Kode SVG tidak valid." });
      }
      svgContent = sanitized.svg;
      viewBox = sanitized.viewBox;
    }

    if (!name || !slug) {
      return reply.code(400).send({ error: "Nama dan slug ikon wajib diisi." });
    }

    try {
      db.prepare(`
        UPDATE icons SET
          slug = ?, name = ?, description = ?, category_id = ?, style = ?, tags = ?,
          svg_content = ?, view_box = ?, author = ?, status = ?, featured = ?, is_official = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(slug, name, description, categoryId, style, tags, svgContent, viewBox, author, status, featured, isOfficial, id);

      const updated = db
        .prepare(`
          SELECT i.*, c.name AS category_name, c.slug AS category_slug
          FROM icons i
          LEFT JOIN categories c ON c.id = i.category_id
          WHERE i.id = ?
        `)
        .get(id) as unknown as IconRow;

      return { icon: formatIcon(updated) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE")) {
        return reply.code(409).send({ error: `Slug "${slug}" sudah dipakai ikon lain.` });
      }
      throw err;
    }
  });

  // Admin: delete icon
  app.delete<{ Params: { id: string } }>("/api/admin/icons/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const id = Number(request.params.id);
    const info = db.prepare("DELETE FROM icons WHERE id = ?").run(id);
    if (info.changes === 0) {
      return reply.code(404).send({ error: "Ikon tidak ditemukan." });
    }
    return { ok: true };
  });
}
