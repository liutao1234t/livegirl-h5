import ar from "./host/ar.json";
import de from "./host/de.json";
import es from "./host/es.json";
import it from "./host/it.json";
import ja from "./host/ja.json";
import tr from "./host/tr.json";
import { I18N_ENABLED } from "./config";
import { locale, type Locale } from "./locale";

const tables: Partial<Record<Locale, Record<string, string>>> = { es, it, de, tr, ar, ja };

/** Look up server copy by its English text. Unknown strings stay English. */
export function hostCopy(text: string): string {
  if (!text || !I18N_ENABLED) return text;
  const lang = locale();
  if (lang === "en") return text;
  return tables[lang]?.[text] ?? text;
}

/** City line. Prefer the full "City, Country" string, which is the lookup key. */
export function hostPlace(girl: { place?: string; city?: string; country?: string }): string {
  if (girl.place) return hostCopy(girl.place);
  return [girl.city, girl.country]
    .filter((part): part is string => Boolean(part))
    .map((part) => hostCopy(part))
    .join(", ");
}
