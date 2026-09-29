const state={games:[],filtered:[],visible:25,query:"",category:"",filter:""};const els={search:document.querySelector("#globalSearch"),latest:document.querySelector("#latestGames"),featured:document.querySelector("#featuredGames"),grid:document.querySelector("#catalogGrid"),status:document.querySelector("#catalogStatus"),category:document.querySelector("#categoryFilter"),dub:document.querySelector("#dubFilter"),more:document.querySelector("#loadMore"),modal:document.querySelector("#gameModal"),modalContent:document.querySelector("#modalContent")};const featuredCodes=["CUSA34384","CUSA33387","CUSA03041","CUSA07820","CUSA28561","CUSA00900","CUSA16596","CUSA11456","CUSA02299","CUSA05725","CUSA01764","CUSA24899"];const norm=(s="")=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));const initials=(t="")=>t.split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join("").toUpperCase();function card(g){const v=g.versao?`v${esc(g.versao)}`:"";return `<article class="game-card" title="${esc(g.titulo)}" tabindex="0" data-id="${esc(g.id)}"><div class="cover"><div class="cover-fallback">${esc(initials(g.titulo))}</div><img data-wiki-title="${esc(g.titulo)}" alt="Imagem de ${esc(g.titulo)}" loading="lazy"><span class="cover-badge">PS4</span></div><div class="game-info"><h3 class="game-title">${esc(g.titulo)}</h3><div class="game-meta"><span class="game-code">${esc(g.codigo||"Sem código")}</span><span>${v}</span></div><button class="mini-action" type="button" tabindex="-1">ABRIR JOGO</button></div></article>`}function bindCards(r){r.querySelectorAll(".game-card").forEach(el=>{const open=()=>showGame(state.games.find(g=>g.id===el.dataset.id));el.addEventListener("click",open);el.addEventListener("keydown",e=>{if(e.key==="Enter"){open()}})})}const wikiCache=new Map();
const wikiObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;wikiObserver.unobserve(entry.target);loadWikiImage(entry.target)})},{rootMargin:"320px 0px",threshold:.01});

function cleanGameTitle(t=""){
  return t
    .replace(/\([^)]*(?:DLC|MOD|DUBLAD)[^)]*\)/gi,"")
    .replace(/\b(?:PS4|PKG|PT[- ]?BR|DUBLADO|DUBLADA)\b/gi,"")
    .replace(/\b(?:DELUXE|ULTIMATE|GOLD|PREMIUM|COMPLETE|DIGITAL DELUXE|LEGENDARY|SPECIAL) EDITION\b/gi,"")
    .replace(/\b(?:DIRECTOR'?S CUT|VERSÃO DO DIRETOR|REMASTERED)\b/gi,"")
    .replace(/\s{2,}/g," ")
    .replace(/\s+[:\-]\s*$/,"")
    .trim();
}
function titleTokens(t=""){
  const stop=new Set(["the","of","and","edition","ps4","game","video","versao","director","complete","deluxe","ultimate","gold"]);
  return norm(t).replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>1&&!stop.has(x));
}
function candidateScore(gameTitle,pageTitle){
  const a=titleTokens(cleanGameTitle(gameTitle));
  const b=titleTokens(pageTitle.replace(/\([^)]*\)/g,""));
  if(!a.length||!b.length)return 0;
  const aset=new Set(a), bset=new Set(b);
  const common=[...aset].filter(x=>bset.has(x)).length;
  const coverage=common/aset.size;
  const precision=common/bset.size;
  let score=coverage*.72+precision*.28;
  const ga=norm(cleanGameTitle(gameTitle)).replace(/[^a-z0-9]/g,"");
  const pb=norm(pageTitle.replace(/\([^)]*\)/g,"")).replace(/[^a-z0-9]/g,"");
  if(ga===pb)score+=.45;
  else if(ga.includes(pb)||pb.includes(ga))score+=.18;
  return score;
}
async function fetchWikipediaImage(title){
  const key=cleanGameTitle(title);
  if(wikiCache.has(key))return wikiCache.get(key);
  try{
    const saved=localStorage.getItem("pkgwiki:v3:"+key);
    if(saved){const parsed=JSON.parse(saved);wikiCache.set(key,parsed);return parsed}
  }catch{}

  const langs=["pt","en"];
  const acceptableDescription=d=>/jogo|video game|videogame|electronic game|role-playing game|action-adventure|fighting game|platform game|survival horror|racing game|sports game/i.test(d||"");

  // Pass 1: normal Wikipedia search + PageImages.
  for(const lang of langs){
    const query=`"${key}" video game`;
    const url=`https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=pageimages%7Cinfo%7Cpageterms&piprop=thumbnail&pithumbsize=600&wbptterms=description&inprop=url&format=json&origin=*`;
    try{
      const r=await fetch(url,{mode:"cors",credentials:"omit"});
      if(!r.ok)continue;
      const d=await r.json();
      const pages=Object.values(d?.query?.pages||{});
      const ranked=pages.map(p=>{
        const desc=p.terms?.description?.[0]||"";
        let score=candidateScore(title,p.title||"");
        if(acceptableDescription(desc))score+=.15;
        return {score,title:p.title,url:p.thumbnail?.source||"",source:p.fullurl||"",desc};
      }).filter(x=>x.url&&x.source).sort((a,b)=>b.score-a.score);
      const best=ranked[0];
      if(best&&best.score>=.72){
        const found={url:best.url,source:best.source,title:best.title,lang};
        wikiCache.set(key,found);
        try{localStorage.setItem("pkgwiki:v3:"+key,JSON.stringify(found))}catch{}
        return found;
      }
    }catch{}
  }

  // Pass 2: broader REST search, but only accept results clearly identified as video games.
  for(const lang of langs){
    try{
      const u=`https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(key)}&limit=10`;
      const r=await fetch(u,{mode:"cors",credentials:"omit"});
      if(!r.ok)continue;
      const d=await r.json();
      const ranked=(d.pages||[]).map(p=>{
        let score=candidateScore(title,p.title||"");
        if(acceptableDescription(p.description))score+=.2;
        return {score,title:p.title,url:p.thumbnail?.url?("https:"+p.thumbnail.url):"",source:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent((p.key||p.title||"").replace(/ /g,"_"))}`,desc:p.description||""};
      }).filter(x=>x.url&&acceptableDescription(x.desc)).sort((a,b)=>b.score-a.score);
      const best=ranked[0];
      if(best&&best.score>=.68){
        const found={url:best.url,source:best.source,title:best.title,lang};
        wikiCache.set(key,found);
        try{localStorage.setItem("pkgwiki:v3:"+key,JSON.stringify(found))}catch{}
        return found;
      }
    }catch{}
  }

  // Pass 3: strict Wikimedia Commons fallback for games still without artwork.
  try{
    const tokens=titleTokens(key);
    const q=`"${key}" game cover`;
    const u="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch="+encodeURIComponent(q)+"&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=600&format=json&origin=*";
    const r=await fetch(u,{mode:"cors",credentials:"omit"});
    if(r.ok){
      const d=await r.json();
      const bad=/\b(logo|icon|map|flag|cosplay|screenshot|gameplay|controller|console|fanart|fan art|meme)\b/i;
      const ranked=Object.values(d?.query?.pages||{}).map(p=>{
        const info=p.imageinfo?.[0];
        if(!info?.thumburl||!/^image\/(jpeg|png|webp)/i.test(info.mime||""))return null;
        const name=(p.title||"").replace(/^File:/i,"");
        const nt=titleTokens(name);
        const common=tokens.filter(t=>nt.includes(t)).length;
        const coverage=tokens.length?common/tokens.length:0;
        let score=coverage;
        if(/cover|box|artwork|poster/i.test(name))score+=.18;
        if(bad.test(name))score-=.4;
        return {score,url:info.thumburl,source:info.descriptionurl||info.url||"https://commons.wikimedia.org/",title:p.title};
      }).filter(Boolean).sort((a,b)=>b.score-a.score);
      const best=ranked[0];
      if(best&&best.score>=.88){
        const found={url:best.url,source:best.source,title:best.title,lang:"commons"};
        wikiCache.set(key,found);
        try{localStorage.setItem("pkgwiki:v3:"+key,JSON.stringify(found))}catch{}
        return found;
      }
    }
  }catch{}

  wikiCache.set(key,null);
  try{localStorage.setItem("pkgwiki:v3:"+key,"null")}catch{}
  return null;
}

async function loadWikiImage(img){
  if(img.dataset.wikiLoaded)return;
  img.dataset.wikiLoaded="1";
  const found=await fetchWikipediaImage(img.dataset.wikiTitle||"");
  if(!found)return;
  img.src=found.url;
  img.addEventListener("error",()=>img.remove(),{once:true});
  const cover=img.closest(".cover");
  if(cover&&!cover.querySelector(".cover-source")){
    const a=document.createElement("a");
    a.className="cover-source";
    a.href=found.source;
    a.target="_blank";
    a.rel="noopener noreferrer";
    a.textContent="Wikipedia";
    a.title="Imagem associada ao artigo correspondente na Wikipedia";
    a.addEventListener("click",e=>e.stopPropagation());
    cover.appendChild(a);
  }
}
function hydrateWikiImages(root=document){
  root.querySelectorAll("img[data-wiki-title]:not([data-wiki-armed])").forEach(img=>{
    img.dataset.wikiArmed="1";
    wikiObserver.observe(img);
  });
}
function renderRows(){const latest=[...state.games].sort((a,b)=>Number(b.id)-Number(a.id)).slice(0,8);const feat=featuredCodes.map(c=>state.games.find(g=>g.codigo===c)).filter(Boolean).slice(0,8);els.latest.innerHTML=latest.map(card).join("");els.featured.innerHTML=(feat.length?feat:state.games.slice(0,8)).map(card).join("");bindCards(els.latest);bindCards(els.featured);hydrateWikiImages(els.latest);hydrateWikiImages(els.featured)}function applyFilters(reset=true){const q=norm(state.query.trim());state.filtered=state.games.filter(g=>(!q||norm(`${g.titulo} ${g.codigo} ${g.categoria}`).includes(q))&&(!state.category||g.categoria===state.category)&&(!state.filter||g.dublado));if(reset)state.visible=25;renderCatalog()}function renderCatalog(){const shown=state.filtered.slice(0,state.visible);els.grid.innerHTML=shown.map(card).join("");bindCards(els.grid);hydrateWikiImages(els.grid);els.status.textContent=`${state.filtered.length} títulos encontrados`;els.more.hidden=state.visible>=state.filtered.length}function showGame(g){if(!g)return;els.modalContent.innerHTML=`<div class="modal-top"><span class="eyebrow">PKGBRASIL · PS4</span><h2>${esc(g.titulo)}</h2><div class="modal-chips"><span class="modal-chip">${esc(g.codigo||"Sem código")}</span><span class="modal-chip">${esc(g.categoria||"Jogos")}</span>${g.dublado?'<span class="modal-chip">Dublado PT-BR</span>':""}${g.dlc?'<span class="modal-chip">Conteúdo adicional</span>':""}</div></div><div class="modal-body"><div class="detail-grid"><div class="detail"><span>Plataforma</span><strong>PlayStation 4</strong></div><div class="detail"><span>Versão</span><strong>${esc(g.versao||"Não informada")}</strong></div><div class="detail"><span>Código</span><strong>${esc(g.codigo||"Não informado")}</strong></div><div class="detail"><span>Categoria</span><strong>${esc(g.categoria||"Jogos")}</strong></div></div><div class="modal-note">O catálogo utiliza os metadados do arquivo enviado. Links são publicados somente quando houver uma fonte oficial ou autorização de distribuição.</div></div>`;els.modal.showModal()}function fillCategories(){[...new Set(state.games.map(g=>g.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;els.category.appendChild(o)})}async function init(){try{const r=await fetch("data/catalogo.json",{cache:"no-store"});const d=await r.json();state.games=d.jogos||[];state.filtered=[...state.games];fillCategories();renderRows();renderCatalog()}catch(e){els.status.textContent="Não foi possível carregar o catálogo."}}els.search.addEventListener("input",()=>{state.query=els.search.value;applyFilters()});els.category.addEventListener("change",()=>{state.category=els.category.value;applyFilters()});els.dub.addEventListener("change",()=>{state.filter=els.dub.value;applyFilters()});els.more.addEventListener("click",()=>{state.visible+=25;renderCatalog()});document.querySelector("#modalClose").addEventListener("click",()=>els.modal.close());els.modal.addEventListener("click",e=>{if(e.target===els.modal)els.modal.close()});const heroDetails=document.querySelector("#heroDetails");if(heroDetails)heroDetails.addEventListener("click",()=>showGame(state.games.find(g=>g.codigo==="CUSA34384")||state.games[0]));document.querySelectorAll("[data-show-all]").forEach(b=>b.addEventListener("click",()=>document.querySelector(".catalog-section").scrollIntoView({behavior:"smooth"})));init();
// Atalhos de navegação do catálogo
window.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement!==els.search){e.preventDefault();els.search.focus()}if(e.key==="Escape"&&els.modal.open)els.modal.close()});

const auth={modal:document.querySelector("#authModal"),message:document.querySelector("#authMessage"),login:document.querySelector("#loginForm"),register:document.querySelector("#registerForm"),forgot:document.querySelector("#forgotForm")};
function authView(view){auth.login.hidden=view!=="login";auth.register.hidden=view!=="register";auth.forgot.hidden=view!=="forgot";document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===view));auth.message.textContent=""}
function openAuth(view="login"){authView(view);auth.modal.showModal()}
document.querySelector("#loginBtn").addEventListener("click",()=>openAuth("login"));document.querySelector("#registerBtn").addEventListener("click",()=>openAuth("register"));document.querySelector("#authClose").addEventListener("click",()=>auth.modal.close());document.querySelectorAll("[data-auth-tab]").forEach(b=>b.addEventListener("click",()=>authView(b.dataset.authTab)));document.querySelector("#forgotBtn").addEventListener("click",()=>authView("forgot"));document.querySelector("[data-back-login]").addEventListener("click",()=>authView("login"));
function backendPending(e){e.preventDefault();auth.message.textContent="Interface pronta. Conecte o backend seguro para ativar esta operação."}
auth.login.addEventListener("submit",backendPending);auth.forgot.addEventListener("submit",backendPending);auth.register.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(auth.register);if(f.get("password")!==f.get("confirmPassword")){auth.message.textContent="As senhas não coincidem.";return}auth.message.textContent="Interface pronta. Conecte o backend seguro para criar contas."});
document.querySelector("#subscribeBtn").addEventListener("click",()=>openAuth("register"));

/* Animate content according to scroll direction */
(()=>{const targets=[...document.querySelectorAll(".platform-strip,.section,.sidebar .side-card,.promo-card,.membership,footer")];if(!targets.length)return;targets.forEach(el=>el.classList.add("scroll-reveal"));let lastY=window.scrollY,dir="down";const io=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove("from-up","from-down");entry.target.classList.add(dir==="down"?"from-down":"from-up");requestAnimationFrame(()=>requestAnimationFrame(()=>entry.target.classList.add("is-visible")))}else{entry.target.classList.remove("is-visible","from-up","from-down")}})},{threshold:.08,rootMargin:"0px 0px -4% 0px"});targets.forEach(el=>io.observe(el));window.addEventListener("scroll",()=>{const y=window.scrollY;if(Math.abs(y-lastY)>3){dir=y>lastY?"down":"up";lastY=y}},{passive:true})})();


/* ===== PKGBRASIL GAMER INTERACTIONS v2 ===== */
(()=>{
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scroll progress HUD
  let progress=document.querySelector("#scrollProgress");
  if(!progress){
    progress=document.createElement("div");
    progress.id="scrollProgress";
    progress.setAttribute("aria-hidden","true");
    document.body.prepend(progress);
  }
  const updateProgress=()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    progress.style.width=(max>0?Math.min(100,(scrollY/max)*100):0)+"%";
  };
  addEventListener("scroll",updateProgress,{passive:true});
  addEventListener("resize",updateProgress,{passive:true});
  updateProgress();

  if(!reduced){
    // Ambient spotlight follows the pointer
    addEventListener("pointermove",e=>{
      document.documentElement.style.setProperty("--g-mx",e.clientX+"px");
      document.documentElement.style.setProperty("--g-my",e.clientY+"px");
    },{passive:true});

    // 3D card tilt, works with dynamically rendered catalog cards
    document.addEventListener("pointermove",e=>{
      const card=e.target.closest(".game-card");
      if(!card || matchMedia("(max-width: 900px)").matches)return;
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width;
      const y=(e.clientY-r.top)/r.height;
      card.style.setProperty("--ry",((x-.5)*10).toFixed(2)+"deg");
      card.style.setProperty("--rx",((.5-y)*8).toFixed(2)+"deg");
      card.style.setProperty("--px",(x*100).toFixed(1)+"%");
      card.style.setProperty("--py",(y*100).toFixed(1)+"%");
    },{passive:true});
    document.addEventListener("pointerout",e=>{
      const card=e.target.closest(".game-card");
      if(card && !card.contains(e.relatedTarget)){
        card.style.setProperty("--rx","0deg");
        card.style.setProperty("--ry","0deg");
      }
    });

    // Button ripple
    document.addEventListener("pointerdown",e=>{
      const el=e.target.closest(".btn,.account-btn,.mini-action,.load-more");
      if(!el)return;
      const r=el.getBoundingClientRect();
      const s=document.createElement("span");
      s.className="ripple";
      const size=Math.max(r.width,r.height)*.42;
      s.style.width=s.style.height=size+"px";
      s.style.left=(e.clientX-r.left)+"px";
      s.style.top=(e.clientY-r.top)+"px";
      el.appendChild(s);
      setTimeout(()=>s.remove(),620);
    });
  }

  // Stagger reveal for game cards, including cards added by "mostrar mais"
  const cardObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){
        entry.target.classList.add("gamer-visible");
        cardObserver.unobserve(entry.target);
      }
    }
  },{threshold:.08,rootMargin:"40px 0px -20px"});
  const armCards=(root=document)=>{
    const cards=[...root.querySelectorAll(".game-card:not([data-gamer-armed])")];
    cards.forEach((card,i)=>{
      card.dataset.gamerArmed="1";
      card.classList.add("gamer-reveal-card");
      card.style.setProperty("--delay",Math.min(i%10,9)*38+"ms");
      cardObserver.observe(card);
    });
  };
  armCards();
  const mutationObserver=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1){
          if(node.matches?.(".game-card")) armCards(node.parentElement||document);
          else if(node.querySelector?.(".game-card")) armCards(node);
        }
      }
    }
  });
  mutationObserver.observe(document.body,{childList:true,subtree:true});

  // Tiny click-energy feedback across gamer UI
  document.addEventListener("click",e=>{
    const target=e.target.closest(".platform,.side-card,.game-card,.membership-card");
    if(!target)return;
    target.classList.remove("gamer-click-flash");
    void target.offsetWidth;
    target.classList.add("gamer-click-flash");
    setTimeout(()=>target.classList.remove("gamer-click-flash"),260);
  });
})();
