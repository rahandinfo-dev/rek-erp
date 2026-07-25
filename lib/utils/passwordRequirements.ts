export function passwordRequirements(password: string) {
  return {
    minLength: {
      valid: password.length >= 8,
      text: "لانیکەم ٨ پیت",
    },

    lowerCase: {
      valid: /[a-z]/.test(password),
      text: "پیتی بچووک (a-z)",
    },

    upperCase: {
      valid: /[A-Z]/.test(password),
      text: "پیتی گەورە (A-Z)",
    },

    number: {
      valid: /\d/.test(password),
      text: "ژمارە (0-9)",
    },

    special: {
      valid: /[@$!%*?&]/.test(password),
      text: "هێمای تایبەت (@$!%*?&)",
    },
  };
}