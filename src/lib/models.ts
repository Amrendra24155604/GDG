import mongoose, { Schema, Document, Model } from "mongoose";

// Helper to prevent re-compilation of models in Next.js development mode
function getModel<T>(modelName: string, schema: Schema): Model<T> {
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName] as Model<T>;
  }
  return mongoose.model<T>(modelName, schema);
}

// 1. User Schema
export interface IUser extends Document {
  employeeId: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: string;
  designation: string;
  department: string;
  managerId: string;
  phone: string;
  joiningDate: Date;
  location: string;
  avatar: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    password: { type: String },
    role: { type: String, required: true }, // "Employee", "Manager", "Procurement", "Admin"
    designation: { type: String, required: true },
    department: { type: String, required: true },
    managerId: { type: String },
    phone: { type: String },
    joiningDate: { type: Date, default: Date.now },
    location: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const User = getModel<IUser>("User", UserSchema);

// 2. ProcurementRequest Schema
export interface IProcurementRequest extends Document {
  requestNumber: string;
  employeeId: string;
  managerId: string;
  itemName: string;
  category: string;
  quantity: number;
  justification: string;
  specifications?: string;
  priority: string;
  preferredVendor: string;
  estimatedCost: number;
  currentStatus: string;
  aiRecommendation?: string;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
}
const ProcurementRequestSchema = new Schema<IProcurementRequest>(
  {
    requestNumber: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    managerId: { type: String },
    itemName: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    justification: { type: String },
    specifications: { type: String },
    priority: { type: String, default: "Medium" }, // "Low", "Medium", "High", "Critical"
    preferredVendor: { type: String },
    estimatedCost: { type: Number, required: true, default: 0 },
    currentStatus: { type: String, default: "Submitted" }, 
    // "Draft", "Submitted", "AI Processing", "Pending Manager", "Approved", "Rejected", "Purchase Ordered", "Delivered"
    aiRecommendation: { type: String }, // "Approve", "Reject", "Need Review"
    confidence: { type: Number }, // 0 to 100
  },
  { timestamps: true }
);
export const ProcurementRequest = getModel<IProcurementRequest>("ProcurementRequest", ProcurementRequestSchema);

// 3. RequestAttachment Schema
export interface IRequestAttachment extends Document {
  requestId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  extractedText?: string;
  uploadedAt: Date;
}
const RequestAttachmentSchema = new Schema<IRequestAttachment>({
  requestId: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String },
  fileUrl: { type: String, required: true },
  extractedText: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});
export const RequestAttachment = getModel<IRequestAttachment>("RequestAttachment", RequestAttachmentSchema);

// 4. Asset Schema
export interface IAsset extends Document {
  assetId: string;
  assetName: string;
  category: string;
  serialNumber: string;
  assignedTo?: string; // employeeId
  department: string;
  purchaseDate: Date;
  warrantyExpiry?: Date;
  condition: string;
  status: string; // "Available", "Assigned", "Under Repair", "Retired", "Lost"
}
const AssetSchema = new Schema<IAsset>({
  assetId: { type: String, required: true, unique: true },
  assetName: { type: String, required: true },
  category: { type: String, required: true },
  serialNumber: { type: String },
  assignedTo: { type: String },
  department: { type: String },
  purchaseDate: { type: Date, default: Date.now },
  warrantyExpiry: { type: Date },
  condition: { type: String, default: "New" }, // "New", "Good", "Fair", "Poor"
  status: { type: String, default: "Available" },
});
export const Asset = getModel<IAsset>("Asset", AssetSchema);

// 5. Vendor Schema
export interface IVendor extends Document {
  vendorName: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
  rating: number;
  averageDeliveryDays: number;
  warrantySupport: boolean;
  approved: boolean;
  products: string[];
}
const VendorSchema = new Schema<IVendor>({
  vendorName: { type: String, required: true, unique: true },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  rating: { type: Number, default: 4.0 },
  averageDeliveryDays: { type: Number, default: 7 },
  warrantySupport: { type: Boolean, default: true },
  approved: { type: Boolean, default: true },
  products: [{ type: String }],
});
export const Vendor = getModel<IVendor>("Vendor", VendorSchema);

// 6. VendorQuotation Schema
export interface IVendorQuotation extends Document {
  vendorId: string; // references Vendor.name or string identifier
  itemName: string;
  specification: string;
  price: number;
  currency: string;
  deliveryDays: number;
  warranty: string;
  quotationDocument?: string;
  uploadedAt: Date;
}
const VendorQuotationSchema = new Schema<IVendorQuotation>({
  vendorId: { type: String, required: true },
  itemName: { type: String, required: true },
  specification: { type: String },
  price: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  deliveryDays: { type: Number, default: 5 },
  warranty: { type: String },
  quotationDocument: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});
export const VendorQuotation = getModel<IVendorQuotation>("VendorQuotation", VendorQuotationSchema);

// 7. DepartmentBudget Schema
export interface IDepartmentBudget extends Document {
  department: string;
  fiscalYear: string;
  allocatedBudget: number;
  usedBudget: number;
  remainingBudget: number;
}
const DepartmentBudgetSchema = new Schema<IDepartmentBudget>({
  department: { type: String, required: true, unique: true },
  fiscalYear: { type: String, required: true },
  allocatedBudget: { type: Number, required: true, default: 0 },
  usedBudget: { type: Number, required: true, default: 0 },
  remainingBudget: { type: Number, required: true, default: 0 },
});
export const DepartmentBudget = getModel<IDepartmentBudget>("DepartmentBudget", DepartmentBudgetSchema);

// 8. ProcurementPolicy Schema
export interface IProcurementPolicy extends Document {
  policyName: string;
  category: string;
  description: string;
  minRole: string;
  maxBudget: number;
  requiresQuotation: boolean;
  approvalLevels: number;
  allowedVendors: string[];
  updatedAt: Date;
}
const ProcurementPolicySchema = new Schema<IProcurementPolicy>({
  policyName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  minRole: { type: String, default: "Employee" },
  maxBudget: { type: Number, default: 1000 },
  requiresQuotation: { type: Boolean, default: false },
  approvalLevels: { type: Number, default: 1 },
  allowedVendors: [{ type: String }],
}, { timestamps: true });
export const ProcurementPolicy = getModel<IProcurementPolicy>("ProcurementPolicy", ProcurementPolicySchema);

// 9. AIWorkflowLog Schema
export interface IAIWorkflowLog extends Document {
  requestId: string;
  agentName: string;
  action: string;
  status: string; // "Started", "Completed", "Failed"
  confidence: number; // percentage, e.g. 98
  reasoning: string;
  evidence?: string;
  executionTime: number; // in milliseconds
  timestamp: Date;
}
const AIWorkflowLogSchema = new Schema<IAIWorkflowLog>({
  requestId: { type: String, required: true, index: true },
  agentName: { type: String, required: true },
  action: { type: String, required: true },
  status: { type: String, required: true },
  confidence: { type: Number, default: 100 },
  reasoning: { type: String, required: true },
  evidence: { type: String },
  executionTime: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});
export const AIWorkflowLog = getModel<IAIWorkflowLog>("AIWorkflowLog", AIWorkflowLogSchema);

// 10. ManagerApproval Schema
export interface IManagerApproval extends Document {
  requestId: string;
  managerId: string;
  aiRecommendation: string;
  decision: string; // "Approved", "Rejected", "Clarified"
  comments?: string;
  approvedAt: Date;
}
const ManagerApprovalSchema = new Schema<IManagerApproval>({
  requestId: { type: String, required: true },
  managerId: { type: String, required: true },
  aiRecommendation: { type: String },
  decision: { type: String, required: true },
  comments: { type: String },
  approvedAt: { type: Date, default: Date.now },
});
export const ManagerApproval = getModel<IManagerApproval>("ManagerApproval", ManagerApprovalSchema);

// 11. Notification Schema
export interface INotification extends Document {
  userId: string;
  title: string;
  description: string;
  type: string; // "Info", "Alert", "Success"
  read: boolean;
  createdAt: Date;
}
const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, default: "Info" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
export const Notification = getModel<INotification>("Notification", NotificationSchema);

// 12. AuditLog Schema
export interface IAuditLog extends Document {
  requestId: string;
  actor: string;
  action: string;
  details: string;
  ip?: string;
  timestamp: Date;
}
const AuditLogSchema = new Schema<IAuditLog>({
  requestId: { type: String, required: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now },
});
export const AuditLog = getModel<IAuditLog>("AuditLog", AuditLogSchema);

// 13. PurchaseOrder Schema
export interface IPurchaseOrder extends Document {
  requestId: string;
  vendorId: string;
  poNumber: string;
  totalAmount: number;
  expectedDelivery?: Date;
  status: string; // "Issued", "Confirmed", "Delivered"
  createdAt: Date;
}
const PurchaseOrderSchema = new Schema<IPurchaseOrder>({
  requestId: { type: String, required: true },
  vendorId: { type: String, required: true },
  poNumber: { type: String, required: true, unique: true },
  totalAmount: { type: Number, required: true },
  expectedDelivery: { type: Date },
  status: { type: String, default: "Issued" },
  createdAt: { type: Date, default: Date.now },
});
export const PurchaseOrder = getModel<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);
