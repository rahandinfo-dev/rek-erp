"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FolderPlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { displayName, useFavorites } from "@/lib/favorites/provider";
import {
  FAVORITE_COLORS,
  FAVORITE_COLOR_CLASS,
  type FavoriteColor,
  type FavoriteItem,
} from "@/lib/favorites/types";
import { appToast } from "@/lib/toast";
import RecentHistorySidebar from "@/components/history/RecentHistorySidebar";

function ColorDot({ color }: { color: FavoriteColor | null }) {
  if (!color) return null;
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", FAVORITE_COLOR_CLASS[color])}
      aria-hidden
    />
  );
}

function FavoriteRow({
  item,
  collapsed,
}: {
  item: FavoriteItem;
  collapsed: boolean;
}) {
  const {
    togglePin,
    removeFavorite,
    setAlias,
    setColor,
    moveToGroup,
    activeGroups,
  } = useFavorites();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [aliasValue, setAliasValue] = useState(item.alias || item.title);
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${item.href}`
      );
      appToast.success("Link copied");
    } catch {
      appToast.error("Copy failed");
    }
    setMenu(false);
  }

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={displayName(item)}
        className="rek-nav-item justify-center px-0"
        data-active={active}
      >
        <Star
          size={14}
          className={item.pinned ? "fill-primary text-primary" : "text-primary"}
        />
      </Link>
    );
  }

  return (
    <div
      className="group relative"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/fav-href", item.href);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <Link
        href={item.href}
        data-active={active}
        className="rek-nav-item !items-center gap-2 py-1.5"
        title={displayName(item)}
      >
        <ColorDot color={item.color} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
          {displayName(item)}
        </span>
        {item.pinned ? (
          <Pin size={11} className="shrink-0 text-primary" aria-hidden />
        ) : null}
      </Link>

      <div className="absolute top-0.5 left-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          className="rounded-lg bg-card p-1 text-muted-foreground shadow-sm ring-1 ring-border"
          aria-label="Favorite actions"
          onClick={(e) => {
            e.preventDefault();
            setMenu((v) => !v);
          }}
        >
          <MoreHorizontal size={13} />
        </button>
        {menu ? (
          <div className="absolute top-7 left-0 z-50 min-w-[170px] rounded-xl border border-border bg-card p-1 shadow-lg">
            <Link
              href={item.href}
              className="block rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => setMenu(false)}
            >
              Open
            </Link>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => setMenu(false)}
            >
              <ExternalLink size={12} /> Open in New Tab
            </a>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => {
                setRenaming(true);
                setMenu(false);
              }}
            >
              Rename Alias
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => {
                togglePin(item.href);
                setMenu(false);
              }}
            >
              {item.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              {item.pinned ? "Unpin" : "Pin"}
            </button>
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">
              Color
            </div>
            <div className="mb-1 flex flex-wrap gap-1 px-2">
              {FAVORITE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "size-4 rounded-full ring-offset-1",
                    FAVORITE_COLOR_CLASS[c],
                    item.color === c && "ring-2 ring-foreground"
                  )}
                  onClick={() => {
                    setColor(item.href, c);
                    setMenu(false);
                  }}
                  aria-label={c}
                />
              ))}
              <button
                type="button"
                className="size-4 rounded-full border border-border"
                onClick={() => {
                  setColor(item.href, null);
                  setMenu(false);
                }}
                aria-label="Clear color"
              />
            </div>
            {activeGroups.length ? (
              <>
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  Move to Group
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-muted"
                  onClick={() => {
                    moveToGroup(item.href, null);
                    setMenu(false);
                  }}
                >
                  Ungrouped
                </button>
                {activeGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-muted"
                    onClick={() => {
                      moveToGroup(item.href, g.id);
                      setMenu(false);
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </>
            ) : null}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => void copyLink()}
            >
              <Copy size={12} /> Copy Link
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
              onClick={() => {
                removeFavorite(item.href);
                setMenu(false);
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        ) : null}
      </div>

      {renaming ? (
        <form
          className="mt-1 px-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAlias(item.href, aliasValue.trim() || null);
            setRenaming(false);
          }}
        >
          <input
            autoFocus
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
            className="h-7 w-full rounded-lg border border-border bg-background px-2 text-xs"
            onBlur={() => {
              setAlias(item.href, aliasValue.trim() || null);
              setRenaming(false);
            }}
          />
        </form>
      ) : null}
    </div>
  );
}

export default function FavoritesSidebar({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const {
    ui,
    setSection,
    setCollapsed,
    activeItems,
    activeGroups,
    activeWorkspace,
    bundle,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups,
    createWorkspace,
    switchWorkspace,
    deleteWorkspace,
    reorderItems,
    exportFavorites,
    importFavorites,
  } = useFavorites();

  const [query, setQuery] = useState("");
  const [newGroup, setNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter((i) => {
      const hay = `${displayName(i)} ${i.title} ${i.moduleKey} ${i.href}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeItems, query]);

  const pinned = filtered.filter((i) => i.pinned);
  const ungrouped = filtered.filter((i) => !i.pinned && !i.groupId);
  const byGroup = activeGroups.map((g) => ({
    group: g,
    items: filtered.filter((i) => !i.pinned && i.groupId === g.id),
  }));

  function onDropReorder(targetHref: string, e: React.DragEvent) {
    e.preventDefault();
    const src = e.dataTransfer.getData("text/fav-href");
    if (!src || src === targetHref) return;
    const hrefs = activeItems.map((i) => i.href);
    const from = hrefs.indexOf(src);
    const to = hrefs.indexOf(targetHref);
    if (from < 0 || to < 0) return;
    const next = [...hrefs];
    next.splice(from, 1);
    next.splice(to, 0, src);
    reorderItems(next);
  }

  function onDropReorderGroup(targetId: string, e: React.DragEvent) {
    e.preventDefault();
    const src = e.dataTransfer.getData("text/fav-group");
    if (!src || src === targetId) return;
    const ids = activeGroups.map((g) => g.id);
    const from = ids.indexOf(src);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, src);
    reorderGroups(next);
  }

  if (collapsed) {
    return (
      <div className="space-y-3">
        <div>
          {!ui.collapsed ? (
            <ul className="space-y-0.5">
              {pinned.concat(ungrouped).slice(0, 8).map((item) => (
                <li
                  key={item.href}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropReorder(item.href, e)}
                >
                  <FavoriteRow item={item} collapsed />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => setSection("favorites")}
          className={cn(
            "h-7 flex-1 rounded-lg text-[11px] font-bold",
            ui.section === "favorites"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Favorites
        </button>
        <button
          type="button"
          onClick={() => setSection("recent")}
          className={cn(
            "h-7 flex-1 rounded-lg text-[11px] font-bold",
            ui.section === "recent"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          Recent
        </button>
      </div>

      {ui.section === "recent" ? (
        <RecentHistorySidebar collapsed={false} />
      ) : (
        <div>
          <button
            type="button"
            className="mb-1.5 flex w-full items-center gap-1 px-3 text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
            onClick={() => setCollapsed(!ui.collapsed)}
          >
            {ui.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            Favorites
            <Star size={11} className="ms-auto fill-amber-400 text-amber-400" />
          </button>

          {!ui.collapsed ? (
            <div className="space-y-2">
              <div className="flex gap-1 px-2">
                <select
                  className="h-7 flex-1 rounded-lg border-0 bg-muted/70 px-2 text-[11px] font-semibold"
                  value={activeWorkspace?.id || ""}
                  onChange={(e) => switchWorkspace(e.target.value)}
                  aria-label="Favorite workspace"
                >
                  {bundle.workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="New workspace"
                  className="rounded-lg bg-muted p-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const name = window.prompt("Workspace name");
                    if (name) createWorkspace(name);
                  }}
                >
                  <Plus size={13} />
                </button>
                {bundle.workspaces.length > 1 && activeWorkspace ? (
                  <button
                    type="button"
                    title="Delete workspace"
                    className="rounded-lg bg-muted p-1.5 text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this workspace?")) {
                        deleteWorkspace(activeWorkspace.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>

              <div className="px-2">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search favorites…"
                  className="h-8 w-full rounded-xl border-0 bg-muted/70 px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="flex gap-1 px-2">
                <button
                  type="button"
                  className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg bg-muted text-[10px] font-bold"
                  onClick={() => setNewGroup(true)}
                >
                  <FolderPlus size={12} /> Group
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center justify-center rounded-lg bg-muted px-2 text-muted-foreground"
                  title="Export"
                  onClick={() => {
                    const blob = new Blob([exportFavorites()], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "rek-favorites.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={12} />
                </button>
                <label
                  className="inline-flex h-7 cursor-pointer items-center justify-center rounded-lg bg-muted px-2 text-muted-foreground"
                  title="Import"
                >
                  <Upload size={12} />
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const ok = importFavorites(text);
                      appToast[ok ? "success" : "error"](
                        ok ? "Favorites imported" : "Import failed"
                      );
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {newGroup ? (
                <form
                  className="px-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (groupName.trim()) createGroup(groupName.trim());
                    setGroupName("");
                    setNewGroup(false);
                  }}
                >
                  <input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="h-8 w-full rounded-xl border border-border bg-background px-2 text-xs"
                  />
                </form>
              ) : null}

              {pinned.length ? (
                <div>
                  <p className="mb-1 px-3 text-[10px] font-bold text-muted-foreground">
                    Pinned
                  </p>
                  <ul className="space-y-0.5">
                    {pinned.map((item) => (
                      <li
                        key={item.href}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropReorder(item.href, e)}
                      >
                        <FavoriteRow item={item} collapsed={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {byGroup.map(({ group, items }) =>
                items.length || !query ? (
                  <div
                    key={group.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/fav-group", group.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropReorderGroup(group.id, e)}
                  >
                    <div className="mb-1 flex items-center gap-1 px-3 text-[10px] font-bold text-muted-foreground">
                      <ColorDot color={group.color} />
                      <span className="min-w-0 flex-1 truncate">{group.name}</span>
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-muted hover:text-foreground"
                        title="Rename group"
                        onClick={() => {
                          const name = window.prompt("Rename group", group.name);
                          if (name?.trim()) renameGroup(group.id, name.trim());
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                        title="Delete group"
                        onClick={() => {
                          if (window.confirm(`Delete group “${group.name}”?`)) {
                            deleteGroup(group.id);
                          }
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <ul className="space-y-0.5">
                      {items.map((item) => (
                        <li
                          key={item.href}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => onDropReorder(item.href, e)}
                        >
                          <FavoriteRow item={item} collapsed={false} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}

              {ungrouped.length ? (
                <div>
                  {activeGroups.length ? (
                    <p className="mb-1 px-3 text-[10px] font-bold text-muted-foreground">
                      Ungrouped
                    </p>
                  ) : null}
                  <ul className="space-y-0.5">
                    {ungrouped.map((item) => (
                      <li
                        key={item.href}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropReorder(item.href, e)}
                      >
                        <FavoriteRow item={item} collapsed={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!filtered.length ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">
                  No favorites yet. Tap the star on any page.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
