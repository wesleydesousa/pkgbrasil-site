(() => {
  if (document.querySelector(".mobile-bottom-bar")) return;

  const bar = document.createElement("nav");
  bar.className = "mobile-bottom-bar";
  bar.setAttribute("aria-label", "Atalhos móveis");

  const path = location.pathname;
  const home = path.endsWith("/index.html") || path.endsWith("/");
  const catalog = path.endsWith("/jogos.html");
  const prefix = /\/jogos\/[^/]+\.html$/.test(path) ? "../" : "";

  bar.innerHTML = [
    '<a href="' + prefix + (home ? "#inicio" : "") + '" data-mobile-home><span>⌂</span>Início</a>',
    '<a href="' + prefix + 'jogos.html" data-mobile-catalog><span>▦</span>Catálogo</a>',
    '<a href="https://t.me/PKGBrasil" target="_blank" rel="noopener noreferrer" data-mobile-telegram><span>✈</span>Telegram</a>'
  ].join("");

  document.body.appendChild(bar);

  if (home) {
    bar.querySelector("[data-mobile-home]").addEventListener("click", (event) => {
      if (location.hash !== "#inicio") return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();