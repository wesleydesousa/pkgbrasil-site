(() => {
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  const measurementId = (window.PKGBRASIL_GA_ID || meta?.content || "").trim();

  const pageType = () => {
    const p = location.pathname.replace(/\/+$/, "") || "/";
    if (p.endsWith("/jogos.html")) return "catalog";
    if (p.endsWith("/como-usar.html")) return "how_to_buy";
    if (p.endsWith("/contato.html")) return "contact";
    if (/\/jogos\/[^/]+\.html$/.test(p)) return "game";
    return "home";
  };

  const send = (name, params = {}) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, {
        page_type: pageType(),
        page_path: location.pathname,
        ...params
      });
    }
  };

  if (measurementId && /^G-[A-Z0-9_-]+$/i.test(measurementId)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: true });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    window.PKGBRASIL_track = send;
  } else {
    window.PKGBRASIL_track = () => {};
  }

  const debounce = (fn, delay = 500) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const searchInputs = [...document.querySelectorAll("#globalSearch, #catalogSearch")];
  searchInputs.forEach((input) => {
    input.addEventListener("input", debounce(() => {
      const term = input.value.trim();
      if (term.length >= 2) send("search", { search_term: term.slice(0, 100) });
    }, 700));
  });

  document.querySelectorAll("#categoryFilter, #dubFilter, #catalogCategoryFilter").forEach((input) => {
    input.addEventListener("change", () => {
      send("catalog_filter", { filter_name: input.id, filter_value: input.value || "all" });
    });
  });

  document.querySelectorAll("#loadMore").forEach((button) => {
    button.addEventListener("click", () => send("catalog_more", { increment: 25 }));
  });

  if (pageType() === "game") {
    const name = document.querySelector(".game-seo-info h1")?.textContent.trim();
    const itemId = location.pathname.split("/").pop()?.replace(/\.html$/, "");
    if (name) send("view_item", { item_name: name.slice(0, 100), item_id: itemId });
  }

  document.addEventListener("click", (event) => {
    const telegram = event.target.closest?.('a[href*="t.me/PKGBrasil"]');
    if (telegram) {
      send("generate_lead", {
        method: "Telegram",
        link_location: telegram.textContent?.trim().slice(0, 60) || "Telegram"
      });
      send("telegram_click", { link_location: telegram.textContent?.trim().slice(0, 60) || "Telegram" });
      return;
    }

    const gameLink = event.target.closest?.(".seo-game-link, .related");
    if (gameLink) {
      send("select_item", {
        item_name: gameLink.textContent?.trim().slice(0, 100) || "Jogo",
        item_id: gameLink.dataset.search?.split(" ").pop() || undefined
      });
    }
  });

  let sent = new Set();
  const checkDepth = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const depth = Math.min(100, Math.round((scrollY / max) * 100));
    [25, 50, 75, 90].forEach((threshold) => {
      if (depth >= threshold && !sent.has(threshold)) {
        sent.add(threshold);
        send("scroll_depth", { percent: threshold });
      }
    });
  };
  addEventListener("scroll", checkDepth, { passive: true });
  checkDepth();
})();