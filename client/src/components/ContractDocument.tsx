/*
 * DESIGN: "الديوان الرسمي" — صفحة العقد المطبوعة (A4)
 * ترويسة رسمية بخطين مزدوجين + شعار الشركة + نص العقد بخط Amiri
 * + توقيعان أسفل كل صفحة عند الطباعة.
 * اللغات: ar | en | both — في وضع both تنقسم الصفحة نصفين (يمين عربي / يسار إنجليزي) في كل البنود والبيانات والتوقيعات.
 */
import type { ContractData } from "@/lib/contract";
import { arabicNumeral, contractEndDate, dateArabic, dateArabicShort, dateArabicEastern, durationText, formatSalary, isConsultant, isTraining, trainingDurationText } from "@/lib/contract";
import { buildClauses } from "@/lib/clauses";
import { buildEnClausesFor, party2LabelEn } from "@/lib/clauses-en";
import React from "react";

interface Props {
  data: ContractData;
  forPrint?: boolean; // true => تُعرض داخل منطقة @media print
}

/** تحويل **نص** إلى <strong> (نسخة نص آمن فقط بدون spans — النسخة العربية تحافظ على spans التواريخ) */
function renderClauseText(text: string, keepSpans = false): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{renderClauseText(part.slice(2, -2), keepSpans)}</strong>;
    }
    if (keepSpans) {
      const segs = part.split(/(<span[^>]*>[^<]*<\/span>)/g);
      return segs.map((seg, j) =>
        seg.startsWith("<span")
          ? <span key={j} dangerouslySetInnerHTML={{ __html: seg }} />
          : seg,
      );
    }
    return part;
  });
}

/* ---------- ترجمة عناصر UI ---------- */
const contractTitle: Record<ContractData["type"], string> = {
  fixed: "عقد عمل فردي",
  indefinite: "عقد عمل فردي",
  task: "عقد عمل فردي",
  training: "عقد تدريب تجريبي",
  consultant: "عقد تعاقد مع استشاري",
};
const contractTitleEn: Record<ContractData["type"], string> = {
  fixed: "Individual Employment Contract",
  indefinite: "Individual Employment Contract",
  task: "Individual Employment Contract",
  training: "Probationary Training Contract",
  consultant: "Consultancy Services Agreement",
};

function durationTextEn(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" and ") : "one month";
}

function trainingDurationTextEn(months: number): string {
  return `${months} month${months > 1 ? "s" : ""}`;
}

function formatSalaryEn(n: number): string {
  return `${n.toLocaleString("en-US")} Egyptian pounds`;
}

function party2Label(d: ContractData): string {
  return isTraining(d) ? "المتدرب" : isConsultant(d) ? "الاستشاري" : "العامل";
}
function party2LabelBoth(d: ContractData): string {
  return isTraining(d) ? "المتدرب / the Trainee" : isConsultant(d) ? "الاستشاري / the Consultant" : "العامل / the Employee";
}

function endDateInfo(d: ContractData) {
  const isTrain = isTraining(d);
  const endDateObj = isTrain
    ? contractEndDate(d.work.startDate, 0, d.trainingDurationMonths ?? 3)
    : contractEndDate(d.work.startDate, d.durationYears ?? 0, d.durationMonths ?? 0);
  return { endDateObj };
}

function typeLabel(d: ContractData): string {
  const isFixed = d.type === "fixed";
  const isTask = d.type === "task";
  const isTrain = isTraining(d);
  const isCons = isConsultant(d);
  const eo = endDateInfo(d).endDateObj; const endDate = eo ? dateArabicShort(eo.toISOString().slice(0, 10)) : "";
  return isFixed
    ? `محدد المدة — ${durationText(d.durationYears ?? 0, d.durationMonths ?? 0)}${endDate ? ` — ينتهي بنهاية يوم ` : ""}`
    : isTask
      ? "محدد المدة لإنجاز عمل معين"
      : isTrain
        ? `تدريب تجريبي — ${trainingDurationText(d.trainingDurationMonths ?? 3)}${endDate ? ` — ينتهي بنهاية يوم ` : ""}`
        : isCons
          ? (endDate ? `خدمات استشارية محدد المدة — ${durationText(d.durationYears ?? 0, d.durationMonths ?? 0)} — ينتهي بنهاية يوم ` : "خدمات استشارية غير محدد المدة")
          : "غير محدد المدة";
}
function typeLabelEn(d: ContractData): string {
  const isFixed = d.type === "fixed";
  const isTask = d.type === "task";
  const isTrain = isTraining(d);
  const isCons = isConsultant(d);
  const eo = endDateInfo(d).endDateObj; const endDate = eo ? fmtShort(eo.toISOString().slice(0, 10)) : "";
  return isFixed
    ? `Fixed-term — ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)}${endDate ? ` — expires at the end of ` : ""}`
    : isTask
      ? "Fixed-term for the accomplishment of a specific task"
      : isTrain
        ? `Probationary training — ${trainingDurationTextEn(d.trainingDurationMonths ?? 3)}${endDate ? ` — expires at the end of ` : ""}`
        : isCons
          ? (endDate ? `Fixed-term consultancy services — ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)} — expires at the end of ` : "Indefinite-term consultancy services")
          : "Indefinite-term";
}

function fmtShort(iso: string): string {
  const dd = new Date(iso);
  return `${dd.getDate()}/${dd.getMonth() + 1}/${dd.getFullYear()}`;
}

function LogoBlock({ data }: { data: ContractData }) {
  if (!data.logo) return <div className="w-24 h-24 flex items-center justify-center border border-border rounded bg-muted/50 text-xs text-muted-foreground">بدون شعار</div>;
  return (
    <div className="w-24 h-24 flex items-center justify-center border border-border rounded bg-white">
      <img src={data.logo} alt="شعار الشركة" className="max-w-full max-h-full object-contain" />
    </div>
  );
}

/* ==================================================================
   المكوّن العربي
   ================================================================== */
function ArabicSide({ data }: { data: ContractData }) {
  const clauses = buildClauses(data);
  const eo = endDateInfo(data).endDateObj; const endDate = eo ? dateArabicShort(eo.toISOString().slice(0, 10)) : "";
  const party2Label_ = party2Label(data);

  return (
    <div dir="rtl">
      {/* الترويسة */}
      <div className="border-b-[3px] border-double border-[#1a1a2e] pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <p className="font-display text-xl font-bold text-[#1a1a2e]">بِسْمِ اللهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <h1 className="font-display text-2xl font-bold mt-1.5">{contractTitle[data.type]}</h1>
            <p className="text-xs mt-1 text-muted-foreground">
              {isTraining(data)
                ? "وفقًا لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥ وقانون التأمينات الاجتماعية رقم (١٤٨) لسنة ٢٠١٩"
                : isConsultant(data)
                  ? "تعاقد مدني على تقديم خدمات مهنية مستقلة — لا يُعد علاقة عمل بموجب قانون العمل"
                  : "مطابق لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥"}
              {data.contractNumber && ` — رقم العقد: ${arabicNumeral(data.contractNumber)}`}
            </p>
          </div>
          <LogoBlock data={data} />
        </div>
        <div className="mt-3 h-[2px]" style={{ background: "linear-gradient(to left, #b3892f 0 55%, transparent 55% 60%, #8B2635 60% 100%)" }} />
      </div>

      {/* البند الأول: أطراف العقد */}
      <div className="grid grid-cols-2 gap-4 mb-6 border border-[#1a1a2e]/60 rounded p-3">
        <div>
          <p className="font-bold text-sm border-b border-[#b3892f] pb-1 mb-2">الطرف الأول: صاحب العمل</p>
          <p className="text-sm leading-relaxed">{data.employer.name || ".........."}{data.employer.commercialRegister ? ` — سجل/ضريبي: ${data.employer.commercialRegister}` : ""}</p>
          <p className="text-sm">{data.employer.address || ""}</p>
          <p className="text-sm" dir="ltr" style={{ textAlign: "right" }}>{data.employer.phone || ""}</p>
        </div>
        <div>
          <p className="font-bold text-sm border-b border-[#b3892f] pb-1 mb-2">الطرف الثاني: {party2Label_}</p>
          <p className="text-sm leading-relaxed">{data.employee.name || ".........."} — {data.employee.gender === "female" ? "أنثى" : "ذكر"}</p>
          <p className="text-sm" dir="ltr" style={{ textAlign: "right" }}>رقم قومي: {data.employee.nationalId || ".........."}</p>
          <p className="text-sm">{data.employee.jobTitle || ".........."} — {data.employee.address || ""}</p>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="mb-5 text-sm">
        <p>
          <strong>نوع العقد: </strong>
          {typeLabel(data)}
          {endDate && <span dir="ltr" style={{ display: "inline-block", unicodeBidi: "embed", textAlign: "right" }}>{endDate}</span>}
        </p>
        <p>
          <strong>تاريخ بدء العمل: </strong>
          {data.work.startDate
            ? <span dir="ltr" style={{ display: "inline-block", unicodeBidi: "embed", textAlign: "right" }}>{dateArabicShort(data.work.startDate)}</span>
            : ".........."}
        </p>
        <p><strong>{isConsultant(data) ? "الخدمة الاستشارية" : isTraining(data) ? "التخصص التدريبي" : "الوظيفة"}: </strong>{data.employee.jobTitle || ".........."}{data.employee.department ? ` — قسم ${data.employee.department}` : ""}</p>
        <p><strong>{isConsultant(data) ? "الأتعاب الشهرية" : "الأجر الشهري"}: </strong>{data.salary.basicSalary ? formatSalary(data.salary.basicSalary) : ".........."}</p>
      </div>

      {/* البنود التفصيلية */}
      <div className="contract-clauses space-y-3">
        {clauses.map((c) => (
          <div key={c.number}>
            <h2 className="font-bold text-base mb-0.5">
              البند ({arabicNumeral(c.number)}): {c.title}
              {c.articleRef ? <span className="text-xs text-[#8B2635] font-normal mr-2">— {c.articleRef}</span> : null}
            </h2>
            <p className="text-[13pt] leading-[2.1] whitespace-pre-line">{renderClauseText(c.text, true)}</p>
          </div>
        ))}
      </div>

      <p className="contract-footnote text-[10pt] text-muted-foreground mt-8 pt-3 border-t border-dashed border-border">
        حُرر هذا العقد في تاريخ {dateArabic(data.contractDate)} ميلاديًا، وطُبع من هذا النموذج نسخة للطرف الأول ونسخة للطرف الثاني ونسخة بمكتب التأمينات الاجتماعية المختص ونسخة بالجهة الإدارية المختصة.
      </p>

      {/* التوقيعات: تُعرض في المعاينة الإلكترونية فقط؛
          عند الطباعة/تصدير PDF يُطبع بلوك التوقيعات كفوتر ثابت أسفل كل صفحة عبر pdf.ts */}
      <div className="contract-signatures mt-10 flex items-start justify-between gap-8 page-break-avoid no-print">
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">الطرف الأول — صاحب العمل</p>
          <p className="text-sm">الاسم: ..............................</p>
          <p className="text-sm">التوقيع: ..............................</p>
        </div>
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">الطرف الثاني — {party2Label_}</p>
          <p className="text-sm">الاسم: ..............................</p>
          <p className="text-sm">التوقيع: ..............................</p>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   المكوّن الإنجليزي
   ================================================================== */
function EnglishSide({ data }: { data: ContractData }) {
  const clauses = buildEnClausesFor(data);
  const eo = endDateInfo(data).endDateObj; const endDate = eo ? fmtShort(eo.toISOString().slice(0, 10)) : "";
  const p2 = party2LabelEn(data);

  return (
    <div dir="ltr" lang="en">
      {/* الترويسة */}
      <div className="border-b-[3px] border-double border-[#1a1a2e] pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <p className="font-display text-sm font-semibold text-[#1a1a2e]">In the name of God, the Most Gracious, the Most Merciful</p>
            <h1 className="font-display text-xl font-bold mt-1">{contractTitleEn[data.type]}</h1>
            <p className="text-xs mt-1 text-muted-foreground">
              {isTraining(data)
                ? "Under the Egyptian Labour Law No. (14) of 2025 and the Social Insurance Law No. (148) of 2019"
                : isConsultant(data)
                  ? "A civil contract for the provision of independent professional services — not an employment relationship under the Labour Law"
                  : "In accordance with the Egyptian Labour Law No. (14) of 2025"}
              {data.contractNumber && ` — Contract No. ${data.contractNumber}`}
            </p>
          </div>
          <LogoBlock data={data} />
        </div>
        <div className="mt-3 h-[2px]" style={{ background: "linear-gradient(to right, #b3892f 0 55%, transparent 55% 60%, #8B2635 60% 100%)" }} />
      </div>

      {/* الأطراف */}
      <div className="grid grid-cols-2 gap-4 mb-6 border border-[#1a1a2e]/60 rounded p-3">
        <div>
          <p className="font-bold text-sm border-b border-[#b3892f] pb-1 mb-2">The First Party: the Employer</p>
          <p className="text-sm leading-relaxed">{data.employer.name || ".........."}{data.employer.commercialRegister ? ` — CR/Tax ID: ${data.employer.commercialRegister}` : ""}</p>
          <p className="text-sm">{data.employer.address || ""}</p>
          <p className="text-sm">{data.employer.phone || ""}</p>
        </div>
        <div>
          <p className="font-bold text-sm border-b border-[#b3892f] pb-1 mb-2">The Second Party: {p2}</p>
          <p className="text-sm leading-relaxed">{data.employee.name || ".........."} — {data.employee.gender === "female" ? "Female" : "Male"}</p>
          <p className="text-sm">National ID: {data.employee.nationalId || ".........."}</p>
          <p className="text-sm">{data.employee.jobTitle || ".........."} — {data.employee.address || ""}</p>
        </div>
      </div>

      {/* ملخص */}
      <div className="mb-5 text-sm">
        <p>
          <strong>Contract type: </strong>
          {typeLabelEn(data)}
          {endDate && <span style={{ display: "inline-block" }}>{endDate}</span>}
        </p>
        <p>
          <strong>Start of work: </strong>
          {data.work.startDate ? <span style={{ display: "inline-block" }}>{fmtShort(data.work.startDate)}</span> : ".........."}
        </p>
        <p><strong>{isConsultant(data) ? "Consultancy service" : isTraining(data) ? "Training specialisation" : "Position"}: </strong>{data.employee.jobTitle || ".........."}{data.employee.department ? ` — ${data.employee.department}` : ""}</p>
        <p><strong>{isConsultant(data) ? "Monthly fees" : "Monthly wage"}: </strong>{data.salary.basicSalary ? formatSalaryEn(data.salary.basicSalary) : ".........."}</p>
      </div>

      {/* البنود */}
      <div className="space-y-3">
        {clauses.map((c) => (
          <div key={c.number}>
            <h2 className="font-bold text-sm mb-0.5">
              Clause ({c.number}): {c.title}
              {c.articleRef ? <span className="text-xs text-[#8B2635] font-normal ml-2">— {c.articleRef}</span> : null}
            </h2>
            <p className="text-[11pt] leading-[1.9] whitespace-pre-line">{renderClauseText(c.text)}</p>
          </div>
        ))}
      </div>

      <p className="text-[9pt] text-muted-foreground mt-8 pt-3 border-t border-dashed border-border">
        This contract was drawn up on {data.contractDate ? fmtShort(data.contractDate) : "......."} (Gregorian). Copies were printed for the First Party, the Second Party, the competent Social Insurance office, and the competent administrative authority.
      </p>

      {/* التوقيعات: للمعاينة الإلكترونية فقط؛ عند الطباعة/PDF يُطبع الفوتر الثابت */}
      <div className="mt-10 flex items-start justify-between gap-8 page-break-avoid no-print">
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">The First Party — the Employer</p>
          <p className="text-sm">Name: ..............................</p>
          <p className="text-sm">Signature: ..............................</p>
        </div>
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">The Second Party — {p2}</p>
          <p className="text-sm">Name: ..............................</p>
          <p className="text-sm">Signature: ..............................</p>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   المكوّن الرئيسي
   ================================================================== */
function ContractBody({ data }: { data: ContractData }) {
  const lang = data.language ?? "ar";
  if (lang === "en") {
    return (
      <div className="contract-page" data-lang="en" lang="en">
        <EnglishSide data={data} />
      </div>
    );
  }
  if (lang === "both") {
    return (
      <div className="contract-page contract-page-both" data-lang="both">
        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="border-l border-border pl-3">{<ArabicSide data={data} />}</div>
          <div className="border-r border-border pr-3">{<EnglishSide data={data} />}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="contract-page" data-lang="ar">
      <ArabicSide data={data} />
    </div>
  );
}

export default function ContractDocument({ data, forPrint = false }: Props) {
  if (forPrint) {
    return <ContractBody data={data} />;
  }
  return (
    <div className="w-full overflow-x-auto">
      <div className="w-[210mm] mx-auto shadow-2xl">
        <ContractBody data={data} />
      </div>
    </div>
  );
}
