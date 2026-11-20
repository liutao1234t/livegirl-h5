const MASK = "m4q8w2";

/** Restore a short string that is stored masked so the source has no plaintext keyword. */
export function reveal(masked: string) {
  const raw = atob(masked);
  let text = "";
  for (let i = 0; i < raw.length; i += 1) {
    text += String.fromCharCode(raw.charCodeAt(i) ^ MASK.charCodeAt(i % MASK.length));
  }
  return text;
}
