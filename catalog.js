(() => {
  const input = document.querySelector("#catalogSearch");
  const links = [...document.querySelectorAll(".seo-game-link")];
  const count = document.querySelector("#catalogSearchCount");
  const category = document.querySelector("#catalogCategoryFilter");
  const empty = document.querySelector("#catalogSearchEmpty");

  if (!input || !links.length) return;

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const update = () => {
    const query = normalize(input.value);
    let visible = 0;

    links.forEach((link) => {
      const haystack = normalize(link.dataset.search || link.textContent);
      const categoryMatch = !category || !category.value || link.dataset.category === category.value;
      const match = categoryMatch && (!query || haystack.includes(query));
      link.classList.toggle("is-hidden", !match);
      if (match) visible += 1;
    });

    if (count) {
      count.textContent = query
        ? visible + (visible === 1 ? " jogo encontrado" : " jogos encontrados")
        : links.length + " jogos no catálogo";
    }
    if (empty) empty.hidden = visible !== 0;
  };

  input.addEventListener("input", update);
  input.addEventListener("search", update);
  category?.addEventListener("change", update);
  update();
})();