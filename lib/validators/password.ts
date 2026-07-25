export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function validatePassword(password: string) {
  if (!passwordRegex.test(password)) {
    return {
      success: false,
      message:
        "وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت و پیتی گەورە، پیتی بچووک، ژمارە و نیشانەی تایبەت هەبێت.",
    };
  }

  return {
    success: true,
    message: "",
  };
}