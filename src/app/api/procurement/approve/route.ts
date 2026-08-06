import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  ProcurementRequest,
  ManagerApproval,
  PurchaseOrder,
  AuditLog,
  Notification,
  AIWorkflowLog,
  DepartmentBudget
} from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { requestId, managerId, comments } = body;

    if (!requestId || !managerId) {
      return NextResponse.json(
        { success: false, error: "requestId and managerId are required." },
        { status: 400 }
      );
    }

    const request = await ProcurementRequest.findById(requestId);
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 }
      );
    }

    // 1. Update Request status to Approved
    request.currentStatus = "Approved";
    await request.save();

    // 2. Create ManagerApproval log
    await ManagerApproval.create({
      requestId,
      managerId,
      aiRecommendation: request.aiRecommendation || "Approve",
      decision: "Approved",
      comments: comments || "Approved based on AI evaluation recommendation."
    });

    // 3. Create AuditLog entry
    await AuditLog.create({
      requestId,
      actor: managerId,
      action: "Manager Approved",
      details: `Manager ${managerId} approved request ${request.requestNumber}. Comments: ${comments || "None"}`
    });

    // 4. Update Department Budget
    // Deduct estimated cost from department budget
    const employee = await connectDB().then(() =>
      require("@/lib/models").User.findOne({ employeeId: request.employeeId })
    );
    if (employee && employee.department) {
      const budget = await DepartmentBudget.findOne({ department: employee.department });
      if (budget) {
        budget.usedBudget += request.estimatedCost;
        budget.remainingBudget = budget.allocatedBudget - budget.usedBudget;
        await budget.save();
      }
    }

    // 5. Generate Purchase Order
    // Let's retrieve recommended vendor from Vendor Intelligence Agent logs if possible
    let recommendedVendorName = request.preferredVendor || "Dell Inc";
    try {
      const vendorLog = await AIWorkflowLog.findOne({
        requestId,
        agentName: "Vendor Intelligence Agent"
      });
      if (vendorLog && vendorLog.evidence) {
        const evidenceData = JSON.parse(vendorLog.evidence);
        if (evidenceData.recommendedVendor) {
          recommendedVendorName = evidenceData.recommendedVendor;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve vendor recommendation, using default preferredVendor.");
    }

    const poSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-2026-${poSuffix}`;
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 5); // 5 days delivery

    const po = await PurchaseOrder.create({
      requestId,
      vendorId: recommendedVendorName,
      poNumber,
      totalAmount: request.estimatedCost,
      expectedDelivery: expectedDeliveryDate,
      status: "Issued"
    });

    // 6. Update Request status to Purchase Ordered
    request.currentStatus = "Purchase Ordered";
    await request.save();

    // 7. Create Audit Log for PO
    await AuditLog.create({
      requestId,
      actor: "System",
      action: "Purchase Order Generated",
      details: `Generated Purchase Order ${poNumber} for vendor "${recommendedVendorName}" totaling ₹${request.estimatedCost}.`
    });

    // 8. Create system notification for employee
    await Notification.create({
      userId: request.employeeId,
      title: "Order Placed",
      description: `Your request ${request.requestNumber} has been approved, and Purchase Order ${poNumber} has been sent to ${recommendedVendorName}.`,
      type: "Success"
    });

    return NextResponse.json({
      success: true,
      message: "Request approved. Department budget updated and Purchase Order generated.",
      request,
      purchaseOrder: po
    });

  } catch (error: any) {
    console.error("Approve API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
