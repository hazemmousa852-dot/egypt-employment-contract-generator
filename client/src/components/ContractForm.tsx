/*
 * DESIGN: "الديوان الرسمي" — نموذج الإدخال
 * بطاقات بإطار زخرفي مزدوج (ذهبي/أحمر)، خطوات مرقمة بالعربية، حقول رسمية واضحة.
 */
/*
 * DESIGN: "الديوان الرسمي" — نموذج يُقرأ كسجل ورقى رسمي لا كواجهة تطبيق:
 * حقول بحواف حادة وخط حبر رفيع، علامات أقسام ختمية دائرية، لغة موظف قانوني.
 */
import { useState, useRef } from "react";
import type { ContractData, ContractType, PartyData, EmployeeData, SalaryData, WorkData } from "@/lib/contract";
import { contractEndDate } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Trash2, ArrowLeft, Building2, UserRound, Wallet, FileText } from "lucide-react";
import StampLogo from "@/components/StampLogo";

interface Props {
  data: ContractData;
  onChange: (d: ContractData) => void;
  onGenerate: () => void;
}

const emptyEmployer: PartyData = { name: "", role: "صاحب العمل", nationalId: "", phone: "", address: "", email: "", commercialRegister: "" };
const emptyEmployee: EmployeeData = { name: "", gender: "male", nationalId: "", jobTitle: "", department: "", qualification: "", phone: "", address: "" };
const emptySalary: SalaryData = { basicSalary: 0, allowances: "", paymentMethod: "cash" };
const emptyWork: WorkData = { startDate: "", trialPeriod: false, workLocation: "", workNature: "عمل دائم", dailyHours: "٨", weeklyRestDay: "يوم الجمعة", nonCompete: false };

const newTypeFields = { trainingDurationMonths: 3, consultantScope: "", consultantRegime: "" };

function SealBadge({ icon, number }: { icon: React.ReactNode; number: string }) {
  /* شارة ختمية دائرية — لغة الدمغة بدل الأيقونة المربعة */
  return (
    <span className="seal-medallion w-11 h-11 shrink-0" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        <text x="20" y="9" textAnchor="middle" fontSize="5.5" fill="currentColor" fontFamily="Cairo, sans-serif" fontWeight="700">القسم</text>
        <text x="20" y="26" textAnchor="middle" fontSize="13" fill="currentColor" fontFamily="Amiri, serif" fontWeight="700">{number}</text>
        <g transform="translate(16.5 28.5) scale(0.52)" fill="currentColor">{icon}</g>
      </svg>
    </span>
  );
}

function SectionCard({ icon, title, index, children }: { icon: React.ReactNode; title: string; index: number; children: React.ReactNode }) {
  const arabicNumbers = ["١", "٢", "٣", "٤"];
  return (
    <div className="card-chancery rounded-[3px] overflow-hidden">
      <div className="chancery-rule" />
      <div className="p-5 md:p-6 pt-5">
        <div className="flex items-center gap-4 mb-5">
          <SealBadge icon={icon} number={arabicNumbers[index]} />
          <div className="flex-1">
            <h3 className="chancery-section-title text-[1.55rem] text-foreground leading-tight">{title}</h3>
            <div className="mt-1 h-[2px] w-24 bg-gradient-to-l from-[var(--gold)] to-[var(--seal)]" />
          </div>
          <span className="legal-ref" dir="ltr">§ {index + 1}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.82rem] font-bold text-foreground">
        {label}
        {required && <span className="text-[var(--seal)] mr-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[0.72rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const grid2 = "grid grid-cols-1 sm:grid-cols-2 gap-4";

export default function ContractForm({ data, onChange, onGenerate }: Props) {
  const set = (patch: Partial<ContractData>) => onChange({ ...data, ...patch });
  const setEmployer = (patch: Partial<PartyData>) => set({ employer: { ...data.employer, ...patch } });
  const setEmployee = (patch: Partial<EmployeeData>) => set({ employee: { ...data.employee, ...patch } });
  const setSalary = (patch: Partial<SalaryData>) => set({ salary: { ...data.salary, ...patch } });
  const setWork = (patch: Partial<WorkData>) => set({ work: { ...data.work, ...patch } });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة كبير — الحد الأقصى ٢ ميجابايت");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set({ logo: reader.result as string });
    reader.readAsDataURL(file);
    toast.success("تم رفع شعار الشركة بنجاح");
  };

  const [logoError, setLogoError] = useState<string | null>(null);
  const previewSrc = logoError ? undefined : data.logo;

  const handleImageError = () => {
    setLogoError("تعذر عرض الصورة");
  };

  const validate = (): boolean => {
    const missing: string[] = [];
    if (!data.employer.name.trim()) missing.push("اسم صاحب العمل (الطرف الأول)");
    if (!data.employee.name.trim()) missing.push("اسم العامل (الطرف الثاني)");
    if (!data.employee.nationalId.trim()) missing.push("الرقم القومي للعامل");
    if (!data.employee.jobTitle.trim()) missing.push("المسمى الوظيفي");
    if (!data.salary.basicSalary || data.salary.basicSalary <= 0) missing.push("الأجر الأساسي الشهري");
    if (!data.work.startDate) missing.push("تاريخ بدء العقد");
    if ((data.type === "fixed" || data.type === "task") && (data.durationYears ?? 0) === 0 && (data.durationMonths ?? 0) === 0) missing.push("مدة العقد محدد المدة");
    if (data.type === "task" && !(data.taskDescription ?? "").trim()) missing.push("وصف العمل المطلوب إنجازه");
    if (data.type === "training" && !(data.trainingDurationMonths ?? 0)) missing.push("مدة التدريب بالأشهر");
    if (data.type === "consultant" && !(data.consultantScope ?? "").trim()) missing.push("نطاق الاستشارات والخدمات");
    if (missing.length) {
      toast.error("يُرجى استكمال الحقول التالية:\n• " + missing.join("\n• "), { duration: 6000 });
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <SectionCard icon={<Building2 size={18} />} title="بيانات صاحب العمل" index={0}>
        <div className={grid2}>
          <Field label="اسم الجهة / صاحب العمل" required>
            <Input value={data.employer.name} onChange={(e) => setEmployer({ name: e.target.value })} placeholder="مثال: شركة النيل للتجارة" className="input-chancery" />
          </Field>
          <Field label="السجل التجاري / الرقم الضريبي">
            <Input value={data.employer.commercialRegister} onChange={(e) => setEmployer({ commercialRegister: e.target.value })} placeholder="رقم السجل أو الرقم الضريبي" className="input-chancery" />
          </Field>
          <Field label="عنوان مقر العمل">
            <Input value={data.employer.address} onChange={(e) => setEmployer({ address: e.target.value })} placeholder="العنوان بالتفصيل" className="input-chancery" />
          </Field>
          <Field label="رقم الهاتف">
            <Input value={data.employer.phone} onChange={(e) => setEmployer({ phone: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" className="input-chancery" />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input value={data.employer.email} onChange={(e) => setEmployer({ email: e.target.value })} placeholder="info@example.com" dir="ltr" className="input-chancery" />
          </Field>
        </div>
        {/* Logo upload */}
        <div className="mt-6 pt-5 border-t border-border">
          <Label className="text-sm font-semibold text-foreground mb-2 block">شعار الشركة على العقد</Label>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 border border-dashed border-[var(--gold)] rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
              {previewSrc ? (
                <img src={previewSrc} alt="شعار الشركة" className="max-w-full max-h-full object-contain p-1" onError={handleImageError} />
              ) : (
                <span className="text-xs text-muted-foreground text-center px-2">{logoError ? logoError : "معاينة الشعار"}</span>
              )}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2 input-chancery">
                <Upload size={15} /> إضافة شعار الشركة إلى العقد
              </Button>
              {data.logo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ logo: undefined })} className="text-destructive gap-2">
                  <Trash2 size={14} /> إزالة الشعار
                </Button>
              )}
              <p className="text-xs text-muted-foreground max-w-xs">PNG أو JPG بحد أقصى ٢ ميجابايت. يظهر الشعار في ترويسة العقد المطبوع.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<UserRound size={18} />} title="بيانات العامل" index={1}>
        <div className={grid2}>
          <Field label="الاسم الرباعي" required>
            <Input value={data.employee.name} onChange={(e) => setEmployee({ name: e.target.value })} placeholder="الاسم كما بالرقم القومي" className="input-chancery" />
          </Field>
          <Field label="الرقم القومي" required hint="١٤ رقمًا كما هو ببطاقة الرقم القومي">
            <Input value={data.employee.nationalId} onChange={(e) => setEmployee({ nationalId: e.target.value })} placeholder="2xxxxxxxxxxx" dir="ltr" className="input-chancery" />
          </Field>
          <Field label="النوع">
            <div className="flex gap-4 pt-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={data.employee.gender === "male"} onChange={() => setEmployee({ gender: "male" })} className="accent-[var(--seal)]" /> ذكر
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={data.employee.gender === "female"} onChange={() => setEmployee({ gender: "female" })} className="accent-[var(--seal)]" /> أنثى
              </label>
            </div>
          </Field>
          <Field label="المسمى الوظيفي" required>
            <Input value={data.employee.jobTitle} onChange={(e) => setEmployee({ jobTitle: e.target.value })} placeholder="مثال: محاسب / فني صيانة" className="input-chancery" />
          </Field>
          <Field label="الإدارة / القسم">
            <Input value={data.employee.department} onChange={(e) => setEmployee({ department: e.target.value })} placeholder="مثال: إدارة الحسابات" className="input-chancery" />
          </Field>
          <Field label="المؤهل الدراسي">
            <Input value={data.employee.qualification} onChange={(e) => setEmployee({ qualification: e.target.value })} placeholder="مثال: بكالوريوس تجارة" className="input-chancery" />
          </Field>
          <Field label="رقم الهاتف">
            <Input value={data.employee.phone} onChange={(e) => setEmployee({ phone: e.target.value })} dir="ltr" placeholder="01xxxxxxxxx" className="input-chancery" />
          </Field>
          <Field label="العنوان السكني">
            <Input value={data.employee.address} onChange={(e) => setEmployee({ address: e.target.value })} placeholder="عنوان الإقامة" className="input-chancery" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard icon={<FileText size={18} />} title="بيانات العقد" index={2}>
        <div className={grid2}>
          <Field label="رقم العقد">
            <Input value={data.contractNumber} onChange={(e) => set({ contractNumber: e.target.value })} placeholder="اختياري — يُرقم تلقائيًا إن تركته فارغًا" dir="ltr" className="input-chancery" />
          </Field>
          <Field label="تاريخ تحرير العقد (يوم/شهر/سنة)" required hint="اختر التاريخ من المنتقي، ويُكتب في العقد بصيغة: 16/8/2026م">
            <Input type="date" value={data.contractDate} onChange={(e) => set({ contractDate: e.target.value })} className="input-chancery" />
          </Field>
          <Field label="نوع العقد" required>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => set({ type: "fixed" as ContractType })}
                className={`rounded-[2px] border px-2 py-2.5 text-sm font-semibold transition-all ${data.type === "fixed" ? "border-[var(--seal)] bg-[oklch(0.45_0.19_25/0.06)] text-[var(--seal)] ring-1 ring-[var(--seal)]/30" : "border-border bg-card text-muted-foreground hover:border-[var(--seal)]/40"}`}
              >
                محدد المدة
              </button>
              <button
                type="button"
                onClick={() => set({ type: "task" as ContractType })}
                className={`rounded-[2px] border px-2 py-2.5 text-sm font-semibold transition-all ${data.type === "task" ? "border-[var(--seal)] bg-[oklch(0.45_0.19_25/0.06)] text-[var(--seal)] ring-1 ring-[var(--seal)]/30" : "border-border bg-card text-muted-foreground hover:border-[var(--seal)]/40"}`}
              >
                لإنجاز عمل معين
              </button>
              <button
                type="button"
                onClick={() => set({ type: "indefinite" as ContractType })}
                className={`rounded-[2px] border px-2 py-2.5 text-sm font-semibold transition-all ${data.type === "indefinite" ? "border-[var(--seal)] bg-[oklch(0.45_0.19_25/0.06)] text-[var(--seal)] ring-1 ring-[var(--seal)]/30" : "border-border bg-card text-muted-foreground hover:border-[var(--seal)]/40"}`}
              >
                غير محدد المدة
              </button>
              <button
                type="button"
                onClick={() => set({ type: "training" as ContractType, ...newTypeFields })}
                className={`rounded-[2px] border px-2 py-2.5 text-sm font-semibold transition-all ${data.type === "training" ? "border-[var(--seal)] bg-[oklch(0.45_0.19_25/0.06)] text-[var(--seal)] ring-1 ring-[var(--seal)]/30" : "border-border bg-card text-muted-foreground hover:border-[var(--seal)]/40"}`}
              >
                تدريب تجريبي
              </button>
              <button
                type="button"
                onClick={() => set({ type: "consultant" as ContractType, ...newTypeFields })}
                className={`rounded-[2px] border px-2 py-2.5 text-sm font-semibold transition-all ${data.type === "consultant" ? "border-[var(--seal)] bg-[oklch(0.45_0.19_25/0.06)] text-[var(--seal)] ring-1 ring-[var(--seal)]/30" : "border-border bg-card text-muted-foreground hover:border-[var(--seal)]/40"}`}
              >
                تعاقد مع استشاري
              </button>
            </div>
          </Field>
          {(data.type === "fixed" || data.type === "task") ? (
            <>
              <Field label="مدة العقد بالسنوات" hint="يمكن تركها صفرًا إذا كانت المدة بالأشهر فقط">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={data.durationYears ?? 0}
                  onChange={(e) => set({ durationYears: Math.max(0, Number(e.target.value) || 0) })}
                  className="input-chancery"
                />
              </Field>
              <Field label="المدة بالأشهر الإضافية">
                <Input
                  type="number"
                  min={0}
                  max={11}
                  value={data.durationMonths ?? 0}
                  onChange={(e) => set({ durationMonths: Math.max(0, Math.min(11, Number(e.target.value) || 0)) })}
                  className="input-chancery"
                />
              </Field>
              <div className="sm:col-span-2 rounded-md bg-[var(--secondary)] border border-[var(--gold)]/40 px-4 py-3 text-sm">
                <span className="font-semibold text-[var(--seal)]">تاريخ نهاية العقد المحسوب: </span>
                {(() => {
                  const end = contractEndDate(data.work.startDate, data.durationYears ?? 0, data.durationMonths ?? 0);
                  if (!data.work.startDate || ((data.durationYears ?? 0) === 0 && (data.durationMonths ?? 0) === 0)) return "أدخل تاريخ بدء العقد والمدة لحساب تاريخ النهاية تلقائيًا";
                  if (!end) return "يُحسب تاريخ النهاية تلقائيًا";
                  return `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}م`;
                })()}
              </div>
              {data.type === "task" && (
                <Field label="وصف العمل المطلوب إنجازه" required>
                  <Input value={data.taskDescription ?? ""} onChange={(e) => set({ taskDescription: e.target.value })} placeholder="مثال: بناء سور محيط بموقع العمل بطول ١٢٠ مترًا" className="input-chancery" />
                </Field>
              )}
            </>
          ) : data.type === "training" ? (
            <>
              <Field label="مدة التدريب بالأشهر" required hint="شهر واحد إلى ١٢ شهرًا كحد أقصى عادةً">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={data.trainingDurationMonths ?? 3}
                  onChange={(e) => set({ trainingDurationMonths: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
                  className="input-chancery"
                />
              </Field>
              <div className="sm:col-span-2 rounded-md bg-[var(--secondary)] border border-[var(--gold)]/40 px-4 py-3 text-sm">
                <span className="font-semibold text-[var(--seal)]">تاريخ نهاية التدريب المحسوب: </span>
                {(() => {
                  const end = contractEndDate(data.work.startDate, 0, data.trainingDurationMonths ?? 3);
                  if (!data.work.startDate) return "أدخل تاريخ بدء التدريب لحساب تاريخ النهاية تلقائيًا";
                  if (!end) return "يُحسب تاريخ النهاية تلقائيًا";
                  return `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}م`;
                })()}
              </div>
              <div className="sm:col-span-2 rounded-md bg-[var(--secondary)] border border-[var(--gold)]/40 px-4 py-3 text-sm text-muted-foreground">
                عقد التدريب التجريبي سندٌ لاكتساب الخبرة العملية ولا يُعد عقد عمل دائم، ولا يستحق المتدرب به مزايا عمال المنشأة، ويُؤمَّن عليه ضد إصابات العمل وأمراض المهنة، ويُمنح شهادة تدريب عند انتهائه بنجاح.
              </div>
            </>
          ) : data.type === "consultant" ? (
            <>
              <Field label="نطاق الاستشارات والخدمات" required>
                <Input value={data.consultantScope ?? ""} onChange={(e) => set({ consultantScope: e.target.value })} placeholder="مثال: إعداد دراسات الجدوى المالية وتقييم المخاطر التشغيلية للمشروع" className="input-chancery" />
              </Field>
              <Field label="مدة التعاقد (اختياري)">
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={data.durationYears ?? 0}
                    onChange={(e) => set({ durationYears: Math.max(0, Number(e.target.value) || 0) })}
                    className="input-chancery"
                  />
                  <span className="text-sm text-foreground/70 shrink-0">سنة /</span>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    value={data.durationMonths ?? 0}
                    onChange={(e) => set({ durationMonths: Math.max(0, Math.min(11, Number(e.target.value) || 0)) })}
                    className="input-chancery"
                  />
                  <span className="text-sm text-foreground/70 shrink-0">شهر</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">اترك السنة والشهر صفرًا لعقد غير محدد المدة</p>
              </Field>
              <div className="sm:col-span-2 rounded-md bg-[var(--secondary)] border border-[var(--gold)]/40 px-4 py-3 text-sm text-muted-foreground">
                التعاقد مع الاستشاري تعاقدٌ مدني على تقديم خدمات مهنية مستقلة، ولا يُعد علاقة عمل بالمعنى الوارد بقانون العمل، ولا يستحق به الاستشاري مزايا العمال من علاوات وإجازات، ويُقر الطرف الثاني باستقلاليته الفنية الكاملة.
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-md bg-[var(--secondary)] border border-[var(--gold)]/40 px-4 py-3 text-sm text-muted-foreground">
              العقد غير محدد المدة: يستمر حتى ينهيه أحد الطرفين بالإخطار الكتابي قبل ثلاثة أشهر طبقًا للمادة (١٥٦) من القانون.
            </div>
          )}
          <Field label="تاريخ بدء العمل (يوم/شهر/سنة)" required hint="يُكتب في العقد بصيغة: 1/9/2026م">
            <Input type="date" value={data.work.startDate} onChange={(e) => setWork({ startDate: e.target.value })} className="input-chancery" />
          </Field>
          {data.type !== "training" && data.type !== "consultant" && (
            <Field label="فترة الاختبار (٣ أشهر كحد أقصى)">
              <div className="flex items-center gap-2 pt-2">
                <Checkbox checked={data.work.trialPeriod} onCheckedChange={(v) => setWork({ trialPeriod: v === true })} id="trial" className="accent-[var(--seal)]" />
                <Label htmlFor="trial" className="cursor-pointer">نعم، يُحدد للعامل فترة اختبار</Label>
              </div>
            </Field>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<Wallet size={18} />} title="الأجر والعمل" index={3}>
        <div className={grid2}>
          <Field label={data.type === "consultant" ? "الأتعاب الشهرية (جنيه مصري)" : "الأجر الأساسي الشهري (جنيه مصري)"} required hint="يُكتب بالعربية والأرقام تلقائيًا في العقد">
            <Input
              type="number"
              min={0}
              value={data.salary.basicSalary || ""}
              onChange={(e) => setSalary({ basicSalary: Number(e.target.value) || 0 })}
              placeholder="5000"
              dir="ltr"
              className="input-chancery text-left"
            />
          </Field>
          <Field label="المزايا والبدلات الإضافية" hint="اختياري — تُذكر بنص صريح إن وجدت">
            <Input value={data.salary.allowances} onChange={(e) => setSalary({ allowances: e.target.value })} placeholder="مثال: بدل مواصلات ٥٠٠ جنيه + بدل إعاشة" className="input-chancery" />
          </Field>
          <Field label="طريقة سداد الأجر">
            <div className="flex gap-4 pt-1.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={data.salary.paymentMethod === "cash"} onChange={() => setSalary({ paymentMethod: "cash" })} className="accent-[var(--seal)]" /> نقدًا في مكان العمل
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={data.salary.paymentMethod === "bank"} onChange={() => setSalary({ paymentMethod: "bank" })} className="accent-[var(--seal)]" /> تحويل بنكي
              </label>
            </div>
          </Field>
          <Field label="مكان العمل">
            <Input value={data.work.workLocation} onChange={(e) => setWork({ workLocation: e.target.value })} placeholder="مثال: الفرع الرئيسي — مدينة نصر" className="input-chancery" />
          </Field>
          {data.type !== "consultant" && data.type !== "training" && (
            <Field label="طبيعة العمل">
              <Input value={data.work.workNature} onChange={(e) => setWork({ workNature: e.target.value })} placeholder="مثال: عمل دائم / موسمي" className="input-chancery" />
            </Field>
          )}
          {data.type !== "consultant" && (
            <Field label="ساعات العمل الفعلية اليومية" hint="الحد الأقصى القانوني ٨ ساعات فعلية يوميًا">
              <Input value={data.work.dailyHours} onChange={(e) => setWork({ dailyHours: e.target.value })} placeholder="٨" className="input-chancery" />
            </Field>
          )}
          {data.type !== "consultant" && (
            <Field label="يوم الراحة الأسبوعية">
              <Input value={data.work.weeklyRestDay} onChange={(e) => setWork({ weeklyRestDay: e.target.value })} placeholder="يوم الجمعة" className="input-chancery" />
            </Field>
          )}
          {data.type !== "consultant" && data.type !== "training" && (
            <Field label="شرط عدم المنافسة">
              <div className="flex items-center gap-2 pt-2">
                <Checkbox checked={data.work.nonCompete} onCheckedChange={(v) => setWork({ nonCompete: v === true })} id="noncompete" className="accent-[var(--seal)]" />
                <Label htmlFor="noncompete" className="cursor-pointer">نعم، يُتفق على عدم المنافسة (سنة كحد أقصى)</Label>
              </div>
            </Field>
          )}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StampLogo size={22} />
          <span>تُحرّر البنود طبقًا للمواد (٨٦)–(١٥٧) من قانون العمل رقم (١٤) لسنة ٢٠٢٥</span>
        </div>
        <Button size="lg" className="font-display text-lg px-8 gap-2 rounded-[3px]" onClick={() => { if (validate()) onGenerate(); }}>
          حرّر العقد <ArrowLeft size={18} />
        </Button>
      </div>
    </div>
  );
}
