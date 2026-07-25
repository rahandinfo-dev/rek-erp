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
    ])
    .optional(),
  phone: z.string().optional().nullable(),
  email: z
    .union([
      z.string().email("ئیمەیڵ دروست نییە."),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  address: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  role: z.enum(employeeRoles).default("STAFF"),
  status: z.enum(employeeStatuses).default("ACTIVE"),
  monthlySalary: z.number().nonnegative().default(0),
  nextSalaryDate: z.string().optional().nullable(),
  dateJoined: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const attendanceSchema = z.object({
  date: z.string().min(1, "بەروار پێویستە."),
  status: z.enum(attendanceStatuses),
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
  notes: z.string().optional().nullable(),
});

export const employeeStatusSchema = z.object({
  status: z.enum(employeeStatuses),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
