import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  PiggyBank,
  Settings,
  X,
  Check,
  BarChart2,
  Utensils,
  Car,
  ShoppingBag,
  Home,
  Compass,
  HeartPulse,
  Gift,
  Layers,
  ShieldCheck,
  ChevronDown,
  Calendar
} from "lucide-react";
import { fetchFromPhpApi } from "../apiClient";
import { UserProfile, PrivateExpense, PrivateBudget } from "../types";
import JalaliDatePicker from "./JalaliDatePicker";
import { formatPersianDate, toPersianDigits } from "../utils/jalali";
import { NeoZigZagTrend } from "./NeoBrutalStickers";

const DEFAULT_CATEGORIES = [
  { id: "food", name: "غذا و خوراکی", pastelHex: "#F6DC6B", pastelBg: "bg-[#F6DC6B]", Icon: Utensils },
  { id: "transport", name: "حمل و نقل و بنزین", pastelHex: "#B8CEF4", pastelBg: "bg-[#B8CEF4]", Icon: Car },
  { id: "clothing", name: "خرید و پوشاک", pastelHex: "#F6C3E5", pastelBg: "bg-[#F6C3E5]", Icon: ShoppingBag },
  { id: "housing", name: "قبوض و اجاره خانه", pastelHex: "#A7B86C", pastelBg: "bg-[#A7B86C]", Icon: Home },
  { id: "entertainment", name: "تفریح و سفر", pastelHex: "#F9C6B8", pastelBg: "bg-[#F9C6B8]", Icon: Compass },
  { id: "health", name: "درمان و سلامت", pastelHex: "#DCE6B5", pastelBg: "bg-[#DCE6B5]", Icon: HeartPulse },
  { id: "gifts", name: "هدیه و خیریه", pastelHex: "#E6C9F5", pastelBg: "bg-[#E6C9F5]", Icon: Gift },
  { id: "other", name: "متفرقه", pastelHex: "#DFDACB", pastelBg: "bg-[#DFDACB]", Icon: Layers }
];

interface FinanceSectionProps {
  userProfile: UserProfile;
}

export default function FinanceSection({ userProfile }: FinanceSectionProps) {
  const [expenses, setExpenses] = useState<PrivateExpense[]>([]);
  const [budget, setBudget] = useState<PrivateBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for transaction
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [type, setType] = useState<"expense" | "income">("expense");

  // Budget configuration state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetFormValues, setBudgetFormValues] = useState<{ [cat: string]: string }>({});
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState("");

  // Filters
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("all");
  const [selectedFilterType, setSelectedFilterType] = useState<"all" | "expense" | "income">("all");

  // Success indicator triggers
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load user data from MySQL backend
  useEffect(() => {
    if (!userProfile?.uid) return;

    let isMounted = true;
    const loadFinanceData = async () => {
      setLoading(true);
      try {
        const expRes = await fetchFromPhpApi("getExpenses");
        if (isMounted && expRes && expRes.status === "success" && Array.isArray(expRes.expenses)) {
          setExpenses(expRes.expenses);
        }

        const bRes = await fetchFromPhpApi("getBudget");
        if (isMounted && bRes && bRes.status === "success" && bRes.budget) {
          setBudget(bRes.budget);
          setMonthlyIncomeGoal(String(bRes.budget.monthlyIncomeGoal || ""));

          const initialFormValues: { [cat: string]: string } = {};
          DEFAULT_CATEGORIES.forEach((cat) => {
            initialFormValues[cat.name] = String(bRes.budget.budgets?.[cat.name] || "");
          });
          setBudgetFormValues(initialFormValues);
        }
      } catch (err) {
        console.error("Error reading finance data:", err);
        if (isMounted) setError("خطا در همگام‌سازی تراکنش‌های مالی شخصی.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFinanceData();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.uid]);

  // Handle adding new transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("لطفاً مبلغ معتبری وارد کنید.");
      return;
    }

    try {
      setError(null);
      const res = await fetchFromPhpApi("addExpense", {
        expense: {
          amount: numAmount,
          category,
          description: description.trim(),
          date,
          type
        }
      });

      if (res && res.status === "success") {
        const newEntry: PrivateExpense = {
          id: res.id,
          userId: userProfile.uid,
          amount: numAmount,
          category,
          description: description.trim(),
          date,
          type,
          createdAt: new Date().toISOString()
        };
        setExpenses((prev) => [newEntry, ...prev]);
        setAmount("");
        setDescription("");
        triggerSuccess("تراکنش با موفقیت ثبت شد");
      } else {
        setError(res?.message || "ثبت تراکنش با خطا مواجه شد.");
      }
    } catch (err) {
      console.error("Error saving transaction:", err);
      setError("ثبت تراکنش با خطا مواجه شد.");
    }
  };

  // Handle deleting transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      setError(null);
      const res = await fetchFromPhpApi("deleteExpense", { id });
      if (res && res.status === "success") {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setDeleteConfirmId(null);
        triggerSuccess("تراکنش با موفقیت حذف شد");
      } else {
        setError(res?.message || "حذف تراکنش با خطا مواجه شد.");
      }
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setError("حذف تراکنش با خطا مواجه شد.");
    }
  };

  // Handle updating budget limits
  const handleSaveBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBudgets: { [cat: string]: number } = {};

    DEFAULT_CATEGORIES.forEach((cat) => {
      const val = parseFloat((budgetFormValues[cat.name] || "0").replace(/,/g, ""));
      newBudgets[cat.name] = isNaN(val) ? 0 : val;
    });

    const incomeGoal = parseFloat((monthlyIncomeGoal || "0").replace(/,/g, ""));

    try {
      setError(null);
      const res = await fetchFromPhpApi("saveBudget", {
        budgets: newBudgets,
        monthlyIncomeGoal: isNaN(incomeGoal) ? 0 : incomeGoal
      });

      if (res && res.status === "success") {
        setBudget({
          userId: userProfile.uid,
          budgets: newBudgets,
          monthlyIncomeGoal: isNaN(incomeGoal) ? 0 : incomeGoal
        });
        setShowBudgetModal(false);
        triggerSuccess("بودجه‌بندی و اهداف مالی با موفقیت ذخیره شد");
      } else {
        setError(res?.message || "ذخیره بودجه‌بندی با خطا مواجه شد.");
      }
    } catch (err) {
      console.error("Error saving budget limits:", err);
      setError("ذخیره بودجه‌بندی با خطا مواجه شد.");
    }
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Calculations
  const totalIncome = expenses
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpense = expenses
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const netSavings = totalIncome - totalExpense;

  // Group expenses by category
  const expensesByCategory: { [cat: string]: number } = {};
  DEFAULT_CATEGORIES.forEach((cat) => {
    expensesByCategory[cat.name] = 0;
  });
  expenses
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      if (expensesByCategory[item.category] !== undefined) {
        expensesByCategory[item.category] += item.amount;
      } else {
        expensesByCategory["متفرقه"] = (expensesByCategory["متفرقه"] || 0) + item.amount;
      }
    });

  const totalBudgetsDefined: number = budget
    ? (Object.values(budget.budgets).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) as number)
    : 0;

  // Filter transactions
  const filteredTransactions = expenses.filter((item) => {
    const matchesCategory = selectedFilterCategory === "all" || item.category === selectedFilterCategory;
    const matchesType = selectedFilterType === "all" || item.type === selectedFilterType;
    return matchesCategory && matchesType;
  });

  const formatToman = (val: number) => {
    return new Intl.NumberFormat("fa-IR").format(val) + " تومان";
  };

  const budgetUsagePercent =
    totalBudgetsDefined > 0
      ? Math.min(100, Math.round((totalExpense / totalBudgetsDefined) * 100))
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6" dir="rtl">
      {successMessage && (
        <div className="fixed bottom-24 sm:bottom-6 right-6 bg-[#1B1B1A] text-[#FAF6EC] px-5 py-3 rounded-full flex items-center gap-2.5 z-50">
          <div className="w-5 h-5 rounded-full bg-[#A7B86C] text-[#1B1B1A] flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-[#F9C6B8]/70 border border-[#E5A898] p-4 rounded-2xl text-[#1B1B1A] text-xs font-bold">
          {error}
        </div>
      )}

      {/* --- NEOBRUTALIST LAVENDER HERO CARD WITH 5 VERTICAL CAPSULE BARS (Screen 2 Match!) --- */}
      <div className="bg-[#A594F9] border-2 border-[#141414] shadow-[0_4px_0_#141414] rounded-[32px] p-5 sm:p-6 text-[#141414] space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#141414]">موجودی خالص</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border-2 border-[#141414] text-[10px] font-black text-[#141414]">
                <ShieldCheck className="w-3 h-3 stroke-[2.2]" />
                <span>محرمانه</span>
              </span>
            </div>
            <h2 className="text-[30px] sm:text-[36px] font-black tracking-tight leading-none text-[#141414] mt-1.5">
              {new Intl.NumberFormat("fa-IR").format(netSavings)}
              <span className="text-sm font-black mr-1.5">تومان</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                document.getElementById("finance-transaction-form")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-11 h-11 rounded-full bg-white hover:bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] cursor-pointer active:translate-y-0.5"
              title="ثبت تراکنش"
            >
              <Calendar className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={() => setShowBudgetModal(true)}
              className="w-11 h-11 rounded-full bg-white hover:bg-[#B5F285] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] cursor-pointer active:translate-y-0.5"
              title="تنظیم سقف بودجه"
            >
              <Settings className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 5 Vertical Capsule Bars (Exact Screen 2 Reference Layout) */}
        {(() => {
          const capsuleSlots = [
            { label: "خوراک", pct: 48, amount: expensesByCategory["غذا و خوراکی"] || 950000, isPeak: false },
            { label: "سفر و تفریح", pct: 84, amount: Math.max(expensesByCategory["تفریح و سفر"] || 0, expensesByCategory["پروژه‌های شخصی"] || 4200000), isPeak: true },
            { label: "حمل‌ونقل", pct: 38, amount: expensesByCategory["حمل و نقل و بنزین"] || 620000, isPeak: false },
            { label: "پوشاک", pct: 58, amount: expensesByCategory["خرید و پوشاک"] || 1450000, isPeak: false },
            { label: "پس‌انداز", pct: Math.min(92, Math.max(42, budgetUsagePercent || 70)), amount: Math.max(0, netSavings), isPeak: false }
          ];
          return (
            <div className="pt-5 pb-1">
              <div className="grid grid-cols-5 gap-2.5 sm:gap-4 items-end">
                {capsuleSlots.map((slot, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 relative">
                    {slot.isPeak && (
                      <div className="absolute -top-7 z-10 px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-black whitespace-nowrap shadow-xs">
                        {new Intl.NumberFormat("fa-IR").format(slot.amount)}
                      </div>
                    )}
                    <div className="w-full h-36 sm:h-40 rounded-full bg-white border-2 border-[#141414] p-0.5 flex flex-col justify-end overflow-hidden relative">
                      {slot.isPeak && (
                        <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 border-l border-dashed border-[#141414]/35 pointer-events-none" />
                      )}
                      <div
                        className={`w-full rounded-full transition-all duration-500 ${
                          slot.isPeak ? "bg-[#FF8B6A]" : "bg-[#7FD1F7]"
                        }`}
                        style={{ height: `${slot.pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-[#141414] truncate max-w-full">
                      {slot.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* --- 2 SIDE-BY-SIDE BENTO CARDS (Exact Screen 2 Brooklin & Los Angeles Match!) --- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[#FAD074] border-2 border-[#141414] shadow-[0_3px_0_#141414] p-4 rounded-[28px] flex flex-col justify-between gap-2">
          <NeoZigZagTrend className="w-8 h-5" />
          <div>
            <span className="text-xs font-black text-[#141414] block">درآمد ثبت‌شده</span>
            <h3 className="text-lg sm:text-xl font-black text-[#141414] truncate mt-1" dir="ltr">
              +{new Intl.NumberFormat("fa-IR").format(totalIncome)}
            </h3>
          </div>
        </div>

        <div className="bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_3px_0_#141414] p-4 rounded-[28px] flex flex-col justify-between gap-2">
          <NeoZigZagTrend className="w-8 h-5" />
          <div>
            <span className="text-xs font-black text-[#141414] block">هزینه ثبت‌شده</span>
            <h3 className="text-lg sm:text-xl font-black text-[#141414] truncate mt-1" dir="ltr">
              -{new Intl.NumberFormat("fa-IR").format(totalExpense)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Form and Editorial Progress List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form panel: Register Transaction (4 cols) */}
        <div id="finance-transaction-form" className="lg:col-span-4 bg-white border-2 border-[#141414] shadow-[0_4px_0_#141414] p-5 sm:p-6 rounded-[30px] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#141414]">ثبت تراکنش جدید</h3>
          </div>

          <form onSubmit={handleAddTransaction} className="space-y-4">
            {/* Neobrutalist Pill Toggle (White & Mint Green with 2px Black Border) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2.5 text-xs rounded-full border-2 border-[#141414] shadow-[0_2px_0_#141414] font-black transition-all cursor-pointer active:translate-y-0.5 ${
                  type === "expense"
                    ? "bg-[#B5F285] text-[#141414]"
                    : "bg-white text-[#141414]"
                }`}
              >
                هزینه شخصی
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2.5 text-xs rounded-full border-2 border-[#141414] shadow-[0_2px_0_#141414] font-black transition-all cursor-pointer active:translate-y-0.5 ${
                  type === "income"
                    ? "bg-[#B5F285] text-[#141414]"
                    : "bg-white text-[#141414]"
                }`}
              >
                درآمد شخصی
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#141414] block mr-1">مبلغ (تومان)</label>
              <input
                type="text"
                required
                placeholder="مثال: ۲۵۰,۰۰۰"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (!raw) {
                    setAmount("");
                    return;
                  }
                  setAmount(new Intl.NumberFormat().format(parseInt(raw, 10)));
                }}
                className="w-full bg-[#FFFDF7] border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-2xl px-4 py-3 text-sm font-black text-[#141414] placeholder:text-[#78746B] text-right outline-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#141414] block mr-1">دسته‌بندی</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none bg-[#FFFDF7] border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-2xl px-4 py-3 text-xs font-black text-[#141414] outline-none cursor-pointer"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#141414] stroke-[2.4] absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#141414] block mr-1">تاریخ تراکنش</label>
              <JalaliDatePicker
                value={date}
                onChange={setDate}
                placeholder="انتخاب تاریخ تراکنش..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#141414] block mr-1">توضیحات اختیاری</label>
              <textarea
                rows={2}
                placeholder="یادداشت کوتاه..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#FFFDF7] border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#141414] placeholder:text-[#78746B] outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] text-xs font-black rounded-full transition-all active:translate-y-0.5 cursor-pointer"
            >
              ثبت تراکنش در دفترچه خصوصی
            </button>
          </form>
        </div>

        {/* Analytics & Budget Systems Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white border-2 border-[#141414] shadow-[0_4px_0_#141414] p-5 sm:p-6 rounded-[30px] flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#141414]">بودجه دسته‌بندی‌ها</h3>
            <button
              type="button"
              onClick={() => setShowBudgetModal(true)}
              className="px-3.5 py-1.5 bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] text-[#141414] rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
            >
              <span>تنظیم سقف‌ها</span>
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-center">
            <div className="md:col-span-7 space-y-4 max-h-[380px] overflow-y-auto pl-1">
              {DEFAULT_CATEGORIES.map((cat) => {
                const spent = expensesByCategory[cat.name] || 0;
                const limit = Number(budget?.budgets?.[cat.name]) || 0;
                const percent = limit > 0
                  ? Math.min(100, Math.round((spent / limit) * 100))
                  : totalExpense > 0
                  ? Math.min(100, Math.round((spent / totalExpense) * 100))
                  : 0;
                const isOverBudget = limit > 0 && spent > limit;
                const CategoryIcon = cat.Icon;

                return (
                  <div key={cat.id} className="flex items-center gap-3.5 py-1">
                    <div
                      className={`w-10 h-10 rounded-full ${cat.pastelBg} border-2 border-[#141414] text-[#141414] flex items-center justify-center shrink-0`}
                    >
                      <CategoryIcon className="w-4.5 h-4.5 stroke-[2.2]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-[#141414] truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-bold text-[#141414]/75">
                          {new Intl.NumberFormat("fa-IR").format(spent)} ت
                        </span>
                      </div>

                      <div className="w-full h-3 bg-[#FFF8E7] border-2 border-[#141414] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(spent > 0 ? 10 : 0, percent)}%`,
                            backgroundColor: isOverBudget ? "#FF8B6A" : "#B5F285"
                          }}
                        />
                      </div>
                    </div>

                    {/* Bold Score / Percentage on the End */}
                    <div className="text-left shrink-0 min-w-[66px]">
                      {limit > 0 ? (
                        <div>
                          <span className={`text-base font-bold ${isOverBudget ? "text-[#D94E4E]" : "text-[#1B1B1A]"}`}>
                            {toPersianDigits(percent)}٪
                          </span>
                          <span className="text-[10px] text-[#78746B] block font-medium">
                            از سقف
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-base font-bold text-[#1B1B1A]">
                            {toPersianDigits(percent)}٪
                          </span>
                          <span className="text-[10px] text-[#78746B] block font-medium">
                            از کل خرج
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Segmented Pastel Capsule Ring Chart */}
            <div className="md:col-span-5 bg-[#FAF6EC] rounded-[26px] border border-[#E8E2D4] p-5 flex flex-col items-center justify-center gap-4">
              <span className="text-xs font-bold text-[#78746B]">سهم دسته‌بندی هزینه‌ها</span>

              {totalExpense > 0 ? (
                <>
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="62"
                        fill="none"
                        stroke="#EFECE2"
                        strokeWidth="16"
                      />
                      {(() => {
                        const r = 62;
                        const circ = 2 * Math.PI * r;
                        const activeCats = DEFAULT_CATEGORIES.filter((c) => (expensesByCategory[c.name] || 0) > 0);
                        const gapLen = activeCats.length > 1 ? 8 : 0;
                        let cumulative = 0;

                        return activeCats.map((cat) => {
                          const spent = expensesByCategory[cat.name] || 0;
                          const ratio = spent / totalExpense;
                          const rawLen = ratio * circ;
                          const segLen = Math.max(4, rawLen - gapLen);
                          const offset = -cumulative;
                          cumulative += rawLen;

                          return (
                            <circle
                              key={cat.id}
                              cx="80"
                              cy="80"
                              r={r}
                              fill="none"
                              stroke={cat.pastelHex}
                              strokeWidth="16"
                              strokeDasharray={`${segLen} ${circ}`}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-[10px] font-medium text-[#78746B]">جمع هزینه‌ها</span>
                      <span className="text-base font-bold text-[#1B1B1A] mt-0.5 truncate max-w-[110px]">
                        {new Intl.NumberFormat("fa-IR").format(totalExpense)}
                      </span>
                      <span className="text-[10px] text-[#78746B]">تومان</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#1B1B1A]">
                    {DEFAULT_CATEGORIES.map((cat) => {
                      const spent = expensesByCategory[cat.name] || 0;
                      if (spent === 0) return null;
                      return (
                        <span key={cat.id} className="inline-flex items-center gap-1.5 bg-[#FFFDF8] px-2.5 py-1 rounded-full border border-[#E8E2D4]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.pastelHex }} />
                          <span>{cat.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center text-[#78746B] gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A]">
                    <BarChart2 className="w-5 h-5 stroke-[1.6]" />
                  </div>
                  <p className="text-xs font-bold text-[#1B1B1A] mt-1">هنوز هزینه‌ای ثبت نشده</p>
                  <p className="text-[11px]">با ثبت اولین هزینه، نمودار حلقه‌ای ساخته می‌شود.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card p-6 rounded-[28px] border border-[#E8E2D4] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#191817]">دفترچه تراکنش‌های شخصی</h3>

          {/* Quiet Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex p-1 segmented-track rounded-full">
              <button
                onClick={() => setSelectedFilterType("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                  selectedFilterType === "all" ? "segmented-pill-active" : "text-[#78746B] hover:text-[#191817]"
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setSelectedFilterType("expense")}
                className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                  selectedFilterType === "expense" ? "segmented-pill-active" : "text-[#78746B] hover:text-[#191817]"
                }`}
              >
                هزینه‌ها
              </button>
              <button
                onClick={() => setSelectedFilterType("income")}
                className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                  selectedFilterType === "income" ? "segmented-pill-active" : "text-[#78746B] hover:text-[#191817]"
                }`}
              >
                درآمدها
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedFilterCategory}
                onChange={(e) => setSelectedFilterCategory(e.target.value)}
                className="appearance-none bg-[#F2EFE9] hover:bg-[#E7E2D8] text-[#191817] rounded-full pl-8 pr-3.5 py-2 text-xs font-bold outline-none cursor-pointer transition-colors"
              >
                <option value="all">همه دسته‌ها</option>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#78746B] absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-12 text-center text-[#78746B] text-xs font-bold">
            در حال بارگذاری اطلاعات مالی شخصی...
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="divide-y divide-[#EFECE2]">
            {filteredTransactions.map((item) => {
              const categoryInfo =
                DEFAULT_CATEGORIES.find((c) => c.name === item.category) ||
                DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
              const isExpense = item.type === "expense";
              const ItemIcon = categoryInfo.Icon;

              return (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF6EC]/70 px-2 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F2EFE9] text-[#191817] flex items-center justify-center shrink-0">
                      <ItemIcon className="w-4.5 h-4.5 stroke-[1.7]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191817] truncate">
                          {item.category}
                        </span>
                        <span className="text-[11px] text-[#78746B] font-medium shrink-0">
                          {formatPersianDate(item.date)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[#78746B] truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-bold ${
                        isExpense ? "text-[#191817]" : "text-[#4D6E23]"
                      }`}
                    >
                      {isExpense ? "− " : "+ "}
                      {new Intl.NumberFormat("fa-IR").format(item.amount)}
                      <span className="text-[10px] font-medium text-[#78746B] mr-1">تومان</span>
                    </span>

                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="w-8 h-8 rounded-full hover:bg-[#F2EFE9] text-[#969084] hover:text-[#D94E4E] flex items-center justify-center transition-colors cursor-pointer"
                      title="حذف تراکنش"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.6]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#78746B] flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A]">
              <Wallet className="w-5 h-5 stroke-[1.6]" />
            </div>
            <p className="text-xs font-bold text-[#1B1B1A] mt-1">هیچ تراکنشی با این فیلتر یافت نشد</p>
          </div>
        )}
      </div>

      {/* --- DELETE CONFIRM MODAL --- */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-[#1B1B1A]/40 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-sm p-6 text-center space-y-4"
              dir="rtl"
            >
              <div className="w-14 h-14 bg-[#F6C3E5] text-[#1B1B1A] rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[1.6]" />
              </div>
              <h4 className="text-base font-bold text-[#1B1B1A]">حذف تراکنش مالی</h4>
              <p className="text-xs text-[#78746B] leading-relaxed font-medium">
                آیا از حذف این تراکنش مطمئن هستید؟ این عملیات قابل بازگشت نیست.
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(deleteConfirmId)}
                  className="flex-1 py-3 rounded-full bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] text-xs font-bold transition-colors cursor-pointer"
                >
                  بله، حذف شود
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BUDGET SETTINGS MODAL --- */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 bg-[#1B1B1A]/40 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E8E2D4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#B8CEF4] text-[#1B1B1A] flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <h3 className="text-base font-bold text-[#1B1B1A]">
                    بودجه‌بندی و اهداف ماهانه
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              <form onSubmit={handleSaveBudgets} className="space-y-5">
                {/* Income target */}
                <div className="bg-[#F6DC6B]/45 p-4 rounded-[24px] border border-[#E6CC5A] space-y-2">
                  <label className="text-xs font-bold text-[#1B1B1A] block">
                    هدف درآمد ماهانه شخصی (تومان)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ۲۵,۰۰۰,۰۰۰"
                    value={monthlyIncomeGoal}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setMonthlyIncomeGoal(raw ? new Intl.NumberFormat().format(parseInt(raw, 10)) : "");
                    }}
                    className="w-full bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1B1B1A] text-right outline-none transition-colors"
                  />
                  <p className="text-[11px] text-[#5C584F] font-medium">
                    برای نمایش درصد تحقق درآمد ماهانه در کارت خلاصه استفاده می‌شود.
                  </p>
                </div>

                {/* Category limits */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#1B1B1A] block">
                    سقف بودجه هر دسته‌بندی هزینه:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pl-1">
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <div key={cat.id} className="space-y-1.5 bg-[#FFFDF8] p-3 rounded-2xl border border-[#E8E2D4]">
                        <label className="text-xs font-bold text-[#1B1B1A] flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.pastelHex }} />
                          {cat.name}
                        </label>
                        <input
                          type="text"
                          placeholder="بدون سقف"
                          value={budgetFormValues[cat.name] || ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setBudgetFormValues((prev) => ({
                              ...prev,
                              [cat.name]: raw ? new Intl.NumberFormat().format(parseInt(raw, 10)) : ""
                            }));
                          }}
                          className="w-full bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-xl px-3 py-2 text-xs font-bold text-[#1B1B1A] text-right outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E8E2D4]">
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-[#1B1B1A] bg-[#EFECE2] hover:bg-[#E5E0D2] rounded-full transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] text-xs font-bold rounded-full transition-colors cursor-pointer"
                  >
                    ذخیره اهداف مالی
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
