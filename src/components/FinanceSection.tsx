import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, DollarSign, TrendingDown, TrendingUp, Plus, Trash2, PiggyBank, 
  Percent, Settings, Calendar, Info, X, Check, Filter, PieChart, BarChart2
} from "lucide-react";
import { fetchFromPhpApi } from "../apiClient";
import { UserProfile, PrivateExpense, PrivateBudget } from "../types";

// Jalali Month and Date Formatter Helpers
const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const DEFAULT_CATEGORIES = [
  { id: "food", name: "غذا و خوراکی", color: "from-amber-400 to-orange-500", bgLight: "bg-amber-50", text: "text-amber-600" },
  { id: "transport", name: "حمل و نقل و بنزین", color: "from-blue-400 to-indigo-500", bgLight: "bg-blue-50", text: "text-blue-600" },
  { id: "clothing", name: "خرید و پوشاک", color: "from-pink-400 to-rose-500", bgLight: "bg-pink-50", text: "text-pink-600" },
  { id: "housing", name: "قبوض و اجاره خانه", color: "from-purple-400 to-violet-500", bgLight: "bg-purple-50", text: "text-purple-600" },
  { id: "entertainment", name: "تفریح و سفر", color: "from-emerald-400 to-teal-500", bgLight: "bg-emerald-50", text: "text-emerald-600" },
  { id: "health", name: "درمان و سلامت", color: "from-red-400 to-rose-600", bgLight: "bg-red-50", text: "text-red-600" },
  { id: "gifts", name: "هدیه و خیریه", color: "from-teal-400 to-cyan-500", bgLight: "bg-teal-50", text: "text-teal-600" },
  { id: "other", name: "متفرقه", color: "from-slate-400 to-slate-600", bgLight: "bg-slate-50", text: "text-slate-600" }
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

  // Load user data from MySQL backend
  useEffect(() => {
    if (!userProfile?.uid) return;

    let isMounted = true;
    const loadFinanceData = async () => {
      setLoading(true);
      try {
        const expRes = await fetchFromPhpApi('getExpenses');
        if (isMounted && expRes && expRes.status === 'success' && Array.isArray(expRes.expenses)) {
          setExpenses(expRes.expenses);
        }

        const bRes = await fetchFromPhpApi('getBudget');
        if (isMounted && bRes && bRes.status === 'success' && bRes.budget) {
          setBudget(bRes.budget);
          setMonthlyIncomeGoal(String(bRes.budget.monthlyIncomeGoal || ""));

          const initialFormValues: { [cat: string]: string } = {};
          DEFAULT_CATEGORIES.forEach(cat => {
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
      alert("لطفاً مبلغ معتبری وارد کنید.");
      return;
    }

    try {
      setError(null);
      const res = await fetchFromPhpApi('addExpense', {
        expense: {
          amount: numAmount,
          category,
          description: description.trim(),
          date,
          type
        }
      });

      if (res && res.status === 'success') {
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
        setExpenses(prev => [newEntry, ...prev]);
        setAmount("");
        setDescription("");
        triggerSuccess("تراکنش با موفقیت ثبت شد ✨");
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
    if (!window.confirm("آیا از حذف این تراکنش مطمئن هستید؟")) return;

    try {
      setError(null);
      const res = await fetchFromPhpApi('deleteExpense', { id });
      if (res && res.status === 'success') {
        setExpenses(prev => prev.filter(e => e.id !== id));
        triggerSuccess("تراکنش با موفقیت حذف شد.");
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
    
    DEFAULT_CATEGORIES.forEach(cat => {
      const val = parseFloat(budgetFormValues[cat.name] || "0");
      newBudgets[cat.name] = isNaN(val) ? 0 : val;
    });

    const incomeGoal = parseFloat(monthlyIncomeGoal || "0");

    try {
      setError(null);
      const res = await fetchFromPhpApi('saveBudget', {
        budgets: newBudgets,
        monthlyIncomeGoal: isNaN(incomeGoal) ? 0 : incomeGoal
      });

      if (res && res.status === 'success') {
        setBudget({
          userId: userProfile.uid,
          budgets: newBudgets,
          monthlyIncomeGoal: isNaN(incomeGoal) ? 0 : incomeGoal
        });
        setShowBudgetModal(false);
        triggerSuccess("بودجه‌بندی و اهداف مالی با موفقیت ذخیره شد 💼");
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
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpense = expenses
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const netSavings = totalIncome - totalExpense;

  // Group expenses by category
  const expensesByCategory: { [cat: string]: number } = {};
  DEFAULT_CATEGORIES.forEach(cat => {
    expensesByCategory[cat.name] = 0;
  });
  expenses
    .filter(item => item.type === "expense")
    .forEach(item => {
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
  const filteredTransactions = expenses.filter(item => {
    const matchesCategory = selectedFilterCategory === "all" || item.category === selectedFilterCategory;
    const matchesType = selectedFilterType === "all" || item.type === selectedFilterType;
    return matchesCategory && matchesType;
  });

  // Numbers formatter helper
  const formatToman = (val: number) => {
    return new Intl.NumberFormat("fa-IR").format(val) + " تومان";
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Alert Banner for Privacy */}
      <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-200/50 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-sm">
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="text-right">
          <h4 className="text-sm font-black text-teal-800">حریم خصوصی کاملاً تضمین‌شده 🔒</h4>
          <p className="text-xs text-teal-700/90 leading-relaxed mt-1">
            این بخش کاملاً شخصی، مجزا و رمزگذاری شده بر اساس حساب کاربری شماست. شریک عاطفی شما <strong>به هیچ‌وجه</strong> به داده‌های مالی شما دسترسی ندارد و نمی‌تواند بودجه‌ها، هزینه‌ها و درآمدهای ثبت‌شده شما را مشاهده کند.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900/90 text-white border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-2xl z-50">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold font-sans">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance */}
        <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">موجودی / پس‌انداز خالص</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-lg sm:text-xl font-black ${netSavings >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatToman(netSavings)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">
              تفاضل درآمد و هزینه‌های شخصی شما
            </p>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">مجموع درآمدهای این ماه</span>
            <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-black text-teal-600">
              {formatToman(totalIncome)}
            </h3>
            {budget?.monthlyIncomeGoal ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full" 
                    style={{ width: `${Math.min(100, (totalIncome / budget.monthlyIncomeGoal) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-black text-slate-400 shrink-0">
                  {Math.round((totalIncome / budget.monthlyIncomeGoal) * 100)}% از هدف
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 mt-1 font-bold">هدف درآمدی تنظیم نشده است</p>
            )}
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">مجموع هزینه‌های شخصی</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-black text-rose-500">
              {formatToman(totalExpense)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-bold">
              مجموع خروجی‌های ثبت شده
            </p>
          </div>
        </div>

        {/* Card 4: Total Budget */}
        <div className="bg-white/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">سقف بودجه ماهانه</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex flex-col justify-end">
            <h3 className="text-lg sm:text-xl font-black text-purple-600">
              {totalBudgetsDefined > 0 ? formatToman(totalBudgetsDefined) : "مشخص نشده"}
            </h3>
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="text-[10px] text-pink-500 font-bold hover:underline text-right mt-1.5 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" /> تنظیم اهداف و بودجه ماهانه
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form and Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form panel: Register Transaction (4 cols) */}
        <div className="lg:col-span-4 bg-white/65 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-pink-500" />
            ثبت تراکنش جدید
          </h3>

          <form onSubmit={handleAddTransaction} className="space-y-4">
            {/* Transaction Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  type === "expense" 
                    ? "bg-rose-500 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                💸 هزینه شخصی
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  type === "income" 
                    ? "bg-emerald-500 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                💰 درآمد شخصی
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">مبلغ (تومان)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: ۵۰,۰۰۰"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (!raw) {
                      setAmount("");
                      return;
                    }
                    setAmount(new Intl.NumberFormat().format(parseInt(raw, 10)));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl px-4 py-2.5 text-sm font-black font-sans text-right outline-none transition-all"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">دسته‌بندی</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">تاریخ تراکنش</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 text-right outline-none transition-all cursor-pointer"
                />
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">بابت / توضیحات اختیاری</label>
              <textarea
                rows={2}
                placeholder="توضیحات کوتاه برای یادآوری..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 text-white text-xs font-black rounded-xl transition-all hover:shadow-lg cursor-pointer ${
                type === "expense" 
                  ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:shadow-rose-100" 
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-100"
              }`}
            >
              ثبت در سیستم محرمانه تراکنش‌ها
            </button>
          </form>
        </div>

        {/* Analytics & Budget state panel (8 cols) */}
        <div className="lg:col-span-8 bg-white/65 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-500" />
              وضعیت بودجه دسته‌بندی‌ها و هزینه‌ها
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">این ماه</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Visual Budget Progress Cards */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {DEFAULT_CATEGORIES.map(cat => {
                const spent = expensesByCategory[cat.name] || 0;
                const limit = Number(budget?.budgets?.[cat.name]) || 0;
                const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                const isOverBudget = limit > 0 && spent > limit;

                return (
                  <div key={cat.id} className="bg-slate-50/60 border border-slate-100/80 p-3 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${cat.color}`} />
                        {cat.name}
                      </span>
                      <div className="text-left font-sans text-[11px]">
                        <span className="font-semibold text-slate-700">{formatToman(spent)}</span>
                        {limit > 0 && (
                          <span className="text-slate-400"> / {formatToman(limit)}</span>
                        )}
                      </div>
                    </div>

                    {limit > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverBudget ? "bg-red-500" : percent > 85 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black">
                          <span className={isOverBudget ? "text-red-500 animate-pulse" : "text-slate-400"}>
                            {isOverBudget ? "⚠️ فراتر از سقف بودجه" : `${Math.round(percent)}% مصرف شده`}
                          </span>
                          {limit - spent > 0 ? (
                            <span className="text-emerald-600 font-sans">باقی‌مانده: {formatToman(limit - spent)}</span>
                          ) : limit > 0 ? (
                            <span className="text-red-600 font-sans">اضافی: {formatToman(spent - limit)}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                        <span>بودجه‌ای تنظیم نشده است</span>
                        <button 
                          onClick={() => setShowBudgetModal(true)}
                          className="text-pink-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          ثبت سقف بودجه
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom SVG Expense Breakdown Visualization */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col justify-between gap-4">
              <h4 className="text-xs font-black text-slate-600">نمودار سهم هزینه‌ها</h4>
              
              {totalExpense > 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 flex-1">
                  {/* Circular Donut Ring using pure SVG */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      {/* Background Circle */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      
                      {/* Segment Circles */}
                      {(() => {
                        let currentOffset = 0;
                        return DEFAULT_CATEGORIES.map((cat, i) => {
                          const spent = expensesByCategory[cat.name] || 0;
                          if (spent === 0) return null;
                          const percent = (spent / totalExpense) * 100;
                          const strokeDashArray = `${percent} ${100 - percent}`;
                          const strokeDashOffset = 100 - currentOffset;
                          currentOffset += percent;

                          // Fallback hex colors for SVG stroke since we can't use gradients easily inside stroke
                          const colors = ["#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#10b981", "#ef4444", "#14b8a6", "#64748b"];
                          return (
                            <circle
                              key={cat.id}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke={colors[i % colors.length]}
                              strokeWidth="3.2"
                              strokeDasharray={strokeDashArray}
                              strokeDashoffset={strokeDashOffset}
                              className="transition-all duration-500 ease-out"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black text-slate-400">مجموع هزینه‌ها</span>
                      <span className="text-[11px] font-sans font-black text-slate-700 max-w-[80px] truncate">
                        {new Intl.NumberFormat("fa-IR").format(totalExpense)}
                      </span>
                    </div>
                  </div>

                  {/* Micro Legends */}
                  <div className="grid grid-cols-2 gap-2 w-full text-[9px] font-bold">
                    {DEFAULT_CATEGORIES.map((cat, i) => {
                      const spent = expensesByCategory[cat.name] || 0;
                      if (spent === 0) return null;
                      const colors = ["bg-amber-500", "bg-blue-500", "bg-pink-500", "bg-purple-500", "bg-emerald-500", "bg-red-500", "bg-teal-500", "bg-slate-500"];
                      return (
                        <div key={cat.id} className="flex items-center gap-1 text-slate-600 truncate">
                          <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]} shrink-0`} />
                          <span className="truncate">{cat.name}: {Math.round((spent / totalExpense) * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
                  <BarChart2 className="w-8 h-8 text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold">داده کافی برای نمایش نمودار وجود ندارد.</p>
                  <p className="text-[10px]">برای مشاهده سهم هزینه‌ها ابتدا هزینه ثبت کنید.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white/65 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            دفترچه ثبت تراکنش‌های شخصی
          </h3>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Type */}
            <div className="flex p-0.5 bg-slate-100 rounded-lg">
              <button
                onClick={() => setSelectedFilterType("all")}
                className={`px-3 py-1 text-[10px] font-black rounded-md cursor-pointer transition-all ${
                  selectedFilterType === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setSelectedFilterType("expense")}
                className={`px-3 py-1 text-[10px] font-black rounded-md cursor-pointer transition-all ${
                  selectedFilterType === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                هزینه‌ها
              </button>
              <button
                onClick={() => setSelectedFilterType("income")}
                className={`px-3 py-1 text-[10px] font-black rounded-md cursor-pointer transition-all ${
                  selectedFilterType === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                درآمدها
              </button>
            </div>

            {/* Filter by Category */}
            <select
              value={selectedFilterCategory}
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-black text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">تمام دسته‌بندی‌ها</option>
              {DEFAULT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
            در حال بارگذاری اطلاعات مالی شخصی...
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-3 px-4">مبلغ</th>
                  <th className="py-3 px-4">دسته‌بندی</th>
                  <th className="py-3 px-4">توضیحات</th>
                  <th className="py-3 px-4">تاریخ</th>
                  <th className="py-3 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map((item) => {
                  const categoryInfo = DEFAULT_CATEGORIES.find(c => c.name === item.category) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
                  const isExpense = item.type === "expense";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Amount */}
                      <td className={`py-3.5 px-4 font-black font-sans text-sm ${isExpense ? "text-rose-500" : "text-emerald-500"}`}>
                        {isExpense ? "— " : "+ "}
                        {new Intl.NumberFormat("fa-IR").format(item.amount)}
                      </td>
                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${categoryInfo.bgLight} ${categoryInfo.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${categoryInfo.color}`} />
                          {item.category}
                        </span>
                      </td>
                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-600 font-bold max-w-[200px] truncate" title={item.description}>
                        {item.description || "—"}
                      </td>
                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-sans text-[11px] font-semibold">
                        {item.date}
                      </td>
                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(item.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer inline-flex items-center"
                          title="حذف تراکنش"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Wallet className="w-10 h-10 text-slate-300 stroke-1" />
            <p className="text-xs font-bold">هیچ تراکنشی متناسب با فیلترهای انتخابی شما یافت نشد.</p>
          </div>
        )}
      </div>

      {/* --- BUDGET SETTINGS MODAL --- */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 border border-purple-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <PiggyBank className="w-5 h-5 text-purple-500" />
                  تنظیم بودجه‌بندی و اهداف مالی ماهانه 💼💵
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBudgets} className="space-y-6">
                <div className="space-y-4">
                  {/* Income target */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 space-y-2">
                    <label className="text-xs font-black text-emerald-800 flex items-center gap-1">
                      🎯 هدف درآمد ماهانه شخصی
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ۱۵,۰۰۰,۰۰۰"
                      value={monthlyIncomeGoal}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setMonthlyIncomeGoal(raw ? new Intl.NumberFormat().format(parseInt(raw, 10)) : "");
                      }}
                      className="w-full bg-white border border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-2 text-xs font-sans font-black text-right outline-none transition-all"
                    />
                    <p className="text-[10px] text-emerald-600/90 font-bold">برای ردیابی میزان تحقق درآمدهای شخصی شما در این ماه.</p>
                  </div>

                  {/* Category limits */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-700 block">سقف بودجه برای دسته‌بندی‌های هزینه:</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pl-1">
                      {DEFAULT_CATEGORIES.map(cat => (
                        <div key={cat.id} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <label className="text-[11px] font-bold text-slate-600 block flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-tr ${cat.color}`} />
                            {cat.name}
                          </label>
                          <input
                            type="text"
                            placeholder="بدون سقف"
                            value={budgetFormValues[cat.name] || ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setBudgetFormValues(prev => ({
                                ...prev,
                                [cat.name]: raw ? new Intl.NumberFormat().format(parseInt(raw, 10)) : ""
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 rounded-lg px-2.5 py-1.5 text-xs font-sans font-semibold text-right outline-none transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:shadow-lg hover:shadow-purple-100 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    ذخیره تغییرات و اهداف مالی
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
