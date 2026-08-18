// فحص حي: توليد ملف Word من الكود الحالي وفحص بنية XML
import { readFileSync, writeFileSync } from "fs";
import { unzipSync } from "fflate";
import { generateContractDocx } from "./client/src/lib/docx-generator.ts";

const sample = {
  language: "ar",
  type: "fixed",
  contractDate: "2026-08-16",
  durationYears: 1,
  durationMonths: 0,
  trainingDurationMonths: 3,
  durationText: "",
  employer: {
    name: "شركة المصنع الحديث",
    commercialRegister: "123456",
    address: "مدينة العبور الصناعية",
    phone: "01000000000",
    email: "hr@factory.com",
  },
  employee: {
    name: "أحمد محمد أحمد محمد",
    nationalId: "29801011234567",
    gender: "male",
    qualification: "بكالوريوس تجارة",
    jobTitle: "محاسب",
    department: "الحسابات",
    address: "مدينة نصر",
    phone: "01111111111",
  },
  work: { startDate: "2026-09-01", endDate: "2027-08-31" },
  salary: { basicSalary: 10000, hasOvertime: true, overtimeDayHours: 20, overtimeNightHours: 5 },
  logo: null,
};

// لوجو تجريبي 100x60 أحمر
import zlib from "zlib";
function makeLogo() {
  const size = 200, c = 60;
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.from([0, 0, 0, 0x0d, 0, 0, 0, 0x3c, 8, 2, 0, 0, 0]);
  const raw = Buffer.alloc(size * (c + 1));
  for (let y = 0; y < c; y++) {
    raw[y * (size + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size + 1) + 1 + x * 3;
      raw[i] = 200; raw[i + 1] = 30; raw[i + 2] = 30;
    }
  }
  const crc = Buffer.alloc(0);
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type);
    const pre = Buffer.concat([len, t, data]);
    const c2 = Buffer.alloc(4); c2.writeUInt32BE(crc32(pre) >>> 0, 0);
    return Buffer.concat([pre, c2]);
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  const idat = zlib.deflateSync(Buffer.concat([raw]));
  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const logo = makeLogo();
async function run(tag, data, outfile) {
  const d = { ...sample, ...data, logo: logo };
  const blob = await generateContractDocx(d);
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync(outfile, buf);
  const files = unzipSync(new Uint8Array(buf));
  const dec = new TextDecoder();
  const hdrKey = Object.keys(files).find((k) => k.startsWith("word/header"));
  if (hdrKey) {
    const h = dec.decode(files[hdrKey]);
    const rels = dec.decode(files["word/_rels/header1.xml.rels"]);
    const media = Object.keys(files).filter((k) => k.startsWith("word/media"));
    console.log(`[${tag}] HEADER RAW:`, h.slice(0, 800));
    console.log(`[${tag}] header has drawing:`, h.includes("<w:drawing>"), "| rels media:", rels.includes("media"), "| media files:", media);
  }
}
await run("ar-logo", { language: "ar" }, "/tmp/test_ar.docx");
await run("en-logo", { language: "en" }, "/tmp/test_en.docx");
await run("both-logo", { language: "both" }, "/tmp/test_both.docx");
process.exit(0);

console.log("=== document.xml ===");
console.log("has w:bidi in sectPr:", /<w:sectPr[^>]*>[\s\S]*?<w:bidi/.test(doc));
console.log("has rtlGutter:", doc.includes("<w:rtlGutter"));
console.log("num drawings in body:", (doc.match(/<w:drawing>/g) || []).length);
console.log("first drawing position vs sectPr:", doc.indexOf("<w:drawing>") < doc.indexOf("<w:sectPr"));
console.log("num paragraphs:", (doc.match(/<w:p /g) || []).length);

const hdr = files["word/header1.xml"].toString();
console.log("\n=== header1.xml ===");
console.log("has drawing:", hdr.includes("<w:drawing>"));
console.log("has بسم الله:", hdr.includes("بسم الله الرحمن الرحيم"));
console.log("texts:", hdr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g));

const ftrKey = Object.keys(files).find((k) => k.startsWith("word/footer"));
const hdrKey = Object.keys(files).find((k) => k.startsWith("word/header"));
console.log("keys:", Object.keys(files));
if (ftrKey) {
  const f = dec.decode(files[ftrKey]);
  console.log("footer key:", ftrKey, "len:", f.length, "has tbl:", f.includes("<w:tbl>"), "has بسم الله:", f.includes("بسم الله الرحمن الرحيم"));
}
if (hdrKey) {
  const h = dec.decode(files[hdrKey]);
  console.log("header key:", hdrKey, "len:", h.length, "has drawing:", h.includes("<w:drawing>"), "has بسم الله:", h.includes("بسم الله الرحمن الرحيم"));
  console.log("header has tbl:", h.includes("<w:tbl>"), "has بسم الله:", h.includes("بسم الله الرحمن الرحيم"));
console.log("header texts:", h.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)?.slice(0, 10));
const relsH = dec.decode(files["word/_rels/header1.xml.rels"]);
console.log("header rels contains media:", relsH.includes("media"));
const relsF = dec.decode(files["word/_rels/footer1.xml.rels"]);
console.log("footer rels contains media:", relsF.includes("media"));
const f = dec.decode(files[ftrKey]);
console.log("footer texts:", f.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)?.slice(0, 10));
}
