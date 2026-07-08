import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  ChevronDown,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Building2,
  Bell,
  Search,
  MoreHorizontal,
  CircleDollarSign,
  Receipt,
  ShieldCheck,
  Banknote,
  ChevronRight,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const companies = [
  { id: "C001", name: "Nexora SAS", sector: "Tech" },
  { id: "C002", name: "Lumière & Co.", sector: "Retail" },
  { id: "C003", name: "Atlantik Group", sector: "Finance" },
];

const revenueData = [
  { month: "Jan", revenue: 38200, tva: 7640, invoices: 12 },
  { month: "Feb", revenue: 42500, tva: 8500, invoices: 15 },
  { month: "Mar", revenue: 51000, tva: 10200, invoices: 18 },
  { month: "Apr", revenue: 47300, tva: 9460, invoices: 14 },
  { month: "May", revenue: 63800, tva: 12760, invoices: 22 },
  { month: "Jun", revenue: 58100, tva: 11620, invoices: 19 },
  { month: "Jul", revenue: 71400, tva: 14280, invoices: 25 },
];

const tvaBreakdown = [
  { name: "TVA 20%", value: 8960, color: "#6366F1" },
  { name: "TVA 10%", value: 3420, color: "#10B981" },
  { name: "TVA 5.5%", value: 1640, color: "#F59E0B" },
  { name: "TVA 0%", value: 260, color: "#3B82F6" },
];

const recentBills = [
  { id: "INV-2407-089", client: "TechVision SARL", amount: 12400, tva: 2480, status: "paid", date: "2024-07-04", due: "2024-07-18" },
  { id: "INV-2407-088", client: "Maison Dubois", amount: 3750, tva: 750, status: "pending", date: "2024-07-03", due: "2024-07-17" },
  { id: "INV-2407-087", client: "Groupe Stellaire", amount: 28900, tva: 5780, status: "overdue", date: "2024-06-28", due: "2024-07-12" },
  { id: "INV-2407-086", client: "Novalis Labs", amount: 8200, tva: 1640, status: "paid", date: "2024-06-27", due: "2024-07-11" },
  { id: "INV-2407-085", client: "Atelier Moreau", amount: 5600, tva: 560, status: "draft", date: "2024-06-25", due: "2024-07-09" },
  { id: "INV-2407-084", client: "Crédit Azur", amount: 18750, tva: 3750, status: "pending", date: "2024-06-24", due: "2024-07-08" },
];

const topClients = [
  { name: "Groupe Stellaire", total: 124500, invoices: 8, growth: 14.2 },
  { name: "TechVision SARL", total: 98200, invoices: 12, growth: 8.7 },
  { name: "Crédit Azur", total: 76400, invoices: 6, growth: -2.1 },
  { name: "Novalis Labs", total: 54100, invoices: 9, growth: 31.5 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const statusConfig: Record<string, { label: string; cls: string }> = {
  paid:    { label: "Payée",    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  pending: { label: "En attente", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  overdue: { label: "En retard", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  draft:   { label: "Brouillon", cls: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, trend, trendVal, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string; trend: "up" | "down" | "neutral";
  trendVal: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 hover:border-white/12 transition-colors group">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <div className="font-mono text-2xl font-semibold text-foreground tracking-tight leading-none">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1.5 font-mono">{sub}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        {trend === "up" ? (
          <TrendingUp size={12} className="text-emerald-400" />
        ) : trend === "down" ? (
          <TrendingDown size={12} className="text-red-400" />
        ) : null}
        <span className={`text-xs font-mono font-medium ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
          {trendVal}
        </span>
        <span className="text-xs text-muted-foreground">vs mois précédent</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-xl text-xs">
      <div className="text-muted-foreground mb-1.5 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-semibold text-foreground">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

type NavItem = "dashboard" | "clients" | "products" | "bills";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [activeCompany, setActiveCompany] = useState(companies[0]);
  const [companyOpen, setCompanyOpen] = useState(false);

  const navItems: { id: NavItem; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "clients",   label: "Clients",          icon: Users },
    { id: "products",  label: "Produits",          icon: Package },
    { id: "bills",     label: "Factures",          icon: FileText },
  ];

  const currentMonth = revenueData[revenueData.length - 1];
  const prevMonth    = revenueData[revenueData.length - 2];
  const revDiff      = ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
  const tvaDiff      = ((currentMonth.tva - prevMonth.tva) / prevMonth.tva) * 100;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Receipt size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground tracking-tight">Facturo</span>
          </div>
        </div>

        {/* Company Selector */}
        <div className="px-3 pt-4">
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors border border-border"
          >
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={11} className="text-primary" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{activeCompany.name}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{activeCompany.id}</div>
            </div>
            <ChevronDown size={12} className={`text-muted-foreground transition-transform flex-shrink-0 ${companyOpen ? "rotate-180" : ""}`} />
          </button>

          {companyOpen && (
            <div className="mt-1 rounded-md border border-border bg-card overflow-hidden shadow-xl">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCompany(c); setCompanyOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary transition-colors ${c.id === activeCompany.id ? "bg-secondary" : ""}`}
                >
                  <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Building2 size={9} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{c.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{c.id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-6 flex flex-col gap-0.5">
          <div className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase px-3 mb-2">Navigation</div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                activeNav === id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {activeNav === id && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-sidebar-border">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-primary hover:bg-primary/90 transition-colors text-primary-foreground text-sm font-medium">
            <Plus size={14} />
            Nouvelle facture
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Tableau de bord</h1>
            <p className="text-xs text-muted-foreground font-mono">Juillet 2024 · {activeCompany.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Search size={12} />
              <span>Rechercher…</span>
              <kbd className="text-[9px] font-mono bg-muted px-1 py-0.5 rounded border border-border">⌘K</kbd>
            </button>
            <button className="relative w-8 h-8 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
              JD
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Chiffre d'affaires"
              value={fmt(currentMonth.revenue)}
              sub={`${currentMonth.invoices} factures ce mois`}
              trend={revDiff > 0 ? "up" : "down"}
              trendVal={`${revDiff > 0 ? "+" : ""}${revDiff.toFixed(1)}%`}
              icon={CircleDollarSign}
              accent="bg-primary/15 text-primary"
            />
            <KpiCard
              label="TVA collectée"
              value={fmt(currentMonth.tva)}
              sub="À reverser à l'État"
              trend={tvaDiff > 0 ? "up" : "down"}
              trendVal={`${tvaDiff > 0 ? "+" : ""}${tvaDiff.toFixed(1)}%`}
              icon={ShieldCheck}
              accent="bg-amber-400/15 text-amber-400"
            />
            <KpiCard
              label="Factures totales"
              value="89"
              sub="25 en attente · 4 en retard"
              trend="up"
              trendVal="+12.7%"
              icon={FileText}
              accent="bg-emerald-400/15 text-emerald-400"
            />
            <KpiCard
              label="Montant à encaisser"
              value={fmt(67400)}
              sub="Échéance moyenne 14 j"
              trend="down"
              trendVal="-5.3%"
              icon={Banknote}
              accent="bg-blue-400/15 text-blue-400"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">

            {/* Revenue Area Chart */}
            <div className="col-span-2 bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Revenus & TVA</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Évolution sur 7 mois</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
                    <span className="text-muted-foreground">Revenus HT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-amber-400/60" />
                    <span className="text-muted-foreground">TVA</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTva" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "#6B7591", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7591", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenus HT" stroke="#6366F1" strokeWidth={2} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 4, fill: "#6366F1" }} />
                  <Area type="monotone" dataKey="tva" name="TVA" stroke="#F59E0B" strokeWidth={2} fill="url(#colorTva)" dot={false} activeDot={{ r: 4, fill: "#F59E0B" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* TVA Breakdown Pie */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Répartition TVA</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Juillet 2024</p>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={tvaBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                    {tvaBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "#111627", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "6px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {tvaBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-foreground">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-4">

            {/* Recent Bills */}
            <div className="col-span-2 bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Factures récentes</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">6 dernières émissions</p>
                </div>
                <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  Voir tout <ArrowUpRight size={11} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium font-mono tracking-wide">N° Facture</th>
                      <th className="text-left px-3 py-3 text-muted-foreground font-medium">Client</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-medium font-mono">Montant HT</th>
                      <th className="text-right px-3 py-3 text-muted-foreground font-medium font-mono">TVA</th>
                      <th className="text-left px-3 py-3 text-muted-foreground font-medium">Échéance</th>
                      <th className="text-left px-3 py-3 text-muted-foreground font-medium">Statut</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.map((bill) => {
                      const s = statusConfig[bill.status];
                      return (
                        <tr key={bill.id} className="border-b border-border/60 hover:bg-secondary/40 transition-colors group">
                          <td className="px-5 py-3 font-mono text-foreground font-medium">{bill.id}</td>
                          <td className="px-3 py-3 text-foreground">{bill.client}</td>
                          <td className="px-3 py-3 text-right font-mono text-foreground font-medium">{fmt(bill.amount)}</td>
                          <td className="px-3 py-3 text-right font-mono text-amber-400">{fmt(bill.tva)}</td>
                          <td className="px-3 py-3 font-mono text-muted-foreground">{bill.due}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium ${s.cls}`}>
                              {s.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                              <MoreHorizontal size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Top clients</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires</p>
                </div>
              </div>
              <div className="px-5 py-3 space-y-4">
                {topClients.map((client, i) => (
                  <div key={client.name} className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center text-xs font-mono font-semibold text-muted-foreground flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{client.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{client.invoices} factures</div>
                      <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${(client.total / 124500) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs font-mono font-semibold text-foreground">{fmt(client.total)}</div>
                      <div className={`text-[10px] font-mono mt-0.5 flex items-center justify-end gap-0.5 ${client.growth > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {client.growth > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {client.growth > 0 ? "+" : ""}{client.growth}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly comparison bar */}
              <div className="px-5 pb-4 pt-2 border-t border-border mt-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Mois précédent vs actuel
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={revenueData.slice(-2)} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barGap={6}>
                    <XAxis dataKey="month" tick={{ fill: "#6B7591", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenus HT" fill="#6366F1" radius={[3, 3, 0, 0]} opacity={0.85} />
                    <Bar dataKey="tva" name="TVA" fill="#F59E0B" radius={[3, 3, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
