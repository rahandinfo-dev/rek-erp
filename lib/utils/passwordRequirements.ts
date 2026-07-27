import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export function passwordRequirements(password: string) {
  return {
    minLength: {
      valid: password.length >= 8,
      text: t("validation.minLength"),
    },

    lowerCase: {
      valid: /[a-z]/.test(password),
      text: t("validation.lowerCase"),
    },

    upperCase: {
      valid: /[A-Z]/.test(password),
      text: t("validation.upperCase"),
    },

    number: {
      valid: /\d/.test(password),
      text: t("validation.number"),
    },

    special: {
      valid: /[@$!%*?&]/.test(password),
      text: t("validation.special"),
    },
  };
}
