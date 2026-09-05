export type SealedBlob = {
  k: string;
  i: string;
  t: string;
  c: string;
};

function b64(value: string) {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function openSealed(sealed: SealedBlob) {
  try {
    const key = await crypto.subtle.importKey("raw", b64(sealed.k), "AES-GCM", false, ["decrypt"]);
    const body = b64(sealed.c);
    const tag = b64(sealed.t);
    const packed = new Uint8Array(body.length + tag.length);
    packed.set(body, 0);
    packed.set(tag, body.length);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(sealed.i) }, key, packed);
    const text = new TextDecoder().decode(plain).trim();
    return text || null;
  } catch {
    return null;
  }
}
