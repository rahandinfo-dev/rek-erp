/** Kurdish Sorani copy for the unified image upload system — single source via i18n. */

import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export const uploadMessages = {
  dropHint: t("uploads.dropHint"),
  replace: t("uploads.replace"),
  delete: t("uploads.delete"),
  uploading: t("uploads.uploading"),
  compressing: t("uploads.compressing"),
  success: t("uploads.success"),
  deleted: t("uploads.deleted"),
  preview: t("uploads.preview"),
  empty: t("uploads.empty"),
  types: t("uploads.types"),
  maxSize: t("uploads.maxSize"),
  errors: {
    unauthorized: t("errors.unauthorized"),
    required: t("uploads.required"),
    tooLarge: t("uploads.tooLarge"),
    badType: t("uploads.badType"),
    failed: t("uploads.failed"),
    deleteFailed: t("uploads.deleteFailed"),
    network: t("uploads.network"),
    invalidKind: t("uploads.invalidKind"),
  },
} as const;
