import mongoose, { Schema, Document, Model } from "mongoose";

function getModel<T>(modelName: string, schema: Schema): Model<T> {
  if (mongoose.models[modelName]) {
    return mongoose.models[modelName] as Model<T>;
  }
  return mongoose.model<T>(modelName, schema);
}

// 15. ExpenseClaim Schema
export interface IExpenseClaim extends Document {
  claimNumber: string;
  employeeId: string;
  managerId: string;
  expenseType: string; // "Travel", "Cloud / Software", "Food & Meals", "Office Supplies", "Client Entertainment", "Other"
  amount: number;
  currency: string;
  date: Date;
  description: string;
  paymentMethod: string; // "Personal Card", "Corporate Card", "Cash"
  receiptUrl?: string;
  receiptFileName?: string;

  // Extracted by Receipt OCR Agent
  extractedData?: {
    merchant?: string;
    amount?: number;
    date?: string;
    category?: string;
    tax?: number;
    receiptNumber?: string;
    confidence?: number;
  };

  amountMismatch?: boolean;
  isPossibleDuplicate?: boolean;
  duplicateClaimId?: string;
  riskScore?: number;
  riskLevel?: string; // "LOW", "MEDIUM", "HIGH"

  currentStatus: string; // "Submitted", "AI Processing", "Pending Manager", "Approved", "Rejected", "Clarification Requested", "Payment Processing", "Payment Completed", "Claim Closed"
  aiRecommendation?: string; // "Approve", "Reject", "Clarify"
  confidence?: number;
  managerComments?: string;
  rejectionReason?: string;
  clarificationQuestion?: string;
  clarificationResponse?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ExpenseClaimSchema = new Schema<IExpenseClaim>(
  {
    claimNumber: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    managerId: { type: String, required: true },
    expenseType: { type: String, default: "Travel" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    paymentMethod: { type: String, default: "Personal Card" },
    receiptUrl: { type: String },
    receiptFileName: { type: String },

    extractedData: {
      merchant: { type: String },
      amount: { type: Number },
      date: { type: String },
      category: { type: String },
      tax: { type: Number },
      receiptNumber: { type: String },
      confidence: { type: Number },
    },

    amountMismatch: { type: Boolean, default: false },
    isPossibleDuplicate: { type: Boolean, default: false },
    duplicateClaimId: { type: String },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: "LOW" },

    currentStatus: { type: String, default: "Submitted" },
    aiRecommendation: { type: String },
    confidence: { type: Number },
    managerComments: { type: String },
    rejectionReason: { type: String },
    clarificationQuestion: { type: String },
    clarificationResponse: { type: String },
  },
  { timestamps: true }
);

export const ExpenseClaim = getModel<IExpenseClaim>("ExpenseClaim", ExpenseClaimSchema);

// 16. ExpensePolicy Schema (for RAG / Knowledge retrieval)
export interface IExpensePolicy extends Document {
  category: string;
  maxLimitPerTrip: number;
  monthlyLimit: number;
  receiptRequired: boolean;
  allowedRoles: string[];
  description: string;
  rules: string[];
}

const ExpensePolicySchema = new Schema<IExpensePolicy>(
  {
    category: { type: String, required: true, unique: true },
    maxLimitPerTrip: { type: Number, default: 2000 },
    monthlyLimit: { type: Number, default: 25000 },
    receiptRequired: { type: Boolean, default: true },
    allowedRoles: [{ type: String }],
    description: { type: String },
    rules: [{ type: String }],
  },
  { timestamps: true }
);

export const ExpensePolicy = getModel<IExpensePolicy>("ExpensePolicy", ExpensePolicySchema);
