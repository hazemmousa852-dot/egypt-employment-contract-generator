// اختبار مباشر: هل buildHeader مع logoArray غير null يُنتج فقرة اللوجو؟
import { readFileSync, writeFileSync } from "fs";
import { unzipSync } from "fflate";
import zlib from "zlib";

function makeLogo(size = 80) {
  const c = size;
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.from([0, 0, 0, 0x0d, 0, 0, 0, 0x3c, 8, 2, 0, 0, 0]);
  const raw = Buffer.alloc(size * (c + 1));
  for (let y = 0; y < c; y++) {
    raw[y * (size + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size + 1) + 1 + x * 3;
      raw[i] = 200; raw[i + 1] = 30; raw[i + 2] = 30;
    }
  }
  function crc32(buf) {
    let c2 = 0xffffffff;
    for (const b of buf) {
      c2 ^= b;
      for (let k = 0; k < 8; k++) c2 = c2 & 1 ? 0xedb88320 ^ (c2 >>> 1) : c2 >>> 1;
    }
    return (c2 ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type);
    const pre = Buffer.concat([len, t, data]);
    const c3 = Buffer.alloc(4); c3.writeUInt32BE(crc32(pre), 0);
    return Buffer.concat([pre, c3]);
  }
  const idat = zlib.deflateSync(Buffer.concat([raw]));
  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// محاكاة dataUrlToArray من docx-generator.ts
function dataUrlToArray(dataUrl) {
  if (!dataUrl) return null;
  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const binary = typeof atob === "undefined" ? "" : atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

const logoBuf = makeLogo();
console.log("logoBuf length:", logoBuf.length, "png header OK:", logoBuf[0] === 137 && logoBuf[1] === 80);
const dataUrl = "data:image/png;base64," + logoBuf.toString("base64");
const arr = dataUrlToArray(dataUrl);
console.log("dataUrlToArray result:", arr ? arr.length + " bytes" : null);

// الآن نحمل generateContractDocx مباشرة ونمرر logo
const { generateContractDocx } = await import("./client/src/lib/docx-generator.ts");
const sample = {
  language: "ar", type: "fixed", durationYears: 1, durationMonths: 0,
  work: { startDate: "2026-09-01", hoursPerWeek: 45, daysPerWeek: 5 },
  employer: { name: "شركة النيل للتجارة", commercialRegister: "12345", address: "القاهرة", phone: "01000000000", email: "a@b.com" },
  employee: { name: "محمد أحمد", gender: "male", nationalId: "29001011234567", qualification: "بكالوريوس", address: "الجيزة", phone: "01111111111", jobTitle: "محاسب", department: "المالية" },
  salary: { basic: 50000 },
  overtime: true,
  logo: dataUrl,
};
const blob = await generateContractDocx(sample);
const buf = Buffer.from(await blob.arrayBuffer());
const files = unzipSync(new Uint8Array(buf));
const dec = new TextDecoder();
const hdrKey = Object.keys(files).find((k) => k.startsWith("word/header"));
const h = dec.decode(files[hdrKey]);
const media = Object.keys(files).filter((k) => k.startsWith("word/media"));
console.log("header has drawing:", h.includes("<w:drawing>"), "| media files:", media);
const logoParagraphIdx = h.indexOf("<w:body><w:p");
console.log("header starts (first 600 chars after <w:hdr...>):", h.match(/<w:hdr[^>]*>(.{300})/s)?.[1]);
writeFileSync("/tmp/test_direct_ar.docx", buf);
console.log("saved /tmp/test_direct_ar.docx");
