import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma/db";
import { getCurrentUser } from "@/lib/auth/current-user";
const schema=z.object({date:z.coerce.date(),reason:z.string().min(2),source:z.enum(["LATE","ABSENT","UNPAID_LEAVE","INACTIVE","OTHER"]),amount:z.number().positive(),salaryPeriod:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),notes:z.string().optional(),confirm:z.literal(true)});
type Params={params:Promise<{id:string}>};
export async function GET(_r:Request,{params}:Params){const u=await getCurrentUser();if(!u)return NextResponse.json({success:false},{status:401});const {id}=await params;return NextResponse.json({success:true,data:await db.salaryDeduction.findMany({where:{companyId:u.companyId,employeeId:id},orderBy:{date:"desc"}})});}
export async function POST(req:NextRequest,{params}:Params){const u=await getCurrentUser();if(!u)return NextResponse.json({success:false},{status:401});const p=schema.safeParse(await req.json());if(!p.success)return NextResponse.json({success:false,message:"Confirmation and valid deduction data are required"},{status:400});const {id}=await params;const employee=await db.employee.findFirst({where:{id,companyId:u.companyId}});if(!employee)return NextResponse.json({success:false},{status:404});const {confirm:_,...input}=p.data;void _;const data=await db.salaryDeduction.create({data:{...input,companyId:u.companyId,employeeId:id,createdById:u.id}});return NextResponse.json({success:true,data},{status:201});}
