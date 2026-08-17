/*
 * DESIGN: "الديوان الرسمي" — مولد ملف Word (.docx) بالعربية للعقد
 * RTL كامل (docDefaults bidirectional + bidirectional بكل فقرة + rightToLeft بكل مقطع)،
 * ترويسة تحمل لوجو الشركة (إن وُجد)، تذييل يحتوي توقيع الطرفين أسفل كل صفحة،
 * تغطية الأنواع الخمسة: محدد المدة / لإنجاز عمل معين / غير محدد المدة / تدريب تجريبي / استشاري.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  ImageRun,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { ContractData, arabicNumeral, contractEndDate, dateArabic, dateArabicShort, durationText, numberToArabicWords } from "./contract";
import { buildClauses } from "./clauses";

const FONT = "Cairo";

/* ========================= تحويل اللوجو ========================= */
function dataUrlToArray(dataUrl?: string): Uint8Array | null {
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

/* ========================= التواريخ الشرقية ========================= */
function dateArabicEastern(date: Date | string): string {
  if (!date) return "..........";
  let d: Date;
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, day] = date.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "..........";
  return arabicNumeral(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}م`);
}

/* ========================= الفقرات ========================= */
function para(text: string, align: "right" | "center" | "justify" = "justify", size = 24, firstIndent = false): Paragraph {
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

function empty(spacing = 180): Paragraph {
  return new Paragraph({ bidirectional: true, spacing: { after: spacing }, children: [] });
}

function clauseHeading(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    children: [new TextRun({ text: title, font: FONT, size: 26, bold: true, rightToLeft: true, sizeComplexScript: 26 })],
    spacing: { before: 240, after: 120 },
  });
}

/* ========================= التذييل: توقيع الطرفين أسفل كل صفحة ========================= */
function buildFooter(d: ContractData): Footer {
  const thinBorder = { style: BorderStyle.SINGLE, size: 6, color: "1A1A2E" };
  const makeCell = (first: string, second: string): Paragraph[] => [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: first, font: FONT, size: 22, bold: true, rightToLeft: true, sizeComplexScript: 22 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `الاسم: ${second || ".................."}`, font: FONT, size: 20, rightToLeft: true, sizeComplexScript: 20 })],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "التوقيع: ..................", font: FONT, size: 20, rightToLeft: true, sizeComplexScript: 20 })],
    }),
  ];

  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: { top: 200, bottom: 200 },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: thinBorder },
                children: makeCell(d.type === "consultant" ? "الطرف الأول — الجهة المستفيدة" : "الطرف الأول — صاحب العمل", d.employer.name),
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: thinBorder },
                children: makeCell(d.type === "training" ? "الطرف الثاني — المتدرب" : d.type === "consultant" ? "الطرف الثاني — الاستشاري" : "الطرف الثاني — العامل", d.employee.name),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ========================= الترويسة: اللوجو ========================= */
function buildHeader(logoArray: Uint8Array | null, title: string, subtitle: string): Header {
  return new Header({
    children: [
      ...(logoArray
        ? [
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new ImageRun({
                  data: logoArray,
                  transformation: { width: 1600, height: 960 },
                  type: "png",
                }),
              ],
            }),
          ]
        : []),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: "بسم الله الرحمن الرحيم", font: FONT, size: 28, bold: true, rightToLeft: true, sizeComplexScript: 28 })],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: title, font: FONT, size: 36, bold: true, rightToLeft: true, sizeComplexScript: 36 })],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subtitle, font: FONT, size: 22, rightToLeft: true, sizeComplexScript: 22 })],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 100 },
        children: [new TextRun({ text: "─────────────────────", font: FONT, size: 18, color: "999999", rightToLeft: true, sizeComplexScript: 18 })],
      }),
    ],
  });
}

/* ========================= المولد الرئيسي ========================= */
export async function generateContractDocx(d: ContractData): Promise<Blob> {
  const clauses = buildClauses(d);
  const endDateObj = d.type === "training"
    ? contractEndDate(d.work.startDate, 0, d.trainingDurationMonths ?? 0)
    : contractEndDate(d.work.startDate, d.durationYears ?? 0, d.durationMonths ?? 0);
  const endDateIso = endDateObj ? endDateObj.toISOString().slice(0, 10) : null;
  const logoArray = dataUrlToArray(d.logo);

  const isTraining = d.type === "training";
  const isConsultant = d.type === "consultant";
  const party2Label = isTraining ? "المتدرب" : isConsultant ? "الاستشاري" : "العامل";
  const party1Label = isConsultant ? "الجهة المستفيدة من الاستشارات" : "صاحب العمل";

  const docTitle = isTraining ? "عقد تدريب تجريبي" : isConsultant ? "عقد تعاقد مع استشاري" : "عقد عمل فردي";
  const docSubtitle = isTraining
    ? "وفقًا لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥ وقانون التأمينات الاجتماعية"
    : isConsultant
      ? "تعاقد مدني على تقديم خدمات مهنية مستقلة — لا يُعد علاقة عمل بموجب قانون العمل"
      : "مطابق لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥";

  let typeText = "";
  if (d.type === "fixed") {
    typeText = `نوع العقد: محدد المدة — مدة العقد: ${durationText(d.durationYears ?? 0, d.durationMonths ?? 0)} — يبدأ: ${dateArabicEastern(d.work.startDate)} وينتهي: ${endDateIso ? dateArabicEastern(endDateIso) : ".........."}`;
  } else if (d.type === "task") {
    typeText = `نوع العقد: محدد المدة لإنجاز عمل معين — يبدأ: ${dateArabicEastern(d.work.startDate)}${endDateIso ? ` وينتهي: ${dateArabicEastern(endDateIso)}` : ""}`;
  } else if (isTraining) {
    typeText = `نوع العقد: تدريب تجريبي — المدة: ${d.trainingDurationMonths ?? 3} أشهر — يبدأ: ${dateArabicEastern(d.work.startDate)} وينتهي: ${endDateIso ? dateArabicEastern(endDateIso) : ".........."}`;
  } else if (isConsultant) {
    const durationPart = (d.durationYears ?? 0) || (d.durationMonths ?? 0)
      ? `مدة التعاقد: ${durationText(d.durationYears ?? 0, d.durationMonths ?? 0)} — يبدأ: ${dateArabicEastern(d.work.startDate)} وينتهي: ${endDateIso ? dateArabicEastern(endDateIso) : ".........."}`
      : `غير محدد المدة — يبدأ: ${dateArabicEastern(d.work.startDate)}`;
    typeText = `نوع العقد: خدمات استشارية مستقلة (تعاقد مدني) — ${durationPart}`;
  } else {
    typeText = `نوع العقد: غير محدد المدة — يبدأ: ${dateArabicEastern(d.work.startDate)}`;
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24, rightToLeft: true },
          paragraph: { spacing: { line: 320 }, bidirectional: true } as never,
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1400, right: 1200, bottom: 1800, left: 1200 } },
        } as never,
        headers: { default: buildHeader(logoArray, docTitle, docSubtitle) },
        footers: { default: buildFooter(d) },
        children: [
          para(`الطرف الأول: ${party1Label}`, "right", 24, true),
          para(d.employer.name || "..........", "right", 26, true),
          para(`السجل التجاري / الرقم الضريبي: ${d.employer.commercialRegister || ".........."}`, "right", 22, true),
          para(`العنوان: ${d.employer.address || ".........."}`, "right", 22, true),
          para(`هاتف: ${d.employer.phone || ".........."} — بريد: ${d.employer.email || ".........."}`, "right", 22, true),
          empty(100),

          para(`الطرف الثاني: ${party2Label}`, "right", 24, true),
          para(d.employee.name || "..........", "right", 26, true),
          para(
            `${d.employee.gender === "female" ? "أنثى" : "ذكر"} — رقم قومي: ${d.employee.nationalId ? arabicNumeral(d.employee.nationalId) : ".........."} — مؤهل: ${d.employee.qualification || ".........."}`,
            "right",
            22,
            true,
          ),
          para(`محل الإقامة: ${d.employee.address || ".........."} — هاتف: ${d.employee.phone || ".........."}`, "right", 22, true),
          empty(100),

          para(isConsultant ? "مجال الاستشارات والخدمات" : isTraining ? "تخصص التدريب" : "مسمى الوظيفة", "right", 24, true),
          para(`${d.employee.jobTitle || ".........."}${d.employee.department ? " — قسم/إدارة: " + d.employee.department : ""}`, "right", 24, true),

          ...(isConsultant && (d.consultantScope || "").trim()
            ? [para(`نطاق الاستشارات والخدمات: ${d.consultantScope}`, "right", 22, true)]
            : []),

          empty(100),
          para(typeText, "right", 24, true),

          ...(d.salary.basicSalary
            ? [
                empty(100),
                para(isConsultant ? "الأتعاب الشهرية" : "الأجر الشهري", "right", 24, true),
                para(
                  `${new Intl.NumberFormat("en-US").format(d.salary.basicSalary)} (${numberToArabicWords(d.salary.basicSalary)} جنيه) فقط لا غير شهريًا`,
                  "right",
                  24,
                  true,
                ),
              ]
            : []),

          new Paragraph({ children: [new PageBreak()] }),

          ...clauses.map((c) => {
            let txt = c.text
              .replace(/\*\*(.+?)\*\*/g, "$1")
              .replace(/<span[^>]*>/g, "")
              .replace(/<\/span>/g, "");
            txt = txt.replace(/\d+\s*\/\s*\d+\s*\/\s*\d+م?/g, (m) => {
              const parts = m.replace("م", "").split(/\s*\/\s*/);
              return arabicNumeral(`${parts[0]}/${parts[1]}/${parts[2]}م`);
            });
            return [
              clauseHeading(`البند (${arabicNumeral(c.number)}): ${c.title}`),
              para(txt),
              ...(c.breakAfter ? [new Paragraph({ children: [new PageBreak()] })] : []),
            ];
          }).flat(),

          new Paragraph({ children: [new PageBreak()] }),

          para(
            `حُرر هذا العقد في تاريخ ${d.contractDate ? dateArabic(d.contractDate) : ".........."}، من أربع نسخ أصلية، استلم كل من الطرفين نسخة، وأُودعت نسخة بمكتب التأمينات الاجتماعية المختصة، ونسخة بالجهة الإدارية المختصة.`,
            "justify",
            24,
            true,
          ),
          empty(300),
        ],
      },
    ],
  });

  const packed = await Packer.toBlob(doc);

  // حقن <w:bidi/> و<w:rtlGutter/> في sectPr — لا تتيحهما مكتبة docx عبر واجهتها
  return await injectRtlSection(packed);
}

import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

/**
 * حقن RTL على مستوى القسم في ملف docx الناتج:
 * يفتح الحزمة، يضيف <w:bidi/> و<w:rtlGutter/> كأول عناصر داخل <w:sectPr>،
 * ثم يعيد ضغط الحزمة بالترتيب الأصلي للأعضاء.
 *
 * <w:bidi/> يجعل تخطيط الصفحة يبدأ من اليمين،
 * و<w:rtlGutter/> يجعل الهامش الداخلي جهة اليمين.
 *
 * هذه الخطوة ضرورية لأن LibreOffice وWord لا يحترمان bidi على مستوى الفقرة
 * وحدها — التخطيط العام للصفحة يحتاج bidi في sectPr.
 */
async function injectRtlSection(blob: Blob): Promise<Blob> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buffer);
  } catch {
    return blob; // إن لم تكن حزمة صالحة نُعيد الأصل كما هو
  }
  const docKey = "word/document.xml";
  const xml = files[docKey];
  if (!xml) return blob;
  const text = strFromU8(xml);
  const m = text.match(/<w:sectPr[^>]*>/);
  if (!m || /<w:sectPr[^>]*>[\s\S]*?<w:bidi/.test(text)) return blob; // سبق الحقن داخل sectPr
  const newText = text.replace(m[0], m[0] + '<w:bidi/><w:rtlGutter w:val="1"/>', );
  files[docKey] = strToU8(newText);
  const order = Object.keys(files);
  // zipSync يحفظ الأعضاء بالترتيب الذي تُمرَّر به — نعيد بناءها بالترتيب الأصلي
  const zipped = zipSync(
    Object.fromEntries(order.map((k) => [k, files[k]])),
    { level: 6 },
  );
  return new Blob([zipped], { type: blob.type });
}

export async function downloadContractDocx(d: ContractData, filename?: string): Promise<void> {
  const blob = await generateContractDocx(d);
  const isTraining = d.type === "training";
  const isConsultant = d.type === "consultant";
  const kind = isTraining ? "تدريب" : isConsultant ? "استشارات" : "عمل";
  const name = (d.employee.name || (isConsultant ? "الاستشاري" : "العامل")).replace(/\s+/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `عقد_${kind}_${name}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
