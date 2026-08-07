import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExpenseClaim, AuditLog } from "@/lib/models";
import { runExpenseWorkflow } from "@/lib/workflow";

// GET: List expense claims
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    
    const query = employeeId ? { employeeId } : {};
    const claims = await ExpenseClaim.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, claims });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Submit expense claim & trigger validation + multi-agent OCR/RAG workflow
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      employeeId,
      managerId,
      expenseType,
      amount,
      date,
      description,
      paymentMethod,
      receiptUrl,
      receiptFileName
    } = body;

    // 1. Request Validation (Step 2 of specification)
    if (!employeeId) {
      return NextResponse.json({ success: false, error: "Employee authentication missing." }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Please provide a valid expense amount." }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ success: false, error: "Expense date is required." }, { status: 400 });
    }
    if (!description || description.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Please provide a business description for this expense." }, { status: 400 });
    }
    if (!receiptUrl && !receiptFileName) {
      return NextResponse.json(
        { success: false, error: "⚠️ Receipt missing. Please upload receipt before submitting." },
        { status: 400 }
      );
    }

    const count = await ExpenseClaim.countDocuments();
    const claimNumber = `EXP-2026-${count + 1030}`;

    const newClaim = await ExpenseClaim.create({
      claimNumber,
      employeeId,
      managerId: managerId || "EMP-002",
      expenseType: expenseType || "Travel",
      amount: Number(amount),
      date: new Date(date),
      description,
      paymentMethod: paymentMethod || "Personal Card",
      receiptUrl: receiptUrl || "/uploads/receipt_sample.jpg",
      receiptFileName: receiptFileName || "receipt.jpg",
      currentStatus: "Submitted"
    });

    await AuditLog.create({
      requestId: newClaim._id,
      actor: employeeId,
      action: "Expense Submitted",
      details: `Submitted expense claim ${claimNumber} for ${expenseType} (₹${amount})`
    });

    // Trigger AI Agent Pipeline asynchronously
    runExpenseWorkflow(newClaim._id.toString()).catch((err) => {
      console.error(`Expense workflow error for ${newClaim._id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: "Expense claim submitted. Multi-agent OCR & RAG audit initiated.",
      claim: newClaim
    });

  } catch (error: any) {
    console.error("Create Expense API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
