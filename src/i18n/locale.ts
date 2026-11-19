import { create } from "zustand";
import { I18N_ENABLED } from "./config";

export const LOCALES = ["en", "es", "it", "de", "tr", "ar", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

/** Endonyms, so the menu stays readable in every language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
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
  /** Manual choice for this visit. Null means follow the phone. */
  choice: Locale | null;
  /** Bumps when the system language changes so the UI re-renders. */
  revision: number;
  setLocale: (next: Locale) => void;
};

function languageCode(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return isLocale(code) ? code : null;
}

/** Current phone language. The first preferred tag wins; anything else stays English. */
export function deviceLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return languageCode(navigator.language) ?? languageCode(navigator.languages?.[0]) ?? "en";
}

function resolveLocale(choice: Locale | null): Locale {
  if (!I18N_ENABLED) return "en";
  if (choice && isLocale(choice)) return choice;
  return deviceLocale();
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  choice: null,
  revision: 0,
  setLocale: (next) => {
    if (!isLocale(next)) return;
    set({ choice: next });
    applyDocumentLocale();
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener("languagechange", () => {
    useLocaleStore.setState((state) => ({ choice: null, revision: state.revision + 1 }));
    applyDocumentLocale();
  });
}

/** Phone language for this launch. A Settings choice applies only until the next launch. */
export function locale(): Locale {
  return resolveLocale(useLocaleStore.getState().choice);
}

/** Active language for rendering. Follows the phone unless Settings was used this visit. */
export function useActiveLocale(): Locale {
  const choice = useLocaleStore((s) => s.choice);
  useLocaleStore((s) => s.revision);
  return resolveLocale(choice);
}

/** Keep layout left-to-right, including Arabic. */
export function applyDocumentLocale() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale();
  document.documentElement.dir = "ltr";
}
