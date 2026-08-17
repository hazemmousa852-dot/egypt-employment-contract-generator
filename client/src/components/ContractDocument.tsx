/*
 * DESIGN: "الديوان الرسمي" — صفحة العقد المطبوعة (A4)
 * ترويسة رسمية بخطين مزدوجين + شعار الشركة + نص العقد بخط Amiri
 * + توقيعان ودمغة ختم. نسخة للطباعة (print-only) ونسخة للمعاينة على الشاشة.
 */
import type { ContractData } from "@/lib/contract";
import { arabicNumeral, contractEndDate, dateArabic, dateArabicShort, durationText, formatSalary, totalMonths } from "@/lib/contract";
import { buildClauses } from "@/lib/clauses";
import React from "react";
import StampLogo from "@/components/StampLogo";

interface Props {
  data: ContractData;
  forPrint?: boolean; // true => تُعرض داخل منطقة @media print
}

/** تحويل **نص** داخل البند إلى <strong> لعرض نوع العقد وفترة العقد بخط واضح، وتفسير HTML التواريخ (span LTR) */
function renderClauseText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{renderClauseText(part.slice(2, -2))}</strong>;
    }
    // تفسير وسم <span dir="ltr"> التاريخ فقط (نص آمن مصدره كودنا)
    const segs = part.split(/(<span[^>]*>[^<]*<\/span>)/g);
    return segs.map((seg, j) =>
      seg.startsWith("<span")
        ? <span key={j} dangerouslySetInnerHTML={{ __html: seg }} />
        : seg,
    );
  });
}

function LogoBlock({ data }: { data: ContractData }) {
  if (!data.logo) return <div className="w-24 h-24 flex items-center justify-center border border-border rounded bg-muted/50 text-xs text-muted-foreground">بدون شعار</div>;
  return (
    <div className="w-24 h-24 flex items-center justify-center border border-border rounded bg-white">
      <img src={data.logo} alt="شعار الشركة" className="max-w-full max-h-full object-contain" />
    </div>
  );
}

function ContractBody({ data }: { data: ContractData }) {
  const clauses = buildClauses(data);
  const isFixed = data.type === "fixed";
  const isTask = data.type === "task";
  const endDateObj = contractEndDate(data.work.startDate, data.durationYears ?? 0, data.durationMonths ?? 0);
  const endDate = endDateObj ? dateArabicShort(endDateObj.toISOString().slice(0, 10)) : "";

  return (
    <div className="contract-page">
      {/* الترويسة */}
      <div className="border-b-[3px] border-double border-[#1a1a2e] pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <p className="text-sm font-bold tracking-wide">بسم الله الرحمن الرحيم</p>
            <h1 className="font-display text-2xl font-bold mt-1">عقد عمل فردي</h1>
            <p className="text-xs mt-1 text-muted-foreground">
              مطابق لأحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥
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
          <p className="font-bold text-sm border-b border-[#b3892f] pb-1 mb-2">الطرف الثاني: العامل</p>
          <p className="text-sm leading-relaxed">{data.employee.name || ".........."} — {data.employee.gender === "female" ? "أنثى" : "ذكر"}</p>
          <p className="text-sm" dir="ltr" style={{ textAlign: "right" }}>رقم قومي: {data.employee.nationalId || ".........."}</p>
          <p className="text-sm">{data.employee.jobTitle || ".........."} — {data.employee.address || ""}</p>
        </div>
      </div>

      {/* ملخص سريع */}
      <div className="mb-5 text-sm">
        <p>
          <strong>نوع العقد: </strong>
          {isFixed
            ? `محدد المدة — ${durationText(data.durationYears ?? 0, data.durationMonths ?? 0)}${endDate ? ` — ينتهي بنهاية يوم ` : ""}`
            : isTask
              ? "محدد المدة لإنجاز عمل معين"
              : "غير محدد المدة"}
          {endDate && <span dir="ltr" style={{ display: "inline-block", unicodeBidi: "embed", textAlign: "right" }}>{endDate}</span>}
        </p>
        <p>
          <strong>تاريخ بدء العمل: </strong>
          {data.work.startDate
            ? <span dir="ltr" style={{ display: "inline-block", unicodeBidi: "embed", textAlign: "right" }}>{dateArabicShort(data.work.startDate)}</span>
            : ".........."}
        </p>
        <p><strong>الوظيفة: </strong>{data.employee.jobTitle || ".........."}{data.employee.department ? ` — قسم ${data.employee.department}` : ""}</p>
        <p><strong>الأجر الشهري: </strong>{data.salary.basicSalary ? formatSalary(data.salary.basicSalary) : ".........."}</p>
      </div>

      {/* البنود التفصيلية */}
      <div className="contract-clauses space-y-3">
        {clauses.map((c) => (
          <div key={c.number}>
            <h2 className="font-bold text-base mb-0.5">
              البند ({arabicNumeral(c.number)}): {c.title}
              {c.articleRef ? <span className="text-xs text-[#8B2635] font-normal mr-2">— {c.articleRef}</span> : null}
            </h2>
            <p className="text-[13pt] leading-[2.1] whitespace-pre-line">{renderClauseText(c.text)}</p>
          </div>
        ))}
      </div>

      <p className="contract-footnote text-[10pt] text-muted-foreground mt-8 pt-3 border-t border-dashed border-border">
        حُرر هذا العقد في تاريخ {dateArabic(data.contractDate)} ميلاديًا، وطُبع من هذا النموذج نسخة للطرف الأول ونسخة للطرف الثاني ونسخة بمكتب التأمينات الاجتماعية المختص ونسخة بالجهة الإدارية المختصة.
      </p>

      {/* التوقيعات — تتكرر أسفل كل صفحة عند الطباعة */}
      <div className="contract-signatures mt-10 flex items-start justify-between gap-8 page-break-avoid">
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">الطرف الأول — صاحب العمل</p>
          <p className="text-sm">الاسم: ..............................</p>
          <p className="text-sm">التوقيع: ..............................</p>
        </div>
        <div className="flex-1 text-center border-t border-[#1a1a2e]/40 pt-3">
          <p className="font-bold text-sm mb-6">الطرف الثاني — العامل</p>
          <p className="text-sm">الاسم: ..............................</p>
          <p className="text-sm">التوقيع: ..............................</p>
        </div>
      </div>
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
