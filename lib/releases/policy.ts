export type ReleaseVisibilityInput = {
  publishedAt: Date | null;
  isCurrent: boolean;
  isActive: boolean;
};

/** Admins see all; members see active releases since joining plus the release current when they joined. */
export function canSeeRelease(release: ReleaseVisibilityInput, joinedAt: Date, admin: boolean) {
  if (admin) return true;
  if (!release.isActive || !release.publishedAt) return false;
  return release.publishedAt >= joinedAt || (release.isCurrent && release.publishedAt <= joinedAt);
}

export const SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
