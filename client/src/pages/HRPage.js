import { useEffect, useState } from "react";
import clsx from "clsx";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/formatters";
import useAuth from "../hooks/useAuth";

// Leave types - will be translated using t()
const LEAVE_TYPES = [
  { value: "annual", labelKey: "hr.annualLeave" },
  { value: "sick", labelKey: "hr.sickLeave" },
  { value: "personal", labelKey: "hr.personalLeave" },
  { value: "emergency", labelKey: "hr.emergencyLeave" },
  { value: "unpaid", labelKey: "hr.unpaidLeave" }
];

// Contract types - will be translated using t()
const CONTRACT_TYPES = [
  { value: "full-time", labelKey: "hr.fullTime" },
  { value: "part-time", labelKey: "hr.partTime" },
  { value: "contract", labelKey: "hr.contract" },
  { value: "temporary", labelKey: "hr.temporary" }
];

export default function HRPage({ language }) {
  const { t } = useTranslation();
  const { role, uid } = useAuth();
  const isAdmin = role === "admin";

  const [activeTab, setActiveTab] = useState("employees");
  const [loading, setLoading] = useState(true);
  
  // Employees state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationality: "",
    emiratesId: "",
    passportNumber: "",
    passportExpiry: "",
    visaExpiry: "",
    insuranceExpiry: "",
    visaStatus: "active",
    insuranceStatus: "active",
    designation: "",
    contractType: "full-time",
    basicSalary: "",
    allowance: "",
    joiningDate: "",
    notes: ""
  });
  const [savingEmployee, setSavingEmployee] = useState(false);

  // Contracts state
  const [contracts, setContracts] = useState([]);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({
    employeeId: "",
    contractType: "full-time",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: "",
    basicSalary: "",
    allowance: "",
    designation: "",
    terms: ""
  });
  const [savingContract, setSavingContract] = useState(false);

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "annual",
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    reason: ""
  });
  const [savingLeave, setSavingLeave] = useState(false);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState("");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "employees") {
        const { data } = await apiClient.get("/hr/employees");
        setEmployees(Array.isArray(data) ? data : []);
      } else if (activeTab === "contracts") {
        const { data } = await apiClient.get("/hr/contracts");
        setContracts(Array.isArray(data) ? data : []);
      } else if (activeTab === "leave") {
        const { data } = await apiClient.get("/hr/leave-requests");
        setLeaveRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingEmployee(true);
    try {
      if (selectedEmployee) {
        const { data } = await apiClient.put(`/hr/employees/${selectedEmployee.id}`, employeeForm);
        setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? data : emp));
      } else {
        const { data } = await apiClient.post("/hr/employees", employeeForm);
        setEmployees(prev => [data, ...prev]);
      }
      setShowEmployeeForm(false);
      setSelectedEmployee(null);
      setEmployeeForm({
        fullName: "",
        email: "",
        phone: "",
        nationality: "",
        emiratesId: "",
        passportNumber: "",
        passportExpiry: "",
        visaExpiry: "",
        insuranceExpiry: "",
        visaStatus: "active",
        insuranceStatus: "active",
        designation: "",
        contractType: "full-time",
        basicSalary: "",
        allowance: "",
        joiningDate: "",
        notes: ""
      });
    } catch (err) {
      console.error("Failed to save employee:", err);
      alert(err.response?.data?.message || t("hr.failedToSave"));
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleEditEmployee = (employee) => {
    if (!isAdmin && employee.email !== uid) {
      alert(t("hr.onlyEditOwn"));
      return;
    }
    setSelectedEmployee(employee);
    setEmployeeForm({
      fullName: employee.fullName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      nationality: employee.nationality || "",
      emiratesId: employee.emiratesId || "",
      passportNumber: employee.passportNumber || "",
      passportExpiry: employee.passportExpiry ? dayjs(employee.passportExpiry).format("YYYY-MM-DD") : "",
      visaExpiry: employee.visaExpiry ? dayjs(employee.visaExpiry).format("YYYY-MM-DD") : "",
      insuranceExpiry: employee.insuranceExpiry ? dayjs(employee.insuranceExpiry).format("YYYY-MM-DD") : "",
      visaStatus: employee.visaStatus || "active",
      insuranceStatus: employee.insuranceStatus || "active",
      designation: employee.designation || "",
      contractType: employee.contractType || "full-time",
      basicSalary: employee.basicSalary || "",
      allowance: employee.allowance || "",
      joiningDate: employee.joiningDate ? dayjs(employee.joiningDate).format("YYYY-MM-DD") : "",
      notes: employee.notes || ""
    });
    setShowEmployeeForm(true);
  };

  const handleDeleteEmployee = async (employee) => {
    if (!isAdmin) return;
    if (!window.confirm(t("hr.deleteConfirm", { name: employee.fullName || employee.name }))) return;
    
    const employeeId = employee.id || employee._id;
    if (!employeeId) {
      alert("Error: Employee ID not found");
      console.error("Employee object:", employee);
      return;
    }
    
    try {
      console.log("[HR] Deleting employee:", employeeId, employee.fullName || employee.name);
      const response = await apiClient.delete(`/hr/employees/${employeeId}`);
      console.log("[HR] Delete response:", response.data);
      
      // Reload employees list to ensure UI is in sync
      await loadData();
      
      alert(t("hr.employeeDeleted"));
    } catch (err) {
      console.error("[HR] Delete employee error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to delete employee";
      alert(`${t("common.error")}: ${errorMessage}`);
    }
  };

  const handleDocumentUpload = async (employeeId, type, file) => {
    if (!isAdmin) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const endpoint = `/hr/employees/${employeeId}/documents/${type}`;
      await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      await loadData();
      alert(t("hr.documentUploaded"));
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToUpload"));
    } finally {
      setUploadingDoc(false);
      setDocType("");
    }
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingContract(true);
    try {
      const { data } = await apiClient.post("/hr/contracts", contractForm);
      setContracts(prev => [data, ...prev]);
      setShowContractForm(false);
      setContractForm({
        employeeId: "",
        contractType: "full-time",
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: "",
        basicSalary: "",
        allowance: "",
        designation: "",
        terms: ""
      });
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToCreateContract"));
    } finally {
      setSavingContract(false);
    }
  };

  const handleGenerateContractPDF = async (contractId) => {
    try {
      const response = await apiClient.post(`/hr/contracts/${contractId}/generate-pdf`, {}, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `contract-${contractId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToGeneratePdf"));
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setSavingLeave(true);
    try {
      const { data } = await apiClient.post("/hr/leave-requests", leaveForm);
      setLeaveRequests(prev => [data, ...prev]);
      setShowLeaveForm(false);
      setLeaveForm({
        leaveType: "annual",
        startDate: dayjs().format("YYYY-MM-DD"),
        endDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
        reason: ""
      });
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToSubmit"));
    } finally {
      setSavingLeave(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    if (!isAdmin) return;
    try {
      const { data } = await apiClient.put(`/hr/leave-requests/${leaveId}/approve`);
      setLeaveRequests(prev => prev.map(leave => leave.id === leaveId ? data : leave));
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToApprove"));
    }
  };

  const handleRejectLeave = async (leaveId, reason) => {
    if (!isAdmin) return;
    try {
      const { data } = await apiClient.put(`/hr/leave-requests/${leaveId}/reject`, { reason });
      setLeaveRequests(prev => prev.map(leave => leave.id === leaveId ? data : leave));
    } catch (err) {
      alert(err.response?.data?.message || t("hr.failedToReject"));
    }
  };

  if (loading) {
    return <LoadingState message={t("common.loading")} />;
  }

  return (
    <div className={clsx("space-y-6", language === "ar" && "rtl")}>
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-800">{t("hr.title")}</h2>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("employees")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition",
              activeTab === "employees"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t("hr.employees")}
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition",
              activeTab === "contracts"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t("hr.contracts")}
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition",
              activeTab === "leave"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {t("hr.leaveRequests")}
          </button>
        </div>

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div className="mt-6">
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setShowEmployeeForm(true);
                }}
                className="mb-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                + {t("hr.addEmployee")}
              </button>
            )}

            {showEmployeeForm && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
                <h3 className="mb-4 text-lg font-semibold">
                  {selectedEmployee ? t("hr.editEmployee") : t("hr.addEmployee")}
                </h3>
                <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.fullName")} *</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.fullName}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, fullName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.email")}</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.phone")}</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.phone}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.nationality")}</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.nationality}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, nationality: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.emiratesId")}</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.emiratesId}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, emiratesId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.passportNumber")}</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.passportNumber}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, passportNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.passportExpiry")}</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.passportExpiry}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, passportExpiry: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.visaExpiry")}</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.visaExpiry}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, visaExpiry: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.insuranceExpiry")}</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.insuranceExpiry}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, insuranceExpiry: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.designation")}</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.designation}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, designation: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.contractType")}</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.contractType}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, contractType: e.target.value }))}
                      >
                        {CONTRACT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.basicSalary")}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.basicSalary}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Allowance</label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.allowance}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, allowance: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.joiningDate")}</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={employeeForm.joiningDate}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">{t("hr.notes")}</label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={employeeForm.notes || ""}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t("hr.notes")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEmployee}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                    >
                      {savingEmployee ? t("hr.saving") : (selectedEmployee ? t("hr.update") : t("hr.create"))}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmployeeForm(false);
                        setSelectedEmployee(null);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {employees.length === 0 ? (
              <EmptyState title={t("hr.noEmployees")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.fullName")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.email")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.designation")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("employees.salary")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td className="px-3 py-3 font-medium">{emp.fullName || emp.name}</td>
                        <td className="px-3 py-3">{emp.email || "—"}</td>
                        <td className="px-3 py-3">{emp.designation || emp.position || "—"}</td>
                        <td className="px-3 py-3">
                          {formatCurrency(
                            parseFloat(emp.basicSalary || 0) + parseFloat(emp.allowance || 0),
                            language === "ar" ? "ar-AE" : "en-AE"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditEmployee(emp)}
                              className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                            >
                              {t("common.edit")}
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleDeleteEmployee(emp)}
                                  className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                                >
                                  {t("common.delete")}
                                </button>
                                <label className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 cursor-pointer">
                                  {t("hr.uploadDoc")}
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const type = prompt("Document type: passport, emirates-id, visa, or insurance");
                                        if (type) {
                                          const docTypeMap = {
                                            "passport": "passport",
                                            "emirates-id": "emirates-id",
                                            "visa": "visa",
                                            "insurance": "insurance"
                                          };
                                          handleDocumentUpload(emp.id, docTypeMap[type] || type, file);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === "contracts" && (
          <div className="mt-6">
            {isAdmin && (
              <button
                onClick={() => setShowContractForm(true)}
                className="mb-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                + {t("hr.createContract")}
              </button>
            )}

            {showContractForm && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
                <h3 className="mb-4 text-lg font-semibold">{t("hr.createContract")}</h3>
                <form onSubmit={handleContractSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.employee")} *</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.employeeId}
                        onChange={(e) => setContractForm(prev => ({ ...prev, employeeId: e.target.value }))}
                        required
                      >
                        <option value="">{t("hr.selectEmployee")}</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.fullName || emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.contractType")} *</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.contractType}
                        onChange={(e) => setContractForm(prev => ({ ...prev, contractType: e.target.value }))}
                        required
                      >
                        {CONTRACT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Start Date *</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.startDate}
                        onChange={(e) => setContractForm(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.endDate")}</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.endDate}
                        onChange={(e) => setContractForm(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Basic Salary *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.basicSalary}
                        onChange={(e) => setContractForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Allowance</label>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.allowance}
                        onChange={(e) => setContractForm(prev => ({ ...prev, allowance: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">Designation *</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={contractForm.designation}
                        onChange={(e) => setContractForm(prev => ({ ...prev, designation: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">{t("hr.terms")}</label>
                    <textarea
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={contractForm.terms}
                      onChange={(e) => setContractForm(prev => ({ ...prev, terms: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingContract}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                    >
                      {savingContract ? t("hr.creating") : t("hr.createContract")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContractForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {contracts.length === 0 ? (
              <EmptyState title={t("hr.noContracts")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.contractNumber")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.employee")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.type")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.startDate")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("employees.salary")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contracts.map((contract) => (
                      <tr key={contract.id}>
                        <td className="px-3 py-3 font-medium">{contract.contractNumber}</td>
                        <td className="px-3 py-3">
                          {contract.employee?.fullName || contract.employee?.name || "—"}
                        </td>
                        <td className="px-3 py-3">{contract.contractType}</td>
                        <td className="px-3 py-3">
                          {dayjs(contract.startDate).format("YYYY-MM-DD")}
                        </td>
                        <td className="px-3 py-3">
                          {formatCurrency(
                            parseFloat(contract.basicSalary || 0) + parseFloat(contract.allowance || 0),
                            language === "ar" ? "ar-AE" : "en-AE"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => handleGenerateContractPDF(contract.id)}
                                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                              >
                                {t("hr.generatePdf")}
                              </button>
                            )}
                            {contract.pdfUrl && (
                              <a
                                href={`/api${contract.pdfUrl}`}
                                download
                                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                              >
                                {t("hr.download")}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Leave Requests Tab */}
        {activeTab === "leave" && (
          <div className="mt-6">
            <button
              onClick={() => setShowLeaveForm(true)}
              className="mb-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              + {t("hr.applyForLeave")}
            </button>

            {showLeaveForm && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-6">
                <h3 className="mb-4 text-lg font-semibold">{t("hr.applyForLeave")}</h3>
                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.leaveType")} *</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={leaveForm.leaveType}
                        onChange={(e) => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value }))}
                        required
                      >
                        {LEAVE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{t(type.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.startDate")} *</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600">{t("hr.endDate")} *</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600">{t("hr.reason")}</label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingLeave}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                    >
                      {savingLeave ? t("hr.submitting") : t("hr.submitRequest")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {leaveRequests.length === 0 ? (
              <EmptyState title={t("hr.noLeaveRequests")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.employee")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.type")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.startDate")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.endDate")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("hr.days")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("common.status")}</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {leaveRequests.map((leave) => (
                      <tr key={leave.id}>
                        <td className="px-3 py-3">
                          {leave.employee?.fullName || leave.employee?.name || "—"}
                        </td>
                        <td className="px-3 py-3">{leave.leaveType}</td>
                        <td className="px-3 py-3">
                          {dayjs(leave.startDate).format("YYYY-MM-DD")}
                        </td>
                        <td className="px-3 py-3">
                          {dayjs(leave.endDate).format("YYYY-MM-DD")}
                        </td>
                        <td className="px-3 py-3">{leave.totalDays} {t("hr.days")}</td>
                        <td className="px-3 py-3">
                          <span
                            className={clsx(
                              "rounded-full px-2 py-1 text-xs font-medium",
                              leave.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : leave.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            )}
                          >
                            {t(`hr.${leave.status}`)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {isAdmin && leave.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveLeave(leave.id)}
                                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                              >
                                {t("hr.approve")}
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt(t("hr.rejectionReason"));
                                  if (reason) handleRejectLeave(leave.id, reason);
                                }}
                                className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                              >
                                {t("hr.reject")}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

