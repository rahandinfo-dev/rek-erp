import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;

  if (/[a-z]/.test(password)) score++;

  if (/[A-Z]/.test(password)) score++;

  if (/\d/.test(password)) score++;

  if (/[@$!%*?&]/.test(password)) score++;

  if (score <= 2) {
    return {
      score,
      label: t("validation.strengthWeak"),
      color: "bg-red-500",
    };
  }

  if (score <= 4) {
    return {
      score,
      label: t("validation.strengthMedium"),
      color: "bg-yellow-500",
    };
  }

  return {
    score,
    label: t("validation.strengthStrong"),
    color: "bg-green-500",
  };
}
