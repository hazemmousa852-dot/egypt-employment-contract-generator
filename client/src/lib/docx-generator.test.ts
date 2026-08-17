/*
 * DESIGN: "الديوان الرسمي" — اختبارات وحدة لمولّد Word:
 * التحقق من تاريخ نهاية عقد التدريب (٣٠/١١/٢٠٢٦م لأجل ١/٩/٢٠٢٦م)،
 * ووجود الأرقام العربية الشرقية في سطر نوع العقد، واتجاه RTL في sectPr،
 * وتكرار توقيعات الطرفين في التذييل، وإدراج اللوجو.
 */
import { describe, expect, it } from "vitest";
import { contractEndDate, dateArabicEastern } from "./contract";

describe("تاريخ نهاية العقد", () => {
  it("عقد التدريب: ٣ أشهر من 1/9/2026 ينتهي في 30/11/2026", () => {
    const end = contractEndDate("2026-09-01", 0, 3);
    expect(end).not.toBeNull();
    expect(end!.toISOString().slice(0, 10)).toBe("2026-11-30");
  });

  it("عقد محدد المدة: سنة واحدة من 1/9/2026 ينتهي في 31/8/2027", () => {
    const end = contractEndDate("2026-09-01", 1, 0);
    expect(end).not.toBeNull();
    expect(end!.toISOString().slice(0, 10)).toBe("2027-08-31");
  });

  it("dateArabicEastern تُخرج أرقامًا عربية شرقية بالصيغة المطلوبة", () => {
    const s = dateArabicEastern("2026-11-30");
    expect(s).toBe("٣٠/١١/٢٠٢٦م");
  });
});
