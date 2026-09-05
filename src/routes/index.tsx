import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Eye,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as api from "@/lib/api";
import type { BackendStock, BackendUser } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketPulse — Your watchlist, made meaningful" },
      { name: "description", content: "See the stock moves, news, and signals that matter since your last MarketPulse visit." },
    ],
  }),
  component: MarketPulse,
});

type Bucket = "attention" | "drifted" | "new" | "quiet";
type Stock = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  summary: string;
  score: number;
  stale?: boolean;
  bucket: Bucket;
  direction: "up" | "down" | "flat";
};

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.", MSFT: "Microsoft Corporation", NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.", AMZN: "Amazon.com, Inc.", GOOGL: "Alphabet Inc.",
  META: "Meta Platforms, Inc.", V: "Visa Inc.", CRWD: "CrowdStrike Holdings",
};

function mapStock(s: BackendStock): Stock {
  const pct = s.priceChangePct ?? 0;
  const direction: Stock["direction"] = s.priceChangePct === undefined ? "flat" : pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const bucket: Bucket = s.bucket === "loading" ? "new" : s.bucket;
  return {
    symbol: s.symbol,
    name: COMPANY_NAMES[s.symbol] || s.symbol,
    price: s.price !== undefined ? `$${s.price.toFixed(2)}` : "—",
    change: s.priceChangePct !== undefined ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%` : "—",
    summary: s.summary,
    score: s.score,
    stale: s.stale,
    bucket,
    direction,
  };
}

const bucketMeta: Record<Bucket, { label: string; description: string; color: string; icon: string }> = {
  attention: { label: "Needs attention", description: "Big moves or fresh signals", color: "attention", icon: "!" },
  drifted: { label: "Drifted", description: "Noticeable, not urgent", color: "drift", icon: "↗" },
  new: { label: "New", description: "Waiting for a baseline", color: "new", icon: "＋" },
  quiet: { label: "Quiet", description: "Nothing meaningful changed", color: "quiet", icon: "—" },
};

function MarketPulse() {
  const [user, setUser] = useState<BackendUser | null>(() => api.loadSession());
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState("");
  const [quietOpen, setQuietOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const changes = await api.getChanges();
      setStocks(changes.map(mapStock));
      setLastUpdated("just now");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const visibleStocks = useMemo(() => stocks.filter((s) => s.bucket !== "quiet" || quietOpen), [stocks, quietOpen]);
  const counts = useMemo(() => ({
    attention: stocks.filter((s) => s.bucket === "attention").length,
    drifted: stocks.filter((s) => s.bucket === "drifted").length,
    new: stocks.filter((s) => s.bucket === "new").length,
    quiet: stocks.filter((s) => s.bucket === "quiet").length,
  }), [stocks]);

  const refresh = () => loadDashboard();

  const handleMarkAllSeen = async () => {
    try {
      await api.markAllSeen();
      flash("Everything marked as seen");
      setQuietOpen(true);
      await loadDashboard();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleAddStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return;
    try {
      await api.addSymbol(cleanSymbol);
      setSymbol("");
      flash(`${cleanSymbol} added to your watchlist`);
      await loadDashboard();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to add symbol");
    }
  };

  const handleSeen = async (stock: Stock) => {
    try {
      await api.markSeen(stock.symbol);
      flash(`${stock.symbol} marked as seen`);
      await loadDashboard();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const handleRemove = async (stock: Stock) => {
    try {
      await api.removeSymbol(stock.symbol);
      await loadDashboard();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const handleLogout = () => {
    api.clearSession();
    setUser(null);
    setStocks([]);
  };

  if (!user) {
    return <AuthScreen onAuthed={(u) => setUser(u)} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><TrendingUp className="size-5" strokeWidth={2.5} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="truncate text-base font-bold tracking-tight">MarketPulse</span><span className="hidden rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline">Beta</span></div>
              <p className="hidden text-[11px] text-muted-foreground sm:block">Your watchlist, made meaningful.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 border-r border-border pr-4 text-right sm:flex"><p className="text-xs font-medium">Welcome back, {user.name}</p><div className="grid size-7 place-items-center rounded-full border border-border bg-surface text-muted-foreground"><UserRound className="size-3.5" /></div></div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={refresh} aria-label="Refresh watchlist"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button>
            <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" onClick={handleMarkAllSeen}><Check className="size-3.5" /> Mark all seen</Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={handleLogout} aria-label="Log out"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-7 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:py-9">
        <section className="min-w-0">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-3.5" /> Market check-in</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Here's what changed.</h1><p className="mt-2 text-sm text-muted-foreground">Your watchlist since you last checked in</p></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" /> {lastUpdated ? `Updated ${lastUpdated}` : loading ? "Loading…" : ""}</div>
          </div>

          <form onSubmit={handleAddStock} className="mb-8 flex max-w-2xl gap-2">
            <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Add a stock by symbol" aria-label="Stock symbol" className="h-11 border-border bg-surface pl-10 font-mono uppercase placeholder:font-sans placeholder:normal-case" /></div>
            <Button type="submit" className="h-11 px-4"><Plus className="size-4" /> <span className="hidden sm:inline">Add stock</span><span className="sm:hidden">Add</span></Button>
          </form>

          {stocks.length === 0 && !loading ? (
            <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Your watchlist is empty — add a symbol above to get started.</div>
          ) : (
            <div className="space-y-7">
              {(["attention", "drifted", "new"] as Bucket[]).map((bucket) => (
                <BucketSection key={bucket} bucket={bucket} stocks={visibleStocks.filter((s) => s.bucket === bucket)} onSeen={handleSeen} onRemove={handleRemove} />
              ))}
              <section className="border-t border-border pt-5">
                <Button variant="ghost" className="group flex h-auto w-full justify-between px-0 text-left hover:bg-transparent" onClick={() => setQuietOpen((open) => !open)} aria-expanded={quietOpen}>
                  <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full border border-quiet/40 bg-quiet/10 text-xs font-semibold text-quiet">—</span><span><span className="block text-sm font-semibold">Quiet <span className="ml-1 text-xs font-normal text-muted-foreground">{counts.quiet}</span></span><span className="block text-xs text-muted-foreground">Nothing meaningful changed</span></span></span>
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">{quietOpen ? "Collapse" : "Show quiet stocks"}{quietOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
                </Button>
                {quietOpen && <div className="mt-4 space-y-2">{visibleStocks.filter((s) => s.bucket === "quiet").map((s) => <StockRow key={s.symbol} stock={s} onSeen={() => handleSeen(s)} onRemove={() => handleRemove(s)} />)}</div>}
              </section>
            </div>
          )}
        </section>

        <aside className="space-y-5 lg:pt-[76px]">
          <div className="border-y border-border py-5"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Watchlist pulse</p><div className="mb-5 flex items-end justify-between"><span className="text-4xl font-semibold tabular-nums">{stocks.length}</span><span className="pb-1 text-sm text-muted-foreground">stocks tracked</span></div><div className="space-y-3">{(["attention", "drifted", "new", "quiet"] as Bucket[]).map((bucket) => <div key={bucket} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted-foreground"><span className={`size-2 rounded-full bg-${bucketMeta[bucket].color}`} />{bucketMeta[bucket].label}</span><span className="font-mono text-xs tabular-nums text-foreground">{counts[bucket]}</span></div>)}</div></div>
          <div className="border border-border bg-surface p-4"><div className="mb-3 flex items-center gap-2"><Bell className="size-4 text-primary" /><span className="text-sm font-semibold">Your signal settings</span></div><p className="text-xs leading-5 text-muted-foreground">We flag a stock when its move is unusual for its history, or when a meaningful news event lands.</p></div>
          <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CircleHelp className="mt-0.5 size-3.5 shrink-0" /> Prices are delayed up to a few minutes. Signals are for awareness, not financial advice.</div>
        </aside>
      </div>
      {notice && <div className="fixed bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 border border-primary/30 bg-surface-raised px-4 py-2.5 text-sm shadow-lg"><Check className="size-4 text-primary" />{notice}</div>}
    </main>
  );
}

function BucketSection({ bucket, stocks, onSeen, onRemove }: { bucket: Bucket; stocks: Stock[]; onSeen: (stock: Stock) => void; onRemove: (stock: Stock) => void }) {
  const meta = bucketMeta[bucket];
  return <section><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-3"><span className={`grid size-7 place-items-center rounded-full border border-${meta.color}/40 bg-${meta.color}/10 text-xs font-semibold text-${meta.color}`}>{meta.icon}</span><div><h2 className="text-sm font-semibold">{meta.label} <span className="ml-1 text-xs font-normal text-muted-foreground">{stocks.length}</span></h2><p className="text-xs text-muted-foreground">{meta.description}</p></div></div>{bucket === "attention" && stocks.length > 0 && <span className="hidden items-center gap-1.5 text-[11px] text-attention sm:flex"><span className="size-1.5 rounded-full bg-attention" /> Review these first</span>}</div>{stocks.length > 0 ? <div className="space-y-2">{stocks.map((stock) => <StockRow key={stock.symbol} stock={stock} onSeen={() => onSeen(stock)} onRemove={() => onRemove(stock)} />)}</div> : <div className="border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">Nothing here right now.</div>}</section>;
}

function StockRow({ stock, onSeen, onRemove }: { stock: Stock; onSeen: () => void; onRemove: () => void }) {
  const color = bucketMeta[stock.bucket].color;
  return <article className={`group grid gap-3 border border-border border-l-2 border-l-${color} bg-surface px-3 py-3 transition-colors hover:bg-surface-raised sm:grid-cols-[minmax(120px,0.75fr)_minmax(130px,0.8fr)_minmax(220px,2fr)_auto] sm:items-center sm:gap-4 sm:px-4`}>
    <div className="flex min-w-0 items-center gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-[11px] font-bold text-secondary-foreground">{stock.symbol.slice(0, 1)}</div><div className="min-w-0"><p className="font-mono text-sm font-semibold tracking-tight text-foreground">{stock.symbol}</p><p className="truncate text-[11px] text-muted-foreground">{stock.name}</p></div></div>
    <div className="flex items-baseline gap-2 sm:block"><p className="font-mono text-base font-semibold tabular-nums text-foreground">{stock.price}</p><p className={`flex items-center gap-0.5 font-mono text-xs tabular-nums ${stock.direction === "down" ? "text-attention" : stock.direction === "up" ? "text-success" : "text-muted-foreground"}`}>{stock.direction === "down" ? <ArrowDownRight className="size-3" /> : stock.direction === "up" ? <ArrowUpRight className="size-3" /> : null}{stock.change}</p></div>
    <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{stock.summary}</p><div className="mt-2 flex items-center gap-2">{stock.bucket !== "new" && <span className={`inline-flex items-center gap-1 rounded-sm bg-${color}/10 px-1.5 py-0.5 text-[10px] font-semibold text-${color}`}>Score {stock.score}</span>}{stock.stale && <span className="rounded-sm border border-drift/30 bg-drift/10 px-1.5 py-0.5 text-[10px] font-medium text-drift">Delayed</span>}</div></div>
    <div className="flex items-center justify-end gap-1 border-t border-border pt-2 sm:border-0 sm:pt-0"><Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-success" onClick={onSeen}><Eye className="size-3.5" /> <span>Seen it</span></Button><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onRemove} aria-label={`Remove ${stock.symbol}`}><Trash2 className="size-3.5" /></Button></div>
  </article>;
}

function AuthScreen({ onAuthed }: { onAuthed: (user: BackendUser) => void }) {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const auth = mode === "sign-in" ? await api.login(email, password) : await api.register(name, email, password);
      api.saveSession(auth);
      onAuthed(auth.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden overflow-hidden border-r border-border bg-sidebar p-10 lg:flex lg:flex-col lg:justify-between xl:p-16"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><TrendingUp className="size-5" strokeWidth={2.5} /></div><span className="text-base font-bold">MarketPulse</span></div><div className="max-w-lg"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">A calmer way to keep up</p><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Know what changed.<br /><span className="text-muted-foreground">Not just what moved.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">MarketPulse turns a noisy watchlist into a clear check-in, so you can spend less time watching the market and more time making decisions.</p><div className="mt-12 grid max-w-md grid-cols-3 gap-5 border-t border-border pt-5"><div><p className="font-mono text-lg text-primary">01</p><p className="mt-1 text-xs leading-4 text-muted-foreground">Unusual moves</p></div><div><p className="font-mono text-lg text-primary">02</p><p className="mt-1 text-xs leading-4 text-muted-foreground">News that matters</p></div><div><p className="font-mono text-lg text-primary">03</p><p className="mt-1 text-xs leading-4 text-muted-foreground">A calmer inbox</p></div></div></div><p className="text-xs text-muted-foreground">Built for occasional investors, not day traders.</p></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-[420px]"><div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><TrendingUp className="size-5" strokeWidth={2.5} /></div><span className="text-base font-bold">MarketPulse</span></div><div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p><h2 className="text-3xl font-semibold tracking-tight">Your market, in context.</h2><p className="mt-2 text-sm text-muted-foreground">Sign in to pick up where you left off.</p></div><div className="mb-7 grid grid-cols-2 border-b border-border"><button type="button" className={`border-b-2 py-3 text-sm font-medium transition-colors ${mode === "sign-in" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setMode("sign-in")}>Sign in</button><button type="button" className={`border-b-2 py-3 text-sm font-medium transition-colors ${mode === "create" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => setMode("create")}>Create account</button></div><form className="space-y-4" onSubmit={handleSubmit}>
      {mode === "create" && <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</span><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 bg-surface" /></label>}
      <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</span><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 bg-surface" /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</span><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-11 bg-surface" /></label>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting} className="mt-3 h-11 w-full">{submitting ? "Please wait…" : mode === "sign-in" ? "Sign in to MarketPulse" : "Create your account"} <ArrowUpRight className="size-4" /></Button>
    </form><div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> <span>Private by design</span> <div className="h-px flex-1 bg-border" /></div><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">By continuing, you agree to keep your investing decisions your own. MarketPulse provides signals, not advice.</p></div></section>
  </main>;
}