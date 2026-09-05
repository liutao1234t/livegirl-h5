import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public");

const files = {
  "images/gift-box.png": "e4635dc8-84d7-40ba-ae9a-5f49902cc4d8",
  "images/splash-bg.png": "53df6e33-2a3a-4141-94ff-75c2f4074646",
  "images/chat-avatar.png": "f09b6e21-9379-4d88-90d3-bfcfdcc0346f",
  "images/chat-gift.png": "40031b34-7f9d-426f-9711-2a369ac5f12c",
  "icons/chat-online.svg": "95513299-7eef-4024-a7c4-0a9c17adcf2a",
  "images/calling-portrait.png": "bd861308-5bfc-429c-95be-90073e4da841",
  "images/incoming-portrait.png": "f7517cf4-2405-4ac3-8671-ec4c72dd30cf",
  "images/incall-pip.png": "fea062cc-be08-4955-b2b3-0dae40c50379",
  "images/profile-hero.png": "a01b677d-2e36-40bf-bef9-35d27581a65d",
  "images/moment-1.png": "37e510bc-2f17-4d9b-a90b-0732ec200109",
  "images/moment-2.png": "65800613-14c2-433d-91f6-ebbdcaa9c246",
  "images/moment-3.png": "e43d41ce-6a5f-4ff7-b32e-ce0bcd6046c6",
  "images/moment-4.png": "f2770e06-0164-46cc-bd23-717a21718475",
  "images/coin.png": "b503ccc8-421b-4200-a2e8-22557e35fd08",
  "icons/tab-home.svg": "f5f10700-90b1-4087-b5f8-fa883bf35d56",
  "icons/tab-reels.svg": "e73ed964-bd4c-4cd7-9f32-a84bf4e776c2",
  "icons/tab-ranking.svg": "a4eb1efd-3af2-41e1-ad7f-71a1256eb012",
  "icons/tab-messages.svg": "c166fea6-94aa-47ba-b41d-212cdaf6e927",
  "icons/tab-me.svg": "48859a5a-df70-4b8e-bba7-380c9dc7ae21",
  "icons/pin.svg": "d889af79-4af0-4317-a0d5-7bb1a01b77b1",
  "icons/video.svg": "05f777ab-630e-46e1-b64d-8cb8d84ec7bc",
  "icons/filter.svg": "9d8727a8-5c50-4ca2-bac1-b1691da55bd5",
  "icons/arrow.svg": "f873234c-3e75-419b-864c-9194618c4daa",
  "icons/back.svg": "d250788f-afae-49ea-8833-9d279cdc3a4d",
  "icons/more.svg": "31625c0c-2c4b-4744-b4e0-fea1ee6a5b06",
  "icons/plus.svg": "b10b5cfa-a5fc-4a29-aa16-0fca66b43fbd",
  "icons/send.svg": "323b8cc2-74ea-4af1-875b-307af1c66487",
  "icons/video-chat.svg": "7880a5df-42f4-4ab3-8f10-6f6ea7dad0b5",
  "icons/fail.svg": "55988a3c-9a29-40b1-862b-5e7c7f786217",
  "icons/lock.svg": "c86f694d-eaf0-4bf8-b6d3-5cb2c25c07d5",
  "icons/hangup.svg": "a1b4ecf5-4848-4932-a17a-dfeb06780a64",
  "icons/accept-video.svg": "25a7842b-a11d-485b-951e-bece9aae8826",
  "icons/flip-cam.svg": "8b1ee5e1-3a60-4de9-9bcb-3e7a7723d743",
  "icons/gift.svg": "c262a8f9-bf1b-4a0a-863c-7ffd8ff1fb52",
  "icons/private.svg": "2eaa3135-39e3-4e96-be03-3e2da5636444",
  "icons/heart.svg": "51ec3c07-7263-4f35-8cba-9795e87b15fe",
  "icons/message.svg": "896a015d-5d72-4274-b4e0-fea1ee6a5b06",
  "icons/verify-fb.svg": "6bf2eb9a-b3b4-4a33-92ae-6c7c54627645",
  "icons/verify-x.svg": "1ecbf252-2c61-47d8-8a19-a6605c4958a9",
  "icons/verify-phone.svg": "86b568c9-b777-4b03-83b2-e2e2d4139264",
  "icons/verify-photo.svg": "65ea65b9-06e3-4e67-82d4-f6864a8a8a04",
};

await mkdir(join(outDir, "images"), { recursive: true });
await mkdir(join(outDir, "icons"), { recursive: true });
await mkdir(join(outDir, "media"), { recursive: true });

for (const [path, id] of Object.entries(files)) {
  const ext = path.endsWith(".svg") ? "svg" : "png";
  const url = `https://www.figma.com/api/mcp/asset/${id}.${ext}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("fail", path, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(outDir, path);
  await writeFile(dest, buf);
  console.log("ok", path, buf.length);
}
