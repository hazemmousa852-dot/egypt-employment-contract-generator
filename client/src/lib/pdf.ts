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
 * يلتقط عنصر العقد ويولّد ملف PDF متعدد صفحات A4 ثم يبدأ التحميل.
 */
export async function downloadContractPdf(contractEl: HTMLElement): Promise<void> {
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

  for (let i = 0; i < totalSlices; i++) {
    if (i > 0) doc.addPage();

    const y0 = i * sliceH;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.min(sliceH, canvas.height - y0);
    const ctx = slice.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(canvas, 0, y0, canvas.width, slice.height, 0, 0, slice.width, slice.height);

    const imgData = slice.toDataURL("image/jpeg", 0.92);
    const imgH = (slice.height / canvas.width) * pageContentW;

    doc.addImage(imgData, "JPEG", PAGE_MARGIN_MM.x, PAGE_MARGIN_MM.y, pageContentW, imgH);
  }

  doc.save("عقد_عمل.pdf");
}
