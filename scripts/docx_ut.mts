import { generateContractDocx } from "../client/src/lib/docx-generator";
import { writeFileSync } from "fs";

const contract = {
  employer: {
    name: "شركة النيل للتجارة",
    commercialRegister: "123456",
    address: "مدينة نصر، القاهرة",
    phone: "01234567890",
    email: "info@example.com",
  },
  employee: {
    name: "أحمد محمد علي حسن",
    nationalId: "29501011234567",
    gender: "ذكر",
    jobTitle: "محاسب",
    department: "إدارة الحسابات",
    qualification: "بكالوريوس تجارة",
    phone: "01098765432",
    address: "مصر الجديدة",
  },
  type: "fixed",
  contractNumber: "101",
  contractDate: "2026-08-17",
  durationYears: 1,
  durationMonths: 0,
  work: { startDate: "2026-09-01", place: "الفرع الرئيسي", nature: "عمل دائم", dailyHours: "8", weeklyRest: "يوم الجمعة" },
  salary: { basicSalary: 50000, allowances: "" } as any,
  benefits: "",
  paymentMethod: "نقدًا",
  trial: true,
  nonCompete: false,
} as any;

const blob = await generateContractDocx(contract);
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("/tmp/test-out.docx", buf);
console.log("size:", buf.length);
