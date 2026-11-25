import { I18N_ENABLED } from "./config";
import { locale, type Locale } from "./locale";

function index(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const text = value.trim();
    out[key] = text;
    const trimmed = key.trim();
    if (trimmed && out[trimmed] === undefined) out[trimmed] = text;
  }
  return out;
}

const tables: Partial<Record<Locale, Record<string, string>>> = {};
const loaders = {
  es: () => import("./host/es.json"), it: () => import("./host/it.json"),
  de: () => import("./host/de.json"), tr: () => import("./host/tr.json"),
  ar: () => import("./host/ar.json"), ja: () => import("./host/ja.json"),
};
export async function loadHostCopy(lang: Locale) {
  if (lang === "en" || tables[lang]) return;
  const module = await loaders[lang]();
  tables[lang] = index(module.default);
}

/** Look up server copy by its English text. Unknown strings stay English. */
export function hostCopy(text: string): string {
  if (!text || !I18N_ENABLED) return text;
  const lang = locale();
  if (lang === "en") return text;
  const table = tables[lang];
  if (!table) return text;
  return table[text] ?? table[text.trim()] ?? text;
}

/** City line. Prefer the full "City, Country" string, which is the lookup key. */
export function hostPlace(girl: { place?: string; city?: string; country?: string }): string {
  if (girl.place) return hostCopy(girl.place);
  return [girl.city, girl.country]
    .filter((part): part is string => Boolean(part))
    .map((part) => hostCopy(part))
    .join(", ");
}
