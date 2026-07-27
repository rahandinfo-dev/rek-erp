import { tServer } from "@/lib/i18n";

const t = tServer.t.bind(tServer);

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function validatePassword(password: string) {
  if (!passwordRegex.test(password)) {
    return {
      success: false,
      message: t("validation.passwordRules"),
    };
  }

  return {
    success: true,
    message: "",
  };
}
