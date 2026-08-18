/**
 * نمط التصميم: الديوان الرسمي — توليد PDF للعقد.
 * يحوّل صفحة العقد إلى ملف PDF متعدد الصفحات بحجم A4
 * باستخدام html2canvas-pro وjsPDF دون أي اعتمادات خلفية.
 * التقاط واحد للعقد كاملًا ثم تقسيم الصورة إلى شرائح بارتفاع صفحة A4
 * مع تقطيع ذكي عند حدود البنود (لا ينكسر البند بين صفحتين)،
 * وفوتر توقيعات الطرفين يتكرر أسفل كل صفحة مطابقةً لتصميم المعاينة.
 */
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const A4_W_MM = 210;
const A4_H_MM = 297;
/** الحد الأدنى لنسبة المحتوى المملوء في الصفحة الأخيرة قبل إبقاء الفوتر كامل الارتفاع */
const MIN_LAST_PAGE_FILL = 0.35;
/** هوامش الطباعة المطابقة لـ @page في index.css */
const PAGE_MARGIN_MM = { x: 14, y: 12 };
const FOTER_H_MM = 26; // ارتفاع فوتر التوقيعات أسفل كل صفحة

const CONTENT_W_MM = A4_W_MM - PAGE_MARGIN_MM.x * 2;
const CONTENT_H_MM = A4_H_MM - PAGE_MARGIN_MM.y * 2 - FOTER_H_MM;

/**
 * يرسم خانات توقيع الطرفين أسفل شريحة الصفحة على لوحة canvas.
 * التصميم مطابق للمعاينة: عنوان كل طرف + خطين للاسم والتوقيع،
 * الطرف الأول على اليمين في الاتجاه العربي.
 */
function drawSignatureBlock(
  sliceCanvas: HTMLCanvasElement,
  isArabic: boolean,
): HTMLCanvasElement {
  const blockH = Math.round(sliceCanvas.width * (FOTER_H_MM / 210));
  const sheet = document.createElement("canvas");
  sheet.width = sliceCanvas.width;
  sheet.height = sliceCanvas.height + blockH;
  const ctx = sheet.getContext("2d");
  if (!ctx) return sliceCanvas;

  // نسخ محتوى الشريحة أعلاه
  ctx.drawImage(sliceCanvas, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, sliceCanvas.height, sheet.width, blockH);

  // خط علوي داكن يمتد على عرض منطقة المحتوى فوق منطقة التوقيع
  const marginPx = Math.round(sheet.width * (14 / 210));
  const ruleY = sliceCanvas.height + Math.round(blockH * 0.10);
  ctx.strokeStyle = "rgba(26,26,46,0.55)";
  ctx.lineWidth = Math.max(1, Math.round(sheet.width / 750));
  ctx.beginPath();
  ctx.moveTo(marginPx, ruleY);
  ctx.lineTo(sheet.width - marginPx, ruleY);
  ctx.stroke();

  const colW = (sheet.width - marginPx * 2) / 2;
  const fontSize = Math.max(10, Math.round(sheet.width * (3.2 / 210)));
  const lineGap = Math.round(fontSize * 1.15);
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
  ctx.fillText(firstLabel, rightCx, ruleY + lineGap);
  ctx.fillText(secondLabel, leftCx, ruleY + lineGap);

  ctx.font = `${fontSize}px "Amiri", "Cairo", sans-serif`;
  const nameLine = isArabic ? "الاسم: .............................." : "Name: ..............................";
  const signLine = isArabic ? "التوقيع: .............................." : "Signature: ..............................";
  ctx.fillText(nameLine, rightCx, ruleY + lineGap * 2.1);
  ctx.fillText(nameLine, leftCx, ruleY + lineGap * 2.1);
  ctx.fillText(signLine, rightCx, ruleY + lineGap * 3.2);
  ctx.fillText(signLine, leftCx, ruleY + lineGap * 3.2);

  return sheet;
}

/**
 * يجلب إحداثيات Y السفلية لحدود الأقسام القابلة للانقسام
 * (أقسام البنود وأقسام الأطراف والملخص) نسبيًا إلى أعلى العنصر الملتقط.
 */
function collectBreakPoints(contractEl: HTMLElement, cssPxPerMm: number): number[] {
  const rect = contractEl.getBoundingClientRect();
  const points: number[] = [];
  contractEl.querySelectorAll<HTMLElement>(
    ".contract-clauses > div, .contract-signatures, .contract-footnote",
  ).forEach((sec) => {
    const secRect = sec.getBoundingClientRect();
    points.push((secRect.bottom - rect.top) * cssPxPerMm);
  });
  return points.sort((a, b) => a - b);
}

/**
 * يختار موضع القطع الأقرب لنهاية بند دون تجاوز الحد الأقصى المسموح.
 * يستوعب البنود القصيرة المتتالية: إذا كانت النهاية التالية تقع ضمن هامش
 * صغير إضافي (لا يتجاوز 12% من ارتفاع المحتوى) فتمتد نقطة القطع إليها
 * لتجنب ترك فراغ كبير أعلى الصفحة التالية.
 */
function pickCutPoint(breakPoints: number[], maxCutY: number, minCutY: number, contentHeight: number): number {
  const SHORT_CLAUSE_ALLOW = contentHeight * 0.12;
  // أقرب نهاية بند لا تتجاوز الحد الأقصى
  let best = -1;
  for (const bp of breakPoints) {
    if (bp <= maxCutY) best = bp;
    else break;
  }
  // استيعاب بند قصير واحد تالٍ إن كان يترك فراغًا كبيرًا
  if (best >= 0 && best < maxCutY) {
    for (const bp of breakPoints) {
      if (bp > maxCutY && bp <= maxCutY + SHORT_CLAUSE_ALLOW) best = bp;
      else if (bp > maxCutY) break;
    }
  }
  if (best >= minCutY) return best;
  // إن لم توجد نهاية بند صالحة، اقطع عند الحد الأقصى (البنود الطويلة جدًا)
  return maxCutY;
}

/**
 * html2canvas-pro قد يفشل في رسم صور base64 (data:) بصمت بسبب crossOrigin،
 * لذا نحفظ إحداثياتها ونرسم اللوجو يدويًا فوق الالتقاط بعد الانتهاء.
 */
type ImagePosition = { rect: DOMRect; naturalW: number; naturalH: number; src: string };

function collectImagePositions(root: HTMLElement): ImagePosition[] {
  const positions: ImagePosition[] = [];
  const rootRect = root.getBoundingClientRect();
  root.querySelectorAll<HTMLImageElement>('img[src^="data:"]').forEach((img) => {
    if (!img.complete || !img.naturalWidth) return;
    const rect = img.getBoundingClientRect();
    positions.push({
      rect: new DOMRect(rect.left - rootRect.left, rect.top - rootRect.top, rect.width, rect.height),
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      src: img.src,
    });
  });
  return positions;
}

/**
 * يلتقط عنصر العقد ويولّد ملف PDF متعدد صفحات A4 ثم يبدأ التحميل.
 */
export async function downloadContractPdf(contractEl: HTMLElement): Promise<void> {
  // إخفاء عناصر no-print مؤقتًا (التوقيعات الختامية من المتن)
  // لأن html2canvas-pro لا يطبّق قواعد @media print تلقائيًا
  const hiddenEls: HTMLElement[] = [];
  contractEl.querySelectorAll<HTMLElement>(".no-print").forEach((el) => {
    hiddenEls.push(el);
    el.style.display = "none";
  });

  const imagePositions = collectImagePositions(contractEl);

  try {
    // التقاط واحد للعقد كاملًا (مستمر التدفق كما في الطباعة)
    const canvas = await html2canvas(contractEl, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: contractEl.scrollWidth,
      imageTimeout: 0,
      allowTaint: true,
    });

    // رسم اللوجو (وأي صور data:) يدويًا فوق الالتقاط في مواضعها الأصلية
    if (imagePositions.length) {
      const scale = canvas.width / contractEl.getBoundingClientRect().width;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        for (const p of imagePositions) {
          const img = new Image();
          img.src = p.src;
          await new Promise((res, rej) => {
            img.onload = () => res(undefined);
            img.onerror = () => rej(new Error("logo draw failed"));
          });
          const ratio = Math.min(p.rect.width / p.naturalW, p.rect.height / p.naturalH);
          const drawW = p.naturalW * ratio;
          const drawH = p.naturalH * ratio;
          const x = (p.rect.left + (p.rect.width - drawW) / 2) * scale;
          const y = (p.rect.top + (p.rect.height - drawH) / 2) * scale;
          // مسح المنطقة أولًا (في حال رسم html2canvas إطارًا فارغًا)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.rect.left * scale, p.rect.top * scale, p.rect.width * scale, p.rect.height * scale);
          ctx.drawImage(img, x, y, drawW * scale, drawH * scale);
        }
      }
    }

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const cssPxPerMm = canvas.width / A4_W_MM; // بيكسل لكل ملليمتر في العرض
    const sliceH = Math.round(CONTENT_H_MM * cssPxPerMm);
    const breakPoints = collectBreakPoints(contractEl, cssPxPerMm);

    const lang = contractEl.getAttribute("data-lang") ?? contractEl.lang ?? "ar";
    const isArabic = lang !== "en";

    const pageContentW = CONTENT_W_MM;

    let y0 = 0;
    let first = true;
    while (y0 < canvas.height) {
      const remaining = canvas.height - y0;
      const cutLimit = y0 + sliceH;
      let cutAt: number;
      if (remaining <= sliceH) {
        cutAt = canvas.height;
      } else {
        cutAt = pickCutPoint(breakPoints, cutLimit, y0 + Math.round(sliceH * 0.55), sliceH);
      }
      cutAt = Math.max(cutAt, y0 + Math.round(sliceH * 0.35)); // حد أدنى للتقدم
      cutAt = Math.min(cutAt, y0 + sliceH);

      const sliceHeight = cutAt - y0;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext("2d");
      if (ctx) ctx.drawImage(canvas, 0, y0, canvas.width, sliceHeight, 0, 0, slice.width, sliceHeight);

      // خانات التوقيع تتكرر أسفل كل صفحة من صفحات PDF
      const sheet = drawSignatureBlock(slice, isArabic);

      if (!first) doc.addPage();
      first = false;

      const imgData = sheet.toDataURL("image/jpeg", 0.92);
      const imgH = (sheet.height / canvas.width) * pageContentW;
      doc.addImage(imgData, "JPEG", PAGE_MARGIN_MM.x, PAGE_MARGIN_MM.y, pageContentW, imgH);

      y0 = cutAt;
    }

    doc.save("عقد_عمل.pdf");
  } finally {
    // إعادة العناصر المخفية إلى حالتها الأصلية
    hiddenEls.forEach((el) => el.style.removeProperty("display"));
  }
}
