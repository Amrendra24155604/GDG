import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import * as models from "@/lib/models"; // Ensures all models are registered

export async function GET() {
  try {
    await connectDB();
    const collections = [
      { name: "User", label: "Users" },
      { name: "LeaveRequest", label: "Leave Requests" },
      { name: "ExpenseClaim", label: "Expense Reimbursement Claims" },
      { name: "ExpensePolicy", label: "Expense Policies" },
      { name: "ProcurementRequest", label: "Procurement Requests" },
      { name: "Asset", label: "Assets" },
      { name: "Vendor", label: "Vendors" },
      { name: "VendorQuotation", label: "Vendor Quotations" },
      { name: "DepartmentBudget", label: "Department Budgets" },
      { name: "ProcurementPolicy", label: "Procurement Policies" },
      { name: "AIWorkflowLog", label: "AI Workflow Logs" },
      { name: "ManagerApproval", label: "Manager Approvals" },
      { name: "Notification", label: "Notifications" },
      { name: "AuditLog", label: "Audit Logs" },
      { name: "PurchaseOrder", label: "Purchase Orders" },
      { name: "RequestAttachment", label: "Request Attachments" }
    ];
    return NextResponse.json({ success: true, collections });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { collectionName } = body;

    if (!collectionName) {
      return NextResponse.json(
        { success: false, error: "collectionName is required." },
        { status: 400 }
      );
    }

    const Model = mongoose.models[collectionName];
    if (!Model) {
      return NextResponse.json(
        { success: false, error: `Model for collection "${collectionName}" not registered.` },
        { status: 400 }
      );
    }

    const documents = await Model.find({}).sort({ createdAt: -1, updatedAt: -1 }).limit(100);

    return NextResponse.json({
      success: true,
      documents
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
