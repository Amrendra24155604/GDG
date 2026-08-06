import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, AuditLog } from "@/lib/models";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      email,
      username,
      password,
      name,
      role,
      designation,
      department,
      managerId,
      phone,
      location
    } = body;

    if (!email || !username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "Email, Username, Password, Name and Role are required fields." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "A user with this Email or Username already exists." },
        { status: 400 }
      );
    }

    // Generate unique employeeId
    const count = await User.countDocuments();
    const employeeId = `EMP-0${count + 1}-${Math.floor(100 + Math.random() * 900)}`;

    // Create user
    const newUser = await User.create({
      employeeId,
      name,
      email,
      username,
      password,
      role,
      designation: designation || "Staff",
      department: department || "Operations",
      managerId: managerId || "EMP-002",
      phone: phone || "",
      location: location || "Remote",
      isActive: true
    });

    // Write to Audit Log
    await AuditLog.create({
      requestId: "N/A",
      actor: "Developer",
      action: "User Provisioned",
      details: `Provisioned user "${name}" (Role: ${role}, ID: ${employeeId}).`
    });

    // Send Email to the user email using Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Procurement System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Procurement Portal Account Credentials",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1a1c1c; border-bottom: 2px solid #eeeeee; padding-bottom: 10px;">Account Provisioned</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your corporate account has been successfully provisioned on the Procurement Portal.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace;">
              <p style="margin: 5px 0;"><strong>Portal URL:</strong> http://localhost:3000</p>
              <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
              <p style="margin: 5px 0;"><strong>Email ID:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <span style="background-color: #333; color: #333; padding: 2px 4px; border-radius: 3px;" onclick="this.style.backgroundColor='transparent'; this.style.color='#000';">${password}</span> <span style="font-size: 11px; color: #666;">(click black box to reveal)</span></p>
            </div>
            <p><strong>Designation:</strong> ${designation || "Staff"}</p>
            <p><strong>Role assigned:</strong> ${role}</p>
            <p>Please log in and update your security details if required.</p>
            <p style="font-size: 11px; color: #999; border-top: 1px solid #eeeeee; padding-top: 15px; margin-top: 20px;">
              This is an automated message sent by the developer provisioning engine.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Notification email sent to: ${email}`);
    } catch (emailError: any) {
      console.error("Nodemailer Error sending email:", emailError);
      // We don't fail the user creation if email fails, but return a warning in response
      return NextResponse.json({
        success: true,
        message: "User created in database, but email notification failed to send.",
        warning: emailError.message,
        user: newUser
      });
    }

    return NextResponse.json({
      success: true,
      message: "User successfully created and credentials email dispatched.",
      user: newUser
    });

  } catch (error: any) {
    console.error("Create User API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
