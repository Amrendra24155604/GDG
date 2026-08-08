import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExpenseClaim, AuditLog, Notification } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json(
        { success: false, error: "claimId is required." },
        { status: 400 }
      );
    }

    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) {
      return NextResponse.json(
        { success: false, error: "Expense claim not found." },
        { status: 404 }
      );
    }

    const validPendingStatuses = ["Submitted", "AI Processing", "Pending Manager"];
    if (!validPendingStatuses.includes(claim.currentStatus)) {
      return NextResponse.json(
        { success: false, error: `Only pending expense claims can be withdrawn. Current status is '${claim.currentStatus}'.` },
        { status: 400 }
      );
    }

    // Update status to Withdrawn
    claim.currentStatus = "Withdrawn";
    await claim.save();

    // Audit Log
    await AuditLog.create({
      requestId: claim._id,
      actor: claim.employeeId,
      action: "Expense Claim Withdrawn",
      details: `Employee ${claim.employeeId} withdrew expense claim ${claim.claimNumber} for ₹${claim.amount}.`
    });

    // Notifications
    await Notification.create({
      userId: claim.employeeId,
      title: "Expense Claim Withdrawn",
      description: `Your expense claim ${claim.claimNumber} (₹${claim.amount}) has been successfully withdrawn.`,
      type: "Info"
    });

    if (claim.managerId) {
      await Notification.create({
        userId: claim.managerId,
        title: "Expense Claim Withdrawn by Employee",
        description: `Expense claim ${claim.claimNumber} was withdrawn by ${claim.employeeId}.`,
        type: "Info"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Expense claim withdrawn successfully.",
      claim
    });

  } catch (error: any) {
    console.error("Expense Withdraw Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
