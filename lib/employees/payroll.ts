export type ApprovedDeduction = { amount: number; approved: boolean };
/** Final due amount for a period without ever mutating the employee's base salary. */
export function finalSalary(baseSalary: number, deductions: ApprovedDeduction[]) {
  const approved = deductions.filter((item) => item.approved).reduce((sum, item) => sum + item.amount, 0);
  return Math.max(0, baseSalary - approved);
}
