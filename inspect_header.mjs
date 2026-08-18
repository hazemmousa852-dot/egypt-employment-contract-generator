import { readFileSync, writeFileSync } from "fs";
import { unzipSync } from "fflate";
const buf = readFileSync("/tmp/test_ar.docx");
const files = unzipSync(new Uint8Array(buf));
const dec = new TextDecoder();
for (const [k, v] of Object.entries(files)) {
  if (k === "word/header1.xml") {
    const s = dec.decode(v);
    console.log("=== word/header1.xml full ===");
    console.log(s);
    console.log("=== has { :", s.includes("{"));
    console.log("=== has drawing :", s.includes("<w:drawing>"));
  }
}
