import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const files = {
  "icons/row-profile.svg": "98b6b528-32dd-467b-9a19-d594ebc79003.svg",
  "icons/row-bill.svg": "ae134b7b-a856-4a20-a681-d647bed0107b.svg",
  "icons/camera.svg": "4c07f6c4-490d-4e61-a117-ec18f93039e2.svg",
  "icons/pencil.svg": "66492073-a346-4eda-9117-9f3b9c989b06.svg",
  "icons/bill-plus.svg": "47153b2c-00cd-4f85-a26e-3c052e3fd0b4.svg",
  "icons/bill-in.svg": "712a6ef9-30a1-45c3-9fcc-9a22c2351004.svg",
  "icons/bill-call.svg": "31120255-2f3c-4ac0-9c4f-9cf520ddaf6b.svg",
  "icons/vip-gem.svg": "a185c1fa-5bf6-47c9-a661-ab53578043fa.svg",
  "icons/vip-reel.svg": "0807af22-6839-4266-bc0d-3e604302810a.svg",
  "icons/vip-chat.svg": "94d41271-8878-401f-aedf-1e9f1239045d.svg",
  "icons/vip-video.svg": "df739dad-19d9-4dce-9890-c7fad4eb2130.svg",
  "icons/vip-contact.svg": "1d5a041b-f1b0-415d-8250-0b250fbfd155.svg",
  "icons/vip-date.svg": "50b7ef37-48d1-4c31-8781-7018642ef5be.svg",
  "icons/headset.svg": "773aa5e2-bcb2-48c8-89b2-fc2546adcac5.svg",
  "icons/clip.svg": "e8d57a07-1cb9-4dad-b622-f16d05c94bf4.svg",
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
