const TELEGRAM="https://t.me/PKGBrasil";
const state={games:[],filtered:[],visible:25,query:"",category:"",filter:""};
const els={
  search:document.querySelector("#globalSearch"),
  latest:document.querySelector("#latestGames"),
  featured:document.querySelector("#featuredGames"),
  grid:document.querySelector("#catalogGrid"),
  status:document.querySelector("#catalogStatus"),
  category:document.querySelector("#categoryFilter"),
  dub:document.querySelector("#dubFilter"),
  more:document.querySelector("#loadMore"),
  modal:document.querySelector("#gameModal"),
  modalContent:document.querySelector("#modalContent"),
  promo:document.querySelector("#promoShowcase")
};
const featuredCodes=["CUSA34384","CUSA33387","CUSA03041","CUSA07820","CUSA28561","CUSA00900","CUSA16596","CUSA11456","CUSA02299","CUSA05725","CUSA01764","CUSA24899"];
const norm=(s="")=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const initials=(t="")=>t.split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join("").toUpperCase();
const cleanTitle=(t="")=>String(t)
  .replace(/\([^)]*(?:DLC|MOD|DUBLAD)[^)]*\)/gi,"")
  .replace(/\b(?:PS4|PKG|PT[- ]?BR|DUBLADO|DUBLADA)\b/gi,"")
  .replace(/\b(?:DELUXE|ULTIMATE|GOLD|PREMIUM|COMPLETE|SPECIAL|LEGENDARY) EDITION\b/gi,"")
  .replace(/\s{2,}/g," ").trim();
const titleTokens=(t="")=>{
  const stop=new Set(["the","of","and","edition","ps4","pkg","video","game","jogo","games"]);
  return norm(cleanTitle(t)).replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>1&&!stop.has(x));
};
const coverScore=(gameTitle,pageTitle)=>{
  const a=titleTokens(gameTitle),b=titleTokens(pageTitle);
  if(!a.length||!b.length)return 0;
  const bs=new Set(b);
  const common=a.filter(x=>bs.has(x)).length;
  const coverage=common/a.length;
  const precision=common/b.length;
  let score=coverage*.75+precision*.25;
  const ga=norm(cleanTitle(gameTitle)).replace(/[^a-z0-9]/g,"");
  const pb=norm(pageTitle).replace(/\([^)]*\)/g,"").replace(/[^a-z0-9]/g,"");
  if(ga===pb)score+=.4;
  else if(ga.includes(pb)||pb.includes(ga))score+=.12;
  return score;
};

const coverCache=new Map();
async function remoteCover(title){
  const key=cleanTitle(title);
  if(coverCache.has(key))return coverCache.get(key);
  try{
    const saved=sessionStorage.getItem("pkg-cover:v2:"+key);
    if(saved){const v=JSON.parse(saved);coverCache.set(key,v);return v}
  }catch{}
  for(const lang of ["pt","en"]){
    try{
      const q=encodeURIComponent(key+" video game");
      const r=await fetch("https://"+lang+".wikipedia.org/w/rest.php/v1/search/page?q="+q+"&limit=8",{credentials:"omit"});
      if(!r.ok)continue;
      const data=await r.json();
      const ranked=(data.pages||[])
        .filter(p=>p.thumbnail?.url&&/jogo|video game|videogame|electronic game/i.test(p.description||""))
        .map(p=>({...p,score:coverScore(title,p.title||"")}))
        .sort((a,b)=>b.score-a.score);
      const target=ranked[0];
      if(target&&target.score>=.62){
        const value="https:"+target.thumbnail.url;
        coverCache.set(key,value);
        try{sessionStorage.setItem("pkg-cover:v2:"+key,JSON.stringify(value))}catch{}
        return value;
      }
    }catch{}
  }
  coverCache.set(key,null);
  try{sessionStorage.setItem("pkg-cover:v2:"+key,"null")}catch{}
  return null;
}
async function fallbackCover(img){
  if(img.dataset.fallbackDone)return;
  img.dataset.fallbackDone="1";
  img.style.opacity=".18";
  const src=await remoteCover(img.dataset.coverTitle||"");
  if(src){img.src=src;img.style.opacity="1"}else{img.remove()}
}
function bindCover(img){
  img.addEventListener("error",()=>fallbackCover(img),{once:true});
}
function coverHtml(g,extraClass=""){
  const local=esc(g.capa||("fotos/"+g.id+".jpg"));
  return `<div class="cover ${extraClass}"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img src="${local}" data-cover-title="${esc(g.titulo)}" alt="Capa de ${esc(g.titulo)}" loading="lazy"><span class="cover-badge">PS4</span>${g.dublado?'<span class="cover-state">PT-BR</span>':""}</div>`;
}
function card(g){
  const v=g.versao?`v${esc(g.versao)}`:"";
  return `<article class="game-card" title="${esc(g.titulo)}" tabindex="0" data-id="${esc(g.id)}">${coverHtml(g)}<div class="game-info"><h3 class="game-title">${esc(g.titulo)}</h3><div class="game-meta"><span class="game-code">${esc(g.codigo||"Sem código")}</span><span>${v}</span></div><button class="mini-action" type="button" tabindex="-1">CONSULTAR</button></div></article>`;
}
function hydrateCovers(root=document){root.querySelectorAll("img[data-cover-title]").forEach(img=>{if(!img.dataset.coverBound){img.dataset.coverBound="1";bindCover(img)}})}
function bindCards(root){
  root.querySelectorAll(".game-card").forEach(el=>{
    const open=()=>showGame(state.games.find(g=>String(g.id)===String(el.dataset.id)));
    el.addEventListener("click",open);
    el.addEventListener("keydown",e=>{if(e.key==="Enter")open()});
  });
  hydrateCovers(root);
}
function renderRows(){
  const latest=[...state.games].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,8);
  const feat=featuredCodes.map(c=>state.games.find(g=>g.codigo===c)).filter(Boolean).slice(0,8);
  els.latest.innerHTML=latest.map(card).join("");
  els.featured.innerHTML=(feat.length?feat:state.games.slice(0,8)).map(card).join("");
  bindCards(els.latest);bindCards(els.featured);
}
function renderPromo(){
  if(!els.promo)return;
  const picks=featuredCodes.map(c=>state.games.find(g=>g.codigo===c)).filter(Boolean).slice(0,4);
  els.promo.innerHTML=picks.map(g=>`<div class="hero-mini"><img src="${esc(g.capa||("fotos/"+g.id+".jpg"))}" data-cover-title="${esc(g.titulo)}" alt="${esc(g.titulo)}"></div>`).join("");
  hydrateCovers(els.promo);
}
function applyFilters(reset=true){
  const q=norm(state.query.trim());
  state.filtered=state.games.filter(g=>(!q||norm(`${g.titulo} ${g.codigo} ${g.categoria}`).includes(q))&&(!state.category||g.categoria===state.category)&&(!state.filter||g.dublado));
  if(reset)state.visible=25;
  renderCatalog();
}
function renderCatalog(){
  const shown=state.filtered.slice(0,state.visible);
  els.grid.innerHTML=shown.map(card).join("");
  bindCards(els.grid);
  els.status.textContent=`${state.filtered.length} títulos encontrados`;
  els.more.hidden=state.visible>=state.filtered.length;
}
function telegramButton(g){
  return `<a class="telegram-button" href="${TELEGRAM}" target="_blank" rel="noopener noreferrer" aria-label="Consultar ${esc(g.titulo)} no Telegram"><span class="telegram-icon">✈</span><span><b>CONSULTAR NO TELEGRAM</b><small>@PKGBrasil</small></span></a>`;
}
function showGame(g){
  if(!g)return;
  els.modalContent.innerHTML=`<div class="modal-product"><div class="modal-cover"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img src="${esc(g.capa||("fotos/"+g.id+".jpg"))}" data-cover-title="${esc(g.titulo)}" alt="Capa de ${esc(g.titulo)}"></div><div class="modal-content-side"><span class="eyebrow">PKGBRASIL · PS4</span><h2>${esc(g.titulo)}</h2><div class="modal-chips"><span class="modal-chip">${esc(g.codigo||"Sem código")}</span><span class="modal-chip">${esc(g.categoria||"Jogos")}</span>${g.dublado?'<span class="modal-chip">Dublado PT-BR</span>':""}${g.dlc?'<span class="modal-chip">Conteúdo adicional</span>':""}</div><div class="detail-grid"><div class="detail"><span>Plataforma</span><strong>PlayStation 4</strong></div><div class="detail"><span>Versão</span><strong>${esc(g.versao||"Não informada")}</strong></div><div class="detail"><span>Código</span><strong>${esc(g.codigo||"Não informado")}</strong></div><div class="detail"><span>Categoria</span><strong>${esc(g.categoria||"Jogos")}</strong></div></div>${telegramButton(g)}<div class="modal-note">Consulte disponibilidade e condições diretamente com a PKGBRASIL no Telegram. O catálogo público não publica links externos de download.</div></div></div>`;
  hydrateCovers(els.modalContent);
  els.modal.showModal();
}
function fillCategories(){
  [...new Set(state.games.map(g=>g.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(c=>{
    const o=document.createElement("option");o.value=c;o.textContent=c;els.category.appendChild(o);
  });
}
async function init(){
  try{
    const r=await fetch("data/catalogo.json",{cache:"no-store"});
    const d=await r.json();
    state.games=d.jogos||[];
    state.filtered=[...state.games];
    fillCategories();renderPromo();renderRows();renderCatalog();
  }catch(e){els.status.textContent="Não foi possível carregar o catálogo."}
}
els.search?.addEventListener("input",()=>{state.query=els.search.value;applyFilters()});
els.category?.addEventListener("change",()=>{state.category=els.category.value;applyFilters()});
els.dub?.addEventListener("change",()=>{state.filter=els.dub.value;applyFilters()});
els.more?.addEventListener("click",()=>{state.visible+=25;renderCatalog()});
document.querySelector("#modalClose")?.addEventListener("click",()=>els.modal.close());
els.modal?.addEventListener("click",e=>{if(e.target===els.modal)els.modal.close()});
document.querySelectorAll("[data-show-all]").forEach(b=>b.addEventListener("click",()=>document.querySelector("#catalogo").scrollIntoView({behavior:"smooth"})));
window.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement!==els.search){e.preventDefault();els.search?.focus()}if(e.key==="Escape"&&els.modal?.open)els.modal.close()});

(()=>{const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;let p=document.querySelector("#scrollProgress");if(!p){p=document.createElement("div");p.id="scrollProgress";document.body.prepend(p)}const progress=()=>{const m=document.documentElement.scrollHeight-innerHeight;p.style.width=(m>0?Math.min(100,scrollY/m*100):0)+"%"};addEventListener("scroll",progress,{passive:true});progress();if(reduced)return;const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("gamer-visible");io.unobserve(e.target)}}),{threshold:.06});const arm=(root=document)=>root.querySelectorAll(".game-card:not([data-gamer-armed])").forEach((el,i)=>{el.dataset.gamerArmed="1";el.classList.add("gamer-reveal-card");el.style.setProperty("--delay",Math.min(i%10,9)*30+"ms");io.observe(el)});arm();new MutationObserver(()=>arm()).observe(document.body,{subtree:true,childList:true});document.addEventListener("pointermove",e=>{const c=e.target.closest(".game-card");if(!c||innerWidth<900)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty("--ry",((x-.5)*7)+"deg");c.style.setProperty("--rx",((.5-y)*6)+"deg")},{passive:true});document.addEventListener("pointerout",e=>{const c=e.target.closest(".game-card");if(c&&!c.contains(e.relatedTarget)){c.style.setProperty("--rx","0deg");c.style.setProperty("--ry","0deg")}})})();
init();