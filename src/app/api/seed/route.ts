import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  User,
  Asset,
  Vendor,
  VendorQuotation,
  DepartmentBudget,
  ProcurementPolicy,
  ProcurementRequest,
  AIWorkflowLog,
  AuditLog,
  PurchaseOrder,
  Notification,
  LeaveRequest,
  ExpenseClaim,
  ExpensePolicy
} from "@/lib/models";

export async function GET() {
  try {
    await connectDB();

    // 1. Clear existing collections to start fresh
    await User.deleteMany({});
    await Asset.deleteMany({});
    await Vendor.deleteMany({});
    await VendorQuotation.deleteMany({});
    await DepartmentBudget.deleteMany({});
    await ProcurementPolicy.deleteMany({});
    // Clean logs/requests too so we have a clean slate
    await ProcurementRequest.deleteMany({});
    await LeaveRequest.deleteMany({});
    await ExpenseClaim.deleteMany({});
    await ExpensePolicy.deleteMany({});
    await AIWorkflowLog.deleteMany({});
    await AuditLog.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Notification.deleteMany({});

    // 2. Seed Users
    const users = await User.insertMany([
      {
        employeeId: "DEV-001",
        name: "Amrendra (Developer)",
        email: "developer@company.com",
        username: "Amrendra",
        password: "Ankush@123",
        role: "Developer",
        designation: "System Developer",
        department: "AI Research",
        managerId: "EMP-002",
        phone: "+1 (555) 019-2834",
        joiningDate: new Date("2024-01-01"),
        location: "Remote",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD67qBvL4iS69MlsQulPSKDPS0kYlmj3HR75uEPL6urgBgNo4-GvXZNeZvYZoBh0Owz_E493QbNkTRYyf2Py_tHaguvea1rTAkZM9AVAiuAoQyc51Oxbgu9DfpPpRFRRlHUr65CHSqpXuM4D-rXESLXpkxJNvpHX2hOrhSdJ8NbEdmVgIoV446puGskGQs_ii6oxeDfojw6hI6umW7P2BzMs1gQIJ9OxozSbWxuVTazugISI-IvHFRTNw",
        leaveBalance: { casualLeave: 12, sickLeave: 10, earnedLeave: 18 },
        isActive: true,
      },
      {
        employeeId: "EMP-001",
        name: "Amrendra Yadav",
        email: "amrendraky06@gmail.com",
        username: "employee",
        password: "password123",
        role: "Employee",
        designation: "AI Research Lead",
        department: "AI Research",
        managerId: "EMP-002",
        phone: "+1 (555) 019-2834",
        joiningDate: new Date("2022-03-15"),
        location: "San Francisco, CA",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD67qBvL4iS69MlsQulPSKDPS0kYlmj3HR75uEPL6urgBgNo4-GvXZNeZvYZoBh0Owz_E493QbNkTRYyf2Py_tHaguvea1rTAkZM9AVAiuAoQyc51Oxbgu9DfpPpRFRRlHUr65CHSqpXuM4D-rXESLXpkxJNvpHX2hOrhSdJ8NbEdmVgIoV446puGskGQs_ii6oxeDfojw6hI6umW7P2BzMs1gQIJ9OxozSbWxuVTazugISI-IvHFRTNw",
        leaveBalance: { casualLeave: 8, sickLeave: 10, earnedLeave: 14 },
        isActive: true,
      },
      {
        employeeId: "EMP-002",
        name: "Sarah Jenkins",
        email: "manager@company.com",
        username: "manager",
        password: "password123",
        role: "Manager",
        designation: "Director of Engineering",
        department: "AI Research",
        managerId: "EMP-004",
        phone: "+1 (555) 014-9988",
        joiningDate: new Date("2019-06-01"),
        location: "San Francisco, CA",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        leaveBalance: { casualLeave: 15, sickLeave: 12, earnedLeave: 25 },
        isActive: true,
      },
      {
        employeeId: "EMP-003",
        name: "David Chen",
        email: "procure@company.com",
        username: "procure",
        password: "password123",
        role: "Procurement",
        designation: "Lead Procurement Officer",
        department: "Procurement",
        managerId: "EMP-004",
        phone: "+1 (555) 012-3456",
        joiningDate: new Date("2021-01-10"),
        location: "Chicago, IL",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
        leaveBalance: { casualLeave: 10, sickLeave: 10, earnedLeave: 15 },
        isActive: true,
      },
      {
        employeeId: "EMP-004",
        name: "Alice Vance",
        email: "admin@company.com",
        username: "admin",
        password: "password123",
        role: "Admin",
        designation: "VP of Operations",
        department: "Operations",
        managerId: "",
        phone: "+1 (555) 011-0022",
        joiningDate: new Date("2017-08-15"),
        location: "New York, NY",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
        leaveBalance: { casualLeave: 20, sickLeave: 15, earnedLeave: 30 },
        isActive: true,
      },
      {
        employeeId: "EMP-005",
        name: "Priya Sharma",
        email: "priya.sharma@company.com",
        username: "priya",
        password: "password123",
        role: "Employee",
        designation: "Frontend Engineer",
        department: "AI Research",
        managerId: "EMP-002",
        phone: "+1 (555) 018-7744",
        joiningDate: new Date("2023-09-01"),
        location: "Austin, TX",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
        leaveBalance: { casualLeave: 6, sickLeave: 8, earnedLeave: 10 },
        isActive: true,
      },
      {
        employeeId: "EMP-006",
        name: "Marcus Vance",
        email: "marcus.vance@company.com",
        username: "marcus",
        password: "password123",
        role: "Employee",
        designation: "Data Scientist",
        department: "Product Analytics",
        managerId: "EMP-002",
        phone: "+1 (555) 017-3311",
        joiningDate: new Date("2024-02-01"),
        location: "Seattle, WA",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
        leaveBalance: { casualLeave: 5, sickLeave: 12, earnedLeave: 12 },
        isActive: true,
      }
    ]);

    // 3. Seed Assets
    const assets = await Asset.insertMany([
      {
        assetId: "AST-101",
        assetName: "Dell UltraSharp 27 Monitor",
        category: "Monitor",
        serialNumber: "CN-0XX739-74445-98G-091L",
        assignedTo: "",
        department: "AI Research",
        purchaseDate: new Date("2025-01-10"),
        warrantyExpiry: new Date("2028-01-10"),
        condition: "New",
        status: "Available"
      },
      {
        assetId: "AST-102",
        assetName: "HP EliteBook 840 G8",
        category: "Laptop",
        serialNumber: "5CG1248FGT",
        assignedTo: "EMP-001",
        department: "AI Research",
        purchaseDate: new Date("2022-04-01"),
        warrantyExpiry: new Date("2025-04-01"),
        condition: "Fair",
        status: "Assigned"
      },
      {
        assetId: "AST-103",
        assetName: "Apple MacBook Pro 14",
        category: "Laptop",
        serialNumber: "C02F9983Q05D",
        assignedTo: "EMP-002",
        department: "AI Research",
        purchaseDate: new Date("2024-02-15"),
        warrantyExpiry: new Date("2027-02-15"),
        condition: "Good",
        status: "Assigned"
      },
      {
        assetId: "AST-104",
        assetName: "Steelcase Gesture Ergonomic Chair",
        category: "Furniture",
        serialNumber: "SCG-8874-902",
        assignedTo: "",
        department: "Facilities",
        purchaseDate: new Date("2023-11-20"),
        condition: "Good",
        status: "Available"
      },
      {
        assetId: "AST-105",
        assetName: "Apple MacBook Air M2 (Unassigned Stock)",
        category: "Laptop",
        serialNumber: "C02G1122M201",
        assignedTo: "",
        department: "AI Research",
        purchaseDate: new Date("2025-03-01"),
        warrantyExpiry: new Date("2028-03-01"),
        condition: "New",
        status: "Available"
      },
      {
        assetId: "AST-106",
        assetName: "LG 34-inch UltraWide Curved Monitor",
        category: "Monitor",
        serialNumber: "LG34UW-99812",
        assignedTo: "",
        department: "Product Analytics",
        purchaseDate: new Date("2024-10-10"),
        warrantyExpiry: new Date("2027-10-10"),
        condition: "Good",
        status: "Available"
      }
    ]);

    // 4. Seed Vendors
    const vendors = await Vendor.insertMany([
      {
        vendorName: "Dell Inc",
        email: "sales@dell.com",
        phone: "+1 (800) 456-3355",
        address: "One Dell Way, Round Rock, TX 78682",
        gstNumber: "GST-DELL-998822",
        rating: 4.8,
        averageDeliveryDays: 5,
        warrantySupport: true,
        approved: true,
        products: ["Laptop", "Monitor", "Server", "Desktop"]
      },
      {
        vendorName: "HP Store",
        email: "enterprise-sales@hp.com",
        phone: "+1 (800) 752-0900",
        address: "1501 Page Mill Rd, Palo Alto, CA 94304",
        gstNumber: "GST-HP-445566",
        rating: 4.3,
        averageDeliveryDays: 7,
        warrantySupport: true,
        approved: true,
        products: ["Laptop", "Monitor", "Printer"]
      },
      {
        vendorName: "Apple Enterprise",
        email: "business@apple.com",
        phone: "+1 (800) 854-3680",
        address: "One Apple Park Way, Cupertino, CA 95014",
        gstNumber: "GST-APPLE-112233",
        rating: 4.9,
        averageDeliveryDays: 3,
        warrantySupport: true,
        approved: true,
        products: ["Laptop", "Tablet", "Phone", "Monitor"]
      },
      {
        vendorName: "Lenovo Direct",
        email: "commercial@lenovo.com",
        phone: "+1 (800) 426-7378",
        address: "1009 Think Place, Morrisville, NC 27560",
        gstNumber: "GST-LENOVO-883311",
        rating: 4.5,
        averageDeliveryDays: 4,
        warrantySupport: true,
        approved: true,
        products: ["Laptop", "Desktop", "Monitor"]
      },
      {
        vendorName: "Blacklisted Hardware",
        email: "scam@shadyhardware.com",
        phone: "+1 (800) 999-6666",
        address: "Shady Street 42, Las Vegas, NV",
        gstNumber: "GST-SHADY-0000",
        rating: 1.2,
        averageDeliveryDays: 30,
        warrantySupport: false,
        approved: false,
        products: ["Laptop"]
      }
    ]);

    // 5. Seed Vendor Quotations
    const quotations = await VendorQuotation.insertMany([
      {
        vendorId: "Dell Inc",
        itemName: "Dell Precision 5680 Workstation",
        specification: "Intel Core i9-13900H, 64GB DDR5, 1TB NVMe SSD, Nvidia RTX 4000 Ada (12GB), 16\" UHD+ Screen",
        price: 199920,
        currency: "INR",
        deliveryDays: 5,
        warranty: "3 Years ProSupport Next Business Day Onsite",
        quotationDocument: "http://example.com/quotations/dell_precision_2499.pdf"
      },
      {
        vendorId: "Dell Inc",
        itemName: "Dell UltraSharp 27 4K Monitor",
        specification: "27\" 4K UHD (3840 x 2160), IPS Black, 100% sRGB, USB-C Hub (90W PD)",
        price: 39920,
        currency: "INR",
        deliveryDays: 4,
        warranty: "3 Years Advanced Exchange Service",
        quotationDocument: "http://example.com/quotations/dell_ultrasharp_499.pdf"
      },
      {
        vendorId: "HP Store",
        itemName: "HP ZBook Power G10",
        specification: "AMD Ryzen 7 7840HS, 32GB RAM, 1TB SSD, Nvidia RTX A1000 (6GB), 15.6\" FHD Screen",
        price: 175920,
        currency: "INR",
        deliveryDays: 7,
        warranty: "3 Years parts and labor warranty",
        quotationDocument: "http://example.com/quotations/hp_zbook_2199.pdf"
      },
      {
        vendorId: "Apple Enterprise",
        itemName: "MacBook Pro 16 M3 Max",
        specification: "Apple M3 Max (14-Core CPU, 30-Core GPU), 48GB Unified Memory, 1TB SSD, 16.2\" Liquid Retina XDR",
        price: 279920,
        currency: "INR",
        deliveryDays: 3,
        warranty: "1 Year Limited Warranty (AppleCare+ not included)",
        quotationDocument: "http://example.com/quotations/macbook_pro_3499.pdf"
      },
      {
        vendorId: "Lenovo Direct",
        itemName: "ThinkPad P1 Gen 6",
        specification: "Intel Core i7-13800H, 32GB DDR5, 1TB SSD, Nvidia RTX 2000 Ada, 16\" WQXGA 165Hz",
        price: 189900,
        currency: "INR",
        deliveryDays: 4,
        warranty: "3 Years Premier Support",
        quotationDocument: "http://example.com/quotations/lenovo_p1.pdf"
      },
      {
        vendorId: "Blacklisted Hardware",
        itemName: "Cheap Replica Laptop",
        specification: "Intel Core i7 (Gen 4), 8GB RAM, 256GB Refurbished HDD",
        price: 159920,
        currency: "INR",
        deliveryDays: 20,
        warranty: "None",
        quotationDocument: "http://example.com/quotations/shady_deal.pdf"
      }
    ]);

    // 6. Seed Department Budgets
    const budgets = await DepartmentBudget.insertMany([
      {
        department: "AI Research",
        fiscalYear: "2026",
        allocatedBudget: 12000000,
        usedBudget: 2800000,
        remainingBudget: 9200000
      },
      {
        department: "Product Analytics",
        fiscalYear: "2026",
        allocatedBudget: 8000000,
        usedBudget: 7500000,
        remainingBudget: 500000 // Low remaining budget edge case!
      },
      {
        department: "Operations",
        fiscalYear: "2026",
        allocatedBudget: 6400000,
        usedBudget: 2000000,
        remainingBudget: 4400000
      },
      {
        department: "Procurement",
        fiscalYear: "2026",
        allocatedBudget: 2400000,
        usedBudget: 640000,
        remainingBudget: 1760000
      }
    ]);

    // 7. Seed Procurement Policies (Handling Edge Cases)
    const policies = await ProcurementPolicy.insertMany([
      {
        policyName: "Standard IT Asset Policy",
        category: "Laptop",
        description: "Laptops above ₹1,20,000 require business justification. Laptops above ₹2,40,000 require multi-vendor quotation comparison. All laptops must be procured from approved IT vendors (Dell Inc, HP Store, Apple Enterprise, Lenovo Direct). Max single purchase cap is ₹4,00,000.",
        minRole: "Employee",
        maxBudget: 400000,
        requiresQuotation: true,
        approvalLevels: 1,
        allowedVendors: ["Dell Inc", "HP Store", "Apple Enterprise", "Lenovo Direct"]
      },
      {
        policyName: "Workspace Display Policy",
        category: "Monitor",
        description: "Standard monitors must be under ₹96,000 and purchased from approved display vendors (Dell Inc, HP Store, Apple Enterprise).",
        minRole: "Employee",
        maxBudget: 96000,
        requiresQuotation: false,
        approvalLevels: 1,
        allowedVendors: ["Dell Inc", "HP Store", "Apple Enterprise"]
      },
      {
        policyName: "Special Ergonomic Furniture Policy",
        category: "Furniture",
        description: "Furniture purchases must be under ₹1,60,000 and require Operations team clearance.",
        minRole: "Manager",
        maxBudget: 160000,
        requiresQuotation: true,
        approvalLevels: 2,
        allowedVendors: ["Steelcase Office Supplies"]
      },
      {
        policyName: "Software & SaaS Licensing Policy",
        category: "Software",
        description: "Software licenses up to ₹1,50,000 can be ordered by Employees. SaaS orders above ₹1,50,000 require 2-tier Manager & Security review.",
        minRole: "Employee",
        maxBudget: 250000,
        requiresQuotation: false,
        approvalLevels: 2,
        allowedVendors: ["Microsoft", "AWS Direct", "JetBrains", "GitHub"]
      },
      {
        policyName: "Cloud Infrastructure Policy",
        category: "Cloud Credits",
        description: "Cloud compute credit purchases up to ₹5,00,000 allowed for AI Research department with manager approval.",
        minRole: "Employee",
        maxBudget: 500000,
        requiresQuotation: true,
        approvalLevels: 2,
        allowedVendors: ["AWS Direct", "Google Cloud", "Microsoft Azure"]
      }
    ]);

    // 8. Seed Comprehensive Expense Policies (Handling Edge Cases)
    await ExpensePolicy.insertMany([
      {
        category: "Travel",
        maxLimitPerTrip: 2000,
        monthlyLimit: 25000,
        receiptRequired: true,
        allowedRoles: ["Employee", "Manager", "Admin"],
        description: "Taxi, Rideshare, and Local Transit Reimbursement Policy",
        rules: [
          "Maximum ₹2,000 per trip allowed for local taxi/rideshare (Uber/Ola/Lyft)",
          "Itemized valid receipt image or PDF is mandatory",
          "Business purpose (e.g. client visit, site commute, inter-office travel) must be clearly stated",
          "Personal weekend travel expenses are strictly non-reimbursable",
          "Claims submitted >30 days after trip date are subject to audit penalty"
        ]
      },
      {
        category: "Meals & Client Entertainment",
        maxLimitPerTrip: 3500,
        monthlyLimit: 30000,
        receiptRequired: true,
        allowedRoles: ["Employee", "Manager", "Admin"],
        description: "Client & Team Dining Reimbursement Policy",
        rules: [
          "Maximum ₹3,500 per dining expense for client meetings or team lunches",
          "Receipt with itemized tax invoice is required",
          "Attendee names and business discussion summary must be provided",
          "Alcoholic beverages are non-reimbursable unless pre-approved by VP"
        ]
      },
      {
        category: "Cloud / Software",
        maxLimitPerTrip: 10000,
        monthlyLimit: 50000,
        receiptRequired: true,
        allowedRoles: ["Employee", "Manager", "Admin"],
        description: "SaaS Subscriptions & Developer Cloud Infrastructure Policy",
        rules: [
          "Development & Infrastructure cloud charges up to ₹10,000 per transaction allowed",
          "Official billing receipt / invoice required",
          "Infrastructure must be tied directly to active company projects",
          "Personal subscriptions (Spotify, Netflix, personal GitHub) are strictly prohibited"
        ]
      },
      {
        category: "Office Supplies & Equipment",
        maxLimitPerTrip: 5000,
        monthlyLimit: 15000,
        receiptRequired: true,
        allowedRoles: ["Employee", "Manager", "Admin"],
        description: "Remote Office Supplies & Peripheral Policy",
        rules: [
          "Small peripherals (cables, keyboards, mice, adapters) up to ₹5,000 claimable",
          "Merchant receipt image mandatory",
          "Items above ₹5,000 must go through Procurement Workflow"
        ]
      }
    ]);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      seededCounts: {
        users: users.length,
        assets: assets.length,
        vendors: vendors.length,
        quotations: quotations.length,
        budgets: budgets.length,
        policies: policies.length
      }
    });
  } catch (error: any) {
    console.error("Seeding Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
