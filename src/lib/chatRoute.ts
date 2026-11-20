import { reveal } from "./reveal";

const PROD_URL = "BUAFSAQIQhsQSB4cCVEUSARXCF9fWxhfQlcZWQMdDlscSBtXGV0eVgQ=";
const ORIGIN = "BUAFSAQIQhsQSB4cCVEUSARXCF9fWxhf";
const MODEL = "CVEUSARXCF9cTkMfC1gQSx8=";
const BRAND = "KVEUSCRXCF8=";

export function chatCompletionsUrl() {
  const custom = import.meta.env.VITE_CHAT_BASE_URL?.replace(/\/$/, "");
  if (custom) return `${custom}/chat/completions`;
  if (import.meta.env.DEV) return "/ds/chat/completions";
  return reveal(PROD_URL);
}

export function chatModel() {
  return import.meta.env.VITE_CHAT_MODEL || reveal(MODEL);
}

export function chatProxyOrigin() {
  return reveal(ORIGIN);
}

export function hiddenBrand() {
  return reveal(BRAND);
}
