import { useState } from "react";
import {
  LayoutDashboard, FileText, Users, Package, CreditCard, BarChart2,
  FolderOpen, Settings, HelpCircle, Search, Bell, Plus,
  ChevronRight, Eye, Download, MoreHorizontal, Trash2,
  ArrowUpRight, CheckCircle, Clock, AlertTriangle,
  X, Building2, Mail, Hash, Calendar,
  Shield, Database, Upload, Check,
  ChevronLeft, Send, Zap, RefreshCw, FileX,
  FileMinus, Receipt, ChevronDown, FileCheck,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Brand constants ────────────────────────────────────────
const N = "#11233C";   // navy
const M = "#63BFA8";   // mint
const ML = "#EBF7F4";  // mint light
const AL = "#FEF3C7";  // amber light

// ─── Sample data ────────────────────────────────────────────
const revenueData = [
  { month: "Jan", paid: 8400, invoiced: 9200 },
  { month: "Feb", paid: 7200, invoiced: 7800 },
  { month: "Mar", paid: 11800, invoiced: 12500 },
  { month: "Apr", paid: 9600, invoiced: 10200 },
  { month: "May", paid: 14200, invoiced: 15800 },
  { month: "Jun", paid: 12800, invoiced: 13600 },
  { month: "Jul", paid: 9400, invoiced: 9400 },
];

const monthlyData = [
  { month: "Jan", revenue: 8400, vat: 1764 },
  { month: "Feb", revenue: 7200, vat: 1512 },
  { month: "Mar", revenue: 11800, vat: 2478 },
  { month: "Apr", revenue: 9600, vat: 2016 },
  { month: "May", revenue: 14200, vat: 2982 },
  { month: "Jun", revenue: 12800, vat: 2688 },
  { month: "Jul", revenue: 9400, vat: 1974 },
];

const allInvoices = [
  { id: "INV-2026-0047", client: "Accenture Belgium", amount: 4750, status: "paid",     date: "2026-07-01", due: "2026-07-31" },
  { id: "INV-2026-0046", client: "Proximus NV",       amount: 2340, status: "sent",     date: "2026-06-28", due: "2026-07-28" },
  { id: "INV-2026-0045", client: "Colruyt Group",     amount: 8900, status: "overdue",  date: "2026-06-10", due: "2026-07-10" },
  { id: "INV-2026-0044", client: "ING Belgium",       amount: 1250, status: "draft",    date: "2026-07-05", due: "2026-08-04" },
  { id: "INV-2026-0043", client: "Belfius Digital",   amount: 6200, status: "paid",     date: "2026-06-22", due: "2026-07-22" },
  { id: "INV-2026-0042", client: "Belfius Digital",   amount: 3100, status: "paid",     date: "2026-06-15", due: "2026-07-15" },
  { id: "INV-2026-0041", client: "Accenture Belgium", amount: 6500, status: "cancelled",date: "2026-06-10", due: "2026-07-10" },
  { id: "INV-2026-0040", client: "Proximus NV",       amount: 2800, status: "paid",     date: "2026-06-05", due: "2026-07-05" },
];

const customers = [
  { id: "1", name: "Accenture Belgium",  email: "billing@accenture.be",    vat: "BE0418418888", revenue: 28400, invoices: 12, outstanding: 0,    status: "active"  },
  { id: "2", name: "Proximus NV",        email: "accounts@proximus.be",    vat: "BE0202239951", revenue: 14600, invoices: 8,  outstanding: 2340, status: "active"  },
  { id: "3", name: "Colruyt Group",      email: "fa@colruyt.be",           vat: "BE0400378485", revenue: 52100, invoices: 23, outstanding: 8900, status: "overdue" },
  { id: "4", name: "ING Belgium",        email: "suppliers@ing.be",        vat: "BE0403200702", revenue: 9800,  invoices: 5,  outstanding: 1250, status: "active"  },
  { id: "5", name: "Belfius Digital",    email: "procurement@belfius.be",  vat: "BE0436134977", revenue: 31200, invoices: 15, outstanding: 0,    status: "active"  },
];

const activities = [
  { type: "paid",    text: "Accenture Belgium paid INV-2026-0047",     time: "2 hours ago",  amount: "€4,750" },
  { type: "sent",    text: "Invoice INV-2026-0046 sent to Proximus NV", time: "Yesterday",    amount: "€2,340" },
  { type: "overdue", text: "INV-2026-0045 is 27 days overdue",          time: "Today",        amount: "€8,900" },
  { type: "draft",   text: "Draft created for ING Belgium",             time: "1 hour ago",   amount: "€1,250" },
  { type: "paid",    text: "Belfius Digital paid INV-2026-0043",        time: "15 Jun",       amount: "€6,200" },
];

const pieData = [
  { name: "Colruyt Group",     value: 52100 },
  { name: "Belfius Digital",   value: 31200 },
  { name: "Accenture Belgium", value: 28400 },
  { name: "Proximus NV",       value: 14600 },
  { name: "ING Belgium",       value: 9800  },
];

// ─── Shared primitives ──────────────────────────────────────

function Btn({
  children, variant = "primary", size = "md",
  onClick, className = "", disabled = false,
  style: extraStyle = {},
}: {
  children: React.ReactNode; variant?: string; size?: string;
  onClick?: () => void; className?: string; disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base = "inline-flex items-center justify-center font-medium rounded-[10px] transition-all duration-150 cursor-pointer gap-1.5 select-none";
  const vMap: Record<string, React.CSSProperties> = {
    primary:   { backgroundColor: N, color: "#fff" },
    mint:      { backgroundColor: M, color: "#fff" },
    secondary: { backgroundColor: "#fff", color: N, border: "1px solid rgba(17,35,60,0.12)" },
    ghost:     { backgroundColor: "transparent", color: N },
    danger:    { backgroundColor: "#FEF2F2", color: "#DC2626" },
  };
  const sz: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",   xl: "px-7 py-3.5 text-base",
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`${base} ${sz[size]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.97]"}`}
      style={{ ...vMap[variant], ...extraStyle }}
    >
      {children}
    </button>
  );
}

function Field({
  label, value, onChange, placeholder = "", type = "text",
  className = "", rows,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string; rows?: number;
}) {
  const inputCls = "w-full rounded-[10px] border border-[rgba(17,35,60,0.12)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/40 focus:border-[#63BFA8] transition-all placeholder:text-gray-400";
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-[#11233C] uppercase tracking-wide">{label}</label>}
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          rows={rows} placeholder={placeholder} className={`${inputCls} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={inputCls} />
      )}
    </div>
  );
}

function Sel({
  label, value, onChange, options, className = "",
}: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-[#11233C] uppercase tracking-wide">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-[rgba(17,35,60,0.12)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/40 focus:border-[#63BFA8] transition-all appearance-none cursor-pointer text-[#11233C]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Pill({ children, v = "default" }: { children: React.ReactNode; v?: string }) {
  const styles: Record<string, string> = {
    default:   "bg-gray-100 text-gray-500",
    paid:      "bg-[#EBF7F4] text-[#389e88]",
    sent:      "bg-blue-50 text-blue-600",
    draft:     "bg-gray-100 text-gray-500",
    overdue:   "bg-red-50 text-red-500",
    cancelled: "bg-gray-100 text-gray-400",
    active:    "bg-[#EBF7F4] text-[#389e88]",
    warning:   "bg-amber-50 text-amber-600",
    filed:     "bg-[#EBF7F4] text-[#389e88]",
    due:       "bg-amber-50 text-amber-600",
    pending:   "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[v] || styles.default}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-[14px] border border-[rgba(17,35,60,0.06)] shadow-[0_1px_3px_rgba(17,35,60,0.05),0_1px_2px_rgba(17,35,60,0.04)] ${onClick ? "cursor-pointer hover:shadow-[0_4px_16px_rgba(17,35,60,0.09)] transition-shadow duration-200" : ""} ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action, onAction }: {
  icon: React.ElementType; title: string; desc: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#F0EEE8]">
          <Icon size={28} className="text-gray-300" />
        </div>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: N }}>{title}</h3>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{desc}</p>
        {action && <Btn onClick={onAction}><Plus size={14} /> {action}</Btn>}
      </div>
    </div>
  );
}

// ─── Login ──────────────────────────────────────────────────

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("marie.dubois@freelance.be");
  const [pass, setPass]   = useState("MySecurePass2026");

  return (
    <div className="min-h-screen flex bg-[#F5F4F0]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] p-12 flex-shrink-0" style={{ backgroundColor: N }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: M }}>
            <FileCheck size={19} color="#fff" />
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">BillGen</span>
        </div>

        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest font-medium mb-8">Trusted by 4,200+ Belgian freelancers</p>
          <div className="space-y-6">
            {[
              { title: "Invoicing made simple", body: "Create compliant Belgian invoices in seconds, with VAT calculated automatically." },
              { title: "Peppol e-invoicing ready", body: "Send structured XML invoices directly to public sector clients via the Peppol network." },
              { title: "Works offline too", body: "The Windows desktop app stores your data locally. No subscription required." },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: M + "22" }}>
                  <Check size={13} color={M} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-white/40 text-sm mt-0.5 leading-snug">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["Accenture", "Proximus", "ING", "Belfius", "+4,200 more"].map(n => (
            <span key={n} className="px-3 py-1.5 rounded-full text-xs text-white/30 border border-white/10">{n}</span>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: N }}>
              <FileCheck size={16} color="#fff" />
            </div>
            <span className="font-semibold text-lg" style={{ color: N }}>BillGen</span>
          </div>

          <h1 className="text-[28px] font-semibold mb-1.5 leading-tight" style={{ color: N }}>Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to your BillGen workspace</p>

          <div className="space-y-4">
            <Field label="Email address" value={email} onChange={setEmail} placeholder="you@company.be" type="email" />
            <Field label="Password" value={pass} onChange={setPass} placeholder="••••••••" type="password" />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-500">
                <input type="checkbox" defaultChecked className="rounded" />
                Remember me
              </label>
              <button className="font-medium" style={{ color: M }}>Forgot password?</button>
            </div>

            <Btn variant="primary" size="lg" className="w-full" onClick={onLogin}>Sign in</Btn>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(17,35,60,0.08)]" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-[rgba(17,35,60,0.08)]" />
          </div>

          <Btn variant="secondary" size="lg" className="w-full" onClick={onLogin}>
            <Shield size={15} /> itsme® / eID Belgium
          </Btn>

          <p className="text-center text-sm text-gray-500 mt-8">
            No account?{" "}
            <button className="font-semibold" style={{ color: N }} onClick={onLogin}>Start 30-day free trial</button>
          </p>

          <p className="text-center text-xs text-gray-300 mt-4">
            256-bit encryption · GDPR compliant · Hosted in Belgium 🇧🇪
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Wizard ─────────────────────────────────────────────────

const STEPS = ["Welcome","Business","VAT & Region","Numbering","Brand","Template","Customize","Payments","Import","Done"];
const ACCENT_PRESETS = [M, N, "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];

function WizardProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 ${
            i + 1 < step ? "text-white" : i + 1 === step ? "text-white ring-4 ring-[#63BFA8]/20" : "text-gray-300 bg-gray-100"
          }`} style={i + 1 <= step ? { backgroundColor: i + 1 < step ? M : N } : {}}>
            {i + 1 < step ? <Check size={10} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-6 h-0.5 transition-all duration-300"
              style={{ backgroundColor: i + 1 < step ? M : "rgba(17,35,60,0.08)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function TemplateThumb({ id, color }: { id: string; color: string }) {
  return (
    <div className="w-full h-full flex flex-col gap-1.5 p-2 text-[6px]">
      <div className="flex items-center justify-between">
        <div className="w-10 h-2.5 rounded" style={{ backgroundColor: id === "minimal" ? "#e5e7eb" : color + "40" }} />
        <div className="w-14 h-2.5 rounded bg-gray-100" />
      </div>
      <div className="h-0.5 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex gap-1.5 mt-0.5">
        <div className="flex-1 space-y-1">
          {[100, 75, 50].map(w => <div key={w} className="h-1.5 rounded bg-gray-200" style={{ width: `${w}%` }} />)}
        </div>
        <div className="w-14 space-y-1">
          <div className="h-1.5 rounded bg-gray-200" /><div className="h-1.5 rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-auto space-y-0.5">
        {[4].map(i => (
          <div key={i} className="flex gap-1">
            <div className="flex-1 h-1.5 rounded bg-gray-100" />
            <div className="w-6 h-1.5 rounded bg-gray-100" />
            <div className="w-8 h-1.5 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="pt-1.5 border-t border-gray-100">
        <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: color + "50" }} />
      </div>
    </div>
  );
}

interface BizData {
  name: string; vat: string; email: string; phone: string;
  address: string; iban: string; accentColor: string;
  template: string; prefix: string; startNum: number;
}

function Wizard({ biz, setBiz, onDone }: {
  biz: BizData; setBiz: React.Dispatch<React.SetStateAction<BizData>>; onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const next = () => setStep(s => Math.min(s + 1, 10));
  const prev = () => setStep(s => Math.max(s - 1, 1));
  const upd  = (k: keyof BizData) => (v: string | number) => setBiz(b => ({ ...b, [k]: v }));

  const templates = [
    { id: "minimal",      name: "Minimal",         style: "Clean & simple"   },
    { id: "professional", name: "Professional",     style: "Business ready"   },
    { id: "corporate",    name: "Corporate",        style: "Enterprise grade" },
    { id: "modern",       name: "Modern",           style: "Contemporary"     },
    { id: "elegant",      name: "Elegant",          style: "Sophisticated"    },
    { id: "belgian",      name: "Belgian Standard", style: "Local compliance" },
  ];

  const body = () => {
    switch (step) {
      case 1: return (
        <div className="text-center">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-7 flex items-center justify-center" style={{ backgroundColor: ML }}>
            <FileCheck size={44} color={M} />
          </div>
          <h2 className="text-3xl font-semibold mb-3" style={{ color: N }}>Welcome to BillGen</h2>
          <p className="text-gray-400 text-base mb-2">Belgium's smartest invoicing platform.</p>
          <p className="text-gray-400 text-sm mb-10 max-w-md mx-auto leading-relaxed">
            Let's configure your workspace in a few minutes. We'll set up your business profile, VAT settings, and invoice templates.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Btn variant="primary" size="xl" onClick={next} className="min-w-[200px]">
              <Zap size={17} /> Start Setup
            </Btn>
            <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors" onClick={onDone}>
              Skip for now
            </button>
          </div>
        </div>
      );

      case 2: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Business Information</h2>
          <p className="text-gray-400 text-sm mb-6">This information appears on all your invoices.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business name" value={biz.name} onChange={upd("name")} placeholder="My Company BVBA" className="col-span-2" />
            <Sel label="Legal form" value="bv" onChange={() => {}} options={[
              { value: "bv", label: "BV / BVBA" }, { value: "nv", label: "NV" },
              { value: "ez", label: "Eenmanszaak" }, { value: "vzw", label: "VZW" },
            ]} />
            <Field label="VAT number" value={biz.vat} onChange={upd("vat")} placeholder="BE0123456789" />
            <Field label="Company number" value="" onChange={() => {}} placeholder="0123.456.789" />
            <Field label="Email" value={biz.email} onChange={upd("email")} placeholder="hello@company.be" type="email" />
            <Field label="Phone" value={biz.phone} onChange={upd("phone")} placeholder="+32 2 123 45 67" />
            <Field label="Address" value={biz.address} onChange={upd("address")} placeholder="Rue de la Loi 1, 1000 Brussels" className="col-span-2" />
            <Field label="Website" value="" onChange={() => {}} placeholder="https://mycompany.be" />
            <Field label="IBAN" value={biz.iban} onChange={upd("iban")} placeholder="BE68 5390 0754 7034" />
          </div>
        </div>
      );

      case 3: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>VAT & Regional Settings</h2>
          <p className="text-gray-400 text-sm mb-6">Configure your tax and language preferences.</p>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: N }}>VAT Registration</p>
              {[
                { id: "be",   label: "VAT registered in Belgium",        desc: "I have a Belgian BTW/TVA number" },
                { id: "eu",   label: "VAT registered in another EU country", desc: "Cross-border EU transactions" },
                { id: "none", label: "Not VAT registered",               desc: "Under small business threshold (€25,000)" },
              ].map(opt => (
                <label key={opt.id} className="flex items-start gap-3 p-4 rounded-[12px] border border-[rgba(17,35,60,0.1)] cursor-pointer hover:border-[#63BFA8] transition-all mb-2">
                  <input type="radio" name="vat_status" defaultChecked={opt.id === "be"} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: N }}>{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel label="Default VAT rate" value="21" onChange={() => {}} options={[
                { value: "21", label: "21% — Standard" }, { value: "12", label: "12% — Reduced" },
                { value: "6",  label: "6% — Low reduced" }, { value: "0", label: "0% — Exempt" },
              ]} />
              <Sel label="Invoice language" value="nl" onChange={() => {}} options={[
                { value: "nl", label: "Dutch" }, { value: "fr", label: "French" },
                { value: "en", label: "English" }, { value: "de", label: "German" },
              ]} />
              <Sel label="Currency" value="eur" onChange={() => {}} options={[
                { value: "eur", label: "EUR — Euro" }, { value: "usd", label: "USD — Dollar" }, { value: "gbp", label: "GBP — Pound" },
              ]} />
              <Sel label="Country" value="be" onChange={() => {}} options={[
                { value: "be", label: "Belgium" }, { value: "nl", label: "Netherlands" }, { value: "lu", label: "Luxembourg" },
              ]} />
            </div>
          </div>
        </div>
      );

      case 4: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Invoice Numbering</h2>
          <p className="text-gray-400 text-sm mb-6">Define how your invoices are numbered.</p>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prefix" value={biz.prefix} onChange={upd("prefix")} placeholder="INV-2026-" />
              <Field label="Starting number" value={String(biz.startNum)} onChange={v => upd("startNum")(parseInt(v) || 1)} type="number" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm" style={{ color: N }}>Reset numbering every calendar year</span>
            </label>
            <div className="p-5 rounded-[12px]" style={{ backgroundColor: ML }}>
              <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Preview</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold" style={{ color: N }}>{biz.prefix}{String(biz.startNum).padStart(4,"0")}</span>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-base text-gray-400">{biz.prefix}{String(biz.startNum + 1).padStart(4,"0")}</span>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-sm text-gray-300">{biz.prefix}{String(biz.startNum + 2).padStart(4,"0")}</span>
              </div>
            </div>
          </div>
        </div>
      );

      case 5: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Brand Identity</h2>
          <p className="text-gray-400 text-sm mb-6">Make your invoices look like your business.</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: N }}>Business Logo</p>
              <div className="border-2 border-dashed border-[rgba(17,35,60,0.14)] rounded-[14px] p-8 text-center hover:border-[#63BFA8] transition-colors cursor-pointer">
                <Upload size={26} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">Drop your logo here</p>
                <p className="text-xs text-gray-300 mt-1">PNG, SVG or JPG · max 2 MB</p>
                <Btn variant="secondary" size="sm" className="mt-3">Choose file</Btn>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: N }}>Accent Color</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {ACCENT_PRESETS.map(c => (
                  <button key={c} onClick={() => upd("accentColor")(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: biz.accentColor === c ? N : "transparent", transform: biz.accentColor === c ? "scale(1.18)" : "scale(1)" }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={biz.accentColor} onChange={e => upd("accentColor")(e.target.value)}
                  className="w-10 h-10 rounded-[8px] cursor-pointer border border-[rgba(17,35,60,0.1)] p-0.5" />
                <Field value={biz.accentColor} onChange={upd("accentColor")} className="flex-1" />
              </div>
              <div className="mt-4 p-4 rounded-[12px]" style={{ backgroundColor: biz.accentColor + "1A" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px]" style={{ backgroundColor: biz.accentColor }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: N }}>Brand Preview</p>
                    <p className="text-xs text-gray-400">{biz.accentColor}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

      case 6: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Choose Your Template</h2>
          <p className="text-gray-400 text-sm mb-6">Pick a base style for your invoices. You can change this later.</p>
          <div className="grid grid-cols-3 gap-4">
            {templates.map(t => (
              <button key={t.id} onClick={() => upd("template")(t.id)}
                className={`relative rounded-[14px] overflow-hidden border-2 text-left transition-all ${
                  biz.template === t.id ? "border-[#63BFA8] shadow-lg shadow-[#63BFA8]/20" : "border-[rgba(17,35,60,0.08)] hover:border-[rgba(17,35,60,0.18)]"
                }`}>
                <div className="bg-white p-3 aspect-[3/4]">
                  <TemplateThumb id={t.id} color={biz.accentColor} />
                </div>
                <div className="px-3 py-2.5 border-t border-[rgba(17,35,60,0.06)]">
                  <p className="text-xs font-semibold" style={{ color: N }}>{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.style}</p>
                </div>
                {biz.template === t.id && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: M }}>
                    <Check size={10} color="#fff" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      );

      case 7: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Customize Template</h2>
          <p className="text-gray-400 text-sm mb-5">Fine-tune your invoice appearance.</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              <Sel label="Font" value="inter" onChange={() => {}} options={[
                { value: "inter",   label: "Inter (Recommended)" },
                { value: "roboto",  label: "Roboto" },
                { value: "poppins", label: "Poppins" },
              ]} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: N }}>Logo Position</p>
                <div className="flex gap-2">
                  {["Left","Center","Right"].map(p => (
                    <button key={p} className="flex-1 py-2 rounded-[8px] text-xs font-medium border border-[rgba(17,35,60,0.1)] text-gray-500 hover:border-[#63BFA8] transition-all">{p}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ["Show QR code", true], ["Show payment block", true],
                  ["Show signature line", false], ["Show bank details", true],
                ].map(([label, checked]) => (
                  <label key={String(label)} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked={Boolean(checked)} className="rounded" />
                    <span className="text-sm" style={{ color: N }}>{String(label)}</span>
                  </label>
                ))}
              </div>
              <Field label="Footer text" value="Thank you for your business!" onChange={() => {}} />
            </div>
            <div className="bg-gray-100 rounded-[12px] p-3 flex items-center justify-center">
              <div className="w-full bg-white rounded-[6px] shadow-sm p-4" style={{ aspectRatio: "1/√2" }}>
                <MiniPreview color={biz.accentColor} />
              </div>
            </div>
          </div>
        </div>
      );

      case 8: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Payment Settings</h2>
          <p className="text-gray-400 text-sm mb-6">Configure how you get paid.</p>
          <div className="space-y-5">
            <Field label="IBAN" value={biz.iban} onChange={upd("iban")} placeholder="BE68 5390 0754 7034" />
            <Sel label="Default payment term" value="30" onChange={() => {}} options={[
              { value: "7", label: "7 days" }, { value: "14", label: "14 days" },
              { value: "30", label: "30 days (standard)" }, { value: "60", label: "60 days" },
            ]} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: N }}>Accepted Payment Methods</p>
              <div className="grid grid-cols-2 gap-2">
                {["Bank Transfer","Bancontact","PayPal","Stripe","iDEAL","Cash"].map(m => (
                  <label key={m} className="flex items-center gap-2.5 p-3 rounded-[10px] border border-[rgba(17,35,60,0.08)] cursor-pointer hover:border-[#63BFA8] transition-all">
                    <input type="checkbox" defaultChecked={m === "Bank Transfer" || m === "Bancontact"} className="rounded" />
                    <span className="text-sm" style={{ color: N }}>{m}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: N }}>Late Payment Fee</p>
              <div className="flex items-center gap-3">
                <input type="number" defaultValue="8.5" className="w-24 rounded-[10px] border border-[rgba(17,35,60,0.12)] px-3 py-2.5 text-sm text-right focus:outline-none" />
                <span className="text-sm text-gray-500">% annual interest (Belgian statutory rate)</span>
              </div>
            </div>
          </div>
        </div>
      );

      case 9: return (
        <div>
          <h2 className="text-2xl font-semibold mb-1" style={{ color: N }}>Import Existing Data</h2>
          <p className="text-gray-400 text-sm mb-6">Bring data from another invoicing system.</p>
          <div className="space-y-3">
            {[
              { icon: FileText, title: "Import invoices",             desc: "From Excel, CSV, Billit, Exact, or Odoo" },
              { icon: Users,    title: "Import customers",            desc: "Customer list with contact details"        },
              { icon: Package,  title: "Import products & services",  desc: "Product catalog with prices"              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4 p-4 rounded-[12px] border border-[rgba(17,35,60,0.08)] hover:border-[#63BFA8] transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ML }}>
                  <Icon size={19} color={M} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: N }}>{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <Upload size={15} className="text-gray-300 group-hover:text-[#63BFA8] transition-colors" />
              </div>
            ))}
            <button className="w-full text-center text-sm text-gray-400 hover:text-gray-500 py-3 transition-colors" onClick={next}>
              Skip import for now →
            </button>
          </div>
        </div>
      );

      case 10: return (
        <div className="text-center">
          <div className="w-24 h-24 rounded-3xl mx-auto mb-7 flex items-center justify-center" style={{ backgroundColor: ML }}>
            <CheckCircle size={48} color={M} />
          </div>
          <h2 className="text-3xl font-semibold mb-3" style={{ color: N }}>BillGen is ready!</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            Your workspace has been configured. You can now create your first invoice or explore the dashboard.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Btn variant="mint" size="xl" onClick={onDone} className="min-w-[220px]">
              <Plus size={17} /> Create First Invoice
            </Btn>
            <Btn variant="secondary" size="lg" onClick={onDone} className="min-w-[220px]">
              <LayoutDashboard size={15} /> Open Dashboard
            </Btn>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-gray-400">
            {["Business profile saved", "VAT configured", "Template selected"].map(t => (
              <div key={t} className="flex items-center gap-1.5"><Check size={12} color={M} />{t}</div>
            ))}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0]">
      <div className="bg-white border-b border-[rgba(17,35,60,0.06)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: N }}>
            <FileCheck size={16} color="#fff" />
          </div>
          <span className="font-semibold" style={{ color: N }}>BillGen</span>
        </div>
        <WizardProgress step={step} />
        <span className="text-xs text-gray-400 w-20 text-right">Step {step} of {STEPS.length}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`w-full ${step === 1 || step === 10 ? "max-w-[520px]" : "max-w-[680px]"}`}>
          {body()}
          {step > 1 && step < 10 && (
            <div className="flex items-center justify-between mt-8">
              <Btn variant="ghost" onClick={prev}><ChevronLeft size={15} /> Back</Btn>
              <Btn variant="primary" onClick={next}>{step === 9 ? "Finish" : "Continue"} <ChevronRight size={15} /></Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mini invoice preview used in wizard steps 7
function MiniPreview({ color }: { color: string }) {
  const c = color;
  return (
    <div className="w-full h-full flex flex-col text-[8px]">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="w-10 h-3 rounded mb-1" style={{ backgroundColor: c + "40" }} />
          <div className="font-bold text-[10px]" style={{ color: N }}>INVOICE</div>
          <div className="text-gray-400">INV-2026-0001</div>
        </div>
        <div className="text-right text-gray-400">
          <div>Marie Dubois Design</div>
          <div>Brussels, Belgium</div>
          <div>BE0123456789</div>
        </div>
      </div>
      <div className="h-[1.5px] rounded-full mb-2" style={{ backgroundColor: c }} />
      <div className="flex justify-between mb-2 text-gray-400">
        <div><span className="font-semibold" style={{ color: N }}>Bill To:</span><br/>Accenture Belgium<br/>Brussels</div>
        <div className="text-right"><span className="font-semibold" style={{ color: N }}>Due:</span><br/>06 Aug 2026</div>
      </div>
      <div className="flex-1 space-y-0.5">
        {["UI/UX Design (12h)", "Prototype", "Documentation"].map((d, i) => (
          <div key={d} className="flex justify-between text-gray-400">
            <span>{d}</span><span style={{ color: N }}>€{[1320,440,650][i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 pt-1 border-t border-gray-100">
        <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>€2,410</span></div>
        <div className="flex justify-between text-gray-400"><span>VAT 21%</span><span>€506.10</span></div>
        <div className="flex justify-between font-bold text-[10px]" style={{ color: N }}><span>Total</span><span>€2,916.10</span></div>
      </div>
      <div className="mt-1 p-1 rounded text-[6px] text-gray-400" style={{ backgroundColor: c + "18" }}>
        IBAN: BE68 5390 0754 7034 · +++123/456/789+++
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────

const NAV = [
  { id: "dashboard",    label: "Dashboard",           icon: LayoutDashboard },
  { id: "invoices",     label: "Invoices",            icon: FileText,   badge: "3" },
  { id: "credit-notes", label: "Credit Notes",        icon: FileMinus },
  { id: "customers",    label: "Customers",           icon: Users },
  { id: "products",     label: "Products & Services", icon: Package },
  { id: "payments",     label: "Payments",            icon: CreditCard },
  { id: "reports",      label: "Reports",             icon: BarChart2 },
  { id: "imports",      label: "Imports",             icon: FolderOpen },
];

const NAV_BTM = [
  { id: "settings", label: "Settings",     icon: Settings },
  { id: "help",     label: "Help & Support", icon: HelpCircle },
];

function Sidebar({ page, nav }: { page: string; nav: (p: string) => void }) {
  return (
    <div className="flex flex-col h-full w-[230px] flex-shrink-0" style={{ backgroundColor: N }}>
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: M }}>
            <FileCheck size={16} color="#fff" />
          </div>
          <span className="text-white font-semibold text-[15px]">BillGen</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => nav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-150 text-left ${active ? "text-white" : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"}`}
              style={active ? { backgroundColor: "rgba(99,191,168,0.14)" } : {}}>
              <Icon size={16} color={active ? M : undefined} />
              <span className={`text-sm flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
              {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: M + "28", color: M }}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
        <div className="px-3 py-2 mb-1 flex items-center gap-2.5 text-[10px] text-white/25">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Online
          <span className="mx-1">·</span>
          <Database size={9} />
          Connected
        </div>

        {NAV_BTM.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => nav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-150 text-left ${active ? "text-white" : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"}`}
              style={active ? { backgroundColor: "rgba(99,191,168,0.14)" } : {}}>
              <Icon size={16} color={active ? M : undefined} />
              <span className={`text-sm ${active ? "font-semibold" : ""}`}>{label}</span>
            </button>
          );
        })}

        <div className="flex items-center gap-3 px-3 py-3 mt-1 border-t border-white/5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: M }}>MD</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Marie Dubois</p>
            <p className="text-white/35 text-[10px] truncate">Freelance Designer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ──────────────────────────────────────────────────

function Topbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const [q, setQ] = useState("");
  return (
    <div className="h-14 bg-white border-b border-[rgba(17,35,60,0.06)] flex items-center px-5 gap-4 flex-shrink-0">
      <h1 className="text-[15px] font-semibold flex-shrink-0" style={{ color: N }}>{title}</h1>
      <div className="flex-1 max-w-xs relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search invoices, customers…"
          className="w-full pl-8 pr-3 py-2 rounded-[9px] text-sm bg-gray-50 border border-[rgba(17,35,60,0.06)] focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/30 focus:border-[#63BFA8] transition-all" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-[9px] hover:bg-gray-50 transition-colors">
          <Bell size={17} className="text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: M }} />
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────

function Dashboard({ nav }: { nav: (p: string) => void }) {
  const kpis = [
    { label: "Revenue this month", value: "€12,840", tag: "+18% vs Jun", up: true,  accent: N     },
    { label: "Outstanding",        value: "€11,490", tag: "3 invoices",  up: false, accent: "#F59E0B" },
    { label: "Paid this month",    value: "€10,950", tag: "7 invoices",  up: true,  accent: M     },
    { label: "VAT due (Q2)",       value: "€5,388",  tag: "Due 20 Jul", up: false, accent: "#8B5CF6" },
  ];

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      {/* Alert */}
      <div className="flex items-center gap-3 p-4 rounded-[12px]" style={{ backgroundColor: AL }}>
        <AlertTriangle size={16} color="#F59E0B" />
        <p className="text-sm text-amber-800 flex-1">
          <strong>VAT Declaration due in 13 days</strong> — Q2 2026 declaration to Belgian Tax Authority (FOD Financiën)
        </p>
        <Btn variant="secondary" size="sm" style={{ borderColor: "#F59E0B44" }}>View Report</Btn>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-snug">{k.label}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${k.up ? "bg-[#EBF7F4] text-[#389e88]" : "bg-amber-50 text-amber-600"}`}>
                {k.tag}
              </span>
            </div>
            <p className="text-[22px] font-semibold leading-none" style={{ color: k.accent }}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: N }}>Revenue Overview</p>
              <p className="text-xs text-gray-400">Jan — Jul 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: N }} />Paid</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: M }} />Invoiced</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={N} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={N} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={M} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={M} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,35,60,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`€${v.toLocaleString()}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(17,35,60,0.08)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="invoiced" stroke={M} strokeWidth={1.5} fill="url(#gI)" />
              <Area type="monotone" dataKey="paid" stroke={N} strokeWidth={2} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Activity */}
        <Card className="p-5">
          <p className="text-sm font-semibold mb-4" style={{ color: N }}>Recent Activity</p>
          <div className="space-y-3.5">
            {activities.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${a.type === "paid" ? "bg-[#EBF7F4]" : a.type === "overdue" ? "bg-red-50" : "bg-gray-100"}`}>
                  {a.type === "paid" ? <CheckCircle size={11} color={M} /> : a.type === "overdue" ? <AlertTriangle size={11} color="#EF4444" /> : a.type === "sent" ? <Send size={11} color="#6B7280" /> : <Clock size={11} color="#6B7280" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-600 leading-snug">{a.text}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent invoices table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(17,35,60,0.04)] flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: N }}>Recent Invoices</p>
          <Btn variant="ghost" size="sm" onClick={() => nav("invoices")}>View all <ChevronRight size={13} /></Btn>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-[rgba(17,35,60,0.04)]">
              {["Invoice", "Customer", "Date", "Amount", "Status", ""].map(h => (
                <th key={h} className={`px-5 py-3 font-semibold uppercase tracking-wide ${h === "Amount" ? "text-right" : h === "Status" ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allInvoices.slice(0, 5).map((inv, i) => (
              <tr key={i} className="border-b border-[rgba(17,35,60,0.03)] hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: N }}>{inv.id}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{inv.client}</td>
                <td className="px-5 py-3.5 text-sm text-gray-400">{inv.date}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-right" style={{ color: N }}>€{inv.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-center"><Pill v={inv.status}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</Pill></td>
                <td className="px-5 py-3.5"><button className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-gray-100 ml-auto"><MoreHorizontal size={14} className="text-gray-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Invoice List ─────────────────────────────────────────────

function InvoiceList({ nav }: { nav: (p: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const statuses = ["all", "draft", "sent", "paid", "overdue", "cancelled"];

  const filtered = allInvoices.filter(inv => {
    const mq = inv.client.toLowerCase().includes(q.toLowerCase()) || inv.id.toLowerCase().includes(q.toLowerCase());
    const ms = filter === "all" || inv.status === filter;
    return mq && ms;
  });

  const paid   = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const out    = allInvoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdue = allInvoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const total  = allInvoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Invoiced", value: `€${total.toLocaleString()}`,   sub: `${allInvoices.length} invoices`,                                            color: N },
          { label: "Paid",          value: `€${paid.toLocaleString()}`,    sub: `${allInvoices.filter(i => i.status === "paid").length} invoices`,            color: M },
          { label: "Outstanding",   value: `€${out.toLocaleString()}`,     sub: `${allInvoices.filter(i => i.status === "sent" || i.status === "overdue").length} invoices`, color: "#F59E0B" },
          { label: "Overdue",       value: `€${overdue.toLocaleString()}`, sub: `${allInvoices.filter(i => i.status === "overdue").length} invoice`,          color: "#DC2626" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(17,35,60,0.04)] flex items-center gap-3 flex-wrap">
          <div className="relative max-w-[280px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-[8px] border border-[rgba(17,35,60,0.08)] focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/30 focus:border-[#63BFA8] transition-all" />
          </div>

          <div className="flex items-center gap-0.5 bg-gray-50 rounded-[10px] p-1">
            {statuses.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-all ${filter === s ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                style={filter === s ? { color: N } : {}}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
            <Btn variant="primary" size="sm" onClick={() => nav("invoice-builder")}><Plus size={13} /> New Invoice</Btn>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-[rgba(17,35,60,0.04)]">
              <th className="px-5 py-3 text-left"><input type="checkbox" className="rounded" /></th>
              {["Invoice #", "Customer", "Issue Date", "Due Date", "Excl. VAT", "Total incl.", "Status", ""].map(h => (
                <th key={h} className={`px-3 py-3 font-semibold uppercase tracking-wide text-left ${h === "Excl. VAT" || h === "Total incl." ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, i) => (
              <tr key={i} className="border-b border-[rgba(17,35,60,0.03)] hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => nav("invoice-builder")}>
                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                <td className="px-3 py-3.5 text-sm font-semibold" style={{ color: N }}>{inv.id}</td>
                <td className="px-3 py-3.5 text-sm text-gray-600">{inv.client}</td>
                <td className="px-3 py-3.5 text-sm text-gray-400">{inv.date}</td>
                <td className="px-3 py-3.5 text-sm text-gray-400">{inv.due}</td>
                <td className="px-3 py-3.5 text-sm text-right text-gray-500">€{Math.round(inv.amount / 1.21).toLocaleString()}</td>
                <td className="px-3 py-3.5 text-sm font-semibold text-right" style={{ color: N }}>€{inv.amount.toLocaleString()}</td>
                <td className="px-3 py-3.5"><Pill v={inv.status}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</Pill></td>
                <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                  <button className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-gray-100 ml-auto">
                    <MoreHorizontal size={13} className="text-gray-300" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <FileX size={30} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No invoices found</p>
            <Btn variant="primary" size="sm" className="mt-4" onClick={() => nav("invoice-builder")}><Plus size={13} /> Create Invoice</Btn>
          </div>
        )}

        <div className="px-5 py-3 border-t border-[rgba(17,35,60,0.04)] flex items-center justify-between">
          <p className="text-xs text-gray-400">{filtered.length} invoices</p>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map(p => (
              <button key={p} className="w-7 h-7 text-xs rounded-[6px] font-medium transition-all"
                style={p === 1 ? { backgroundColor: N + "10", color: N } : { color: "#9CA3AF" }}>{p}</button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Invoice Builder ──────────────────────────────────────────

interface InvItem { id: string; desc: string; qty: number; unit: string; price: number; vat: number; }
interface InvState {
  number: string; issueDate: string; dueDate: string;
  from: { name: string; address: string; vat: string; email: string; phone: string; iban: string; };
  to:   { name: string; address: string; vat: string; email: string; };
  items: InvItem[];
  notes: string; accentColor: string; template: string; currency: string;
}

const DEFAULT_INV: InvState = {
  number: "INV-2026-0048", issueDate: "2026-07-07", dueDate: "2026-08-06", currency: "EUR",
  from: { name: "Marie Dubois Design", address: "Rue du Trône 12\n1050 Brussels", vat: "BE0123456789", email: "marie@mariedubois.be", phone: "+32 475 12 34 56", iban: "BE68 5390 0754 7034" },
  to:   { name: "Accenture Belgium SA/NV", address: "Avenue des Arts 56\n1000 Brussels", vat: "BE0418418888", email: "billing@accenture.be" },
  items: [
    { id: "1", desc: "UI/UX Design — Mobile App Redesign",  qty: 12, unit: "h",       price: 110, vat: 21 },
    { id: "2", desc: "Prototype & Interactive User Testing", qty: 4,  unit: "h",       price: 110, vat: 21 },
    { id: "3", desc: "Design System Documentation",         qty: 1,  unit: "forfait",  price: 650, vat: 21 },
  ],
  notes: "Payment via bank transfer within 30 days.\nStructured communication: +++123/456/789+++",
  accentColor: M, template: "minimal",
};

function InvoiceBuilder() {
  const [inv, setInv] = useState<InvState>(DEFAULT_INV);
  const [tab, setTab] = useState("details");

  const set = (path: string, val: unknown) => {
    setInv(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as InvState;
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = val;
      return next;
    });
  };

  const setItem = (id: string, field: keyof InvItem, val: string) => {
    setInv(p => ({ ...p, items: p.items.map(it => it.id === id ? { ...it, [field]: (field === "qty" || field === "price") ? parseFloat(val) || 0 : val } : it) }));
  };

  const addItem = () => setInv(p => ({ ...p, items: [...p.items, { id: String(Date.now()), desc: "", qty: 1, unit: "h", price: 0, vat: 21 }] }));
  const delItem = (id: string) => setInv(p => ({ ...p, items: p.items.filter(it => it.id !== id) }));

  const subtotal = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
  const vatAmt   = inv.items.reduce((s, it) => s + it.qty * it.price * it.vat / 100, 0);
  const total    = subtotal + vatAmt;

  const inputCls = "w-full rounded-[9px] border border-[rgba(17,35,60,0.12)] bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/35 focus:border-[#63BFA8] transition-all";

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Editor */}
      <div className="w-[54%] border-r border-[rgba(17,35,60,0.06)] flex flex-col bg-white">
        <div className="px-5 py-3.5 border-b border-[rgba(17,35,60,0.06)] flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-gray-50 rounded-[10px] p-1">
            {["details", "design", "settings"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-all ${tab === t ? "bg-white shadow-sm" : "text-gray-400"}`}
                style={tab === t ? { color: N } : {}}>
                {t}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" size="sm"><Eye size={12} /> Preview</Btn>
            <Btn variant="secondary" size="sm"><Download size={12} /> PDF</Btn>
            <Btn variant="primary" size="sm"><Send size={12} /> Send</Btn>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === "details" && (<>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice number" value={inv.number} onChange={v => set("number", v)} />
              <Sel label="Status" value="draft" onChange={() => {}} options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "paid", label: "Paid" }]} />
              <Field label="Issue date" value={inv.issueDate} onChange={v => set("issueDate", v)} type="date" />
              <Field label="Due date"   value={inv.dueDate}   onChange={v => set("dueDate", v)}   type="date" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: N }}>Bill To</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company name" value={inv.to.name}    onChange={v => set("to.name", v)}    className="col-span-2" />
                <Field label="VAT number"   value={inv.to.vat}     onChange={v => set("to.vat", v)} />
                <Field label="Email"        value={inv.to.email}   onChange={v => set("to.email", v)} type="email" />
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: N }}>Address</label>
                  <textarea value={inv.to.address} onChange={e => set("to.address", e.target.value)} rows={2}
                    className="w-full rounded-[10px] border border-[rgba(17,35,60,0.12)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/35 focus:border-[#63BFA8] transition-all resize-none" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: N }}>Line Items</p>
              <div className="space-y-2">
                <div className="grid gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide pb-1"
                  style={{ gridTemplateColumns: "1fr 52px 70px 72px 68px 28px" }}>
                  <span>Description</span><span className="text-center">Qty</span><span className="text-center">Unit</span><span className="text-right">Price</span><span className="text-right">Total</span><span />
                </div>
                {inv.items.map(it => (
                  <div key={it.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 52px 70px 72px 68px 28px" }}>
                    <input value={it.desc} onChange={e => setItem(it.id, "desc", e.target.value)} placeholder="Description…" className={inputCls} />
                    <input value={it.qty}  onChange={e => setItem(it.id, "qty",  e.target.value)} type="number" className={`${inputCls} text-center`} />
                    <input value={it.unit} onChange={e => setItem(it.id, "unit", e.target.value)} className={`${inputCls} text-center`} />
                    <input value={it.price} onChange={e => setItem(it.id, "price", e.target.value)} type="number" className={`${inputCls} text-right`} />
                    <p className="text-sm font-semibold text-right pr-1" style={{ color: N }}>€{(it.qty * it.price).toFixed(0)}</p>
                    <button onClick={() => delItem(it.id)} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-red-50 transition-colors">
                      <X size={12} className="text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: M }}>
                <Plus size={14} /> Add line item
              </button>

              <div className="mt-5 pt-4 border-t border-[rgba(17,35,60,0.06)] flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-10 text-gray-400"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
                <div className="flex gap-10 text-gray-400"><span>VAT (21%)</span><span>€{vatAmt.toFixed(2)}</span></div>
                <div className="flex gap-10 font-semibold text-base mt-1" style={{ color: N }}><span>Total EUR</span><span>€{total.toFixed(2)}</span></div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: N }}>Notes & Payment Instructions</label>
              <textarea value={inv.notes} onChange={e => set("notes", e.target.value)} rows={3}
                className="w-full rounded-[10px] border border-[rgba(17,35,60,0.12)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/35 focus:border-[#63BFA8] transition-all resize-none" />
            </div>
          </>)}

          {tab === "design" && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: N }}>Logo</label>
                <div className="border-2 border-dashed border-[rgba(17,35,60,0.12)] rounded-[12px] p-6 text-center hover:border-[#63BFA8] transition-colors cursor-pointer">
                  <Upload size={20} className="mx-auto mb-1.5 text-gray-300" />
                  <p className="text-sm text-gray-400">Upload logo</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: N }}>Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={inv.accentColor} onChange={e => set("accentColor", e.target.value)} className="w-10 h-10 rounded-[8px] cursor-pointer p-0.5 border border-[rgba(17,35,60,0.1)]" />
                  <Field value={inv.accentColor} onChange={v => set("accentColor", v)} className="flex-1" />
                </div>
              </div>
              <Sel label="Template" value={inv.template} onChange={v => set("template", v)} options={[
                { value: "minimal", label: "Minimal" }, { value: "professional", label: "Professional" },
                { value: "corporate", label: "Corporate" }, { value: "modern", label: "Modern" }, { value: "belgian", label: "Belgian Standard" },
              ]} />
              <Sel label="Font" value="inter" onChange={() => {}} options={[
                { value: "inter", label: "Inter" }, { value: "roboto", label: "Roboto" }, { value: "georgia", label: "Georgia" },
              ]} />
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4">
              <Sel label="Currency" value={inv.currency} onChange={v => set("currency", v)} options={[{ value: "EUR", label: "EUR — Euro" }, { value: "USD", label: "USD — Dollar" }]} />
              <Sel label="Default VAT" value="21" onChange={() => {}} options={[{ value: "21", label: "21%" }, { value: "12", label: "12%" }, { value: "6", label: "6%" }, { value: "0", label: "0% — Exempt" }]} />
              <Sel label="Language" value="en" onChange={() => {}} options={[{ value: "nl", label: "Nederlands" }, { value: "fr", label: "Français" }, { value: "en", label: "English" }]} />
              <div className="space-y-3">
                {["Include QR code", "Include payment block", "Include signature line", "Auto-send payment reminder"].map(opt => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked={opt.includes("QR") || opt.includes("payment block")} className="rounded" />
                    <span className="text-sm" style={{ color: N }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Live PDF preview */}
      <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between bg-gray-100">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Live Preview</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">PDF · A4 · Portrait</span>
            <button className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-[6px] bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors font-medium">
              <Download size={10} /> Download PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex items-start justify-center py-8 px-6">
          <div className="w-[500px] bg-white shadow-2xl shadow-black/10 rounded-[3px]" style={{ minHeight: "708px" }}>
            <PDFPreview inv={inv} subtotal={subtotal} vatAmt={vatAmt} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PDFPreview({ inv, subtotal, vatAmt, total }: { inv: InvState; subtotal: number; vatAmt: number; total: number }) {
  const c = inv.accentColor;
  return (
    <div className="p-9" style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="w-12 h-9 rounded-[6px] flex items-center justify-center text-white text-xs font-bold mb-2" style={{ backgroundColor: c }}>
            {inv.from.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
          </div>
          <p className="font-semibold text-[13px]" style={{ color: N }}>{inv.from.name}</p>
          <p className="text-gray-400 text-[10px] mt-0.5 whitespace-pre-line leading-snug">{inv.from.address}</p>
          <p className="text-gray-400 text-[10px]">{inv.from.vat}</p>
          <p className="text-gray-400 text-[10px]">{inv.from.email}</p>
        </div>
        <div className="text-right">
          <h1 className="text-[22px] font-black tracking-tight mb-0.5" style={{ color: N }}>INVOICE</h1>
          <p className="font-bold text-[13px]" style={{ color: c }}>{inv.number}</p>
          <div className="mt-2.5 space-y-0.5">
            <div className="flex gap-4 text-[10px] justify-end">
              <span className="text-gray-400">Issue date</span>
              <span className="font-semibold" style={{ color: N }}>{inv.issueDate}</span>
            </div>
            <div className="flex gap-4 text-[10px] justify-end">
              <span className="text-gray-400">Due date</span>
              <span className="font-semibold text-red-500">{inv.dueDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[2px] rounded-full mb-6" style={{ backgroundColor: c }} />

      {/* Bill to */}
      <div className="mb-6">
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: c }}>Bill To</p>
        <p className="font-semibold text-[12px]" style={{ color: N }}>{inv.to.name}</p>
        <p className="text-gray-400 text-[10px] whitespace-pre-line leading-snug">{inv.to.address}</p>
        {inv.to.vat && <p className="text-gray-400 text-[10px]">VAT: {inv.to.vat}</p>}
        <p className="text-gray-400 text-[10px]">{inv.to.email}</p>
      </div>

      {/* Items */}
      <table className="w-full mb-5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: c + "14" }}>
            {["Description", "Qty", "Unit Price", "VAT", "Total"].map((h, i) => (
              <th key={h} className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest ${i === 0 ? "text-left" : i >= 2 ? "text-right" : "text-center"}`} style={{ color: c }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id} style={{ backgroundColor: i % 2 ? "rgba(0,0,0,0.018)" : "transparent" }}>
              <td className="px-3 py-2.5 text-[11px] text-gray-700">{it.desc || "—"}</td>
              <td className="px-3 py-2.5 text-[11px] text-center text-gray-500">{it.qty} {it.unit}</td>
              <td className="px-3 py-2.5 text-[11px] text-right text-gray-500">€{it.price.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-[11px] text-right text-gray-400">{it.vat}%</td>
              <td className="px-3 py-2.5 text-[11px] text-right font-semibold" style={{ color: N }}>€{(it.qty * it.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-48 space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-[10px] text-gray-400"><span>VAT 21%</span><span>€{vatAmt.toFixed(2)}</span></div>
          <div className="border-t border-gray-100 my-1.5" />
          <div className="flex justify-between font-black text-[14px]" style={{ color: N }}><span>Total EUR</span><span>€{total.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Payment block */}
      <div className="p-4 rounded-[8px] mb-5" style={{ backgroundColor: c + "11", borderLeft: `3px solid ${c}` }}>
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: c }}>Payment Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
          {[
            ["IBAN",      inv.from.iban],
            ["Reference", "+++123/456/789+++"],
            ["Amount",    `€${total.toFixed(2)}`],
            ["Due by",    inv.dueDate],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-400">{k}:</span>
              <span className="font-semibold" style={{ color: k === "Due by" ? "#EF4444" : N }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div className="mb-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Notes</p>
          <p className="text-[10px] text-gray-500 whitespace-pre-line leading-relaxed">{inv.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 flex justify-between text-[9px] text-gray-300">
        <span>{inv.from.name} · {inv.from.vat}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ─── Customers ───────────────────────────────────────────────

function Customers({ nav }: { nav: (p: string) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const list = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase()));
  const cust = sel ? customers.find(c => c.id === sel) : null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[340px] flex-shrink-0 border-r border-[rgba(17,35,60,0.06)] flex flex-col bg-white">
        <div className="p-4 border-b border-[rgba(17,35,60,0.06)] flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search customers…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-[8px] border border-[rgba(17,35,60,0.08)] focus:outline-none focus:ring-2 focus:ring-[#63BFA8]/30 focus:border-[#63BFA8] transition-all" />
          </div>
          <Btn variant="primary" size="sm"><Plus size={13} /> New</Btn>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map(c => (
            <button key={c.id} onClick={() => setSel(c.id === sel ? null : c.id)}
              className={`w-full px-4 py-4 border-b border-[rgba(17,35,60,0.04)] text-left transition-all hover:bg-gray-50/60 ${sel === c.id ? "bg-[#EBF7F4]" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: N }}>
                  {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: N }}>{c.name}</p>
                    <Pill v={c.status === "overdue" ? "overdue" : "active"}>{c.status === "overdue" ? "Overdue" : "Active"}</Pill>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: N }}>€{c.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{c.invoices} inv.</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {cust ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ backgroundColor: N }}>
              {cust.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold" style={{ color: N }}>{cust.name}</h2>
              <p className="text-sm text-gray-400">{cust.vat}</p>
            </div>
            <Btn variant="primary" size="sm" onClick={() => nav("invoice-builder")}><Plus size={13} /> New Invoice</Btn>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue",   value: `€${cust.revenue.toLocaleString()}`,     color: M },
              { label: "Outstanding",     value: `€${cust.outstanding.toLocaleString()}`, color: cust.outstanding > 0 ? "#F59E0B" : M },
              { label: "Invoices Issued", value: cust.invoices,                           color: N },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <p className="text-sm font-semibold mb-4" style={{ color: N }}>Contact Details</p>
            <div className="space-y-3">
              {[
                { icon: Mail, label: cust.email },
                { icon: Hash, label: cust.vat },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <Icon size={13} className="text-gray-400" />
                  <span className="text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="px-5 py-4 border-b border-[rgba(17,35,60,0.04)]">
              <p className="text-sm font-semibold" style={{ color: N }}>Invoice History</p>
            </div>
            {allInvoices.filter(i => i.client.includes(cust.name.split(" ")[0])).map((inv, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4 border-b border-[rgba(17,35,60,0.03)] last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: N }}>{inv.id}</p>
                  <p className="text-xs text-gray-400">{inv.date}</p>
                </div>
                <Pill v={inv.status}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</Pill>
                <p className="text-sm font-semibold" style={{ color: N }}>€{inv.amount.toLocaleString()}</p>
              </div>
            ))}
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">Select a customer to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports ─────────────────────────────────────────────────

function Reports() {
  const totalRev = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalVat = monthlyData.reduce((s, m) => s + m.vat, 0);
  const PIE_COLORS = [N, M, "#6366F1", "#F59E0B", "#EC4899"];

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "YTD Revenue",   value: `€${totalRev.toLocaleString()}`,            tag: "+24% vs 2025" },
          { label: "Invoiced",      value: `€${Math.round(totalRev * 1.04).toLocaleString()}`, tag: "52 invoices" },
          { label: "VAT Collected", value: `€${totalVat.toLocaleString()}`,            tag: "Q2 due Jul 20" },
          { label: "Avg Invoice",   value: `€${Math.round(totalRev / 52).toLocaleString()}`,   tag: "↑ €180 vs 2025" },
        ].map(k => (
          <Card key={k.label} className="p-5">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: N }}>{k.value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: M }}>{k.tag}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <p className="text-sm font-semibold mb-1" style={{ color: N }}>Monthly Revenue 2026</p>
          <p className="text-xs text-gray-400 mb-4">Revenue vs VAT collected</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,35,60,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`€${v.toLocaleString()}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="revenue" fill={N} radius={[4, 4, 0, 0]} />
              <Bar dataKey="vat"     fill={M} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold mb-1" style={{ color: N }}>Revenue by Customer</p>
          <p className="text-xs text-gray-400 mb-4">Top 5 clients YTD</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="45%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`€${v.toLocaleString()}`, ""]} />
              <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-[rgba(17,35,60,0.04)] flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: N }}>VAT Summary — 2026</p>
          <Btn variant="secondary" size="sm"><Download size={12} /> Export XML</Btn>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 border-b border-[rgba(17,35,60,0.04)]">
              {["Quarter","Revenue","VAT Collected","VAT Paid","Balance Due","Status"].map(h => (
                <th key={h} className={`px-5 py-3 font-semibold uppercase tracking-wide ${h === "Quarter" || h === "Status" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { q: "Q1 2026", rev: 27400, coll: 5754, paid: 980,  status: "filed" },
              { q: "Q2 2026", rev: 36600, coll: 7686, paid: 1100, status: "due"   },
              { q: "Q3 2026", rev: 9400,  coll: 1974, paid: 0,    status: "pending" },
            ].map(row => (
              <tr key={row.q} className="border-b border-[rgba(17,35,60,0.03)] hover:bg-gray-50/50">
                <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: N }}>{row.q}</td>
                <td className="px-5 py-3.5 text-sm text-right text-gray-600">€{row.rev.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-sm text-right text-gray-600">€{row.coll.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-sm text-right text-gray-600">€{row.paid.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-sm text-right font-semibold" style={{ color: N }}>€{(row.coll - row.paid).toLocaleString()}</td>
                <td className="px-5 py-3.5"><Pill v={row.status}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────

function SettingsPage() {
  const [tab, setTab] = useState("general");
  const tabs = [
    { id: "general",   label: "General"   },
    { id: "business",  label: "Business"  },
    { id: "invoices",  label: "Invoices"  },
    { id: "payments",  label: "Payments"  },
    { id: "taxes",     label: "Taxes"     },
    { id: "desktop",   label: "Desktop"   },
    { id: "security",  label: "Security"  },
    { id: "backups",   label: "Backups"   },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-48 flex-shrink-0 border-r border-[rgba(17,35,60,0.06)] p-3 bg-white overflow-y-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-full text-left px-3 py-2.5 rounded-[8px] text-sm transition-all mb-0.5 font-medium ${tab === t.id ? "" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
            style={tab === t.id ? { backgroundColor: M + "15", color: N } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[560px] space-y-6">
          {tab === "general" && (<>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: N }}>General Settings</h2>
              <p className="text-sm text-gray-400">Workspace preferences and display options.</p>
            </div>
            <Sel label="Language" value="en" onChange={() => {}} options={[{ value: "nl", label: "Nederlands" }, { value: "fr", label: "Français" }, { value: "en", label: "English" }]} />
            <Sel label="Date format" value="dmy" onChange={() => {}} options={[{ value: "dmy", label: "DD/MM/YYYY" }, { value: "mdy", label: "MM/DD/YYYY" }, { value: "ymd", label: "YYYY-MM-DD" }]} />
            <Sel label="Number format" value="be" onChange={() => {}} options={[{ value: "be", label: "1.234,56 (Belgian)" }, { value: "us", label: "1,234.56 (US)" }]} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: N }}>Appearance</p>
              <div className="flex gap-2">
                {["Light", "Dark", "System"].map((m, i) => (
                  <button key={m} className={`flex-1 py-3 rounded-[10px] text-sm font-medium border-2 transition-all ${i === 0 ? "" : "border-[rgba(17,35,60,0.08)] text-gray-400"}`}
                    style={i === 0 ? { borderColor: M, color: N } : {}}>{m}</button>
                ))}
              </div>
            </div>
            <Btn variant="primary" size="md">Save Preferences</Btn>
          </>)}

          {tab === "business" && (<>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: N }}>Business Profile</h2>
              <p className="text-sm text-gray-400">This information appears on all your invoices and documents.</p>
            </div>
            <Field label="Business name"  value="Marie Dubois Design" onChange={() => {}} />
            <Field label="VAT number"     value="BE0123456789"        onChange={() => {}} />
            <Field label="Company number" value="0123.456.789"        onChange={() => {}} />
            <Field label="Email"          value="marie@mariedubois.be" onChange={() => {}} type="email" />
            <Field label="Phone"          value="+32 475 12 34 56"   onChange={() => {}} />
            <Field label="IBAN"           value="BE68 5390 0754 7034" onChange={() => {}} />
            <Btn variant="primary" size="md">Save Changes</Btn>
          </>)}

          {tab === "desktop" && (<>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: N }}>Desktop Application</h2>
              <p className="text-sm text-gray-400">Manage your Windows desktop installation, backups, and license.</p>
            </div>

            <Card className="p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: N }}>System Status</p>
              <div className="space-y-2.5">
                {[
                  { label: "Connection",    value: "Online",                      ok: true },
                  { label: "Database",      value: "Connected · Local SQLite",    ok: true },
                  { label: "Last sync",     value: "2 minutes ago",               ok: true },
                  { label: "App version",   value: "BillGen 1.4.2 (Windows)",     ok: null },
                  { label: "License",       value: "Professional · Active",       ok: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-[rgba(17,35,60,0.04)] last:border-0">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className={`text-sm font-medium ${r.ok === true ? "text-green-500" : r.ok === false ? "text-red-500" : "text-gray-500"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-sm font-semibold mb-4" style={{ color: N }}>Database & Backups</p>
              <div className="p-3 rounded-[8px] bg-gray-50 text-[11px] mb-4">
                <p className="text-gray-400 text-xs mb-0.5">Database location</p>
                <p className="font-mono" style={{ color: N }}>C:\Users\Marie\AppData\Local\BillGen\data.db</p>
              </div>
              <div className="flex gap-3">
                <Btn variant="secondary" size="md" className="flex-1"><Database size={13} /> Backup Now</Btn>
                <Btn variant="secondary" size="md" className="flex-1"><RefreshCw size={13} /> Restore…</Btn>
              </div>
              <p className="text-xs text-gray-400 mt-3">Last backup: Today at 09:14 AM</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: N }}>Updates</p>
                  <p className="text-xs text-gray-400 mt-0.5">BillGen is up to date · v1.4.2</p>
                </div>
                <Btn variant="secondary" size="sm"><RefreshCw size={12} /> Check</Btn>
              </div>
            </Card>
          </>)}

          {!["general","business","desktop"].includes(tab) && (
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: N }}>{tabs.find(t => t.id === tab)?.label} Settings</h2>
              <p className="text-sm text-gray-400 mb-8">Configure your {tab} preferences.</p>
              <div className="py-14 text-center border-2 border-dashed border-[rgba(17,35,60,0.08)] rounded-[14px]">
                <Settings size={28} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">These settings were configured during setup</p>
                <Btn variant="secondary" size="sm" className="mt-4">Edit Settings</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main app shell ───────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  dashboard:       "Dashboard",
  invoices:        "Invoices",
  "credit-notes":  "Credit Notes",
  customers:       "Customers",
  products:        "Products & Services",
  payments:        "Payments",
  reports:         "Reports",
  imports:         "Imports",
  settings:        "Settings",
  help:            "Help & Support",
  "invoice-builder": "New Invoice",
};

function MainApp() {
  const [page, setPage] = useState("dashboard");

  const actions = page === "dashboard"
    ? <Btn variant="primary" size="sm" onClick={() => setPage("invoice-builder")}><Plus size={14} /> New Invoice</Btn>
    : page === "customers"
    ? <Btn variant="primary" size="sm"><Plus size={14} /> New Customer</Btn>
    : null;

  const content = () => {
    switch (page) {
      case "dashboard":        return <Dashboard nav={setPage} />;
      case "invoices":         return <InvoiceList nav={setPage} />;
      case "invoice-builder":  return <InvoiceBuilder />;
      case "customers":        return <Customers nav={setPage} />;
      case "reports":          return <Reports />;
      case "settings":         return <SettingsPage />;
      case "products":         return <EmptyState icon={Package}    title="No products yet"         desc="Add your services and products to quickly fill invoice line items."   action="Add Product"       onAction={() => {}} />;
      case "payments":         return <EmptyState icon={CreditCard} title="No payments recorded"    desc="Mark invoices as paid or record manual payments here."               action="Record Payment"    onAction={() => {}} />;
      case "credit-notes":     return <EmptyState icon={FileMinus}  title="No credit notes"         desc="Issue a credit note to correct or cancel a previously sent invoice." action="Create Credit Note" onAction={() => setPage("invoice-builder")} />;
      case "imports":          return <EmptyState icon={FolderOpen} title="Import your data"        desc="Import invoices, customers, and products from CSV or another system." action="Start Import"      onAction={() => {}} />;
      case "help":             return <EmptyState icon={HelpCircle} title="How can we help?"        desc="Browse documentation, video guides, or contact our Belgian support team." action="Open Help Center" onAction={() => {}} />;
      default:                 return null;
    }
  };

  const isFlush = ["invoice-builder", "customers", "settings"].includes(page);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F4F0]">
      <Sidebar page={page} nav={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={PAGE_LABELS[page] ?? ""} actions={actions} />
        <div className={`flex-1 overflow-hidden ${isFlush ? "" : "overflow-y-auto"}`}>
          {content()}
        </div>
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────

interface AppState { view: "login" | "wizard" | "app"; }

export default function App() {
  const [state, setState] = useState<AppState>({ view: "login" });
  const [biz, setBiz] = useState<BizData>({
    name: "Marie Dubois Design", vat: "BE0123456789", email: "marie@mariedubois.be",
    phone: "+32 475 12 34 56", address: "Rue du Trône 12\n1050 Brussels",
    iban: "BE68 5390 0754 7034", accentColor: M, template: "minimal",
    prefix: "INV-2026-", startNum: 48,
  });

  if (state.view === "login")  return <Login  onLogin={() => setState({ view: "wizard" })} />;
  if (state.view === "wizard") return <Wizard biz={biz} setBiz={setBiz} onDone={() => setState({ view: "app" })} />;
  return <MainApp />;
}
