import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const files = {
  "images/me-avatar.png": "a7499fa1-6a19-4934-8cf6-213bbfc0d01a.png",
  "icons/search.svg": "6eb5268e-61ea-4132-83ce-8bcc2f392fd3.svg",
  "icons/megaphone.svg": "6cde42d1-b04c-49b9-80fd-a03d76a6f8ba.svg",
  "icons/settings.svg": "087fd141-c2c8-4f9b-830b-bef42beddad4.svg",
  "icons/chevron.svg": "d6d6d9d4-7d4f-4fe2-9c6a-27fd21cdcea5.svg",
  "icons/vip.svg": "5687908b-67db-4603-b837-d458a32598e1.svg",
  "icons/rate.svg": "da088c33-bd51-42e5-8852-475d02d7a6f7.svg",
  "icons/task.svg": "406f5e46-9373-4bb3-a1b2-b424fd94fe6d.svg",
  "icons/support.svg": "20144620-de92-4457-9ced-bbd97dca4e63.svg",
  "icons/apple.svg": "0b7f1f41-d8ee-451a-800a-0672fef6a274.svg",
};

await mkdir(join(outDir, "images"), { recursive: true });
await mkdir(join(outDir, "icons"), { recursive: true });

for (const [path, file] of Object.entries(files)) {
  const url = `https://www.figma.com/api/mcp/asset/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("fail", path, res.status);
    continue;
  }
  await writeFile(join(outDir, path), Buffer.from(await res.arrayBuffer()));
  console.log("ok", path);
}
