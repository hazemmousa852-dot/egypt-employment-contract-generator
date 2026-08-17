/*
 * DESIGN: "الديوان الرسمي" — ملف محرك العقد (logic only, no styling)
 * بيانات العقد ومولد النصوص القانونية المطابقة لقانون العمل المصري 14 لسنة 2025.
 */

export type ContractType = "fixed" | "indefinite" | "task";

export interface PartyData {
  name: string;
  role: string; // صاحب العمل
  nationalId?: string;
  phone?: string;
  address?: string;
  email?: string;
  commercialRegister?: string; // السجل التجاري / الرقم الضريبي
}

export interface EmployeeData {
  name: string;
  gender: "male" | "female";
  nationalId: string;
  jobTitle: string; // المسمى الوظيفي
  department?: string; // القسم / الإدارة
  qualification?: string; // المؤهل
  phone?: string;
  address?: string;
}

export interface SalaryData {
  basicSalary: number; // الأجر الأساسي الشهري (رقمي)
  allowances?: string; // مزايا وبدلات إضافية نصية
  paymentMethod: "cash" | "bank"; // نقدي / تحويل بنكي
  paymentDay?: string; // موعد الأداء (افتراضي: من كل شهر)
}

export interface WorkData {
  startDate: string; // تاريخ بداية العقد
  trialPeriod: boolean; // فترة اختبار
  workLocation: string; // مكان العمل
  workNature: string; // طبيعة العمل
  dailyHours?: string; // ساعات العمل اليومية
  weeklyRestDay?: string; // يوم الراحة الأسبوعية
  nonCompete?: boolean; // شرط عدم منافسة (بالاتفاق)
}

export interface ContractData {
  contractNumber: string; // رقم العقد
  contractDate: string; // تاريخ تحرير العقد
  type: ContractType;
  durationYears?: number; // عدد سنوات العقد محدد المدة
  durationMonths?: number; // عدد أشهر إضافية
  taskDescription?: string; // وصف العمل المطلوب إنجازه (لعقود إنجاز عمل معين)
  employer: PartyData;
  employee: EmployeeData;
  salary: SalaryData;
  work: WorkData;
  logo?: string; // لوجو الشركة (dataURL)
}

export function arabicNumeral(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function formatMoney(n: number): string {
  // أرقام لاتينية بفواصل «50,000» لضمان قراءة صحيحة في العرض والطباعة وPDF وWord
  // (الأرقام العربية-الهندية مع فاصلة عربية «٥٠٬٠٠٠» كانت تنعكس أو تُفقَد في html2canvas والطباعة)
  return new Intl.NumberFormat("en-US").format(n);
}

/** تحويل رقم إلى صيغة نصية عربية مبسطة للجنيهات */
function ones(n: number): string {
  const words = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  return words[n] || "";
}
function tens(n: number): string {
  const words = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  return words[n] || "";
}
const teens = ["عشرة", "أحد عشر", "اثنان عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const hundreds = ["", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function twoDigits(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ones(n);
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${ones(o)} و${tens(t)}` : tens(t);
  }
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return rem ? `${hundreds[h]} و${twoDigits(rem)}` : hundreds[h];
}

export function numberToArabicWords(n: number): string {
  if (n === 0) return "صفر";
  let num = Math.round(n);
  let parts: string[] = [];

  if (num >= 1000000) {
    const m = Math.floor(num / 1000000);
    num %= 1000000;
    parts.push(m === 1 ? "مليون" : m === 2 ? "مليونان" : `${twoDigits(m)} ملايين`);
  }
  if (num >= 1000) {
    const th = Math.floor(num / 1000);
    num %= 1000;
    parts.push(th === 1 ? "ألف" : th === 2 ? "ألفان" : th < 11 ? `${twoDigits(th)} آلاف` : `${twoDigits(th)} ألف`);
  }
  if (num > 0) parts.push(twoDigits(num));
  return parts.join(" و");
}

export function formatSalary(n: number): string {
  return `${formatMoney(n)} (${numberToArabicWords(n)} جنيه) فقط لا غير`;
}

export function addMonthsToHijriDate(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${days[d.getDay()]} الموافق ${arabicNumeral(d.getDate())} ${monthsAr[d.getMonth()]} ${arabicNumeral(d.getFullYear())}م`;
}

/** مدة العقد كنص عربي */
export function durationText(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) {
    if (years === 1) parts.push("سنة");
    else if (years === 2) parts.push("سنتين");
    else if (years <= 10) parts.push(`${arabicNumeral(years)} سنوات`);
    else parts.push(`${arabicNumeral(years)} سنة`);
  }
  if (months > 0) {
    if (months === 1) parts.push("شهر");
    else if (months === 2) parts.push("شهرين");
    else parts.push(`${arabicNumeral(months)} أشهر`);
  }
  return parts.join(" و");
}

/** رقم تاريخ هجري تقريبي غير مطلوب — نستخدم التاريخ الميلادي بالعربية */
export function dateArabic(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${days[d.getDay()]} الموافق ${arabicNumeral(d.getDate())} من شهر ${monthsAr[d.getMonth()]} لسنة ${arabicNumeral(d.getFullYear())}م`;
}

export function dateArabicShort(dateStr: string): string {
  // التاريخ بأرقام لاتينية «16/8/2027م» لقرارة يوم/شهر/سنة دون انعكاس في النصوص RTL
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}م`;
}

/** صيغة HTML للتاريخ يوم/شهر/سنة تُلف في span LTR منعًا لانعكاس الترتيب داخل نص RTL */
export function dateArabicShortHtml(dateStr: string): string {
  if (!dateStr) return "";
  const inner = dateArabicShort(dateStr);
  return `<span dir="ltr" style="display:inline-block;unicode-bidi:embed">${inner}</span>`;
}

/** حساب تاريخ نهاية العقد المحدد المدة: آخر يوم قبل إتمام المدة (المدة تنتهي قبل بداية إتمامها بيوم) */
export function contractEndDate(startDate: string, years: number, months: number): Date | null {
  if (!startDate) return null;
  const totalM = years * 12 + months;
  if (totalM <= 0) return null;
  const s = new Date(startDate);
  s.setMonth(s.getMonth() + totalM);
  s.setDate(s.getDate() - 1);
  return s;
}

export function totalMonths(years: number, months: number): number {
  return years * 12 + months;
}

/** التاريخ بالأرقام العربية الشرقية «٧/٠٨/٢٠٢٦م» لملف Word */
export function dateArabicEastern(dateStr: string): string {
  if (!dateStr) return "..........";
  const d = new Date(dateStr);
  return arabicNumeral(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}م`);
}

/** تحويل HTML التاريخ (span LTR) إلى نص عربي شرقي نظيف لملف Word */
export function htmlToEasternDateText(html: string): string {
  const m = html.match(/>(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
  if (!m) return html;
  return arabicNumeral(`${m[1]}/${m[2]}/${m[3]}م`);
}
