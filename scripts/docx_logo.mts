/* اختبار إدراج اللوجو في ترويسة Word */
import { generateContractDocx } from "../client/src/lib/docx-generator.ts";
import * as fs from "node:fs";
import { execSync } from "node:child_process";

const b64 = fs.readFileSync("/tmp/testlogo.png", "base64");
const data = {
  contractNumber: "",
  contractDate: "2026-09-01",
  type: "fixed" as const,
  durationYears: 1,
  durationMonths: 0,
  trainingDurationMonths: 3,
  consultantScope: "",
  employer: { name: "شركة الأهرام", role: "صاحب العمل", nationalId: "", phone: "", address: "مدينة نصر", email: "", commercialRegister: "12345" },
  employee: { name: "أحمد محمد", gender: "male", nationalId: "29501011234567", jobTitle: "مهندس", department: "", qualification: "", phone: "", address: "مصر الجديدة" },
  salary: { basicSalary: 5000, allowances: "", paymentMethod: "cash" as const },
  work: { startDate: "2026-09-01", trialPeriod: false, workLocation: "", workNature: "", dailyHours: "٨", weeklyRestDay: "يوم الجمعة", nonCompete: false },
  logo: "data:image/png;base64," + b64,
};

const blob = await generateContractDocx(data as any);
const buf = Buffer.from(await blob.arrayBuffer());
fs.writeFileSync("/tmp/docx_logo.docx", buf);
execSync("rm -rf /tmp/dxl && mkdir -p /tmp/dxl && cd /tmp/dxl && unzip -o -q /tmp/docx_logo.docx");
const rels = fs.readFileSync("/tmp/dxl/word/_rels/document.xml.rels", "utf8");
const media = fs.readdirSync("/tmp/dxl/word/media");
console.log("media files:", media);
console.log("rels include media:", rels.includes("media/"));
// فحص header1.xml
const hdr = fs.readFileSync("/tmp/dxl/word/header1.xml", "utf8");
console.log("header includes image/drawing:", hdr.includes("w:drawing") || hdr.includes("pic:pic"));
