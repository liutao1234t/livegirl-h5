import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const files = {
  "images/podium-glow.svg": "8556ead5-7d4d-4b69-a148-b037f15ffecd.svg",
  "icons/flame.svg": "dce6362b-3764-432e-8a3f-0e9f3dd79da9.svg",
  "icons/crown.svg": "3fde2811-1271-408a-ab47-db3659492425.svg",
  "icons/share.svg": "4dc89abb-c88b-4a8a-8a3e-cb4f64b6451c.svg",
  "icons/like.svg": "333367a7-4d27-4dc1-bf71-a56a09e4399bd.svg",
  "icons/reel-video.svg": "d6d06fa7-5e40-499a-a794-0ce0095d5951.svg",
};

await mkdir(join(outDir, "images"), { recursive: true });
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
