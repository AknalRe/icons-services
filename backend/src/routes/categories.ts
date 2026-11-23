import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { requireAdmin } from "../auth";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function registerCategoryRoutes(app: FastifyInstance, db: DatabaseSync): void {
  app.get("/api/categories", async () => {
    const rows = db
      .prepare(`
        SELECT c.id, c.slug, c.name, c.description, c.sort_order,
          (SELECT COUNT(*) FROM icons i WHERE i.category_id = c.id AND i.status = 'published') AS published_count,
          (SELECT COUNT(*) FROM icons i WHERE i.category_id = c.id) AS total_count
        FROM categories c
        ORDER BY c.sort_order ASC, c.name ASC
      `)
      .all();
    return { categories: rows };
  });

  app.post<{ Body: { name?: string; slug?: string; description?: string; sort_order?: number } }>(
    "/api/admin/categories",
    async (request, reply) => {
      if (!(await requireAdmin(request, reply))) return;

      const name = (request.body?.name || "").trim();
      const slug = slugify(request.body?.slug || name);
      const description = (request.body?.description || "").trim();
      const sortOrder = Number(request.body?.sort_order ?? 10);

      if (!name || !slug) {
        return reply.code(400).send({ error: "Nama kategori wajib diisi." });
      }

      try {
        const info = db
          .prepare("INSERT INTO categories (slug, name, description, sort_order) VALUES (?, ?, ?, ?)")
          .run(slug, name, description, Number.isFinite(sortOrder) ? sortOrder : 10);
        const created = db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid);
        return reply.code(201).send({ category: created });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("UNIQUE")) {
          return reply.code(409).send({ error: `Kategori dengan slug "${slug}" sudah ada.` });
        }
        throw err;
      }
    }
  );

  app.delete<{ Params: { id: string } }>("/api/admin/categories/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const id = Number(request.params.id);
    const info = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    if (info.changes === 0) {
      return reply.code(404).send({ error: "Kategori tidak ditemukan." });
    }
    return { ok: true };
  });
}
