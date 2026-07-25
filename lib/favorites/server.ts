import { db } from "@/lib/prisma/db";
import { DEFAULT_FAVORITES, type FavoritesBundle } from "@/lib/favorites/types";

export async function loadFavoritesBundle(
  userId: string,
  companyId: string
): Promise<FavoritesBundle> {
  const [workspaces, groups, items] = await Promise.all([
    db.favoriteWorkspace.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
    db.favoriteGroup.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
    db.favoriteItem.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }],
    }),
  ]);

  return {
    version: 1,
    userId,
    companyId,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      sortOrder: w.sortOrder,
      isActive: w.isActive,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      workspaceId: g.workspaceId,
      name: g.name,
      color: (g.color as FavoritesBundle["groups"][0]["color"]) || null,
      sortOrder: g.sortOrder,
    })),
    items: items.map((i) => ({
      id: i.id,
      workspaceId: i.workspaceId,
      groupId: i.groupId,
      href: i.href,
      title: i.title,
      alias: i.alias,
      moduleKey: i.moduleKey,
      entityType: i.entityType,
      entityId: i.entityId,
      color: (i.color as FavoritesBundle["items"][0]["color"]) || null,
      pinned: i.pinned,
      sortOrder: i.sortOrder,
      updatedAt: i.updatedAt.getTime(),
    })),
    updatedAt: Date.now(),
  };
}

export async function ensureDefaultFavorites(
  userId: string,
  companyId: string
) {
  const count = await db.favoriteWorkspace.count({ where: { userId } });
  if (count > 0) return loadFavoritesBundle(userId, companyId);

  const workspace = await db.favoriteWorkspace.create({
    data: {
      companyId,
      userId,
      name: "Default",
      sortOrder: 0,
      isActive: true,
    },
  });

  await db.favoriteItem.createMany({
    data: DEFAULT_FAVORITES.map((f, idx) => ({
      companyId,
      userId,
      workspaceId: workspace.id,
      href: f.href,
      title: f.title,
      moduleKey: f.moduleKey,
      sortOrder: idx,
      pinned: idx < 2,
    })),
  });

  return loadFavoritesBundle(userId, companyId);
}
