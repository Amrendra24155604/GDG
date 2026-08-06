import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DepartmentBudget } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const budgets = await DepartmentBudget.find({});
    return NextResponse.json({ success: true, budgets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
