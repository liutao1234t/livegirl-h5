import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const files = {
  "icons/camera.svg": "3795488b-c2d0-4179-86e9-8f7aa1cf3992.svg",
  "icons/gift-cake.svg": "b8e6da0f-6b2a-4116-842b-d4a3ce45761a.svg",
  "icons/gift-trophy.svg": "177f110f-298c-4005-9570-9c74fe967945.svg",
  "icons/gift-toast.svg": "3859e7f2-195b-4f22-8ba1-7b1c18bec5f6.svg",
  "icons/gift-carpet.svg": "c76082a9-15fc-4430-bf23-d7c79936b7e8.svg",
  "icons/gift-ticket.svg": "b93d649b-7ce7-4ffb-a0ce-e6372aa33b20.svg",
  "icons/gift-car.svg": "23c20942-7b39-4cfb-890e-eadb2b86be3f.svg",
  "icons/sheet-close.svg": "a840e5c9-37ad-4ab9-b52c-53b36b9a794f.svg",
  "icons/sheet-plus.svg": "ed1bed0b-517d-48c9-b1b9-75de36218887.svg",
  "icons/sheet-check.svg": "5a58b05d-4a54-4d11-8a4c-f7c99bc4bbb5.svg",
  "icons/sheet-send.svg": "060b3b67-5ae8-4fe4-b735-9de64cf3fd1a.svg",
};

await mkdir(join(outDir, "icons"), { recursive: true });
for (const [path, file] of Object.entries(files)) {
  const res = await fetch(`https://www.figma.com/api/mcp/asset/${file}`);
  if (!res.ok) {
    console.error("fail", path, res.status);
    continue;
  }
  await writeFile(join(outDir, path), Buffer.from(await res.arrayBuffer()));
  console.log("ok", path);
}
