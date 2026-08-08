import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username/Email and Password are required." },
        { status: 400 }
      );
    }

    // Permanent Default Accounts (Fail-safe credentials that never get deleted)
    if (username === "Ankush" && password === "Ankush@123") {
      return NextResponse.json({
        success: true,
        user: {
          employeeId: "EMP-001",
          name: "Ankush",
          email: "ankush@company.com",
          username: "Ankush",
          role: "Employee",
          designation: "Software Engineer",
          department: "AI Research",
          managerId: "EMP-002",
          leaveBalance: { casualLeave: 8, sickLeave: 10, earnedLeave: 14 }
        }
      });
    }

    if (username === "Raja babu" && password === "Ankush@123") {
      return NextResponse.json({
        success: true,
        user: {
          employeeId: "EMP-002",
          name: "Raja babu",
          email: "rajababu@company.com",
          username: "Raja babu",
          role: "Manager",
          designation: "Director of Engineering",
          department: "AI Research",
          managerId: "EMP-004",
          leaveBalance: { casualLeave: 15, sickLeave: 12, earnedLeave: 25 }
        }
      });
    }

    if (username === "Amrendra" && password === "Ankush@123") {
      return NextResponse.json({
        success: true,
        user: {
          employeeId: "EMP-DEV",
          name: "Amrendra",
          email: "amrendra@company.com",
          username: "Amrendra",
          role: "Developer",
          designation: "System Developer",
          department: "Engineering",
          managerId: "EMP-002"
        }
      });
    }

    // Otherwise, check database User collection
    const user = await User.findOne({
      $or: [
        { email: username },
        { username: username }
      ],
      password: password
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "This user account is inactive." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        username: user.username || "",
        role: user.role,
        designation: user.designation,
        department: user.department,
        managerId: user.managerId
      }
    });

  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
