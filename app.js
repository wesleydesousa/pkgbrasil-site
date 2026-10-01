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
function bindCover(img){
  img.addEventListener("load",()=>{img.classList.add("cover-loaded")},{once:true});
  img.addEventListener("error",()=>{img.remove()},{once:true});
}
function coverHtml(g,extraClass=""){
  const local=esc(g.capa||("fotos/"+g.id+".jpg"));
  return `<div class="cover ${extraClass}"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img src="${local}" data-cover-title="${esc(g.titulo)}" alt="Capa de ${esc(g.titulo)}" loading="lazy" decoding="async"><span class="cover-badge">PS4</span>${g.dublado?'<span class="cover-state">PT-BR</span>':""}</div>`;
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
  els.promo.innerHTML=picks.map(g=>`<div class="hero-mini"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img src="${esc(g.capa||("fotos/"+g.id+".jpg"))}" data-cover-title="${esc(g.titulo)}" alt="${esc(g.titulo)}" decoding="async"></div>`).join("");
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
  els.modalContent.innerHTML=`<div class="modal-product"><div class="modal-cover"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img src="${esc(g.capa||("fotos/"+g.id+".jpg"))}" data-cover-title="${esc(g.titulo)}" alt="Capa de ${esc(g.titulo)}" decoding="async"></div><div class="modal-content-side"><span class="eyebrow">PKGBRASIL · PS4</span><h2>${esc(g.titulo)}</h2><div class="modal-chips"><span class="modal-chip">${esc(g.codigo||"Sem código")}</span><span class="modal-chip">${esc(g.categoria||"Jogos")}</span>${g.dublado?'<span class="modal-chip">Dublado PT-BR</span>':""}${g.dlc?'<span class="modal-chip">Conteúdo adicional</span>':""}</div><div class="detail-grid"><div class="detail"><span>Plataforma</span><strong>PlayStation 4</strong></div><div class="detail"><span>Versão</span><strong>${esc(g.versao||"Não informada")}</strong></div><div class="detail"><span>Código</span><strong>${esc(g.codigo||"Não informado")}</strong></div><div class="detail"><span>Categoria</span><strong>${esc(g.categoria||"Jogos")}</strong></div></div>${telegramButton(g)}<div class="modal-note">Consulte disponibilidade e condições diretamente com a PKGBRASIL no Telegram. O catálogo público não publica links externos de download.</div></div></div>`;
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

(()=>{const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;let p=document.querySelector("#scrollProgress");if(!p){p=document.createElement("div");p.id="scrollProgress";document.body.prepend(p)}const progress=()=>{const m=document.documentElement.scrollHeight-innerHeight;p.style.width=(m>0?Math.min(100,scrollY/m*100):0)+"%"};addEventListener("scroll",progress,{passive:true});progress();if(reduced)return;const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("gamer-visible");io.unobserve(e.target)}}),{threshold:.06});const arm=(root=document)=>root.querySelectorAll(".game-card:not([data-gamer-armed])").forEach((el,i)=>{el.dataset.gamerArmed="1";el.classList.add("gamer-reveal-card");el.style.setProperty("--delay",Math.min(i%10,9)*30+"ms");io.observe(el)});arm();new MutationObserver(()=>arm()).observe(document.body,{subtree:true,childList:true});();
init();