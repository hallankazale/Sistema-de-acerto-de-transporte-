
// ===== Common DB & Utils ===== //
const DB_KEY = 'acerto_transporte_db_v1';

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){
    const seed = { users:[], trips:[] };
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(raw); } catch(e){ return { users:[], trips:[] }; }
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function uid(){ return 'id-' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function money(n){ return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function pct(n){ return (Number(n||0)).toFixed(2).replace('.',',') + '%'; }
function todayISO(){ return new Date().toISOString().slice(0,10); }

function setSession(user){ sessionStorage.setItem('session', JSON.stringify({id:user.id,role:user.role,name:user.name,email:user.email})); }
function getSession(){ try{ return JSON.parse(sessionStorage.getItem('session')||'null'); }catch(_){ return null; } }
function clearSession(){ sessionStorage.removeItem('session'); }

function ensureRoleOrRedirect(role, redirectTo){
  const me = getSession();
  if(!me || me.role!==role){
    location.href = redirectTo;
  }
}

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function computeResumo(trip){
  let totalBruto=0, totalPct=0, totalAdiant=0;
  trip.fretes.forEach(f=>{
    totalBruto += Number(f.bruto||0);
    totalPct   += Number((f.bruto||0) * (f.pct||0)/100);
  });
  trip.adiantamentos.forEach(a=> totalAdiant += Number(a.valor||0));
  const totalLiquido = totalPct - totalAdiant;
  return { totalBruto, totalPct, totalAdiant, totalLiquido };
}
