/*
 * DESIGN: "الديوان الرسمي" — مولد ملف Word (.docx) بالعربية للعقد
 * يولّد مستند Word RTL بخط Cairo مع جميع بنود العقد، قابل للتعديل والطباعة.
 */
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from "docx";
import { ContractData, arabicNumeral, contractEndDate, dateArabic, dateArabicShort, durationText } from "./contract";
import { buildClauses } from "./clauses";

const FONT = "Cairo";

/** تقسيم النص الغني **bold** إلى مقاطع */
function mixedParagraph(text: string, align: "right" | "center" | "justify" = "justify", size = 24, firstIndent = false): Paragraph {
  const runs: TextRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size, rightToLeft: true, sizeComplexScript: size }));
    runs.push(new TextRun({ text: m[1], font: FONT, size, bold: true, rightToLeft: true, sizeComplexScript: size }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), font: FONT, size, rightToLeft: true, sizeComplexScript: size }));
  return new Paragraph({
    alignment: align === "justify" ? AlignmentType.JUSTIFIED : align === "center" ? AlignmentType.CENTER : AlignmentType.RIGHT,
    indent: firstIndent ? { firstLine: 300 } : undefined,
    bidirectional: true,
    children: runs,
    spacing: { after: 180, line: 340 },
  });
}

/** عنوان بند (البند (١): العنوان) */
function clauseHeading(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    children: [new TextRun({ text: title, font: FONT, size: 26, bold: true, rightToLeft: true, sizeComplexScript: 26 })],
    spacing: { before: 240, after: 120 },
  });
}

/** توقيع الطرفين جنب بعض في صفحة نهائية */
function signatureBlock(employer: string, employee: string): Paragraph[] {
  return [
    mixedParagraph("التوقيعات والختم", "center", 28),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    mixedParagraph(`الطرف الأول — صاحب العمل              الطرف الثاني — العامل`, "center", 24),
    mixedParagraph(`${employer || ".................."}          .............`, "center", 24),
    mixedParagraph(`الاسم: ..................              الاسم: ..................`, "center", 24),
    mixedParagraph(`التوقيع: ..................              التوقيع: ..................`, "center", 24),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    mixedParagraph(`تاريخ التوقيع: ..................`, "center", 24),
  ];
}

export async function generateContractDocx(d: ContractData): Promise<Blob> {
  const clauses = buildClauses(d);
  const endDateObj = contractEndDate(d.work.startDate, d.durationYears ?? 0, d.durationMonths ?? 0);
  const endDate = endDateObj ? dateArabicShort(endDateObj.toISOString().slice(0, 10)) : "";

  const typeText =
    d.type === "fixed"
      ? `نوع العقد: محدد المدة — مدة العقد: ${durationText(d.durationYears ?? 0, d.durationMonths ?? 0)} — يبدأ: ${dateArabicShort(d.work.startDate)} وينتهي: ${endDate}`
      : d.type === "task"
        ? `نوع العقد: محدد المدة لإنجاز عمل معين — يبدأ: ${dateArabicShort(d.work.startDate)}`
        : "نوع العقد: غير محدد المدة";

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
          paragraph: { spacing: { line: 320 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } },
        },
        children: [
          mixedParagraph("بسم الله الرحمن الرحيم", "center", 28),
          mixedParagraph("عقد عمل فردي", "center", 44),
          mixedParagraph("مطابق لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥", "center", 24),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          mixedParagraph("الطرف الأول: صاحب العمل", "right", 24, true),
          mixedParagraph(d.employer.name || "..........", "right", 26, true),
          mixedParagraph(`السجل التجاري / الرقم الضريبي: ${d.employer.commercialRegister || ".........."}`, "right", 22, true),
          mixedParagraph(`العنوان: ${d.employer.address || ".........."}`, "right", 22, true),
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          mixedParagraph("الطرف الثاني: العامل", "right", 24, true),
          mixedParagraph(d.employee.name || "..........", "right", 26, true),
          mixedParagraph(
            `${d.employee.gender === "female" ? "أنثى" : "ذكر"} — رقم قومي: ${d.employee.nationalId ? arabicNumeral(d.employee.nationalId) : ".........."} — مؤهل: ${d.employee.qualification || ".........."}`,
            "right",
            22,
            true,
          ),
          mixedParagraph(`محل الإقامة: ${d.employee.address || ".........."}`, "right", 22, true),
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          mixedParagraph("مسمى الوظيفة", "right", 24, true),
          mixedParagraph(`${d.employee.jobTitle || ".........."}${d.employee.department ? " — قسم/إدارة: " + d.employee.department : ""}`, "right", 24, true),
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          mixedParagraph(typeText, "right", 24, true),
          ...(d.salary.basicSalary
            ? [
                new Paragraph({ spacing: { after: 100 }, children: [] }),
                mixedParagraph("الأجر الشهري", "right", 24, true),
                mixedParagraph(
                  `${d.salary.basicSalary.toLocaleString("ar-EG")} جنيه شهريًا`,
                  "right",
                  24,
                  true,
                ),
              ]
            : []),
          new Paragraph({ children: [new PageBreak()] }),
          ...clauses.map((c) => [
            clauseHeading(`البند (${arabicNumeral(c.number)}): ${c.title}`),
            mixedParagraph(c.text),
            ...(c.breakAfter ? [new Paragraph({ children: [new PageBreak()] })] : []),
          ]).flat(),
          new Paragraph({ children: [new PageBreak()] }),
          mixedParagraph(
            `حُرر هذا العقد في تاريخ ${d.contractDate ? dateArabic(d.contractDate) : ".........."}، من أربع نسخ أصلية، استلم كل من الطرفين نسخة، وأُودعت نسخة بمكتب التأمينات الاجتماعية المختصة، ونسخة بالجهة الإدارية المختصة.`,
            "justify",
            24,
            true,
          ),
          new Paragraph({ spacing: { after: 300 }, children: [] }),
          ...signatureBlock(d.employer.name, d.employee.name),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function downloadContractDocx(d: ContractData, filename?: string): Promise<void> {
  const blob = await generateContractDocx(d);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `عقد_عمل_${(d.employee.name || "العامل").replace(/\s+/g, "_")}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
