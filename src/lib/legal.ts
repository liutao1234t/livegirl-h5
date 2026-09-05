export const LEGAL_DOCS = {
  terms: {
    title: "Terms of Use",
    url: "https://www.bloomie.work/livegirl_terms.html",
  },
  privacy: {
    title: "Privacy Policy",
    url: "https://www.bloomie.work/livegirl_privacy.html",
  },
  license: {
    title: "User License Agreement",
    url: "https://www.bloomie.work/livegirl_license.html",
  },
} as const;

export type LegalDocId = keyof typeof LEGAL_DOCS;

export function isLegalDocId(value: string | undefined): value is LegalDocId {
  return value === "terms" || value === "privacy" || value === "license";
}
