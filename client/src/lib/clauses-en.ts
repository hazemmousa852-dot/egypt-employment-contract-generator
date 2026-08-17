/*
 * DESIGN: "الديوان الرسمي" — النسخة الإنجليزية لبنود العقد
 * English rendering of all clause sets, parallel to clauses.ts.
 */
import type { ContractData } from "./contract";
import { contractEndDate, formatSalary, isConsultant, isTraining, totalMonths } from "./contract";

const enUnits = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const enTens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function enThree(w: number): string {
  const h = Math.floor(w / 100), rem = w % 100;
  const hundreds = h > 0 ? `${enUnits[h]} hundred${rem > 0 ? " and " : ""}` : "";
  if (rem < 20) return `${hundreds}${enUnits[rem]}`;
  return `${hundreds}${enTens[Math.floor(rem / 10)]}${rem % 10 ? "-" + enUnits[rem % 10] : ""}`;
}
export function numberToEnglishWords(n: number): string {
  if (n <= 0) return "zero";
  const millions = Math.floor(n / 1000000), rest = n % 1000000;
  const thousands = Math.floor(rest / 1000);
  const parts: string[] = [];
  if (millions > 0) parts.push(`${enThree(millions)} million`);
  if (thousands > 0) parts.push(`${enThree(thousands)} thousand`);
  const u = rest % 1000;
  if (u > 0) {
    if (parts.length && (parts.length === 2 || parts[parts.length - 1] === "thousand")) {
      parts.push(`and ${enThree(u)}`);
    } else parts.push(enThree(u));
  }
  return parts.join(" ");
}

export interface EnClause {
  number: number;
  title: string;
  articleRef: string;
  text: string;
  breakAfter?: boolean;
}

/* ---- shared helpers ---- */
function enDate(d: ContractData) {
  return d.contractDate ? d.contractDate : "";
}
function num(n: number): string {
  return n.toLocaleString("en-US");
}
function wageTextEn(n: number): string {
  return `${n.toLocaleString("en-US")} (${numberToEnglishWords(n)} Egyptian pounds) only`;
}
function fmtShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
function durationTextEn(years: number, months: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" and ") : "one month";
}
function party2Word(d: ContractData): string {
  return isTraining(d) ? "the Trainee" : isConsultant(d) ? "the Consultant" : "the Employee";
}

/* ==============================================================
   Standard employment contract (fixed / indefinite / task)
   ============================================================== */
export function buildEnClauses(d: ContractData): EnClause[] {
  const totalM = totalMonths(d.durationYears ?? 0, d.durationMonths ?? 0);
  const isFixed = d.type === "fixed";
  const isTask = d.type === "task";
  const endDateObj = contractEndDate(d.work.startDate, d.durationYears ?? 0, d.durationMonths ?? 0);
  const endDate = endDateObj ? fmtShort(endDateObj.toISOString().slice(0, 10)) : "";
  const startDate = d.work.startDate ? fmtShort(d.work.startDate) : "..........";
  const endDateStr = endDateObj ? fmtShort(endDateObj.toISOString().slice(0, 10)) : "..........";

  const otHours = hasOvertime(d) ? ` The Parties have agreed on a monthly overtime plan of ${num(d.salary.overtimeDayHours ?? 0)} daytime overtime hours and ${num(d.salary.overtimeNightHours ?? 0)} night-time overtime hours. Daytime overtime is compensated at the hourly rate plus thirty-five percent (35%), and night-time overtime at the hourly rate plus seventy percent (70%).` : "";

  return [
    {
      number: 1,
      title: "Preamble",
      articleRef: "",
      text: `This contract was concluded on ${enDate(d) || "......."}${d.contractNumber ? `, under No. ${d.contractNumber}` : ""}, between:`,
    },
    {
      number: 2,
      title: "The First Party (the Employer)",
      articleRef: "",
      text: `${d.employer.name || ".........."}, commercial register / tax ID: ${d.employer.commercialRegister || ".........."}, headquartered at ${d.employer.address || ".........."}, tel: ${d.employer.phone || ".........."}, acting in its capacity as the employer (hereinafter referred to as «the First Party»).`,
    },
    {
      number: 3,
      title: `The Second Party (${party2Word(d).replace("the ", "").replace("Trainee", "Trainee").replace("Consultant", "Consultant").replace("Employee", "Employee")})`,
      articleRef: "",
      text: `${d.employee.name || ".........."}, Egyptian nationality, national ID: ${d.employee.nationalId || ".........."}, ${d.employee.gender === "female" ? "female" : "male"}, holder of a qualification in ${d.employee.qualification || ".........."}, residing at ${d.employee.address || ".........."}, tel: ${d.employee.phone || ".........."} (hereinafter referred to as «the Second Party» or «the Employee»).`,
    },
    {
      number: 4,
      title: "Basis of the Agreement",
      articleRef: "",
      text: `The Second Party applied for employment with the First Party, and the First Party decided to accept this application. Both Parties, possessing full legal capacity under Sharia and the law, have agreed upon the following:`,
    },
    {
      number: 5,
      title: "Job Title and Nature of Work",
      articleRef: "",
      text: `The Second Party shall work for the First Party in the position of: ${d.employee.jobTitle || ".........."}${d.employee.department ? `, in the department of: ${d.employee.department}` : ""}. The Employee shall perform his/her work with diligence, honesty, and proficiency in accordance with the labour rules and regulations in force at the First Party, and shall abide by the orders and instructions issued by his/her superiors relating to his/her work, provided that the Employee shall not be assigned any work outside the agreed scope of his/her position except by way of temporary necessity or work that does not differ substantially from the nature of his/her work.`,
    },
    {
      number: 6,
      title: "Contract Duration and Commencement of Work",
      articleRef: "",
      text: isFixed
        ? (`**Contract type:** Fixed-term — the **contract period** commences on ${startDate} and extends for ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)}, expiring at the end of ${endDateStr}. The contract may be renewed by an express agreement between the Parties; upon renewal it shall be deemed a new fixed-term contract.`)
        : isTask
          ? (`**Contract type:** Fixed-term for the accomplishment of a specific task — the **contract period** commences on ${startDate} and continues until the accomplishment of the specified work, being deemed fixed-term upon completion of the required work: «${d.taskDescription || ".........."}», in accordance with Article (87) of the Labour Law promulgated by Law No. (14) of 2025.`)
          : (`**Contract type:** Indefinite-term — the **contract period** commences on ${startDate} and continues unless either Party terminates the contract by written notice given three months prior to termination.`),
    },
    {
      number: 7,
      title: "Probationary Period",
      articleRef: "",
      text: d.work.trialPeriod
        ? "The Parties agreed to determine a probationary period of three months commencing from the start of work stated in Clause (6) above. The Employee may not be appointed under probation more than once with the same employer. If the Employee proves unsuitable for the agreed work during the probationary period, the First Party may terminate the relationship without compensation after notifying the Employee at least two weeks in advance."
        : "The Parties agreed not to determine a probationary period for the Employee.",
    },
    {
      number: 8,
      title: "Place of Work",
      articleRef: "",
      text: `The Employee shall perform his/her work at: ${d.work.workLocation || ".........."}. The First Party may not transfer the Employee to another location except in the cases permitted by law.`,
    },
    {
      number: 9,
      title: "Remuneration and Method of Payment",
      articleRef: "",
      text: `The First Party undertakes to pay the Second Party a gross monthly wage of ${wageTextEn(d.salary.basicSalary)}, payable ${d.salary.paymentMethod === "bank" ? "by transfer to the designated bank account" : "in cash on a working day at the place of work in legal currency"}, once every month no later than the end of the month in respect of which it is due, together with a detailed wage statement provided to the Employee.` + (d.salary.allowances ? ` In addition, the Employee is entitled to the following benefits and allowances: ${d.salary.allowances}.` : "") + otHours,
    },
    {
      number: 10,
      title: "Annual Periodic Allowance",
      articleRef: "",
      text: `The Employee shall be entitled to an annual periodic allowance of not less than three percent (3%) of the insurance subscription wage.`,
    },
    {
      number: 11,
      title: "Social Insurance",
      articleRef: "",
      text: `The First Party undertakes to enrol the Second Party in the Social Insurance and Pensions system promulgated by Law No. (148) of 2019, as of the commencement of work stated in Clause (6), and to charge the Employee with his/her legal share of the contributions, deducted from the wage and deposited with the competent authorities.`,
    },
    {
      number: 12,
      title: "Working Hours and Rest Periods",
      articleRef: "",
      text: `The actual working hours determined for the Employee are ${d.work.dailyHours || "8 hours"} per day. The Employee may not be employed for more than five consecutive hours without a rest period, and the total rest period shall not be less than one hour, which shall not count towards actual working hours. The Employee is granted a weekly rest of at least one full day on: ${d.work.weeklyRestDay || "Friday"}.`,
    },
    {
      number: 13,
      title: "Annual Leave",
      articleRef: "",
      text: `The Employee shall be entitled to paid annual leave of fifteen (15) days for the first year of service, increasing to twenty-one (21) days for each year as of the second year, and to thirty (30) days where the Employee has served one or more employers for ten years or has reached the age of fifty. The timing of annual leave is determined according to the circumstances of work at the First Party, and the Employee must obtain at least fifteen (15) days of it in one continuous period. No derogation below the legal minimum is permitted. Employees in continuous work that cannot tolerate interruption are exempted.`,
    },
    {
      number: 14,
      title: "Other Leaves",
      articleRef: "",
      text: `The Employee shall be entitled to casual leave of seven (7) days during the year, at most two days at a time, deducted from the annual leave balance. The Employee is also entitled to one day of paid emergency leave on the occasion of the birth of a child, up to three times during the period of service, and such leave is not deducted from the annual leave balance. The Employee is further entitled to fully paid leave on official holidays and feasts specified by decision of the competent Minister; if work circumstances require him/her to work on any such day, the Employee shall be entitled to double pay in addition to the original wage, or a compensatory day off in lieu of the day worked.`,
    },
    {
      number: 15,
      title: "Sick Leave",
      articleRef: "",
      text: `The Employee shall be entitled to sick leave and the compensation therefor in accordance with the provisions of the Social Insurance and Pensions Law promulgated by Law No. (148) of 2019, and medical unfitness for service shall be established in accordance with the same Law.`,
    },
    {
      number: 16,
      title: "Leave of Female Workers",
      articleRef: "",
      text: `In all applicable circumstances, a female worker shall be entitled to maternity leave with pay of one hundred and twenty (120) days (four months), to be used before and after confinement, provided that the portion following confinement is no less than forty-five (45) days. A female worker may benefit from this leave no more than three times during the period of her service, without any requirement of prior service. Employing a female worker during pregnancy in overtime hours is prohibited, and the employer must reduce actual working hours by one hour daily as of the sixth month of pregnancy. A female worker who has completed at least one year of service at an establishment employing fifty or more workers shall also be entitled to unpaid leave for the care of her child for a maximum of two years, up to three times during the period of service.`,
    },
    {
      number: 17,
      title: "Overtime Work",
      articleRef: "",
      text: `The Employee may not be employed in overtime beyond the maximum limit determined by decision of the competent Minister for actual and overtime working hours. In exceptional circumstances, actual working hours may be increased beyond their maximum to complete work that cannot tolerate delay; in such cases the Employee shall be entitled to overtime pay of not less than the basic wage increased by thirty-five percent (35%) if such hours fall during daytime, and seventy percent (70%) if they fall at night, on the basis of the hourly wage. The overtime plan agreed between the Parties under Clause (9) above shall be applied in accordance with the foregoing.`,
    },
    {
      number: 18,
      title: "Duties of the Employee",
      articleRef: "",
      text: `The Second Party undertakes to perform his/her work personally with accuracy and honesty, to observe working hours, to execute the orders issued by the persons concerned relating to the performance of his/her work, to maintain the tools of work entrusted to him/her, to preserve the technical, commercial, and industrial secrets of the work, not to disclose or divulge or use for himself/herself or others the secrets learned by virtue of the position even after the termination of the employment relationship, to inform the competent authority of any accident relating to safety or health that comes to his/her knowledge, to undergo medical examination before commencing work and periodically thereafter whenever required, to respect colleagues and superiors and cooperate with them, and to observe the instructions relating to occupational health and safety.`,
    },
    {
      number: 19,
      title: "Prohibitions on the Employee",
      articleRef: "",
      text: `The Employee is prohibited, while working at the establishment, from working on his/her own account or for the account of others in the work contracted for, or in work that competes with the employer or is connected to it. The Employee is also prohibited from retaining any work-related documents, papers, or data outside the establishment's premises, or from using them other than in the interest of the work.`,
    },
    ...(d.work.nonCompete
      ? [{
          number: 20,
          title: "Non-Competition Agreement",
          articleRef: "",
          text: `The Parties agreed that, in the event of termination of the contract for any reason, the Employee undertakes not to work for any establishment competing with the First Party or to pursue competing activities for a period not exceeding one year, in accordance with Article (158) of the Labour Law promulgated by Law No. (14) of 2025.`,
          breakAfter: true,
        }]
      : []),
    {
      number: d.work.nonCompete ? 21 : 20,
      title: "Termination of the Contract",
      articleRef: "",
      text: isFixed
        ? "This contract shall terminate upon the expiry of the duration specified in Clause (6) above, in accordance with Article (154) of the Labour Law promulgated by Law No. (14) of 2025. If the contract is terminated by the First Party before the expiry of its term, the Employee shall be entitled to an indemnity equal to one month's wage for each year of service. If the contract was concluded or renewed for a period exceeding five years, the Employee may terminate it without compensation upon the expiry of five years after notifying the First Party in writing three months in advance."
        : isTask
          ? "This contract shall terminate upon completion of the specified work referred to in Clause (6) above, in accordance with Article (154) of the Labour Law promulgated by Law No. (14) of 2025. If the contract is terminated by the First Party before the completion of the work, the Employee shall be entitled to an indemnity equal to one month's wage for each year of service."
          : "If either Party wishes to terminate the contract, it must notify the other Party in writing at least three months prior to termination, in accordance with Article (156) of the Labour Law promulgated by Law No. (14) of 2025. The Parties may not agree to waive the notice requirement or reduce its period, but may agree to increase it. The First Party may exempt the Employee from all or part of the notice period if the contract is terminated by the Employee, and the contract shall remain in force throughout the notice period. If the First Party terminates without notice or before the expiry of the notice period, it must pay the Employee an amount equal to the wage for the notice period or the remaining part thereof.",
    },
    {
      number: (d.work.nonCompete ? 21 : 20) + 1,
      title: "End-of-Service Reward",
      articleRef: "",
      text: `Without prejudice to the provisions of the Social Insurance and Pensions Law, the end-of-service reward shall be payable in accordance with the rules applicable in cases where the social insurance system does not apply, or with respect to the wage not included in the insurance subscription wage, as the case may be.`,
      breakAfter: true,
    },
    {
      number: (d.work.nonCompete ? 21 : 20) + 2,
      title: "Judicial Competence",
      articleRef: "",
      text: `In the event of any dispute between the Parties regarding the performance or interpretation of this contract, it shall be settled by the Labour Disputes Settlement Committee; if no settlement is reached, the dispute shall be referred to the competent Labour Court.`,
    },
    {
      number: (d.work.nonCompete ? 21 : 20) + 3,
      title: "Final Provisions",
      articleRef: "",
      text: `This contract is drawn up in the Arabic language in four original copies; each Party received one copy, one copy was deposited with the competent Social Insurance office, and one copy with the competent administrative authority, in accordance with Article (89) of the Labour Law promulgated by Law No. (14) of 2025.`,
    },
  ];
}

/* ==============================================================
   Probationary training contract
   ============================================================== */
export function buildEnTrainingClauses(d: ContractData): EnClause[] {
  const months = d.trainingDurationMonths ?? 3;
  const endDateObj = contractEndDate(d.work.startDate, 0, months);
  const startDate = d.work.startDate ? fmtShort(d.work.startDate) : "..........";
  const endDateStr = endDateObj ? fmtShort(endDateObj.toISOString().slice(0, 10)) : "..........";

  return [
    {
      number: 1,
      title: "Preamble",
      articleRef: "",
      text: `This contract was concluded on ${enDate(d) || "......."}${d.contractNumber ? `, under No. ${d.contractNumber}` : ""}, between:`,
    },
    {
      number: 2,
      title: "The First Party (the Training Entity)",
      articleRef: "",
      text: `${d.employer.name || ".........."}, commercial register / tax ID: ${d.employer.commercialRegister || ".........."}, headquartered at ${d.employer.address || ".........."}, tel: ${d.employer.phone || ".........."} (hereinafter referred to as «the First Party»).`,
    },
    {
      number: 3,
      title: "The Second Party (the Trainee)",
      articleRef: "",
      text: `${d.employee.name || ".........."}, Egyptian nationality, national ID: ${d.employee.nationalId || ".........."}, ${d.employee.gender === "female" ? "female" : "male"}, holder of a qualification in ${d.employee.qualification || ".........."}, residing at ${d.employee.address || ".........."}, tel: ${d.employee.phone || ".........."} (hereinafter referred to as «the Second Party» or «the Trainee»).`,
    },
    {
      number: 4,
      title: "Basis of the Agreement",
      articleRef: "",
      text: `The Second Party applied for training with the First Party to acquire practical experience in the field of ${d.employee.jobTitle || ".........."}, and the First Party decided to accept this application. Both Parties, possessing full legal capacity under Sharia and the law, have agreed upon the following:`,
    },
    {
      number: 5,
      title: "Subject and Place of Training",
      articleRef: "",
      text: `The Second Party shall receive his/her training with the First Party in the position/specialisation of: ${d.employee.jobTitle || ".........."}${d.employee.department ? `, in the department of: ${d.employee.department}` : ""}. The Trainee shall perform the training at the First Party's premises in: ${d.work.workLocation || ".........."}, and shall receive from the First Party the guidance and instructions of his/her supervisors relating to the training, provided that the Trainee shall not be assigned any work outside the agreed scope of the training except by way of temporary necessity.`,
    },
    {
      number: 6,
      title: "Training Duration and Commencement",
      articleRef: "",
      text: `**Contract type:** Probationary training — the **training period** commences on ${startDate} and extends for ${months} month${months > 1 ? "s" : ""}, expiring at the end of ${endDateStr}. This contract is an instrument of training and does not constitute a permanent employment contract; the Trainee is not entitled hereunder to the privileges of the establishment's workers, without prejudice to the provisions of the Labour Law promulgated by Law No. (14) of 2025 relating to training.`,
    },
    {
      number: 7,
      title: "Training Allowance",
      articleRef: "",
      text: `The First Party undertakes to pay the Second Party a monthly training allowance of ${wageTextEn(d.salary.basicSalary)}, payable ${d.salary.paymentMethod === "bank" ? "by transfer to the designated bank account" : "in cash on a working day at the place of training in legal currency"}, once every month.` + (d.salary.allowances ? ` In addition, the Trainee is entitled to: ${d.salary.allowances}.` : ""),
    },
    {
      number: 8,
      title: "Social Insurance During Training",
      articleRef: "",
      text: `The First Party undertakes to insure the Trainee against work injuries and occupational diseases during the training period in accordance with the Social Insurance and Pensions Law promulgated by Law No. (148) of 2019, on the basis of the training allowance.`,
    },
    {
      number: 9,
      title: "Training Certificate",
      articleRef: "",
      text: `Upon successful completion of the training period, the First Party undertakes to grant the Trainee a training certificate specifying the type of work trained in, the duration of the training, and an overall assessment of the result achieved by the Trainee, thereby evidencing the Trainee's practical experience vis-à-vis third parties.`,
    },
    {
      number: 10,
      title: "Duties of the Trainee",
      articleRef: "",
      text: `The Second Party undertakes to perform the training with accuracy and honesty, to observe training hours, to execute the instructions issued by the training supervisors relating to learning the work, to maintain the training tools entrusted to him/her, to preserve the technical, commercial, and industrial secrets of the work, and not to disclose or divulge or use for himself/herself or others the secrets learned by virtue of the training even after its completion, to inform the competent authority of any accident relating to safety or health that comes to his/her knowledge, and to respect colleagues and supervisors and cooperate with them.`,
    },
    {
      number: 11,
      title: "Employment After Training",
      articleRef: "",
      text: `This contract does not oblige the First Party to employ the Trainee after the expiry of the training period. If the Parties agree on employment thereafter, a new employment contract shall be concluded in accordance with the Labour Law promulgated by Law No. (14) of 2025, and the training period shall be counted as part of the Employee's period of service upon employment.`,
    },
    {
      number: 12,
      title: "Termination of Training",
      articleRef: "",
      breakAfter: true,
      text: `The training ends upon the expiry of the duration specified in Clause (6). The First Party may terminate it at any time if the Trainee proves unsuitable for the training or grossly breaches his/her duties, without compensation; the Second Party may terminate it by notifying the First Party in writing at least two weeks in advance.`,
    },
    {
      number: 13,
      title: "Judicial Competence",
      articleRef: "",
      text: `In the event of any dispute between the Parties regarding the performance or interpretation of this contract, it shall be settled by the Labour Disputes Settlement Committee; if no settlement is reached, the dispute shall be referred to the competent Labour Court.`,
    },
    {
      number: 14,
      title: "Final Provisions",
      articleRef: "",
      text: `This contract is drawn up in the Arabic language in three original copies; each Party received one copy, and one copy was deposited with the competent administrative authority.`,
    },
  ];
}

/* ==============================================================
   Independent consultant contract (civil, outside the Labour Law)
   ============================================================== */
export function buildEnConsultantClauses(d: ContractData): EnClause[] {
  const endDateObj = contractEndDate(d.work.startDate, d.durationYears ?? 0, d.durationMonths ?? 0);
  const startDate = d.work.startDate ? fmtShort(d.work.startDate) : "..........";
  const endDateStr = endDateObj ? fmtShort(endDateObj.toISOString().slice(0, 10)) : "..........";
  const isFixedDuration = (d.durationYears ?? 0) + (d.durationMonths ?? 0) > 0;
  const feesText = d.salary.basicSalary ? wageTextEn(d.salary.basicSalary) : "..........";
  const scope = d.consultantScope?.trim() || (d.employee.jobTitle ? `providing consulting services in the field of ${d.employee.jobTitle}` : "..........");

  return [
    {
      number: 1,
      title: "Preamble",
      articleRef: "",
      text: `This contract was concluded on ${enDate(d) || "......."}${d.contractNumber ? `, under No. ${d.contractNumber}` : ""}, between:`,
    },
    {
      number: 2,
      title: "The First Party (the Contracting Entity)",
      articleRef: "",
      text: `${d.employer.name || ".........."}, commercial register / tax ID: ${d.employer.commercialRegister || ".........."}, headquartered at ${d.employer.address || ".........."}, tel: ${d.employer.phone || ".........."} (hereinafter referred to as «the First Party»).`,
    },
    {
      number: 3,
      title: "The Second Party (the Consultant)",
      articleRef: "",
      text: `${d.employee.name || ".........."}, ${d.employee.nationalId ? `Egyptian nationality, national ID: ${d.employee.nationalId},` : ""} ${d.employee.gender === "female" ? "female" : "male"}, ${d.employee.qualification ? `holder of a qualification in ${d.employee.qualification},` : ""} a professional specialising in: ${d.employee.jobTitle || ".........."}, residing at ${d.employee.address || ".........."}, tel: ${d.employee.phone || ".........."} (hereinafter referred to as «the Second Party» or «the Consultant»).`,
    },
    {
      number: 4,
      title: "Basis of the Agreement and Nature of the Contract",
      articleRef: "",
      text: `Given the Second Party's specialised expertise in the field of ${d.employee.jobTitle || ".........."}, both Parties, possessing full legal capacity under Sharia and the law, have agreed to contract with each other for the provision of professional consultancy services. The Parties acknowledge that this contract is a contract for the provision of professional services (a civil contract) and does not constitute an employment relationship within the meaning of the Labour Law promulgated by Law No. (14) of 2025; the Consultant is not entitled to workers' privileges, and the Second Party enjoys full technical independence.`,
    },
    {
      number: 5,
      title: "Subject of the Contract and Scope of Consultancy",
      articleRef: "",
      text: `The Second Party shall provide the First Party with the following consultancy services: ${scope}. The Second Party shall perform the work with full technical independence and by means of his/her own, in accordance with the professional expertise customarily recognised in this field, so as to achieve the intended objective of the consultancy.`,
    },
    {
      number: 6,
      title: "Contract Duration",
      articleRef: "",
      text: isFixedDuration
        ? (`**Contract type:** Fixed-term consultancy services — the **contract period** commences on ${startDate} and extends for ${durationTextEn(d.durationYears ?? 0, d.durationMonths ?? 0)}, expiring at the end of ${endDateStr}. The contract may be renewed by an express written agreement between the Parties.`)
        : (`**Contract type:** Indefinite-term consultancy services — the **contract period** commences on ${startDate} and continues unless either Party terminates the contract by written notice given at least one month prior to termination.`),
    },
    {
      number: 7,
      title: "Fees and Method of Payment",
      articleRef: "",
      text: `The First Party undertakes to pay the Second Party monthly fees of ${feesText}, payable ${d.salary.paymentMethod === "bank" ? "by transfer to the designated bank account" : "in cash on a working day in legal currency"}, once every month, upon submission by the Second Party of the monthly report or work accomplished statement. The Second Party shall bear alone any taxes due on his/her fees.` + (d.salary.allowances ? ` In addition to: ${d.salary.allowances}.` : ""),
    },
    {
      number: 8,
      title: "Independence of the Consultant",
      articleRef: "",
      text: `The Second Party shall perform the services with full independence in determining the manner, means, and timing of the work, without prejudice to the interest of the First Party, and shall not be subject to the labour rules and regulations of the First Party. The Second Party shall not receive any overtime pay, travel allowance, or accommodation allowance other than what is expressly agreed in this contract, and no employment or subordination relationship binds the Second Party to the First Party.`,
    },
    {
      number: 9,
      title: "Obligations of the Consultant",
      articleRef: "",
      text: `The Second Party undertakes to perform the services personally and with due professional care, to submit periodic reports on the accomplished work, to inform the First Party of any obstacles impeding the progress of the work, and to preserve the technical, commercial, and administrative secrets of the First Party and not to disclose or use them other than in the interest of the work even after the termination of this contract.`,
    },
    {
      number: 10,
      title: "Ownership of Works and Results",
      articleRef: "",
      text: `All works, studies, reports, and results prepared by the Second Party in execution of this contract shall vest in the First Party as its exclusive property. The Second Party may not dispose of them or benefit from them for the benefit of third parties without prior written consent of the First Party.`,
    },
    {
      number: 11,
      title: "Non-Competition and Dual Contracting",
      articleRef: "",
      text: `The Second Party undertakes, during the term of this contract, not to provide competing or equivalent consultancy services to any entity competing with the First Party in respect of the subject of this contract, and not to work for more than one entity on the same subject of contracting in a manner prejudicial to the interest of the First Party, within the agreed term and field.`,
    },
    {
      number: 12,
      title: "Termination of the Contract",
      articleRef: "",
      breakAfter: true,
      text: isFixedDuration
        ? `This contract shall terminate upon the expiry of the duration specified in Clause (6) above. The First Party may terminate it before expiry for a material reason by written notice allowing the Second Party at least thirty days to settle, in which case the Second Party shall be entitled to the fees for the work actually accomplished up to the date of termination.`
        : `Either Party may terminate this contract by notifying the other Party in writing at least one month in advance. The Second Party shall be entitled to the fees for the work actually accomplished up to the date of termination, and shall deliver to the First Party all works completed up to that date.`,
    },
    {
      number: 13,
      title: "Force Majeure",
      articleRef: "",
      text: `Neither Party shall be liable for non-performance of its obligations where such non-performance results from force majeure or unforeseen circumstances beyond its control, provided that the adversely affected Party notifies the other Party in writing within fifteen days from the date of its occurrence.`,
    },
    {
      number: 14,
      title: "Dispute Settlement",
      articleRef: "",
      text: `In the event of any dispute between the Parties regarding the performance or interpretation of this contract, amicable negotiation shall first be pursued; if no settlement is reached within thirty days, the dispute shall be referred to the competent court in the jurisdiction of the First Party's seat.`,
    },
    {
      number: 15,
      title: "Final Provisions",
      articleRef: "",
      text: `This contract is drawn up in the Arabic language in two original copies, each Party receiving one copy for execution. Its annexes, comprising all reports and the agreed technical scope, form an integral part hereof.`,
    },
  ];
}

/* ==============================================================
   Common helpers
   ============================================================== */
export function buildEnClausesFor(d: ContractData): EnClause[] {
  if (isTraining(d)) return buildEnTrainingClauses(d);
  if (isConsultant(d)) return buildEnConsultantClauses(d);
  return buildEnClauses(d);
}

export function party2LabelEn(d: ContractData): string {
  return isTraining(d) ? "Trainee" : isConsultant(d) ? "Consultant" : "Employee";
}

function hasOvertime(d: ContractData): boolean {
  return !!d.salary.hasOvertime && ((d.salary.overtimeDayHours ?? 0) > 0 || (d.salary.overtimeNightHours ?? 0) > 0);
}
