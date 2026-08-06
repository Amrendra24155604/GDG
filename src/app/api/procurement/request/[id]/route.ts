import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProcurementRequest, User } from "@/lib/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const request = await ProcurementRequest.findById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 }
      );
    }

    // Join employee name for convenience
    const employee = await User.findOne({ employeeId: request.employeeId });
    const employeeName = employee ? employee.name : "Unknown Employee";

    return NextResponse.json({
      success: true,
      request,
      employeeName
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
