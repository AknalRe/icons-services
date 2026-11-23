import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config";
import { hashPassword } from "./auth";
import { BUILTIN_ICONS } from "./seedIcons";

let dbInstance: DatabaseSync | null = null;

export function getDb(customPath?: string): DatabaseSync {
  if (dbInstance && !customPath) return dbInstance;

  const dbPath = customPath || path.join(config.dataDir, "icons.sqlite");
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS icons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      style TEXT NOT NULL DEFAULT 'outline' CHECK(style IN ('outline', 'solid', 'brand')),
      tags TEXT NOT NULL DEFAULT '[]',
      svg_content TEXT NOT NULL,
      view_box TEXT NOT NULL DEFAULT '0 0 24 24',
      author TEXT NOT NULL DEFAULT 'Reneo',
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published', 'draft')),
      featured INTEGER NOT NULL DEFAULT 0,
      is_official INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_icons_status ON icons(status);
    CREATE INDEX IF NOT EXISTS idx_icons_category ON icons(category_id);
    CREATE INDEX IF NOT EXISTS idx_icons_style ON icons(style);
  `);

  seedInitialData(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function seedInitialData(db: DatabaseSync): void {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c === 0) {
    db.prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run(config.adminEmail.toLowerCase(), "Admin Reneo", hashPassword(config.adminPassword), "admin");
  }

  const catCount = db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number };
  if (catCount.c === 0) {
    const defaultCategories = [
      { slug: "brand-reneo", name: "Brand Reneo", description: "Logo dan identitas resmi ekosistem produk Reneo.", sort: 1 },
      { slug: "aplikasi-server", name: "Aplikasi & Layanan", description: "Ikon brand aplikasi self-hosted, monitoring, dan infrastruktur.", sort: 2 },
      { slug: "antarmuka-ui", name: "Antarmuka & UI", description: "Ikon vektor monokrom (currentColor) siap ubah warna dan ukuran.", sort: 3 },
      { slug: "server-devops", name: "Server & DevOps", description: "Ikon terminal, database, jaringan, dan keamanan sistem.", sort: 4 },
    ];
    const insertCat = db.prepare(
      "INSERT INTO categories (slug, name, description, sort_order) VALUES (?, ?, ?, ?)"
    );
    for (const c of defaultCategories) {
      insertCat.run(c.slug, c.name, c.description, c.sort);
    }
  }

  const getCatId = db.prepare("SELECT id FROM categories WHERE slug = ?");
  const insertIcon = db.prepare(`
    INSERT OR IGNORE INTO icons (
      slug, name, description, category_id, style, tags,
      svg_content, view_box, author, status, featured, is_official
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `);

  for (const icon of BUILTIN_ICONS) {
    const cat = getCatId.get(icon.categorySlug) as { id: number } | undefined;
    insertIcon.run(
      icon.slug,
      icon.name,
      icon.description,
      cat?.id ?? null,
      icon.style,
      JSON.stringify(icon.tags),
      icon.svgContent,
      icon.viewBox,
      icon.author,
      icon.featured,
      icon.isOfficial
    );
  }
}
