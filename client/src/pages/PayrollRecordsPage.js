import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import clsx from "clsx";
import useAuth from "../hooks/useAuth";
import apiClient from "../services/apiClient";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatCurrency } from "../utils/formatters";

export default function PayrollRecordsPage({ language }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showSalaryStructureModal, setShowSalaryStructureModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [savingStructure, setSavingStructure] = useState(false);

  const isAdmin = role === "admin" || role === "accountant";

  useEffect(() => {
    loadPeriods();
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadRecords();
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const response = await apiClient.get("/payroll/periods");
      setPeriods(response.data || []);
      if (response.data && response.data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(response.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load periods:", err);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get("/employees");
      setEmployees(response.data || []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  const loadRecords = async () => {
    if (!selectedPeriodId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get("/payroll/records", {
        params: { payrollPeriodId: selectedPeriodId }
      });
      setRecords(response.data || []);
    } catch (err) {
      console.error("Failed to load records:", err);
      setError(err.response?.data?.message || "Failed to load payroll records");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedPeriodId) {
      alert("Please select a payroll period");
      return;
    }

    if (!confirm("Are you sure you want to process payroll for this period? This will calculate salaries for all employees.")) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await apiClient.post("/payroll/process", {
        payrollPeriodId: parseInt(selectedPeriodId)
      });
      alert("Payroll processed successfully!");
      loadRecords();
    } catch (err) {
      console.error("Failed to process payroll:", err);
      setError(err.response?.data?.message || "Failed to process payroll");
      alert(err.response?.data?.message || "Failed to process payroll");
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (recordId) => {
    try {
      console.log("[Payroll] Approving record:", recordId);
      const response = await apiClient.post(`/payroll/records/${recordId}/approve`);
      console.log("[Payroll] ✓ Approval successful:", response.data);
      loadRecords();
      alert("Payroll record approved successfully!");
    } catch (err) {
      console.error("[Payroll] ✗ Failed to approve:", err);
      console.error("[Payroll] Error details:", {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || err.message || "Failed to approve payroll record";
      alert(errorMessage);
    }
  };

  const handleMarkAsPaid = async (recordId) => {
    try {
      console.log("[Payroll] Marking record as paid:", recordId);
      const response = await apiClient.post(`/payroll/records/${recordId}/mark-paid`);
      console.log("[Payroll] ✓ Mark as paid successful:", response.data);
      loadRecords();
      alert("Payroll marked as paid successfully!");
    } catch (err) {
      console.error("[Payroll] ✗ Failed to mark as paid:", err);
      console.error("[Payroll] Error details:", {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      const errorMessage = err.response?.data?.message || err.message || "Failed to mark payroll as paid";
      alert(errorMessage);
    }
  };

  const handleGeneratePayslip = async (recordId) => {
    try {
      console.log("[Payroll] Generating payslip for record:", recordId);
      
      const response = await apiClient.get(`/payroll/records/${recordId}/payslip`, {
        responseType: "blob"
      });
      
      // Check if response is actually a PDF (blob with PDF content type)
      if (response.data instanceof Blob) {
        const blob = response.data;
        console.log("[Payroll] Received PDF blob, size:", blob.size, "type:", blob.type);
        
        // Check if it's actually a PDF or an error JSON
        if (blob.type === 'application/json' || blob.size < 100) {
          // Likely an error response, try to parse it
          const text = await blob.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || "Failed to generate payslip");
          } catch (parseError) {
            throw new Error(text || "Failed to generate payslip");
          }
        }
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `payslip-${recordId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        console.log("[Payroll] ✓ Payslip downloaded successfully");
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      console.error("[Payroll] Failed to generate payslip:", err);
      console.error("[Payroll] Error details:", {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      
      // Try to extract error message from blob if it's a JSON error
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const errorData = JSON.parse(errorText);
          alert(errorData.message || "Failed to generate payslip");
        } catch (parseError) {
          alert(err.response?.data?.message || err.message || "Failed to generate payslip");
        }
      } else {
        alert(err.response?.data?.message || err.message || "Failed to generate payslip");
      }
    }
  };

  const handleManageSalaryStructure = async (employeeId) => {
    try {
      setSelectedEmployee(employees.find(emp => emp.id === employeeId));
      
      // Try to load existing salary structure
      try {
        const response = await apiClient.get(`/payroll/employees/${employeeId}/salary-structure`);
        setSalaryStructure(response.data || {
          basicSalary: 0,
          housingAllowance: 0,
          transportAllowance: 0,
          foodAllowance: 0,
          medicalAllowance: 0,
          otherAllowances: 0,
          incomeTaxRate: 0,
          socialSecurityRate: 0,
          bankName: "",
          bankAccountNumber: "",
          iban: "",
          swiftCode: ""
        });
      } catch (err) {
        // If no structure exists, create default one
        const employee = employees.find(emp => emp.id === employeeId);
        setSalaryStructure({
          basicSalary: parseFloat(employee?.basicSalary || employee?.salary || 0),
          housingAllowance: parseFloat(employee?.allowance || 0),
          transportAllowance: 0,
          foodAllowance: 0,
          medicalAllowance: 0,
          otherAllowances: 0,
          incomeTaxRate: 0,
          socialSecurityRate: 0,
          bankName: "",
          bankAccountNumber: "",
          iban: "",
          swiftCode: ""
        });
      }
      
      setShowSalaryStructureModal(true);
    } catch (err) {
      console.error("Failed to load salary structure:", err);
      alert(err.response?.data?.message || "Failed to load salary structure");
    }
  };

  const handleSaveSalaryStructure = async () => {
    if (!selectedEmployee) return;
    
    setSavingStructure(true);
    try {
      await apiClient.post(`/payroll/employees/${selectedEmployee.id}/salary-structure`, salaryStructure);
      alert("Salary structure saved successfully!");
      setShowSalaryStructureModal(false);
      setSelectedEmployee(null);
      setSalaryStructure(null);
    } catch (err) {
      console.error("Failed to save salary structure:", err);
      alert(err.response?.data?.message || "Failed to save salary structure");
    } finally {
      setSavingStructure(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && records.length === 0 && selectedPeriodId) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Records</h1>
          <p className="text-sm text-slate-600 mt-1">View and manage employee payroll</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleProcessPayroll}
            disabled={processing || !selectedPeriodId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition"
          >
            {processing ? "Processing..." : "Process Payroll"}
          </button>
        )}
      </div>

      {/* Period Selector */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Payroll Period
        </label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-lg"
        >
          <option value="">Select Period</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.periodName} ({dayjs(period.startDate).format("MMM DD")} - {dayjs(period.endDate).format("MMM DD")})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Records Table */}
      {!selectedPeriodId ? (
        <EmptyState message="Please select a payroll period" />
      ) : records.length === 0 ? (
        <EmptyState message="No payroll records found. Click 'Process Payroll' to generate records." />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Basic Salary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Gross Salary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Deductions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Net Payable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {record.employee?.fullName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatCurrency(record.basicSalary || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatCurrency(record.grossSalary || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatCurrency(record.totalDeductions || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(record.totalPayable || record.netSalary || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          getStatusColor(record.status)
                        )}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {isAdmin && (
                          <button
                            onClick={() => handleManageSalaryStructure(record.employeeId)}
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                            title="Manage Salary Structure & Bank Account"
                          >
                            Account
                          </button>
                        )}
                        <button
                          onClick={() => handleGeneratePayslip(record.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                          title="Download Payslip"
                        >
                          PDF
                        </button>
                        {record.status === "draft" && isAdmin && (
                          <button
                            onClick={() => handleApprove(record.id)}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            Approve
                          </button>
                        )}
                        {record.status === "approved" && isAdmin && (
                          <button
                            onClick={() => handleMarkAsPaid(record.id)}
                            className="text-sm text-purple-600 hover:text-purple-700"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Structure Modal */}
      {showSalaryStructureModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Manage Salary Structure: {selectedEmployee.fullName || selectedEmployee.name}
            </h2>

            {salaryStructure && (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSalaryStructure(); }} className="space-y-4">
                {/* Salary Components */}
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-medium text-slate-800 mb-3">Salary Components</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Basic Salary *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={salaryStructure.basicSalary || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, basicSalary: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Housing Allowance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.housingAllowance || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, housingAllowance: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transport Allowance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.transportAllowance || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, transportAllowance: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Food Allowance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.foodAllowance || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, foodAllowance: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Medical Allowance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.medicalAllowance || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, medicalAllowance: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Other Allowances
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.otherAllowances || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, otherAllowances: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-medium text-slate-800 mb-3">Deductions (%)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Income Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.incomeTaxRate || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, incomeTaxRate: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Social Security Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salaryStructure.socialSecurityRate || 0}
                        onChange={(e) => setSalaryStructure({...salaryStructure, socialSecurityRate: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account Information */}
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-3">Bank Account Information</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Enter bank account details for salary transfer
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={salaryStructure.bankName || ""}
                        onChange={(e) => setSalaryStructure({...salaryStructure, bankName: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="e.g., Emirates NBD"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={salaryStructure.bankAccountNumber || ""}
                        onChange={(e) => setSalaryStructure({...salaryStructure, bankAccountNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={salaryStructure.iban || ""}
                        onChange={(e) => setSalaryStructure({...salaryStructure, iban: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="AE123456789012345678901"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        SWIFT Code
                      </label>
                      <input
                        type="text"
                        value={salaryStructure.swiftCode || ""}
                        onChange={(e) => setSalaryStructure({...salaryStructure, swiftCode: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="e.g., EBILAEAD"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSalaryStructureModal(false);
                      setSelectedEmployee(null);
                      setSalaryStructure(null);
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    disabled={savingStructure}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStructure}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {savingStructure ? "Saving..." : "Save Salary Structure"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

