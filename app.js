const games=[
{title:"Watch Dogs 2 Gold Edition",code:"CUSA04294",platform:"PS4",lang:"PT-BR",tag:"Mundo aberto",desc:"Ação e aventura em mundo aberto com foco em hacking, exploração e missões pela região de São Francisco."},
{title:"Watch Dogs: Legion",code:"CUSA13115",platform:"PS4",lang:"PT-BR",tag:"Ação",desc:"Aventura em mundo aberto ambientada em uma Londres futurista, com recrutamento de personagens e tecnologia no centro da experiência."},
{title:"Bloodborne",code:"CUSA00900",platform:"PS4",lang:"PT-BR",tag:"RPG de ação",desc:"RPG de ação em uma cidade gótica tomada por criaturas e mistérios, conhecido pelo combate intenso e atmosfera sombria."}
];

const recentRail=document.querySelector("#recentRail");
const dubRail=document.querySelector("#dubRail");
const grid=document.querySelector("#gameGrid");
const input=document.querySelector("#searchInput");
const count=document.querySelector("#resultCount");
const modal=document.querySelector("#gameModal");
const modalContent=document.querySelector("#modalContent");

const norm=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

function card(g){
  return `<article class="card" tabindex="0" data-code="${g.code}">
    <div class="poster"><span class="poster-code">${g.code}</span></div>
    <div class="card-info">
      <h3>${g.title}</h3>
      <div class="chips"><span class="chip">${g.platform}</span><span class="chip">${g.lang}</span><span class="chip">${g.tag}</span></div>
    </div>
  </article>`;
}

function render(list=games){
  recentRail.innerHTML=list.map(card).join("");
  dubRail.innerHTML=list.filter(g=>g.lang==="PT-BR").map(card).join("");
  grid.innerHTML=list.map(card).join("");
  count.textContent=`${list.length} jogo${list.length===1?"":"s"}`;
  document.querySelectorAll(".card").forEach(el=>{
    const open=()=>showGame(games.find(g=>g.code===el.dataset.code));
    el.addEventListener("click",open);
    el.addEventListener("keydown",e=>{if(e.key==="Enter")open()});
  });
}

function showGame(g){
  if(!g)return;
  modalContent.innerHTML=`
    <div class="modal-hero">
      <span class="section-kicker">PKGBRASIL • ${g.platform}</span>
      <h2>${g.title}</h2>
      <div class="modal-meta"><span class="chip">${g.code}</span><span class="chip">${g.lang}</span><span class="chip">${g.tag}</span></div>
    </div>
    <div class="modal-body">
      <h3>Sobre o jogo</h3>
      <p>${g.desc}</p>
      <div class="notice">Esta primeira versão do catálogo usa apenas metadados. Links serão adicionados quando apontarem para fontes oficiais ou autorizadas.</div>
    </div>`;
  modal.showModal();
}

input.addEventListener("input",()=>{
  const q=norm(input.value.trim());
  render(games.filter(g=>norm(`${g.title} ${g.code} ${g.platform} ${g.tag}`).includes(q)));
});
document.querySelector("#modalClose").addEventListener("click",()=>modal.close());
modal.addEventListener("click",e=>{if(e.target===modal)modal.close()});
window.addEventListener("scroll",()=>document.querySelector("#nav").classList.toggle("scrolled",scrollY>20));
document.querySelector("#searchToggle").addEventListener("click",()=>{document.querySelector("#catalogo").scrollIntoView();setTimeout(()=>input.focus(),350)});
document.addEventListener("keydown",e=>{if(e.key==="/"&&document.activeElement!==input){e.preventDefault();input.focus()}});
document.querySelector("#heroInfo").addEventListener("click",()=>showGame(games[2]));
render();