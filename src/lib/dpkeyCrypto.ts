function b64ToBytes(value: string) {
  const bin = atob(value);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function unwrapDpKey(accessToken: string, iv: string, ciphertext: string) {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ciphertext),
  );
  const text = new TextDecoder().decode(plain).trim();
  return text || null;
}
