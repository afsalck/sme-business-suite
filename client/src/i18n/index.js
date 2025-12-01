import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "BizEase UAE",
      navigation: {
        dashboard: "Dashboard",
        invoices: "Invoices",
        employees: "Employees",
        inventory: "Inventory & Sales",
        expenses: "Expenses",
        admin: "Admin Management",
        logout: "Logout"
      },
      auth: {
        welcome: "Welcome back",
        loginSubtitle: "Sign in to manage your business",
        email: "Email",
        password: "Password",
        signIn: "Sign in",
        googleSignIn: "Sign in with Google",
        noAccount: "Don't have an account?",
        createAccount: "Create one on Firebase Console."
      },
      dashboard: {
        title: "Overview",
        totalSales: "Total Sales",
        dailySales: "Today's Sales",
        totalExpenses: "Total Expenses",
        dailyExpenses: "Today's Expenses",
        profit: "Profit",
        vatPayable: "VAT Payable",
        expiringDocs: "Expiring Documents",
        totalInvoices: "Total Invoices",
        paidInvoices: "Paid Invoices",
        overdueInvoices: "Overdue Invoices",
        salesTrend: "Sales Trend",
        expenseTrend: "Expense Trend",
        vatReminder: "VAT filings are due monthly in the UAE. Ensure submissions before the 28th."
      },
      invoices: {
        title: "Invoices",
        create: "Create Invoice",
        edit: "Edit Invoice",
        invoiceDetails: "Invoice Details",
        invoiceNumber: "Invoice #",
        customerName: "Customer Name",
        customerEmail: "Customer Email",
        customerPhone: "Customer Phone",
        issueDate: "Issue Date",
        dueDate: "Due Date",
        paymentTerms: "Payment Terms",
        customDays: "Custom Days",
        notes: "Notes",
        addItem: "Add Item",
        description: "Description",
        quantity: "Quantity",
        unitPrice: "Unit Price",
        discount: "Discount",
        totalDiscount: "Total Discount",
        vat: "VAT (5%)",
        subtotal: "Subtotal",
        grandTotal: "Grand Total",
        total: "Total",
        save: "Save Invoice",
        generatePdf: "Generate PDF",
        downloadPdf: "Download PDF",
        language: "Document Language",
        currency: "Currency",
        status: "Status",
        statusDraft: "Draft",
        statusSent: "Sent",
        statusViewed: "Viewed",
        statusPaid: "Paid",
        statusOverdue: "Overdue",
        statusCancelled: "Cancelled",
        allStatuses: "All Statuses",
        items: "Items",
        sortByDate: "Sort by Date",
        sortByNumber: "Sort by Number",
        sortByCustomer: "Sort by Customer",
        sortByTotal: "Sort by Total",
        sortDesc: "Descending",
        sortAsc: "Ascending",
        showing: "Showing",
        of: "of",
        previous: "Previous",
        next: "Next",
        noInvoices: "No invoices found"
      },
      employees: {
        title: "Employees",
        add: "Add Employee",
        name: "Name",
        position: "Position",
        salary: "Salary",
        visaExpiry: "Visa Expiry",
        passportExpiry: "Passport Expiry",
        notes: "Notes",
        expiringSoon: "Expiring soon"
      },
      inventory: {
        title: "Inventory & Sales",
        addItem: "Add Item",
        recordSale: "Record Daily Sale",
        itemName: "Item Name",
        stock: "Stock",
        salePrice: "Sale Price",
        supplier: "Supplier",
        quantity: "Quantity",
        summary: "Daily Summary"
      },
      expenses: {
        title: "Expenses",
        addExpense: "Add Expense",
        category: "Category",
        date: "Date",
        amount: "Amount",
        description: "Description"
      },
      admin: {
        title: "Admin Management",
        tabs: {
          users: "Users",
          employees: "Employees",
          invoices: "Invoices",
          expenses: "Expenses",
          inventory: "Inventory",
          sales: "Sales"
        }
      },
      common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        search: "Search",
        refresh: "Refresh",
        languageToggle: "العربية",
        english: "English",
        arabic: "Arabic",
        loading: "Loading...",
        actions: "Actions",
        status: "Status",
        view: "View",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel"
      }
    }
  },
  ar: {
    translation: {
      appName: "بيزإيز الإمارات",
      navigation: {
        dashboard: "لوحة التحكم",
        invoices: "الفواتير",
        employees: "الموظفون",
        inventory: "المخزون والمبيعات",
        expenses: "المصروفات",
        admin: "إدارة المسؤول",
        logout: "تسجيل الخروج"
      },
      auth: {
        welcome: "مرحباً بعودتك",
        loginSubtitle: "سجل الدخول لإدارة عملك",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        signIn: "تسجيل الدخول",
        googleSignIn: "تسجيل الدخول عبر جوجل",
        noAccount: "لا تملك حساباً؟",
        createAccount: "قم بإنشائه من لوحة Firebase."
      },
      dashboard: {
        title: "نظرة عامة",
        totalSales: "إجمالي المبيعات",
        dailySales: "مبيعات اليوم",
        totalExpenses: "إجمالي المصروفات",
        dailyExpenses: "مصروفات اليوم",
        profit: "الربح",
        vatPayable: "ضريبة القيمة المضافة المستحقة",
        expiringDocs: "المستندات المنتهية قريباً",
        totalInvoices: "إجمالي الفواتير",
        paidInvoices: "الفواتير المدفوعة",
        overdueInvoices: "الفواتير المتأخرة",
        salesTrend: "اتجاه المبيعات",
        expenseTrend: "اتجاه المصروفات",
        vatReminder: "تُستحق إقرارات ضريبة القيمة المضافة شهرياً في الإمارات. تأكد من تقديمها قبل يوم 28."
      },
      invoices: {
        title: "الفواتير",
        create: "إنشاء فاتورة",
        edit: "تعديل الفاتورة",
        invoiceDetails: "تفاصيل الفاتورة",
        invoiceNumber: "رقم الفاتورة",
        customerName: "اسم العميل",
        customerEmail: "بريد العميل",
        customerPhone: "هاتف العميل",
        issueDate: "تاريخ الإصدار",
        dueDate: "تاريخ الاستحقاق",
        paymentTerms: "شروط الدفع",
        customDays: "أيام مخصصة",
        notes: "ملاحظات",
        addItem: "إضافة بند",
        description: "الوصف",
        quantity: "الكمية",
        unitPrice: "سعر الوحدة",
        discount: "الخصم",
        totalDiscount: "إجمالي الخصم",
        vat: "ضريبة القيمة المضافة (5%)",
        subtotal: "المجموع الفرعي",
        grandTotal: "الإجمالي النهائي",
        total: "الإجمالي",
        save: "حفظ الفاتورة",
        generatePdf: "توليد ملف PDF",
        downloadPdf: "تحميل PDF",
        language: "لغة المستند",
        currency: "العملة",
        status: "الحالة",
        statusDraft: "مسودة",
        statusSent: "مرسلة",
        statusViewed: "مشاهدة",
        statusPaid: "مدفوعة",
        statusOverdue: "متأخرة",
        statusCancelled: "ملغاة",
        allStatuses: "جميع الحالات",
        items: "البنود",
        sortByDate: "ترتيب حسب التاريخ",
        sortByNumber: "ترتيب حسب الرقم",
        sortByCustomer: "ترتيب حسب العميل",
        sortByTotal: "ترتيب حسب الإجمالي",
        sortDesc: "تنازلي",
        sortAsc: "تصاعدي",
        showing: "عرض",
        of: "من",
        previous: "السابق",
        next: "التالي",
        noInvoices: "لا توجد فواتير"
      },
      employees: {
        title: "الموظفون",
        add: "إضافة موظف",
        name: "الاسم",
        position: "الوظيفة",
        salary: "الراتب",
        visaExpiry: "انتهاء التأشيرة",
        passportExpiry: "انتهاء الجواز",
        notes: "ملاحظات",
        expiringSoon: "سينتهي قريباً"
      },
      inventory: {
        title: "المخزون والمبيعات",
        addItem: "إضافة صنف",
        recordSale: "تسجيل مبيعات يومية",
        itemName: "اسم الصنف",
        stock: "المخزون",
        salePrice: "سعر البيع",
        supplier: "المورد",
        quantity: "الكمية",
        summary: "ملخص اليوم"
      },
      expenses: {
        title: "المصروفات",
        addExpense: "إضافة مصروف",
        category: "الفئة",
        date: "التاريخ",
        amount: "المبلغ",
        description: "الوصف"
      },
      admin: {
        title: "إدارة المسؤول",
        tabs: {
          users: "المستخدمون",
          employees: "الموظفون",
          invoices: "الفواتير",
          expenses: "المصروفات",
          inventory: "المخزون",
          sales: "المبيعات"
        }
      },
      common: {
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        search: "بحث",
        refresh: "تحديث",
        languageToggle: "English",
        english: "الإنجليزية",
        arabic: "العربية",
        loading: "جاري التحميل...",
        actions: "الإجراءات",
        status: "الحالة",
        view: "عرض",
        edit: "تعديل",
        delete: "حذف",
        save: "حفظ",
        cancel: "إلغاء"
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;

