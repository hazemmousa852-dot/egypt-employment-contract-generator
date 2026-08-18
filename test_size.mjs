// هل حجم PNG يؤثر؟ اختبار بنفس sample وlogos بأحجام مختلفة
import zlib from "zlib";
import { unzipSync } from "fflate";
import { generateContractDocx } from "./client/src/lib/docx-generator.ts";

const sample = {
  language: "ar", type: "fixed", contractDate: "2026-08-16",
  durationYears: 1, durationMonths: 0, trainingDurationMonths: 3, durationText: "",
  employer: { name: "شركة المصنع الحديث", commercialRegister: "123456", address: "مدينة العبور الصناعية", phone: "01000000000", email: "hr@factory.com" },
  employee: { name: "أحمد محمد أحمد محمد", nationalId: "29801011234567", gender: "male", qualification: "بكالوريوس تجارة", jobTitle: "محاسب", department: "الحسابات", address: "مدينة نصر", phone: "01111111111" },
  work: { startDate: "2026-09-01", endDate: "2027-08-31" },
  salary: { basicSalary: 10000, hasOvertime: true, overtimeDayHours: 20, overtimeNightHours: 5 },
};

function makeLogo(size = 200, c = 60) {
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
  function crc32(buf) {
    let cr = 0xffffffff;
    for (const b of buf) { cr ^= b; for (let k = 0; k < 8; k++) cr = cr & 1 ? 0xedb88320 ^ (cr >>> 1) : cr >>> 1; }
    return (cr ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const pre = Buffer.concat([len, Buffer.from(type), data]);
    const c2 = Buffer.alloc(4); c2.writeUInt32BE(crc32(pre), 0);
    return Buffer.concat([pre, c2]);
  }
  const idat = zlib.deflateSync(Buffer.concat([raw]));
  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

for (const label of ["logo=null", "logo=110B(80x60)", "logo=36KB(200x60)", "logo=300x300"]) {
  let logo = null;
  if (label === "logo=null") logo = null;
  else if (label === "logo=110B(80x60)") logo = "data:image/png;base64," + makeLogo(80, 60).toString("base64");
  else if (label === "logo=36KB(200x60)") logo = "data:image/png;base64," + makeLogo(200, 60).toString("base64");
  else logo = "data:image/png;base64," + makeLogo(300, 300).toString("base64");
  const d = { ...sample, logo };
  const blob = await generateContractDocx(d);
  const buf = Buffer.from(await blob.arrayBuffer());
  const files = unzipSync(new Uint8Array(buf));
  const dec = new TextDecoder();
  const hdrKey = Object.keys(files).find((k) => k.startsWith("word/header"));
  const h = dec.decode(files[hdrKey]);
  const media = Object.keys(files).filter((k) => k.startsWith("word/media") && k.endsWith(".png"));
  const logoLen = logo ? logo.length : 0;
  console.log(`${label} | logoDataURL len: ${logoLen} | header drawing: ${h.includes("<w:drawing>")} | media: ${media.length}`);
  if (!h.includes("<w:drawing>")) {
    // هل فقرة اللوجو موجودة أصلاً؟
    const pCount = (h.match(/<w:p [^>]*\/>|<w:p>/g) || []).length + (h.match(/<w:p >|<w:p>/g) || []).length;
    console.log("   hdr contains logo paragraph? first 100 after <w:hdr: >", h.slice(h.indexOf("<w:hdr") + 8, h.indexOf("<w:hdr") + 400));
  }
}
process.exit(0);
