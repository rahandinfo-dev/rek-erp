import { z } from "zod";

export const employeeRoles = [
  "ADMIN",
  "MANAGER",
  "STAFF",
  "ACCOUNTANT",
  "HR",
  "OTHER",
] as const;

export const employeeStatuses = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ON_LEAVE",
  "ABSENT",
  "LATE",
  "TERMINATED",
] as const;

export const attendanceStatuses = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "HALF_DAY",
] as const;

export const leaveTypes = [
  "ANNUAL",
  "SICK",
  "UNPAID",
  "MATERNITY",
  "OTHER",
] as const;

export const leaveRequestStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

export const salaryStatuses = ["PENDING", "PAID", "CANCELLED"] as const;

export const employeeSchema = z.object({
  photo: z.string().optional().nullable(),
  fullName: z.string().min(2, "ناوی تەواو پێویستە."),
  username: z
    .union([
      z.literal(""),
      z
        .string()
        .min(2, "ناوی بەکارهێنەر پێویستە.")
        .regex(/^[a-zA-Z0-9._-]+$/, "ناوی بەکارهێنەر نادروستە."),
    ]),
  phone: z.string().min(7, "ژمارەی مۆبایل پێویستە."),
  email: z
    .union([
      z.string().email("ئیمەیڵ دروست نییە."),
      z.literal(""),
    ])
    .optional(),
  address: z.string().min(2, "ناونیشان پێویستە."),
  nationalId: z.string().optional().nullable(),
  nationalIdImage: z.string().optional().nullable(),
  position: z.string().min(2, "ناونیشانی کار پێویستە."),
  department: z.string().optional().nullable(),
  role: z.enum(employeeRoles).default("STAFF"),
  status: z.enum(employeeStatuses).default("ACTIVE"),
  monthlySalary: z.number().nonnegative(),
  salaryCurrency: z.string().min(3).max(3).default("IQD"),
  salaryDueDay: z.number().int().min(1).max(28).default(1),
  nextSalaryDate: z.string().optional().nullable(),
  dateJoined: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const attendanceSchema = z.object({
  date: z.string().min(1, "بەروار پێویستە."),
  status: z.enum(attendanceStatuses),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  lateMinutes: z.number().int().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export const leaveRequestSchema = z.object({
  leaveType: z.enum(leaveTypes),
  reason: z.string().optional().nullable(),
  startDate: z.string().min(1, "بەرواری دەستپێک پێویستە."),
  endDate: z.string().min(1, "بەرواری کۆتایی پێویستە."),
});

export const leaveStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const salarySchema = z.object({
  amount: z.number().positive("بڕی مووچە پێویستە."),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  paymentDate: z.string().optional().nullable(),
  nextSalaryDate: z.string().optional().nullable(),
  status: z.enum(salaryStatuses).default("PENDING"),
  remainingAmount: z.number().nonnegative().default(0),
  currency: z.string().min(3).max(3).default("IQD"),
  paymentMethod: z.enum(["CASH","CARD","TRANSFER","CREDIT","DIGITAL","OTHER"]).default("CASH"),
  notes: z.string().optional().nullable(),
});

export const employeeStatusSchema = z.object({
  status: z.enum(employeeStatuses),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
