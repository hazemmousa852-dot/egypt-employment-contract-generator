/**
 * نمط التصميم: الديوان الرسمي — توليد PDF للعقد.
 * يحوّل صفحة العقد إلى ملف PDF متعدد الصفحات بحجم A4
 * باستخدام html2canvas-pro وjsPDF دون أي اعتمادات خلفية.
 * التقاط واحد للعقد كاملًا ثم تقسيم الصورة إلى شرائح بارتفاع صفحة A4
 * بحيث يطابق تدفق الصفحات عند الطباعة الفعلية.
 */
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_W_MM = 210;
const A4_H_MM = 297;
/** هوامش الطباعة المطابقة لـ @page في index.css */
const PAGE_MARGIN_MM = { x: 14, y: 12 };

const CONTENT_W_MM = A4_W_MM - PAGE_MARGIN_MM.x * 2;
const CONTENT_H_MM = A4_H_MM - PAGE_MARGIN_MM.y * 2;

/**
 * يرسم خانات توقيع الطرفين أسفل شريحة الصفحة على لوحة canvas.
 */
function drawSignatureBlock(
  sliceCanvas: HTMLCanvasElement,
  isArabic: boolean,
): HTMLCanvasElement {
  const blockH = Math.round(sliceCanvas.width * (26 / 210));
  const sheet = document.createElement("canvas");
  sheet.width = sliceCanvas.width;
  sheet.height = sliceCanvas.height + blockH;
  const ctx = sheet.getContext("2d");
  if (!ctx) return sliceCanvas;

  // نسخ محتوى الشريحة أعلاه
  ctx.drawImage(sliceCanvas, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, sliceCanvas.height, sheet.width, blockH);

  // خط علوي ذهبي داكن يمتد على عرض الصفحة فوق منطقة التوقيع
  const marginPx = Math.round(sheet.width * (14 / 210));
  const ruleY = sliceCanvas.height + Math.round(blockH * 0.12);
  ctx.strokeStyle = "rgba(26,26,46,0.45)";
  ctx.lineWidth = Math.max(1, Math.round(sheet.width / 800));
  ctx.beginPath();
  ctx.moveTo(marginPx, ruleY);
  ctx.lineTo(sheet.width - marginPx, ruleY);
  ctx.stroke();

  const colW = (sheet.width - marginPx * 2) / 2;
  const y1 = ruleY + Math.round(blockH * 0.30);
  const y2 = y1 + Math.round(blockH * 0.30);
  const fontSize = Math.max(9, Math.round(sheet.width * (3.4 / 210)));
  ctx.font = `bold ${fontSize}px "Amiri", "Cairo", serif`;
  ctx.fillStyle = "#1a1a2e";
  ctx.textAlign = "center";

  const firstLabel = isArabic ? "الطرف الأول — صاحب العمل" : "The First Party — the Employer";
  const secondLabel = isArabic ? "الطرف الثاني — العامل" : "The Second Party — the Employee";

  const cx1 = marginPx + colW / 2;
  const cx2 = sheet.width - marginPx - colW / 2;

  // في الاتجاه العربي: الطرف الأول على اليمين
  const leftCx = isArabic ? cx2 : cx1;
  const rightCx = isArabic ? cx1 : cx2;

  ctx.font = `bold ${fontSize}px "Amiri", "Cairo", sans-serif`;
  ctx.fillText(firstLabel, rightCx, y1);
  ctx.fillText(secondLabel, leftCx, y1);

  ctx.font = `${fontSize}px "Amiri", "Cairo", sans-serif`;
  const nameLine = isArabic ? "الاسم: .............................." : "Name: ..............................";
  const signLine = isArabic ? "التوقيع: .............................." : "Signature: ..............................";
  ctx.fillText(nameLine, rightCx, y2);
  ctx.fillText(nameLine, leftCx, y2);
  ctx.fillText(signLine, rightCx, y2 + fontSize + 2);
  ctx.fillText(signLine, leftCx, y2 + fontSize + 2);

  return sheet;
}

/**
 * يلتقط عنصر العقد ويولّد ملف PDF متعدد صفحات A4 ثم يبدأ التحميل.
 */
export async function downloadContractPdf(contractEl: HTMLElement): Promise<void> {
  // استنساخ عقدة العقد في DOM مؤقتًا مع تطبيق إخفاء عناصر no-print
  // لأن html2canvas-pro لا يطبّق قواعد @media print تلقائيًا
  const hiddenEls: HTMLElement[] = [];
  contractEl.querySelectorAll(".no-print").forEach((el) => {
    hiddenEls.push(el as HTMLElement);
    (el as HTMLElement).style.display = "none";
  });

  try {
  // التقاط واحد للعقد كاملًا (مستمر التدفق كما في الطباعة)
  const canvas = await html2canvas(contractEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: contractEl.scrollWidth,
    imageTimeout: 0,
    allowTaint: true,
  });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const cssPxPerMm = canvas.width / A4_W_MM; // بيكسل لكل ملليمتر في العرض
  const sliceH = Math.round(CONTENT_H_MM * cssPxPerMm);

  const totalSlices = Math.ceil(canvas.height / sliceH);
  const pageContentW = CONTENT_W_MM;
  const pageContentH = CONTENT_H_MM;

  const lang = contractEl.getAttribute("data-lang") ?? contractEl.lang ?? "ar";
  const isArabic = lang !== "en";

  for (let i = 0; i < totalSlices; i++) {
    if (i > 0) doc.addPage();

    const y0 = i * sliceH;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.min(sliceH, canvas.height - y0);
    const ctx = slice.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(canvas, 0, y0, canvas.width, slice.height, 0, 0, slice.width, slice.height);

    // خانات التوقيع تتكرر أسفل كل صفحة من صفحات PDF
    const sheet = drawSignatureBlock(slice, isArabic);

    const imgData = sheet.toDataURL("image/jpeg", 0.92);
    const imgH = (sheet.height / canvas.width) * pageContentW;

    doc.addImage(imgData, "JPEG", PAGE_MARGIN_MM.x, PAGE_MARGIN_MM.y, pageContentW, imgH);
  }

  doc.save("عقد_عمل.pdf");
  } finally {
    // استعادة العناصر المخفية إلى حالتها الأصلية
    hiddenEls.forEach((el) => el.style.removeProperty("display"));
  }
}
