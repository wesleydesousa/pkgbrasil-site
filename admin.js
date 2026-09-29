const MASTER_EMAIL="wesleysousa211@gmail.com";
const MASTER_PASSWORD_SHA256="5a4f7f24cbf5870c64fb16104c470f79ef5ee97d2d96349d0378f123b223f1fd";
const SESSION_KEY="pkgbrasil_temp_master";

const loginView=document.querySelector("#loginView");
const adminView=document.querySelector("#adminView");
const loginForm=document.querySelector("#adminLogin");
const loginMessage=document.querySelector("#loginMessage");
const adminIdentity=document.querySelector("#adminIdentity");
const adminGames=document.querySelector("#adminGames");
const adminSearch=document.querySelector("#adminSearch");
const catalogFile=document.querySelector("#catalogFile");
const processCatalogBtn=document.querySelector("#processCatalogBtn");
const exportCatalogBtn=document.querySelector("#exportCatalogBtn");
const importStatus=document.querySelector("#importStatus");
const importSummary=document.querySelector("#importSummary");
const linkEditorCard=document.querySelector("#linkEditorCard");
const linkGameTitle=document.querySelector("#linkGameTitle");
const linkGameMeta=document.querySelector("#linkGameMeta");
const linkEditorList=document.querySelector("#linkEditorList");
const linkLabel=document.querySelector("#linkLabel");
const linkUrl=document.querySelector("#linkUrl");
const addLinkBtn=document.querySelector("#addLinkBtn");
const saveLinksBtn=document.querySelector("#saveLinksBtn");
const closeLinkEditorBtn=document.querySelector("#closeLinkEditorBtn");
const linkEditorStatus=document.querySelector("#linkEditorStatus");
let games=[];
let processedCatalog=null;
let editingGameId=null;
let editingLinks=[];

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
  adminGames.innerHTML=list.slice(0,150).map(g=>`<div class="game"><div><b>${esc(g.titulo)}</b><br><small>${esc(g.codigo||"Sem código")} · ${esc(g.categoria||"Jogos")}</small></div><div class="game-actions"><small>v${esc(g.versao||"-")}</small><button class="game-link-btn" type="button" data-edit-links="${esc(g.id)}">GERENCIAR LINKS</button></div></div>`).join("");
}
async function loadCatalog(){
  try{
    const r=await fetch("data/catalogo.json",{cache:"no-store"});
    const d=await r.json();
    games=d.jogos||[];
    try{
      const drafts=JSON.parse(localStorage.getItem("pkgbrasil_link_drafts")||"{}");
      games=games.map(g=>drafts[g.id]?{...g,links_oficiais:drafts[g.id]}:g);
    }catch{}
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

function normalizeText(v=""){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function asGamesArray(data){
  if(Array.isArray(data))return data;
  if(Array.isArray(data?.jogos))return data.jogos;
  if(data?.jogos&&typeof data.jogos==="object")return Object.entries(data.jogos).map(([id,g])=>({id,...g}));
  return [];
}
function extractAuthorizedLinks(item){
  const out=[];
  const add=(label,url)=>{
    if(!url||typeof url!=="string")return;
    try{
      const u=new URL(url);
      if(!/^https?:$/.test(u.protocol))return;
      out.push({label:String(label||"Fonte oficial"),url:u.href});
    }catch{}
  };
  if(Array.isArray(item.links_oficiais))item.links_oficiais.forEach(x=>add(x.label||x.nome,x.url||x.href));
  if(Array.isArray(item.official_links))item.official_links.forEach(x=>add(x.label||x.name,x.url||x.href));
  add("Fonte oficial",item.fonte_oficial||item.official_url);
  add("Página oficial",item.site_oficial||item.official_site);
  return out;
}
function matchGame(incoming){
  const code=String(incoming.codigo||incoming.code||incoming.cusa||"").trim().toUpperCase();
  if(code){
    const byCode=games.find(g=>String(g.codigo||"").trim().toUpperCase()===code);
    if(byCode)return byCode;
  }
  const title=normalizeText(incoming.titulo||incoming.title||incoming.nome||"");
  if(!title)return null;
  return games.find(g=>normalizeText(g.titulo)===title)||null;
}
function showImportSummary(stats){
  importSummary.innerHTML=[
    ["Correspondências",stats.matched],
    ["Sem correspondência",stats.unmatched],
    ["Links oficiais",stats.links]
  ].map(([label,value])=>'<div class="import-pill"><b>'+value+'</b><small>'+label+'</small></div>').join("");
}
async function processUploadedCatalog(){
  const file=catalogFile.files?.[0];
  if(!file){importStatus.textContent="Selecione um arquivo .json.";return}
  importStatus.textContent="Processando "+file.name+"...";
  try{
    const raw=JSON.parse(await file.text());
    const incoming=asGamesArray(raw);
    if(!incoming.length)throw new Error("Formato sem jogos reconhecíveis.");
    const merged=games.map(g=>({...g}));
    let matched=0,unmatched=0,links=0;
    for(const item of incoming){
      const current=matchGame(item);
      if(!current){unmatched++;continue}
      matched++;
      const target=merged.find(g=>g.id===current.id);
      if(!target)continue;
      const authorized=extractAuthorizedLinks(item);
      if(authorized.length){target.links_oficiais=authorized;links+=authorized.length}
      if(item.versao||item.update_versao)target.versao=String(item.versao||item.update_versao);
      if(typeof item.tem_dlc==="boolean")target.dlc=item.tem_dlc;
    }
    processedCatalog={jogos:merged};
    exportCatalogBtn.disabled=false;
    showImportSummary({matched,unmatched,links});
    importStatus.textContent="JSON processado. Campos de download não autorizados são ignorados; somente links explicitamente oficiais/autorizados são associados.";
  }catch(err){
    processedCatalog=null;
    exportCatalogBtn.disabled=true;
    importSummary.innerHTML="";
    importStatus.textContent="Não foi possível processar: "+(err?.message||"JSON inválido.");
  }
}
function exportProcessedCatalog(){
  if(!processedCatalog)return;
  const blob=new Blob([JSON.stringify(processedCatalog,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="catalogo-tratado.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
processCatalogBtn.addEventListener("click",processUploadedCatalog);
exportCatalogBtn.addEventListener("click",exportProcessedCatalog);

function renderLinkEditor(){
  linkEditorList.innerHTML=editingLinks.length?editingLinks.map((link,i)=>`
    <div class="link-row">
      <input data-link-label="${i}" value="${esc(link.label||"")}" placeholder="Nome do link">
      <input data-link-url="${i}" value="${esc(link.url||"")}" placeholder="https://...">
      <button class="link-remove" type="button" data-remove-link="${i}">REMOVER</button>
    </div>`).join(""):'<div class="import-status">Nenhum link cadastrado para este jogo.</div>';
}
function openLinkEditor(id){
  const game=games.find(g=>String(g.id)===String(id));
  if(!game)return;
  editingGameId=game.id;
  editingLinks=(Array.isArray(game.links_oficiais)?game.links_oficiais:[]).map(x=>({...x}));
  linkGameTitle.textContent=game.titulo;
  linkGameMeta.textContent=(game.codigo||"Sem código")+" · "+(game.categoria||"Jogos");
  renderLinkEditor();
  linkEditorStatus.textContent="Adicione apenas links oficiais ou que você tenha autorização para distribuir.";
  linkEditorCard.hidden=false;
  linkEditorCard.scrollIntoView({behavior:"smooth",block:"start"});
}
function validHttpUrl(value){
  try{const u=new URL(value);return /^https?:$/.test(u.protocol)}catch{return false}
}
function syncLinkInputs(){
  linkEditorList.querySelectorAll("[data-link-label]").forEach(input=>{const i=Number(input.dataset.linkLabel);if(editingLinks[i])editingLinks[i].label=input.value.trim()});
  linkEditorList.querySelectorAll("[data-link-url]").forEach(input=>{const i=Number(input.dataset.linkUrl);if(editingLinks[i])editingLinks[i].url=input.value.trim()});
}
adminGames.addEventListener("click",e=>{
  const btn=e.target.closest("[data-edit-links]");
  if(btn)openLinkEditor(btn.dataset.editLinks);
});
linkEditorList.addEventListener("input",syncLinkInputs);
linkEditorList.addEventListener("click",e=>{
  const btn=e.target.closest("[data-remove-link]");
  if(!btn)return;
  syncLinkInputs();
  editingLinks.splice(Number(btn.dataset.removeLink),1);
  renderLinkEditor();
});
addLinkBtn.addEventListener("click",()=>{
  const label=linkLabel.value.trim();
  const url=linkUrl.value.trim();
  if(!label||!validHttpUrl(url)){linkEditorStatus.textContent="Informe um nome e uma URL http/https válida.";return}
  editingLinks.push({label,url});
  linkLabel.value="";linkUrl.value="";
  renderLinkEditor();
  linkEditorStatus.textContent="Link adicionado ao rascunho. Clique em SALVAR NO RASCUNHO.";
});
saveLinksBtn.addEventListener("click",()=>{
  if(editingGameId==null)return;
  syncLinkInputs();
  const cleaned=editingLinks.filter(x=>x.label&&validHttpUrl(x.url));
  const game=games.find(g=>String(g.id)===String(editingGameId));
  if(!game)return;
  game.links_oficiais=cleaned;
  const drafts={};
  games.forEach(g=>{if(Array.isArray(g.links_oficiais)&&g.links_oficiais.length)drafts[g.id]=g.links_oficiais});
  localStorage.setItem("pkgbrasil_link_drafts",JSON.stringify(drafts));
  processedCatalog={jogos:games.map(g=>({...g}))};
  exportCatalogBtn.disabled=false;
  editingLinks=cleaned.map(x=>({...x}));
  renderLinkEditor();
  linkEditorStatus.textContent="Links salvos neste navegador e incluídos no JSON tratado para exportação.";
});
closeLinkEditorBtn.addEventListener("click",()=>{linkEditorCard.hidden=true;editingGameId=null;editingLinks=[]});

setView(loggedIn());
