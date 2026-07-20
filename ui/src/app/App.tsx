import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight, FileText, User, Stethoscope, Shield,
  Search, ArrowRight, Phone, Activity, TrendingUp, AlertCircle, LogOut,
  Accessibility, BellRing, BellOff, X, Type, DollarSign, Calendar, Info, ArrowUpRight,
  Eye, Building2, Pill, Zap, Target, Briefcase, ChevronDown, Filter, RefreshCw
} from "lucide-react";
import dashboardData from "../data/claims.json";
import ChatBot from "./components/ChatBot";

type View = "member" | "representative";
type TextSize = "normal" | "large" | "xl";
type Tab = "overview" | "claims" | "issues";

// Default data from static file
const DEFAULT_MEMBER = dashboardData.member;
const DEFAULT_CLAIMS: any[] = dashboardData.claims;
const BENEFITS: any = dashboardData.benefits;

const money = (n: number | null) => n == null ? "—" : `$${n.toLocaleString()}`;

// ROI Gate Panel Component
function ROIGatePanel({ onROICleared }: { onROICleared: (memberName: string, memberId: string) => void }) {
  const [callerName, setCallerName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberDob, setMemberDob] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{status: string, message: string} | null>(null);

  const checkROI = async () => {
    if (!callerName.trim() || !memberName.trim() || !memberDob.trim()) {
      setResult({status: "error", message: "Please enter caller name, member name, and date of birth"});
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_type: "call_assist",
          message: `Verify authorization for caller ${callerName} to access member ${memberName}`,
          initial_state: {
            member_name: memberName,
            member_dob: memberDob,
            caller_name: callerName
          }
        }),
      });

      const data = await response.json();

      // Check if ROI was cleared
      const roiCleared = data.state?.roi_cleared;

      if (roiCleared) {
        setResult({
          status: "success",
          message: `✓ Authorization verified. ${callerName} is authorized to access ${memberName}'s information.`
        });
        // Call parent to unlock claims view
        const memberId = data.state?.member_id || "";
        onROICleared(memberName, memberId);
      } else {
        setResult({
          status: "blocked",
          message: data.response || "Authorization denied. No ROI on file."
        });
      }
    } catch (error) {
      setResult({
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Failed to verify ROI"}`
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      checkROI();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Caller Name</label>
          <input
            type="text"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., David, Douglas Wilson"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Member Full Name</label>
          <input
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Patricia Davis"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Member Date of Birth</label>
          <input
            type="text"
            value={memberDob}
            onChange={(e) => setMemberDob(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="YYYY-MM-DD or MM/DD/YYYY"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={checkROI}
        disabled={isChecking}
        className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isChecking ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Verify ROI Authorization
          </>
        )}
      </button>

      {result && (
        <div className={`p-4 rounded-lg border-2 ${
          result.status === "success"
            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
            : result.status === "blocked"
            ? "bg-rose-50 border-rose-300 text-rose-800"
            : "bg-amber-50 border-amber-300 text-amber-800"
        }`}>
          <p className="text-sm font-medium whitespace-pre-wrap">{result.message}</p>
        </div>
      )}

      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs font-semibold text-blue-900 mb-1">Test Scenarios (transcript_04):</p>
        <ul className="text-xs text-blue-800 space-y-0.5">
          <li>• <strong>Blocked:</strong> Caller "David", Member "Kelly Foster", DOB "1977-01-07"</li>
          <li>• <strong>Authorized:</strong> Caller "Douglas Wilson", Member "Kelly Foster", DOB "1977-01-07"</li>
          <li>• <strong>Self:</strong> Caller "John Rodriguez", Member "John Rodriguez", DOB "1954-10-02"</li>
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("member");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [simplified, setSimplified] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showA11y, setShowA11y] = useState(false);

  // ROI Gate state for Representative view
  const [roiVerified, setRoiVerified] = useState(false);
  const [authorizedMemberName, setAuthorizedMemberName] = useState("");
  const [authorizedMemberId, setAuthorizedMemberId] = useState("");

  // Dashboard data state
  const [MEMBER, setMember] = useState(DEFAULT_MEMBER);
  const [CLAIMS, setClaims] = useState(DEFAULT_CLAIMS);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dataSource, setDataSource] = useState<"static" | "api">("static");

  // Fetch dashboard data from API (optional, defaults to static)
  const loadDashboardData = async (useLive: boolean = false) => {
    setIsLoadingDashboard(true);
    try {
      const response = await fetch(`/api/dashboard/${DEFAULT_MEMBER.id}?live=${useLive}`);
      const data = await response.json();

      if (data.error) {
        console.error("Dashboard API error:", data.error);
        // Fall back to static data
        setMember(DEFAULT_MEMBER);
        setClaims(DEFAULT_CLAIMS);
        setDataSource("static");
      } else {
        setMember(data.member);
        setClaims(data.claims);
        setDataSource("api");
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Fall back to static data
      setMember(DEFAULT_MEMBER);
      setClaims(DEFAULT_CLAIMS);
      setDataSource("static");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Handle ROI verification success - fetch that member's claims LIVE from database
  const handleROICleared = async (memberName: string, memberId: string) => {
    setRoiVerified(true);
    setAuthorizedMemberName(memberName);
    setAuthorizedMemberId(memberId);

    // Fetch claims for THIS specific member from the database (LIVE agents)
    setIsLoadingDashboard(true);
    try {
      // Use live=true to run agents and get real data from database
      const response = await fetch(`/api/dashboard/${memberId}?live=true`);
      const data = await response.json();

      if (data.error) {
        console.error("Failed to fetch member claims:", data.error);
        alert(`Could not fetch claims for ${memberName}: ${data.error}`);
      } else {
        console.log("API Response:", data);
        console.log("Claims received:", data.claims?.length || 0);

        // Update to show this member's claims
        if (data.member) {
          setMember(data.member);
        }
        setClaims(data.claims || []);
        setDataSource("api");

        console.log("CLAIMS state updated to:", data.claims);
      }
    } catch (error) {
      console.error("Error fetching member claims:", error);
      alert(`Error fetching claims: ${error}`);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Reset ROI when switching views
  useEffect(() => {
    if (view === "member") {
      // Member view doesn't need ROI
      setRoiVerified(false);
      setAuthorizedMemberName("");
      setAuthorizedMemberId("");
    }
  }, [view]);

  // Load on mount (precomputed data by default)
  useEffect(() => {
    // Uncomment to load from API on mount:
    // loadDashboardData(false);
  }, []);

  const textSizeClass = textSize === "xl" ? "text-lg" : textSize === "large" ? "text-base" : "text-sm";
  const headingSizeClass = textSize === "xl" ? "text-3xl" : textSize === "large" ? "text-2xl" : "text-xl";

  const myClaims = CLAIMS.filter(c => c.member === MEMBER.name);

  // For representative view: show ALL claims when ROI verified (already filtered by API)
  const repClaims = roiVerified ? CLAIMS : [];

  const displayClaims = view === "member" ? myClaims : repClaims;

  const issuesCount = displayClaims.filter(c => c.issue).length;
  const inReviewCount = myClaims.filter(c => c.status === "inprogress" || c.status === "pending").length;
  const completedCount = myClaims.filter(c => c.status === "completed").length;
  const totalOwed = myClaims.reduce((sum, c) => sum + (c.youOwe || 0), 0);

  const claimsWithIssues = displayClaims.filter(c => c.issue);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "inprogress": return "bg-amber-500";
      case "pending": return "bg-slate-500";
      case "denied": return "bg-rose-600";
      default: return "bg-slate-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "inprogress": return "In Progress";
      case "pending": return "Pending";
      case "denied": return "Denied";
      default: return status;
    }
  };

  const selectedClaimData = CLAIMS.find(c => c.id === selectedClaim);

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${highContrast ? "bg-black text-white" : "bg-slate-50"}`}>
      {/* Brand Bar */}
      <div className="flex-shrink-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

      {/* Header */}
      <header className={`flex-shrink-0 ${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"} border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-2xl ${highContrast ? "text-white" : "text-slate-900"} tracking-tight`}>
                  Humana
                </h1>
                <p className="text-xs font-semibold text-slate-500">Curious · Caring · Committed</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              {/* Dashboard Data Source Indicator */}
              {dataSource === "api" && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-bold text-emerald-700">Live AI Data</p>
                </div>
              )}

              {/* Refresh Dashboard Button */}
              <button
                onClick={() => loadDashboardData(false)}
                disabled={isLoadingDashboard}
                className="p-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                title="Refresh Dashboard (Precomputed)"
              >
                <RefreshCw className={`w-5 h-5 ${isLoadingDashboard ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => setNotifications(!notifications)}
                className={`p-2.5 rounded-lg transition-all ${notifications ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                title="Toggle Notifications"
              >
                {notifications ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setShowA11y(!showA11y)}
                className={`p-2.5 rounded-lg transition-all ${showA11y ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}
                title="Accessibility"
              >
                <Accessibility className="w-5 h-5" />
              </button>

              <button className="p-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Accessibility Bar */}
          {showA11y && (
            <div className={`mt-4 pt-4 border-t ${highContrast ? "border-zinc-800" : "border-slate-200"} flex flex-wrap items-center gap-6`}>
              <div className="flex items-center gap-3">
                <Type className="w-4 h-4 text-emerald-600" />
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(e.target.value as TextSize)}
                  className="bg-white border border-slate-300 text-sm rounded-lg px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} className="rounded w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                High Contrast
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={simplified} onChange={(e) => setSimplified(e.target.checked)} className="rounded w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                Simplified
              </label>
            </div>
          )}
        </div>
      </header>

      {/* View Toggle */}
      <div className={`flex-shrink-0 ${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"} border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setView("member"); setTab("overview"); }}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                view === "member"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Member View
            </button>
            <button
              onClick={() => { setView("representative"); setTab("claims"); }}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                view === "representative"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Stethoscope className="w-4 h-4 inline mr-2" />
              Provider View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* MEMBER VIEW */}
          {view === "member" && (
            <>
              {/* Welcome & Stats */}
              <div className="mb-6">
                <h2 className={`${headingSizeClass} font-bold ${highContrast ? "text-white" : "text-slate-900"} mb-1`}>
                  Good morning, {MEMBER.first}
                </h2>
                <p className="text-sm text-slate-600 font-medium">{MEMBER.plan} · Member ID {MEMBER.id}</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-slate-200">
                {[
                  { key: "overview", label: "Overview", count: null },
                  { key: "claims", label: "Claims", count: myClaims.length },
                  { key: "issues", label: "Issues", count: issuesCount },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key as Tab)}
                    className={`px-4 py-3 text-sm font-bold transition-all relative ${
                      tab === key
                        ? "text-emerald-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                    {count !== null && count > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                        tab === key ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {count}
                      </span>
                    )}
                    {tab === key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: FileText, label: "Total Claims", value: myClaims.length.toString(), color: "emerald" },
                      { icon: Clock, label: "In Review", value: inReviewCount.toString(), color: "amber" },
                      { icon: CheckCircle2, label: "Completed", value: completedCount.toString(), color: "emerald" },
                      { icon: DollarSign, label: "You May Owe", value: money(totalOwed), color: totalOwed > 0 ? "amber" : "emerald" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className={`${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"} rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                          </div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
                        </div>
                        <p className={`text-3xl font-bold ${highContrast ? "text-white" : "text-slate-900"}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Benefits Quick View */}
                  <div className={`${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"} rounded-xl border p-6`}>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Plan Benefits</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Primary Care", value: money(BENEFITS.primaryCare) },
                        { label: "Specialist", value: money(BENEFITS.specialist) },
                        { label: "Emergency Room", value: money(BENEFITS.emergencyRoom) },
                        { label: "Tier 1 Drugs", value: money(BENEFITS.tier1Drugs) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-600 font-semibold mb-1">{label}</p>
                          <p className="text-lg font-bold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Out of Pocket Progress */}
                    <div className="mt-5 pt-5 border-t border-emerald-200">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-slate-700">Out-of-Pocket This Year</p>
                        <p className="text-sm font-bold text-slate-900">{money(BENEFITS.outOfPocketUsed)} / {money(BENEFITS.outOfPocketMax)}</p>
                      </div>
                      <div className="h-3 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                          style={{ width: `${Math.min(100, (BENEFITS.outOfPocketUsed / BENEFITS.outOfPocketMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Support Card */}
                  <div className={`${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-blue-50 border-blue-200"} rounded-xl border p-6`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Need Help?</h3>
                        <p className="text-sm text-slate-700 mb-3">Call the number on the back of your Humana ID card for assistance with claims or benefits.</p>
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          Contact Support <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CLAIMS TAB */}
              {tab === "claims" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Your Claims</h3>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search claims..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {displayClaims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => setSelectedClaim(claim.id)}
                      className={`${highContrast ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"} rounded-xl border p-5 hover:shadow-lg transition-all cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-base text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{claim.service}</h4>
                          <p className="text-sm text-slate-600">{claim.provider}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">{claim.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(claim.status)}`}>
                            {getStatusLabel(claim.status)}
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Date</p>
                          <p className="text-sm font-bold text-slate-900">{claim.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Billed</p>
                          <p className="text-sm font-bold text-slate-900">{money(claim.billed)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">You May Owe</p>
                          <p className={`text-sm font-bold ${claim.youOwe && claim.youOwe > 0 ? "text-amber-600" : "text-slate-900"}`}>
                            {money(claim.youOwe)}
                          </p>
                        </div>
                      </div>

                      {claim.issue && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <p className="text-sm font-semibold text-rose-600">{claim.issue}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ISSUES TAB */}
              {tab === "issues" && (
                <div className="space-y-4">
                  {claimsWithIssues.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No Open Issues</h3>
                      <p className="text-sm text-slate-600">All of your claims are processing normally.</p>
                    </div>
                  ) : (
                    claimsWithIssues.map((claim) => (
                      <div
                        key={claim.id}
                        onClick={() => setSelectedClaim(claim.id)}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-base text-slate-900 mb-1">{claim.service}</h4>
                            <p className="text-sm text-slate-600">{claim.provider}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(claim.status)}`}>
                            {getStatusLabel(claim.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1">Detected Issue</p>
                            <p className="text-sm font-bold text-slate-900">{claim.issue}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Suggested Fix</p>
                            <p className="text-sm font-bold text-slate-900">{claim.fix}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* REPRESENTATIVE VIEW */}
          {view === "representative" && (
            <>
              <h2 className={`${headingSizeClass} font-bold text-slate-900 mb-6`}>Claims Work Queue</h2>

              {/* ROI Gate - Call Assist */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Call Assist - ROI Verification</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Verify Release of Information before accessing member data (Use Case 3)
                    </p>
                  </div>
                </div>
                <ROIGatePanel onROICleared={handleROICleared} />
              </div>

              {/* ROI Status Banner */}
              {roiVerified && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          Authorization Verified ✓
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Viewing claims for: <strong>{authorizedMemberName}</strong> (Member ID: {authorizedMemberId})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRoiVerified(false);
                        setAuthorizedMemberName("");
                        setAuthorizedMemberId("");
                      }}
                      className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      Clear Authorization
                    </button>
                  </div>
                </div>
              )}

              {/* Search */}
              {roiVerified && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Member Search</h3>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by Member ID, Name, or DOB..."
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                        Search
                      </button>
                    </div>
                  </div>

                  {/* Claims Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-slate-900">All Claims</h3>
                    <span className="text-xs font-semibold text-slate-600">
                      {displayClaims.length} total · <span className="text-rose-600">{claimsWithIssues.length} issues</span>
                    </span>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Member / Claim</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Issue</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Fix</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayClaims.map((claim) => (
                        <tr key={claim.id} onClick={() => setSelectedClaim(claim.id)} className="hover:bg-slate-50 cursor-pointer group">
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-blue-600 group-hover:text-emerald-600 transition-colors">{claim.id}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{claim.member} · DOB {claim.dob}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{claim.service}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-slate-900">{claim.date}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(claim.status)}`}>
                              {getStatusLabel(claim.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-semibold ${claim.issue ? "text-rose-600" : "text-slate-400"}`}>
                              {claim.issue || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-semibold ${claim.fix ? "text-emerald-600" : "text-slate-400"}`}>
                              {claim.fix || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {/* Loading State */}
              {roiVerified && isLoadingDashboard && (
                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-12 text-center">
                  <RefreshCw className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    Loading Claims...
                  </h3>
                  <p className="text-sm text-blue-700 max-w-md mx-auto">
                    Running AI agents to analyze {authorizedMemberName}'s claims from the database.
                  </p>
                  <p className="text-xs text-blue-600 mt-4">
                    This may take 30-60 seconds per claim...
                  </p>
                </div>
              )}

              {/* Blocked State - Show when ROI not verified */}
              {!roiVerified && !isLoadingDashboard && (
                <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-12 text-center">
                  <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Authorization Required
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    To view member claims and protected health information, please verify authorization using the ROI gate above.
                  </p>
                  <p className="text-xs text-slate-500 mt-4">
                    This ensures HIPAA compliance by preventing unauthorized access to PHI.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* CLAIM DETAIL MODAL */}
      {selectedClaim && selectedClaimData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setSelectedClaim(null)}>
          <div
            className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Claim Details</h3>
                <p className="text-sm font-mono text-blue-600 font-bold mt-0.5">{selectedClaimData.id}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Issue Card */}
                  {selectedClaimData.issue ? (
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-1">Current Issue</p>
                          <h2 className="text-2xl font-bold text-slate-900">{selectedClaimData.issue}</h2>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-bold text-white ${getStatusColor(selectedClaimData.status)}`}>
                          {getStatusLabel(selectedClaimData.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-4 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Owner</p>
                          <p className="text-sm font-bold text-slate-900">{view === "representative" ? "You" : "Provider"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Action</p>
                          <p className="text-sm font-bold text-rose-600">{selectedClaimData.fix}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">ETA</p>
                          <p className="text-sm font-bold text-slate-900">3-5 Days</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Amount</p>
                          <p className="text-sm font-bold text-slate-900">{money(selectedClaimData.billed)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-3" />
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Claim Processed Successfully</h2>
                      <p className="text-sm text-slate-700">This claim has been completed with no issues.</p>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">What Happened</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedClaimData.issue
                        ? "This claim is currently on hold because the required prior authorization for the procedure was not found on file for the actual date of service."
                        : "This claim was processed and paid. Your prescription was covered under your pharmacy benefit at an in-network pharmacy."}
                    </p>

                    {!simplified && selectedClaimData.issue && (
                      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Why</p>
                          <p className="text-sm text-slate-700">An authorization was issued, but it expired before the rescheduled surgery date. The procedure requires an active authorization to be processed.</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">What You Should Do</p>
                          <p className="text-sm text-slate-700">
                            {view === "member"
                              ? "Nothing at this time. We are waiting on your provider to submit the required paperwork."
                              : "Please submit a retroactive authorization request with clinical notes from the date of service."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Cost Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Amount Billed</p>
                        <p className="text-xl font-bold text-slate-900">{money(selectedClaimData.billed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Plan Paid</p>
                        <p className="text-xl font-bold text-emerald-600">{money(selectedClaimData.planPaid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">You May Owe</p>
                        <p className={`text-xl font-bold ${selectedClaimData.youOwe && selectedClaimData.youOwe > 0 ? "text-amber-600" : "text-slate-900"}`}>
                          {money(selectedClaimData.youOwe)}
                        </p>
                      </div>
                    </div>
                    {selectedClaimData.planPaid !== null && (
                      <div className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                          style={{ width: `${(selectedClaimData.planPaid / selectedClaimData.billed) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Next Steps */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-5">
                    <h3 className="font-bold text-base mb-5 flex items-center gap-2">
                      <ArrowRight className="w-5 h-5" />
                      What Happens Next
                    </h3>

                    <div className="space-y-4">
                      {[
                        { num: 1, title: "Provider submits auth", sub: "Clinical records uploaded", active: true },
                        { num: 2, title: "Humana reviews", sub: "Medical team evaluates", active: false },
                        { num: 3, title: "Claim reprocesses", sub: "EOB issued", active: false },
                      ].map(({ num, title, sub, active }) => (
                        <div key={num} className="flex gap-3 items-start">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                            active ? "bg-white text-blue-600" : "bg-white/20 border border-white/30 text-white"
                          }`}>
                            {num}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{title}</p>
                            {sub && <p className="text-xs text-white/80 mt-0.5">{sub}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {view === "representative" && selectedClaimData.issue && (
                      <button className="w-full mt-5 px-4 py-2.5 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
                        Upload Authorization
                      </button>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Claim Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Provider</p>
                        <p className="text-sm font-bold text-slate-900">{selectedClaimData.provider}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Date of Service</p>
                        <p className="text-sm font-bold text-slate-900">{selectedClaimData.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Service</p>
                        <p className="text-sm font-bold text-slate-900">{selectedClaimData.service}</p>
                      </div>
                    </div>
                  </div>

                  {/* Help Card - Member Only */}
                  {view === "member" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 mb-1">Need Help?</h3>
                          <p className="text-xs text-slate-700">Call the number on the back of your Humana ID card.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot */}
      <ChatBot />
    </div>
  );
}
