import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase (cloud data layer) ───────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const isPriaboraKey = k => k.startsWith("priabora-") || k.startsWith("elem-note-") || k.startsWith("elem-override-");

// ── Fonts & global styles ─────────────────────────────────────────────────────
const GlobalStyles = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; overflow-wrap: break-word; word-break: break-word; }
      html, body { height: 100%; overflow: hidden; background: #07090f; }
      #root { height: 100%; }
      ::-webkit-scrollbar { width: 6px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0d1017; }
      ::-webkit-scrollbar-thumb { background: #2a3045; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: #3a4260; }
      @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      @keyframes slideIn  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
      @keyframes slideUp  { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
      @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
      .fade-up   { animation: fadeUp  0.28s ease both; }
      .fade-up-1 { animation: fadeUp  0.28s 0.05s ease both; }
      .fade-up-2 { animation: fadeUp  0.28s 0.10s ease both; }
      .slide-in  { animation: slideIn 0.25s ease both; }
      .slide-up  { animation: slideUp 0.3s ease both; }
      .fade-in   { animation: fadeIn  0.2s ease both; }
      .hover-row:hover { background: #ffffff05 !important; }
      input[data-script-mode="sup"], textarea[data-script-mode="sup"] { border-color: #3b82f6 !important; box-shadow: 0 0 0 1px #3b82f688 !important; }
      input[data-script-mode="sub"], textarea[data-script-mode="sub"] { border-color: #f472b6 !important; box-shadow: 0 0 0 1px #f472b688 !important; }
      textarea:focus, input:focus { outline: none; }
      button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
      /* Mobile safe area */
      .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
    `}</style>
  </>
);

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#07090f", surface:"#0c0f18", panel:"#10141f",
  border:"#1a1f2e", borderHi:"#2a3045",
  text:"#d8dce8", muted:"#5a6278", faint:"#23283a",
  blue:"#3b82f6", green:"#34d399", pink:"#f472b6",
  yellow:"#fbbf24", orange:"#fb923c", purple:"#a78bfa", teal:"#2dd4bf",
  red:"#f87171",
};
const CAT_COLOR = { Compound:C.green, Reaction:C.blue, Mechanism:C.pink, Concept:C.yellow, Reagent:C.orange };
const DEFAULT_CATEGORIES = [
  {id:"Compound",label:"Compound",color:C.green},
  {id:"Reaction",label:"Reaction",color:C.blue},
  {id:"Mechanism",label:"Mechanism",color:C.pink},
  {id:"Concept",label:"Concept",color:C.yellow},
  {id:"Reagent",label:"Reagent",color:C.orange},
];
const CAT_PALETTE = [C.blue,C.green,C.pink,C.yellow,C.orange,C.purple,C.teal,C.red,"#818cf8","#f97316"];
// Property fields shown for DB entries categorised as "Compound" — mirrors the Periodic
// Table's Props tab pattern, but stored on the entry itself as entry.properties.
const COMPOUND_PROPERTY_FIELDS = [
  ["formula","Molecular Formula"],
  ["molarMass","Molar Mass (g/mol)"],
  ["meltingPoint","Melting Pt (°C)"],
  ["boilingPoint","Boiling Pt (°C)"],
  ["density","Density (g/cm³)"],
  ["state","State at RT"],
  ["solubility","Solubility"],
  ["appearance","Appearance"],
];
const catColor=(id,categories)=> (categories||DEFAULT_CATEGORIES).find(c=>c.id===id)?.color || CAT_COLOR[id] || C.blue;
const getEntryCats=e=> (e.categories&&e.categories.length) ? e.categories : (e.category?[e.category]:[]);
const getEntrySubs=e=> e.subcategories||[];
const mono  = "'Georgia', serif";
const serif = "'Lora', serif";

// ── Admin identity ─────────────────────────────────────────────────────────
// Whoever types this exact name (case-insensitive) into the name prompt below
// gets admin privileges — locking/unlocking entries. This is a client-side-only
// soft check, not real authentication: fine for a small trusted group, not a
// real security boundary. Change this to your own secret name.
const ADMIN_NAME = "marcus brody";

// ── Sub/superscript typing shortcuts ──────────────────────────────────────────
// Ctrl/Cmd+Shift+= toggles superscript-typing mode; Ctrl/Cmd+Shift+- toggles subscript.
// With text selected, the same shortcut converts the selection instead of toggling a mode.
// Mode lives on the DOM node itself (data-script-mode), not React state, so this works on
// any number of fields — including ones rendered in a loop, like data table cells — without
// extra component state or breaking the rules of hooks.
const SUP_MAP = {
  "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹",
  "+":"⁺","-":"⁻","=":"⁼","(":"⁽",")":"⁾",
  "a":"ᵃ","b":"ᵇ","c":"ᶜ","d":"ᵈ","e":"ᵉ","f":"ᶠ","g":"ᵍ","h":"ʰ","i":"ⁱ","j":"ʲ","k":"ᵏ","l":"ˡ","m":"ᵐ","n":"ⁿ","o":"ᵒ","p":"ᵖ","r":"ʳ","s":"ˢ","t":"ᵗ","u":"ᵘ","v":"ᵛ","w":"ʷ","x":"ˣ","y":"ʸ","z":"ᶻ",
  "A":"ᴬ","B":"ᴮ","D":"ᴰ","E":"ᴱ","G":"ᴳ","H":"ᴴ","I":"ᴵ","J":"ᴶ","K":"ᴷ","L":"ᴸ","M":"ᴹ","N":"ᴺ","O":"ᴼ","P":"ᴾ","R":"ᴿ","T":"ᵀ","U":"ᵁ","V":"ⱽ","W":"ᵂ",
};
const SUB_MAP = {
  "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉",
  "+":"₊","-":"₋","=":"₌","(":"₍",")":"₎",
  "a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ",
};
// Returns true if it handled the keystroke (caller should stop further processing).
function handleScriptKeyDown(e, value, onChange) {
  const el = e.target;
  if (typeof el.selectionStart !== "number") return false;
  const modKey = e.ctrlKey || e.metaKey;
  const isSupToggle = modKey && e.shiftKey && (e.key === "=" || e.key === "+");
  const isSubToggle = modKey && e.shiftKey && (e.key === "-" || e.key === "_");
  if (isSupToggle || isSubToggle) {
    e.preventDefault();
    const map = isSupToggle ? SUP_MAP : SUB_MAP;
    const targetMode = isSupToggle ? "sup" : "sub";
    const start = el.selectionStart, end = el.selectionEnd;
    if (start !== end) {
      const selected = value.slice(start, end);
      const converted = [...selected].map(ch => map[ch] || map[ch.toLowerCase()] || ch).join("");
      const newValue = value.slice(0, start) + converted + value.slice(end);
      onChange({ target: { value: newValue } });
      requestAnimationFrame(() => { try { el.selectionStart = start; el.selectionEnd = start + converted.length; } catch {} });
    } else {
      if (el.dataset.scriptMode === targetMode) delete el.dataset.scriptMode;
      else el.dataset.scriptMode = targetMode;
    }
    return true;
  }
  if (e.key === "Escape" && el.dataset.scriptMode) {
    delete el.dataset.scriptMode;
    return true;
  }
  const mode = el.dataset.scriptMode;
  if (mode && e.key.length === 1 && !modKey && !e.altKey) {
    const map = mode === "sup" ? SUP_MAP : SUB_MAP;
    const mapped = map[e.key] || map[e.key.toLowerCase()] || e.key;
    e.preventDefault();
    const start = el.selectionStart, end = el.selectionEnd;
    const newValue = value.slice(0, start) + mapped + value.slice(end);
    onChange({ target: { value: newValue } });
    const pos = start + mapped.length;
    requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = pos; } catch {} });
    return true;
  }
  return false;
}

// ── Breakpoint hook ───────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ── Local user identity ───────────────────────────────────────────────────────
// The name someone types in on first visit. Deliberately local-only (browser
// localStorage), never synced to Supabase — it's just a tag for attribution
// ("added by ___", "locked by ___"), not a real account system.
function useUsername() {
  const [username, setUsernameState] = useState(() => {
    try { return localStorage.getItem("priabora-username") || ""; } catch { return ""; }
  });
  const setUsername = useCallback(name => {
    try { localStorage.setItem("priabora-username", name); } catch {}
    setUsernameState(name);
  }, []);
  return [username, setUsername];
}

// ── Element category colours ──────────────────────────────────────────────────
const ELEM_CAT = {
  "alkali metal":"#ef4444","alkaline earth metal":"#f97316","transition metal":"#3b82f6",
  "post-transition metal":"#6366f1","metalloid":"#8b5cf6","nonmetal":"#22c55e",
  "halogen":"#06b6d4","noble gas":"#ec4899","lanthanide":"#f59e0b","actinide":"#84cc16",
};
const ELEM_CAT_LABELS = {
  "alkali metal":"Alkali Metal","alkaline earth metal":"Alkaline Earth","transition metal":"Transition Metal",
  "post-transition metal":"Post-transition","metalloid":"Metalloid","nonmetal":"Nonmetal",
  "halogen":"Halogen","noble gas":"Noble Gas","lanthanide":"Lanthanide","actinide":"Actinide",
};

// ── All 118 elements ──────────────────────────────────────────────────────────
const ELEMENTS = [
  {n:1,sym:"H",name:"Hydrogen",cat:"nonmetal",mass:1.008,period:1,group:1},
  {n:2,sym:"He",name:"Helium",cat:"noble gas",mass:4.003,period:1,group:18},
  {n:3,sym:"Li",name:"Lithium",cat:"alkali metal",mass:6.941,period:2,group:1},
  {n:4,sym:"Be",name:"Beryllium",cat:"alkaline earth metal",mass:9.012,period:2,group:2},
  {n:5,sym:"B",name:"Boron",cat:"metalloid",mass:10.811,period:2,group:13},
  {n:6,sym:"C",name:"Carbon",cat:"nonmetal",mass:12.011,period:2,group:14},
  {n:7,sym:"N",name:"Nitrogen",cat:"nonmetal",mass:14.007,period:2,group:15},
  {n:8,sym:"O",name:"Oxygen",cat:"nonmetal",mass:15.999,period:2,group:16},
  {n:9,sym:"F",name:"Fluorine",cat:"halogen",mass:18.998,period:2,group:17},
  {n:10,sym:"Ne",name:"Neon",cat:"noble gas",mass:20.180,period:2,group:18},
  {n:11,sym:"Na",name:"Sodium",cat:"alkali metal",mass:22.990,period:3,group:1},
  {n:12,sym:"Mg",name:"Magnesium",cat:"alkaline earth metal",mass:24.305,period:3,group:2},
  {n:13,sym:"Al",name:"Aluminium",cat:"post-transition metal",mass:26.982,period:3,group:13},
  {n:14,sym:"Si",name:"Silicon",cat:"metalloid",mass:28.086,period:3,group:14},
  {n:15,sym:"P",name:"Phosphorus",cat:"nonmetal",mass:30.974,period:3,group:15},
  {n:16,sym:"S",name:"Sulfur",cat:"nonmetal",mass:32.065,period:3,group:16},
  {n:17,sym:"Cl",name:"Chlorine",cat:"halogen",mass:35.453,period:3,group:17},
  {n:18,sym:"Ar",name:"Argon",cat:"noble gas",mass:39.948,period:3,group:18},
  {n:19,sym:"K",name:"Potassium",cat:"alkali metal",mass:39.098,period:4,group:1},
  {n:20,sym:"Ca",name:"Calcium",cat:"alkaline earth metal",mass:40.078,period:4,group:2},
  {n:21,sym:"Sc",name:"Scandium",cat:"transition metal",mass:44.956,period:4,group:3},
  {n:22,sym:"Ti",name:"Titanium",cat:"transition metal",mass:47.867,period:4,group:4},
  {n:23,sym:"V",name:"Vanadium",cat:"transition metal",mass:50.942,period:4,group:5},
  {n:24,sym:"Cr",name:"Chromium",cat:"transition metal",mass:51.996,period:4,group:6},
  {n:25,sym:"Mn",name:"Manganese",cat:"transition metal",mass:54.938,period:4,group:7},
  {n:26,sym:"Fe",name:"Iron",cat:"transition metal",mass:55.845,period:4,group:8},
  {n:27,sym:"Co",name:"Cobalt",cat:"transition metal",mass:58.933,period:4,group:9},
  {n:28,sym:"Ni",name:"Nickel",cat:"transition metal",mass:58.693,period:4,group:10},
  {n:29,sym:"Cu",name:"Copper",cat:"transition metal",mass:63.546,period:4,group:11},
  {n:30,sym:"Zn",name:"Zinc",cat:"transition metal",mass:65.38,period:4,group:12},
  {n:31,sym:"Ga",name:"Gallium",cat:"post-transition metal",mass:69.723,period:4,group:13},
  {n:32,sym:"Ge",name:"Germanium",cat:"metalloid",mass:72.630,period:4,group:14},
  {n:33,sym:"As",name:"Arsenic",cat:"metalloid",mass:74.922,period:4,group:15},
  {n:34,sym:"Se",name:"Selenium",cat:"nonmetal",mass:78.971,period:4,group:16},
  {n:35,sym:"Br",name:"Bromine",cat:"halogen",mass:79.904,period:4,group:17},
  {n:36,sym:"Kr",name:"Krypton",cat:"noble gas",mass:83.798,period:4,group:18},
  {n:37,sym:"Rb",name:"Rubidium",cat:"alkali metal",mass:85.468,period:5,group:1},
  {n:38,sym:"Sr",name:"Strontium",cat:"alkaline earth metal",mass:87.620,period:5,group:2},
  {n:39,sym:"Y",name:"Yttrium",cat:"transition metal",mass:88.906,period:5,group:3},
  {n:40,sym:"Zr",name:"Zirconium",cat:"transition metal",mass:91.224,period:5,group:4},
  {n:41,sym:"Nb",name:"Niobium",cat:"transition metal",mass:92.906,period:5,group:5},
  {n:42,sym:"Mo",name:"Molybdenum",cat:"transition metal",mass:95.960,period:5,group:6},
  {n:43,sym:"Tc",name:"Technetium",cat:"transition metal",mass:98,period:5,group:7},
  {n:44,sym:"Ru",name:"Ruthenium",cat:"transition metal",mass:101.07,period:5,group:8},
  {n:45,sym:"Rh",name:"Rhodium",cat:"transition metal",mass:102.906,period:5,group:9},
  {n:46,sym:"Pd",name:"Palladium",cat:"transition metal",mass:106.42,period:5,group:10},
  {n:47,sym:"Ag",name:"Silver",cat:"transition metal",mass:107.868,period:5,group:11},
  {n:48,sym:"Cd",name:"Cadmium",cat:"transition metal",mass:112.414,period:5,group:12},
  {n:49,sym:"In",name:"Indium",cat:"post-transition metal",mass:114.818,period:5,group:13},
  {n:50,sym:"Sn",name:"Tin",cat:"post-transition metal",mass:118.710,period:5,group:14},
  {n:51,sym:"Sb",name:"Antimony",cat:"metalloid",mass:121.760,period:5,group:15},
  {n:52,sym:"Te",name:"Tellurium",cat:"metalloid",mass:127.60,period:5,group:16},
  {n:53,sym:"I",name:"Iodine",cat:"halogen",mass:126.904,period:5,group:17},
  {n:54,sym:"Xe",name:"Xenon",cat:"noble gas",mass:131.293,period:5,group:18},
  {n:55,sym:"Cs",name:"Caesium",cat:"alkali metal",mass:132.905,period:6,group:1},
  {n:56,sym:"Ba",name:"Barium",cat:"alkaline earth metal",mass:137.327,period:6,group:2},
  {n:57,sym:"La",name:"Lanthanum",cat:"lanthanide",mass:138.905,period:6,group:3},
  {n:58,sym:"Ce",name:"Cerium",cat:"lanthanide",mass:140.116,period:8,group:4},
  {n:59,sym:"Pr",name:"Praseodymium",cat:"lanthanide",mass:140.908,period:8,group:5},
  {n:60,sym:"Nd",name:"Neodymium",cat:"lanthanide",mass:144.242,period:8,group:6},
  {n:61,sym:"Pm",name:"Promethium",cat:"lanthanide",mass:145,period:8,group:7},
  {n:62,sym:"Sm",name:"Samarium",cat:"lanthanide",mass:150.36,period:8,group:8},
  {n:63,sym:"Eu",name:"Europium",cat:"lanthanide",mass:151.964,period:8,group:9},
  {n:64,sym:"Gd",name:"Gadolinium",cat:"lanthanide",mass:157.25,period:8,group:10},
  {n:65,sym:"Tb",name:"Terbium",cat:"lanthanide",mass:158.925,period:8,group:11},
  {n:66,sym:"Dy",name:"Dysprosium",cat:"lanthanide",mass:162.500,period:8,group:12},
  {n:67,sym:"Ho",name:"Holmium",cat:"lanthanide",mass:164.930,period:8,group:13},
  {n:68,sym:"Er",name:"Erbium",cat:"lanthanide",mass:167.259,period:8,group:14},
  {n:69,sym:"Tm",name:"Thulium",cat:"lanthanide",mass:168.934,period:8,group:15},
  {n:70,sym:"Yb",name:"Ytterbium",cat:"lanthanide",mass:173.045,period:8,group:16},
  {n:71,sym:"Lu",name:"Lutetium",cat:"lanthanide",mass:174.967,period:8,group:17},
  {n:72,sym:"Hf",name:"Hafnium",cat:"transition metal",mass:178.49,period:6,group:4},
  {n:73,sym:"Ta",name:"Tantalum",cat:"transition metal",mass:180.948,period:6,group:5},
  {n:74,sym:"W",name:"Tungsten",cat:"transition metal",mass:183.84,period:6,group:6},
  {n:75,sym:"Re",name:"Rhenium",cat:"transition metal",mass:186.207,period:6,group:7},
  {n:76,sym:"Os",name:"Osmium",cat:"transition metal",mass:190.23,period:6,group:8},
  {n:77,sym:"Ir",name:"Iridium",cat:"transition metal",mass:192.217,period:6,group:9},
  {n:78,sym:"Pt",name:"Platinum",cat:"transition metal",mass:195.084,period:6,group:10},
  {n:79,sym:"Au",name:"Gold",cat:"transition metal",mass:196.967,period:6,group:11},
  {n:80,sym:"Hg",name:"Mercury",cat:"transition metal",mass:200.592,period:6,group:12},
  {n:81,sym:"Tl",name:"Thallium",cat:"post-transition metal",mass:204.383,period:6,group:13},
  {n:82,sym:"Pb",name:"Lead",cat:"post-transition metal",mass:207.2,period:6,group:14},
  {n:83,sym:"Bi",name:"Bismuth",cat:"post-transition metal",mass:208.980,period:6,group:15},
  {n:84,sym:"Po",name:"Polonium",cat:"post-transition metal",mass:209,period:6,group:16},
  {n:85,sym:"At",name:"Astatine",cat:"halogen",mass:210,period:6,group:17},
  {n:86,sym:"Rn",name:"Radon",cat:"noble gas",mass:222,period:6,group:18},
  {n:87,sym:"Fr",name:"Francium",cat:"alkali metal",mass:223,period:7,group:1},
  {n:88,sym:"Ra",name:"Radium",cat:"alkaline earth metal",mass:226,period:7,group:2},
  {n:89,sym:"Ac",name:"Actinium",cat:"actinide",mass:227,period:7,group:3},
  {n:90,sym:"Th",name:"Thorium",cat:"actinide",mass:232.038,period:9,group:4},
  {n:91,sym:"Pa",name:"Protactinium",cat:"actinide",mass:231.036,period:9,group:5},
  {n:92,sym:"U",name:"Uranium",cat:"actinide",mass:238.029,period:9,group:6},
  {n:93,sym:"Np",name:"Neptunium",cat:"actinide",mass:237,period:9,group:7},
  {n:94,sym:"Pu",name:"Plutonium",cat:"actinide",mass:244,period:9,group:8},
  {n:95,sym:"Am",name:"Americium",cat:"actinide",mass:243,period:9,group:9},
  {n:96,sym:"Cm",name:"Curium",cat:"actinide",mass:247,period:9,group:10},
  {n:97,sym:"Bk",name:"Berkelium",cat:"actinide",mass:247,period:9,group:11},
  {n:98,sym:"Cf",name:"Californium",cat:"actinide",mass:251,period:9,group:12},
  {n:99,sym:"Es",name:"Einsteinium",cat:"actinide",mass:252,period:9,group:13},
  {n:100,sym:"Fm",name:"Fermium",cat:"actinide",mass:257,period:9,group:14},
  {n:101,sym:"Md",name:"Mendelevium",cat:"actinide",mass:258,period:9,group:15},
  {n:102,sym:"No",name:"Nobelium",cat:"actinide",mass:259,period:9,group:16},
  {n:103,sym:"Lr",name:"Lawrencium",cat:"actinide",mass:266,period:9,group:17},
  {n:104,sym:"Rf",name:"Rutherfordium",cat:"transition metal",mass:267,period:7,group:4},
  {n:105,sym:"Db",name:"Dubnium",cat:"transition metal",mass:268,period:7,group:5},
  {n:106,sym:"Sg",name:"Seaborgium",cat:"transition metal",mass:271,period:7,group:6},
  {n:107,sym:"Bh",name:"Bohrium",cat:"transition metal",mass:272,period:7,group:7},
  {n:108,sym:"Hs",name:"Hassium",cat:"transition metal",mass:270,period:7,group:8},
  {n:109,sym:"Mt",name:"Meitnerium",cat:"transition metal",mass:278,period:7,group:9},
  {n:110,sym:"Ds",name:"Darmstadtium",cat:"transition metal",mass:281,period:7,group:10},
  {n:111,sym:"Rg",name:"Roentgenium",cat:"transition metal",mass:282,period:7,group:11},
  {n:112,sym:"Cn",name:"Copernicium",cat:"transition metal",mass:285,period:7,group:12},
  {n:113,sym:"Nh",name:"Nihonium",cat:"post-transition metal",mass:286,period:7,group:13},
  {n:114,sym:"Fl",name:"Flerovium",cat:"post-transition metal",mass:289,period:7,group:14},
  {n:115,sym:"Mc",name:"Moscovium",cat:"post-transition metal",mass:290,period:7,group:15},
  {n:116,sym:"Lv",name:"Livermorium",cat:"post-transition metal",mass:293,period:7,group:16},
  {n:117,sym:"Ts",name:"Tennessine",cat:"halogen",mass:294,period:7,group:17},
  {n:118,sym:"Og",name:"Oganesson",cat:"noble gas",mass:294,period:7,group:18},
];
const EGRID = {};
ELEMENTS.forEach(e => { if(!EGRID[e.period]) EGRID[e.period]={}; EGRID[e.period][e.group]=e; });

// Finds which items in a list (DB entries / Reports / Notebook entries) are textually
// mentioned by name/title in arbitrary text — same word-bounded matching as element
// detection. excludeId lets an entry skip matching itself when scanning its own list.
function entriesMentionedIn(list, nameKey, excludeId, ...parts) {
  const combined = parts.filter(Boolean).join(" \n ");
  if (!combined || !list) return [];
  return list.filter(item => {
    if (excludeId != null && item.id === excludeId) return false;
    const label = item[nameKey];
    if (!label || !label.trim()) return false;
    const re = new RegExp(`\\b${_escRe(label.trim())}\\b`, "i");
    return re.test(combined);
  });
}

// Finds which periodic-table elements are mentioned in arbitrary text (name or symbol),
// using the same word-bounded logic as ElementPanel's own linking (avoids false positives
// like "Li" inside "nucleophilic", but still catches formula-style text like "LiCl").
const _escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function elementsMentionedIn(...parts) {
  const combined = parts.filter(Boolean).join(" \n ");
  if (!combined) return [];
  return ELEMENTS.filter(el => {
    const nameRe = new RegExp(`\\b${_escRe(el.name)}\\b`, "i");
    const symRe = new RegExp(`(?<![A-Za-z])${_escRe(el.sym)}(?![a-z])`);
    return nameRe.test(combined) || symRe.test(combined);
  });
}

// ── Save status (global, shown via SaveIndicator in the top bar) ─────────────
let _saveStatus = "idle"; // idle | saving | saved | error
let _saveListeners = [];
function setSaveStatus(s) { _saveStatus = s; _saveListeners.forEach(fn => fn(s)); }
function useSaveStatus() {
  const [status, setStatus] = useState(_saveStatus);
  useEffect(() => {
    const fn = s => setStatus(s);
    _saveListeners.push(fn);
    return () => { _saveListeners = _saveListeners.filter(l => l !== fn); };
  }, []);
  return status;
}
let _idleTimer = null;
function scheduleIdle() { clearTimeout(_idleTimer); _idleTimer = setTimeout(() => setSaveStatus("idle"), 2000); }

// ── Storage: per-item collections ─────────────────────────────────────────────
// For arrays of entries (DB entries, reports, notes, spectra) — each item gets
// its own row in `priabora_items` (keyed by collection + the item's own id),
// instead of the whole array being one giant row. Editing or deleting one
// entry now only touches that entry's row, not every entry in the module.
// The exposed API matches useLS exactly (same [items, setItems] shape, same
// functional-update support) so every existing call site works unchanged.
function useCloudCollection(collection, seed) {
  const lsKey = `priabora-${collection}`;
  const [items, setItemsState] = useState(() => {
    try { const s=localStorage.getItem(lsKey); return s?JSON.parse(s):seed; } catch { return seed; }
  });
  const prevRef = useRef(items);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("priabora_items").select("item_id, value").eq("collection", collection);
        if (cancelled) return;
        if (error) throw error;
        if (data && data.length > 0) {
          const sorted = data.map(r => r.value).sort((a,b) => String(b.id).localeCompare(String(a.id), undefined, {numeric:true}));
          prevRef.current = sorted;
          setItemsState(sorted);
          try { localStorage.setItem(lsKey, JSON.stringify(sorted)); } catch {}
        } else {
          let local = seed;
          try { const s = localStorage.getItem(lsKey); if (s) local = JSON.parse(s); } catch {}
          prevRef.current = local;
          if (local.length) {
            const rows = local.map(item => ({ collection, item_id: String(item.id), value: item }));
            const { error: upErr } = await supabase.from("priabora_items").upsert(rows);
            if (upErr) throw upErr;
          }
        }
      } catch (e) {
        console.error("Supabase load failed for collection", collection, e);
        if (!cancelled) setSaveStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [collection]);

  const syncDiff = useCallback(async (prevArr, nextArr) => {
    const prevIds = new Set(prevArr.map(i => String(i.id)));
    const nextIds = new Set(nextArr.map(i => String(i.id)));
    const upserts = nextArr.filter(item => {
      const prevItem = prevArr.find(p => String(p.id) === String(item.id));
      return !prevItem || JSON.stringify(prevItem) !== JSON.stringify(item);
    }).map(item => ({ collection, item_id: String(item.id), value: item, updated_at: new Date().toISOString() }));
    const deletes = [...prevIds].filter(id => !nextIds.has(id));
    if (!upserts.length && !deletes.length) return;
    setSaveStatus("saving");
    try {
      if (upserts.length) { const { error } = await supabase.from("priabora_items").upsert(upserts); if (error) throw error; }
      if (deletes.length) { const { error } = await supabase.from("priabora_items").delete().eq("collection", collection).in("item_id", deletes); if (error) throw error; }
      setSaveStatus("saved"); scheduleIdle();
    } catch (e) {
      console.error("Supabase save failed for collection", collection, e);
      setSaveStatus("error");
    }
  }, [collection]);

  const setItems = useCallback(v => {
    setItemsState(prev => {
      const next = typeof v==="function"?v(prev):v;
      try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      syncDiff(prevRef.current, next);
      prevRef.current = next;
      return next;
    });
  }, [lsKey, syncDiff]);

  return [items, setItems];
}

// ── Storage ───────────────────────────────────────────────────────────────────
// Cloud-backed via Supabase (table `priabora_data`, one row per key), with
// localStorage kept as an instant local cache so the UI never waits on the
// network to render. On first mount for a key: if Supabase already has a row,
// that's the source of truth and overwrites the local cache; if not, whatever
// is currently in localStorage (or the default) is pushed up as a one-time
// migration, so nothing typed before this existed gets lost.
function useLS(key, init) {
  const [val, setVal] = useState(() => {
    try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; }
  });
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("priabora_data").select("value").eq("key", key).maybeSingle();
        if (cancelled || dirtyRef.current) return;
        if (error) throw error;
        if (data) {
          const incomingIsEmpty = data.value && typeof data.value === "object" && !Array.isArray(data.value) && Object.keys(data.value).length === 0;
          let localHasContent = false;
          try { const s = localStorage.getItem(key); if (s) { const parsed = JSON.parse(s); localHasContent = parsed && typeof parsed === "object" && Object.keys(parsed).length > 0; } } catch {}
          if (incomingIsEmpty && localHasContent) {
            const localVal = JSON.parse(localStorage.getItem(key));
            supabase.from("priabora_data").upsert({ key, value: localVal }).then(({error})=>{ if(error) console.error("Repair upsert failed for", key, error); });
          } else {
            setVal(data.value);
            try { localStorage.setItem(key, JSON.stringify(data.value)); } catch {}
          }
        } else {
          let local = init;
          try { const s = localStorage.getItem(key); if (s) local = JSON.parse(s); } catch {}
          const { error: upErr } = await supabase.from("priabora_data").upsert({ key, value: local });
          if (upErr) throw upErr;
        }
      } catch (e) {
        console.error("Supabase load failed for", key, e);
        if (!cancelled) setSaveStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const set = useCallback(v => {
    dirtyRef.current = true;
    setVal(prev => {
      const next = typeof v==="function"?v(prev):v;
      try { localStorage.setItem(key,JSON.stringify(next)); } catch {}
      setSaveStatus("saving");
      supabase.from("priabora_data").upsert({ key, value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) { console.error("Supabase save failed for", key, error); setSaveStatus("error"); }
          else { setSaveStatus("saved"); scheduleIdle(); }
        })
        .catch(e => { console.error("Supabase save failed for", key, e); setSaveStatus("error"); });
      return next;
    });
  }, [key]);

  return [val, set];
}

// ── Backup: export / import all Priabora data as a single JSON file ──────────
async function exportAllData() {
  const out = {};
  for (let i=0; i<localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isPriaboraKey(k)) { try { out[k] = JSON.parse(localStorage.getItem(k)); } catch {} }
  }
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `priabora-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
const COLLECTION_KEYS = { "priabora-db":"db", "priabora-reports":"reports", "priabora-notes":"notes", "priabora-spectra-meta":"spectra-meta" };
async function importAllData(file) {
  if (!window.confirm("This will overwrite your current Priabora data with the contents of this backup file. Continue?")) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const dataRows = [];
    const itemRows = [];
    for (const [k, v] of Object.entries(data)) {
      if (!isPriaboraKey(k)) continue;
      try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
      const collection = COLLECTION_KEYS[k];
      if (collection && Array.isArray(v)) {
        v.forEach(item => { if (item && item.id != null) itemRows.push({ collection, item_id: String(item.id), value: item, updated_at: new Date().toISOString() }); });
      } else {
        dataRows.push({ key: k, value: v, updated_at: new Date().toISOString() });
      }
    }
    if (dataRows.length) { const { error } = await supabase.from("priabora_data").upsert(dataRows); if (error) throw error; }
    if (itemRows.length) { const { error } = await supabase.from("priabora_items").upsert(itemRows); if (error) throw error; }
    window.location.reload();
  } catch (e) {
    console.error("Import failed", e);
    window.alert("Import failed — the file may not be a valid Priabora backup.");
  }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function callClaude(system, messages, max_tokens=1000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens, system, messages}),
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content?.map(b=>b.text||"").join("")||"";
}
function parseJSON(t) { return JSON.parse(t.replace(/```json|```/g,"").trim()); }
const toBase64 = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
const toText   = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(f);});
function resizeImageFile(file,maxDim=1000,quality=0.75){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new window.Image();
      img.onload=()=>{
        let {width,height}=img;
        if(width>height){ if(width>maxDim){height=Math.round(height*maxDim/width);width=maxDim;} }
        else{ if(height>maxDim){width=Math.round(width*maxDim/height);height=maxDim;} }
        const canvas=document.createElement("canvas");
        canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext("2d");
        ctx.drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL("image/jpeg",quality));
      };
      img.onerror=reject;
      img.src=reader.result;
    };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}
function fileKind(f){const n=f.name.toLowerCase();if(/\.(jpg|jpeg|png|webp|gif)$/.test(n))return"image";if(/\.pdf$/.test(n))return"pdf";if(/\.(xlsx|xls)$/.test(n))return"xlsx";if(/\.csv$/.test(n))return"csv";return"unknown";}
function imgMime(f){const n=f.name.toLowerCase();if(n.endsWith(".png"))return"image/png";if(n.endsWith(".webp"))return"image/webp";return"image/jpeg";}

// ── Seeds ─────────────────────────────────────────────────────────────────────
const SEED_DB=[
  {id:1,name:"Sodium Chloride",category:"Compound",summary:"Ionic compound of Na⁺ and Cl⁻. mp 801°C. Classic ionic bonding example.",tags:["ionic","electrolyte","sodium","chlorine"],date:"2024-01-01"},
  {id:2,name:"SN2 Mechanism",category:"Mechanism",summary:"Bimolecular nucleophilic substitution. Backside attack, inversion of stereochemistry.",tags:["nucleophilic","substitution","organic"],date:"2024-01-02"},
];
const SEED_NOTES=[{id:1,title:"Acid-Base Titration Lab",date:"2024-01-15",tags:["titration","acid-base","sodium"],content:"Titration of unknown HCl with 0.1M NaOH. Endpoint at 23.4mL. [HCl] = 0.117M.",aiSummary:null}];
const SEED_REPORTS=[{id:1,title:"Recrystallisation of Aspirin",date:"2024-02-01",tags:["organic","purification","carbon"],method:"Dissolved crude aspirin in minimum hot ethanol. Added warm distilled water until cloudy. Cooled slowly on ice. Filtered under vacuum.",dataTable:[["Sample","Mass (g)","MP (°C)"],["Crude","2.14","118-124"],["Recrystallised","1.89","133-135"]],results:"Recovery: 88.3%. MP now close to literature value.",discussion:"Broadened MP of crude sample indicates impurities. Recrystallisation narrowed and raised the MP.",conclusion:"Recrystallisation successfully purified the aspirin sample.",linkedSpectra:[],linkedDbIds:[],aiSummary:null}];

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Pill({label,color,small}){return <span style={{display:"inline-block",padding:small?"2px 7px":"3px 9px",borderRadius:3,fontSize:small?10:11,fontFamily:mono,fontWeight:500,background:color+"1a",color,border:`1px solid ${color}35`,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>{label}</span>;}
// Shows the periodic-table elements detected in an entry's text, each clickable through to
// that element's panel on the Periodic Table. Used by DB / Reports / Notebook detail views.
function ElementMentionPills({elements,onNavigate}){
  if(!elements||elements.length===0)return null;
  return (
    <div>
      <SLabel accent={C.blue}>Elements Mentioned</SLabel>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {elements.map(el=>{
          const col=ELEM_CAT[el.cat]||C.blue;
          return (
            <button key={el.n} onClick={()=>onNavigate&&onNavigate("table",{id:el.n})}
              style={{display:"flex",alignItems:"center",gap:6,background:col+"14",border:`1px solid ${col}40`,borderRadius:5,padding:"6px 10px",fontFamily:mono,fontSize:11,transition:"all 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=col+"25"} onMouseLeave={e=>e.currentTarget.style.background=col+"14"}>
              <span style={{color:col,fontWeight:700,fontFamily:serif,fontSize:12}}>{el.sym}</span>
              <span style={{color:C.muted}}>{el.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
// Splits a module title into a white "first part" and orange "second part", matching the
// Priabora logo treatment. Multi-word titles: first half of the words white, rest orange.
// Single-word titles: split by letter count so the orange portion is the majority half.
function splitTitleColor(text){
  const words=(text||"").trim().split(" ");
  if(words.length>1){
    const mid=Math.ceil(words.length/2);
    return {white:words.slice(0,mid).join(" "),orange:words.slice(mid).join(" "),joiner:" "};
  }
  const n=(text||"").length;
  const whiteLen=Math.floor(n/2);
  return {white:(text||"").slice(0,whiteLen),orange:(text||"").slice(whiteLen),joiner:""};
}
function TwoToneTitle({text,style}){
  const {white,orange,joiner}=splitTitleColor(text);
  return <span style={style}>{white&&<span style={{color:C.text}}>{white}</span>}{joiner}<span style={{color:C.orange}}>{orange}</span></span>;
}
// Editable properties grid for DB entries categorised as "Compound" — same visual
// pattern as ElementPanel's Props tab (2-col grid of surface cards, click-to-edit).
function CompoundPropsGrid({properties,onSave,readOnly}){
  return (
    <div>
      <SLabel accent={C.blue}>Properties</SLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {COMPOUND_PROPERTY_FIELDS.map(([key,label])=>(
          <div key={key} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px"}}>
            <div style={{fontFamily:mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{label}</div>
            <EditableText value={(properties||{})[key]||""} onSave={v=>onSave(key,v)} placeholder="—" readOnly={readOnly} style={{fontFamily:mono,fontSize:11,color:C.text,fontWeight:500}}/>
          </div>
        ))}
      </div>
    </div>
  );
}
// Small red pill shown on a locked entry — visible to everyone, not just admins.
function LockBadge({lockedBy,small}){
  if(!lockedBy) return null;
  return <Pill label={`🔒 Locked by ${lockedBy}`} color={C.red} small={small}/>;
}
// Admin-only lock/unlock toggle, shown in an entry's detail view.
function LockToggleBtn({locked,onToggle}){
  return <Btn onClick={onToggle} accent={locked?C.green:C.red} small outlined>{locked?"🔓 Unlock entry":"🔒 Lock entry"}</Btn>;
}
function SaveIndicator(){
  const status = useSaveStatus();
  if(status==="idle") return null;
  const MAP = {
    saving:{label:"Saving…",color:C.muted,pulse:true},
    saved:{label:"✓ Saved",color:C.green,pulse:false},
    error:{label:"⚠ Save failed",color:C.red,pulse:false},
  };
  const m = MAP[status]; if(!m) return null;
  return <span style={{fontFamily:mono,fontSize:10,color:m.color,letterSpacing:"0.04em",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{m.pulse&&<span style={{animation:"pulse 1s infinite",display:"inline-block"}}>◉</span>}{m.label}</span>;
}
function SLabel({children,accent}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:13,background:accent||C.blue,borderRadius:2}}/><span style={{fontFamily:mono,fontSize:10,color:accent||C.blue,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>{children}</span></div>;}
function Card({children,style,onClick}){const [h,setH]=useState(false);return <div onClick={onClick} onMouseEnter={()=>onClick&&setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?C.surface+"dd":C.panel,border:`1px solid ${h?C.borderHi:C.border}`,borderRadius:8,transition:"all 0.15s",cursor:onClick?"pointer":"default",...style}}>{children}</div>;}
function Btn({children,onClick,accent,disabled,small,outlined,full}){
  const col=accent||C.blue;const [h,setH]=useState(false);
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:disabled?C.faint:outlined?"transparent":h?col+"30":col+"1a",border:`1px solid ${disabled?C.border:col+"55"}`,borderRadius:6,color:disabled?C.muted:col,padding:small?"8px 12px":"10px 18px",fontFamily:mono,fontSize:small?11:12,fontWeight:500,transition:"all 0.15s",width:full?"100%":"auto",display:full?"block":"inline-block",textAlign:"center"}}>{children}</button>;
}
function Input({value,onChange,placeholder,style}){return <input value={value} onChange={onChange} placeholder={placeholder} onKeyDown={e=>handleScriptKeyDown(e,value,onChange)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 13px",color:C.text,fontFamily:mono,fontSize:13,width:"100%",...style}}/>;}
function Textarea({value,onChange,placeholder,rows=6}){return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} onKeyDown={e=>handleScriptKeyDown(e,value,onChange)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 13px",color:C.text,fontFamily:mono,fontSize:12,lineHeight:1.8,resize:"vertical",width:"100%"}}/>;}

// ── EditableText: click any text to edit it inline ────────────────────────────
function EditableText({value,onSave,placeholder,style,multiline,tag:Tag="div",renderDisplay,readOnly}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value||"");
  const [h,setH]=useState(false);
  const ref=useRef();
  useEffect(()=>{ if(!editing) setDraft(value||""); },[value,editing]);
  useEffect(()=>{ if(editing&&ref.current){ ref.current.focus(); if(!multiline) ref.current.select(); } },[editing]);
  const commit=()=>{ setEditing(false); if(draft!==(value||"")) onSave(draft); };
  const cancel=()=>{ setDraft(value||""); setEditing(false); };
  if(readOnly){
    const empty2 = !value || value.length===0;
    return <Tag style={{cursor:"default",...style}}>{renderDisplay ? renderDisplay(value) : (empty2 ? <span style={{color:C.faint,fontStyle:"italic"}}>{placeholder||"—"}</span> : value)}</Tag>;
  }
  if(editing){
    const InputComp = multiline?"textarea":"input";
    return <InputComp ref={ref} value={draft} onChange={e=>setDraft(e.target.value)}
      onClick={e=>e.stopPropagation()}
      onBlur={commit}
      onKeyDown={e=>{ if(handleScriptKeyDown(e,draft,ev=>setDraft(ev.target.value)))return; if(e.key==="Enter"&&!multiline){e.preventDefault();commit();} if(e.key==="Escape"){e.preventDefault();cancel();} }}
      rows={multiline?4:undefined}
      placeholder={placeholder}
      style={{background:C.surface,border:`1px solid ${C.blue}66`,borderRadius:4,color:C.text,fontFamily:"inherit",fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",padding:"3px 6px",width:"100%",resize:multiline?"vertical":"none",display:"block",...style}}/>;
  }
  const empty = !value || value.length===0;
  return (
    <Tag onClick={e=>{e.stopPropagation();setEditing(true);}} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} title="Click to edit"
      style={{cursor:"text",borderBottom:`1px dashed ${h?C.muted:"transparent"}`,transition:"border-color 0.12s",...style}}>
      {renderDisplay ? renderDisplay(value) : (empty ? <span style={{color:C.faint,fontStyle:"italic"}}>{placeholder||"Click to add…"}</span> : value)}
    </Tag>
  );
}

// ── Name gate: shown once per browser before the app is usable ───────────────
function NameGate({ onSubmit }) {
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) onSubmit(val.trim()); };
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 20 }}>
      <GlobalStyles/>
      <div className="fade-up" style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: C.text }}>Pria<span style={{ color: C.orange }}>bora</span></div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: "0.07em" }}>CHEMISTRY SUITE</div>
        </div>
        <p style={{ fontFamily: mono, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>What's your name? This tags anything you add so everyone can see who contributed what.</p>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); }} placeholder="Your name…"
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 14px", color: C.text, fontFamily: mono, fontSize: 14, textAlign: "center" }}/>
        <Btn onClick={submit} accent={C.orange} disabled={!val.trim()}>Continue</Btn>
      </div>
    </div>
  );
}

// ── Mobile Sheet (slides up from bottom) ──────────────────────────────────────
function Sheet({open, onClose, children, title}) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} className="fade-in" style={{position:"absolute",inset:0,background:"#000000aa"}}/>
      <div className="slide-up" style={{position:"relative",background:C.panel,borderRadius:"16px 16px 0 0",border:`1px solid ${C.borderHi}`,borderBottom:"none",maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <span style={{fontFamily:serif,fontSize:16,color:C.text,fontWeight:700}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:22,lineHeight:1,padding:"0 4px"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"16px 20px 32px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── Mobile bottom tab bar ─────────────────────────────────────────────────────
const NAV = [
  {id:"table",   label:"Table",    icon:"⊡"},
  {id:"db",      label:"DB",       icon:"◈"},
  {id:"spectrum",label:"Spectra",  icon:"⌇"},
  {id:"reports", label:"Reports",  icon:"⊞"},
  {id:"notebook",label:"Notes",    icon:"◻"},
];
// Full display title for a NAV label (short label -> expanded module name)
const moduleTitle = l => l==="DB"?"Reference DB":l==="Spectra"?"Spectrum Analyser":l==="Table"?"Periodic Table":l;

function BottomTabBar({tab, setTab, counts}) {
  return (
    <div className="safe-bottom" style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {NAV.map(n=>{
        const active=tab===n.id;
        return (
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 8px",background:"none",border:"none",color:active?C.orange:C.muted,transition:"color 0.12s"}}>
            <span style={{fontSize:18,lineHeight:1}}>{n.icon}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:active?600:400,letterSpacing:"0.04em"}}>{n.label}</span>
            {counts[n.id]>0&&<span style={{position:"absolute",top:6,width:14,height:14,borderRadius:"50%",background:C.orange,color:C.bg,fontFamily:mono,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{counts[n.id]>9?"9+":counts[n.id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function Sidebar({tab, setTab, counts, open, onClose, isMobile, username, isAdmin, onSwitchUser}) {
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} className="fade-in" style={{position:"fixed",inset:0,background:"#000000aa",zIndex:150}}/>}
        <div className={open?"slide-in":""} style={{position:"fixed",top:0,left:0,bottom:0,width:260,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"20px 0",zIndex:160,transform:open?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s ease"}}>
          <SidebarContent tab={tab} setTab={id=>{setTab(id);onClose();}} counts={counts} username={username} isAdmin={isAdmin} onSwitchUser={onSwitchUser}/>
        </div>
      </>
    );
  }
  return (
    <div style={{width:218,flexShrink:0,borderRight:`1px solid ${C.border}`,background:C.surface,display:"flex",flexDirection:"column",padding:"20px 0"}}>
      <SidebarContent tab={tab} setTab={setTab} counts={counts} username={username} isAdmin={isAdmin} onSwitchUser={onSwitchUser}/>
    </div>
  );
}

function SidebarContent({tab, setTab, counts, username, isAdmin, onSwitchUser}) {
  return (
    <>
      <div style={{padding:"0 20px 24px"}}>
        <div style={{fontFamily:serif,fontSize:21,fontWeight:700,color:C.text}}>Pria<span style={{color:C.orange}}>bora</span></div>
        <div style={{fontFamily:mono,fontSize:9,color:C.muted,marginTop:2,letterSpacing:"0.07em"}}>PRIABORA · CHEMISTRY SUITE</div>
      </div>
      <div style={{flex:1,padding:"0 10px",display:"flex",flexDirection:"column",gap:3}}>
        {NAV.map(n=>{const active=tab===n.id;return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",alignItems:"center",gap:10,background:active?C.orange+"18":"transparent",border:`1px solid ${active?C.orange+"40":"transparent"}`,borderRadius:7,padding:"11px 12px",color:active?C.orange:C.muted,fontFamily:mono,fontSize:15,fontWeight:active?600:400,transition:"all 0.12s",textAlign:"left",width:"100%"}}>
            <span style={{fontSize:15,opacity:0.8}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label==="DB"?"Reference DB":n.label==="Spectra"?"Spectrum Analyser":n.label==="Table"?"Periodic Table":n.label}</span>
            {counts[n.id]>0&&<span style={{fontFamily:mono,fontSize:14,color:active?C.orange+"aa":C.faint,background:active?C.orange+"15":C.panel,border:`1px solid ${active?C.teal+"30":C.border}`,borderRadius:10,padding:"1px 6px"}}>{counts[n.id]}</span>}
          </button>
        );})}
      </div>
      <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div style={{fontFamily:mono,fontSize:10,color:C.muted,display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{username}</span>
            {isAdmin&&<Pill label="Admin" color={C.orange} small/>}
          </div>
          <button onClick={onSwitchUser} style={{background:"none",border:"none",color:C.faint,fontFamily:mono,fontSize:9,textDecoration:"underline",padding:0,flexShrink:0}}>switch</button>
        </div>
        <div style={{fontFamily:mono,fontSize:9,color:C.faint,lineHeight:1.6}}>Synced to cloud.</div>
        <div style={{display:"flex",gap:6}}>
          <Btn onClick={exportAllData} accent={C.teal} small outlined full>Export</Btn>
          <label style={{flex:1,cursor:"pointer"}}>
            <input type="file" accept="application/json" style={{display:"none"}} onChange={e=>{if(e.target.files[0])importAllData(e.target.files[0]);e.target.value="";}}/>
            <span style={{display:"block"}}><Btn accent={C.purple} small outlined full>Import</Btn></span>
          </label>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function LinkPickerModal({dbEntries,spectraResults,currentLinkedSpectra,currentLinkedDbIds,onConfirm,onClose,title="Link related entries"}) {
  const [selS,setSelS]=useState(currentLinkedSpectra||[]);
  const [selD,setSelD]=useState(currentLinkedDbIds||[]);
  const tS=id=>setSelS(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const tD=id=>setSelD(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const isMobile=useIsMobile();
  const [categories]=useLS("priabora-categories",DEFAULT_CATEGORIES);
  const inner=(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {spectraResults?.length>0&&<div><SLabel accent={C.blue}>Reports</SLabel>{spectraResults.map(r=><label key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:6,background:selS.includes(r.id)?C.blue+"12":C.surface,border:`1px solid ${selS.includes(r.id)?C.blue+"40":C.border}`,marginBottom:6,cursor:"pointer"}}><input type="checkbox" checked={selS.includes(r.id)} onChange={()=>tS(r.id)} style={{accentColor:C.blue,width:16,height:16}}/><span style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{r.title||r.name}</span></label>)}</div>}
      {dbEntries?.length>0&&<div><SLabel accent={C.green}>Reference Database</SLabel>{dbEntries.map(e=>{const firstCat=getEntryCats(e)[0];return<label key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:6,background:selD.includes(e.id)?C.green+"12":C.surface,border:`1px solid ${selD.includes(e.id)?C.green+"40":C.border}`,marginBottom:6,cursor:"pointer"}}><input type="checkbox" checked={selD.includes(e.id)} onChange={()=>tD(e.id)} style={{accentColor:C.green,width:16,height:16}}/><div><div style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{e.name}</div>{firstCat&&<Pill label={categories.find(c=>c.id===firstCat)?.label||firstCat} color={catColor(firstCat,categories)} small/>}</div></label>;})}</div>}
      {!spectraResults?.length&&!dbEntries?.length&&<p style={{fontFamily:mono,fontSize:12,color:C.muted,textAlign:"center",padding:"20px 0"}}>No entries to link yet.</p>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onClose} accent={C.muted} small outlined>Cancel</Btn>
        <Btn onClick={()=>onConfirm(selS,selD)} accent={C.teal} small>Confirm ({selS.length+selD.length})</Btn>
      </div>
    </div>
  );
  if (isMobile) return <Sheet open onClose={onClose} title={title}>{inner}</Sheet>;
  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.panel,border:`1px solid ${C.borderHi}`,borderRadius:12,width:"100%",maxWidth:500,maxHeight:"78vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:serif,fontSize:15,color:C.text,fontWeight:700}}>{title}</span><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:18}}>✕</button></div>
        <div style={{overflowY:"auto",padding:"14px 20px",flex:1}}>{inner}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK SUGGEST MODAL — shown at save time when text mentions are detected.
// Nothing is linked automatically; every match starts unticked and the person
// opts in per-item, then confirms (or skips) before the entry actually saves.
// ═══════════════════════════════════════════════════════════════════════════════
function LinkSuggestModal({elements=[],dbEntries=[],reports=[],notes=[],allDbEntries=[],allReports=[],allNotes=[],excludeElements=[],onConfirm,onSkip,mode="save",title}) {
  const [selEl,setSelEl]=useState([]);
  const [selDb,setSelDb]=useState([]);
  const [selRep,setSelRep]=useState([]);
  const [selNote,setSelNote]=useState([]);
  const [manualEl,setManualEl]=useState([]);
  const [manualDb,setManualDb]=useState([]);
  const [manualRep,setManualRep]=useState([]);
  const [manualNote,setManualNote]=useState([]);
  const [search,setSearch]=useState("");
  const isMobile=useIsMobile();
  const toggle=setter=>id=>setter(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const total=selEl.length+selDb.length+selRep.length+selNote.length;

  const shownElIds=new Set([...elements.map(e=>e.n),...manualEl.map(e=>e.n),...excludeElements]);
  const shownDbIds=new Set([...dbEntries.map(e=>e.id),...manualDb.map(e=>e.id)]);
  const shownRepIds=new Set([...reports.map(e=>e.id),...manualRep.map(e=>e.id)]);
  const shownNoteIds=new Set([...notes.map(e=>e.id),...manualNote.map(e=>e.id)]);

  const q=search.trim().toLowerCase();
  const searchResults = q.length>0 ? {
    el: ELEMENTS.filter(e=>!shownElIds.has(e.n)&&(e.name.toLowerCase().includes(q)||e.sym.toLowerCase().includes(q))).slice(0,6),
    db: allDbEntries.filter(e=>!shownDbIds.has(e.id)&&e.name.toLowerCase().includes(q)).slice(0,6),
    rep: allReports.filter(e=>!shownRepIds.has(e.id)&&e.title.toLowerCase().includes(q)).slice(0,6),
    note: allNotes.filter(e=>!shownNoteIds.has(e.id)&&e.title.toLowerCase().includes(q)).slice(0,6),
  } : null;
  const hasResults = searchResults && (searchResults.el.length+searchResults.db.length+searchResults.rep.length+searchResults.note.length>0);

  const addManualEl=el=>{setManualEl(p=>[...p,el]);setSelEl(p=>[...p,el.n]);setSearch("");};
  const addManualDb=e=>{setManualDb(p=>[...p,e]);setSelDb(p=>[...p,e.id]);setSearch("");};
  const addManualRep=r=>{setManualRep(p=>[...p,r]);setSelRep(p=>[...p,r.id]);setSearch("");};
  const addManualNote=n=>{setManualNote(p=>[...p,n]);setSelNote(p=>[...p,n.id]);setSearch("");};

  const displayEl=[...elements,...manualEl];
  const displayDb=[...dbEntries,...manualDb];
  const displayRep=[...reports,...manualRep];
  const displayNote=[...notes,...manualNote];

  const Row=({checked,onChange,color,children})=>(
    <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,background:checked?color+"12":C.surface,border:`1px solid ${checked?color+"40":C.border}`,marginBottom:6,cursor:"pointer"}}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{accentColor:color,width:16,height:16,flexShrink:0}}/>
      {children}
    </label>
  );
  const SearchHit=({onClick,children})=>(
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,padding:"8px 10px",fontFamily:mono,fontSize:11,color:C.text,textAlign:"left",width:"100%"}}>
      {children}<span style={{marginLeft:"auto",color:C.orange,fontSize:9,flexShrink:0}}>+ add</span>
    </button>
  );

  const inner=(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <p style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.7}}>{mode==="save"?"Found mentions of these existing entries in the text. Tick any you'd like to link — nothing is linked automatically.":"Search for anything to link to this entry."}</p>
      {displayEl.length>0&&<div><SLabel accent={C.blue}>Elements</SLabel>{displayEl.map(el=>{const col=ELEM_CAT[el.cat]||C.blue;return(
        <Row key={"el"+el.n} checked={selEl.includes(el.n)} onChange={()=>toggle(setSelEl)(el.n)} color={col}>
          <span style={{fontFamily:serif,fontSize:13,color:col,fontWeight:700,width:26}}>{el.sym}</span>
          <span style={{fontFamily:mono,fontSize:12,color:C.text}}>{el.name}</span>
        </Row>
      );})}</div>}
      {displayDb.length>0&&<div><SLabel accent={C.green}>Reference Database</SLabel>{displayDb.map(e=>(
        <Row key={"db"+e.id} checked={selDb.includes(e.id)} onChange={()=>toggle(setSelDb)(e.id)} color={C.green}>
          <span style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{e.name}</span>
        </Row>
      ))}</div>}
      {displayRep.length>0&&<div><SLabel accent={C.teal}>Lab Reports</SLabel>{displayRep.map(r=>(
        <Row key={"rep"+r.id} checked={selRep.includes(r.id)} onChange={()=>toggle(setSelRep)(r.id)} color={C.teal}>
          <span style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{r.title}</span>
        </Row>
      ))}</div>}
      {displayNote.length>0&&<div><SLabel accent={C.purple}>Notebook</SLabel>{displayNote.map(n=>(
        <Row key={"note"+n.id} checked={selNote.includes(n.id)} onChange={()=>toggle(setSelNote)(n.id)} color={C.purple}>
          <span style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{n.title}</span>
        </Row>
      ))}</div>}
      <div>
        <SLabel accent={C.orange}>Add manually</SLabel>
        <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search elements, DB, reports, notes…"/>
        {q.length>0&&(hasResults?(
          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5,maxHeight:200,overflowY:"auto"}}>
            {searchResults.el.map(el=>{const col=ELEM_CAT[el.cat]||C.blue;return(
              <SearchHit key={"sel"+el.n} onClick={()=>addManualEl(el)}><span style={{color:col,fontWeight:700,fontFamily:serif}}>{el.sym}</span>{el.name}</SearchHit>
            );})}
            {searchResults.db.map(e=><SearchHit key={"sdb"+e.id} onClick={()=>addManualDb(e)}>◈ {e.name}</SearchHit>)}
            {searchResults.rep.map(r=><SearchHit key={"srep"+r.id} onClick={()=>addManualRep(r)}>⊞ {r.title}</SearchHit>)}
            {searchResults.note.map(n=><SearchHit key={"snote"+n.id} onClick={()=>addManualNote(n)}>◻ {n.title}</SearchHit>)}
          </div>
        ):<p style={{fontFamily:mono,fontSize:10,color:C.faint,marginTop:6}}>No matches.</p>)}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onSkip} accent={C.muted} small outlined>{mode==="save"?"Skip & save":"Close"}</Btn>
        <Btn onClick={()=>onConfirm({elements:selEl,db:selDb,reports:selRep,notes:selNote})} accent={C.teal} small disabled={mode==="manage"&&total===0}>{mode==="save"?(total>0?`Link ${total} & save`:"Save"):(total>0?`Add ${total} link${total>1?"s":""}`:"Add links")}</Btn>
      </div>
    </div>
  );
  const modalTitle = title || (mode==="save"?"Link detected entries":"Add links");
  if (isMobile) return <Sheet open onClose={onSkip} title={modalTitle}>{inner}</Sheet>;
  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.panel,border:`1px solid ${C.borderHi}`,borderRadius:12,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:serif,fontSize:15,color:C.text,fontWeight:700}}>{modalTitle}</span>
          <button onClick={onSkip} style={{background:"none",border:"none",color:C.muted,fontSize:18}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px",flex:1}}>{inner}</div>
      </div>
    </div>
  );
}

// Renders the explicit, user-confirmed links stored on an entry (as opposed to
// ElementMentionPills, which is a live, read-only scan of the text — never stored).
function LinkedEntriesDisplay({entry,dbEntries,reports,notes,onNavigate}) {
  const els=(entry.linkedElements||[]).map(n=>ELEMENTS.find(e=>e.n===n)).filter(Boolean);
  const dbs=(entry.linkedDbIds||[]).map(id=>(dbEntries||[]).find(e=>e.id===id)).filter(Boolean);
  const reps=(entry.linkedReportIds||[]).map(id=>(reports||[]).find(r=>r.id===id)).filter(Boolean);
  const nts=(entry.linkedNoteIds||[]).map(id=>(notes||[]).find(n=>n.id===id)).filter(Boolean);
  if(!els.length&&!dbs.length&&!reps.length&&!nts.length) return null;
  return (
    <div>
      <SLabel accent={C.orange}>Linked Entries</SLabel>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {els.map(el=>{const col=ELEM_CAT[el.cat]||C.blue;return(
          <button key={"lel"+el.n} onClick={()=>onNavigate("table",{id:el.n})}
            style={{display:"flex",alignItems:"center",gap:6,background:col+"14",border:`1px solid ${col}40`,borderRadius:5,padding:"6px 10px",fontFamily:mono,fontSize:11,transition:"all 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background=col+"25"} onMouseLeave={e=>e.currentTarget.style.background=col+"14"}>
            <span style={{color:col,fontWeight:700,fontFamily:serif,fontSize:12}}>{el.sym}</span><span style={{color:C.muted}}>{el.name}</span>
          </button>
        );})}
        {dbs.map(e=>(
          <button key={"ldb"+e.id} onClick={()=>onNavigate("db",{id:e.id})}
            style={{background:C.green+"14",border:`1px solid ${C.green}40`,borderRadius:5,padding:"6px 10px",fontFamily:mono,fontSize:11,color:C.muted,transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background=C.green+"25"} onMouseLeave={e2=>e2.currentTarget.style.background=C.green+"14"}>◈ {e.name}</button>
        ))}
        {reps.map(r=>(
          <button key={"lrep"+r.id} onClick={()=>onNavigate("reports",{id:r.id})}
            style={{background:C.teal+"14",border:`1px solid ${C.teal}40`,borderRadius:5,padding:"6px 10px",fontFamily:mono,fontSize:11,color:C.muted,transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background=C.teal+"25"} onMouseLeave={e2=>e2.currentTarget.style.background=C.teal+"14"}>⊞ {r.title}</button>
        ))}
        {nts.map(n=>(
          <button key={"lnote"+n.id} onClick={()=>onNavigate("notebook",{id:n.id})}
            style={{background:C.purple+"14",border:`1px solid ${C.purple}40`,borderRadius:5,padding:"6px 10px",fontFamily:mono,fontSize:11,color:C.muted,transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background=C.purple+"25"} onMouseLeave={e2=>e2.currentTarget.style.background=C.purple+"14"}>◻ {n.title}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODIC TABLE MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function ElementTile({el,selected,dimmed,onClick,size=42}){
  const [h,setH]=useState(false);
  const col=ELEM_CAT[el.cat]||"#666";const active=selected||h;
  return <div onClick={()=>onClick(el)} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{width:size,height:size,borderRadius:3,background:active?col+"28":C.panel,border:`1px solid ${selected?col:active?col+"88":C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.1s",opacity:dimmed?0.18:1,boxShadow:selected?`0 0 12px ${col}55`:"none",flexShrink:0}}>
    <div style={{fontFamily:mono,fontSize:7,color:col,opacity:0.75,lineHeight:1}}>{el.n}</div>
    <div style={{fontFamily:serif,fontSize:12,color:active?col:C.text,fontWeight:700,lineHeight:1}}>{el.sym}</div>
    <div style={{fontFamily:mono,fontSize:6,color:C.muted,lineHeight:1,marginTop:1,maxWidth:size-4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center"}}>{el.name.length>6?el.sym:el.name}</div>
  </div>;
}

function ElementPanel({el,dbEntries,reports,notes,onNavigate,onClose}) {
  const col=ELEM_CAT[el.cat]||C.blue;
  const [tab,setTab]=useState("info");
  const [userNote,setUserNote]=useLS(`elem-note-${el.n}`,"");
  const [editNote,setEditNote]=useState(false);
  const [noteDraft,setNoteDraft]=useState("");
  const [override,setOverride]=useLS(`elem-override-${el.n}`,{});
  const [linkFilter,setLinkFilter]=useState("all"); // all | db | reports | notebook
  const [linkSort,setLinkSort]=useState("recent"); // recent | alpha | type
  const [linkSearch,setLinkSearch]=useState("");
  // All element data is manually entered (e.g. from PubChem) — no AI auto-fill for the Periodic Table.
  const getField=k=>override[k];
  const saveField=(k,v)=>setOverride(p=>({...p,[k]:v}));
  const joinArr=a=>(a||[]).join(", ");
  const splitArr=v=>v.split(",").map(s=>s.trim()).filter(Boolean);
  const escapeRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const nameRe=new RegExp(`\\b${escapeRe(el.name)}\\b`,"i");
  // Symbol match: not embedded inside a longer word (e.g. "Li" inside "Literature" or "alkaLI"),
  // but still matches formula-style concatenation like "LiCl" or "Li2CO3".
  const symRe=new RegExp(`(?<![A-Za-z])${escapeRe(el.sym)}(?![a-z])`);
  const matches=t=>t&&(nameRe.test(t)||symRe.test(t));
  const linkedDb=dbEntries.filter(e=>matches(e.name)||matches(e.summary)||e.tags?.some(t=>matches(t)));
  const linkedReports=reports.filter(r=>matches(r.title)||matches(r.method)||matches(r.results)||matches(r.discussion)||r.tags?.some(t=>matches(t)));
  const linkedNotes=notes.filter(n=>matches(n.title)||matches(n.content)||n.tags?.some(t=>matches(t)));
  const totalLinks=linkedDb.length+linkedReports.length+linkedNotes.length;
  const LINK_TYPE_META={
    db:{label:"Reference DB",color:C.green,nav:"db"},
    reports:{label:"Lab Reports",color:C.teal,nav:"reports"},
    notebook:{label:"Notebook",color:C.purple,nav:"notebook"},
  };
  const allLinkItems=[
    ...linkedDb.map(e=>({type:"db",id:e.id,ref:e,title:e.name,date:e.date,sub:getEntryCats(e)[0]})),
    ...linkedReports.map(r=>({type:"reports",id:r.id,ref:r,title:r.title,date:r.date})),
    ...linkedNotes.map(n=>({type:"notebook",id:n.id,ref:n,title:n.title,date:n.date})),
  ];
  const filteredLinkItems=(linkFilter==="all"?allLinkItems:allLinkItems.filter(l=>l.type===linkFilter)).filter(l=>!linkSearch.trim()||(l.title||"").toLowerCase().includes(linkSearch.trim().toLowerCase()));
  const sortedLinkItems=[...filteredLinkItems].sort((a,b)=>{
    if(linkSort==="alpha") return (a.title||"").localeCompare(b.title||"");
    if(linkSort==="type") return LINK_TYPE_META[a.type].label.localeCompare(LINK_TYPE_META[b.type].label) || (a.title||"").localeCompare(b.title||"");
    return (b.date||"").localeCompare(a.date||""); // recent first (default)
  });
  const LINK_FILTERS=[{id:"all",label:"All"},{id:"db",label:"DB"},{id:"reports",label:"Reports"},{id:"notebook",label:"Notes"}];
  const LINK_SORTS=[{id:"recent",label:"Most recent"},{id:"alpha",label:"A–Z"},{id:"type",label:"By type"}];
  useEffect(()=>{ setTab("info"); },[el.n]);
  const TABS=[{id:"info",label:"Props"},{id:"chem",label:"Chem"},{id:"links",label:`Links (${totalLinks})`},{id:"notes",label:"Notes"}];
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:`linear-gradient(135deg,${col}0a 0%,transparent 55%)`}}>
        {onClose&&<button onClick={onClose} style={{float:"right",background:"none",border:"none",color:C.muted,fontSize:20,lineHeight:1,padding:"0 0 8px 8px"}}>✕</button>}
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{width:62,height:62,borderRadius:7,border:`2px solid ${col}55`,background:col+"18",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 0 16px ${col}22`}}>
            <div style={{fontFamily:mono,fontSize:9,color:col,opacity:0.8}}>{el.n}</div>
            <div style={{fontFamily:serif,fontSize:24,color:col,fontWeight:700,lineHeight:1}}>{el.sym}</div>
            <div style={{fontFamily:mono,fontSize:8,color:C.muted}}>{el.mass}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:serif,fontSize:18,color:C.text,fontWeight:700}}>{el.name}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
              <Pill label={ELEM_CAT_LABELS[el.cat]||el.cat} color={col} small/>
              <Pill label={`Period ${[8,9].includes(el.period)?el.period===8?"6":"7":el.period}`} color={C.muted} small/>
            </div>
            <EditableText value={getField("keyFact")||""} onSave={v=>saveField("keyFact",v)} placeholder="Click to add a key fact…" multiline
              renderDisplay={v=>v?<>💡 {v}</>:<span style={{fontStyle:"italic",color:C.faint}}>Click to add a key fact…</span>}
              style={{marginTop:8,fontFamily:mono,fontSize:10,color:C.muted,lineHeight:1.6,background:col+"0c",border:`1px solid ${col}20`,borderRadius:5,padding:"5px 9px"}}/>
          </div>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?col:"transparent"}`,color:tab===t.id?col:C.muted,padding:"10px 4px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{t.label}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {tab==="info"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontFamily:mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Atomic Mass</div>
              <div style={{fontFamily:mono,fontSize:11,color:C.text,fontWeight:500}}>{el.mass} u</div>
            </div>
            {[["config","Config"],["meltingPoint","Melting Pt (C)"],["boilingPoint","Boiling Pt (C)"],["electronegativity","Electronegativity"],["atomicRadius","Atomic Radius (pm)"],["ionisationEnergy","Ionisation Energy (KJ mol-1)"],["discoveredBy","Discovered"],["discoveredYear","Year"]].map(([key,label])=>(
              <div key={key} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontFamily:mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{label}</div>
                <EditableText value={getField(key)||""} onSave={v=>saveField(key,v)} placeholder="—" style={{fontFamily:mono,fontSize:11,color:C.text,fontWeight:500}}/>
              </div>
            ))}
          </div>
          <div>
            <SLabel accent={col}>Oxidation States</SLabel>
            <EditableText value={joinArr(getField("oxidationStates"))} onSave={v=>saveField("oxidationStates",splitArr(v))} placeholder="e.g. +1, +2, -1"
              renderDisplay={v=>{const arr=splitArr(v||"");return arr.length?<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{arr.map((s,i)=><Pill key={i} label={s} color={col} small/>)}</div>:<span style={{color:C.faint,fontStyle:"italic",fontFamily:mono,fontSize:11}}>Click to add oxidation states…</span>;}}/>
          </div>
          <div>
            <SLabel accent={C.teal}>Uses</SLabel>
            <EditableText value={joinArr(getField("uses"))} onSave={v=>saveField("uses",splitArr(v))} placeholder="e.g. water treatment, alloys…" multiline
              renderDisplay={v=>{const arr=splitArr(v||"");return arr.length?arr.map((u,i)=><div key={i} style={{fontFamily:mono,fontSize:11,color:C.muted,paddingLeft:10,borderLeft:`2px solid ${C.teal}44`,marginBottom:5}}>▸ {u}</div>):<span style={{color:C.faint,fontStyle:"italic",fontFamily:mono,fontSize:11}}>Click to add uses…</span>;}}/>
          </div>
        </div>}
        {tab==="chem"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <SLabel accent={col}>Chemistry Overview</SLabel>
            <EditableText tag="p" value={getField("chemistryNotes")||""} onSave={v=>saveField("chemistryNotes",v)} multiline placeholder="Click to add chemistry notes…"
              style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${col}44`,paddingLeft:12}}/>
          </div>
          <div>
            <SLabel accent={C.green}>Common Compounds</SLabel>
            <EditableText value={joinArr(getField("commonCompounds"))} onSave={v=>saveField("commonCompounds",splitArr(v))} placeholder="e.g. NaCl, CO2…"
              renderDisplay={v=>{const arr=splitArr(v||"");return arr.length?<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{arr.map((c,i)=><div key={i} style={{background:C.green+"12",border:`1px solid ${C.green}25`,borderRadius:6,padding:"7px 11px",fontFamily:mono,fontSize:11,color:C.muted}}>{c}</div>)}</div>:<span style={{color:C.faint,fontStyle:"italic",fontFamily:mono,fontSize:11}}>Click to add common compounds…</span>;}}/>
          </div>
          <EditableText value={getField("group")||""} onSave={v=>saveField("group",v)} placeholder="Click to add group name…"
            renderDisplay={v=>v?<><div style={{fontFamily:mono,fontSize:9,color:col,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Group</div><div style={{fontFamily:serif,fontSize:13,color:C.text}}>{v}</div></>:<span style={{fontFamily:mono,fontSize:11,color:C.faint,fontStyle:"italic"}}>Click to add group…</span>}
            style={{background:col+"10",border:`1px solid ${col}25`,borderRadius:7,padding:"11px 13px"}}/>
          <div>
            <SLabel accent={C.yellow}>History</SLabel>
            <EditableText tag="p" value={getField("history")||""} onSave={v=>saveField("history",v)} multiline placeholder="Click to add history…"
              style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${C.yellow}44`,paddingLeft:12}}/>
          </div>
          <div>
            <SLabel accent={C.pink}>General Info</SLabel>
            <EditableText tag="p" value={getField("generalInfo")||""} onSave={v=>saveField("generalInfo",v)} multiline placeholder="Click to add general info…"
              style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${C.pink}44`,paddingLeft:12}}/>
          </div>
        </div>}
        {tab==="links"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:12}}>
          {totalLinks===0?<div style={{textAlign:"center",padding:"28px 10px",color:C.faint,fontFamily:mono,fontSize:11,lineHeight:2}}>No entries mention {el.name} yet.<br/><span style={{color:C.muted}}>Add entries to see them here.</span></div>:<>
            <Input value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="Search linked entries…"/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {LINK_FILTERS.map(f=>{const cnt=f.id==="all"?allLinkItems.length:allLinkItems.filter(l=>l.type===f.id).length;const active=linkFilter===f.id;const fcol=f.id==="all"?col:LINK_TYPE_META[f.id].color;return(
                <button key={f.id} onClick={()=>setLinkFilter(f.id)} disabled={cnt===0&&f.id!=="all"} style={{background:active?fcol+"22":C.surface,border:`1px solid ${active?fcol+"66":C.border}`,borderRadius:5,color:cnt===0&&f.id!=="all"?C.faint:active?fcol:C.muted,padding:"5px 9px",fontFamily:mono,fontSize:10,fontWeight:500,opacity:cnt===0&&f.id!=="all"?0.4:1,transition:"all 0.12s"}}>{f.label} ({cnt})</button>
              );})}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:mono,fontSize:9,color:C.faint,textTransform:"uppercase",letterSpacing:"0.06em"}}>Sort</span>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {LINK_SORTS.map(s=>{const active=linkSort===s.id;return(
                  <button key={s.id} onClick={()=>setLinkSort(s.id)} style={{background:active?col+"18":"transparent",border:`1px solid ${active?col+"55":C.border}`,borderRadius:5,color:active?col:C.muted,padding:"4px 8px",fontFamily:mono,fontSize:9,fontWeight:500,transition:"all 0.12s"}}>{s.label}</button>
                );})}
              </div>
            </div>
            {sortedLinkItems.length===0?<div style={{textAlign:"center",padding:"20px 10px",color:C.faint,fontFamily:mono,fontSize:11}}>No {LINK_TYPE_META[linkFilter]?.label.toLowerCase()} entries for {el.name}.</div>:
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {sortedLinkItems.map(item=>{const meta=LINK_TYPE_META[item.type];return(
                <div key={`${item.type}-${item.id}`} onClick={()=>onNavigate(meta.nav,item.ref)} style={{background:C.surface,border:`1px solid ${meta.color}22`,borderLeft:`3px solid ${meta.color}`,borderRadius:6,padding:"10px 12px",cursor:"pointer"}} onMouseEnter={e2=>e2.currentTarget.style.background=meta.color+"0c"} onMouseLeave={e2=>e2.currentTarget.style.background=C.surface}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{fontFamily:serif,fontSize:12,color:C.text,fontWeight:600,marginBottom:2}}>{item.title}</div>
                    <Pill label={meta.label} color={meta.color} small/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    {item.date&&<span style={{fontFamily:mono,fontSize:9,color:C.muted}}>{item.date}</span>}
                    {item.sub&&<Pill label={item.sub} color={meta.color} small/>}
                  </div>
                </div>
              );})}
            </div>}
          </>}
        </div>}
        {tab==="notes"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:10}}>
          <p style={{fontFamily:mono,fontSize:10,color:C.muted,lineHeight:1.6}}>Personal notes for {el.name} — saved automatically.</p>
          {!editNote?(<>{userNote?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${col}`,borderRadius:7,padding:12,fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{userNote}</div>:<div style={{fontFamily:mono,fontSize:11,color:C.faint,fontStyle:"italic",padding:"8px 0"}}>No notes yet.</div>}<Btn onClick={()=>{setNoteDraft(userNote);setEditNote(true);}} accent={col} small full>{userNote?"Edit notes":"+ Add notes"}</Btn></>):(
            <><Textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder={`Notes about ${el.name}…`} rows={7}/><div style={{display:"flex",gap:8}}><Btn onClick={()=>{setUserNote(noteDraft);setEditNote(false);}} accent={col} small>Save</Btn><Btn onClick={()=>setEditNote(false)} accent={C.muted} small>Cancel</Btn></div></>
          )}
        </div>}
      </div>
    </div>
  );
}

function PeriodicTableModule({dbEntries,reports,notes,onNavigate,openElementN,onOpened}) {
  const [selected,setSelected]=useState(null);
  const [filterCat,setFilterCat]=useState(null);
  const [search,setSearch]=useState("");
  const [showPanel,setShowPanel]=useState(false);
  const isMobile=useIsMobile();
  const handleSelect=el=>{setSelected(el);setShowPanel(true);};
  useEffect(()=>{
    if(openElementN==null)return;
    const el=ELEMENTS.find(e=>e.n===openElementN);
    if(el)handleSelect(el);
    onOpened&&onOpened();
  },[openElementN]);
  const TILE=isMobile?32:42, GAP=isMobile?2:3;
  const allGroups=Array.from({length:18},(_,i)=>i+1);
  const mainRows=[1,2,3,4,5,6,7];
  const seriesRows=[8,9];
  const matchSearch=el=>{const q=search.toLowerCase();return !q||el.name.toLowerCase().includes(q)||el.sym.toLowerCase().includes(q)||String(el.n).includes(q);};
  const dim=el=>(filterCat?el.cat!==filterCat:false)||!matchSearch(el);
  const renderTile=(period,group)=>{const el=EGRID[period]?.[group];if(!el)return <div key={`${period}-${group}`} style={{width:TILE,height:TILE,flexShrink:0}}/>;return <ElementTile key={el.n} el={el} selected={selected?.n===el.n} dimmed={dim(el)} onClick={handleSelect} size={TILE}/>;};
  const panelContent = selected ? <ElementPanel key={selected.n} el={selected} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate} onClose={isMobile?()=>setShowPanel(false):null}/> : null;

  return (
    <div style={{display:"flex",height:"100%",gap:16,minHeight:0,overflow:"hidden"}}>
      {/* Table side */}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search element…"
            style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"9px 13px",color:C.text,fontFamily:mono,fontSize:12,flex:1,minWidth:0}}/>
          {(search||filterCat)&&<Btn onClick={()=>{setSearch("");setFilterCat(null);}} accent={C.muted} small>Clear</Btn>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {Object.entries(ELEM_CAT).map(([key,col])=>(
            <button key={key} onClick={()=>setFilterCat(filterCat===key?null:key)} style={{background:filterCat===key?col+"25":C.surface,border:`1px solid ${filterCat===key?col+"66":C.border}`,borderRadius:4,color:filterCat===key?col:C.muted,padding:"4px 8px",fontFamily:mono,fontSize:9,fontWeight:500,display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
              {ELEM_CAT_LABELS[key]}
            </button>
          ))}
        </div>
        <div style={{overflowX:"auto",paddingBottom:4}}>
          <div style={{display:"inline-block"}}>
            <div style={{display:"flex",gap:GAP,marginBottom:GAP,paddingLeft:TILE+GAP+2}}>
              {allGroups.map(g=><div key={g} style={{width:TILE,textAlign:"center",fontFamily:mono,fontSize:7,color:C.faint,flexShrink:0}}>{g}</div>)}
            </div>
            {mainRows.map(period=>(
              <div key={period} style={{display:"flex",gap:GAP,marginBottom:GAP,alignItems:"center"}}>
                <div style={{width:TILE,textAlign:"right",paddingRight:4,fontFamily:mono,fontSize:8,color:C.faint,flexShrink:0}}>{period}</div>
                {allGroups.map(group=>{
                  if((period===6&&group===3)||(period===7&&group===3)){const col2=period===6?"#f59e0b":"#84cc16";return<div key={group} style={{width:TILE,height:TILE,borderRadius:3,border:`1px dashed ${col2}33`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:6,color:col2,opacity:0.4,flexShrink:0}}>{period===6?"57–71":"89–103"}</div>;}
                  return renderTile(period,group);
                })}
              </div>
            ))}
            <div style={{height:8}}/>
            {seriesRows.map(period=>(
              <div key={period} style={{display:"flex",gap:GAP,marginBottom:GAP,alignItems:"center"}}>
                <div style={{width:TILE,textAlign:"right",paddingRight:4,fontFamily:mono,fontSize:8,color:C.faint,flexShrink:0}}>{period===8?"La":"Ac"}</div>
                <div style={{width:(TILE+GAP)*2,flexShrink:0}}/>
                {Array.from({length:15},(_,i)=>i+4).map(group=>renderTile(period,group))}
                <div style={{width:TILE,flexShrink:0}}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontFamily:mono,fontSize:10,color:C.faint,textAlign:"center",padding:"4px 0"}}>Tap any element to explore it.</div>
      </div>

      {/* Desktop: fixed right panel */}
      {!isMobile&&(
        <div style={{width:290,flexShrink:0,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {selected?panelContent:<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,padding:24,textAlign:"center"}}><div style={{fontSize:36,opacity:0.12}}>⚛</div><div style={{fontFamily:serif,fontSize:14,color:C.muted,fontWeight:600}}>Select an element</div><div style={{fontFamily:mono,fontSize:10,color:C.faint,lineHeight:1.9}}>Click any tile to see its properties,<br/>chemistry notes, and links<br/>across all your sections.</div></div>}
        </div>
      )}

      {/* Mobile: sheet */}
      {isMobile&&showPanel&&selected&&(
        <Sheet open={showPanel} onClose={()=>setShowPanel(false)} title={`${selected.sym} — ${selected.name}`}>
          <ElementPanel key={selected.n} el={selected} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate}/>
        </Sheet>
      )}
    </div>
  );
}

// ── Chip picker: toggle existing options + create new ones inline ────────────
function ChipPicker({options,selected,onToggle,onAddNew,color}){
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState("");
  const submit=()=>{ if(draft.trim()){ onAddNew(draft.trim()); setDraft(""); setAdding(false);} };
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      {options.map(o=>{const on=selected.includes(o.id);return(
        <button key={o.id} onClick={()=>onToggle(o.id)} style={{background:on?(o.color||color)+"25":C.surface,border:`1px solid ${on?(o.color||color)+"66":C.border}`,borderRadius:5,color:on?(o.color||color):C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{o.label}</button>
      );})}
      {!adding?<button onClick={()=>setAdding(true)} style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:5,color:C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10}}>+ New</button>:
      <span style={{display:"flex",gap:4}}>
        <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submit();}if(e.key==="Escape"){setAdding(false);setDraft("");}}} placeholder="Name…"
          style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,padding:"6px 8px",color:C.text,fontFamily:mono,fontSize:10,width:110}}/>
        <button onClick={submit} style={{background:C.blue+"20",border:`1px solid ${C.blue}55`,borderRadius:5,color:C.blue,padding:"6px 10px",fontFamily:mono,fontSize:10}}>Add</button>
      </span>}
    </div>
  );
}
// ── Link list editor ──────────────────────────────────────────────────────────
function LinkListEditor({links,onChange}){
  const add=()=>onChange([...links,{id:Date.now()+Math.random(),url:"",label:""}]);
  const upd=(id,patch)=>onChange(links.map(l=>l.id===id?{...l,...patch}:l));
  const rm=id=>onChange(links.filter(l=>l.id!==id));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {links.map(l=>(
        <div key={l.id} style={{display:"flex",gap:6}}>
          <Input value={l.label} onChange={e=>upd(l.id,{label:e.target.value})} placeholder="Label…" style={{width:110}}/>
          <Input value={l.url} onChange={e=>upd(l.id,{url:e.target.value})} placeholder="https://…" style={{flex:1}}/>
          <button onClick={()=>rm(l.id)} style={{background:"none",border:"none",color:C.faint,fontSize:14,padding:"0 6px"}}>✕</button>
        </div>
      ))}
      <Btn onClick={add} accent={C.muted} small outlined>+ Add link</Btn>
    </div>
  );
}
// ── Photo picker (auto-compressed) ────────────────────────────────────────────
function PhotoPicker({photos,onChange,entryId}){
  const inputRef=useRef();
  const [uploading,setUploading]=useState(false);
  const addFiles=async(files)=>{
    setUploading(true);
    const uploaded=[];
    for(const f of Array.from(files)){
      try{
        const dataUrl=await resizeImageFile(f);
        const blob=await (await fetch(dataUrl)).blob();
        const path=`${entryId||"misc"}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const {error}=await supabase.storage.from("photos").upload(path,blob,{contentType:"image/jpeg"});
        if(error){console.error("Photo upload failed",error);continue;}
        const {data}=supabase.storage.from("photos").getPublicUrl(path);
        uploaded.push({id:Date.now()+Math.random(),url:data.publicUrl,path});
      }catch(e){console.error("Photo upload failed",e);}
    }
    onChange([...photos,...uploaded]);
    setUploading(false);
  };
  const rm=async id=>{
    const photo=photos.find(p=>p.id===id);
    onChange(photos.filter(p=>p.id!==id));
    if(photo?.path){ try{ await supabase.storage.from("photos").remove([photo.path]); }catch(e){ console.error("Photo delete failed",e); } }
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {photos.map(p=>(
          <div key={p.id} style={{position:"relative"}}>
            <img src={p.url||p.dataUrl} alt="" style={{width:74,height:74,objectFit:"cover",borderRadius:6,border:`1px solid ${C.border}`}}/>
            <button onClick={()=>rm(p.id)} style={{position:"absolute",top:-6,right:-6,background:C.bg,border:`1px solid ${C.border}`,borderRadius:"50%",width:18,height:18,color:C.faint,fontSize:10,lineHeight:1}}>✕</button>
          </div>
        ))}
        <button onClick={()=>inputRef.current.click()} disabled={uploading} style={{width:74,height:74,borderRadius:6,border:`1px dashed ${C.border}`,background:C.surface,color:C.muted,fontSize:uploading?11:20}}>{uploading?"…":"+"}</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{if(e.target.files.length)addFiles(e.target.files);e.target.value="";}}/>
      <div style={{fontFamily:mono,fontSize:9,color:C.faint}}>Photos are compressed and stored in the cloud.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function DatabaseModule({addEntryRef,openId,onOpened,onNavigate,reports,notes,username,isAdmin}) {
  const [entries,setEntries]=useCloudCollection("db",SEED_DB);
  const [pendingSave,setPendingSave]=useState(null);
  const [suggestData,setSuggestData]=useState(null);
  const [manualLinkOpen,setManualLinkOpen]=useState(false);
  const [categories,setCategories]=useLS("priabora-categories",DEFAULT_CATEGORIES);
  const [subcategories,setSubcategories]=useLS("priabora-subcategories",[]);
  const [search,setSearch]=useState("");const [filterCat,setFilterCat]=useState("All");
  const [selected,setSelected]=useState(null);const [showDetail,setShowDetail]=useState(false);
  const [mode,setMode]=useState("view"); // view | edit | new
  const [draft,setDraft]=useState(null);
  const [addingCat,setAddingCat]=useState(false);const [newCatDraft,setNewCatDraft]=useState("");
  const isMobile=useIsMobile();
  const addEntry=useCallback(e=>setEntries(p=>[e,...p]),[setEntries]);
  useEffect(()=>{if(addEntryRef)addEntryRef.current=addEntry;},[addEntry,addEntryRef]);
  const del=id=>{
    const e=entries.find(x=>x.id===id);
    if(e?.lockedBy&&!isAdmin)return; // locked entries can't be deleted by non-admins
    setEntries(p=>p.filter(x=>x.id!==id));setSelected(null);setShowDetail(false);setMode("view");
  };
  const openEntry=e=>{setSelected(e);setMode("view");setShowDetail(true);};
  useEffect(()=>{
    if(openId==null)return;
    const e=entries.find(x=>x.id===openId);
    if(e)openEntry(e);
    onOpened&&onOpened();
  },[openId]);
  const toggleLock=()=>{if(!isAdmin||!selected)return;updateEntry(selected.id,{lockedBy:selected.lockedBy?null:username},true);};
  const updateEntry=(id,patch,fromAdminLockAction)=>{
    const e=entries.find(x=>x.id===id);
    if(e?.lockedBy&&!isAdmin&&!fromAdminLockAction)return; // locked entries can't be edited by non-admins
    setEntries(p=>p.map(x=>x.id===id?{...x,...patch}:x));setSelected(p=>p&&p.id===id?{...p,...patch}:p);
  };
  const filtered=entries.filter(e=>{const mc=filterCat==="All"||getEntryCats(e).includes(filterCat);const q=search.toLowerCase();return mc&&(!q||e.name.toLowerCase().includes(q)||e.summary.toLowerCase().includes(q)||e.tags.some(t=>t.includes(q)));});

  const addCategory=()=>{const label=newCatDraft.trim();if(!label){setAddingCat(false);return;}if(!categories.some(c=>c.id===label)){const color=CAT_PALETTE[categories.length%CAT_PALETTE.length];setCategories(p=>[...p,{id:label,label,color}]);}setAddingCat(false);setNewCatDraft("");};

  const BLANK_DB_ENTRY=()=>({id:Date.now(),name:"",summary:"",tagsStr:"",categories:[],subcategories:[],links:[],photos:[],history:"",generalInfo:"",properties:{},date:new Date().toISOString().split("T")[0],createdBy:username||"",lockedBy:null});
  const startNew=()=>{setDraft(BLANK_DB_ENTRY());setSelected(null);setMode("new");setShowDetail(true);};
  const startEdit=()=>{setDraft({...selected,tagsStr:(selected.tags||[]).join(", "),categories:getEntryCats(selected),subcategories:getEntrySubs(selected),links:selected.links||[],photos:selected.photos||[],properties:selected.properties||{}});setMode("edit");};
  const toggleCat=id=>setDraft(d=>({...d,categories:d.categories.includes(id)?d.categories.filter(x=>x!==id):[...d.categories,id]}));
  const toggleSub=id=>setDraft(d=>({...d,subcategories:d.subcategories.includes(id)?d.subcategories.filter(x=>x!==id):[...d.subcategories,id]}));
  const addNewCategoryToDraft=label=>{if(!categories.some(c=>c.id===label)){const color=CAT_PALETTE[categories.length%CAT_PALETTE.length];setCategories(p=>[...p,{id:label,label,color}]);}setDraft(d=>d.categories.includes(label)?d:{...d,categories:[...d.categories,label]});};
  const addNewSubcategoryToDraft=label=>{if(!subcategories.some(s=>s.id===label)){setSubcategories(p=>[...p,{id:label,label}]);}setDraft(d=>d.subcategories.includes(label)?d:{...d,subcategories:[...d.subcategories,label]});};
  const finalizeSave=saved=>{
    if(mode==="new"){setEntries(p=>[saved,...p]);setSelected(saved);}
    else{setEntries(p=>p.map(e=>e.id===saved.id?saved:e));setSelected(saved);}
    setMode("view");
  };
  const saveEntry=()=>{
    if(!draft.name.trim())return;
    const saved={...draft,tags:draft.tagsStr.split(",").map(t=>t.trim()).filter(Boolean)};
    delete saved.tagsStr; delete saved.category;
    const text=[saved.name,saved.summary,saved.history,saved.generalInfo,(saved.tags||[]).join(" ")];
    const els=elementsMentionedIn(...text).filter(el=>!(saved.linkedElements||[]).includes(el.n));
    const dbM=entriesMentionedIn(entries,"name",saved.id,...text).filter(e=>!(saved.linkedDbIds||[]).includes(e.id));
    const repM=entriesMentionedIn(reports,"title",null,...text).filter(r=>!(saved.linkedReportIds||[]).includes(r.id));
    const noteM=entriesMentionedIn(notes,"title",null,...text).filter(n=>!(saved.linkedNoteIds||[]).includes(n.id));
    const allDb=entries.filter(e=>e.id!==saved.id&&!(saved.linkedDbIds||[]).includes(e.id));
    const allRep=(reports||[]).filter(r=>!(saved.linkedReportIds||[]).includes(r.id));
    const allNote=(notes||[]).filter(n=>!(saved.linkedNoteIds||[]).includes(n.id));
    if(els.length+dbM.length+repM.length+noteM.length===0){finalizeSave(saved);return;}
    setPendingSave(saved);
    setSuggestData({elements:els,dbEntries:dbM,reports:repM,notes:noteM,allDb,allRep,allNote});
  };
  const confirmSuggested=sel=>{
    const merged={...pendingSave,
      linkedElements:[...new Set([...(pendingSave.linkedElements||[]),...sel.elements])],
      linkedDbIds:[...new Set([...(pendingSave.linkedDbIds||[]),...sel.db])],
      linkedReportIds:[...new Set([...(pendingSave.linkedReportIds||[]),...sel.reports])],
      linkedNoteIds:[...new Set([...(pendingSave.linkedNoteIds||[]),...sel.notes])],
    };
    finalizeSave(merged);setPendingSave(null);setSuggestData(null);
  };
  const skipSuggested=()=>{finalizeSave(pendingSave);setPendingSave(null);setSuggestData(null);};
  const addManualLinks=sel=>{
    if(!selected)return;
    if(selected.lockedBy&&!isAdmin){setManualLinkOpen(false);return;}
    const patch={
      linkedElements:[...new Set([...(selected.linkedElements||[]),...sel.elements])],
      linkedDbIds:[...new Set([...(selected.linkedDbIds||[]),...sel.db])],
      linkedReportIds:[...new Set([...(selected.linkedReportIds||[]),...sel.reports])],
      linkedNoteIds:[...new Set([...(selected.linkedNoteIds||[]),...sel.notes])],
    };
    updateEntry(selected.id,patch);
    setManualLinkOpen(false);
  };

  const dbLocked=!!selected?.lockedBy;
  const dbCanEdit=!dbLocked||isAdmin;
  const detailContent=selected&&mode==="view"&&(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>{getEntryCats(selected).map(cid=><Pill key={cid} label={categories.find(c=>c.id===cid)?.label||cid} color={catColor(cid,categories)}/>)}<LockBadge lockedBy={selected.lockedBy}/></div>
      <EditableText value={selected.name} onSave={v=>updateEntry(selected.id,{name:v})} readOnly={!dbCanEdit} placeholder="Entry name…" style={{fontFamily:serif,fontSize:18,color:C.text,fontWeight:700}}/>
      <div style={{borderLeft:`3px solid ${catColor(getEntryCats(selected)[0],categories)}`,paddingLeft:12}}><EditableText tag="p" value={selected.summary} onSave={v=>updateEntry(selected.id,{summary:v})} readOnly={!dbCanEdit} multiline placeholder="Summary…" style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}/></div>
      {getEntryCats(selected).includes("Compound")&&<CompoundPropsGrid properties={selected.properties} readOnly={!dbCanEdit} onSave={(k,v)=>updateEntry(selected.id,{properties:{...(selected.properties||{}),[k]:v}})}/>}
      {getEntrySubs(selected).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{getEntrySubs(selected).map(sid=><Pill key={sid} label={subcategories.find(s=>s.id===sid)?.label||sid} color={C.purple} small/>)}</div>}
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{selected.tags.map(t=><Pill key={t} label={t} color={C.muted} small/>)}</div>
      <div><SLabel accent={C.yellow}>History</SLabel><EditableText tag="p" value={selected.history||""} onSave={v=>updateEntry(selected.id,{history:v})} readOnly={!dbCanEdit} multiline placeholder="Click to add history…" style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${C.yellow}44`,paddingLeft:12}}/></div>
      <div><SLabel accent={C.pink}>General Info</SLabel><EditableText tag="p" value={selected.generalInfo||""} onSave={v=>updateEntry(selected.id,{generalInfo:v})} readOnly={!dbCanEdit} multiline placeholder="Click to add general info…" style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${C.pink}44`,paddingLeft:12}}/></div>
      <ElementMentionPills elements={elementsMentionedIn(selected.name,selected.summary,selected.history,selected.generalInfo,(selected.tags||[]).join(" "))} onNavigate={onNavigate}/>
      <LinkedEntriesDisplay entry={selected} dbEntries={entries} reports={reports} notes={notes} onNavigate={onNavigate}/>
      {selected.links?.filter(l=>l.url).length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>{selected.links.filter(l=>l.url).map(l=><a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={{fontFamily:mono,fontSize:11,color:C.blue,textDecoration:"none",borderBottom:`1px dashed ${C.blue}55`,width:"fit-content"}}>🔗 {l.label||l.url}</a>)}</div>}
      {selected.photos?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{selected.photos.map(p=><img key={p.id} src={p.url||p.dataUrl} alt="" onClick={()=>window.open(p.url||p.dataUrl,"_blank")} style={{width:74,height:74,objectFit:"cover",borderRadius:6,border:`1px solid ${C.border}`,cursor:"zoom-in"}}/>)}</div>}
      <p style={{fontFamily:mono,fontSize:10,color:C.faint}}>Added {selected.date}{selected.createdBy?` · by ${selected.createdBy}`:""}</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {dbCanEdit&&<Btn onClick={startEdit} accent={C.blue} small>Edit</Btn>}
        {dbCanEdit&&<Btn onClick={()=>setManualLinkOpen(true)} accent={C.orange} small outlined>+ Add link</Btn>}
        {dbCanEdit&&<Btn onClick={()=>del(selected.id)} accent="#f87171" small outlined>Delete</Btn>}
        {isAdmin&&<LockToggleBtn locked={dbLocked} onToggle={toggleLock}/>}
      </div>
    </div>
  );

  const editContent=draft&&(mode==="new"||mode==="edit")&&(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Entry name…" style={{fontFamily:serif,fontSize:14}}/>
      <Textarea value={draft.summary} onChange={e=>setDraft(d=>({...d,summary:e.target.value}))} placeholder="Summary…" rows={4}/>
      <Input value={draft.tagsStr} onChange={e=>setDraft(d=>({...d,tagsStr:e.target.value}))} placeholder="Tags (comma-separated)…"/>
      <div><SLabel accent={C.blue}>Categories</SLabel><ChipPicker options={categories} selected={draft.categories} onToggle={toggleCat} onAddNew={addNewCategoryToDraft} color={C.blue}/></div>
      <div><SLabel accent={C.purple}>Subcategories</SLabel><ChipPicker options={subcategories} selected={draft.subcategories} onToggle={toggleSub} onAddNew={addNewSubcategoryToDraft} color={C.purple}/></div>
      {draft.categories.includes("Compound")&&<div><SLabel accent={C.blue}>Properties</SLabel><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{COMPOUND_PROPERTY_FIELDS.map(([key,label])=>(
        <Input key={key} value={draft.properties?.[key]||""} onChange={e=>setDraft(d=>({...d,properties:{...d.properties,[key]:e.target.value}}))} placeholder={label}/>
      ))}</div></div>}
      <div><SLabel accent={C.teal}>Links</SLabel><LinkListEditor links={draft.links} onChange={links=>setDraft(d=>({...d,links}))}/></div>
      <div><SLabel accent={C.green}>Photos</SLabel><PhotoPicker photos={draft.photos} onChange={photos=>setDraft(d=>({...d,photos}))} entryId={draft.id}/></div>
      <div><SLabel accent={C.yellow}>History</SLabel><Textarea value={draft.history||""} onChange={e=>setDraft(d=>({...d,history:e.target.value}))} placeholder="Historical background, discovery, notable events…" rows={4}/></div>
      <div><SLabel accent={C.pink}>General Info</SLabel><Textarea value={draft.generalInfo||""} onChange={e=>setDraft(d=>({...d,generalInfo:e.target.value}))} placeholder="General overview, interesting facts…" rows={4}/></div>
      <div style={{display:"flex",gap:8,paddingBottom:12}}><Btn onClick={saveEntry} accent={C.green}>Save entry</Btn><Btn onClick={()=>{setMode("view");if(!selected)setShowDetail(false);}} accent={C.muted} outlined>Cancel</Btn></div>
    </div>
  );

  return (
    <div style={{display:"flex",gap:16,height:"100%",minHeight:0}}>
      {suggestData&&<LinkSuggestModal elements={suggestData.elements} dbEntries={suggestData.dbEntries} reports={suggestData.reports} notes={suggestData.notes} allDbEntries={suggestData.allDb} allReports={suggestData.allRep} allNotes={suggestData.allNote} excludeElements={pendingSave?.linkedElements||[]} onConfirm={confirmSuggested} onSkip={skipSuggested}/>}
      {manualLinkOpen&&selected&&<LinkSuggestModal mode="manage" allDbEntries={entries.filter(e=>e.id!==selected.id&&!(selected.linkedDbIds||[]).includes(e.id))} allReports={(reports||[]).filter(r=>!(selected.linkedReportIds||[]).includes(r.id))} allNotes={(notes||[]).filter(n=>!(selected.linkedNoteIds||[]).includes(n.id))} excludeElements={selected.linkedElements||[]} onConfirm={addManualLinks} onSkip={()=>setManualLinkOpen(false)}/>}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        <Btn onClick={startNew} accent={C.green} small>+ New entry</Btn>
        {/* Search + filter */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entries…"/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <button onClick={()=>setFilterCat("All")} style={{background:filterCat==="All"?C.blue+"20":C.surface,border:`1px solid ${filterCat==="All"?C.blue+"55":C.border}`,borderRadius:5,color:filterCat==="All"?C.blue:C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>All</button>
            {categories.map(cat=><button key={cat.id} onClick={()=>setFilterCat(cat.id)} style={{background:filterCat===cat.id?cat.color+"20":C.surface,border:`1px solid ${filterCat===cat.id?cat.color+"55":C.border}`,borderRadius:5,color:filterCat===cat.id?cat.color:C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{cat.label}</button>)}
            {!addingCat?<button onClick={()=>setAddingCat(true)} style={{background:"none",border:`1px dashed ${C.border}`,borderRadius:5,color:C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10}}>+ New category</button>:
            <span style={{display:"flex",gap:4}}>
              <input autoFocus value={newCatDraft} onChange={e=>setNewCatDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCategory();}if(e.key==="Escape"){setAddingCat(false);setNewCatDraft("");}}} placeholder="Category name…"
                style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,padding:"6px 8px",color:C.text,fontFamily:mono,fontSize:10,width:120}}/>
              <button onClick={addCategory} style={{background:C.blue+"20",border:`1px solid ${C.blue}55`,borderRadius:5,color:C.blue,padding:"6px 10px",fontFamily:mono,fontSize:10}}>Add</button>
            </span>}
          </div>
        </div>
        {/* Entry list */}
        {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:C.faint,fontFamily:mono,fontSize:12}}>No entries yet — tap + New entry to add one.</div>
        :filtered.map(e=>{const cats=getEntryCats(e);const col=catColor(cats[0],categories);const isSel=selected?.id===e.id&&showDetail;return(
          <div key={e.id} onClick={()=>openEntry(e)} style={{background:isSel?"#12172a":C.panel,border:`1px solid ${isSel?col+"55":C.border}`,borderLeft:`3px solid ${col}`,borderRadius:7,padding:"12px 14px",marginBottom:6,cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>{if(!isSel)e2.currentTarget.style.background="#0e1220";}} onMouseLeave={e2=>{if(!isSel)e2.currentTarget.style.background=C.panel;}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:8}}>
              <span style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600,flex:1,minWidth:0}}>{e.name}</span>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end",flexShrink:0}}>
                {cats.length>0&&<Pill label={categories.find(c=>c.id===cats[0])?.label||cats[0]} color={col} small/>}
                {cats.length>1&&<Pill label={`+${cats.length-1}`} color={C.muted} small/>}
                <LockBadge lockedBy={e.lockedBy} small/>
              </div>
            </div>
            <p style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:7,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{e.summary}</p>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{e.tags.map(t=><Pill key={t} label={t} color={C.faint} small/>)}{e.photos?.length>0&&<Pill label={`📷 ${e.photos.length}`} color={C.faint} small/>}{e.links?.filter(l=>l.url).length>0&&<Pill label={`🔗 ${e.links.filter(l=>l.url).length}`} color={C.faint} small/>}</div>
          </div>
        );})}
      </div>

      {/* Desktop right panel */}
      {!isMobile&&showDetail&&(
        <div style={{width:340,flexShrink:0,overflowY:"auto"}}>
          <Card style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button onClick={()=>setShowDetail(false)} style={{background:"none",border:"none",color:C.muted,fontSize:16}}>✕</button></div>
            {mode==="view"?detailContent:editContent}
          </Card>
        </div>
      )}
      {/* Mobile sheet */}
      {isMobile&&<Sheet open={showDetail} onClose={()=>setShowDetail(false)} title={mode==="new"?"New Entry":mode==="edit"?"Edit Entry":selected?.name||""}>{mode==="view"?detailContent:editContent}</Sheet>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECTRUM MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function SpectrumModule({saveToDbRef,spectraResultsRef,dbEntries,reports,setReports}) {
  const [file,setFile]=useState(null);const [preview,setPreview]=useState(null);const [specType,setSpecType]=useState("auto");
  const [loading,setLoading]=useState(false);const [result,setResult]=useState(null);const [error,setError]=useState(null);
  const [dragOver,setDragOver]=useState(false);const [savedDb,setSavedDb]=useState(false);
  const [showLink,setShowLink]=useState(false);const [pendingSave,setPendingSave]=useState(null);
  const [spectraResults,setSpectraResults]=useCloudCollection("spectra-meta",[]);
  const inputRef=useRef();
  useEffect(()=>{if(spectraResultsRef)spectraResultsRef.current=spectraResults;},[spectraResults,spectraResultsRef]);
  const handleFile=useCallback(f=>{setFile(f);setResult(null);setError(null);setSavedDb(false);if(fileKind(f)==="image")setPreview(URL.createObjectURL(f));else setPreview(null);},[]);
  const analyse=async()=>{
    if(!file)return;setLoading(true);setResult(null);setError(null);setSavedDb(false);
    const det=specType==="auto"?"NMR or IR (auto-detect)":specType.toUpperCase();
    const sys=`You are an expert analytical chemistry assistant. Analyse and respond ONLY with valid JSON (no markdown):{"spectrumType":"NMR"|"IR"|"NMR+IR","peaks":[{"position":"string","intensity":"strong|medium|weak","assignment":"string","group":"string","groupColor":"#hex"}],"functionalGroups":[{"name":"string","evidence":"string","confidence":"High|Medium|Low"}],"structureGuess":{"name":"string","formula":"string","confidence":"High|Medium|Low","reasoning":"string","alternatives":["string"]},"examNotes":["string"],"summary":"string"}`;
    try{let messages;const fk=fileKind(file);
      if(fk==="image"){const b64=await toBase64(file);messages=[{role:"user",content:[{type:"image",source:{type:"base64",media_type:imgMime(file),data:b64}},{type:"text",text:`Analyse this ${det} spectrum.`}]}];}
      else if(fk==="pdf"){const b64=await toBase64(file);messages=[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:`Analyse ${det} spectrum.`}]}];}
      else if(fk==="csv"){const t=await toText(file);messages=[{role:"user",content:`${det} data:\n\n${t.slice(0,7000)}\n\nAnalyse.`}];}
      else if(fk==="xlsx"){const buf=await file.arrayBuffer();const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");const wb=XLSX.read(buf,{type:"array"});const csv=XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);messages=[{role:"user",content:`${det} data:\n\n${csv.slice(0,7000)}\n\nAnalyse.`}];}
      else throw new Error("Unsupported file type.");
      const t=await callClaude(sys,messages);setResult(parseJSON(t));
    }catch(e){setError(e.message||"Analysis failed.");}setLoading(false);
  };
  const saveToDb=()=>{if(!result||!saveToDbRef?.current)return;saveToDbRef.current({id:Date.now(),name:result.structureGuess?.name||`Spectrum ${new Date().toLocaleDateString()}`,category:"Compound",summary:result.summary||"",tags:(result.functionalGroups||[]).slice(0,4).map(g=>g.name.toLowerCase()),date:new Date().toISOString().split("T")[0]});setSavedDb(true);};
  const attachToReport=()=>{if(!result)return;setPendingSave({id:Date.now(),name:result.structureGuess?.name||`Spectrum ${new Date().toLocaleDateString()}`,spectrumType:result.spectrumType,summary:result.summary,date:new Date().toISOString().split("T")[0],resultData:result});setShowLink(true);};
  const confirmLinks=(selS,selD)=>{const meta={...pendingSave};setSpectraResults(p=>[meta,...p]);if(selS.length>0)setReports(prev=>prev.map(r=>selS.includes(r.id)?{...r,linkedSpectra:[...r.linkedSpectra,meta.id]}:r));setShowLink(false);setPendingSave(null);};
  const accent=result?.spectrumType?.includes("IR")?C.green:C.blue;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,overflowY:"auto",height:"100%"}}>
      {showLink&&<LinkPickerModal title="Link spectrum to reports" dbEntries={dbEntries} spectraResults={reports} currentLinkedSpectra={[]} currentLinkedDbIds={[]} onConfirm={confirmLinks} onClose={()=>setShowLink(false)}/>}
      <div onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onClick={()=>!file&&inputRef.current.click()}
        style={{border:`2px dashed ${dragOver?C.blue:file?C.blue+"40":C.border}`,borderRadius:10,padding:24,background:dragOver?C.blue+"08":file?C.panel:C.surface,cursor:file?"default":"pointer",transition:"all 0.18s",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <input ref={inputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
        {!file?(<><div style={{fontSize:30,opacity:0.35}}>⚗️</div><div style={{fontFamily:serif,fontSize:14,color:C.muted}}>Tap to upload spectrum</div><div style={{fontFamily:mono,fontSize:10,color:C.faint}}>Image · PDF · Excel · CSV</div></>):(
          <div style={{width:"100%",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            {preview&&<img src={preview} alt="spectrum" style={{maxHeight:120,maxWidth:180,borderRadius:5,border:`1px solid ${C.border}`,objectFit:"contain",background:"#fff"}}/>}
            <div style={{flex:1}}><div style={{fontFamily:serif,fontSize:13,color:C.text,marginBottom:3}}>{file.name}</div><div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:8}}>{(file.size/1024).toFixed(1)} KB</div><Btn onClick={e=>{e.stopPropagation();setFile(null);setPreview(null);setResult(null);setError(null);}} accent={C.muted} small outlined>Remove</Btn></div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {[["auto","Auto"],["nmr","NMR"],["ir","IR"],["both","NMR+IR"]].map(([v,l])=><button key={v} onClick={()=>setSpecType(v)} style={{background:specType===v?C.blue+"20":C.surface,border:`1px solid ${specType===v?C.blue+"55":C.border}`,borderRadius:5,color:specType===v?C.blue:C.muted,padding:"7px 10px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{l}</button>)}
        <Btn onClick={analyse} disabled={!file||loading} accent={C.blue} small style={{marginLeft:"auto"}}>{loading?<span style={{display:"flex",alignItems:"center",gap:6}}><span style={{animation:"pulse 1s infinite",display:"inline-block"}}>◉</span>…</span>:"Analyse →"}</Btn>
      </div>
      {result&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Btn onClick={saveToDb} accent={savedDb?C.green:C.purple} small disabled={savedDb}>{savedDb?"✓ Saved to DB":"Save to DB"}</Btn><Btn onClick={attachToReport} accent={C.teal} small>⇢ Attach to report</Btn></div>}
      {error&&<div style={{background:"#f8717115",border:"1px solid #f8717130",borderRadius:7,padding:"12px 14px",fontFamily:mono,fontSize:11,color:"#f87171"}}>⚠ {error}</div>}
      {result&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}><div style={{width:8,height:8,borderRadius:"50%",background:accent,boxShadow:`0 0 10px ${accent}88`}}/><span style={{fontFamily:serif,fontSize:15,color:C.text,fontWeight:600}}>{result.spectrumType} Analysis</span>{result.structureGuess?.name&&<span style={{fontFamily:mono,fontSize:11,color:C.muted}}>· {result.structureGuess.name}</span>}</Card>
          {result.summary&&<p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}>{result.summary}</p>}
          {result.structureGuess&&<Card style={{padding:14}}><SLabel accent={C.green}>Likely Compound</SLabel><div style={{fontFamily:serif,fontSize:16,color:C.text,fontWeight:700,marginBottom:4}}>{result.structureGuess.name}</div>{result.structureGuess.formula&&<div style={{fontFamily:mono,fontSize:12,color:C.green,marginBottom:8}}>{result.structureGuess.formula}</div>}{result.structureGuess.reasoning&&<p style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.7}}>{result.structureGuess.reasoning}</p>}</Card>}
          {result.functionalGroups?.length>0&&<Card style={{padding:14}}><SLabel accent={C.pink}>Functional Groups</SLabel><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{result.functionalGroups.map((g,i)=>{const cols=[C.green,C.blue,C.pink,C.yellow,C.orange,C.purple];const c=cols[i%cols.length];return<div key={i} style={{background:c+"12",border:`1px solid ${c}25`,borderRadius:7,padding:"9px 11px",flex:"1 1 130px"}}><div style={{fontFamily:serif,fontSize:13,color:c,marginBottom:3}}>{g.name}</div><div style={{fontFamily:mono,fontSize:10,color:C.muted,lineHeight:1.5,marginBottom:4}}>{g.evidence}</div><Pill label={g.confidence} small color={g.confidence==="High"?C.green:g.confidence==="Medium"?C.yellow:C.orange}/></div>;})}</div></Card>}
          {result.peaks?.length>0&&<Card style={{padding:14}}><SLabel accent={accent}>Peak Assignments</SLabel><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontFamily:mono,fontSize:11}}><thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["Position","Intensity","Assignment","Group"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",color:C.faint,fontSize:9,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>{h}</th>)}</tr></thead><tbody>{result.peaks.map((p,i)=><tr key={i} className="hover-row" style={{borderBottom:`1px solid ${C.border}40`}}><td style={{padding:"7px 8px",color:C.text,fontWeight:600}}>{p.position}</td><td style={{padding:"7px 8px",color:C.muted}}>{p.intensity||"—"}</td><td style={{padding:"7px 8px",color:C.muted}}>{p.assignment}</td><td style={{padding:"7px 8px"}}>{p.group&&<Pill label={p.group} color={p.groupColor||C.blue} small/>}</td></tr>)}</tbody></table></div></Card>}
          {result.examNotes?.length>0&&<Card style={{padding:14}}><SLabel accent={C.yellow}>Exam Notes</SLabel><div style={{display:"flex",flexDirection:"column",gap:6}}>{result.examNotes.map((n,i)=><div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.yellow}`,borderRadius:5,padding:"8px 11px",fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.7}}><span style={{color:C.yellow,marginRight:8}}>▸</span>{n}</div>)}</div></Card>}
        </div>
      )}
      {!file&&!result&&<div style={{textAlign:"center",padding:"30px 20px",color:C.faint,fontFamily:mono,fontSize:11,lineHeight:2}}>Upload a spectrum to begin analysis.</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTEBOOK MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function NotebookModule({openId,onOpened,onNavigate,dbEntries,reports,username,isAdmin}) {
  const [notes,setNotes]=useCloudCollection("notes",SEED_NOTES);
  const [sel,setSel]=useState(null);const [editing,setEditing]=useState(false);const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState({title:"",content:"",tags:""});const [aiLoading,setAiLoading]=useState(false);
  const toggleLock=()=>{if(!isAdmin||!sel)return;const u={...sel,lockedBy:sel.lockedBy?null:username};setNotes(p=>p.map(n=>n.id===sel.id?u:n));setSel(u);};
  const [showDetail,setShowDetail]=useState(false);
  const [pendingSave,setPendingSave]=useState(null);
  const [pendingKind,setPendingKind]=useState(null);
  const [suggestData,setSuggestData]=useState(null);
  const [manualLinkOpen,setManualLinkOpen]=useState(false);
  const isMobile=useIsMobile();
  const openNote=n=>{setSel(n);setEditing(false);setShowDetail(true);};
  useEffect(()=>{
    if(openId==null)return;
    const n=notes.find(x=>x.id===openId);
    if(n)openNote(n);
    onOpened&&onOpened();
  },[openId]);
  const startNew=()=>{setDraft({title:"",content:"",tags:""});setCreating(true);setSel(null);setShowDetail(true);};
  const finalizeSave=(n,kind)=>{
    if(kind==="new"){setNotes(p=>[n,...p]);setSel(n);setCreating(false);}
    else{setNotes(p=>p.map(x=>x.id===n.id?n:x));setSel(n);setEditing(false);}
  };
  const stageSave=(n,kind)=>{
    const text=[n.title,n.content,(n.tags||[]).join(" ")];
    const els=elementsMentionedIn(...text).filter(el=>!(n.linkedElements||[]).includes(el.n));
    const dbM=entriesMentionedIn(dbEntries,"name",null,...text).filter(e=>!(n.linkedDbIds||[]).includes(e.id));
    const repM=entriesMentionedIn(reports,"title",null,...text).filter(r=>!(n.linkedReportIds||[]).includes(r.id));
    const noteM=entriesMentionedIn(notes,"title",n.id,...text).filter(x=>!(n.linkedNoteIds||[]).includes(x.id));
    const allDb=(dbEntries||[]).filter(e=>!(n.linkedDbIds||[]).includes(e.id));
    const allRep=(reports||[]).filter(r=>!(n.linkedReportIds||[]).includes(r.id));
    const allNote=notes.filter(x=>x.id!==n.id&&!(n.linkedNoteIds||[]).includes(x.id));
    if(els.length+dbM.length+repM.length+noteM.length===0){finalizeSave(n,kind);return;}
    setPendingSave(n);setPendingKind(kind);
    setSuggestData({elements:els,dbEntries:dbM,reports:repM,notes:noteM,allDb,allRep,allNote});
  };
  const saveNew=()=>{if(!draft.title.trim())return;const n={id:Date.now(),title:draft.title,date:new Date().toISOString().split("T")[0],tags:draft.tags.split(",").map(t=>t.trim()).filter(Boolean),content:draft.content,aiSummary:null,createdBy:username||"",lockedBy:null};stageSave(n,"new");};
  const saveEdit=()=>{const u={...sel,title:draft.title,content:draft.content,tags:draft.tags.split(",").map(t=>t.trim()).filter(Boolean)};stageSave(u,"edit");};
  const confirmSuggested=sel2=>{
    const merged={...pendingSave,
      linkedElements:[...new Set([...(pendingSave.linkedElements||[]),...sel2.elements])],
      linkedDbIds:[...new Set([...(pendingSave.linkedDbIds||[]),...sel2.db])],
      linkedReportIds:[...new Set([...(pendingSave.linkedReportIds||[]),...sel2.reports])],
      linkedNoteIds:[...new Set([...(pendingSave.linkedNoteIds||[]),...sel2.notes])],
    };
    finalizeSave(merged,pendingKind);
    setPendingSave(null);setSuggestData(null);setPendingKind(null);
  };
  const skipSuggested=()=>{finalizeSave(pendingSave,pendingKind);setPendingSave(null);setSuggestData(null);setPendingKind(null);};
  const addManualLinks=sel2=>{
    if(!sel)return;
    if(sel.lockedBy&&!isAdmin){setManualLinkOpen(false);return;}
    const u={...sel,
      linkedElements:[...new Set([...(sel.linkedElements||[]),...sel2.elements])],
      linkedDbIds:[...new Set([...(sel.linkedDbIds||[]),...sel2.db])],
      linkedReportIds:[...new Set([...(sel.linkedReportIds||[]),...sel2.reports])],
      linkedNoteIds:[...new Set([...(sel.linkedNoteIds||[]),...sel2.notes])],
    };
    setNotes(p=>p.map(n=>n.id===sel.id?u:n));setSel(u);setManualLinkOpen(false);
  };
  const startEdit=()=>{setDraft({title:sel.title,content:sel.content,tags:sel.tags.join(", ")});setEditing(true);};
  const del=id=>{
    const n=notes.find(x=>x.id===id);
    if(n?.lockedBy&&!isAdmin)return;
    setNotes(p=>p.filter(x=>x.id!==id));setSel(null);setShowDetail(false);
  };
  const aiSummarise=async()=>{if(!sel)return;setAiLoading(true);try{const t=await callClaude("You are a chemistry tutor. Summarise this lab note (3-4 sentences), highlight key chemistry, and suggest one follow-up question.",[{role:"user",content:`Title: ${sel.title}\n\n${sel.content}`}]);const u={...sel,aiSummary:t};setNotes(p=>p.map(n=>n.id===sel.id?u:n));setSel(u);}catch{}setAiLoading(false);};

  const detailContent=(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {creating&&<>
        <Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Title…" style={{fontFamily:serif,fontSize:14}}/>
        <Input value={draft.tags} onChange={e=>setDraft(d=>({...d,tags:e.target.value}))} placeholder="Tags (comma-separated)…"/>
        <Textarea value={draft.content} onChange={e=>setDraft(d=>({...d,content:e.target.value}))} placeholder="Write your lab notes here…" rows={10}/>
        <div style={{display:"flex",gap:8}}><Btn onClick={saveNew} accent={C.green}>Save</Btn><Btn onClick={()=>{setCreating(false);setShowDetail(false);}} accent={C.muted} outlined>Cancel</Btn></div>
      </>}
      {sel&&!creating&&!editing&&(()=>{const noteLocked=!!sel.lockedBy;const noteCanEdit=!noteLocked||isAdmin;return<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}><span style={{fontFamily:serif,fontSize:18,color:C.text,fontWeight:700}}>{sel.title}</span><LockBadge lockedBy={sel.lockedBy}/></div><div style={{fontFamily:mono,fontSize:10,color:C.muted}}>{sel.date}{sel.createdBy?` · by ${sel.createdBy}`:""}</div></div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {noteCanEdit&&<Btn onClick={startEdit} accent={C.blue} small>Edit</Btn>}
            {noteCanEdit&&<Btn onClick={()=>setManualLinkOpen(true)} accent={C.orange} small outlined>+ Add link</Btn>}
            {noteCanEdit&&<Btn onClick={()=>del(sel.id)} accent="#f87171" small outlined>Delete</Btn>}
            {isAdmin&&<LockToggleBtn locked={noteLocked} onToggle={toggleLock}/>}
          </div>
        </div>
        {sel.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{sel.tags.map(t=><Pill key={t} label={t} color={C.purple} small/>)}</div>}
        <div style={{fontFamily:mono,fontSize:15,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap",borderLeft:`3px solid ${C.border}`,paddingLeft:12}}>{sel.content}</div>
        <ElementMentionPills elements={elementsMentionedIn(sel.title,sel.content,(sel.tags||[]).join(" "))} onNavigate={onNavigate}/>
        <LinkedEntriesDisplay entry={sel} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate}/>
        {sel.aiSummary?<Card style={{padding:14,border:`1px solid ${C.purple}33`,borderLeft:`3px solid ${C.purple}`}}><SLabel accent={C.purple}>AI Summary</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}>{sel.aiSummary}</p></Card>:<Btn onClick={aiSummarise} disabled={aiLoading} accent={C.purple} small full>{aiLoading?"Summarising…":"✦ Get AI tutor summary"}</Btn>}
      </>;})()}
      {sel&&editing&&<>
        <Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Title…" style={{fontFamily:serif,fontSize:14}}/>
        <Input value={draft.tags} onChange={e=>setDraft(d=>({...d,tags:e.target.value}))} placeholder="Tags…"/>
        <Textarea value={draft.content} onChange={e=>setDraft(d=>({...d,content:e.target.value}))} rows={10}/>
        <div style={{display:"flex",gap:8}}><Btn onClick={saveEdit} accent={C.green}>Save</Btn><Btn onClick={()=>setEditing(false)} accent={C.muted} outlined>Cancel</Btn></div>
      </>}
    </div>
  );

  return (
    <div style={{height:"100%",overflow:"hidden",display:"flex",flexDirection:"column",gap:12}}>
      {suggestData&&<LinkSuggestModal elements={suggestData.elements} dbEntries={suggestData.dbEntries} reports={suggestData.reports} notes={suggestData.notes} allDbEntries={suggestData.allDb} allReports={suggestData.allRep} allNotes={suggestData.allNote} excludeElements={pendingSave?.linkedElements||[]} onConfirm={confirmSuggested} onSkip={skipSuggested}/>}
      {manualLinkOpen&&sel&&<LinkSuggestModal mode="manage" allDbEntries={(dbEntries||[]).filter(e=>!(sel.linkedDbIds||[]).includes(e.id))} allReports={(reports||[]).filter(r=>!(sel.linkedReportIds||[]).includes(r.id))} allNotes={notes.filter(n=>n.id!==sel.id&&!(sel.linkedNoteIds||[]).includes(n.id))} excludeElements={sel.linkedElements||[]} onConfirm={addManualLinks} onSkip={()=>setManualLinkOpen(false)}/>}
      <Btn onClick={startNew} accent={C.green} small>+ New entry</Btn>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {notes.length===0&&<div style={{fontFamily:mono,fontSize:11,color:C.faint,textAlign:"center",paddingTop:20}}>No entries yet</div>}
        {notes.map(n=>(
          <div key={n.id} onClick={()=>openNote(n)} style={{background:sel?.id===n.id&&showDetail&&!isMobile?"#12172a":C.panel,border:`1px solid ${sel?.id===n.id&&showDetail&&!isMobile?C.blue+"55":C.border}`,borderRadius:7,padding:"12px 14px",cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background="#0e1220"} onMouseLeave={e2=>e2.currentTarget.style.background=C.panel}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}><span style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600}}>{n.title}</span><LockBadge lockedBy={n.lockedBy} small/></div>
            <div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:6}}>{n.date}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{n.tags.map(t=><Pill key={t} label={t} color={C.muted} small/>)}</div>
          </div>
        ))}
      </div>
      {/* Mobile: sheet */}
      {isMobile&&<Sheet open={showDetail} onClose={()=>{setShowDetail(false);setCreating(false);setEditing(false);}} title={creating?"New Entry":sel?.title||""}>{detailContent}</Sheet>}
      {/* Desktop: inline */}
      {!isMobile&&showDetail&&sel&&<div style={{position:"absolute",top:52,right:0,bottom:0,width:340,background:C.surface,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:20,zIndex:10}}><button onClick={()=>setShowDetail(false)} style={{position:"absolute",top:16,right:16,background:"none",border:"none",color:C.muted,fontSize:18}}>✕</button>{detailContent}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAB REPORTS MODULE
// ═══════════════════════════════════════════════════════════════════════════════
const BLANK_REPORT=()=>({id:Date.now(),title:"",date:new Date().toISOString().split("T")[0],tags:[],method:"",dataTable:[["Sample","Value","Units"],["","",""],["","",""]],results:"",discussion:"",conclusion:"",linkedSpectra:[],linkedDbIds:[],aiSummary:null});
function DataTableEditor({table,onChange}){
  const addRow=()=>onChange([...table,Array(table[0]?.length||3).fill("")]);
  const addCol=()=>onChange(table.map(r=>[...r,""]));
  const removeRow=i=>{if(table.length<=1)return;onChange(table.filter((_,idx)=>idx!==i));};
  const setCell=(i,j,v)=>onChange(table.map((r,ri)=>r.map((c,ci)=>ri===i&&ci===j?v:c)));
  return<div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontFamily:mono,fontSize:11,width:"100%"}}><tbody>{table.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} style={{border:`1px solid ${C.border}`,padding:0}}><input value={cell} onChange={e=>setCell(i,j,e.target.value)} onKeyDown={e=>handleScriptKeyDown(e,cell,ev=>setCell(i,j,ev.target.value))} style={{background:i===0?C.surface+"cc":C.surface,border:"none",padding:"8px 9px",color:i===0?C.text:C.muted,fontFamily:mono,fontSize:11,fontWeight:i===0?600:400,width:"100%",minWidth:80}}/></td>)}<td style={{padding:"0 4px"}}><button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:C.faint,fontSize:12}}>✕</button></td></tr>)}</tbody></table><div style={{display:"flex",gap:6,marginTop:8}}><Btn onClick={addRow} accent={C.muted} small outlined>+ Row</Btn><Btn onClick={addCol} accent={C.muted} small outlined>+ Col</Btn></div></div>;
}
function LabReportsModule({dbEntries,spectraResultsRef,openId,onOpened,onNavigate,notes,username,isAdmin}){
  const [reports,setReports]=useCloudCollection("reports",SEED_REPORTS);
  const [sel,setSel]=useState(null);const [mode,setMode]=useState("view");const [draft,setDraft]=useState(null);
  const [showLink,setShowLink]=useState(false);const [aiLoading,setAiLoading]=useState(false);
  const [showDetail,setShowDetail]=useState(false);
  const [pendingSave,setPendingSave]=useState(null);
  const [suggestData,setSuggestData]=useState(null);
  const [manualLinkOpen,setManualLinkOpen]=useState(false);
  const isMobile=useIsMobile();
  const spectraResults=spectraResultsRef?.current||[];
  const startNew=()=>{setDraft({...BLANK_REPORT(),tagsStr:"",createdBy:username||"",lockedBy:null});setSel(null);setMode("new");setShowDetail(true);};
  const toggleLock=()=>{if(!isAdmin||!sel)return;const u={...sel,lockedBy:sel.lockedBy?null:username};setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);};
  useEffect(()=>{
    if(openId==null)return;
    const r=reports.find(x=>x.id===openId);
    if(r){setSel(r);setMode("view");setShowDetail(true);}
    onOpened&&onOpened();
  },[openId]);
  const startEdit=()=>{setDraft({...sel,tagsStr:sel.tags.join(", ")});setMode("edit");};
  const finalizeSave=saved=>{if(mode==="new"){setReports(p=>[saved,...p]);setSel(saved);}else{setReports(p=>p.map(r=>r.id===saved.id?saved:r));setSel(saved);}setMode("view");};
  const saveReport=()=>{
    if(!draft?.title?.trim())return;
    const saved={...draft,tags:draft.tagsStr.split(",").map(t=>t.trim()).filter(Boolean)};
    delete saved.tagsStr;
    const text=[saved.title,saved.method,saved.results,saved.discussion,saved.conclusion,(saved.tags||[]).join(" ")];
    const els=elementsMentionedIn(...text).filter(el=>!(saved.linkedElements||[]).includes(el.n));
    const dbM=entriesMentionedIn(dbEntries,"name",null,...text).filter(e=>!(saved.linkedDbIds||[]).includes(e.id));
    const repM=entriesMentionedIn(reports,"title",saved.id,...text).filter(r=>!(saved.linkedReportIds||[]).includes(r.id));
    const noteM=entriesMentionedIn(notes,"title",null,...text).filter(n=>!(saved.linkedNoteIds||[]).includes(n.id));
    const allDb=(dbEntries||[]).filter(e=>!(saved.linkedDbIds||[]).includes(e.id));
    const allRep=reports.filter(r=>r.id!==saved.id&&!(saved.linkedReportIds||[]).includes(r.id));
    const allNote=(notes||[]).filter(n=>!(saved.linkedNoteIds||[]).includes(n.id));
    if(els.length+dbM.length+repM.length+noteM.length===0){finalizeSave(saved);return;}
    setPendingSave(saved);
    setSuggestData({elements:els,dbEntries:dbM,reports:repM,notes:noteM,allDb,allRep,allNote});
  };
  const confirmSuggested=sel2=>{
    const merged={...pendingSave,
      linkedElements:[...new Set([...(pendingSave.linkedElements||[]),...sel2.elements])],
      linkedDbIds:[...new Set([...(pendingSave.linkedDbIds||[]),...sel2.db])],
      linkedReportIds:[...new Set([...(pendingSave.linkedReportIds||[]),...sel2.reports])],
      linkedNoteIds:[...new Set([...(pendingSave.linkedNoteIds||[]),...sel2.notes])],
    };
    finalizeSave(merged);setPendingSave(null);setSuggestData(null);
  };
  const skipSuggested=()=>{finalizeSave(pendingSave);setPendingSave(null);setSuggestData(null);};
  const addManualLinks=sel2=>{
    if(!sel)return;
    if(sel.lockedBy&&!isAdmin){setManualLinkOpen(false);return;}
    const u={...sel,
      linkedElements:[...new Set([...(sel.linkedElements||[]),...sel2.elements])],
      linkedDbIds:[...new Set([...(sel.linkedDbIds||[]),...sel2.db])],
      linkedReportIds:[...new Set([...(sel.linkedReportIds||[]),...sel2.reports])],
      linkedNoteIds:[...new Set([...(sel.linkedNoteIds||[]),...sel2.notes])],
    };
    setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);setManualLinkOpen(false);
  };
  const deleteReport=()=>{if(sel?.lockedBy&&!isAdmin)return;setReports(p=>p.filter(r=>r.id!==sel.id));setSel(null);setShowDetail(false);setMode("view");};
  const confirmLinks=(selS,selD)=>{if(sel?.lockedBy&&!isAdmin){setShowLink(false);return;}const u={...sel,linkedSpectra:[...new Set([...(sel.linkedSpectra||[]),...selS])],linkedDbIds:[...new Set([...(sel.linkedDbIds||[]),...selD])]};setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);setShowLink(false);};
  const aiReview=async()=>{if(!sel)return;setAiLoading(true);const content=`Title:${sel.title}\nMethod:${sel.method}\nResults:${sel.results}\nDiscussion:${sel.discussion}\nConclusion:${sel.conclusion}`;try{const t=await callClaude("You are a chemistry tutor reviewing a first-year lab report. Give a concise review (4-5 sentences): what is done well, any scientific errors, one suggestion, one follow-up question.",[{role:"user",content}]);const u={...sel,aiSummary:t};setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);}catch{}setAiLoading(false);};
  const linkedDb=dbEntries.filter(e=>sel?.linkedDbIds?.includes(e.id));
  const linkedSp=spectraResults.filter(s=>sel?.linkedSpectra?.includes(s.id));

  const repLocked=!!sel?.lockedBy;
  const repCanEdit=!repLocked||isAdmin;
  const viewContent=sel&&mode==="view"&&(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}><span style={{fontFamily:serif,fontSize:19,color:C.text,fontWeight:700}}>{sel.title}</span><LockBadge lockedBy={sel.lockedBy}/></div><div style={{fontFamily:mono,fontSize:10,color:C.muted}}>{sel.date}{sel.createdBy?` · by ${sel.createdBy}`:""}</div>{sel.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>{sel.tags.map(t=><Pill key={t} label={t} color={C.teal} small/>)}</div>}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {repCanEdit&&<Btn onClick={()=>setShowLink(true)} accent={C.teal} small>⇢ Links</Btn>}
          {repCanEdit&&<Btn onClick={()=>setManualLinkOpen(true)} accent={C.orange} small outlined>+ Add link</Btn>}
          {repCanEdit&&<Btn onClick={startEdit} accent={C.blue} small>Edit</Btn>}
          {repCanEdit&&<Btn onClick={deleteReport} accent="#f87171" small outlined>Delete</Btn>}
          {isAdmin&&<LockToggleBtn locked={repLocked} onToggle={toggleLock}/>}
        </div>
      </div>
      {(linkedDb.length>0||linkedSp.length>0)&&<Card style={{padding:12}}><SLabel accent={C.teal}>Linked Entries</SLabel><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{linkedDb.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:6,background:C.green+"12",border:`1px solid ${C.green}30`,borderRadius:6,padding:"5px 9px"}}><span style={{width:5,height:5,borderRadius:"50%",background:C.green,display:"inline-block"}}/><span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{e.name}</span></div>)}{linkedSp.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:6,background:C.blue+"12",border:`1px solid ${C.blue}30`,borderRadius:6,padding:"5px 9px"}}><span style={{width:5,height:5,borderRadius:"50%",background:C.blue,display:"inline-block"}}/><span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{s.name}</span></div>)}</div></Card>}
      <ElementMentionPills elements={elementsMentionedIn(sel.title,sel.method,sel.results,sel.discussion,sel.conclusion,(sel.tags||[]).join(" "))} onNavigate={onNavigate}/>
      <LinkedEntriesDisplay entry={sel} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate}/>
      {sel.method&&<Card style={{padding:14}}><SLabel accent={C.purple}>Method</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{sel.method}</p></Card>}
      {sel.dataTable?.length>0&&<Card style={{padding:14}}><SLabel accent={C.yellow}>Raw Data</SLabel><div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontFamily:mono,fontSize:11,width:"100%"}}><tbody>{sel.dataTable.map((row,i)=><tr key={i} style={{background:i===0?C.surface+"aa":"transparent"}}>{row.map((cell,j)=><td key={j} style={{padding:"8px 10px",color:i===0?C.text:C.muted,fontWeight:i===0?600:400,border:`1px solid ${C.border}30`}}>{cell}</td>)}</tr>)}</tbody></table></div></Card>}
      {sel.results&&<Card style={{padding:14}}><SLabel accent={C.green}>Results</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{sel.results}</p></Card>}
      {sel.discussion&&<Card style={{padding:14}}><SLabel accent={C.orange}>Discussion</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{sel.discussion}</p></Card>}
      {sel.conclusion&&<Card style={{padding:14,borderLeft:`3px solid ${C.teal}`}}><SLabel accent={C.teal}>Conclusion</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{sel.conclusion}</p></Card>}
      {sel.aiSummary?<Card style={{padding:14,border:`1px solid ${C.purple}33`,borderLeft:`3px solid ${C.purple}`}}><SLabel accent={C.purple}>AI Review</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}>{sel.aiSummary}</p></Card>:<Btn onClick={aiReview} disabled={aiLoading} accent={C.purple} small full>{aiLoading?"Reviewing…":"✦ Get AI report review"}</Btn>}
    </div>
  );

  const editContent=draft&&(mode==="new"||mode==="edit")&&(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Report title…" style={{fontFamily:serif,fontSize:14}}/><Input value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))} style={{width:130}}/></div>
      <Input value={draft.tagsStr} onChange={e=>setDraft(d=>({...d,tagsStr:e.target.value}))} placeholder="Tags (comma-separated)…"/>
      <div><SLabel accent={C.purple}>Method</SLabel><Textarea value={draft.method} onChange={e=>setDraft(d=>({...d,method:e.target.value}))} placeholder="Procedure…" rows={5}/></div>
      <div><SLabel accent={C.yellow}>Raw Data</SLabel><DataTableEditor table={draft.dataTable} onChange={t=>setDraft(d=>({...d,dataTable:t}))}/></div>
      <div><SLabel accent={C.green}>Results</SLabel><Textarea value={draft.results} onChange={e=>setDraft(d=>({...d,results:e.target.value}))} rows={4}/></div>
      <div><SLabel accent={C.orange}>Discussion</SLabel><Textarea value={draft.discussion} onChange={e=>setDraft(d=>({...d,discussion:e.target.value}))} rows={4}/></div>
      <div><SLabel accent={C.teal}>Conclusion</SLabel><Textarea value={draft.conclusion} onChange={e=>setDraft(d=>({...d,conclusion:e.target.value}))} rows={3}/></div>
      <div style={{display:"flex",gap:8,paddingBottom:12}}><Btn onClick={saveReport} accent={C.green}>Save report</Btn><Btn onClick={()=>{setMode("view");if(!sel)setShowDetail(false);}} accent={C.muted} outlined>Cancel</Btn></div>
    </div>
  );

  return (
    <div style={{height:"100%",overflow:"hidden",display:"flex",flexDirection:"column",gap:12}}>
      {showLink&&sel&&<LinkPickerModal title="Link entries to this report" dbEntries={dbEntries} spectraResults={reports} currentLinkedSpectra={sel.linkedSpectra||[]} currentLinkedDbIds={sel.linkedDbIds||[]} onConfirm={confirmLinks} onClose={()=>setShowLink(false)}/>}
      {suggestData&&<LinkSuggestModal elements={suggestData.elements} dbEntries={suggestData.dbEntries} reports={suggestData.reports} notes={suggestData.notes} allDbEntries={suggestData.allDb} allReports={suggestData.allRep} allNotes={suggestData.allNote} excludeElements={pendingSave?.linkedElements||[]} onConfirm={confirmSuggested} onSkip={skipSuggested}/>}
      {manualLinkOpen&&sel&&<LinkSuggestModal mode="manage" allDbEntries={(dbEntries||[]).filter(e=>!(sel.linkedDbIds||[]).includes(e.id))} allReports={reports.filter(r=>r.id!==sel.id&&!(sel.linkedReportIds||[]).includes(r.id))} allNotes={(notes||[]).filter(n=>!(sel.linkedNoteIds||[]).includes(n.id))} excludeElements={sel.linkedElements||[]} onConfirm={addManualLinks} onSkip={()=>setManualLinkOpen(false)}/>}
      <Btn onClick={startNew} accent={C.teal} small>+ New report</Btn>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {reports.length===0&&<div style={{fontFamily:mono,fontSize:11,color:C.faint,textAlign:"center",paddingTop:20}}>No reports yet</div>}
        {reports.map(r=>{const isSel=sel?.id===r.id&&showDetail&&!isMobile;const hL=(r.linkedSpectra?.length||0)+(r.linkedDbIds?.length||0)>0;return(
          <div key={r.id} onClick={()=>{setSel(r);setMode("view");setShowDetail(true);}} style={{background:isSel?"#12172a":C.panel,border:`1px solid ${isSel?C.teal+"55":C.border}`,borderLeft:`3px solid ${isSel?C.teal:C.border}`,borderRadius:7,padding:"12px 14px",cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background="#0e1220"} onMouseLeave={e2=>e2.currentTarget.style.background=C.panel}>
            <div style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600,marginBottom:4}}>{r.title||"Untitled"}</div>
            <div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:6}}>{r.date}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.tags?.map(t=><Pill key={t} label={t} color={C.teal} small/>)}{hL&&<Pill label={`${(r.linkedSpectra?.length||0)+(r.linkedDbIds?.length||0)} links`} color={C.blue} small/>}<LockBadge lockedBy={r.lockedBy} small/></div>
          </div>
        );})}
      </div>
      {/* Mobile sheet */}
      {isMobile&&<Sheet open={showDetail} onClose={()=>{setShowDetail(false);}} title={mode==="new"?"New Report":mode==="edit"?"Edit Report":sel?.title||""}>{mode==="view"?viewContent:editContent}</Sheet>}
      {/* Desktop panel */}
      {!isMobile&&showDetail&&(
        <div style={{position:"absolute",top:52,right:0,bottom:0,width:420,background:C.surface,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:20,zIndex:10}}>
          <button onClick={()=>setShowDetail(false)} style={{position:"absolute",top:16,right:16,background:"none",border:"none",color:C.muted,fontSize:18}}>✕</button>
          {mode==="view"?viewContent:editContent}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [username,setUsername]=useUsername();
  const isAdmin = !!username && username.trim().toLowerCase()===ADMIN_NAME.toLowerCase();
  const [tab,setTab]=useState("table");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const addToDbRef=useRef(null);
  const spectraResultsRef=useRef([]);
  const isMobile=useIsMobile();

  const [dbEntries]=useCloudCollection("db",SEED_DB);
  const [reports,setReports]=useCloudCollection("reports",SEED_REPORTS);
  const [nbNotes]=useCloudCollection("notes",SEED_NOTES);
  const [navTarget,setNavTarget]=useState(null); // {tab, id} — set when navigating to a specific linked entry
  const counts={table:0,db:dbEntries.length,spectrum:0,reports:reports.length,notebook:nbNotes.length};

  const handleNavigate=useCallback((targetTab,entry)=>{ setTab(targetTab); setNavTarget(entry?{tab:targetTab,id:entry.id}:null); },[]);

  const currentLabel = NAV.find(n=>n.id===tab);
  const switchUser=()=>{ if(window.confirm("Switch to a different name on this browser?")) setUsername(""); };

  // All hooks above must run every render regardless of login state, so the
  // gate check itself happens down here, right before the real UI renders.
  if(!username) return <NameGate onSubmit={setUsername}/>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.bg,color:C.text,overflow:"hidden",position:"relative"}}>
      <GlobalStyles/>

      {/* Top bar */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",height:50,background:C.surface,flexShrink:0,zIndex:50}}>
        {isMobile?(
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.muted,fontSize:22,padding:"0 8px 0 0",lineHeight:1}}>☰</button>
        ):null}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.text}}>Pria<span style={{color:C.orange}}>bora</span></span>
          {isMobile&&<><span style={{color:C.faint,margin:"0 4px"}}>·</span><span style={{fontFamily:mono,fontSize:11,color:C.orange}}>{currentLabel?.icon}</span><TwoToneTitle text={moduleTitle(currentLabel?.label)} style={{fontFamily:mono,fontSize:11,marginLeft:4}}/></>}
        </div>
        {!isMobile&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:16}}>
            <span style={{fontFamily:mono,fontSize:12,color:C.orange}}>{currentLabel?.icon}</span>
            <TwoToneTitle text={moduleTitle(currentLabel?.label)} style={{fontFamily:serif,fontSize:14,fontWeight:600}}/>
          </div>
        )}
        <div style={{marginLeft:"auto"}}>
          <SaveIndicator/>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        {/* Desktop sidebar */}
        {!isMobile&&<Sidebar tab={tab} setTab={setTab} counts={counts} open={false} onClose={()=>{}} isMobile={false} username={username} isAdmin={isAdmin} onSwitchUser={switchUser}/>}

        {/* Mobile drawer */}
        {isMobile&&<Sidebar tab={tab} setTab={setTab} counts={counts} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} isMobile={true} username={username} isAdmin={isAdmin} onSwitchUser={switchUser}/>}

        {/* Page content */}
        <div style={{flex:1,overflow:"hidden",padding:isMobile?"14px 14px 80px":"20px 24px",position:"relative"}}>
          {tab==="table"   &&<PeriodicTableModule dbEntries={dbEntries} reports={reports} notes={nbNotes} onNavigate={handleNavigate} openElementN={navTarget?.tab==="table"?navTarget.id:null} onOpened={()=>setNavTarget(null)}/>}
          {tab==="db"      &&<DatabaseModule addEntryRef={addToDbRef} openId={navTarget?.tab==="db"?navTarget.id:null} onOpened={()=>setNavTarget(null)} onNavigate={handleNavigate} reports={reports} notes={nbNotes} username={username} isAdmin={isAdmin}/>}
          {tab==="spectrum"&&<SpectrumModule saveToDbRef={addToDbRef} spectraResultsRef={spectraResultsRef} dbEntries={dbEntries} reports={reports} setReports={setReports}/>}
          {tab==="reports" &&<LabReportsModule dbEntries={dbEntries} spectraResultsRef={spectraResultsRef} openId={navTarget?.tab==="reports"?navTarget.id:null} onOpened={()=>setNavTarget(null)} onNavigate={handleNavigate} notes={nbNotes} username={username} isAdmin={isAdmin}/>}
          {tab==="notebook"&&<NotebookModule openId={navTarget?.tab==="notebook"?navTarget.id:null} onOpened={()=>setNavTarget(null)} onNavigate={handleNavigate} dbEntries={dbEntries} reports={reports} username={username} isAdmin={isAdmin}/>}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile&&<BottomTabBar tab={tab} setTab={setTab} counts={counts}/>}
    </div>
  );
}