import { generateContractDocx } from "../client/src/lib/docx-generator.ts";
import * as fs from "node:fs";
import { execSync } from "node:child_process";

function baseData(type: string): any {
  return {
    contractNumber: "101",
    contractDate: "2026-09-01",
    type,
    durationYears: type === "fixed" ? 1 : 0,
    durationMonths: 0,
    taskDescription: "بناء سور بطول ١٢٠ مترًا",
    trainingDurationMonths: 3,
    consultantScope: "إعداد دراسات الجدوى المالية",
    employer: { name: "شركة الأهرام", role: "صاحب العمل", nationalId: "", phone: "01000000000", address: "مدينة نصر", email: "info@ahram.com", commercialRegister: "12345" },
    employee: { name: "أحمد محمد علي", gender: "male", nationalId: "29501011234567", jobTitle: "مهندس مدني", department: "الأعمال", qualification: "بكالوريوس هندسة", phone: "01100000000", address: "مصر الجديدة" },
    salary: { basicSalary: 50000, allowances: "", paymentMethod: "cash" },
    work: { startDate: "2026-09-01", trialPeriod: false, workLocation: "القاهرة", workNature: "عمل دائم", dailyHours: "٨", weeklyRestDay: "يوم الجمعة", nonCompete: false },
    logo: "",
  };
}

for (const t of ["fixed", "task", "indefinite", "training", "consultant"]) {
  const blob = await generateContractDocx(baseData(t));
  const buf = Buffer.from(await blob.arrayBuffer());
  const file = `/tmp/docx5_${t}.docx`;
  fs.writeFileSync(file, buf);
  execSync(`rm -rf /tmp/dx5_${t} && mkdir -p /tmp/dx5_${t} && cd /tmp/dx5_${t} && unzip -o -q ${file}`);
  const xml = fs.readFileSync(`/tmp/dx5_${t}/word/document.xml`, "utf8");

  console.log(`\n===== ${t} (${buf.length} bytes) =====`);
  const checks = [
    ["NaN", !/NaN/.test(xml)],
    ["وسوم HTML خام", !/<span/.test(xml)],
    ["بسملة", xml.includes("بسم الله الرحمن الرحيم")],
    ["عنوان صحيح", t === "training" ? xml.includes("عقد تدريب تجريبي") : t === "consultant" ? xml.includes("عقد تعاقد مع استشاري") : xml.includes("عقد عمل فردي")],
    ["تذييل توقيعات", xml.includes("الطرف الأول") && xml.includes("الطرف الثاني")],
    ["التاريخ الشرقي", xml.includes("١/٩/٢٠٢٦م")],
    ["فاصلة الآلاف", xml.includes("50,000")],
    ["الأجر بالحروف", xml.includes("خمسون ألف جنيه")],
    ["endDate صحيح", t === "fixed" ? xml.includes("٣١/٨/٢٠٢٧م") : t === "training" ? xml.includes("٣٠/١١/٢٠٢٦م") : true],
  ];
  for (const [name, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}`);
}
console.log("\nDone.");
