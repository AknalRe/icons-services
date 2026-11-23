import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./server";
import { config } from "./config";

test("Reneo Icons API: gallery, direct SVG CDN, ZIP bundle, admin CRUD & sanitization", async () => {
  const app = await buildApp(":memory:");

  // 1. Public gallery returns seeded icons
  const listRes = await app.inject({ method: "GET", url: "/api/icons" });
  assert.equal(listRes.statusCode, 200);
  const listBody = listRes.json() as { icons: Array<{ slug: string; is_official: boolean }>; stats: { total_published: number } };
  assert.ok(listBody.icons.length >= 30);
  assert.ok(listBody.icons.some((i) => i.slug === "reneo-icons" && i.is_official));

  // 2. Direct SVG CDN endpoint works with color & size params
  const svgRes = await app.inject({ method: "GET", url: "/api/icons/server-rack.svg?color=2563eb&size=32" });
  assert.equal(svgRes.statusCode, 200);
  assert.match(String(svgRes.headers["content-type"]), /image\/svg\+xml/);
  assert.ok(svgRes.body.includes("#2563eb"));
  assert.ok(svgRes.body.includes('width="32"'));

  // 3. ZIP bundle download
  const zipRes = await app.inject({ method: "GET", url: "/api/icons/bundle.zip?category=brand-reneo" });
  assert.equal(zipRes.statusCode, 200);
  assert.match(String(zipRes.headers["content-type"]), /application\/zip/);
  assert.ok(zipRes.rawPayload.length > 200);

  // 4. Admin login & create icon (with XSS script stripped)
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: config.adminEmail, password: config.adminPassword },
  });
  assert.equal(loginRes.statusCode, 200);
  const cookieHeader = loginRes.headers["set-cookie"];
  assert.ok(cookieHeader);
  const sessionCookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(";")[0] : cookieHeader.split(";")[0];

  const createRes = await app.inject({
    method: "POST",
    url: "/api/admin/icons",
    headers: { cookie: sessionCookie },
    payload: {
      name: "Custom Bolt",
      slug: "custom-bolt",
      description: "Ikon petir kustom",
      style: "outline",
      tags: ["bolt", "fast"],
      svg_content: '<svg viewBox="0 0 24 24"><script>alert(1)</script><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" fill="none"/></svg>',
    },
  });
  assert.equal(createRes.statusCode, 201);
  const created = createRes.json() as { icon: { svg_content: string; is_official: boolean } };
  assert.ok(!created.icon.svg_content.includes("<script>"));
  assert.equal(created.icon.is_official, false);

  await app.close();
});
