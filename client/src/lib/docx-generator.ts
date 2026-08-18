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
import { buildEnClausesFor, party2LabelEn } from "./clauses-en";

const FONT = "Cairo";
const FONT_EN = "Times New Roman";

/* ========================= دوال مساعدة إنجليزية ========================= */
function fmtShort(iso: string): string {
  const dd = new Date(iso);
  return `${dd.getDate()}/${dd.getMonth() + 1}/${dd.getFullYear()}`;
}
function durationTextEn(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" and ") : "one month";
}
function salaryWordsEn(n: number): string {
  const units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function three(w: number): string {
    const h = Math.floor(w / 100), rem = w % 100;
    return h ? `${units[h]} hundred` + (rem ? " and " : "") + two(rem) : two(rem);
  }
  function two(w: number): string {
    if (w < 20) return units[w];
    return tens[Math.floor(w / 10)] + (w % 10 ? "-" + units[w % 10] : "");
  }
  const th = Math.floor(n / 1000), rem = n % 1000;
  let out = "";
  if (th) out += `${two(th)} thousand`;
  if (rem) out += (out ? " " : "") + three(rem);
  return out || "zero";
}

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
function paraEn(text: string, align: "left" | "center" | "justify" = "justify", size = 22, firstIndent = false): Paragraph {
  const runs: TextRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT_EN, size, sizeComplexScript: size }));
    runs.push(new TextRun({ text: m[1], font: FONT_EN, size, bold: true, sizeComplexScript: size }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), font: FONT_EN, size, sizeComplexScript: size }));
  return new Paragraph({
    alignment: align === "justify" ? AlignmentType.JUSTIFIED : align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: firstIndent ? { firstLine: 300 } : undefined,
    children: runs,
    spacing: { after: 140, line: 300 },
  });
}

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

function clauseHeadingEn(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: title, font: FONT_EN, size: 24, bold: true, sizeComplexScript: 24 })],
    spacing: { before: 200, after: 100 },
  });
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
function footerCell(label: string, name: string, rtl = true): Paragraph[] {
  const font = rtl ? FONT : FONT_EN;
  const nameLine = rtl ? `الاسم: ${name || ".................."}` : `Name: ${name || ".................."}`;
  const sig = rtl ? "التوقيع: .................." : "Signature: ..................";
  return [
    new Paragraph({
      bidirectional: rtl,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: label, font, size: 22, bold: true, rightToLeft: rtl, sizeComplexScript: 22 })],
    }),
    new Paragraph({
      bidirectional: rtl,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: nameLine, font, size: 20, rightToLeft: rtl, sizeComplexScript: 20 })],
    }),
    new Paragraph({
      bidirectional: rtl,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: sig, font, size: 20, rightToLeft: rtl, sizeComplexScript: 20 })],
    }),
  ];
}

function buildFooter(d: ContractData): Footer {
  const thinBorder = { style: BorderStyle.SINGLE, size: 6, color: "1A1A2E" };
  const p1Ar = d.type === "consultant" ? "الطرف الأول — الجهة المستفيدة" : "الطرف الأول — صاحب العمل";
  const p2Ar = d.type === "training" ? "الطرف الثاني — المتدرب" : d.type === "consultant" ? "الطرف الثاني — الاستشاري" : "الطرف الثاني — العامل";

  if (d.language === "en") {
    const p1En = d.type === "consultant" ? "The First Party — the Beneficiary" : "The First Party — the Employer";
    const p2En = `The Second Party — ${party2LabelEn(d)}`;
    return new Footer({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 200, bottom: 200 },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: thinBorder }, children: footerCell(p1En, d.employer.name, false) }),
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: thinBorder }, children: footerCell(p2En, d.employee.name, false) }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // ar أو both: تذييل عربي (في وضع both يُعرض العمودان داخل جسم العقد؛ التذييل يبقى عربيًا أسفل كل صفحة)
  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        margins: { top: 200, bottom: 200 },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: thinBorder }, children: footerCell(p1Ar, d.employer.name, true) }),
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: thinBorder }, children: footerCell(p2Ar, d.employee.name, true) }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ========================= الترويسة: اللوجو ========================= */
function buildHeader(logoArray: Uint8Array | null, logoEmu: { width: number; height: number } | null, title: string, subtitle: string, rtl = true): Header {
  const font = rtl ? FONT : FONT_EN;
  const logoPara = logoArray
    ? new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new ImageRun({ data: logoArray, transformation: { width: logoEmu?.width ?? 1440, height: logoEmu?.height ?? 810 }, type: "png" }),
        ],
      })
    : null;

  if (rtl) {
    return new Header({
      children: [
        ...(logoPara ? [logoPara] : []),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "بسم الله الرحمن الرحيم", font, size: 28, bold: true, rightToLeft: true, sizeComplexScript: 28 })],
        }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: title, font, size: 36, bold: true, rightToLeft: true, sizeComplexScript: 36 })],
        }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: subtitle, font, size: 22, rightToLeft: true, sizeComplexScript: 22 })],
        }),
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 100 },
          children: [new TextRun({ text: "─────────────────────", font, size: 18, color: "999999", rightToLeft: true, sizeComplexScript: 18 })],
        }),
      ],
    });
  }

  return new Header({
    children: [
      ...(logoPara ? [logoPara] : []),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: title, font, size: 32, bold: true, sizeComplexScript: 32 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subtitle, font, size: 22, sizeComplexScript: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 100 },
        children: [new TextRun({ text: "─────────────────────", font, size: 18, color: "999999", sizeComplexScript: 18 })],
      }),
    ],
  });
}

/* ========================= ترويسة ثنائية اللغة (صف عربي + صف إنجليزي) ========================= */
function buildHeaderBoth(logoArray: Uint8Array | null, logoEmu: { width: number; height: number } | null, titleAr: string, subtitleAr: string, titleEn: string, subtitleEn: string): Header {
  return new Header({
    children: [
      ...(logoArray
        ? [
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [new ImageRun({ data: logoArray, transformation: { width: logoEmu?.width ?? 1440, height: logoEmu?.height ?? 810 }, type: "png" })],
            }),
          ]
        : []),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: "بسم الله الرحمن الرحيم", font: FONT, size: 26, bold: true, rightToLeft: true, sizeComplexScript: 26 })],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: titleAr, font: FONT, size: 30, bold: true, rightToLeft: true, sizeComplexScript: 30 }),
          new TextRun({ text: "  /  " }),
          new TextRun({ text: titleEn, font: FONT_EN, size: 26, bold: true, sizeComplexScript: 26 }),
        ],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: subtitleAr, font: FONT, size: 20, rightToLeft: true, sizeComplexScript: 20 }),
          new TextRun({ text: "  /  " }),
          new TextRun({ text: subtitleEn, font: FONT_EN, size: 18, sizeComplexScript: 18 }),
        ],
      }),
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: "─────────────────────", font: FONT, size: 16, color: "999999", rightToLeft: true, sizeComplexScript: 16 })],
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
  // قراءة أبعاد PNG الأصلية من ترويسة IHDR لضبط نسبة اللوجو دون تشويه
  let logoEmu: { width: number; height: number } | null = null;
  if (logoArray && logoArray.length > 24) {
    const w = (logoArray[16] << 24) | (logoArray[17] << 16) | (logoArray[18] << 8) | logoArray[19];
    const h = (logoArray[20] << 24) | (logoArray[21] << 16) | (logoArray[22] << 8) | logoArray[23];
    if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0) {
      const MAX_W_EMU = 3429; // 3.6 سم عرضًا كحد أقصى للترويسة
      const MAX_H_EMU = 1905; // 2 سم ارتفاعًا كحد أقصى
      let emuW = Math.round((MAX_H_EMU * w) / h); // ابدأ بالارتفاع الأقصى
      let emuH = MAX_H_EMU;
      if (emuW > MAX_W_EMU) { emuW = MAX_W_EMU; emuH = Math.round((MAX_W_EMU * h) / w); }
      logoEmu = { width: emuW, height: emuH };
    }
  }

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

  const docTitleEn = isTraining ? "Probationary Training Contract" : isConsultant ? "Consultancy Services Agreement" : "Individual Employment Contract";
  const docSubtitleEn = isTraining
    ? "Under the Egyptian Labour Law No. (14) of 2025 and the Social Insurance Law No. (148) of 2019"
    : isConsultant
      ? "A civil contract for the provision of independent professional services — not an employment relationship under the Labour Law"
      : "In accordance with the Egyptian Labour Law No. (14) of 2025";

  /* ========================= سطر نوع العقد (إنجليزي) ========================= */
  let typeTextEn = "";
  if (d.type === "fixed") {
    typeTextEn = `Contract type: Fixed-term — Duration: ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)} — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}${endDateIso ? ` — End: ${fmtShort(endDateIso)}` : ""}`;
  } else if (d.type === "task") {
    typeTextEn = `Contract type: Fixed-term for the accomplishment of a specific task — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}${endDateIso ? ` — End: ${fmtShort(endDateIso)}` : ""}`;
  } else if (isTraining) {
    typeTextEn = `Contract type: Probationary training — Duration: ${d.trainingDurationMonths ?? 3} months — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}${endDateIso ? ` — End: ${fmtShort(endDateIso)}` : ""}`;
  } else if (isConsultant) {
    const durationPart = (d.durationYears ?? 0) || (d.durationMonths ?? 0)
      ? `Term: ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)} — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}${endDateIso ? ` — End: ${fmtShort(endDateIso)}` : ""}`
      : `Indefinite-term — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}`;
    typeTextEn = `Contract type: Independent consultancy services (civil contract) — ${durationPart}`;
  } else {
    typeTextEn = `Contract type: Indefinite-term — Start: ${d.work.startDate ? fmtShort(d.work.startDate) : ".........."}`;
  }

  /* ========================= فقرات الأطراف (إنجليزي) ========================= */
  const p2LabelEn = party2LabelEn(d);
  const p1LabelEn = isConsultant ? "The Beneficiary of the Consultancy" : "The Employer";

  /* ========================= التوقيعات النهائية ========================= */
  const signaturesAr: (Paragraph | Table)[] = [
    empty(200),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: footerCell("الطرف الأول — " + party1Label, d.employer.name, true) }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: footerCell("الطرف الثاني — " + party2Label, d.employee.name, true) }),
          ],
        }),
      ],
    }),
  ];
  const signaturesEn: (Paragraph | Table)[] = [
    empty(200),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: footerCell("The First Party — " + p1LabelEn, d.employer.name, false) }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: footerCell("The Second Party — " + p2LabelEn, d.employee.name, false) }),
          ],
        }),
      ],
    }),
  ];

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
          page: { margin: { top: 1200, right: 1200, bottom: 1700, left: 1200 } },
        } as never,
        headers: { default: d.language === "both" ? buildHeaderBoth(logoArray, logoEmu, docTitle, docSubtitle, docTitleEn, docSubtitleEn) : buildHeader(logoArray, logoEmu, d.language === "en" ? docTitleEn : docTitle, d.language === "en" ? docSubtitleEn : docSubtitle, d.language !== "en") },
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
          ...(d.salary.hasOvertime && d.salary.basicSalary
            ? [
                empty(100),
                para("الأجر الإضافي", "right", 24, true),
                para(
                  `ساعة العمل النهارية الإضافية بأجر ساعتها مضافًا إليها نسبة (35%)، والساعة الليلية بأجر ساعتها مضافًا إليها نسبة (70%)، وذلك عن ${arabicNumeral((d.salary.overtimeDayHours ?? 0) + (d.salary.overtimeNightHours ?? 0))} ساعة إضافية شهريًا تقديريًا`,
                  "right",
                  24,
                  true,
                ),
              ]
            : []),
          new Paragraph({ children: [new PageBreak()] }),
          ...(d.language === "both"
            ? clauses.map((c) => {
                const en = buildEnClausesFor(d).find((e) => e.number === c.number);
                let txt = c.text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "");
                txt = txt.replace(/\d+\s*\/\s*\d+\s*\/\s*\d+م?/g, (m) => {
                  const parts = m.replace("م", "").split(/\s*\/\s*/);
                  return arabicNumeral(`${parts[0]}/${parts[1]}/${parts[2]}م`);
                });
                const txtEn = en ? en.text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "") : "";
                return [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `البند (${arabicNumeral(c.number)}) — Clause (${c.number})`, font: FONT, size: 26, bold: true, rightToLeft: true, sizeComplexScript: 26 })],
                    spacing: { before: 240, after: 120 },
                  }),
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            margins: { top: 60, bottom: 60 },
                            children: [para(txt, "justify", 20)],
                          }),
                          new TableCell({
                            width: { size: 50, type: WidthType.PERCENTAGE },
                            margins: { top: 60, bottom: 60 },
                            children: [paraEn(txtEn, "justify", 20)],
                          }),
                        ],
                      }),
                    ],
                  }),
                  ...(c.breakAfter ? [new Paragraph({ children: [new PageBreak()] })] : []),
                ];
              }).flat()
            : clauses.map((c) => {
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
              }).flat()),
          new Paragraph({ children: [new PageBreak()] }),
          para(
            `حُرر هذا العقد في تاريخ ${d.contractDate ? dateArabic(d.contractDate) : ".........."}، من أربع نسخ أصلية، استلم كل من الطرفين نسخة، وأُودعت نسخة بمكتب التأمينات الاجتماعية المختصة، ونسخة بالجهة الإدارية المختصة.`,
            "justify",
            24,
            true,
          ),
          empty(300),
          ...signaturesAr,
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
