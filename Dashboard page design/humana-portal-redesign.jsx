import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, X, MessageCircle, Send, ChevronRight, Bell, BellOff, LogOut,
  Eye, EyeOff, Check, AlertTriangle, Lock, Minus, Plus, Globe, Info, Printer,
  Accessibility, FileText, Clock, CheckCircle2, Wallet,
  ArrowUp, ArrowDown, ArrowUpDown, Home, Activity, Phone,
} from "lucide-react";

/* ================================================================== */
/*  Humana design tokens — bold, professional healthcare design        */
/* ================================================================== */
const T = {
  green: "#00914B",        // bold primary green (more vibrant)
  greenBright: "#7AC143",  // brand accent (logo dot, top bar, highlights)
  greenDark: "#006B38",    // hover state (darker, more confident)
  greenTint: "#E8F5EE",    // subtle green background (lighter)
  ink: "#1A1A1A",          // true black text (bolder)
  body: "#4A4A4A",         // secondary text (darker)
  muted: "#6B6B6B",        // tertiary text
  line: "#D1D1D1",         // borders
  lineSoft: "#E5E5E5",
  page: "#FFFFFF",
  wash: "#F5F5F5",         // section background (cleaner gray)
  amber: "#D97D00",        // in-progress (bolder orange)
  amberBg: "#FFF4E6",
  red: "#C41E3A",          // bolder red
  redBg: "#FFEBEE",
  gray: "#4A4A4A",
  grayBg: "#ECECEC",
  focus: "#0066CC",        // blue focus (more standard)
  valueBlue: "#0066CC",    // for values banner
};

const FONT = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";
const MONO = "'Source Code Pro', ui-monospace, monospace";

/* ================================================================== */
/*  Strings (EN / ES)                                                  */
/* ================================================================== */
const STR = {
  en: {
    // Values
    valueCurious: "Curious",
    valueCaring: "Caring",
    valueCommitted: "Committed",

    // Sign in
    signInMember: "Sign in to MyHumana",
    signInProvider: "Provider portal sign in",
    memberTab: "Member",
    providerTab: "Provider",
    username: "Username",
    password: "Password",
    remember: "Remember my username",
    signIn: "Sign in",
    forgotU: "Forgot username?",
    forgotP: "Forgot password?",
    activate: "Activate your online profile",
    newHere: "New to MyHumana?",
    providerNote: "Use the credentials issued by your organization's portal administrator.",
    requestAccess: "Request portal access",
    secure: "Secure sign in",

    // Navigation
    home: "Home",
    claims: "Claims",
    support: "Support",
    signOut: "Sign out",
    accessibility: "Accessibility",

    // Dashboard
    goodMorning: "Good morning",
    memberId: "Member ID",
    planName: "Humana Gold Plus HMO",
    recentClaims: "Recent claims",
    allClaims: "Claims center",
    expandNote: "Select any claim to see the full breakdown — cost details, status history, and any next steps.",
    viewDetails: "View details",
    viewAll: "View all claims",

    // Claims table
    service: "Service",
    dateOfService: "Date of service",
    status: "Status",
    amountBilled: "Amount billed",
    planPaid: "Plan paid",
    youMayOwe: "You may owe",
    claimNumber: "Claim number",
    provider: "Provider",
    filterClaims: "Filter claims...",
    dateRange: "Date range",
    last6: "Last 6 months",
    last12: "Last 12 months",
    allDates: "All dates",
    statusAll: "All statuses",
    noResults: "No claims match your filters.",

    // Claim details
    claimDetails: "Claim details",
    costSummary: "Cost summary",
    pendingCost: "Final costs will appear here once processing is complete.",
    aboutClaim: "About this claim",
    reason: "Reason",
    yourNextSteps: "Your next steps",
    whatNext: "What happens next",
    actionRequired: "Action required",
    resolutionEta: "Estimated resolution",
    owner: "Being handled by",
    reviewActivity: "Claim review activity",

    // Provider
    workQueue: "Claims work queue",
    memberSearch: "Member search",
    searchPlaceholder: "Member ID, name, or date of birth",
    searchBtn: "Search",
    detectedIssue: "Detected issue",
    suggestedFix: "Suggested fix",
    member: "Member",
    date: "Date",
    amount: "Amount",
    none: "None",
    noIssue: "—",
    providerHome: "Provider self-service",

    // Help & Support
    needHelp: "Need help?",
    callUs: "Call the number on the back of your Humana ID card.",
    contactSupport: "Contact support",

    // Accessibility
    notifOn: "Push notifications are on",
    notifOff: "Push notifications are off",
    textSize: "Text size",
    highContrast: "High contrast",
    simplified: "Simplified view",
    language: "Language",
    close: "Close",
    print: "Print",

    // Stats
    totalClaims: "Total claims",
    inReview: "In review",
    completedCount: "Completed",
    balanceOwe: "Balance you may owe",

    // Benefits
    benefitsGlance: "Plan & benefits",
    primaryCare: "Primary care visit",
    specialistVisit: "Specialist visit",
    emergencyRoom: "Emergency room",
    tier1Drugs: "Tier 1 drugs",
    outOfPocket: "Out-of-pocket this year",
    ofWord: "of",
    benefitsAsk: "Have a question about your benefits? Contact support.",

    // Sorting & Filtering
    sortBy: "Sort by",
    sortRecent: "Newest first",
    sortOldest: "Oldest first",
    sortAmtHigh: "Amount: high to low",
    sortAmtLow: "Amount: low to high",
    filterStatus: "Filter by status",
    chipAll: "All",

    // Issues & Timeline
    navIssues: "Issues",
    navTimeline: "Timeline",
    issuesTitle: "Issues",
    issuesSub: "Claims that need action before they can finish processing.",
    noOpenIssues: "No open issues. All of your claims are processing normally.",
    noOpenIssuesProvider: "No open issues in your work queue.",
    timelineTitle: "Claim timeline",
    timelineSub: "Every claim in order, with any issue flagged on each entry.",
    timelineSort: "Sort",
    byIssue: "By issue",
    noIssueFlag: "No issue flagged",

    // Member info
    memberInfo: "Member information",
    dateOfBirth: "Date of birth",
    planLabel: "Plan",
    effectiveDate: "Effective date",
    pcpLabel: "Primary care physician",
    claimsOverview: "Claims overview",

    // Footer
    footerLegal: "This is a product concept demonstration. It is not affiliated with or operated by Humana Inc. No real member data is shown.",
    demoHint: "Demo: any username and password will sign you in.",
  },
  es: {
    // Values
    valueCurious: "Curiosos",
    valueCaring: "Solidarios",
    valueCommitted: "Comprometidos",

    // (Spanish translations remain the same as before)
    signInMember: "Inicie sesión en MyHumana",
    signInProvider: "Acceso al portal de proveedores",
    memberTab: "Miembro",
    providerTab: "Proveedor",
    username: "Nombre de usuario",
    password: "Contraseña",
    remember: "Recordar mi nombre de usuario",
    signIn: "Iniciar sesión",
    forgotU: "¿Olvidó su nombre de usuario?",
    forgotP: "¿Olvidó su contraseña?",
    activate: "Active su perfil en línea",
    newHere: "¿Nuevo en MyHumana?",
    providerNote: "Use las credenciales emitidas por el administrador del portal de su organización.",
    requestAccess: "Solicitar acceso al portal",
    secure: "Acceso seguro",
    home: "Inicio",
    claims: "Reclamos",
    support: "Ayuda",
    signOut: "Cerrar sesión",
    accessibility: "Accesibilidad",
    goodMorning: "Buenos días",
    memberId: "ID de miembro",
    planName: "Humana Gold Plus HMO",
    recentClaims: "Reclamos recientes",
    allClaims: "Centro de reclamos",
    expandNote: "Seleccione cualquier reclamo para ver el desglose completo: costos, historial de estado y próximos pasos.",
    viewDetails: "Ver detalles",
    viewAll: "Ver todos los reclamos",
    service: "Servicio",
    dateOfService: "Fecha de servicio",
    status: "Estado",
    amountBilled: "Monto facturado",
    planPaid: "Pagado por el plan",
    youMayOwe: "Usted puede deber",
    claimNumber: "Número de reclamo",
    provider: "Proveedor",
    filterClaims: "Filtrar reclamos...",
    dateRange: "Rango de fechas",
    last6: "Últimos 6 meses",
    last12: "Últimos 12 meses",
    allDates: "Todas las fechas",
    statusAll: "Todos los estados",
    noResults: "Ningún reclamo coincide con sus filtros.",
    claimDetails: "Detalles del reclamo",
    costSummary: "Resumen de costos",
    pendingCost: "Los costos finales aparecerán aquí cuando termine el procesamiento.",
    aboutClaim: "Acerca de este reclamo",
    reason: "Motivo",
    yourNextSteps: "Sus próximos pasos",
    whatNext: "Qué sigue",
    actionRequired: "Acción requerida",
    resolutionEta: "Resolución estimada",
    owner: "A cargo de",
    reviewActivity: "Actividad de revisión del reclamo",
    workQueue: "Cola de trabajo de reclamos",
    memberSearch: "Búsqueda de miembros",
    searchPlaceholder: "ID de miembro, nombre o fecha de nacimiento",
    searchBtn: "Buscar",
    detectedIssue: "Problema detectado",
    suggestedFix: "Solución sugerida",
    member: "Miembro",
    date: "Fecha",
    amount: "Monto",
    none: "Ninguna",
    noIssue: "—",
    providerHome: "Autoservicio para proveedores",
    needHelp: "¿Necesita ayuda?",
    callUs: "Llame al número que está al reverso de su tarjeta de Humana.",
    contactSupport: "Contactar soporte",
    notifOn: "Las notificaciones están activadas",
    notifOff: "Las notificaciones están desactivadas",
    textSize: "Tamaño del texto",
    highContrast: "Alto contraste",
    simplified: "Vista simplificada",
    language: "Idioma",
    close: "Cerrar",
    print: "Imprimir",
    totalClaims: "Reclamos totales",
    inReview: "En revisión",
    completedCount: "Completados",
    balanceOwe: "Saldo que puede deber",
    benefitsGlance: "Plan y beneficios",
    primaryCare: "Visita de atención primaria",
    specialistVisit: "Visita al especialista",
    emergencyRoom: "Sala de emergencias",
    tier1Drugs: "Medicamentos Nivel 1",
    outOfPocket: "Gastos de bolsillo este año",
    ofWord: "de",
    benefitsAsk: "¿Tiene una pregunta sobre beneficios? Contacte soporte.",
    sortBy: "Ordenar por",
    sortRecent: "Más recientes primero",
    sortOldest: "Más antiguos primero",
    sortAmtHigh: "Monto: de mayor a menor",
    sortAmtLow: "Monto: de menor a mayor",
    filterStatus: "Filtrar por estado",
    chipAll: "Todos",
    navIssues: "Problemas",
    navTimeline: "Cronología",
    memberInfo: "Información del miembro",
    dateOfBirth: "Fecha de nacimiento",
    planLabel: "Plan",
    effectiveDate: "Fecha de vigencia",
    pcpLabel: "Médico de atención primaria",
    claimsOverview: "Resumen de reclamos",
    issuesTitle: "Problemas",
    issuesSub: "Reclamos que necesitan una acción antes de poder completarse.",
    noOpenIssues: "No hay problemas abiertos. Todos sus reclamos se procesan con normalidad.",
    noOpenIssuesProvider: "No hay problemas abiertos en su cola de trabajo.",
    timelineTitle: "Cronología de reclamos",
    timelineSub: "Cada reclamo en orden, con cualquier problema marcado en cada entrada.",
    timelineSort: "Ordenar",
    byIssue: "Por problema",
    noIssueFlag: "Sin problema marcado",
    footerLegal: "Esta es una demostración de concepto. No está afiliada a Humana Inc. No se muestran datos reales de miembros.",
    demoHint: "Demo: cualquier usuario y contraseña iniciará sesión.",
  },
};

/* ================================================================== */
/*  Status labels                                                      */
/* ================================================================== */
const STATUS_LABEL = {
  en: { inprogress: "In progress", completed: "Completed", pending: "Pending", denied: "Denied" },
  es: { inprogress: "En proceso", completed: "Completado", pending: "Pendiente", denied: "Denegado" },
};

/* ================================================================== */
/*  Claims data                                                        */
/* ================================================================== */
const MEMBER = {
  name: "Sarah M. Johnson",
  first: "Sarah",
  id: "H4832 09177",
  dob: "04/15/1978",
  user: "sjohnson78",
  pcp: "Dr. Alan Reyes, MD"
};

const CLAIMS = [
  {
    id: "CLM-2025-0047823",
    member: MEMBER.name,
    dob: MEMBER.dob,
    provider: "Orthopedic Associates",
    service: "Knee replacement surgery",
    date: "01/16/2025",
    status: "inprogress",
    billed: 34850,
    planPaid: null,
    memberOwes: null,
    issue: "Missing authorization",
    fix: "Submit retro-authorization",
    detail: {
      ownerMember: "Your provider's office",
      ownerRep: "Your office",
      actionRep: "Submit documentation",
      eta: "3–5 business days",
      happened: "This claim is on hold because the prior authorization required for the knee replacement surgery was not on file for the actual date of service.",
      reason: "An authorization was issued, but it expired before the rescheduled surgery date. The procedure requires an active authorization to be processed.",
      memberSteps: "No action is needed from you. Your provider's office is submitting the required paperwork, and we will notify you when the claim moves forward.",
      repSteps: "Submit a retroactive authorization request with the clinical notes from the date of service.",
      next: [
        { title: "Provider submits authorization", sub: "Clinical records uploaded for review" },
        { title: "Humana medical review", sub: "Typically 3–5 business days" },
        { title: "Claim reprocesses", sub: "Updated explanation of benefits issued" },
      ],
      cta: "Upload authorization documents",
      activity: [
        { check: "Eligibility check", time: "Jan 21, 10:42 AM", note: "Member coverage active on date of service" },
        { check: "Authorization check", time: "Jan 21, 10:45 AM", note: "No active authorization found for 01/16/2025" },
        { check: "Records review", time: "Jan 21, 11:05 AM", note: "Retro-authorization identified as resolution path" },
        { check: "Routing", time: "Jan 21, 11:10 AM", note: "Assigned to provider work queue" },
      ],
    },
  },
  {
    id: "CLM-2025-0041122",
    member: MEMBER.name,
    dob: MEMBER.dob,
    provider: "CVS Pharmacy #4471",
    service: "Prescription fill – Tier 1",
    date: "12/04/2024",
    status: "completed",
    billed: 120,
    planPaid: 108,
    memberOwes: 12,
    issue: null,
    fix: null,
    detail: {
      ownerMember: "Humana",
      ownerRep: "Humana",
      actionRep: null,
      eta: "Resolved 12/09/2024",
      happened: "This pharmacy claim was processed and paid. Your prescription was covered under your Tier 1 pharmacy benefit at an in-network pharmacy.",
      reason: "The medication is on your plan's drug list, so only your Tier 1 copay applied.",
      memberSteps: "No action is needed. Your copay of $12.00 was collected at the pharmacy.",
      repSteps: "No action required. This claim is closed.",
      next: [
        { title: "Claim received", sub: "Submitted by pharmacy 12/04/2024" },
        { title: "Benefits applied", sub: "Tier 1 copay applied" },
        { title: "Claim paid", sub: "Closed 12/09/2024" },
      ],
      cta: null,
      activity: [
        { check: "Eligibility check", time: "Dec 4, 9:02 AM", note: "Coverage confirmed" },
        { check: "Formulary check", time: "Dec 4, 9:03 AM", note: "Tier 1 coverage confirmed" },
      ],
    },
  },
  {
    id: "CLM-2025-0049901",
    member: MEMBER.name,
    dob: MEMBER.dob,
    provider: "Norton Brownsboro Hospital",
    service: "Outpatient facility visit",
    date: "01/20/2025",
    status: "pending",
    billed: 12400,
    planPaid: null,
    memberOwes: null,
    issue: null,
    fix: null,
    detail: {
      ownerMember: "Humana",
      ownerRep: "Humana",
      actionRep: null,
      eta: "7–10 business days",
      happened: "This hospital claim was received recently and is in the standard review queue. Nothing is wrong – it has not been processed yet.",
      reason: "Facility claims go through an itemized bill review before benefits are applied.",
      memberSteps: "No action is needed right now. We will notify you if anything is required.",
      repSteps: "No action required at this time.",
      next: [
        { title: "Claim received", sub: "Submitted by hospital 01/20/2025" },
        { title: "Itemized review", sub: "Line items verified against plan benefits" },
        { title: "Benefits applied", sub: "Explanation of benefits issued" },
      ],
      cta: null,
      activity: [
        { check: "Eligibility check", time: "Jan 22, 8:15 AM", note: "Coverage confirmed; queued for itemized review" },
      ],
    },
  },
  {
    id: "CLM-2025-0044210",
    member: "Robert Chen",
    dob: "09/22/1961",
    provider: "Louisville Cardiology",
    service: "Cardiac stress test",
    date: "01/08/2025",
    status: "denied",
    billed: 8730,
    planPaid: 0,
    memberOwes: 0,
    issue: "Duplicate claim (CO-97)",
    fix: "File corrected claim",
    detail: {
      ownerMember: "Your provider's office",
      ownerRep: "Your office",
      actionRep: "File corrected claim",
      eta: "5–7 business days",
      happened: "This claim was denied because it matched a claim already on file for the same service, date, and provider.",
      reason: "Denial code CO-97 means the benefit for this service is included in a payment already made. This often happens when a claim is resubmitted without a corrected-claim indicator.",
      memberSteps: "You do not owe anything for this claim. Your provider's office is refiling it correctly, and no bill should be sent to you.",
      repSteps: "File a corrected claim with frequency code 7 and reference the original claim number.",
      next: [
        { title: "Corrected claim filed", sub: "Frequency code 7 with original claim reference" },
        { title: "Duplicate check re-run", sub: "Matched against the original payment" },
        { title: "Claim reprocesses", sub: "" },
      ],
      cta: "Start corrected claim",
      activity: [
        { check: "Duplicate check", time: "Jan 10, 2:12 PM", note: "Match found with claim paid 12/18/2024" },
        { check: "Routing", time: "Jan 10, 2:20 PM", note: "Corrected-claim path recommended" },
      ],
    },
  },
  {
    id: "CLM-2025-0038876",
    member: "Maria Lopez",
    dob: "02/03/1985",
    provider: "Baptist Health Imaging",
    service: "MRI – lumbar spine",
    date: "11/21/2024",
    status: "inprogress",
    billed: 2150,
    planPaid: null,
    memberOwes: null,
    issue: "Missing medical records",
    fix: "Send medical records",
    detail: {
      ownerMember: "Your provider's office",
      ownerRep: "Your office",
      actionRep: "Send records",
      eta: "10–14 business days",
      happened: "This imaging claim is on hold while Humana waits for supporting medical records from the ordering provider.",
      reason: "High-cost imaging requires clinical documentation showing medical necessity before payment.",
      memberSteps: "No action is needed from you. The ordering physician's office has been asked to send the records.",
      repSteps: "Upload the imaging order and clinical notes from the ordering physician.",
      next: [
        { title: "Records submitted", sub: "Imaging order and clinical notes" },
        { title: "Medical review", sub: "Necessity confirmed against plan policy" },
        { title: "Claim reprocesses", sub: "" },
      ],
      cta: "Upload medical records",
      activity: [
        { check: "Documentation check", time: "Nov 25, 11:30 AM", note: "Clinical notes not on file" },
        { check: "Records request", time: "Nov 25, 11:41 AM", note: "Request sent to ordering provider" },
      ],
    },
  },
];

const money = (n) =>
  n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/* ================================================================== */
/*  Plan benefits                                                      */
/* ================================================================== */
const BENEFITS = {
  plan: "Humana Gold Plus HMO",
  effective: "01/01/2025",
  monthlyPremium: 0,
  primaryCare: 0,
  specialist: 35,
  emergencyRoom: 120,
  tier1: 12,
  medicalDeductible: 0,
  outOfPocketMax: 4900,
  outOfPocketUsed: 1240,
};

/* ================================================================== */
/*  Shared primitives                                                  */
/* ================================================================== */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Code+Pro:wght@500&display=swap');
      button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible, [tabindex]:focus-visible {
        outline: 3px solid ${T.focus}; outline-offset: 2px; border-radius: 4px;
      }
      @media (prefers-reduced-motion: reduce) {
        * { transition: none !important; animation: none !important; }
      }
      ::placeholder { color: #8A8A8A; }
    `}</style>
  );
}

function Logo({ size = "text-3xl" }) {
  return (
    <span className={`${size} font-bold tracking-tight select-none`} style={{ color: T.ink, fontFamily: FONT }}>
      Humana
      <span style={{ color: T.greenBright }}>.</span>
    </span>
  );
}

function ValuesBanner({ t }) {
  const values = [
    { key: t.valueCurious, icon: "🔍" },
    { key: t.valueCaring, icon: "💚" },
    { key: t.valueCommitted, icon: "✓" },
  ];

  return (
    <div className="bg-white" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
      <div className="max-w-full px-4 sm:px-8 py-2.5">
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap text-sm">
          {values.map(({ key, icon }) => (
            <div key={key} className="flex items-center gap-2 font-bold" style={{ color: T.valueBlue }}>
              <span className="text-base">{icon}</span>
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, type = "button", full }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${full ? "w-full" : ""} rounded-lg px-8 py-3.5 font-bold text-white cursor-pointer transition-colors shadow-sm`}
      style={{ backgroundColor: T.green }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.greenDark)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.green)}
    >
      {children}
    </button>
  );
}

function TextLink({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer font-bold underline-offset-2 hover:underline text-left"
      style={{ color: T.green, background: "none", border: "none", padding: 0, font: "inherit" }}
    >
      {children}
    </button>
  );
}

function StatusChip({ status, lang, hc }) {
  const label = STATUS_LABEL[lang][status];
  const map = {
    inprogress: { bg: T.amberBg, fg: T.amber, dot: T.amber },
    completed: { bg: T.greenTint, fg: T.greenDark, dot: T.green },
    pending: { bg: T.grayBg, fg: T.gray, dot: "#8A8A8A" },
    denied: { bg: T.redBg, fg: T.red, dot: T.red },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
      style={{
        backgroundColor: hc ? "#fff" : s.bg,
        color: s.fg,
        border: hc ? `2px solid ${s.fg}` : `1px solid ${s.dot}20`
      }}
    >
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.dot }} />
      {label}
    </span>
  );
}

function Field({ label, type = "text", value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <label className="block">
      <span className="block text-sm font-bold mb-2" style={{ color: T.ink }}>{label}</span>
      <div className="relative">
        <input
          type={isPw && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-lg px-4 py-3.5 text-base outline-none"
          style={{ border: `2px solid ${T.line}`, color: T.ink, backgroundColor: "#fff" }}
          onFocus={(e) => (e.target.style.borderColor = T.green)}
          onBlur={(e) => (e.target.style.borderColor = T.line)}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1"
            style={{ color: T.muted, background: "none", border: "none" }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

/* ================================================================== */
/*  Sign-in screen                                                     */
/* ================================================================== */
function SignIn({ t, lang, setLang, onSignIn }) {
  const [tab, setTab] = useState("member");
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => { setUser(""); setPw(""); setErr(""); }, [tab]);

  const submit = (e) => {
    if (e) e.preventDefault();
    onSignIn(tab, user.trim());
  };

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor: T.wash }}>
      {/* Header */}
      <header className="bg-white" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              className="flex items-center gap-2 font-bold cursor-pointer"
              style={{ color: T.green, background: "none", border: "none" }}
            >
              <Globe size={16} /> {lang === "en" ? "En Español" : "In English"}
            </button>
            <span className="hidden sm:flex items-center gap-2 font-bold" style={{ color: T.muted }}>
              <Lock size={15} /> {t.secure}
            </span>
          </div>
        </div>
      </header>

      <ValuesBanner t={t} />

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ border: `1px solid ${T.line}` }}>
            {/* Member / Provider tabs */}
            <div className="grid grid-cols-2" role="tablist" aria-label="Account type">
              {[
                { key: "member", label: t.memberTab },
                { key: "provider", label: t.providerTab },
              ].map(({ key, label }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(key)}
                    className="py-4 font-bold cursor-pointer text-base transition-colors"
                    style={{
                      backgroundColor: active ? "#fff" : T.wash,
                      color: active ? T.ink : T.body,
                      borderBottom: active ? `4px solid ${T.green}` : `1px solid ${T.line}`,
                      borderRight: key === "member" ? `1px solid ${active ? "transparent" : T.line}` : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: T.ink }}>
                {tab === "member" ? t.signInMember : t.signInProvider}
              </h1>
              {tab === "provider" && (
                <p className="text-sm mb-4 leading-relaxed" style={{ color: T.body }}>{t.providerNote}</p>
              )}
              <div className="space-y-4 mt-5">
                <Field label={t.username} value={user} onChange={setUser} autoComplete="username" />
                <Field label={t.password} type="password" value={pw} onChange={setPw} autoComplete="current-password" />
              </div>

              <label className="flex items-center gap-3 mt-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                  style={{ accentColor: T.green }}
                />
                <span className="text-sm font-bold" style={{ color: T.ink }}>{t.remember}</span>
              </label>

              {err && (
                <div className="mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-bold" style={{ backgroundColor: T.redBg, color: T.red, border: `1px solid ${T.red}` }}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {err}
                </div>
              )}

              <div className="mt-6">
                <PrimaryButton type="submit" onClick={submit} full>{t.signIn}</PrimaryButton>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm">
                <TextLink>{t.forgotU}</TextLink>
                <TextLink>{t.forgotP}</TextLink>
              </div>

              <hr className="my-6" style={{ borderColor: T.lineSoft }} />

              {tab === "member" ? (
                <p className="text-sm" style={{ color: T.body }}>
                  {t.newHere} <TextLink>{t.activate}</TextLink>
                </p>
              ) : (
                <p className="text-sm" style={{ color: T.body }}>
                  <TextLink>{t.requestAccess}</TextLink>
                </p>
              )}
            </form>
          </div>

          {/* Demo hint */}
          <p className="text-center text-xs mt-5 px-4" style={{ color: T.muted }}>
            {t.demoHint}
          </p>
        </div>
      </main>

      <SiteFooter t={t} />
    </div>
  );
}

function SiteFooter({ t }) {
  return (
    <footer className="mt-auto" style={{ backgroundColor: "#FFFFFF", borderTop: `1px solid ${T.lineSoft}` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
        <p className="text-xs leading-relaxed max-w-3xl" style={{ color: T.muted }}>
          {t.footerLegal}
        </p>
      </div>
    </footer>
  );
}

/* ================================================================== */
/*  Portal chrome: header, nav, accessibility bar                      */
/* ================================================================== */
function PortalHeader({ t, lang, role, notifs, toggleNotifs, a11yOpen, setA11yOpen, onSignOut, hc }) {
  return (
    <header className="bg-white shrink-0 z-20 shadow-sm" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
      {/* Utility row */}
      <div className="max-w-full px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size="text-2xl" />
          {role === "provider" && (
            <span className="hidden sm:inline-block text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-full" style={{ backgroundColor: T.valueBlue, color: "#fff" }}>
              {t.providerHome}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Accessibility */}
          <button
            onClick={() => setA11yOpen((o) => !o)}
            aria-expanded={a11yOpen}
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 cursor-pointer text-sm font-bold transition-colors"
            style={{
              color: a11yOpen ? "#fff" : T.ink,
              backgroundColor: a11yOpen ? T.ink : "transparent",
              border: `2px solid ${a11yOpen ? T.ink : T.line}`,
            }}
          >
            <Accessibility size={18} aria-hidden="true" />
            <span className="hidden md:inline">{t.accessibility}</span>
          </button>
          {/* Notifications */}
          <button
            onClick={toggleNotifs}
            aria-pressed={notifs}
            aria-label={notifs ? t.notifOn : t.notifOff}
            className="rounded-lg p-2.5 cursor-pointer transition-colors"
            style={{
              color: notifs ? T.green : T.muted,
              border: `2px solid ${T.line}`,
              backgroundColor: "transparent"
            }}
          >
            {notifs ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          {/* Sign out */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 cursor-pointer text-sm font-bold transition-colors"
            style={{
              color: T.green,
              border: `2px solid ${T.line}`,
              backgroundColor: "transparent"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.greenTint)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t.signOut}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ t, nav, page, setPage }) {
  return (
    <aside
      className="shrink-0 w-full md:w-60"
      style={{ backgroundColor: T.wash, borderRight: `1px solid ${T.line}` }}
    >
      <nav
        className="flex md:flex-col gap-2 p-4 overflow-x-auto md:overflow-visible md:sticky md:top-0"
        aria-label="Sections"
      >
        {nav.map(({ key, label, icon: Icon, badge }) => {
          const active = page === key;
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
              style={{
                backgroundColor: active ? T.green : "transparent",
                color: active ? "#fff" : T.body,
                border: `2px solid ${active ? T.green : "transparent"}`,
                boxShadow: active ? "0 2px 8px rgba(0,145,75,0.2)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "#fff";
                  e.currentTarget.style.borderColor = T.line;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <Icon size={18} style={{ color: active ? "#fff" : T.green }} />
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className="ml-auto text-xs font-bold rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: active ? "#fff" : T.red, color: active ? T.green : "#fff" }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function A11yBar({ t, lang, setLang, scale, setScale, hc, setHc, simplified, setSimplified }) {
  const Toggle = ({ on, onClick, children }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="flex items-center gap-2 text-sm font-bold rounded-lg px-4 py-2.5 cursor-pointer transition-all"
      style={{
        backgroundColor: on ? T.ink : "#fff",
        color: on ? "#fff" : T.ink,
        border: `2px solid ${on ? T.ink : T.line}`,
      }}
    >
      {on && <Check size={14} />} {children}
    </button>
  );
  return (
    <div className="shrink-0 shadow-sm" style={{ backgroundColor: "#fff", borderBottom: `1px solid ${T.lineSoft}` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: T.ink }}>{t.textSize}</span>
          <button
            onClick={() => setScale((s) => Math.max(85, s - 10))}
            aria-label="Smaller text"
            className="rounded-lg p-2 cursor-pointer bg-white transition-colors"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.green)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold w-12 text-center" style={{ color: T.ink }}>{scale}%</span>
          <button
            onClick={() => setScale((s) => Math.min(145, s + 10))}
            aria-label="Larger text"
            className="rounded-lg p-2 cursor-pointer bg-white transition-colors"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.green)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.line)}
          >
            <Plus size={14} />
          </button>
        </div>
        <Toggle on={hc} onClick={() => setHc((v) => !v)}>{t.highContrast}</Toggle>
        <Toggle on={simplified} onClick={() => setSimplified((v) => !v)}>{t.simplified}</Toggle>
        <label className="flex items-center gap-3 text-sm font-bold" style={{ color: T.ink }}>
          {t.language}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg px-4 py-2.5 text-sm font-bold cursor-pointer outline-none bg-white"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Claims list                                                        */
/* ================================================================== */
function ExpandNote({ t }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-4 py-3.5 mb-5 text-sm font-bold leading-relaxed shadow-sm" style={{ backgroundColor: T.greenTint, color: T.ink, border: `1px solid ${T.green}40` }}>
      <Info size={18} className="mt-0.5 shrink-0" style={{ color: T.green }} />
      {t.expandNote}
    </div>
  );
}

function ClaimsTable({ t, lang, rows, role, onOpen, hc, simplified, sortKey, sortDir, onSort }) {
  const isProvider = role === "provider";
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm" style={{ border: `1px solid ${T.line}` }}>
      <table className="w-full text-left" style={{ minWidth: isProvider ? "58rem" : "44rem" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${T.line}`, backgroundColor: T.wash }}>
            {(isProvider
              ? [
                  { label: t.member }, { label: t.date }, { label: t.status },
                  { label: t.detectedIssue }, { label: t.suggestedFix },
                  { label: t.amountBilled }, { label: "" },
                ]
              : [
                  { label: t.service, key: "service" },
                  { label: t.date, key: "date" },
                  { label: t.status, key: "status" },
                  { label: t.amountBilled, key: "billed" },
                  { label: "" },
                ]
            ).map((col, i) => {
              const sortable = onSort && col.key;
              const active = sortKey === col.key;
              return (
                <th key={i} className="px-5 py-4 text-sm font-bold" style={{ color: T.ink }}>
                  {sortable ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1.5 cursor-pointer"
                      style={{ color: active ? T.green : T.ink, background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700 }}
                      aria-label={`${t.sortBy}: ${col.label}`}
                    >
                      {col.label}
                      {active
                        ? (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)
                        : <ArrowUpDown size={14} style={{ opacity: 0.4 }} />}
                    </button>
                  ) : col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={isProvider ? 7 : 5} className="px-5 py-12 text-center text-sm font-semibold" style={{ color: T.muted }}>
                {t.noResults}
              </td>
            </tr>
          )}
          {rows.map((c, i) => (
            <tr
              key={c.id}
              onClick={() => onOpen(c)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(c))}
              tabIndex={0}
              role="button"
              aria-label={`${t.viewDetails}: ${c.id}`}
              className="cursor-pointer align-top transition-colors"
              style={{ borderBottom: i < rows.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.greenTint)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td className="px-5 py-4">
                <div className="font-bold text-base" style={{ color: T.ink }}>
                  {isProvider ? c.member : c.service}
                </div>
                <div className="text-sm mt-1" style={{ color: T.body }}>
                  {isProvider
                    ? simplified ? c.provider : `DOB ${c.dob} · ${c.provider}`
                    : c.provider}
                </div>
                <div className="text-xs mt-1.5 font-semibold" style={{ color: T.muted, fontFamily: MONO }}>{c.id}</div>
              </td>
              <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: T.ink }}>{c.date}</td>
              <td className="px-5 py-4"><StatusChip status={c.status} lang={lang} hc={hc} /></td>
              {isProvider && (
                <>
                  <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: c.issue ? T.red : T.muted }}>
                    {c.issue || t.noIssue}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold whitespace-nowrap" style={{ color: c.fix ? T.green : T.muted }}>
                    {c.fix || t.noIssue}
                  </td>
                </>
              )}
              <td className="px-5 py-4 text-base font-bold whitespace-nowrap" style={{ color: T.ink }}>{money(c.billed)}</td>
              <td className="px-5 py-4 whitespace-nowrap text-right">
                <span className="inline-flex items-center gap-1 text-sm font-bold transition-colors" style={{ color: T.green }}>
                  {t.viewDetails} <ChevronRight size={16} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Claim detail modal                                                 */
/* ================================================================== */
function CostBar({ planPaid, memberOwes, billed }) {
  if (planPaid == null) return null;
  const covered = billed > 0 ? (planPaid / billed) * 100 : 0;
  const owed = billed > 0 ? ((memberOwes || 0) / billed) * 100 : 0;
  return (
    <div className="mt-4">
      <div className="h-3 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: T.grayBg }}>
        <div style={{ width: `${covered}%`, backgroundColor: T.green }} />
        <div style={{ width: `${owed}%`, backgroundColor: T.amber }} />
      </div>
    </div>
  );
}

function ClaimModal({ claim, role, t, lang, hc, simplified, onClose }) {
  const d = claim.detail;
  const isProvider = role === "provider";
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const facts = [
    { label: t.claimNumber, value: claim.id, mono: true },
    { label: t.provider, value: claim.provider },
    { label: t.dateOfService, value: claim.date },
    { label: t.owner, value: isProvider ? d.ownerRep : d.ownerMember },
    { label: t.resolutionEta, value: d.eta },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-xl my-4 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={t.claimDetails}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 flex items-start justify-between gap-4 sticky top-0 bg-white z-10 shadow-sm" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: T.body }}>{t.claimDetails}</div>
            <h2 className="text-xl sm:text-2xl font-bold leading-snug" style={{ color: T.ink }}>
              {claim.service}
            </h2>
            <div className="mt-2"><StatusChip status={claim.status} lang={lang} hc={hc} /></div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => window.print()} aria-label={t.print} className="cursor-pointer p-2.5 rounded-lg transition-colors" style={{ color: T.body, background: "none", border: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.wash)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Printer size={19} />
            </button>
            <button ref={closeRef} onClick={onClose} aria-label={t.close} className="cursor-pointer p-2.5 rounded-lg transition-colors" style={{ color: T.ink, background: "none", border: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.wash)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left */}
          <div className="lg:col-span-3 space-y-6">
            {/* Provider action banner */}
            {isProvider && d.actionRep && (
              <div className="flex items-start gap-3 rounded-lg px-4 py-4 shadow-sm" style={{ backgroundColor: T.amberBg, border: `2px solid ${T.amber}` }}>
                <AlertTriangle size={20} className="mt-0.5 shrink-0" style={{ color: T.amber }} />
                <div>
                  <div className="font-bold text-sm" style={{ color: T.ink }}>
                    {t.actionRequired}: {d.actionRep}
                  </div>
                  <div className="text-sm mt-1" style={{ color: T.body }}>{d.repSteps}</div>
                </div>
              </div>
            )}

            {/* Cost summary */}
            <section>
              <h3 className="text-base font-bold mb-3" style={{ color: T.ink }}>{t.costSummary}</h3>
              <div className="rounded-lg p-5 shadow-sm" style={{ border: `1px solid ${T.line}`, backgroundColor: "#fff" }}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t.amountBilled, value: money(claim.billed), color: T.ink },
                    { label: t.planPaid, value: money(claim.planPaid), color: T.green },
                    { label: t.youMayOwe, value: money(claim.memberOwes), color: claim.memberOwes ? T.amber : T.ink },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="text-sm font-bold mb-1" style={{ color: T.body }}>{f.label}</div>
                      <div className="text-xl font-bold" style={{ color: f.color }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                <CostBar planPaid={claim.planPaid} memberOwes={claim.memberOwes} billed={claim.billed} />
                {claim.planPaid == null && (
                  <p className="text-sm mt-3" style={{ color: T.muted }}>{t.pendingCost}</p>
                )}
              </div>
            </section>

            {/* About this claim */}
            <section>
              <h3 className="text-base font-bold mb-3" style={{ color: T.ink }}>{t.aboutClaim}</h3>
              <p className="leading-relaxed font-semibold" style={{ color: T.ink }}>{d.happened}</p>
              {!simplified && (
                <div className="mt-4 rounded-lg px-4 py-4" style={{ backgroundColor: T.wash }}>
                  <div className="text-sm font-bold mb-1" style={{ color: T.body }}>{t.reason}</div>
                  <p className="text-sm leading-relaxed" style={{ color: T.ink }}>{d.reason}</p>
                </div>
              )}
            </section>

            {/* Next steps for the reader */}
            <section>
              <h3 className="text-base font-bold mb-3" style={{ color: T.ink }}>{t.yourNextSteps}</h3>
              <p className="leading-relaxed font-semibold" style={{ color: T.ink }}>
                {isProvider ? d.repSteps : d.memberSteps}
              </p>
              {isProvider && d.cta && (
                <div className="mt-4"><PrimaryButton>{d.cta}</PrimaryButton></div>
              )}
            </section>
          </div>

          {/* Right rail */}
          <div className="lg:col-span-2 space-y-6">
            {/* Facts */}
            <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: T.wash }}>
              <dl className="space-y-4">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-sm font-bold mb-1" style={{ color: T.body }}>{f.label}</dt>
                    <dd className="font-bold text-sm" style={{ color: T.ink, fontFamily: f.mono ? MONO : FONT }}>
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* What happens next */}
            <div className="rounded-lg p-5 shadow-sm" style={{ border: `1px solid ${T.line}`, backgroundColor: "#fff" }}>
              <h3 className="text-base font-bold mb-4" style={{ color: T.ink }}>{t.whatNext}</h3>
              <ol>
                {d.next.map((step, i) => (
                  <li key={i} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: i === 0 ? T.green : "#fff",
                          color: i === 0 ? "#fff" : T.body,
                          border: i === 0 ? "none" : `2px solid ${T.line}`,
                        }}
                      >
                        {i + 1}
                      </div>
                      {i < d.next.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: T.line }} />}
                    </div>
                    <div className={i < d.next.length - 1 ? "pb-4" : ""}>
                      <div className="font-bold text-sm leading-snug" style={{ color: T.ink }}>{step.title}</div>
                      {step.sub && <div className="text-sm mt-1" style={{ color: T.body }}>{step.sub}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Review activity – provider only */}
            {isProvider && !simplified && (
              <div className="rounded-lg p-5 shadow-sm" style={{ border: `1px solid ${T.line}`, backgroundColor: "#fff" }}>
                <h3 className="text-base font-bold mb-4" style={{ color: T.ink }}>{t.reviewActivity}</h3>
                <ol>
                  {d.activity.map((a, i) => (
                    <li key={i} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: T.green }} />
                        {i < d.activity.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: T.lineSoft }} />}
                      </div>
                      <div className={i < d.activity.length - 1 ? "pb-4" : ""}>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-bold text-sm" style={{ color: T.ink }}>{a.check}</span>
                          <span className="text-xs font-semibold" style={{ color: T.muted }}>{a.time}</span>
                        </div>
                        <div className="text-sm mt-1" style={{ color: T.body }}>{a.note}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Help card – member only */}
            {!isProvider && (
              <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: T.greenTint, border: `1px solid ${T.green}40` }}>
                <div className="flex items-start gap-3">
                  <Phone size={20} className="shrink-0" style={{ color: T.green }} />
                  <div>
                    <h3 className="text-base font-bold mb-1" style={{ color: T.ink }}>{t.needHelp}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: T.ink }}>{t.callUs}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Member pages                                                       */
/* ================================================================== */
function SnapshotCards({ t }) {
  const mine = CLAIMS.filter((c) => c.member === MEMBER.name);
  const inReview = mine.filter((c) => c.status === "inprogress" || c.status === "pending").length;
  const completed = mine.filter((c) => c.status === "completed").length;
  const owe = mine.reduce((s, c) => s + (c.memberOwes || 0), 0);
  const cards = [
    { icon: FileText, label: t.totalClaims, value: String(mine.length), color: T.green, bg: T.greenTint },
    { icon: Clock, label: t.inReview, value: String(inReview), color: T.amber, bg: T.amberBg },
    { icon: CheckCircle2, label: t.completedCount, value: String(completed), color: T.green, bg: T.greenTint },
    { icon: Wallet, label: t.balanceOwe, value: money(owe), color: owe ? T.amber : T.green, bg: owe ? T.amberBg : T.greenTint },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className="rounded-lg bg-white p-5 shadow-sm" style={{ border: `2px solid ${T.line}` }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.body }}>{label}</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: T.ink }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function BenefitsCard({ t }) {
  const pct = Math.min(100, Math.round((BENEFITS.outOfPocketUsed / BENEFITS.outOfPocketMax) * 100));
  const rows = [
    { label: t.primaryCare, value: money(BENEFITS.primaryCare) },
    { label: t.specialistVisit, value: money(BENEFITS.specialist) },
    { label: t.emergencyRoom, value: money(BENEFITS.emergencyRoom) },
    { label: t.tier1Drugs, value: money(BENEFITS.tier1) },
  ];
  return (
    <section className="rounded-lg bg-white p-5 flex flex-col shadow-sm" style={{ border: `2px solid ${T.line}` }}>
      <h2 className="text-base font-bold mb-4" style={{ color: T.ink }}>{t.benefitsGlance}</h2>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm font-semibold" style={{ color: T.body }}>{r.label}</dt>
            <dd className="text-sm font-bold whitespace-nowrap" style={{ color: T.ink }}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 pt-5" style={{ borderTop: `2px solid ${T.lineSoft}` }}>
        <div className="text-sm font-bold mb-2" style={{ color: T.body }}>{t.outOfPocket}</div>
        <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: T.grayBg }}>
          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: T.green }} />
        </div>
        <div className="text-sm mt-2.5" style={{ color: T.ink }}>
          <span className="font-bold">{money(BENEFITS.outOfPocketUsed)}</span>{" "}
          <span style={{ color: T.body }}>{t.ofWord} {money(BENEFITS.outOfPocketMax)}</span>
        </div>
      </div>
      <p className="text-xs mt-5 leading-relaxed" style={{ color: T.muted }}>{t.benefitsAsk}</p>
    </section>
  );
}

function MemberInfoCard({ t }) {
  const rows = [
    { label: t.memberId, value: MEMBER.id, mono: true },
    { label: t.dateOfBirth, value: MEMBER.dob },
    { label: t.planLabel, value: BENEFITS.plan },
    { label: t.effectiveDate, value: BENEFITS.effective },
    { label: t.pcpLabel, value: MEMBER.pcp },
  ];
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm" style={{ border: `2px solid ${T.line}` }}>
      <h2 className="text-base font-bold mb-4" style={{ color: T.ink }}>{t.memberInfo}</h2>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm font-semibold shrink-0" style={{ color: T.body }}>{r.label}</dt>
            <dd className="text-sm font-bold text-right" style={{ color: T.ink, fontFamily: r.mono ? MONO : FONT }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SupportCard({ t }) {
  return (
    <section className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: T.greenTint, border: `1px solid ${T.green}40` }}>
      <div className="flex items-start gap-3">
        <Phone size={20} className="shrink-0" style={{ color: T.green }} />
        <div>
          <h2 className="text-base font-bold mb-1" style={{ color: T.ink }}>{t.needHelp}</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: T.ink }}>{t.callUs}</p>
          <TextLink onClick={() => {}}>{t.contactSupport}</TextLink>
        </div>
      </div>
    </section>
  );
}

function MemberHome({ t, lang, hc, simplified, onOpen, goClaims }) {
  const all = CLAIMS.filter((c) => c.member === MEMBER.name);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 w-full">
      <h1 className="text-3xl font-bold" style={{ color: T.ink }}>
        {t.goodMorning}, {MEMBER.first}
      </h1>
      <p className="mt-2 text-sm font-bold" style={{ color: T.body }}>
        {t.planName} · {t.memberId} {MEMBER.id}
      </p>

      <div className="mt-6"><SnapshotCards t={t} /></div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <BenefitsCard t={t} />
          <SupportCard t={t} />
        </div>
        <div className="lg:col-span-1">
          <MemberInfoCard t={t} />
        </div>
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
          <h2 className="text-xl font-bold" style={{ color: T.ink }}>{t.claimsOverview}</h2>
          <TextLink onClick={goClaims}>{t.viewAll}</TextLink>
        </div>
        <ClaimsTable t={t} lang={lang} rows={all} role="member" onOpen={onOpen} hc={hc} simplified={simplified} />
      </section>
    </div>
  );
}

function MemberClaims({ t, lang, hc, simplified, onOpen }) {
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const parseDate = (s) => { const [m, d, y] = s.split("/").map(Number); return new Date(y, m - 1, d).getTime(); };
  const statusOrder = { inprogress: 0, pending: 1, denied: 2, completed: 3 };

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "date" || key === "billed" ? "desc" : "asc"); }
  };

  const rows = useMemo(() => {
    let pool = CLAIMS.filter((c) => c.member === MEMBER.name);
    if (status !== "all") pool = pool.filter((c) => c.status === status);
    const q = filter.trim().toLowerCase();
    if (q) pool = pool.filter((c) =>
      [c.id, c.provider, c.service, c.date, String(c.billed)].join(" ").toLowerCase().includes(q));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...pool].sort((a, b) => {
      if (sortKey === "service") return dir * a.service.localeCompare(b.service);
      const av = sortKey === "date" ? parseDate(a.date) : sortKey === "status" ? statusOrder[a.status] : a.billed;
      const bv = sortKey === "date" ? parseDate(b.date) : sortKey === "status" ? statusOrder[b.status] : b.billed;
      return dir * (av - bv);
    });
  }, [filter, status, sortKey, sortDir]);

  const chips = [["all", t.chipAll], ...Object.entries(STATUS_LABEL[lang])];
  const sortOptions = [
    { key: "date-desc", label: t.sortRecent },
    { key: "date-asc", label: t.sortOldest },
    { key: "billed-desc", label: t.sortAmtHigh },
    { key: "billed-asc", label: t.sortAmtLow },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 w-full">
      <h1 className="text-3xl font-bold mb-6" style={{ color: T.ink }}>{t.allClaims}</h1>
      <ExpandNote t={t} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.filterClaims}
            aria-label={t.filterClaims}
            className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none bg-white shadow-sm"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
            onFocus={(e) => (e.target.style.borderColor = T.green)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
        </div>
        <label className="flex items-center gap-3 text-sm font-bold" style={{ color: T.body }}>
          <span className="whitespace-nowrap">{t.sortBy}</span>
          <select
            value={`${sortKey}-${sortDir}`}
            onChange={(e) => { const [k, d] = e.target.value.split("-"); setSortKey(k); setSortDir(d); }}
            aria-label={t.sortBy}
            className="rounded-lg px-4 py-3 text-sm font-bold cursor-pointer outline-none bg-white shadow-sm"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
          >
            {sortOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <span className="text-xs font-bold uppercase tracking-wide mr-1" style={{ color: T.muted }}>{t.filterStatus}</span>
        {chips.map(([key, label]) => {
          const active = status === key;
          return (
            <button
              key={key}
              onClick={() => setStatus(key)}
              aria-pressed={active}
              className="text-sm font-bold rounded-lg px-4 py-2 cursor-pointer transition-all"
              style={{
                backgroundColor: active ? T.green : "#fff",
                color: active ? "#fff" : T.ink,
                border: `2px solid ${active ? T.green : T.line}`,
                boxShadow: active ? "0 2px 8px rgba(0,145,75,0.2)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ClaimsTable
        t={t} lang={lang} rows={rows} role="member" onOpen={onOpen} hc={hc} simplified={simplified}
        sortKey={sortKey} sortDir={sortDir} onSort={onSort}
      />
    </div>
  );
}

/* ================================================================== */
/*  Issues page                                                        */
/* ================================================================== */
function IssueCard({ c, t, lang, hc, isProvider, onOpen }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm" style={{ border: `2px solid ${T.line}` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-bold text-base" style={{ color: T.ink }}>
            {isProvider ? c.member : c.service}
          </div>
          <div className="text-sm mt-1" style={{ color: T.body }}>
            {isProvider ? `${c.service} · ${c.provider}` : c.provider}
          </div>
          <div className="text-xs mt-1.5 font-semibold" style={{ color: T.muted, fontFamily: MONO }}>{c.id}</div>
        </div>
        <StatusChip status={c.status} lang={lang} hc={hc} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div className="rounded-lg px-4 py-3.5 shadow-sm" style={{ backgroundColor: hc ? "#fff" : T.redBg, border: hc ? `2px solid ${T.red}` : `1px solid ${T.red}40` }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: T.red }}>{t.detectedIssue}</div>
          <div className="text-sm font-bold" style={{ color: T.ink }}>{c.issue}</div>
        </div>
        <div className="rounded-lg px-4 py-3.5 shadow-sm" style={{ backgroundColor: hc ? "#fff" : T.greenTint, border: hc ? `2px solid ${T.green}` : `1px solid ${T.green}40` }}>
          <div className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: T.green }}>{t.suggestedFix}</div>
          <div className="text-sm font-bold" style={{ color: T.ink }}>{c.fix}</div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onOpen(c)}
          className="inline-flex items-center gap-1 text-sm font-bold cursor-pointer"
          style={{ color: T.green, background: "none", border: "none" }}
        >
          {t.viewDetails} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function IssuesPage({ t, lang, role, hc, onOpen }) {
  const isProvider = role === "provider";
  const pool = isProvider ? CLAIMS : CLAIMS.filter((c) => c.member === MEMBER.name);
  const rows = pool.filter((c) => c.issue);
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 w-full">
      <h1 className="text-3xl font-bold" style={{ color: T.ink }}>{t.issuesTitle}</h1>
      <p className="mt-2 mb-6 text-sm font-bold" style={{ color: T.body }}>{t.issuesSub}</p>
      {rows.length === 0 ? (
        <div className="rounded-lg bg-white p-8 flex items-center gap-3 shadow-sm" style={{ border: `2px solid ${T.line}` }}>
          <div className="rounded-full p-2" style={{ backgroundColor: T.greenTint }}>
            <CheckCircle2 size={24} style={{ color: T.green }} />
          </div>
          <span className="text-sm font-bold" style={{ color: T.ink }}>
            {isProvider ? t.noOpenIssuesProvider : t.noOpenIssues}
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => (
            <IssueCard key={c.id} c={c} t={t} lang={lang} hc={hc} isProvider={isProvider} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Timeline page – sortable, incl. by issue                           */
/* ================================================================== */
const parseClaimDate = (s) => { const [m, d, y] = s.split("/").map(Number); return new Date(y, m - 1, d).getTime(); };

function TimelinePage({ t, lang, role, hc, onOpen }) {
  const isProvider = role === "provider";
  const pool = isProvider ? CLAIMS : CLAIMS.filter((c) => c.member === MEMBER.name);
  const [sort, setSort] = useState("recent");

  const sorted = useMemo(() => {
    const arr = [...pool];
    if (sort === "oldest") arr.sort((a, b) => parseClaimDate(a.date) - parseClaimDate(b.date));
    else if (sort === "issue") {
      arr.sort((a, b) => {
        const ai = a.issue || "￿", bi = b.issue || "￿";
        return ai.localeCompare(bi) || parseClaimDate(b.date) - parseClaimDate(a.date);
      });
    } else arr.sort((a, b) => parseClaimDate(b.date) - parseClaimDate(a.date));
    return arr;
  }, [pool, sort]);

  const groupByIssue = sort === "issue";

  const options = [
    { key: "recent", label: t.sortRecent },
    { key: "oldest", label: t.sortOldest },
    { key: "issue", label: t.byIssue },
  ];

  let lastGroup = null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 w-full">
      <h1 className="text-3xl font-bold" style={{ color: T.ink }}>{t.timelineTitle}</h1>
      <p className="mt-2 mb-6 text-sm font-bold" style={{ color: T.body }}>{t.timelineSub}</p>

      <label className="flex items-center gap-3 text-sm font-bold mb-6" style={{ color: T.body }}>
        <span className="whitespace-nowrap">{t.timelineSort}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={t.timelineSort}
          className="rounded-lg px-4 py-3 text-sm font-bold cursor-pointer outline-none bg-white shadow-sm"
          style={{ border: `2px solid ${T.line}`, color: T.ink }}
        >
          {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>

      <div>
        {sorted.map((c, i) => {
          const group = c.issue || t.noIssueFlag;
          const showHeader = groupByIssue && group !== lastGroup;
          lastGroup = group;
          const last = i === sorted.length - 1;
          return (
            <div key={c.id}>
              {showHeader && (
                <div className="flex items-center gap-2.5 mb-4 mt-3" style={{ color: c.issue ? T.red : T.green }}>
                  <div className="rounded-lg p-2" style={{ backgroundColor: c.issue ? T.redBg : T.greenTint }}>
                    {c.issue ? <AlertTriangle size={18} /> : <Check size={18} />}
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wide">{group}</h2>
                </div>
              )}
              <div className="flex gap-4">
                {/* rail */}
                <div className="flex flex-col items-center pt-2">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{
                      backgroundColor: c.issue ? T.red : T.green,
                      border: `3px solid ${T.page}`,
                      boxShadow: `0 0 0 2px ${c.issue ? T.red : T.green}`
                    }}
                  />
                  {!last && <div className="w-0.5 flex-1 my-2" style={{ backgroundColor: T.line, minHeight: "1.5rem" }} />}
                </div>
                {/* card */}
                <div
                  className="flex-1 rounded-lg bg-white p-5 mb-4 cursor-pointer transition-all shadow-sm"
                  style={{ border: `2px solid ${T.line}` }}
                  onClick={() => onOpen(c)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(c))}
                  tabIndex={0}
                  role="button"
                  aria-label={`${t.viewDetails}: ${c.id}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = T.greenTint;
                    e.currentTarget.style.borderColor = T.green;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                    e.currentTarget.style.borderColor = T.line;
                  }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xs font-bold mb-1" style={{ color: T.muted }}>{c.date}</div>
                      <div className="font-bold text-base" style={{ color: T.ink }}>
                        {isProvider ? `${c.member} · ${c.service}` : c.service}
                      </div>
                      <div className="text-sm mt-1" style={{ color: T.body }}>{c.provider}</div>
                    </div>
                    <StatusChip status={c.status} lang={lang} hc={hc} />
                  </div>
                  {c.issue && (
                    <div className="flex items-center gap-2 mt-3 text-sm font-bold" style={{ color: T.red }}>
                      <AlertTriangle size={15} /> {c.issue}
                      <span className="font-bold" style={{ color: T.body }}>· {t.suggestedFix}: {c.fix}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProviderDashboard({ t, lang, hc, simplified, onOpen }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const rows = useMemo(() => {
    const q = (query + " " + filter).trim().toLowerCase();
    if (!q) return CLAIMS;
    const terms = q.split(/\s+/);
    return CLAIMS.filter((c) =>
      terms.every((term) =>
        [c.id, c.member, c.dob, c.provider, c.service, c.date, c.issue || "", c.fix || "", String(c.billed)]
          .join(" ").toLowerCase().includes(term)
      )
    );
  }, [query, filter]);

  const openCount = CLAIMS.filter((c) => c.issue).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 pb-24 w-full">
      <h1 className="text-3xl font-bold mb-6" style={{ color: T.ink }}>{t.workQueue}</h1>

      {/* Member search */}
      <section className="rounded-lg bg-white p-6 mb-6 shadow-sm" style={{ border: `2px solid ${T.line}` }}>
        <h2 className="text-base font-bold mb-4" style={{ color: T.ink }}>{t.memberSearch}</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.memberSearch}
              className="w-full rounded-lg pl-12 pr-4 py-3.5 text-sm outline-none"
              style={{ border: `2px solid ${T.line}`, color: T.ink }}
              onFocus={(e) => (e.target.style.borderColor = T.green)}
              onBlur={(e) => (e.target.style.borderColor = T.line)}
            />
          </div>
          <PrimaryButton>{t.searchBtn}</PrimaryButton>
        </div>
      </section>

      <div className="flex items-baseline justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm font-bold" style={{ color: T.body }}>
          <span style={{ color: T.ink }}>{rows.length}</span> {lang === "es" ? "reclamos" : "claims"} · <span style={{ color: openCount ? T.red : T.green }}>{openCount}</span> {lang === "es" ? "con problemas abiertos" : "with open issues"}
        </p>
        <div className="relative sm:w-72 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.filterClaims}
            aria-label={t.filterClaims}
            className="w-full rounded-lg pl-11 pr-4 py-2.5 text-sm outline-none bg-white shadow-sm"
            style={{ border: `2px solid ${T.line}`, color: T.ink }}
            onFocus={(e) => (e.target.style.borderColor = T.green)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
        </div>
      </div>
      <ExpandNote t={t} />
      <ClaimsTable t={t} lang={lang} rows={rows} role="provider" onOpen={onOpen} hc={hc} simplified={simplified} />
    </div>
  );
}

/* ================================================================== */
/*  Root app                                                           */
/* ================================================================== */
export default function HumanaPortal() {
  const [lang, setLang] = useState("en");
  const [session, setSession] = useState(null); // { role: 'member'|'provider' }
  const [page, setPage] = useState("home");
  const [notifs, setNotifs] = useState(true);
  const [toast, setToast] = useState(null);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [scale, setScale] = useState(100);
  const [hc, setHc] = useState(false);
  const [simplified, setSimplified] = useState(false);
  const [selected, setSelected] = useState(null);

  const t = STR[lang];

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [scale]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  };

  const signIn = (role) => {
    setSession({ role });
    setPage(role === "member" ? "home" : "claims");
    setSelected(null);
  };
  const signOut = () => {
    setSession(null);
    setA11yOpen(false);
    setSelected(null);
  };

  const textColor = hc ? "#000000" : T.ink;

  const shellStyle = {
    fontFamily: FONT,
    color: textColor,
    backgroundColor: session ? T.wash : T.wash,
  };

  if (!session) {
    return (
      <div className="h-screen flex flex-col overflow-y-auto" style={shellStyle}>
        <GlobalStyle />
        <div className="w-full shrink-0" style={{ height: "5px", backgroundColor: T.green }} />
        <SignIn t={t} lang={lang} setLang={setLang} onSignIn={signIn} />
      </div>
    );
  }

  const isMember = session.role === "member";
  const issueCount = (isMember ? CLAIMS.filter((c) => c.member === MEMBER.name) : CLAIMS).filter((c) => c.issue).length;
  const nav = isMember
    ? [
        { key: "home", label: t.home, icon: Home },
        { key: "claims", label: t.claims, icon: FileText },
        { key: "issues", label: t.navIssues, icon: AlertTriangle, badge: issueCount },
        { key: "timeline", label: t.navTimeline, icon: Activity },
      ]
    : [
        { key: "claims", label: t.claims, icon: FileText },
        { key: "issues", label: t.navIssues, icon: AlertTriangle, badge: issueCount },
        { key: "timeline", label: t.navTimeline, icon: Activity },
      ];

  let content;
  if (isMember) {
    if (page === "home") content = <MemberHome t={t} lang={lang} hc={hc} simplified={simplified} onOpen={setSelected} goClaims={() => setPage("claims")} />;
    else if (page === "claims") content = <MemberClaims t={t} lang={lang} hc={hc} simplified={simplified} onOpen={setSelected} />;
    else if (page === "issues") content = <IssuesPage t={t} lang={lang} role="member" hc={hc} onOpen={setSelected} />;
    else content = <TimelinePage t={t} lang={lang} role="member" hc={hc} onOpen={setSelected} />;
  } else {
    if (page === "issues") content = <IssuesPage t={t} lang={lang} role="provider" hc={hc} onOpen={setSelected} />;
    else if (page === "timeline") content = <TimelinePage t={t} lang={lang} role="provider" hc={hc} onOpen={setSelected} />;
    else content = <ProviderDashboard t={t} lang={lang} hc={hc} simplified={simplified} onOpen={setSelected} />;
  }

  return (
    <div className="h-screen flex flex-col" style={shellStyle}>
      <GlobalStyle />
      <div className="w-full shrink-0" style={{ height: "5px", backgroundColor: T.green }} />
      <PortalHeader
        t={t} lang={lang}
        role={session.role}
        notifs={notifs}
        toggleNotifs={() => setNotifs((n) => { showToast(!n ? t.notifOn : t.notifOff); return !n; })}
        a11yOpen={a11yOpen} setA11yOpen={setA11yOpen}
        onSignOut={signOut}
        hc={hc}
      />
      <ValuesBanner t={t} />
      {a11yOpen && (
        <A11yBar
          t={t} lang={lang} setLang={setLang}
          scale={scale} setScale={setScale}
          hc={hc} setHc={setHc}
          simplified={simplified} setSimplified={setSimplified}
        />
      )}

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <Sidebar t={t} nav={nav} page={page} setPage={setPage} />
        <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {content}
          <SiteFooter t={t} />
        </main>
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 rounded-lg px-6 py-3.5 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: T.ink }}>
          {toast}
        </div>
      )}

      {selected && (
        <ClaimModal
          claim={selected}
          role={session.role}
          t={t} lang={lang} hc={hc} simplified={simplified}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
