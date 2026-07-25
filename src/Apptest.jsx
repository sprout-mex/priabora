import { useState, useRef, useCallback, useEffect } from "react";

// ── Fonts & global styles ─────────────────────────────────────────────────────
const GlobalStyles = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; overflow: hidden; background: #07090f; }
      #root { height: 100%; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: #0d1017; }
      ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 10px; }
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
const mono  = "'Georgia', serif";
const serif = "'Lora', serif";

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

// ── Storage ───────────────────────────────────────────────────────────────────
function useLS(key, init) {
  const [val, setVal] = useState(() => {
    try { const s=localStorage.getItem(key); return s?JSON.parse(s):init; } catch { return init; }
  });
  const set = useCallback(v => {
    setVal(prev => {
      const next = typeof v==="function"?v(prev):v;
      try { localStorage.setItem(key,JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [val, set];
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
function SLabel({children,accent}){return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:13,background:accent||C.blue,borderRadius:2}}/><span style={{fontFamily:mono,fontSize:10,color:accent||C.blue,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>{children}</span></div>;}
function Card({children,style,onClick}){const [h,setH]=useState(false);return <div onClick={onClick} onMouseEnter={()=>onClick&&setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?C.surface+"dd":C.panel,border:`1px solid ${h?C.borderHi:C.border}`,borderRadius:8,transition:"all 0.15s",cursor:onClick?"pointer":"default",...style}}>{children}</div>;}
function Btn({children,onClick,accent,disabled,small,outlined,full}){
  const col=accent||C.blue;const [h,setH]=useState(false);
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:disabled?C.faint:outlined?"transparent":h?col+"30":col+"1a",border:`1px solid ${disabled?C.border:col+"55"}`,borderRadius:6,color:disabled?C.muted:col,padding:small?"8px 12px":"10px 18px",fontFamily:mono,fontSize:small?11:12,fontWeight:500,transition:"all 0.15s",width:full?"100%":"auto",display:full?"block":"inline-block",textAlign:"center"}}>{children}</button>;
}
function Input({value,onChange,placeholder,style}){return <input value={value} onChange={onChange} placeholder={placeholder} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"10px 13px",color:C.text,fontFamily:mono,fontSize:13,width:"100%",...style}}/>;}
function Textarea({value,onChange,placeholder,rows=6}){return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 13px",color:C.text,fontFamily:mono,fontSize:12,lineHeight:1.8,resize:"vertical",width:"100%"}}/>;}

// ── Click-to-edit text (used for AI-generated facts & DB fields) ─────────────
function EditableField({value,onSave,placeholder="Click to edit…",multiline,fontSize=11,fontFamily=mono,color,style}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value||"");
  const ref=useRef(null);
  useEffect(()=>{ if(!editing) setDraft(value||""); },[value,editing]);
  useEffect(()=>{ if(editing){ ref.current?.focus(); ref.current?.select?.(); } },[editing]);
  const commit=()=>{ setEditing(false); const v=draft.trim(); if(v!==(value||"")) onSave(v); };
  const cancel=()=>{ setDraft(value||""); setEditing(false); };
  if(editing){
    const common={ ref, value:draft, onChange:e=>setDraft(e.target.value), onBlur:commit,
      style:{background:C.surface,border:`1px solid ${C.blue}66`,borderRadius:5,padding:"6px 8px",color:C.text,fontFamily,fontSize,lineHeight:1.7,width:"100%",resize:multiline?"vertical":"none",...style} };
    return multiline
      ? <textarea {...common} rows={4} onKeyDown={e=>{ if(e.key==="Escape") cancel(); }}/>
      : <input {...common} onKeyDown={e=>{ if(e.key==="Enter") commit(); if(e.key==="Escape") cancel(); }}/>;
  }
  const hasVal=value&&String(value).trim().length>0;
  return (
    <span onClick={()=>setEditing(true)} title="Click to edit" className="hover-row"
      style={{cursor:"text",display:"inline-block",width:"100%",borderBottom:"1px dashed transparent",fontFamily,fontSize,color:hasVal?(color||C.text):C.faint,fontStyle:hasVal?"normal":"italic",lineHeight:multiline?1.8:1.4,whiteSpace:multiline?"pre-wrap":"nowrap",overflow:multiline?"visible":"hidden",textOverflow:"ellipsis",borderRadius:3,...style}}
      onMouseEnter={e=>e.currentTarget.style.borderBottom=`1px dashed ${C.muted}`}
      onMouseLeave={e=>e.currentTarget.style.borderBottom="1px dashed transparent"}>
      {hasVal?value:placeholder}
    </span>
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

function BottomTabBar({tab, setTab, counts}) {
  return (
    <div className="safe-bottom" style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {NAV.map(n=>{
        const active=tab===n.id;
        return (
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 8px",background:"none",border:"none",color:active?C.teal:C.muted,transition:"color 0.12s"}}>
            <span style={{fontSize:18,lineHeight:1}}>{n.icon}</span>
            <span style={{fontFamily:mono,fontSize:9,fontWeight:active?600:400,letterSpacing:"0.04em"}}>{n.label}</span>
            {counts[n.id]>0&&<span style={{position:"absolute",top:6,width:14,height:14,borderRadius:"50%",background:C.teal,color:C.bg,fontFamily:mono,fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{counts[n.id]>9?"9+":counts[n.id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function Sidebar({tab, setTab, counts, open, onClose, isMobile}) {
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} className="fade-in" style={{position:"fixed",inset:0,background:"#000000aa",zIndex:150}}/>}
        <div className={open?"slide-in":""} style={{position:"fixed",top:0,left:0,bottom:0,width:260,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"20px 0",zIndex:160,transform:open?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s ease"}}>
          <SidebarContent tab={tab} setTab={id=>{setTab(id);onClose();}} counts={counts}/>
        </div>
      </>
    );
  }
  return (
    <div style={{width:218,flexShrink:0,borderRight:`1px solid ${C.border}`,background:C.surface,display:"flex",flexDirection:"column",padding:"20px 0"}}>
      <SidebarContent tab={tab} setTab={setTab} counts={counts}/>
    </div>
  );
}

function SidebarContent({tab, setTab, counts}) {
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
      <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`}}>
        <div style={{fontFamily:mono,fontSize:9,color:C.faint,lineHeight:1.8}}>Data stored locally.<br/></div>
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
  const inner=(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {spectraResults?.length>0&&<div><SLabel accent={C.blue}>Reports</SLabel>{spectraResults.map(r=><label key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:6,background:selS.includes(r.id)?C.blue+"12":C.surface,border:`1px solid ${selS.includes(r.id)?C.blue+"40":C.border}`,marginBottom:6,cursor:"pointer"}}><input type="checkbox" checked={selS.includes(r.id)} onChange={()=>tS(r.id)} style={{accentColor:C.blue,width:16,height:16}}/><span style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{r.title||r.name}</span></label>)}</div>}
      {dbEntries?.length>0&&<div><SLabel accent={C.green}>Reference Database</SLabel>{dbEntries.map(e=><label key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:6,background:selD.includes(e.id)?C.green+"12":C.surface,border:`1px solid ${selD.includes(e.id)?C.green+"40":C.border}`,marginBottom:6,cursor:"pointer"}}><input type="checkbox" checked={selD.includes(e.id)} onChange={()=>tD(e.id)} style={{accentColor:C.green,width:16,height:16}}/><div><div style={{fontFamily:serif,fontSize:13,color:C.text,fontWeight:600}}>{e.name}</div><Pill label={e.category} color={CAT_COLOR[e.category]||C.blue} small/></div></label>)}</div>}
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
  const [aiData,setAiData]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [tab,setTab]=useState("info");
  const [userNote,setUserNote]=useLS(`elem-note-${el.n}`,"");
  const [editNote,setEditNote]=useState(false);
  const [noteDraft,setNoteDraft]=useState("");
  const sl=el.sym.toLowerCase(),nl=el.name.toLowerCase();
  const matches=t=>t&&(t.toLowerCase().includes(sl)||t.toLowerCase().includes(nl));
  const linkedDb=dbEntries.filter(e=>matches(e.name)||matches(e.summary)||e.tags?.some(t=>matches(t)));
  const linkedReports=reports.filter(r=>matches(r.title)||matches(r.method)||matches(r.results)||matches(r.discussion)||r.tags?.some(t=>matches(t)));
  const linkedNotes=notes.filter(n=>matches(n.title)||matches(n.content)||n.tags?.some(t=>matches(t)));
  const totalLinks=linkedDb.length+linkedReports.length+linkedNotes.length;
  useEffect(()=>{
    setAiData(null);setAiLoading(true);setTab("info");
    callClaude(`You are a chemistry reference for a first-year student. Respond ONLY with valid JSON (no markdown):{"config":"electron config","oxidationStates":["list"],"electronegativity":"value or null","atomicRadius":"pm","meltingPoint":"°C","boilingPoint":"°C","discoveredBy":"name","discoveredYear":"year","commonCompounds":["3-5 names"],"keyFact":"one exam fact","uses":["2-3 uses"],"group":"group name","chemistryNotes":"2-3 sentences"}`,[{role:"user",content:`Chemistry data for ${el.name} (${el.sym}, Z=${el.n}).`}])
    .then(t=>{try{setAiData(parseJSON(t));}catch{}setAiLoading(false);}).catch(()=>setAiLoading(false));
  },[el.n]);
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
            {aiData?.keyFact&&!aiLoading&&<div style={{marginTop:8,fontFamily:mono,fontSize:10,color:C.muted,lineHeight:1.6,background:col+"0c",border:`1px solid ${col}20`,borderRadius:5,padding:"5px 9px"}}>💡 {aiData.keyFact}</div>}
            {aiLoading&&<div style={{marginTop:8,fontFamily:mono,fontSize:10,color:C.faint,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"pulse 1s infinite",display:"inline-block"}}>◉</span>Loading…</div>}
          </div>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?col:"transparent"}`,color:tab===t.id?col:C.muted,padding:"10px 4px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{t.label}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        {tab==="info"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {[["Atomic Mass",`${el.mass} u`],["Config",aiData?.config||"—"],["Melting Pt",aiData?.meltingPoint||"—"],["Boiling Pt",aiData?.boilingPoint||"—"],["Electronegativity",aiData?.electronegativity||"—"],["Atomic Radius",aiData?.atomicRadius?`${aiData.atomicRadius} pm`:"—"],["Discovered",aiData?.discoveredBy||"—"],["Year",aiData?.discoveredYear||"—"]].map(([k,v])=><div key={k} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px"}}><div style={{fontFamily:mono,fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>{k}</div><div style={{fontFamily:mono,fontSize:11,color:C.text,fontWeight:500}}>{v}</div></div>)}
          </div>
          {aiData?.oxidationStates?.length>0&&<div><SLabel accent={col}>Oxidation States</SLabel><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{aiData.oxidationStates.map((s,i)=><Pill key={i} label={s} color={col} small/>)}</div></div>}
          {aiData?.uses?.length>0&&<div><SLabel accent={C.teal}>Uses</SLabel>{aiData.uses.map((u,i)=><div key={i} style={{fontFamily:mono,fontSize:11,color:C.muted,paddingLeft:10,borderLeft:`2px solid ${C.teal}44`,marginBottom:5}}>▸ {u}</div>)}</div>}
        </div>}
        {tab==="chem"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:14}}>
          {aiData?.chemistryNotes&&<div><SLabel accent={col}>Chemistry Overview</SLabel><p style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.8,borderLeft:`3px solid ${col}44`,paddingLeft:12}}>{aiData.chemistryNotes}</p></div>}
          {aiData?.commonCompounds?.length>0&&<div><SLabel accent={C.green}>Common Compounds</SLabel><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{aiData.commonCompounds.map((c,i)=><div key={i} style={{background:C.green+"12",border:`1px solid ${C.green}25`,borderRadius:6,padding:"7px 11px",fontFamily:mono,fontSize:11,color:C.muted}}>{c}</div>)}</div></div>}
          {aiData?.group&&<div style={{background:col+"10",border:`1px solid ${col}25`,borderRadius:7,padding:"11px 13px"}}><div style={{fontFamily:mono,fontSize:9,color:col,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>Group</div><div style={{fontFamily:serif,fontSize:13,color:C.text}}>{aiData.group}</div></div>}
        </div>}
        {tab==="links"&&<div className="fade-up" style={{display:"flex",flexDirection:"column",gap:14}}>
          {totalLinks===0?<div style={{textAlign:"center",padding:"28px 10px",color:C.faint,fontFamily:mono,fontSize:11,lineHeight:2}}>No entries mention {el.name} yet.<br/><span style={{color:C.muted}}>Add entries to see them here.</span></div>:<>
            {linkedDb.length>0&&<div><SLabel accent={C.green}>Reference DB ({linkedDb.length})</SLabel>{linkedDb.map(e=><div key={e.id} onClick={()=>onNavigate("db",e)} style={{background:C.surface,border:`1px solid ${C.green}22`,borderLeft:`3px solid ${C.green}`,borderRadius:6,padding:"10px 12px",marginBottom:5,cursor:"pointer"}} onMouseEnter={e2=>e2.currentTarget.style.background=C.green+"0c"} onMouseLeave={e2=>e2.currentTarget.style.background=C.surface}><div style={{fontFamily:serif,fontSize:12,color:C.text,fontWeight:600,marginBottom:3}}>{e.name}</div><Pill label={e.category} color={C.green} small/></div>)}</div>}
            {linkedReports.length>0&&<div><SLabel accent={C.teal}>Lab Reports ({linkedReports.length})</SLabel>{linkedReports.map(r=><div key={r.id} onClick={()=>onNavigate("reports",r)} style={{background:C.surface,border:`1px solid ${C.teal}22`,borderLeft:`3px solid ${C.teal}`,borderRadius:6,padding:"10px 12px",marginBottom:5,cursor:"pointer"}} onMouseEnter={e2=>e2.currentTarget.style.background=C.teal+"0c"} onMouseLeave={e2=>e2.currentTarget.style.background=C.surface}><div style={{fontFamily:serif,fontSize:12,color:C.text,fontWeight:600,marginBottom:2}}>{r.title}</div><div style={{fontFamily:mono,fontSize:9,color:C.muted}}>{r.date}</div></div>)}</div>}
            {linkedNotes.length>0&&<div><SLabel accent={C.purple}>Notebook ({linkedNotes.length})</SLabel>{linkedNotes.map(n=><div key={n.id} onClick={()=>onNavigate("notebook",n)} style={{background:C.surface,border:`1px solid ${C.purple}22`,borderLeft:`3px solid ${C.purple}`,borderRadius:6,padding:"10px 12px",marginBottom:5,cursor:"pointer"}} onMouseEnter={e2=>e2.currentTarget.style.background=C.purple+"0c"} onMouseLeave={e2=>e2.currentTarget.style.background=C.surface}><div style={{fontFamily:serif,fontSize:12,color:C.text,fontWeight:600,marginBottom:2}}>{n.title}</div><div style={{fontFamily:mono,fontSize:9,color:C.muted}}>{n.date}</div></div>)}</div>}
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

function PeriodicTableModule({dbEntries,reports,notes,onNavigate}) {
  const [selected,setSelected]=useState(null);
  const [filterCat,setFilterCat]=useState(null);
  const [search,setSearch]=useState("");
  const [showPanel,setShowPanel]=useState(false);
  const isMobile=useIsMobile();
  const TILE=isMobile?32:42, GAP=isMobile?2:3;
  const allGroups=Array.from({length:18},(_,i)=>i+1);
  const mainRows=[1,2,3,4,5,6,7];
  const seriesRows=[8,9];
  const matchSearch=el=>{const q=search.toLowerCase();return !q||el.name.toLowerCase().includes(q)||el.sym.toLowerCase().includes(q)||String(el.n).includes(q);};
  const dim=el=>(filterCat?el.cat!==filterCat:false)||!matchSearch(el);
  const handleSelect=el=>{setSelected(el);setShowPanel(true);};
  const renderTile=(period,group)=>{const el=EGRID[period]?.[group];if(!el)return <div key={`${period}-${group}`} style={{width:TILE,height:TILE,flexShrink:0}}/>;return <ElementTile key={el.n} el={el} selected={selected?.n===el.n} dimmed={dim(el)} onClick={handleSelect} size={TILE}/>;};
  const panelContent = selected ? <ElementPanel el={selected} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate} onClose={isMobile?()=>setShowPanel(false):null}/> : null;

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
          <ElementPanel el={selected} dbEntries={dbEntries} reports={reports} notes={notes} onNavigate={onNavigate}/>
        </Sheet>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE MODULE
// ═══════════════════════════════════════════════════════════════════════════════
function DatabaseModule({addEntryRef}) {
  const [entries,setEntries]=useLS("chemlab-db",SEED_DB);
  const [search,setSearch]=useState("");const [filterCat,setFilterCat]=useState("All");
  const [selected,setSelected]=useState(null);const [showDetail,setShowDetail]=useState(false);
  const [aiQuery,setAiQuery]=useState("");const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState(null);const [aiError,setAiError]=useState(null);
  const isMobile=useIsMobile();
  const addEntry=useCallback(e=>setEntries(p=>[e,...p]),[setEntries]);
  useEffect(()=>{if(addEntryRef)addEntryRef.current=addEntry;},[addEntry,addEntryRef]);
  const aiLookup=async()=>{if(!aiQuery.trim())return;setAiLoading(true);setAiResult(null);setAiError(null);try{const t=await callClaude(`You are a chemistry reference for a first-year student. Respond ONLY with valid JSON (no markdown):{"name":"string","category":"Compound|Reaction|Mechanism|Concept|Reagent","summary":"2-4 sentences","tags":["3-5 tags"],"keyPoint":"one exam fact"}`,[{role:"user",content:aiQuery}]);setAiResult(parseJSON(t));}catch{setAiError("Couldn't fetch — try rephrasing.");}setAiLoading(false);};
  const saveAi=()=>{if(!aiResult)return;addEntry({id:Date.now(),name:aiResult.name,category:aiResult.category,summary:aiResult.summary,tags:aiResult.tags||[],date:new Date().toISOString().split("T")[0]});setAiResult(null);setAiQuery("");};
  const del=id=>{setEntries(p=>p.filter(e=>e.id!==id));setSelected(null);setShowDetail(false);};
  const openEntry=e=>{setSelected(e);setShowDetail(true);};
  const filtered=entries.filter(e=>{const mc=filterCat==="All"||e.category===filterCat;const q=search.toLowerCase();return mc&&(!q||e.name.toLowerCase().includes(q)||e.summary.toLowerCase().includes(q)||e.tags.some(t=>t.includes(q)));});
  const cc=aiResult?CAT_COLOR[aiResult.category]||C.blue:C.blue;

  const detailContent=selected&&(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}><Pill label={selected.category} color={CAT_COLOR[selected.category]||C.blue}/></div>
      <div style={{fontFamily:serif,fontSize:18,color:C.text,fontWeight:700}}>{selected.name}</div>
      <div style={{borderLeft:`3px solid ${CAT_COLOR[selected.category]||C.blue}`,paddingLeft:12}}><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}>{selected.summary}</p></div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{selected.tags.map(t=><Pill key={t} label={t} color={C.muted} small/>)}</div>
      <p style={{fontFamily:mono,fontSize:10,color:C.faint}}>Added {selected.date}</p>
      <Btn onClick={()=>del(selected.id)} accent="#f87171" small outlined full>Delete entry</Btn>
    </div>
  );

  return (
    <div style={{display:"flex",gap:16,height:"100%",minHeight:0}}>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        {/* AI Lookup */}
        <Card style={{padding:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:7,height:7,borderRadius:"50%",background:C.blue,boxShadow:`0 0 8px ${C.blue}`}}/><span style={{fontFamily:mono,fontSize:10,color:C.blue,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>AI Lookup</span></div>
          <div style={{display:"flex",gap:8}}><Input value={aiQuery} onChange={e=>setAiQuery(e.target.value)} placeholder="e.g. benzene, Le Chatelier…" style={{flex:1}}/><Btn onClick={aiLookup} disabled={aiLoading}>{aiLoading?"…":"Look up"}</Btn></div>
          {aiError&&<p style={{fontFamily:mono,fontSize:11,color:"#f87171",marginTop:8}}>{aiError}</p>}
          {aiResult&&<div style={{marginTop:12,background:C.surface,border:`1px solid ${cc}33`,borderLeft:`3px solid ${cc}`,borderRadius:7,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}><span style={{fontFamily:serif,fontSize:15,color:C.text,fontWeight:600}}>{aiResult.name}</span><Pill label={aiResult.category} color={cc}/></div>
            <p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:8}}>{aiResult.summary}</p>
            {aiResult.keyPoint&&<div style={{background:cc+"12",border:`1px solid ${cc}25`,borderRadius:5,padding:"8px 10px",marginBottom:8}}><span style={{fontFamily:mono,fontSize:10,color:cc}}>💡 </span><span style={{fontFamily:mono,fontSize:11,color:C.muted}}>{aiResult.keyPoint}</span></div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{(aiResult.tags||[]).map(t=><Pill key={t} label={t} color={C.muted} small/>)}</div>
            <Btn onClick={saveAi} accent={cc} small>+ Save to database</Btn>
          </div>}
        </Card>
        {/* Search + filter */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entries…"/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["All","Compound","Reaction","Mechanism","Concept","Reagent"].map(cat=><button key={cat} onClick={()=>setFilterCat(cat)} style={{background:filterCat===cat?(CAT_COLOR[cat]||C.blue)+"20":C.surface,border:`1px solid ${filterCat===cat?(CAT_COLOR[cat]||C.blue)+"55":C.border}`,borderRadius:5,color:filterCat===cat?(CAT_COLOR[cat]||C.blue):C.muted,padding:"6px 10px",fontFamily:mono,fontSize:10,fontWeight:500,transition:"all 0.12s"}}>{cat}</button>)}
          </div>
        </div>
        {/* Entry list */}
        {filtered.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:C.faint,fontFamily:mono,fontSize:12}}>No entries — use AI Lookup ↑</div>
        :filtered.map(e=>{const col=CAT_COLOR[e.category]||C.blue;const isSel=selected?.id===e.id&&showDetail;return(
          <div key={e.id} onClick={()=>openEntry(e)} style={{background:isSel?"#12172a":C.panel,border:`1px solid ${isSel?col+"55":C.border}`,borderLeft:`3px solid ${col}`,borderRadius:7,padding:"12px 14px",marginBottom:6,cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>{if(!isSel)e2.currentTarget.style.background="#0e1220";}} onMouseLeave={e2=>{if(!isSel)e2.currentTarget.style.background=C.panel;}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}><span style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600}}>{e.name}</span><Pill label={e.category} color={col} small/></div>
            <p style={{fontFamily:mono,fontSize:11,color:C.muted,lineHeight:1.6,marginBottom:7,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{e.summary}</p>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{e.tags.map(t=><Pill key={t} label={t} color={C.faint} small/>)}</div>
          </div>
        );})}
      </div>

      {/* Desktop right panel */}
      {!isMobile&&selected&&showDetail&&(
        <div style={{width:240,flexShrink:0}}>
          <Card style={{padding:18,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><button onClick={()=>setShowDetail(false)} style={{background:"none",border:"none",color:C.muted,fontSize:16}}>✕</button></div>
            {detailContent}
          </Card>
        </div>
      )}
      {/* Mobile sheet */}
      {isMobile&&<Sheet open={showDetail} onClose={()=>setShowDetail(false)} title={selected?.name||""}>{detailContent}</Sheet>}
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
  const [spectraResults,setSpectraResults]=useLS("chemlab-spectra-meta",[]);
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
function NotebookModule() {
  const [notes,setNotes]=useLS("chemlab-notes",SEED_NOTES);
  const [sel,setSel]=useState(null);const [editing,setEditing]=useState(false);const [creating,setCreating]=useState(false);
  const [draft,setDraft]=useState({title:"",content:"",tags:""});const [aiLoading,setAiLoading]=useState(false);
  const [showDetail,setShowDetail]=useState(false);
  const isMobile=useIsMobile();
  const openNote=n=>{setSel(n);setEditing(false);setShowDetail(true);};
  const startNew=()=>{setDraft({title:"",content:"",tags:""});setCreating(true);setSel(null);setShowDetail(true);};
  const saveNew=()=>{if(!draft.title.trim())return;const n={id:Date.now(),title:draft.title,date:new Date().toISOString().split("T")[0],tags:draft.tags.split(",").map(t=>t.trim()).filter(Boolean),content:draft.content,aiSummary:null};setNotes(p=>[n,...p]);setSel(n);setCreating(false);};
  const saveEdit=()=>{const u={...sel,title:draft.title,content:draft.content,tags:draft.tags.split(",").map(t=>t.trim()).filter(Boolean)};setNotes(p=>p.map(n=>n.id===sel.id?u:n));setSel(u);setEditing(false);};
  const startEdit=()=>{setDraft({title:sel.title,content:sel.content,tags:sel.tags.join(", ")});setEditing(true);};
  const del=id=>{setNotes(p=>p.filter(n=>n.id!==id));setSel(null);setShowDetail(false);};
  const aiSummarise=async()=>{if(!sel)return;setAiLoading(true);try{const t=await callClaude("You are a chemistry tutor. Summarise this lab note (3-4 sentences), highlight key chemistry, and suggest one follow-up question.",[{role:"user",content:`Title: ${sel.title}\n\n${sel.content}`}]);const u={...sel,aiSummary:t};setNotes(p=>p.map(n=>n.id===sel.id?u:n));setSel(u);}catch{}setAiLoading(false);};

  const detailContent=(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {creating&&<>
        <Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="Title…" style={{fontFamily:serif,fontSize:14}}/>
        <Input value={draft.tags} onChange={e=>setDraft(d=>({...d,tags:e.target.value}))} placeholder="Tags (comma-separated)…"/>
        <Textarea value={draft.content} onChange={e=>setDraft(d=>({...d,content:e.target.value}))} placeholder="Write your lab notes here…" rows={10}/>
        <div style={{display:"flex",gap:8}}><Btn onClick={saveNew} accent={C.green}>Save</Btn><Btn onClick={()=>{setCreating(false);setShowDetail(false);}} accent={C.muted} outlined>Cancel</Btn></div>
      </>}
      {sel&&!creating&&!editing&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div><div style={{fontFamily:serif,fontSize:18,color:C.text,fontWeight:700,marginBottom:3}}>{sel.title}</div><div style={{fontFamily:mono,fontSize:10,color:C.muted}}>{sel.date}</div></div>
          <div style={{display:"flex",gap:6}}><Btn onClick={startEdit} accent={C.blue} small>Edit</Btn><Btn onClick={()=>del(sel.id)} accent="#f87171" small outlined>Delete</Btn></div>
        </div>
        {sel.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{sel.tags.map(t=><Pill key={t} label={t} color={C.purple} small/>)}</div>}
        <div style={{fontFamily:mono,fontSize:15,color:C.muted,lineHeight:1.9,whiteSpace:"pre-wrap",borderLeft:`3px solid ${C.border}`,paddingLeft:12}}>{sel.content}</div>
        {sel.aiSummary?<Card style={{padding:14,border:`1px solid ${C.purple}33`,borderLeft:`3px solid ${C.purple}`}}><SLabel accent={C.purple}>AI Summary</SLabel><p style={{fontFamily:mono,fontSize:12,color:C.muted,lineHeight:1.8}}>{sel.aiSummary}</p></Card>:<Btn onClick={aiSummarise} disabled={aiLoading} accent={C.purple} small full>{aiLoading?"Summarising…":"✦ Get AI tutor summary"}</Btn>}
      </>}
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
      <Btn onClick={startNew} accent={C.green} small>+ New entry</Btn>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {notes.length===0&&<div style={{fontFamily:mono,fontSize:11,color:C.faint,textAlign:"center",paddingTop:20}}>No entries yet</div>}
        {notes.map(n=>(
          <div key={n.id} onClick={()=>openNote(n)} style={{background:sel?.id===n.id&&showDetail&&!isMobile?"#12172a":C.panel,border:`1px solid ${sel?.id===n.id&&showDetail&&!isMobile?C.blue+"55":C.border}`,borderRadius:7,padding:"12px 14px",cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background="#0e1220"} onMouseLeave={e2=>e2.currentTarget.style.background=C.panel}>
            <div style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600,marginBottom:4}}>{n.title}</div>
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
  return<div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontFamily:mono,fontSize:11,width:"100%"}}><tbody>{table.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} style={{border:`1px solid ${C.border}`,padding:0}}><input value={cell} onChange={e=>setCell(i,j,e.target.value)} style={{background:i===0?C.surface+"cc":C.surface,border:"none",padding:"8px 9px",color:i===0?C.text:C.muted,fontFamily:mono,fontSize:11,fontWeight:i===0?600:400,width:"100%",minWidth:80}}/></td>)}<td style={{padding:"0 4px"}}><button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:C.faint,fontSize:12}}>✕</button></td></tr>)}</tbody></table><div style={{display:"flex",gap:6,marginTop:8}}><Btn onClick={addRow} accent={C.muted} small outlined>+ Row</Btn><Btn onClick={addCol} accent={C.muted} small outlined>+ Col</Btn></div></div>;
}
function LabReportsModule({dbEntries,spectraResultsRef}){
  const [reports,setReports]=useLS("chemlab-reports",SEED_REPORTS);
  const [sel,setSel]=useState(null);const [mode,setMode]=useState("view");const [draft,setDraft]=useState(null);
  const [showLink,setShowLink]=useState(false);const [aiLoading,setAiLoading]=useState(false);
  const [showDetail,setShowDetail]=useState(false);
  const isMobile=useIsMobile();
  const spectraResults=spectraResultsRef?.current||[];
  const startNew=()=>{setDraft({...BLANK_REPORT(),tagsStr:""});setSel(null);setMode("new");setShowDetail(true);};
  const startEdit=()=>{setDraft({...sel,tagsStr:sel.tags.join(", ")});setMode("edit");};
  const saveReport=()=>{if(!draft?.title?.trim())return;const saved={...draft,tags:draft.tagsStr.split(",").map(t=>t.trim()).filter(Boolean)};delete saved.tagsStr;if(mode==="new"){setReports(p=>[saved,...p]);setSel(saved);}else{setReports(p=>p.map(r=>r.id===saved.id?saved:r));setSel(saved);}setMode("view");};
  const deleteReport=()=>{setReports(p=>p.filter(r=>r.id!==sel.id));setSel(null);setShowDetail(false);setMode("view");};
  const confirmLinks=(selS,selD)=>{const u={...sel,linkedSpectra:[...new Set([...(sel.linkedSpectra||[]),...selS])],linkedDbIds:[...new Set([...(sel.linkedDbIds||[]),...selD])]};setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);setShowLink(false);};
  const aiReview=async()=>{if(!sel)return;setAiLoading(true);const content=`Title:${sel.title}\nMethod:${sel.method}\nResults:${sel.results}\nDiscussion:${sel.discussion}\nConclusion:${sel.conclusion}`;try{const t=await callClaude("You are a chemistry tutor reviewing a first-year lab report. Give a concise review (4-5 sentences): what is done well, any scientific errors, one suggestion, one follow-up question.",[{role:"user",content}]);const u={...sel,aiSummary:t};setReports(p=>p.map(r=>r.id===sel.id?u:r));setSel(u);}catch{}setAiLoading(false);};
  const linkedDb=dbEntries.filter(e=>sel?.linkedDbIds?.includes(e.id));
  const linkedSp=spectraResults.filter(s=>sel?.linkedSpectra?.includes(s.id));

  const viewContent=sel&&mode==="view"&&(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div><div style={{fontFamily:serif,fontSize:19,color:C.text,fontWeight:700,marginBottom:4}}>{sel.title}</div><div style={{fontFamily:mono,fontSize:10,color:C.muted}}>{sel.date}</div>{sel.tags?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>{sel.tags.map(t=><Pill key={t} label={t} color={C.teal} small/>)}</div>}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn onClick={()=>setShowLink(true)} accent={C.teal} small>⇢ Links</Btn><Btn onClick={startEdit} accent={C.blue} small>Edit</Btn><Btn onClick={deleteReport} accent="#f87171" small outlined>Delete</Btn></div>
      </div>
      {(linkedDb.length>0||linkedSp.length>0)&&<Card style={{padding:12}}><SLabel accent={C.teal}>Linked Entries</SLabel><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{linkedDb.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:6,background:C.green+"12",border:`1px solid ${C.green}30`,borderRadius:6,padding:"5px 9px"}}><span style={{width:5,height:5,borderRadius:"50%",background:C.green,display:"inline-block"}}/><span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{e.name}</span></div>)}{linkedSp.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:6,background:C.blue+"12",border:`1px solid ${C.blue}30`,borderRadius:6,padding:"5px 9px"}}><span style={{width:5,height:5,borderRadius:"50%",background:C.blue,display:"inline-block"}}/><span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{s.name}</span></div>)}</div></Card>}
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
      <Btn onClick={startNew} accent={C.teal} small>+ New report</Btn>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {reports.length===0&&<div style={{fontFamily:mono,fontSize:11,color:C.faint,textAlign:"center",paddingTop:20}}>No reports yet</div>}
        {reports.map(r=>{const isSel=sel?.id===r.id&&showDetail&&!isMobile;const hL=(r.linkedSpectra?.length||0)+(r.linkedDbIds?.length||0)>0;return(
          <div key={r.id} onClick={()=>{setSel(r);setMode("view");setShowDetail(true);}} style={{background:isSel?"#12172a":C.panel,border:`1px solid ${isSel?C.teal+"55":C.border}`,borderLeft:`3px solid ${isSel?C.teal:C.border}`,borderRadius:7,padding:"12px 14px",cursor:"pointer",transition:"all 0.12s"}}
            onMouseEnter={e2=>e2.currentTarget.style.background="#0e1220"} onMouseLeave={e2=>e2.currentTarget.style.background=C.panel}>
            <div style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600,marginBottom:4}}>{r.title||"Untitled"}</div>
            <div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:6}}>{r.date}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.tags?.map(t=><Pill key={t} label={t} color={C.teal} small/>)}{hL&&<Pill label={`${(r.linkedSpectra?.length||0)+(r.linkedDbIds?.length||0)} links`} color={C.blue} small/>}</div>
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
  const [tab,setTab]=useState("table");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const addToDbRef=useRef(null);
  const spectraResultsRef=useRef([]);
  const isMobile=useIsMobile();

  const [dbEntries]=useLS("chemlab-db",SEED_DB);
  const [reports,setReports]=useLS("chemlab-reports",SEED_REPORTS);
  const [nbNotes]=useLS("chemlab-notes",SEED_NOTES);
  const counts={table:0,db:dbEntries.length,spectrum:0,reports:reports.length,notebook:nbNotes.length};

  const handleNavigate=useCallback((targetTab)=>{ setTab(targetTab); },[]);

  const currentLabel = NAV.find(n=>n.id===tab);

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
          {isMobile&&<><span style={{color:C.faint,margin:"0 4px"}}>·</span><span style={{fontFamily:mono,fontSize:11,color:C.teal}}>{currentLabel?.icon} {currentLabel?.label==="DB"?"Reference DB":currentLabel?.label==="Spectra"?"Spectrum Analyser":currentLabel?.label==="Table"?"Periodic Table":currentLabel?.label}</span></>}
        </div>
        {!isMobile&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:16}}>
            <span style={{fontFamily:mono,fontSize:12,color:C.teal}}>{currentLabel?.icon}</span>
            <span style={{fontFamily:serif,fontSize:14,color:C.text,fontWeight:600}}>{currentLabel?.label==="DB"?"Reference DB":currentLabel?.label==="Spectra"?"Spectrum Analyser":currentLabel?.label==="Table"?"Periodic Table":currentLabel?.label}</span>
          </div>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[C.green,C.teal,C.blue,C.pink].map((c,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:c,opacity:0.5}}/>)}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>
        {/* Desktop sidebar */}
        {!isMobile&&<Sidebar tab={tab} setTab={setTab} counts={counts} open={false} onClose={()=>{}} isMobile={false}/>}

        {/* Mobile drawer */}
        {isMobile&&<Sidebar tab={tab} setTab={setTab} counts={counts} open={sidebarOpen} onClose={()=>setSidebarOpen(false)} isMobile={true}/>}

        {/* Page content */}
        <div style={{flex:1,overflow:"hidden",padding:isMobile?"14px 14px 80px":"20px 24px",position:"relative"}}>
          {tab==="table"   &&<PeriodicTableModule dbEntries={dbEntries} reports={reports} notes={nbNotes} onNavigate={handleNavigate}/>}
          {tab==="db"      &&<DatabaseModule addEntryRef={addToDbRef}/>}
          {tab==="spectrum"&&<SpectrumModule saveToDbRef={addToDbRef} spectraResultsRef={spectraResultsRef} dbEntries={dbEntries} reports={reports} setReports={setReports}/>}
          {tab==="reports" &&<LabReportsModule dbEntries={dbEntries} spectraResultsRef={spectraResultsRef}/>}
          {tab==="notebook"&&<NotebookModule/>}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile&&<BottomTabBar tab={tab} setTab={setTab} counts={counts}/>}
    </div>
  );
}
