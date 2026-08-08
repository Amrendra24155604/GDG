"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface UpdateItem {
  id: string;
  type: "campaign" | "policy" | "leave" | "expense" | "procurement" | "system";
  title: string;
  description: string;
  time: string;
}

interface ProcurementReq {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

interface WorkflowLog {
  _id: string;
  requestId: string;
  agentName: string;
  action: string;
  status: string;
  confidence: number;
  reasoning: string;
  evidence?: string;
  executionTime: number;
  timestamp: string;
}

interface CustomDialogState {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const getAvatarColor = (name: string) => {
  const colors = [
    "#1a73e8", // Google Blue
    "#ea4335", // Google Red
    "#fbbc05", // Google Yellow
    "#34a853", // Google Green
    "#ab47bc", // Purple
    "#00acc1", // Cyan
    "#ff7043", // Orange
  ];
  if (!name) return colors[0];
  let charCodeSum = 0;
  for (let i = 0; i < name.length; i++) {
    charCodeSum += name.charCodeAt(i);
  }
  return colors[charCodeSum % colors.length];
};

export default function Dashboard() {
  const router = useRouter();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Mobile Nav Tab State (for Portal view)
  const [activeTab, setActiveTab] = useState<"home" | "procure" | "leave" | "expenses">("home");

  // Portal Role (determined directly by current user's role)
  const portalViewRole = currentUser && (currentUser.role === "Manager" || currentUser.role === "Admin") ? "Manager" : "Employee";
  const firstLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U";
  const avatarBg = getAvatarColor(currentUser?.name || "");

  // DB Statistics / Budgets
  const [budgetData, setBudgetData] = useState({
    allocated: 150000,
    used: 35000,
    remaining: 115000,
  });

  // Dynamic Procurement Requests
  const [requests, setRequests] = useState<ProcurementReq[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementReq | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [recentUpdates, setRecentUpdates] = useState<UpdateItem[]>([]);

  // Dynamic Leave Requests
  const [leaves, setLeaves] = useState<any[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [leaveWorkflowLogs, setLeaveWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [expenseWorkflowLogs, setExpenseWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [workflowType, setWorkflowType] = useState<"procurement" | "leave" | "expense">("procurement");
  const [leaveHalfDay, setLeaveHalfDay] = useState(false);
  const [leaveOptionalNote, setLeaveOptionalNote] = useState("");
  const [leaveManagerComments, setLeaveManagerComments] = useState("");
  const [leaveClarifyResponse, setLeaveClarifyResponse] = useState("");
  const leavePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modals (Portal view)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isProcureModalOpen, setIsProcureModalOpen] = useState(false);

  // Form inputs (Portal view)
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Travel");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("2026-08-05");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("Personal Card");
  const [expenseReceiptFile, setExpenseReceiptFile] = useState("receipt.jpg");

  // Procurement Form (Portal view)
  const [procureItem, setProcureItem] = useState("");
  const [procureQty, setProcureQty] = useState(1);
  const [procureCost, setProcureCost] = useState("");
  const [procurePriority, setProcurePriority] = useState("Medium");
  const [procureVendor, setProcureVendor] = useState("Dell Inc");
  const [procureReason, setProcureReason] = useState("");
  const [procureSpecs, setProcureSpecs] = useState("");
  const [procureCategory, setProcureCategory] = useState("Laptop");

  // Manager Approval notes (Portal view)
  const [managerComments, setManagerComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =========================================================================
  // DEVELOPER DASHBOARD STATES
  // =========================================================================
  const [devTab, setDevTab] = useState<"provision" | "database">("provision");

  // Developer User Creator Form Inputs
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("Employee");
  const [newUserDesignation, setNewUserDesignation] = useState("");
  const [newUserDepartment, setNewUserDepartment] = useState("AI Research");
  const [newUserManagerId, setNewUserManagerId] = useState("EMP-002");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserLocation, setNewUserLocation] = useState("Remote");
  const [provisionSuccessMsg, setProvisionSuccessMsg] = useState("");
  const [provisionErrorMsg, setProvisionErrorMsg] = useState("");
  const [provisionLoading, setProvisionLoading] = useState(false);

  // Developer Database Editor Inputs
  const [dbCollections, setDbCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("User");
  const [dbDocuments, setDbDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [documentJsonText, setDocumentJsonText] = useState("");
  const [dbEditorLoading, setDbEditorLoading] = useState(false);
  const [dbEditorSuccess, setDbEditorSuccess] = useState("");
  const [dbEditorError, setDbEditorError] = useState("");
  const [newDocId, setNewDocId] = useState("");

  const generateMongoId = () => {
    const chars = "abcdef0123456789";
    let id = "";
    for (let i = 0; i < 24; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  };

  const [customDialog, setCustomDialog] = useState<CustomDialogState>({
    isOpen: false,
    type: "alert",
    title: "",
    message: ""
  });

  const showCustomAlert = (title: string, message: string) => {
    setCustomDialog({
      isOpen: true,
      type: "alert",
      title,
      message
    });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setCustomDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // =========================================================================
  // INITIALIZATION & SESSION CHECKS
  // =========================================================================
  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userJson);
    setCurrentUser(user);

    // User role loaded automatically from session
  }, []);

  // Prevent background scrolling and stretching/rubber-banding when modals or popups are open
  useEffect(() => {
    const isAnyModalOpen = isProcureModalOpen || isLeaveModalOpen || isExpenseModalOpen || customDialog.isOpen;

    const preventTouchStretch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Allow scrolling inside input/textarea fields or scrollable bodies, block general document dragging
      if (target && target.closest(`[class*="modalBody"]`)) {
        return;
      }
      e.preventDefault();
    };

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
      document.addEventListener("touchmove", preventTouchStretch, { passive: false });
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.removeEventListener("touchmove", preventTouchStretch);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.removeEventListener("touchmove", preventTouchStretch);
    };
  }, [isProcureModalOpen, isLeaveModalOpen, isExpenseModalOpen, customDialog.isOpen]);

  // Fetch collections if Developer logged in
  useEffect(() => {
    if (currentUser && currentUser.role === "Developer") {
      fetchCollections();
    }
  }, [currentUser]);

  // Load portal statistics and lists
  useEffect(() => {
    if (currentUser && currentUser.role !== "Developer") {
      refreshDashboardData();
    }
  }, [currentUser]);

  // Dynamic Polling for Portal AI Pipeline
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (!selectedRequest) return;

    const shouldPoll =
      selectedRequest.currentStatus === "Submitted" ||
      selectedRequest.currentStatus === "AI Processing";

    if (shouldPoll) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const reqRes = await fetch(`/api/procurement/request/${selectedRequest._id}`);
          const reqData = await reqRes.json();
          if (reqData.success) {
            setSelectedRequest(reqData.request);
            if (reqData.request.currentStatus !== "Submitted" && reqData.request.currentStatus !== "AI Processing") {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }
              refreshDashboardData();
            }
          }

          const logRes = await fetch(`/api/procurement/workflow?requestId=${selectedRequest._id}`);
          const logData = await logRes.json();
          if (logData.success) {
            setWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Polling logs error:", e);
        }
      }, 1500);
    } else {
      const fetchOnce = async () => {
        try {
          const logRes = await fetch(`/api/procurement/workflow?requestId=${selectedRequest._id}`);
          const logData = await logRes.json();
          if (logData.success) {
            setWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Fetch logs error:", e);
        }
      };
      fetchOnce();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedRequest?._id, selectedRequest?.currentStatus]);

  // Dynamic Polling for Leave AI Pipeline
  useEffect(() => {
    if (leavePollingIntervalRef.current) {
      clearInterval(leavePollingIntervalRef.current);
    }

    if (!selectedLeave) return;

    const shouldPoll =
      selectedLeave.currentStatus === "Submitted" ||
      selectedLeave.currentStatus === "AI Processing";

    if (shouldPoll) {
      leavePollingIntervalRef.current = setInterval(async () => {
        try {
          let lRes;
          if (portalViewRole === "Employee") {
            lRes = await fetch("/api/leave/my-requests?employeeId=" + currentUser.employeeId);
          } else {
            lRes = await fetch("/api/leave/request");
          }
          const lData = await lRes.json();
          if (lData.success) {
            const currentL = lData.requests.find((r: any) => r._id === selectedLeave._id);
            if (currentL) {
              setSelectedLeave(currentL);
              if (currentL.currentStatus !== "Submitted" && currentL.currentStatus !== "AI Processing") {
                if (leavePollingIntervalRef.current) {
                  clearInterval(leavePollingIntervalRef.current);
                }
                refreshDashboardData();
              }
            }
          }

          const logRes = await fetch("/api/leave/workflow?requestId=" + selectedLeave._id);
          const logData = await logRes.json();
          if (logData.success) {
            setLeaveWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Polling leave logs error:", e);
        }
      }, 1500);
    } else {
      const fetchOnce = async () => {
        try {
          const logRes = await fetch("/api/leave/workflow?requestId=" + selectedLeave._id);
          const logData = await logRes.json();
          if (logData.success) {
            setLeaveWorkflowLogs(logData.logs);
          }
        } catch (e) {
          console.error("Fetch leave logs error:", e);
        }
      };
      fetchOnce();
    }

    return () => {
      if (leavePollingIntervalRef.current) {
        clearInterval(leavePollingIntervalRef.current);
      }
    };
  }, [selectedLeave?._id, selectedLeave?.currentStatus]);

  // Live polling for selected expense claim workflow logs
  useEffect(() => {
    if (!selectedClaim?._id) return;
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/expense/workflow?requestId=" + selectedClaim._id);
        const data = await res.json();
        if (data.success) {
          setExpenseWorkflowLogs(data.logs);
        }
      } catch (e) {
        console.error("Expense log polling error:", e);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [selectedClaim?._id, selectedClaim?.currentStatus]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("user");
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (leavePollingIntervalRef.current) {
      clearInterval(leavePollingIntervalRef.current);
    }
    router.push("/login");
  };

  // =========================================================================
  // PORTAL WORKFLOW METHODS
  // =========================================================================
  const refreshDashboardData = async () => {
    if (!currentUser) return;
    try {
      let res;
      // Filter by Employee or Manager depending on visual simulator tab
      if (portalViewRole === "Employee") {
        res = await fetch("/api/procurement/my-requests?employeeId=" + currentUser.employeeId);
      } else {
        res = await fetch("/api/procurement/request"); // Manager/Admin lists all
      }
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }

      // Fetch leaves
      let lRes;
      if (portalViewRole === "Employee") {
        lRes = await fetch("/api/leave/my-requests?employeeId=" + currentUser.employeeId);
      } else {
        lRes = await fetch("/api/leave/request");
      }
      const lData = await lRes.json();
      if (lData.success) {
        setLeaves(lData.requests);
      }

      // Fetch expense claims
      let cRes;
      if (portalViewRole === "Employee") {
        cRes = await fetch("/api/expense/claim?employeeId=" + currentUser.employeeId);
      } else {
        cRes = await fetch("/api/expense/claim");
      }
      const cData = await cRes.json();
      if (cData.success) {
        setClaims(cData.claims);
      }

      // Refresh current user profile details to get updated leave balances
      const uRes = await fetch("/api/developer/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionName: "User" })
      });
      const uData = await uRes.json();
      if (uData.success) {
        const freshUser = uData.documents.find((u: any) => u.employeeId === currentUser.employeeId);
        if (freshUser) {
          setCurrentUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
      }

      // Fetch AI Research budget
      const bRes = await fetch("/api/budgets");
      const bData = await bRes.json();
      if (bData.success) {
        const aiDept = bData.budgets.find((b: any) => b.department === currentUser.department || b.department === "AI Research");
        if (aiDept) {
          setBudgetData({
            allocated: aiDept.allocatedBudget,
            used: aiDept.usedBudget,
            remaining: aiDept.remainingBudget,
          });
        }
      }

      // Default campaigns updates
      setRecentUpdates([
        {
          id: "sys-1",
          type: "campaign",
          title: "Q4 Townhall Schedule Updated",
          description: "The Q4 Townhall has been moved to next Thursday at 10 AM EST. Please check your calendar invites.",
          time: "2 hours ago",
        },
        {
          id: "sys-2",
          type: "policy",
          title: "New Travel Policy 2024",
          description: "Updates to the employee travel and expense policy are now available. Review before booking upcoming trips.",
          time: "Yesterday",
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureItem || !currentUser) return;

    try {
      const res = await fetch("/api/procurement/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUser.employeeId,
          managerId: currentUser.managerId || "EMP-002",
          itemName: procureItem,
          category: procureCategory,
          quantity: procureQty,
          justification: procureReason,
          specifications: procureSpecs,
          priority: procurePriority,
          preferredVendor: procureVendor,
          estimatedCost: parseFloat(procureCost) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsProcureModalOpen(false);
        setProcureItem("");
        setProcureQty(1);
        setProcureCost("");
        setProcureReason("");
        setProcureSpecs("");
        setProcureCategory("Laptop");
        setProcurePriority("Medium");

        await refreshDashboardData();
        setSelectedRequest(data.request);
        setWorkflowLogs([]);
        setNotificationsCount(prev => prev + 1);
      } else {
        showCustomAlert("Submission Failed", data.error);
      }
    } catch (err: any) {
      showCustomAlert("Error", err.message);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    showCustomConfirm(
      "Withdraw Request",
      "Are you sure you want to withdraw this procurement request? This will archive it and halt multi-agent processing.",
      async () => {
        setActionLoading(true);
        try {
          const res = await fetch("/api/procurement/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: selectedRequest._id
            })
          });
          const data = await res.json();
          if (data.success) {
            await refreshDashboardData();
            setSelectedRequest(data.request);
            showCustomAlert("Withdrawn", "Procurement request withdrawn successfully.");
          } else {
            showCustomAlert("Withdrawal Failed", data.error);
          }
        } catch (e: any) {
          showCustomAlert("Error", e.message);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleLeaveWithdraw = async () => {
    if (!selectedLeave || actionLoading || !currentUser) return;
    showCustomConfirm(
      "Withdraw Leave Request",
      "Are you sure you want to withdraw this leave request? This will cancel the application and restore your leave balance.",
      async () => {
        setActionLoading(true);
        try {
          const res = await fetch("/api/leave/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: selectedLeave._id
            })
          });
          const data = await res.json();
          if (data.success) {
            await refreshDashboardData();
            setSelectedLeave(data.request);
            showCustomAlert("Withdrawn", "Leave request withdrawn successfully.");
          } else {
            showCustomAlert("Withdrawal Failed", data.error);
          }
        } catch (e: any) {
          showCustomAlert("Error", e.message);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleExpenseWithdraw = async () => {
    if (!selectedClaim || actionLoading || !currentUser) return;
    showCustomConfirm(
      "Withdraw Expense Claim",
      "Are you sure you want to withdraw this expense reimbursement claim?",
      async () => {
        setActionLoading(true);
        try {
          const res = await fetch("/api/expense/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              claimId: selectedClaim._id
            })
          });
          const data = await res.json();
          if (data.success) {
            await refreshDashboardData();
            setSelectedClaim(data.claim);
            showCustomAlert("Withdrawn", "Expense claim withdrawn successfully.");
          } else {
            showCustomAlert("Withdrawal Failed", data.error);
          }
        } catch (e: any) {
          showCustomAlert("Error", e.message);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          comments: managerComments || "Approved based on multi-agent compliance validation."
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        showCustomAlert("Success", "Request successfully approved. Purchase Order has been generated!");
      } else {
        showCustomAlert("Approval Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", "Error approving request: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          decision: "Rejected",
          comments: managerComments || "Rejected. Over budget or does not satisfy requirements."
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        showCustomAlert("Success", "Request rejected.");
      } else {
        showCustomAlert("Rejection Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", "Error rejecting request: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClarify = async () => {
    if (!selectedRequest || !managerComments || actionLoading || !currentUser) {
      showCustomAlert("Input Required", "Please provide comments outlining the clarification required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/procurement/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          managerId: currentUser.employeeId,
          decision: "Clarification Requested",
          comments: managerComments
        })
      });
      const data = await res.json();
      if (data.success) {
        setManagerComments("");
        setSelectedRequest(data.request);
        refreshDashboardData();
        showCustomAlert("Success", "Clarification requested from employee.");
      } else {
        showCustomAlert("Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", "Error requesting clarification: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason || !currentUser) {
      showCustomAlert("Input Error", "Please provide start date, end date, and reason.");
      return;
    }
    try {
      const res = await fetch("/api/leave/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUser.employeeId,
          managerId: currentUser.managerId || "EMP-002",
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
          halfDay: leaveHalfDay,
          optionalNote: leaveOptionalNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsLeaveModalOpen(false);
        setLeaveStart("");
        setLeaveEnd("");
        setLeaveReason("");
        setLeaveHalfDay(false);
        setLeaveOptionalNote("");
        await refreshDashboardData();
        setSelectedLeave(data.request);
        setLeaveWorkflowLogs([]);
        setWorkflowType("leave");
      } else {
        showCustomAlert("Submission Failed", data.error);
      }
    } catch (err: any) {
      showCustomAlert("Error", err.message);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDate || !expenseDesc || !currentUser) {
      showCustomAlert("Input Error", "Please provide amount, date, description and upload receipt.");
      return;
    }
    try {
      const res = await fetch("/api/expense/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentUser.employeeId,
          managerId: currentUser.managerId || "EMP-002",
          expenseType: expenseCategory,
          amount: parseFloat(expenseAmount),
          date: expenseDate,
          description: expenseDesc,
          paymentMethod: expensePaymentMethod,
          receiptFileName: expenseReceiptFile || "receipt.jpg",
          receiptUrl: "/uploads/uber_receipt.jpg"
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsExpenseModalOpen(false);
        setExpenseAmount("");
        setExpenseDesc("");
        await refreshDashboardData();
        setSelectedClaim(data.claim);
        setExpenseWorkflowLogs([]);
        setWorkflowType("expense");
        showCustomAlert("Success", "Expense claim submitted. Multi-agent OCR & RAG audit initiated.");
      } else {
        showCustomAlert("Validation Warning", data.error);
      }
    } catch (err: any) {
      showCustomAlert("Error", err.message);
    }
  };

  const handleLeaveApprove = async () => {
    if (!selectedLeave || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedLeave._id,
          managerId: currentUser.employeeId,
          comments: leaveManagerComments || "Approved based on multi-agent operational risk evaluation."
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeaveManagerComments("");
        setSelectedLeave(data.request);
        refreshDashboardData();
        showCustomAlert("Approved", "Leave request has been successfully approved.");
      } else {
        showCustomAlert("Approval Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveReject = async () => {
    if (!selectedLeave || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedLeave._id,
          managerId: currentUser.employeeId,
          decision: "Rejected",
          comments: leaveManagerComments || "Rejected."
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeaveManagerComments("");
        setSelectedLeave(data.request);
        refreshDashboardData();
        showCustomAlert("Rejected", "Leave request has been rejected.");
      } else {
        showCustomAlert("Rejection Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveClarify = async () => {
    if (!selectedLeave || !leaveManagerComments || actionLoading || !currentUser) {
      showCustomAlert("Input Required", "Please provide comments outlining the clarification required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedLeave._id,
          managerId: currentUser.employeeId,
          decision: "Clarification Requested",
          comments: leaveManagerComments
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeaveManagerComments("");
        setSelectedLeave(data.request);
        refreshDashboardData();
        showCustomAlert("Success", "Clarification requested from employee.");
      } else {
        showCustomAlert("Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveClarifyResponse = async () => {
    if (!selectedLeave || !leaveClarifyResponse || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/leave/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedLeave._id,
          managerId: currentUser.employeeId,
          decision: "Clarification Response",
          comments: leaveClarifyResponse
        })
      });
      const data = await res.json();
      if (data.success) {
        setLeaveClarifyResponse("");
        setSelectedLeave(data.request);
        setLeaveWorkflowLogs([]);
        refreshDashboardData();
        showCustomAlert("Clarified", "Response submitted. Re-initiating AI validation loop.");
      } else {
        showCustomAlert("Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpenseAction = async (action: "Approve" | "Reject" | "Clarify", comments?: string) => {
    if (!selectedClaim || actionLoading || !currentUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/expense/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaim._id,
          managerId: currentUser.employeeId,
          action,
          comments: comments || (action === "Approve" ? "Approved for finance payment processing based on AI Audit." : "Expense claim reviewed.")
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedClaim(data.claim);
        refreshDashboardData();
        showCustomAlert(action, `Expense claim status updated: ${data.claim.currentStatus}`);
      } else {
        showCustomAlert("Action Failed", data.error);
      }
    } catch (e: any) {
      showCustomAlert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = requests.filter(
    r => r.currentStatus === "Submitted" || r.currentStatus === "AI Processing" || r.currentStatus === "Pending Manager"
  );
  const latestRequest = requests[0];

  const getUpdateIcon = (type: UpdateItem["type"]) => {
    switch (type) {
      case "campaign": return "campaign";
      case "policy": return "policy";
      case "leave": return "calendar_today";
      case "expense": return "receipt_long";
      case "procurement": return "shopping_cart";
      default: return "info";
    }
  };

  const agentWorkflowSteps = [
    { name: "Requirement Analysis Agent", label: "Requirement Analysis Completed" },
    { name: "Employee Context Agent", label: "Employee Profile Retrieved" },
    { name: "Inventory Agent", label: "Inventory Checked" },
    { name: "Budget Agent", label: "Budget Retrieved" },
    { name: "Vendor Intelligence Agent", label: "Vendor Comparison Completed" },
    { name: "Policy Agent", label: "Policy Validation Passed" },
    { name: "Risk Agent", label: "Risk Analysis Completed" },
    { name: "Recommendation Agent", label: "Recommendation Generated" },
    { name: "Notification Agent", label: "Notifications Dispatched" }
  ];

  // =========================================================================
  // DEVELOPER DASHBOARD ACTIONS
  // =========================================================================
  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/developer/collections");
      const data = await res.json();
      if (data.success) {
        setDbCollections(data.collections);
        // Default to first collection
        if (data.collections.length > 0) {
          fetchDocuments(data.collections[0].name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async (colName: string) => {
    setDbEditorLoading(true);
    setSelectedDocument(null);
    setDocumentJsonText("");
    try {
      const res = await fetch("/api/developer/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionName: colName })
      });
      const data = await res.json();
      if (data.success) {
        setDbDocuments(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDbEditorLoading(false);
    }
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const col = e.target.value;
    setSelectedCollection(col);
    fetchDocuments(col);
  };

  const selectDocumentForEditing = (doc: any) => {
    setSelectedDocument(doc);
    // Strip mongoose metadata fields so they are not editable in JSON
    const { _id, __v, createdAt, updatedAt, ...editableDoc } = doc;
    setDocumentJsonText(JSON.stringify(editableDoc, null, 2));
    setDbEditorSuccess("");
    setDbEditorError("");
  };

  const saveEditedDocument = async () => {
    if (!selectedDocument) return;
    setDbEditorSuccess("");
    setDbEditorError("");

    try {
      const parsedData = JSON.parse(documentJsonText);

      const res = await fetch("/api/developer/update-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: "update",
          docId: selectedDocument._id,
          data: parsedData
        })
      });

      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess(`Mongoose record updated successfully! timestamp 'updatedAt/lastUpdatedAt' refreshed.`);
        // Reload list
        fetchDocuments(selectedCollection);
        setSelectedDocument(data.document);
        setDocumentJsonText(JSON.stringify(data.document, null, 2));
      } else {
        setDbEditorError("Update failed: " + data.error);
      }
    } catch (err: any) {
      setDbEditorError("JSON Syntax Error: " + err.message);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument) return;
    const confirmed = window.confirm('Are you sure you want to permanently delete this document?');
    if (!confirmed) return;

    setDbEditorSuccess('');
    setDbEditorError('');
    try {
      const res = await fetch('/api/developer/update-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: 'delete',
          docId: selectedDocument._id
        })
      });
      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess('Document deleted successfully from MongoDB.');
        setSelectedDocument(null);
        setDocumentJsonText('');
        fetchDocuments(selectedCollection);
      } else {
        setDbEditorError('Delete failed: ' + data.error);
      }
    } catch (e: any) {
      setDbEditorError('Error: ' + e.message);
    }
  };

  const showCreateDocumentTemplate = () => {
    // Generate default template based on collection schema
    const nextId = generateMongoId();
    setNewDocId(nextId);
    let template: any = {};
    if (selectedCollection === "User") {
      template = {
        name: "",
        email: "",
        username: "",
        password: "",
        role: "Employee",
        designation: "",
        department: "",
        managerId: "EMP-002",
        phone: "",
        location: "Remote"
      };
    } else if (selectedCollection === "Asset") {
      template = {
        assetId: "AST-110",
        assetName: "",
        category: "Laptop",
        serialNumber: "",
        assignedTo: "",
        department: "",
        condition: "New",
        status: "Available"
      };
    } else if (selectedCollection === "Vendor") {
      template = {
        vendorName: "",
        email: "",
        phone: "",
        address: "",
        gstNumber: "",
        rating: 4.5,
        averageDeliveryDays: 5,
        approved: true,
        products: []
      };
    } else if (selectedCollection === "DepartmentBudget") {
      template = {
        department: "",
        fiscalYear: "2026",
        allocatedBudget: 100000,
        usedBudget: 0,
        remainingBudget: 100000
      };
    } else {
      template = {
        key: "value"
      };
    }

    setSelectedDocument({ _id: "NEW_TEMPLATE" });
    setDocumentJsonText(JSON.stringify(template, null, 2));
    setDbEditorSuccess("");
    setDbEditorError("");
  };

  const saveNewDocument = async () => {
    setDbEditorSuccess("");
    setDbEditorError("");

    try {
      const parsedData = JSON.parse(documentJsonText);
      // Inject the generated MongoDB ID
      parsedData._id = newDocId;

      const res = await fetch("/api/developer/update-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: selectedCollection,
          action: "create",
          data: parsedData
        })
      });

      const data = await res.json();
      if (data.success) {
        setDbEditorSuccess("New record successfully saved to MongoDB!");
        fetchDocuments(selectedCollection);
        setSelectedDocument(data.document);
        setDocumentJsonText(JSON.stringify(data.document, null, 2));
      } else {
        setDbEditorError("Creation failed: " + data.error);
      }
    } catch (err: any) {
      setDbEditorError("JSON Syntax Error: " + err.message);
    }
  };

  const handleDevUserProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionSuccessMsg("");
    setProvisionErrorMsg("");
    setProvisionLoading(true);

    try {
      const res = await fetch("/api/developer/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          designation: newUserDesignation,
          department: newUserDepartment,
          managerId: newUserManagerId,
          phone: newUserPhone,
          location: newUserLocation
        })
      });

      const data = await res.json();
      if (data.success) {
        setProvisionSuccessMsg(`User profile provisioned. Account credentials email successfully sent to ${newUserEmail}!`);
        // Clear fields
        setNewUserName("");
        setNewUserEmail("");
        setNewUserUsername("");
        setNewUserPassword("");
        setNewUserDesignation("");
      } else {
        setProvisionErrorMsg(data.error || "Failed to provision user.");
      }
    } catch (err: any) {
      setProvisionErrorMsg("Error: " + err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  // Safe Loading check
  if (!currentUser) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f9f9f9", fontFamily: "sans-serif" }}>
        <p>Loading session authentication details...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW RENDER: DEVELOPER DASHBOARD VIEW
  // =========================================================================
  if (currentUser.role === "Developer") {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "#000",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold"
              }}
            >
              D
            </div>
            <div className={styles.title}>Developer Admin Console</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--on-surface-variant)" }}>
              Session: <strong>Amrendra (Developer)</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                backgroundColor: "var(--primary)",
                color: "var(--on-primary)",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px"
              }}
            >
              Log Out
            </button>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.welcomeSection}>
            <h1 className={styles.welcomeTitle}>Admin Administration Dashboard</h1>
            <p className={styles.welcomeSub}>Manage global MongoDB document collections and provision users with email notifications.</p>
          </section>

          {/* Dev Tab switchers */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--outline-variant)", gap: "16px" }}>
            <button
              onClick={() => setDevTab("provision")}
              style={{
                padding: "12px 16px",
                fontWeight: "bold",
                fontSize: "15px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: devTab === "provision" ? "3px solid var(--primary)" : "none",
                color: devTab === "provision" ? "var(--primary)" : "var(--on-surface-variant)",
                cursor: "pointer"
              }}
            >
              User Provisioning (Mail Dispatch)
            </button>
            <button
              onClick={() => setDevTab("database")}
              style={{
                padding: "12px 16px",
                fontWeight: "bold",
                fontSize: "15px",
                border: "none",
                backgroundColor: "transparent",
                borderBottom: devTab === "database" ? "3px solid var(--primary)" : "none",
                color: devTab === "database" ? "var(--primary)" : "var(--on-surface-variant)",
                cursor: "pointer"
              }}
            >
              MongoDB Direct Collection Editor
            </button>
          </div>

          {/* Tab 1: User Provisioning */}
          {devTab === "provision" && (
            <section
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--outline-variant)",
                borderRadius: "16px",
                padding: "32px",
                maxWidth: "700px",
                display: "flex",
                flexDirection: "column",
                gap: "24px"
              }}
            >
              <h3 style={{ fontSize: "20px", fontWeight: "700" }}>Provision Corporate User</h3>
              <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "-16px" }}>
                Fills database records and automatically dispatches a credential email details to the entered address.
              </p>

              {provisionSuccessMsg && (
                <div style={{ padding: "12px 16px", backgroundColor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: "8px", fontSize: "14px" }}>
                  {provisionSuccessMsg}
                </div>
              )}
              {provisionErrorMsg && (
                <div style={{ padding: "12px 16px", backgroundColor: "#ffdad6", color: "#ba1a1a", border: "1px solid #ffb4ab", borderRadius: "8px", fontSize: "14px" }}>
                  {provisionErrorMsg}
                </div>
              )}

              <form onSubmit={handleDevUserProvisionSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Corporate Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. user@domain.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. sarahj"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Security Password</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter login password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Portal Role</label>
                    <select
                      className={styles.formSelect}
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="Employee">Employee (Create Requests)</option>
                      <option value="Manager">Manager (Review & Approve Requests)</option>
                      <option value="Procurement">Procurement Officer (Inventory & Vendors)</option>
                      <option value="Admin">System Admin (Operations Manager)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Designation Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Lead Engineer"
                      value={newUserDesignation}
                      onChange={(e) => setNewUserDesignation(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <select
                      className={styles.formSelect}
                      value={newUserDepartment}
                      onChange={(e) => setNewUserDepartment(e.target.value)}
                    >
                      <option value="AI Research">AI Research</option>
                      <option value="Operations">Operations</option>
                      <option value="Procurement">Procurement</option>
                      <option value="IT">IT Support</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Location</label>
                    <input
                      type="text"
                      value={newUserLocation}
                      onChange={(e) => setNewUserLocation(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={provisionLoading}
                  className={styles.btnPrimary}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "14px", marginTop: "12px" }}
                >
                  <span className="material-symbols-outlined">send</span>
                  {provisionLoading ? "Provisioning..." : "Add and Send Credentials Email"}
                </button>
              </form>
            </section>
          )}

          {/* Tab 2: MongoDB Collection Editor */}
          {devTab === "database" && (
            <section style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
              {/* Left Column: List of documents */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Collection Model</label>
                  <select
                    className={styles.formSelect}
                    value={selectedCollection}
                    onChange={handleCollectionChange}
                    style={{ fontWeight: "bold" }}
                  >
                    {dbCollections.map(c => (
                      <option key={c.name} value={c.name}>{c.label} ({c.name})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontWeight: "700" }}>Documents (Recent 100)</h4>
                  <button
                    onClick={showCreateDocumentTemplate}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#2e7d32",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    + Add Record
                  </button>
                </div>

                {dbEditorLoading ? (
                  <p>Loading documents...</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      maxHeight: "500px",
                      overflowY: "auto",
                      border: "1px solid var(--outline-variant)",
                      borderRadius: "8px",
                      padding: "8px",
                      backgroundColor: "var(--surface)"
                    }}
                  >
                    {dbDocuments.length === 0 ? (
                      <p style={{ padding: "16px", color: "var(--on-surface-variant)", fontSize: "13px" }}>No documents inside this collection.</p>
                    ) : (
                      dbDocuments.map(doc => {
                        const isSelected = selectedDocument?._id === doc._id;
                        // Pick a display identifier
                        const label = doc.name || doc.itemName || doc.policyName || doc.vendorName || doc.requestNumber || doc.title || doc._id;
                        return (
                          <div
                            key={doc._id}
                            onClick={() => selectDocumentForEditing(doc)}
                            style={{
                              padding: "10px",
                              backgroundColor: isSelected ? "var(--surface-container-highest)" : "var(--surface-container-low)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                              fontSize: "13px",
                              fontFamily: "var(--font-mono)",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {label}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: JSON code editor */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ fontWeight: "700" }}>Mongoose Document Editor</h4>

                {dbEditorSuccess && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#e8f5e9", color: "#2e7d32", borderRadius: "6px", fontSize: "13px" }}>
                    {dbEditorSuccess}
                  </div>
                )}
                {dbEditorError && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#ffdad6", color: "#ba1a1a", borderRadius: "6px", fontSize: "13px" }}>
                    {dbEditorError}
                  </div>
                )}

                {selectedDocument ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)" }}>
                      Document ID: <strong>{selectedDocument._id === "NEW_TEMPLATE" ? `${newDocId} (Generated)` : selectedDocument._id}</strong>
                    </div>

                    <textarea
                      style={{
                        width: "100%",
                        height: "380px",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid var(--outline-variant)",
                        backgroundColor: "#1e1e1e",
                        color: "#d4d4d4",
                        outline: "none"
                      }}
                      value={documentJsonText}
                      onChange={(e) => setDocumentJsonText(e.target.value)}
                    />

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      {selectedDocument._id !== "NEW_TEMPLATE" && (
                        <button
                          onClick={deleteDocument}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#ba1a1a",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "14px"
                          }}
                        >
                          Delete Document
                        </button>
                      )}

                      <button
                        onClick={selectedDocument._id === "NEW_TEMPLATE" ? saveNewDocument : saveEditedDocument}
                        className={styles.btnPrimary}
                        style={{ padding: "10px 20px", fontSize: "14px" }}
                      >
                        {selectedDocument._id === "NEW_TEMPLATE" ? "Save New Document" : "Save Document Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px dashed var(--outline-variant)",
                      borderRadius: "8px",
                      padding: "48px",
                      textAlign: "center",
                      color: "var(--on-surface-variant)"
                    }}
                  >
                    Select a document on the left to edit its schema values in raw JSON structure.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  const totalLeaveBalance = (currentUser.leaveBalance?.casualLeave || 0) + 
                            (currentUser.leaveBalance?.sickLeave || 0) + 
                            (currentUser.leaveBalance?.earnedLeave || 0);
  const pendingLeavesCount = leaves.filter((l) => ["Submitted", "AI Processing", "Pending Manager"].includes(l.currentStatus)).length;
  const upcomingApprovedLeave = leaves.find((l) => l.currentStatus === "Approved");
  const upcomingText = upcomingApprovedLeave 
    ? "Upcoming: " + new Date(upcomingApprovedLeave.startDate).toLocaleDateString() + " - " + new Date(upcomingApprovedLeave.endDate).toLocaleDateString()
    : "No upcoming approved leaves";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 16px" }}>
          <div
            className={styles.avatar}
            style={{
              backgroundColor: avatarBg,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16px",
              fontFamily: "var(--font-sans)",
              userSelect: "none"
            }}
          >
            {firstLetter}
          </div>
          <div className={styles.title}>Employee Portal</div>
        </div>

        {/* Logout container */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/seed");
                const data = await res.json();
                if (data.success) {
                  showCustomAlert("Database Seeded 🎉", `Successfully populated database! Counts: ${JSON.stringify(data.seededCounts)}`);
                  refreshDashboardData();
                } else {
                  showCustomAlert("Seed Error", data.error);
                }
              } catch (e: any) {
                showCustomAlert("Error", e.message);
              }
            }}
            style={{
              padding: "6px 14px",
              backgroundColor: "var(--surface-container-highest)",
              color: "var(--on-surface)",
              border: "1px solid var(--outline)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>database</span>
            Seed DB (50+ Items)
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 16px",
              backgroundColor: "var(--primary)",
              color: "var(--on-primary)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px"
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.welcomeSection}>
          <h1 className={styles.welcomeTitle}>Welcome back, {currentUser.name}!</h1>
          <p className={styles.welcomeSub}>
            Role: <strong style={{ color: "var(--primary)" }}>{currentUser.role}</strong>. Designation: {currentUser.designation}.
          </p>
        </section>

        <section className={styles.actionsSection}>
          <h2 className={styles.sectionHeader}>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--primary-fixed)", color: "var(--primary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              </div>
              <span className={styles.actionText}>Request Leave</span>
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--secondary-fixed)", color: "var(--secondary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
              </div>
              <span className={styles.actionText}>Submit Expense</span>
            </button>
            <button
              onClick={() => setIsProcureModalOpen(true)}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--tertiary-fixed)", color: "var(--tertiary)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
              </div>
              <span className={styles.actionText}>New Order</span>
            </button>
            <button
              onClick={() => showCustomAlert("About AI Agents", "Multi-agent procurement automates verification details on demand.")}
              className={styles.actionButton}
            >
              <div className={styles.actionIconWrapper} style={{ backgroundColor: "var(--surface-variant)", color: "var(--on-surface-variant)" }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              </div>
              <span className={styles.actionText}>AI Agents Info</span>
            </button>
          </div>
        </section>

        <section className={styles.bentoSection}>
          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--tertiary)" }}>shopping_cart</span>
                <h3 className={styles.bentoTitle}>Procurement</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyCenter}>
                <span className={styles.bentoValue} style={{ color: "var(--tertiary)" }}>{pendingRequests.length}</span>
                <span className={styles.bentoSubvalue} style={{ display: "block" }}>Active AI / Pending Requests</span>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>Latest: {latestRequest ? latestRequest.itemName : "None"}</span>
              {latestRequest && (
                <span className={styles.bentoTag} style={{ fontSize: "10px", fontWeight: "bold" }}>
                  {latestRequest.currentStatus}
                </span>
              )}
            </div>
          </div>

          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>calendar_today</span>
                <h3 className={styles.bentoTitle}>Leave</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyGrid}>
                <div className={styles.balanceBlock} style={{ backgroundColor: "var(--primary-fixed)" }}>
                  <span className={styles.balanceValue} style={{ color: "var(--on-primary-fixed-variant)" }}>{totalLeaveBalance}</span>
                  <span className={styles.balanceLabel}>Days Balance</span>
                </div>
                <div className={styles.balanceBlock} style={{ backgroundColor: "var(--surface-container)" }}>
                  <span className={styles.balanceValue} style={{ color: "var(--on-surface)" }}>{pendingLeavesCount}</span>
                  <span className={styles.balanceLabel}>Pending Request</span>
                </div>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>{upcomingText}</span>
            </div>
          </div>

          <div className={styles.bentoCard}>
            <div className={styles.bentoHeader}>
              <div className={styles.bentoTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: "var(--secondary)" }}>receipt_long</span>
                <h3 className={styles.bentoTitle}>Research Budget</h3>
              </div>
            </div>
            <div className={styles.bentoBody}>
              <div className={styles.bentoBodyProgress}>
                <div className={styles.progressHeader} style={{ fontSize: "13px" }}>
                  <span style={{ color: "var(--on-surface-variant)" }}>Remaining AI Dept Budget</span>
                  <span style={{ color: "var(--on-surface)", fontWeight: "bold" }}>
                    ₹{budgetData.remaining.toLocaleString()} / ₹{budgetData.allocated.toLocaleString()}
                  </span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      backgroundColor: "var(--secondary)",
                      width: `${(budgetData.remaining / budgetData.allocated) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.bentoFooter}>
              <span>Used Budget: ₹{budgetData.used.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }} className="md:grid-cols-3">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="md:col-span-1">
            <div style={{ display: "flex", borderBottom: "1px solid var(--outline-variant)", marginBottom: "4px", gap: "12px" }}>
              <button
                onClick={() => setWorkflowType("procurement")}
                style={{
                  flex: 1,
                  padding: "10px",
                  fontWeight: "bold",
                  border: "none",
                  backgroundColor: "transparent",
                  borderBottom: workflowType === "procurement" ? "3px solid var(--primary)" : "none",
                  color: workflowType === "procurement" ? "var(--primary)" : "var(--on-surface-variant)",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Procurement
              </button>
              <button
                onClick={() => setWorkflowType("leave")}
                style={{
                  flex: 1,
                  padding: "10px",
                  fontWeight: "bold",
                  border: "none",
                  backgroundColor: "transparent",
                  borderBottom: workflowType === "leave" ? "3px solid var(--primary)" : "none",
                  color: workflowType === "leave" ? "var(--primary)" : "var(--on-surface-variant)",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Leaves
              </button>
              <button
                onClick={() => setWorkflowType("expense")}
                style={{
                  flex: 1,
                  padding: "10px",
                  fontWeight: "bold",
                  border: "none",
                  backgroundColor: "transparent",
                  borderBottom: workflowType === "expense" ? "3px solid var(--primary)" : "none",
                  color: workflowType === "expense" ? "var(--primary)" : "var(--on-surface-variant)",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Expenses
              </button>
            </div>

            <h2 className={styles.sectionHeader}>
              {workflowType === "procurement"
                ? (portalViewRole === "Employee" ? "My Orders" : "All Orders for Review")
                : workflowType === "leave"
                ? (portalViewRole === "Employee" ? "My Leaves" : "All Leaves for Review")
                : (portalViewRole === "Employee" ? "My Expenses" : "All Expense Claims")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {workflowType === "procurement" ? (
                requests.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "12px", color: "var(--on-surface-variant)" }}>
                    No requests submitted yet. Use "New Order" to create one.
                  </div>
                ) : (
                  requests.map((r) => {
                    const isSelected = selectedRequest?._id === r._id;
                    let statusBg = "var(--surface-container-highest)";
                    let statusColor = "var(--on-surface-variant)";

                    if (r.currentStatus === "Approved" || r.currentStatus === "Purchase Ordered" || r.currentStatus === "Delivered") {
                      statusBg = "#e8f5e9";
                      statusColor = "#2e7d32";
                    } else if (r.currentStatus === "Rejected") {
                      statusBg = "#ffeacc";
                      statusColor = "#c62828";
                    } else if (r.currentStatus === "AI Processing") {
                      statusBg = "#e3f2fd";
                      statusColor = "#1565c0";
                    }

                    return (
                      <div
                        key={r._id}
                        onClick={() => setSelectedRequest(r)}
                        style={{
                          padding: "16px",
                          backgroundColor: isSelected ? "var(--surface-container-high)" : "var(--surface)",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid var(--outline-variant)",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "bold" }}>
                            {r.requestNumber}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "99px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              backgroundColor: statusBg,
                              color: statusColor
                            }}
                          >
                            {r.currentStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{r.itemName}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--on-surface-variant)" }}>
                          <span>Qty: {r.quantity} | Cost: ₹{r.estimatedCost.toLocaleString()}</span>
                          <span>Priority: {r.priority}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : workflowType === "leave" ? (
                leaves.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "12px", color: "var(--on-surface-variant)" }}>
                    No leave requests submitted yet. Use "Request Leave" to submit.
                  </div>
                ) : (
                  leaves.map((l) => {
                    const isSelected = selectedLeave?._id === l._id;
                    let statusBg = "var(--surface-container-highest)";
                    let statusColor = "var(--on-surface-variant)";

                    if (l.currentStatus === "Approved") {
                      statusBg = "#e8f5e9";
                      statusColor = "#2e7d32";
                    } else if (l.currentStatus === "Rejected") {
                      statusBg = "#ffeacc";
                      statusColor = "#c62828";
                    } else if (l.currentStatus === "AI Processing" || l.currentStatus === "Submitted") {
                      statusBg = "#e3f2fd";
                      statusColor = "#1565c0";
                    } else if (l.currentStatus === "Clarification Requested") {
                      statusBg = "#fff3e0";
                      statusColor = "#e65100";
                    }

                    return (
                      <div
                        key={l._id}
                        onClick={() => setSelectedLeave(l)}
                        style={{
                          padding: "16px",
                          backgroundColor: isSelected ? "var(--surface-container-high)" : "var(--surface)",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid var(--outline-variant)",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "bold" }}>
                            {l.leaveNumber}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "99px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              backgroundColor: statusBg,
                              color: statusColor
                            }}
                          >
                            {l.currentStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{l.leaveType}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--on-surface-variant)" }}>
                          <span>
                            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                          </span>
                          <span>Half Day: {l.halfDay ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                claims.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "12px", color: "var(--on-surface-variant)" }}>
                    No expense claims submitted yet. Use "Submit Expense" to create one.
                  </div>
                ) : (
                  claims.map((c) => {
                    const isSelected = selectedClaim?._id === c._id;
                    let statusBg = "var(--surface-container-highest)";
                    let statusColor = "var(--on-surface-variant)";

                    if (c.currentStatus === "Approved" || c.currentStatus === "Payment Completed") {
                      statusBg = "#e8f5e9";
                      statusColor = "#2e7d32";
                    } else if (c.currentStatus === "Rejected") {
                      statusBg = "#ffeacc";
                      statusColor = "#c62828";
                    } else if (c.currentStatus === "AI Processing" || c.currentStatus === "Submitted") {
                      statusBg = "#e3f2fd";
                      statusColor = "#1565c0";
                    } else if (c.currentStatus === "Pending Manager") {
                      statusBg = "#fff3e0";
                      statusColor = "#e65100";
                    }

                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedClaim(c)}
                        style={{
                          padding: "16px",
                          backgroundColor: isSelected ? "var(--surface-container-high)" : "var(--surface)",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid var(--outline-variant)",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "bold" }}>
                            {c.claimNumber}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "99px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              backgroundColor: statusBg,
                              color: statusColor
                            }}
                          >
                            {c.currentStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: "bold" }}>{c.expenseType} — ₹{c.amount?.toLocaleString()}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--on-surface-variant)" }}>
                          <span>{new Date(c.date).toLocaleDateString()}</span>
                          <span>Method: {c.paymentMethod}</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="md:col-span-2">
            <h2 className={styles.sectionHeader}>Live AI Workflow & Decision Brief</h2>

            {workflowType === "procurement" ? (
              selectedRequest ? (
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--outline-variant)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "22px", fontWeight: "700" }}>{selectedRequest.itemName}</h3>
                      <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "4px" }}>
                        Requested by: Employee {selectedRequest.employeeId} on {new Date(selectedRequest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>₹{selectedRequest.estimatedCost.toLocaleString()}</div>
                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)", marginTop: "4px" }}>
                        Status: <strong style={{ color: "var(--primary)" }}>{selectedRequest.currentStatus}</strong>
                      </div>
                    </div>
                  </div>
                  {selectedRequest.justification && (
                    <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Justification:</strong> "{selectedRequest.justification}"
                    </div>
                  )}
                  {selectedRequest.specifications && (
                    <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Specifications:</strong> "{selectedRequest.specifications}"
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>timeline</span>
                    AI Coordinator Agent Pipeline
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", paddingLeft: "24px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "9px",
                        top: "10px",
                        bottom: "10px",
                        width: "2px",
                        backgroundColor: "var(--outline-variant)"
                      }}
                    />

                    {agentWorkflowSteps.map((step, idx) => {
                      const log = workflowLogs.find(l => l.agentName === step.name);
                      const isCompleted = log && log.status === "Completed";
                      const isFailed = log && log.status === "Failed";

                      const isProcessing = !log && (
                        selectedRequest.currentStatus === "AI Processing" ||
                        selectedRequest.currentStatus === "Submitted"
                      ) && (
                          idx === workflowLogs.length
                        );

                      let stepTextColor = "var(--on-surface-variant)";
                      let stepIcon = "circle";
                      let iconColor = "var(--outline-variant)";

                      if (isCompleted) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "check_circle";
                        iconColor = "#2e7d32";
                      } else if (isFailed) {
                        stepTextColor = "#ba1a1a";
                        stepIcon = "error";
                        iconColor = "#ba1a1a";
                      } else if (isProcessing) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "sync";
                        iconColor = "var(--secondary)";
                      }

                      const isExpanded = expandedLogIndex === idx;

                      return (
                        <div key={step.name} style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: "-24px",
                              top: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "99px",
                              backgroundColor: "var(--surface)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10
                            }}
                          >
                            <span
                              className={`material-symbols-outlined ${isProcessing ? "animate-spin" : ""}`}
                              style={{
                                fontSize: "18px",
                                color: iconColor,
                                fontVariationSettings: isCompleted ? "'FILL' 1" : ""
                              }}
                            >
                              {stepIcon}
                            </span>
                          </div>

                          <div
                            onClick={() => isCompleted && setExpandedLogIndex(isExpanded ? null : idx)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: isCompleted ? "pointer" : "default",
                              backgroundColor: isExpanded ? "var(--surface-container-low)" : "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                          >
                            <span style={{ fontSize: "14px", fontWeight: isProcessing ? "700" : "500", color: stepTextColor }}>
                              {isCompleted ? `✓ ${step.label}` : isProcessing ? `⏳ Processing ${step.label}...` : step.label}
                            </span>
                            {isCompleted && (
                              <span className="material-symbols-outlined" style={{ fontSize: "18px", transform: isExpanded ? "rotate(180deg)" : "" }}>
                                expand_more
                              </span>
                            )}
                          </div>

                          {isCompleted && isExpanded && log && (
                            <div
                              style={{
                                marginTop: "8px",
                                marginLeft: "8px",
                                padding: "16px",
                                backgroundColor: "var(--surface-container-lowest)",
                                border: "1px solid var(--outline-variant)",
                                borderRadius: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                fontSize: "13px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)" }}>
                                <span>Agent: <strong>{log.agentName}</strong></span>
                                <span>Confidence: <strong style={{ color: "#2e7d32" }}>{log.confidence}%</strong></span>
                              </div>
                              <div style={{ color: "var(--on-surface-variant)", lineHeight: "1.4" }}>
                                <strong>Reasoning:</strong> {log.reasoning}
                              </div>
                              {log.evidence && (
                                <div style={{ marginTop: "4px" }}>
                                  <details>
                                    <summary style={{ cursor: "pointer", fontWeight: "bold", outline: "none" }}>Show Queried Sources / Raw Data</summary>
                                    <pre style={{
                                      marginTop: "8px",
                                      padding: "8px",
                                      backgroundColor: "var(--surface-container-high)",
                                      borderRadius: "4px",
                                      overflowX: "auto",
                                      fontSize: "11px",
                                      fontFamily: "var(--font-mono)"
                                    }}>
                                      {JSON.stringify(JSON.parse(log.evidence), null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end", color: "var(--on-surface-variant)", fontSize: "11px" }}>
                                <span>Execution time: {log.executionTime}ms</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedRequest.currentStatus === "Pending Manager" && (
                  <div
                    style={{
                      borderTop: "2px dashed var(--outline-variant)",
                      paddingTop: "24px",
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="material-symbols-outlined" style={{ color: "#f57c00" }}>assignment_late</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>AI Synthesis Decision Brief</h4>
                    </div>

                    <div
                      style={{
                        padding: "18px",
                        backgroundColor: "#fef8f0",
                        border: "1px solid #ffe0b2",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#e65100" }}>
                          AI Recommendation: {selectedRequest.aiRecommendation || "Approve"}
                        </span>
                        <span style={{
                          backgroundColor: "#e65100",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}>
                          {selectedRequest.confidence || 95}% confidence
                        </span>
                      </div>

                      <ul style={{ paddingLeft: "18px", listStyleType: "disc", fontSize: "14px", color: "#5d4037", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {workflowLogs
                          .filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent")
                          .map((log, idx) => (
                            <li key={idx}>
                              <strong>{log.agentName}:</strong> {log.reasoning}
                            </li>
                          ))
                        }
                        {workflowLogs.filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent").length === 0 && (
                          <li>AI Coordinator agents are compiling audit results...</li>
                        )}
                      </ul>
                    </div>

                    {portalViewRole === "Manager" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <label style={{ fontSize: "14px", fontWeight: "600" }}>Manager Approval Comments</label>
                        <textarea
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--outline-variant)",
                            fontSize: "14px",
                            minHeight: "80px",
                            outline: "none",
                            backgroundColor: "var(--background)",
                            color: "var(--on-surface)"
                          }}
                          placeholder="Add approval comments or query explanations..."
                          value={managerComments}
                          onChange={(e) => setManagerComments(e.target.value)}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                          <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#2e7d32",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">check_circle</span>
                            Approve
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#c62828",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">cancel</span>
                            Reject
                          </button>
                          <button
                            onClick={handleClarify}
                            disabled={actionLoading}
                            style={{
                              backgroundColor: "#ef6c00",
                              color: "white",
                              border: "none",
                              padding: "12px",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px"
                            }}
                          >
                            <span className="material-symbols-outlined">chat_bubble</span>
                            Clarify
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%" }}>
                        {["Submitted", "AI Processing", "Pending Manager"].includes(selectedRequest.currentStatus) && (
                          <button
                            onClick={handleWithdraw}
                            disabled={actionLoading}
                            style={{
                              width: "100%",
                              padding: "12px",
                              backgroundColor: "transparent",
                              color: "#ba1a1a",
                              border: "1px solid #ba1a1a",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              fontSize: "14px",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>undo</span>
                            {actionLoading ? "Withdrawing..." : "Retrieve / Withdraw Request"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedRequest.currentStatus === "Purchase Ordered" && (
                  <div
                    style={{
                      borderTop: "2px dashed var(--outline-variant)",
                      paddingTop: "24px",
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2e7d32" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>local_shipping</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>Purchase Order Issued</h4>
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: "12px", fontSize: "14px" }}>
                      A purchase order has been generated automatically and dispatched to the recommended vendor.
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        <div>PO Number: <strong>PO-2026-NBD</strong></div>
                        <div>Estimated Delivery: <strong>5 Days</strong></div>
                        <div>Vendor: <strong>Dell Inc</strong></div>
                        <div>Authorized By: <strong>Sarah Jenkins</strong></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  border: "1px dashed var(--outline-variant)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px",
                  color: "var(--on-surface-variant)",
                  textAlign: "center"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--outline)" }}>
                  shopping_bag
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginTop: "16px" }}>No Request Selected</h3>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  Select an active procurement request from the list to view its real-time AI Agent execution tracking and manager decision brief.
                </p>
              </div>
            )
          ) : workflowType === "leave" ? (
            selectedLeave ? (
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--outline-variant)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "22px", fontWeight: "700" }}>{selectedLeave.leaveType}</h3>
                      <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "4px" }}>
                        Requested by: Employee {selectedLeave.employeeId} on {new Date(selectedLeave.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                        {Math.round((new Date(selectedLeave.endDate).getTime() - new Date(selectedLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                      </div>
                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)", marginTop: "4px" }}>
                        Status: <strong style={{ color: "var(--primary)" }}>{selectedLeave.currentStatus}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", fontSize: "14px" }}>
                    <div>Start Date: <strong>{new Date(selectedLeave.startDate).toLocaleDateString()}</strong></div>
                    <div>End Date: <strong>{new Date(selectedLeave.endDate).toLocaleDateString()}</strong></div>
                  </div>
                  <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                    <strong>Reason:</strong> "{selectedLeave.reason}"
                  </div>
                  {selectedLeave.optionalNote && (
                    <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Handover Note:</strong> "{selectedLeave.optionalNote}"
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>timeline</span>
                    AI Leave Agent Pipeline
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", paddingLeft: "24px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "9px",
                        top: "10px",
                        bottom: "10px",
                        width: "2px",
                        backgroundColor: "var(--outline-variant)"
                      }}
                    />

                    {[
                      { name: "Employee Context Agent", label: "Employee Profile Retrieved" },
                      { name: "Leave Balance Check Agent", label: "Leave Balance Checked" },
                      { name: "Leave Policy Agent", label: "Leave Policy Validated" },
                      { name: "Team Availability Agent", label: "Team Availability Checked" },
                      { name: "Calendar / Conflict Agent", label: "Calendar Conflicts Checked" },
                      { name: "Recommendation Agent", label: "Recommendation Generated" }
                    ].map((step, idx) => {
                      const log = leaveWorkflowLogs.find((l) => l.agentName === step.name);
                      const isCompleted = log && log.status === "Completed";
                      const isFailed = log && log.status === "Failed";

                      const isProcessing = !log && (
                        selectedLeave.currentStatus === "AI Processing" ||
                        selectedLeave.currentStatus === "Submitted"
                      ) && (
                        idx === leaveWorkflowLogs.length
                      );

                      let stepTextColor = "var(--on-surface-variant)";
                      let stepIcon = "circle";
                      let iconColor = "var(--outline-variant)";

                      if (isCompleted) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "check_circle";
                        iconColor = "#2e7d32";
                      } else if (isFailed) {
                        stepTextColor = "#ba1a1a";
                        stepIcon = "error";
                        iconColor = "#ba1a1a";
                      } else if (isProcessing) {
                        stepTextColor = "var(--on-surface)";
                        stepIcon = "sync";
                        iconColor = "var(--secondary)";
                      }

                      const isExpanded = expandedLogIndex === idx + 10;

                      return (
                        <div key={step.name} style={{ position: "relative" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: "-24px",
                              top: "2px",
                              width: "20px",
                              height: "20px",
                              borderRadius: "99px",
                              backgroundColor: "var(--surface)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 10
                            }}
                          >
                            <span
                              className={"material-symbols-outlined " + (isProcessing ? "animate-spin" : "")}
                              style={{
                                fontSize: "18px",
                                color: iconColor,
                                fontWeight: "bold"
                              }}
                            >
                              {stepIcon}
                            </span>
                          </div>

                          <div
                            onClick={() => isCompleted && setExpandedLogIndex(isExpanded ? null : idx + 10)}
                            style={{
                              cursor: isCompleted ? "pointer" : "default",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              backgroundColor: isExpanded ? "var(--surface-container-low)" : "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "14px", fontWeight: isCompleted || isProcessing ? "bold" : "normal", color: stepTextColor }}>
                                  {step.label}
                              </span>
                              {isCompleted && (
                                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--on-surface-variant)" }}>
                                  {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                              )}
                            </div>

                            {isExpanded && log && (
                              <div style={{ marginTop: "8px", borderTop: "1px solid var(--outline-variant)", paddingTop: "8px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ color: "var(--on-surface-variant)" }}>
                                  <strong>Agent reasoning:</strong> {log.reasoning}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedLeave.currentStatus === "AI Processing" && (
                  <div style={{ padding: "16px", backgroundColor: "#e3f2fd", color: "#1565c0", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    AI Agent Workflow is processing...
                  </div>
                )}

                {selectedLeave.currentStatus === "Submitted" && (
                  <div style={{ padding: "16px", backgroundColor: "#e3f2fd", color: "#1565c0", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                    <span className="material-symbols-outlined">schedule</span>
                    Leave request received. Initializing AI agents...
                  </div>
                )}

                {selectedLeave.currentStatus === "Pending Manager" && (
                  <div style={{ padding: "16px", backgroundColor: "#fff3e0", color: "#e65100", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                    <span className="material-symbols-outlined">hourglass_empty</span>
                    ⏳ Waiting for manager approval
                  </div>
                )}

                {selectedLeave.aiRecommendation && (
                  <div
                    style={{
                      border: "1px solid #ffe0b2",
                      backgroundColor: "#fff8e1",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#e65100" }}>
                        AI Recommendation: {selectedLeave.aiRecommendation}
                      </span>
                      <span style={{
                        backgroundColor: "#e65100",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {selectedLeave.confidence || 100}% confidence
                      </span>
                    </div>

                    <ul style={{ paddingLeft: "18px", listStyleType: "disc", fontSize: "14px", color: "#5d4037", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {leaveWorkflowLogs
                        .filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent")
                        .map((log, idx) => (
                          <li key={idx}>
                            <strong>{log.agentName}:</strong> {log.reasoning}
                          </li>
                        ))
                      }
                      {leaveWorkflowLogs.filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Recommendation Agent").length === 0 && (
                        <li>AI Coordinator agents are compiling audit results...</li>
                      )}
                    </ul>
                  </div>
                )}

                {portalViewRole === "Employee" && currentUser?.employeeId === selectedLeave.employeeId && ["Submitted", "AI Processing", "Pending Manager"].includes(selectedLeave.currentStatus) && (
                  <div style={{ borderTop: "1px solid var(--outline-variant)", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleLeaveWithdraw}
                      disabled={actionLoading}
                      className={styles.btnSecondary}
                      style={{ borderColor: "#ba1a1a", color: "#ba1a1a", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>cancel</span>
                      Withdraw Leave Request
                    </button>
                  </div>
                )}

                {portalViewRole === "Manager" && selectedLeave.currentStatus === "Pending Manager" && (
                  <div style={{ borderTop: "1px solid var(--outline-variant)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "bold" }}>Manager Review Comments / Rejection Reason</label>
                    <textarea
                      placeholder="Add review notes, reasons for rejection, or questions for clarification..."
                      className={styles.formInput}
                      style={{ minHeight: "80px", resize: "none", outline: "none" }}
                      value={leaveManagerComments}
                      onChange={(e) => setLeaveManagerComments(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <button
                        onClick={handleLeaveClarify}
                        disabled={actionLoading}
                        className={styles.btnSecondary}
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>help</span>
                        Request Clarification
                      </button>
                      <button
                        onClick={handleLeaveReject}
                        disabled={actionLoading}
                        className={styles.btnSecondary}
                        style={{ borderColor: "#ba1a1a", color: "#ba1a1a" }}
                      >
                        Reject Leave
                      </button>
                      <button
                        onClick={handleLeaveApprove}
                        disabled={actionLoading}
                        className={styles.btnPrimary}
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check</span>
                        Approve Leave
                      </button>
                    </div>
                  </div>
                )}

                {selectedLeave.currentStatus === "Clarification Requested" && (
                  <div style={{ padding: "16px", backgroundColor: "#fffde7", border: "1px solid #fff59d", borderRadius: "12px", color: "#f57f17" }}>
                    <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", fontSize: "15px", margin: 0 }}>
                      <span className="material-symbols-outlined">help</span>
                      Clarification Requested
                    </h4>
                    <p style={{ fontSize: "14px", marginTop: "8px", color: "var(--on-surface-variant)" }}>
                      The manager has requested clarification on this request. Please respond below to re-trigger analysis.
                    </p>

                    {portalViewRole === "Employee" && currentUser.employeeId === selectedLeave.employeeId && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <input
                          type="text"
                          placeholder="Type your response here..."
                          className={styles.formInput}
                          value={leaveClarifyResponse}
                          onChange={(e) => setLeaveClarifyResponse(e.target.value)}
                        />
                        <button
                          onClick={handleLeaveClarifyResponse}
                          disabled={actionLoading}
                          className={styles.btnPrimary}
                          style={{ alignSelf: "flex-end" }}
                        >
                          Submit Clarification Response
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedLeave.currentStatus === "Approved" && (
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#e8f5e9",
                      border: "1px solid #c8e6c9",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2e7d32" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>check_circle</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>Leave Approved Successfully</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--on-surface-variant)" }}>
                      Your leave balance has been successfully deducted, and notifications have been dispatched to your team and manager.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  border: "1px dashed var(--outline-variant)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px",
                  color: "var(--on-surface-variant)",
                  textAlign: "center"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--outline)" }}>
                  calendar_today
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginTop: "16px" }}>No Leave Request Selected</h3>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  Select an active leave request from the list to view its real-time AI Agent execution tracking and manager decision brief.
                </p>
              </div>
            )
          ) : workflowType === "expense" ? (
            selectedClaim ? (
              <div
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--outline-variant)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: "22px", fontWeight: "700" }}>💰 {selectedClaim.expenseType} Claim</h3>
                      <p style={{ color: "var(--on-surface-variant)", fontSize: "14px", marginTop: "4px" }}>
                        Submitted by Employee {selectedClaim.employeeId} on {new Date(selectedClaim.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", fontWeight: "bold", color: "var(--primary)" }}>₹{selectedClaim.amount?.toLocaleString()}</div>
                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--on-surface-variant)", marginTop: "4px" }}>
                        Status: <strong>{selectedClaim.currentStatus}</strong>
                      </div>
                    </div>
                  </div>
                  {selectedClaim.description && (
                    <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "var(--surface-container-low)", borderRadius: "8px", fontSize: "14px" }}>
                      <strong>Business Purpose / Description:</strong> "{selectedClaim.description}"
                    </div>
                  )}
                  {selectedClaim.receiptFileName && (
                    <div style={{ marginTop: "8px", padding: "10px 12px", backgroundColor: "#eef2ff", borderRadius: "8px", fontSize: "13px", color: "#3730a3", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>receipt_long</span>
                      <span><strong>Attached Receipt:</strong> {selectedClaim.receiptFileName} (OCR Extracted)</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontWeight: "700", marginBottom: "16px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-symbols-outlined">hub</span>
                    Multi-Agent Expense Reimbursement Audit Timeline
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", paddingLeft: "16px" }}>
                    {[
                      { name: "Employee Context Agent", label: "Employee Limits & History Verified" },
                      { name: "Receipt Agent", label: "OCR Vision Receipt Extraction" },
                      { name: "Expense Classification Agent", label: "Auto Categorization & Purpose Match" },
                      { name: "Expense History Agent", label: "Spending Pattern Scan" },
                      { name: "Policy Agent", label: "RAG Expense Policy Check" },
                      { name: "Duplicate Detection Agent", label: "Receipt Hash Fingerprint Match" },
                      { name: "Risk Agent", label: "Multi-Factor Risk Score Calculation" },
                      { name: "Reimbursement Recommendation Agent", label: "Final Recommendation Synthesis" }
                    ].map((step, idx) => {
                      const log = expenseWorkflowLogs.find((l) => l.agentName === step.name);
                      const isCompleted = !!log;
                      const isProcessing = selectedClaim.currentStatus === "AI Processing" && !isCompleted;
                      const isExpanded = expandedLogIndex === idx + 20;

                      return (
                        <div key={idx} style={{ position: "relative" }}>
                          <div
                            onClick={() => isCompleted && setExpandedLogIndex(isExpanded ? null : idx + 20)}
                            style={{
                              cursor: isCompleted ? "pointer" : "default",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              backgroundColor: isExpanded ? "var(--surface-container-low)" : "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "14px", fontWeight: isCompleted || isProcessing ? "bold" : "normal" }}>
                                {isCompleted ? `✓ ${step.label}` : isProcessing ? `⏳ Processing ${step.label}...` : step.label}
                              </span>
                              {isCompleted && (
                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                  {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                              )}
                            </div>

                            {isExpanded && log && (
                              <div style={{ marginTop: "8px", borderTop: "1px solid var(--outline-variant)", paddingTop: "8px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div><strong>Agent reasoning:</strong> {log.reasoning}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedClaim.aiRecommendation && (
                  <div
                    style={{
                      border: "1px solid #ffe0b2",
                      backgroundColor: "#fff8e1",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#e65100" }}>
                        💰 AI Finding: Reimbursement {selectedClaim.aiRecommendation}
                      </span>
                      <span style={{
                        backgroundColor: "#e65100",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {selectedClaim.confidence || 98}% confidence
                      </span>
                    </div>

                    <ul style={{ paddingLeft: "18px", listStyleType: "disc", fontSize: "14px", color: "#5d4037", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {expenseWorkflowLogs
                        .filter(log => log.agentName !== "Notification Agent" && log.agentName !== "Reimbursement Recommendation Agent")
                        .map((log, idx) => (
                          <li key={idx}>
                            <strong>{log.agentName}:</strong> {log.reasoning}
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                )}

                {portalViewRole === "Employee" && currentUser.employeeId === selectedClaim.employeeId && ["Submitted", "AI Processing", "Pending Manager"].includes(selectedClaim.currentStatus) && (
                  <div style={{ borderTop: "1px solid var(--outline-variant)", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleExpenseWithdraw}
                      disabled={actionLoading}
                      className={styles.btnSecondary}
                      style={{ borderColor: "#ba1a1a", color: "#ba1a1a", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>cancel</span>
                      Withdraw Expense Claim
                    </button>
                  </div>
                )}

                {portalViewRole === "Manager" && selectedClaim.currentStatus === "Pending Manager" && (
                  <div style={{ borderTop: "1px solid var(--outline-variant)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleExpenseAction("Clarify")}
                        disabled={actionLoading}
                        className={styles.btnSecondary}
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>help</span>
                        Request Clarification
                      </button>
                      <button
                        onClick={() => handleExpenseAction("Reject")}
                        disabled={actionLoading}
                        className={styles.btnSecondary}
                        style={{ borderColor: "#ba1a1a", color: "#ba1a1a" }}
                      >
                        Reject Claim
                      </button>
                      <button
                        onClick={() => handleExpenseAction("Approve")}
                        disabled={actionLoading}
                        className={styles.btnPrimary}
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check</span>
                        Approve Reimbursement
                      </button>
                    </div>
                  </div>
                )}

                {(selectedClaim.currentStatus === "Payment Processing" || selectedClaim.currentStatus === "Payment Completed") && (
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#e8f5e9",
                      border: "1px solid #c8e6c9",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2e7d32" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>payments</span>
                      <h4 style={{ fontSize: "18px", fontWeight: "700" }}>🎉 Expense Reimbursement Approved</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--on-surface-variant)" }}>
                      Amount: <strong>₹{selectedClaim.amount?.toLocaleString()}</strong> | Status: <strong>{selectedClaim.currentStatus === "Payment Processing" ? "Payment Processing in Finance Queue" : "💰 Payment Completed - Account Credited"}</strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  border: "1px dashed var(--outline-variant)",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px",
                  color: "var(--on-surface-variant)",
                  textAlign: "center"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--outline)" }}>
                  receipt_long
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginTop: "16px" }}>No Expense Claim Selected</h3>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  Select an active expense claim from the list to view its real-time AI Agent execution tracking and decision brief.
                </p>
              </div>
            )
          ) : null}
          </div>
        </section>

        <section className={styles.updatesSection}>
          <h2 className={styles.sectionHeader}>Recent System Activity</h2>
          <div className={styles.updatesCard}>
            {recentUpdates.map((update) => (
              <div key={update.id} className={styles.updateItem}>
                <div className={styles.updateIcon}>
                  <span className="material-symbols-outlined">{getUpdateIcon(update.type)}</span>
                </div>
                <div className={styles.updateContent}>
                  <h4 className={styles.updateHeader}>{update.title}</h4>
                  <p className={styles.updateText}>{update.description}</p>
                  <span className={styles.updateTime}>{update.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <nav className={styles.bottomNav}>
        <button
          onClick={() => setActiveTab("home")}
          className={`${styles.navButton} ${activeTab === "home" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "home" ? "'FILL' 1" : "" }}>dashboard</span>
          <span className={styles.navButtonText}>Home</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("procure");
            setIsProcureModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "procure" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "procure" ? "'FILL' 1" : "" }}>shopping_cart</span>
          <span className={styles.navButtonText}>Procure</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("leave");
            setIsLeaveModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "leave" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "leave" ? "'FILL' 1" : "" }}>calendar_today</span>
          <span className={styles.navButtonText}>Leave</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("expenses");
            setIsExpenseModalOpen(true);
          }}
          className={`${styles.navButton} ${activeTab === "expenses" ? styles.navButtonActive : ""}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === "expenses" ? "'FILL' 1" : "" }}>receipt_long</span>
          <span className={styles.navButtonText}>Expenses</span>
        </button>
      </nav>

      {isLeaveModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsLeaveModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Request Leave</h3>
              <button className={styles.modalClose} onClick={() => setIsLeaveModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Leave Type</label>
                  <select
                    className={styles.formSelect}
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                  >
                    <option>Annual Leave</option>
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>Maternity/Paternity Leave</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Start Date</label>
                  <input
                    type="date"
                    required
                    className={styles.formInput}
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>End Date</label>
                  <input
                    type="date"
                    required
                    className={styles.formInput}
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter reason for leave..."
                    className={styles.formInput}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                  <input
                    type="checkbox"
                    id="halfDayCheckbox"
                    checked={leaveHalfDay}
                    onChange={(e) => setLeaveHalfDay(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="halfDayCheckbox" className={styles.formLabel} style={{ margin: 0, cursor: "pointer" }}>
                    Half Day Request
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Optional Handover Note</label>
                  <textarea
                    placeholder="Enter handover details or notes (optional)..."
                    className={styles.formInput}
                    style={{ minHeight: "60px", resize: "none", outline: "none" }}
                    value={leaveOptionalNote}
                    onChange={(e) => setLeaveOptionalNote(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsLeaveModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>smart_toy</span>
                  Initiate AI Analysis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExpenseModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>💰 Submit Expense Claim</h3>
              <button className={styles.modalClose} onClick={() => setIsExpenseModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className={styles.modalBody}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Expense Type</label>
                    <select
                      className={styles.formSelect}
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <option value="Travel">Travel (Rideshare / Taxi / Flight)</option>
                      <option value="Medical & Health">Medical & Health (Consultations / Prescriptions)</option>
                      <option value="Cloud / Software">Cloud / Software (SaaS / AWS)</option>
                      <option value="Internet & Cell Phone Allowance">Internet / Wifi Allowance</option>
                      <option value="Meals & Client Entertainment">Meals & Client Entertainment</option>
                      <option value="Office Supplies & Equipment">Office Supplies & Equipment</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (₹)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      placeholder="e.g. 4850"
                      className={styles.formInput}
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date</label>
                    <input
                      type="date"
                      required
                      className={styles.formInput}
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Payment Method</label>
                    <select
                      className={styles.formSelect}
                      value={expensePaymentMethod}
                      onChange={(e) => setExpensePaymentMethod(e.target.value)}
                    >
                      <option value="Personal Card">Personal Card</option>
                      <option value="Corporate Card">Corporate Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description / Business Purpose</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travel to client office in Bangalore"
                    className={styles.formInput}
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Receipt ⭐ (OCR Auto-Extraction)</label>
                  <label style={{
                    border: "2px dashed var(--primary)",
                    borderRadius: "8px",
                    padding: "16px",
                    textAlign: "center",
                    backgroundColor: "var(--surface-container-lowest)",
                    cursor: "pointer",
                    display: "block"
                  }}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setExpenseReceiptFile(e.target.files[0].name);
                        }
                      }}
                    />
                    <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--primary)" }}>cloud_upload</span>
                    <p style={{ fontSize: "13px", fontWeight: "bold", marginTop: "4px" }}>
                      {expenseReceiptFile ? `✓ Selected: ${expenseReceiptFile}` : "Click to select receipt (.jpg, .png, .pdf)"}
                    </p>
                    <span style={{ fontSize: "11px", color: "var(--on-surface-variant)" }}>Receipt Agent automatically extracts Merchant, Date & Amount via Vision OCR</span>
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Submit Claim for AI Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProcureModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProcureModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create AI-Analyzed Procurement Order</h3>
              <button className={styles.modalClose} onClick={() => setIsProcureModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleProcureSubmit}>
              <div className={styles.modalBody}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell Precision Laptop"
                      className={styles.formInput}
                      value={procureItem}
                      onChange={(e) => setProcureItem(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category</label>
                    <select
                      className={styles.formSelect}
                      value={procureCategory}
                      onChange={(e) => setProcureCategory(e.target.value)}
                    >
                      <option value="Laptop">Laptop</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Software">Software</option>
                      <option value="Cloud Credits">Cloud Credits</option>
                      <option value="Office Supplies">Office Supplies</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Preferred Vendor</label>
                    <select
                      className={styles.formSelect}
                      value={procureVendor}
                      onChange={(e) => setProcureVendor(e.target.value)}
                    >
                      <option value="Dell Inc">Dell Inc (Approved)</option>
                      <option value="HP Store">HP Store (Approved)</option>
                      <option value="Apple Enterprise">Apple Enterprise (Approved)</option>
                      <option value="Blacklisted Hardware">Blacklisted Hardware (Warning!)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Estimated Unit Cost (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2499"
                      className={styles.formInput}
                      value={procureCost}
                      onChange={(e) => setProcureCost(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className={styles.formInput}
                      value={procureQty}
                      onChange={(e) => setProcureQty(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority</label>
                    <select
                      className={styles.formSelect}
                      value={procurePriority}
                      onChange={(e) => setProcurePriority(e.target.value)}
                    >
                      <option value="Low">Low (Non-urgent replenishment)</option>
                      <option value="Medium">Medium (Standard upgrade)</option>
                      <option value="High">High (Immediate work block)</option>
                      <option value="Critical">Critical (System downtime)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Business Justification</label>
                  <textarea
                    required
                    placeholder="Explain why this equipment is needed..."
                    className={styles.formInput}
                    style={{ minHeight: "80px", outline: "none", resize: "none" }}
                    value={procureReason}
                    onChange={(e) => setProcureReason(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Specifications (Optional)</label>
                  <textarea
                    placeholder="Describe specific models, brands, or technical specs (e.g. 16GB RAM, 512GB SSD)..."
                    className={styles.formInput}
                    style={{ minHeight: "60px", outline: "none", resize: "none" }}
                    value={procureSpecs}
                    onChange={(e) => setProcureSpecs(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsProcureModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>smart_toy</span>
                  Initiate AI Analysis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {customDialog.isOpen && (
        <div className={styles.modalOverlay} onClick={() => {
          if (customDialog.type === "alert") {
            setCustomDialog(prev => ({ ...prev, isOpen: false }));
          }
        }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
                {customDialog.type === "confirm" ? (
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>help</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>info</span>
                )}
                {customDialog.title}
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5", color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                {customDialog.message}
              </p>
            </div>
            <div className={styles.modalFooter}>
              {customDialog.type === "confirm" ? (
                <>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      if (customDialog.onCancel) customDialog.onCancel();
                      setCustomDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => {
                      if (customDialog.onConfirm) customDialog.onConfirm();
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  className={styles.btnPrimary}
                  onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
