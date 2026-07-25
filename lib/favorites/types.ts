/** Enterprise Favorites */

export const FAVORITES_PREFIX = "rek-favorites:v1:";
export const FAVORITES_UI_KEY = "rek-favorites-ui:v1:";

export type FavoriteColor =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "gray";

export const FAVORITE_COLORS: FavoriteColor[] = [
  "blue",
  "green",
  "orange",
  "purple",
  "red",
  "gray",
];

export const FAVORITE_COLOR_CLASS: Record<FavoriteColor, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  purple: "bg-violet-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
};

export type FavoriteItem = {
  id: string;
  workspaceId: string;
  groupId: string | null;
  href: string;
  title: string;
  alias: string | null;
  moduleKey: string;
  entityType: string | null;
  entityId: string | null;
  color: FavoriteColor | null;
  pinned: boolean;
  sortOrder: number;
  updatedAt: number;
};

export type FavoriteGroup = {
  id: string;
  workspaceId: string;
  name: string;
  color: FavoriteColor | null;
  sortOrder: number;
};

export type FavoriteWorkspace = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type FavoritesBundle = {
  version: 1;
  userId: string;
  companyId: string;
  workspaces: FavoriteWorkspace[];
  groups: FavoriteGroup[];
  items: FavoriteItem[];
  updatedAt: number;
};

export type FavoritesUiState = {
  section: "favorites" | "recent";
  collapsed: boolean;
};

export const DEFAULT_FAVORITES: Array<{
  href: string;
  title: string;
  moduleKey: string;
}> = [
  { href: "/dashboard", title: "Dashboard", moduleKey: "dashboard" },
  { href: "/dashboard/products", title: "Products", moduleKey: "products" },
  { href: "/dashboard/sales", title: "Sales", moduleKey: "sales" },
  { href: "/dashboard/reports", title: "Reports", moduleKey: "reports" },
  { href: "/dashboard/settings", title: "Settings", moduleKey: "settings" },
];

export function displayName(item: FavoriteItem) {
  return (item.alias || item.title || item.href).trim();
}

export function emptyBundle(
  userId: string,
  companyId: string
): FavoritesBundle {
  return {
    version: 1,
    userId,
    companyId,
    workspaces: [],
    groups: [],
    items: [],
    updatedAt: Date.now(),
  };
}
