import { create } from "zustand";
import { persist } from "zustand/middleware";
import { I18N_ENABLED } from "./config";

export const LOCALES = ["en", "it", "de", "tr", "ar", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

/** Endonyms, so the menu stays readable in every language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  tr: "Türkçe",
  ar: "العربية",
  ja: "日本語",
};

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type LocaleState = {
  /** Last language picked in Settings. Ignored until `picked` is true. */
  locale: Locale;
  /** False until the user chooses a language. Startup then follows the phone. */
  picked: boolean;
  setLocale: (next: Locale) => void;
};

function deviceLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const raw = navigator.language || navigator.languages?.[0];
  const code = raw?.trim().toLowerCase().split("-")[0] ?? "";
  return isLocale(code) ? code : "en";
}

function resolveLocale(picked: boolean, saved: string): Locale {
  if (!I18N_ENABLED) return "en";
  if (picked && isLocale(saved)) return saved;
  return deviceLocale();
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      picked: false,
      setLocale: (next) => {
        if (!isLocale(next)) return;
        set({ locale: next, picked: true });
        applyDocumentLocale();
      },
    }),
    {
      name: "livegirl-locale",
      partialize: (s) => ({ locale: s.locale, picked: s.picked }),
      onRehydrateStorage: () => (state) => {
        if (state?.picked && !isLocale(state.locale)) {
          useLocaleStore.setState({ picked: false, locale: "en" });
        }
        applyDocumentLocale();
      },
    },
  ),
);

/** Phone language when the user has not chosen one. Unsupported tags stay English. */
export function locale(): Locale {
  const { picked, locale: saved } = useLocaleStore.getState();
  return resolveLocale(picked, saved);
}

/** Active language for rendering. Follows a Settings choice, otherwise the phone. */
export function useActiveLocale(): Locale {
  const picked = useLocaleStore((s) => s.picked);
  const saved = useLocaleStore((s) => s.locale);
  return resolveLocale(picked, saved);
}

/** Keep layout left-to-right, including Arabic. */
export function applyDocumentLocale() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale();
  document.documentElement.dir = "ltr";
}
