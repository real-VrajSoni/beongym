/** Same-origin path, including rejection of browser-normalized backslashes. */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") ||
    value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null;
    const url = new URL(value, "https://beongym.invalid");
    return url.origin === "https://beongym.invalid" ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch { return null; }
}

export function validNewPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 8 && new TextEncoder().encode(password).length <= 72;
}
