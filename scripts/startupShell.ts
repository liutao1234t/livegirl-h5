import type { Plugin } from "vite";
import { en } from "../src/i18n/en";
import { es } from "../src/i18n/es";
import { it } from "../src/i18n/it";
import { de } from "../src/i18n/de";
import { tr } from "../src/i18n/tr";
import { ar } from "../src/i18n/ar";
import { ja } from "../src/i18n/ja";
import { I18N_ENABLED } from "../src/i18n/config";

// Build-time only: keep the tiny inline launch copy in sync with translations.
export function startupShell(): Plugin {
  const keys = ["splash.line1", "splash.line2", "splash.lead", "splash.continue", "common.loading"] as const;
  const catalogs = I18N_ENABLED ? { en, es, it, de, tr, ar, ja } : { en };
  const copy = Object.fromEntries(Object.entries(catalogs).map(([lang, catalog]) => [lang, keys.map((key) => catalog[key])]));
  return {
    name: "startup-shell",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace("__STARTUP_COPY__", JSON.stringify(copy).replaceAll("<", "\\u003c"))
          .replace(/__STARTUP_TEXT_(\d)__/g, (_, index: string) => en[keys[Number(index)]!]
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;"));
      },
    },
  };
}
