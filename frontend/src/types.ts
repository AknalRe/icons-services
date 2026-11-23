export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  published_count?: number;
  total_count?: number;
}

export type IconStyle = "outline" | "solid" | "brand";

export interface IconItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  style: IconStyle;
  tags: string[];
  svg_content: string;
  view_box: string;
  author: string;
  status: "published" | "draft";
  featured: boolean;
  is_official: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicStats {
  total_published: number;
  total_official: number;
  total_downloads: number;
}

export interface AdminSummary {
  total: number;
  published: number;
  draft: number;
  downloads: number;
}
