import type { AdminSummary, Category, IconItem, PublicStats, User } from "../types";
import { withBasePath } from "./basePath";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBasePath(url), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = `Permintaan gagal (kode ${res.status}).`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Keep default message
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const api = {
  me: () => request<{ user: User | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  listCategories: () => request<{ categories: Category[] }>("/api/categories"),
  createCategory: (payload: { name: string; slug?: string; description?: string; sort_order?: number }) =>
    request<{ category: Category }>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: "DELETE" }),

  listPublicIcons: (params?: { q?: string; category?: string; style?: string; source?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.category) query.set("category", params.category);
    if (params?.style) query.set("style", params.style);
    if (params?.source) query.set("source", params.source);
    if (params?.sort) query.set("sort", params.sort);
    const qs = query.toString();
    return request<{ icons: IconItem[]; stats: PublicStats }>(`/api/icons${qs ? `?${qs}` : ""}`);
  },

  listAdminIcons: (params?: { q?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return request<{ icons: IconItem[]; summary: AdminSummary }>(`/api/admin/icons${qs ? `?${qs}` : ""}`);
  },
  createIcon: (payload: Partial<IconItem>) =>
    request<{ icon: IconItem }>("/api/admin/icons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateIcon: (id: number, payload: Partial<IconItem>) =>
    request<{ icon: IconItem }>(`/api/admin/icons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteIcon: (id: number) =>
    request<{ ok: boolean }>(`/api/admin/icons/${id}`, { method: "DELETE" }),
};
