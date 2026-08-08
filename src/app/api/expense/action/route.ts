import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExpenseClaim, AuditLog, ManagerApproval } from "@/lib/models";

// POST: Manager action for Expense Claim (Approve, Reject, Clarify, Payment Processed)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { claimId, managerId, action, comments, rejectionReason } = body;

    if (!claimId || !action) {
      return NextResponse.json({ success: false, error: "claimId and action are required." }, { status: 400 });
    }

    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) {
      return NextResponse.json({ success: false, error: "Expense claim not found." }, { status: 404 });
    }

    let newStatus = claim.currentStatus;
    let auditAction = "";

    if (action === "Approve") {
      newStatus = "Payment Processing";
      auditAction = "Expense Approved by Manager";
    } else if (action === "Reject") {
      newStatus = "Rejected";
      auditAction = "Expense Rejected by Manager";
    } else if (action === "Clarify") {
      newStatus = "Clarification Requested";
      auditAction = "Manager Requested Expense Clarification";
    } else if (action === "CompletePayment") {
      newStatus = "Payment Completed";
      auditAction = "Finance Reimbursement Payment Completed";
    }

    const updatedClaim = await ExpenseClaim.findByIdAndUpdate(
      claimId,
      {
        currentStatus: newStatus,
        managerComments: comments || claim.managerComments,
        rejectionReason: rejectionReason || claim.rejectionReason
      },
      { new: true }
    );

    // Record Manager Approval / Decision entry
    await ManagerApproval.create({
      requestId: claimId,
      managerId: managerId || "EMP-002",
      aiRecommendation: claim.aiRecommendation || "APPROVE",
      decision: action,
      comments: comments || rejectionReason
    });

    // Record Audit Log
    await AuditLog.create({
      requestId: claimId,
      actor: managerId || "EMP-002",
      action: auditAction,
      details: `Action: ${action}. Status changed to ${newStatus}. ${comments ? `Comments: ${comments}` : ""}`
    });

    return NextResponse.json({
      success: true,
      message: `Expense claim status updated to ${newStatus}.`,
      claim: updatedClaim
    });

  } catch (error: any) {
    console.error("Expense Action API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
