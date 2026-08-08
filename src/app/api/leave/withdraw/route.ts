import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { LeaveRequest, AuditLog, Notification } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "requestId is required." },
        { status: 400 }
      );
    }

    const leaveReq = await LeaveRequest.findById(requestId);
    if (!leaveReq) {
      return NextResponse.json(
        { success: false, error: "Leave request not found." },
        { status: 404 }
      );
    }

    const validPendingStatuses = ["Submitted", "AI Processing", "Pending Manager"];
    if (!validPendingStatuses.includes(leaveReq.currentStatus)) {
      return NextResponse.json(
        { success: false, error: `Only pending leave requests can be withdrawn. Current status is '${leaveReq.currentStatus}'.` },
        { status: 400 }
      );
    }

    // Update status to Withdrawn
    leaveReq.currentStatus = "Withdrawn";
    await leaveReq.save();

    // Audit Log
    await AuditLog.create({
      requestId: leaveReq._id.toString(),
      actor: leaveReq.employeeId,
      action: "Leave Request Withdrawn",
      details: `Employee ${leaveReq.employeeId} withdrew ${leaveReq.leaveType} request (${leaveReq.leaveNumber}).`
    });

    // Notifications
    await Notification.create({
      userId: leaveReq.employeeId,
      title: "Leave Request Withdrawn",
      description: `Your ${leaveReq.leaveType} request (${leaveReq.leaveNumber}) has been successfully withdrawn.`,
      type: "Info"
    });

    if (leaveReq.managerId) {
      await Notification.create({
        userId: leaveReq.managerId,
        title: "Leave Request Withdrawn by Employee",
        description: `${leaveReq.employeeId} withdrew leave request (${leaveReq.leaveNumber}).`,
        type: "Info"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Leave request withdrawn successfully.",
      request: leaveReq
    });

  } catch (error: any) {
    console.error("Leave Withdraw Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
