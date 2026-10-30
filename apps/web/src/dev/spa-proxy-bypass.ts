/**
 * Vite proxies API paths that collide with SPA routes (`/me`, `/members`, `/admin`).
 * Browser document navigations must receive the SPA; XHR/fetch with JSON Accept must proxy.
 */
export function shouldBypassApiProxyForSpa(headers: {
  accept?: string | string[];
  "sec-fetch-dest"?: string | string[];
}): boolean {
  const dest = headerValue(headers["sec-fetch-dest"]);
  if (dest === "document") return true;

  const accept = headerValue(headers.accept);
  if (!accept) return false;
  // Prefer HTML document requests; API client always sends Accept: application/json.
  if (accept.includes("text/html")) return true;
  return false;
}

function headerValue(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}
