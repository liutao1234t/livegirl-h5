/** Packaged public files for both the iOS root load and GitHub Pages /preview/. */
export function publicUrl(path: string) {
  if (!path) return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const base = import.meta.env.BASE_URL;
  if (path.startsWith(base)) return path;
  const relative = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${relative}`;
}
