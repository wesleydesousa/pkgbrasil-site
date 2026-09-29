const MASTER_EMAIL="wesleysousa211@gmial.com";
const MASTER_PASSWORD_SHA256="5a4f7f24cbf5870c64fb16104c470f79ef5ee97d2d96349d0378f123b223f1fd";
const SESSION_KEY="pkgbrasil_temp_master";

const loginView=document.querySelector("#loginView");
const adminView=document.querySelector("#adminView");
const loginForm=document.querySelector("#adminLogin");
const loginMessage=document.querySelector("#loginMessage");
const adminIdentity=document.querySelector("#adminIdentity");
const adminGames=document.querySelector("#adminGames");
const adminSearch=document.querySelector("#adminSearch");
let games=[];

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function loggedIn(){return sessionStorage.getItem(SESSION_KEY)==="1"}
function setView(ok){
  loginView.hidden=ok;
  adminView.hidden=!ok;
  if(ok){adminIdentity.textContent=MASTER_EMAIL+" · sessão temporária";loadCatalog()}
}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(list){
  adminGames.innerHTML=list.slice(0,150).map(g=>`<div class="game"><div><b>${esc(g.titulo)}</b><br><small>${esc(g.codigo||"Sem código")} · ${esc(g.categoria||"Jogos")}</small></div><small>v${esc(g.versao||"-")}</small></div>`).join("");
}
async function loadCatalog(){
  try{
    const r=await fetch("data/catalogo.json",{cache:"no-store"});
    const d=await r.json();
    games=d.jogos||[];
    document.querySelector("#gameCount").textContent=games.length;
    render(games);
  }catch{document.querySelector("#gameCount").textContent="ERRO"}
}
loginForm.addEventListener("submit",async e=>{
  e.preventDefault();
  loginMessage.textContent="Verificando...";
  const email=document.querySelector("#adminEmail").value.trim().toLowerCase();
  const password=document.querySelector("#adminPassword").value;
  const hash=await sha256(password);
  if(email===MASTER_EMAIL.toLowerCase()&&hash===MASTER_PASSWORD_SHA256){
    sessionStorage.setItem(SESSION_KEY,"1");
    loginForm.reset();
    loginMessage.textContent="";
    setView(true);
  }else{
    loginMessage.textContent="Login ou senha inválidos.";
  }
});
document.querySelector("#logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem(SESSION_KEY);setView(false)});
adminSearch.addEventListener("input",()=>{
  const q=adminSearch.value.trim().toLowerCase();
  render(!q?games:games.filter(g=>(g.titulo+" "+(g.codigo||"")).toLowerCase().includes(q)));
});
setView(loggedIn());
