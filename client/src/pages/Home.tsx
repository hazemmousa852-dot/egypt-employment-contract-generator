/*
 * DESIGN: "الديوان الرسمي" (Official Chancery)
 * الصفحة الرئيسية: ترويسة بطل غير متمركزة (يمين نص + يسار صورة توضيحية)،
 * خطوات إدخال على بطاقات بإطار مزدوج ذهبي/أحمر، معاينة A4، زر طباعة بارز.
 * ألوان: عاجي ورقي، حبر كحلي، أحمر ختم، ذهبي عتيق. خطوط: Amiri + Cairo.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ClauseOverrides } from "@/components/ContractDocument";
import { Checkbox } from "@/components/ui/checkbox";
import { MemoryStick } from "lucide-react";

const COMPANY_STORAGE_KEY = "eccg-company-v1";
import StampLogo from "@/components/StampLogo";
import ContractForm from "@/components/ContractForm";
import ContractDocument from "@/components/ContractDocument";
import FaqSection from "@/components/FaqSection";
import type { ContractData, ContractType } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, FileSignature, Scale, PrinterCheck, Download, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadContractPdf } from "@/lib/pdf";
import { downloadContractDocx } from "@/lib/docx-generator";

const defaultData: ContractData = {
  contractNumber: "",
  contractDate: new Date().toISOString().slice(0, 10),
  type: "fixed" as ContractType,
  language: "ar",
  durationYears: 1,
  durationMonths: 0,
  taskDescription: "",
  trainingDurationMonths: 3,
  consultantScope: "",
  consultantRegime: "",
  employer: { name: "", role: "صاحب العمل", nationalId: "", phone: "", address: "", email: "", commercialRegister: "" },
  employee: { name: "", gender: "male", nationalId: "", jobTitle: "", department: "", qualification: "", phone: "", address: "" },
  salary: { basicSalary: 0, allowances: "", paymentMethod: "cash" },
  work: { startDate: "", trialPeriod: false, workLocation: "", workNature: "عمل دائم", dailyHours: "٨", weeklyRestDay: "يوم الجمعة", nonCompete: false },
};

export default function Home() {
  // تهيئة البيانات من التخزين المحلي إذا وُجدت بيانات شركة محفوظة مع موافقة المستخدم
  const [initialData] = useState<ContractData>(() => {
    try {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ContractData;
        // نتحقق من سلامة الحقول المحفوظة (بيانات صاحب العمل + مكان/طبيعة العمل فقط)
        if (parsed.employer?.name || parsed.employer?.commercialRegister) {
          return { ...defaultData, employer: { ...defaultData.employer, ...parsed.employer }, work: { ...defaultData.work, ...parsed.work } };
        }
      }
    } catch {
      /* بيانات محفوظة تالفة — نتجاهلها */
    }
    return defaultData;
  });

  const [data, setData] = useState<ContractData>(initialData);
  const [saveCompany, setSaveCompany] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${COMPANY_STORAGE_KEY}:optin`) === "1";
    } catch {
      return false;
    }
  });
  const [showContract, setShowContract] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  /* ===== تحرير نصوص البنود يدويًا ===== */
  const [overrides, setOverrides] = useState<ClauseOverrides>({});
  const [editTarget, setEditTarget] = useState<{ number: number; kind: "ar" | "en"; current: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const handleEditClause = (number: number, kind: "ar" | "en", current: string) => {
    setEditTarget({ number, kind, current });
    setEditDraft(current);
  };
  const handleSaveEdit = () => {
    if (!editTarget) return;
    setOverrides((prev) => ({ ...prev, [editTarget.number]: { ...prev[editTarget.number], [editTarget.kind]: editDraft.trim() || undefined } }));
    setEditTarget(null);
    toast.success("تم حفظ تعديل البند — سيظهر في المعاينة والطباعة وملفي PDF وWord");
  };
  const anyOverride = Object.keys(overrides).length > 0;

  // الحفظ التلقائي الاختياري: يُحفظ عند أي تعديل فقط إذا فعّل المستخدم الخيار
  useEffect(() => {
    try {
      if (saveCompany) {
        const toSave: ContractData = {
          contractNumber: "",
          contractDate: "",
          type: "fixed",
          language: "ar",
          taskDescription: "",
          salary: { basicSalary: 0, paymentMethod: "cash" },
          work: { startDate: "", trialPeriod: false, workLocation: data.work.workLocation, workNature: data.work.workNature, dailyHours: data.work.dailyHours, weeklyRestDay: data.work.weeklyRestDay, nonCompete: false },
          employer: data.employer,
          employee: { name: "", gender: "male", nationalId: "", jobTitle: "", department: "", qualification: "", phone: "", address: "" },
        };
        localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(toSave));
        localStorage.setItem(`${COMPANY_STORAGE_KEY}:optin`, "1");
      } else {
        localStorage.setItem(`${COMPANY_STORAGE_KEY}:optin`, "0");
      }
    } catch {
      /* تخزين غير متاح */
    }
  }, [saveCompany, data.employer, data.work.workLocation, data.work.workNature, data.work.dailyHours, data.work.weeklyRestDay]);

  const handleGenerate = () => {
    setShowContract(true);
    setShowPrint(false);
    setTimeout(() => {
      document.getElementById("contract-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDownloadPdf = async () => {
    const el = document.querySelector<HTMLElement>("#contract-preview .contract-page") ||
      document.querySelector<HTMLElement>(".contract-page");
    if (!el) { toast.error("اضغط أولًا على زر «حرّر العقد» لتوليد المسودة"); return; }
    try {
      toast.info("جارٍ إعداد ملف PDF...");
      await downloadContractPdf(el);
      toast.success("تم تحميل ملف PDF");
    } catch {
      toast.error("تعذر إنشاء ملف PDF — جرّب خيار الطباعة بدلًا من ذلك");
    }
  };

  const handleDownloadDocx = async () => {
    if (!data.employee.name && !data.employer.name) { toast.error("اضغط أولًا على زر «حرّر العقد» لتوليد المسودة — تأكد من إدخال اسم صاحب العمل والعامل"); return; }
    try {
      toast.info("جارٍ إعداد ملف Word...");
      await downloadContractDocx(data, overrides);
      toast.success("تم تحميل ملف Word");
    } catch {
      toast.error("تعذر إنشاء ملف Word — جرّب خيار تحميل PDF بدلًا من ذلك");
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrint(false), 800);
    }, 300);
  };

  const handleReset = () => {
    setData(defaultData);
    setSaveCompany(false);
    setShowContract(false);
    setShowPrint(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success("تم إعادة تعيين النموذج");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== الترويسة الرسمية ===== */}
      <header className="no-print border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <StampLogo size={44} />
            <div>
              <h1 className="font-display text-xl font-bold leading-tight">منشئ عقود العمل</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">مطابق لقانون العمل المصري رقم ١٤ لسنة ٢٠٢٥</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showContract && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 font-semibold">
                <Printer size={15} /> طباعة العقد
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
              <a href="#faq">الأسئلة الشائعة</a>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2 text-muted-foreground">
              <RotateCcw size={15} /> إعادة البدء
            </Button>
          </div>
        </div>
        <div className="chancery-rule" />
      </header>

      <main className="flex-1">
        {/* ===== البطل ===== */}
        <section className="no-print relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.35]" style={{
            backgroundImage: "radial-gradient(circle at 85% 30%, oklch(0.9 0.03 85 / 0.6) 0%, transparent 50%), radial-gradient(circle at 10% 80%, oklch(0.65 0.09 75 / 0.12) 0%, transparent 45%)",
          }} />
          <div className="container relative py-12 md:py-16">
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-[3px] border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold text-[oklch(0.5_0.08_75)] mb-5">
                  <Scale size={13} /> أداة عامة مجانية — تُتاح لأي صاحب عمل أو عامل في مصر
                </div>
                <h2 className="font-display text-3xl md:text-[2.7rem] leading-[1.3] font-bold mb-5">
                  حرّر عقد عملٍ موثّقًا
                  <span className="text-[var(--seal)]"> بحسب قانون العمل المصري الجديد</span>
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-6">
                  تُبنى بنود العقد الفردي نصًا على أحكام قانون العمل الصادر بالقانون رقم (١٤) لسنة ٢٠٢٥ — من مسمّى الوظيفة ومدة العقد المحدد المدة وتاريخ نهايته المحسوب آليًا، إلى الأجر والعلاوة الدورية والإجازات ومهلة الإشعار الكتابي. حرّر بيانات الطرفين، ووثّق الشعار، واطبع العقد كاملًا في دقائق.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-foreground/80"><FileSignature size={15} className="text-[var(--seal)]" /> كل بندٍ مرقم بالمادة القانونية الموجبة</span>
                  <span className="flex items-center gap-1.5 text-foreground/80"><PrinterCheck size={15} className="text-[var(--seal)]" /> نسخة A4 رسمية بنسخها الأربع</span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                  <StampLogo size={20} />
                  <span>وثّق اتفاقك كما توثّقه دواوين القانون — بنودًا مرقمة وتاريخ نهاية محسوبًا وختمًا رسميًا.</span>
                </div>
              </div>
              {/* معاينة لحظة المستند: ورقة عقد واقعية مع ختم أحمر بارز */}
              <div className="hidden md:block relative">
                <div className="card-chancery rounded-[3px] p-6 transform rotate-1 bg-white relative" style={{ minHeight: "340px" }}>
                  <div className="chancery-rule" />
                  <div className="font-display text-center text-lg font-bold mt-3">عقد عمل فردي</div>
                  <p className="text-[0.6rem] text-center text-muted-foreground mt-0.5">مطابق لقانون العمل رقم (١٤) لسنة ٢٠٢٥</p>
                  <div className="space-y-2 mt-4 px-1">
                    {[
                      { w: "96%", bold: true, t: "بين كلٍّ من السيد: .............................. وشركة: .............................." },
                      { w: "88%", t: "اتفقا وهما بكامل أهليتهما المعتبرة شرعًا وقانونًا على ما يلي:" },
                      { w: "82%", t: "البند (١): يعمل الطرف الثاني بوظيفة ...................." },
                      { w: "90%", t: "البند (٢): مدة العقد ............ وينتهي بنهاية يوم ............" },
                      { w: "84%", t: "البند (٣): الأجر الشهري ............ (....................) فقط لا غير" },
                      { w: "70%", t: "حرّر من هذا العقد أربع نسخ معتمدة للطرفين..." },
                    ].map((l, i) => (
                      <div key={i} className={`text-[0.58rem] leading-relaxed text-[#1a1a2e]/70 ${l.bold ? "font-bold text-[#1a1a2e]/85" : ""}`} style={{ width: l.w }}>
                        {l.t}
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-5 left-6 opacity-80 rotate-[-10deg]" aria-hidden="true">
                    <StampLogo size={72} />
                  </div>
                </div>
                <div className="absolute -top-3 -left-3 card-chancery rounded-[3px] px-3 py-1.5 text-xs font-semibold bg-[var(--seal)] text-primary-foreground rotate-[-3deg]">
                  القانون رقم ١٤ / ٢٠٢٥
                </div>
                <div className="absolute -bottom-3 right-6 card-chancery rounded-[3px] px-3 py-1 text-[0.68rem] font-semibold text-[var(--seal)] rotate-[2deg]">
                  تاريخ النهاية يُحسب تلقائيًا
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== شريط الحصرية (لا يظهر في الطباعة) ===== */}
        <div className="no-print relative">
          <div className="chancery-rule" />
          <div className="container flex items-center justify-center gap-3 bg-[oklch(0.45_0.19_25)] py-3 text-[15px] font-semibold text-white">
            <StampLogo size={24} />
            <span>أداة حصرية للمتدربين مع الأستاذ حازم موسى في شئون العاملين والمرتبات</span>
          </div>
          <div className="chancery-rule" />
        </div>

        {/* ===== النموذج ===== */}
        <section className="no-print container py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[3px] flex-1 bg-gradient-to-l from-transparent via-[var(--gold)] to-[var(--seal)]" />
            <h3 className="font-display text-2xl font-bold">بيانات العقد</h3>
            <div className="h-[3px] flex-1 bg-gradient-to-r from-transparent via-[var(--gold)] to-[var(--seal)]" />
          </div>
          <div className="paper-grain relative">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[3px] border border-[var(--gold)]/40 bg-[var(--gold)]/5 px-4 py-2.5">
              <Checkbox id="save-company" checked={saveCompany} onCheckedChange={(v) => setSaveCompany(v === true)} className="data-[state=checked]:bg-[var(--seal)] data-[state=checked]:border-[var(--seal)]" />
              <label htmlFor="save-company" className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <MemoryStick size={15} className="text-[var(--seal)]" />
                <span className="font-semibold">احفظ بيانات الشركة في هذا المتصفح تلقائيًا</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {saveCompany ? "سيتم تعبئة بيانات الشركة تلقائيًا في المرة القادمة — تُحفظ محليًا على جهازك فقط ولا تُرسل لأي جهة" : "البيانات تُمسح عند إغلاق الصفحة ما لم تفعّل هذا الخيار"}
              </span>
            </div>
            <ContractForm data={data} onChange={setData} onGenerate={handleGenerate} />
          </div>
        </section>

        {/* ===== الأسئلة الشائعة ===== */}
        <FaqSection />

        {/* ===== المعاينة والعقد ===== */}
        {showContract && (
          <section id="contract-preview" className="no-print container py-8 border-t border-border">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h3 className="font-display text-2xl font-bold">مسودة العقد</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  راجع البنود؛ فإن سلمت، اطبع العقد كاملًا بالنسخ الأربع المطلوبة قانونًا. يمكنك النقر على زر «تحرير» في أي بند لتعديل نصه يدويًا.
                </p>
                {anyOverride && (
                  <button
                    type="button"
                    onClick={() => { setOverrides({}); toast.info("عادت كل النصوص إلى صيغتها الافتراضية"); }}
                    className="mt-1.5 text-xs text-[#8B2635] underline underline-offset-2 hover:text-[#b3892f]"
                  >
                    إعادة جميع البنود إلى النص الافتراضي
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadPdf} size="lg" className="gap-2 font-display text-base rounded-[3px] bg-white">
                  <Download size={17} /> حمّل PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadDocx} size="lg" className="gap-2 font-display text-base rounded-[3px] bg-white">
                  <FileText size={17} /> حمّل Word
                </Button>
                <Button onClick={handlePrint} size="lg" className="gap-2 font-display text-base rounded-[3px]">
                  <Printer size={17} /> اطبع العقد كاملًا
                </Button>
              </div>
            </div>
              <div className="rounded-[3px] overflow-hidden border border-border">
              <ContractDocument data={data} overrides={overrides} onEditClause={handleEditClause} />
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-[var(--secondary)] rounded-md p-3 border border-[var(--gold)]/30">
              <AlertTriangle size={14} className="text-[var(--gold)] shrink-0 mt-0.5" />
              هذا النموذج أداة مساعدة عامة لإعداد عقد عمل وفق المواد العامة لقانون العمل المصري رقم ١٤ لسنة ٢٠٢٥، ولا يُغني عن الاستشارة القانونية المتخصصة في الحالات الخاصة (العمال المنزليون، الزراعة، الشركات ذات الأحكام الخاصة، أو العقود محل نزاع قائم).
            </p>
          </section>
        )}
      </main>

      {/* ===== التذييل ===== */}
      <footer className="no-print border-t border-border mt-10">
        <div className="chancery-rule" />
        <div className="container py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <StampLogo size={26} />
            <span>منشئ عقود العمل — مطابق لقانون العمل رقم (١٤) لسنة ٢٠٢٥</span>
          </div>
          <span>أداة عامة مجانية لأي صاحب عمل أو عامل في مصر</span>
        </div>
      </footer>

      {/* ===== منطقة الطباعة (A4) ===== */}
      {showPrint && (
        <div className="print-only">
          <ContractDocument data={data} forPrint overrides={overrides} onEditClause={handleEditClause} />
        </div>
      )}

      {/* مربع حوار تحرير نص البند */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              تحرير نص البند ({editTarget?.kind === "ar" ? editTarget.number : ""})
              {editTarget?.kind === "en" && editTarget.number ? `Clause (${editTarget.number})` : ""}
            </DialogTitle>
            <DialogDescription>
              عدّل النص كما تشاء — سيظهر التعديل في المعاينة والطباعة وملفي PDF وWord. اتركه فارغًا لحذف النص.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            dir={editTarget?.kind === "ar" ? "rtl" : "ltr"}
            className="w-full min-h-44 rounded-md border border-border bg-background p-3 text-[13pt] leading-[1.9] font-display focus:outline-none focus:ring-2 focus:ring-[#8B2635]/40"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => { setEditDraft(editTarget?.current ?? ""); }}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              استعادة النص الأصلي
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>إلغاء</Button>
              <Button size="sm" onClick={handleSaveEdit}>حفظ التعديل</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
