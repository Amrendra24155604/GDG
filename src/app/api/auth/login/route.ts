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

    // Special Check: Default Developer Account
    if (username === "Amrendra" && password === "Ankush@123") {
      return NextResponse.json({
        success: true,
        user: {
          employeeId: "DEV-001",
          name: "Amrendra",
          email: "amrendraky06@gmail.com",
          username: "Amrendra",
          role: "Developer",
          designation: "System Developer",
          department: "Engineering"
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
