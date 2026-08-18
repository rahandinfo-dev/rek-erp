-- Per-user navigation presentation preference. Existing users retain the
-- current sidebar experience by default; no tenant or business records change.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "navigationStyle" TEXT NOT NULL DEFAULT 'SIDE_MENU';
