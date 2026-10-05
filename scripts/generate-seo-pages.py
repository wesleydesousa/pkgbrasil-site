import json
import re
import unicodedata
from datetime import date
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "catalogo.json"
OUT = ROOT / "jogos"
BASE = "https://wesleydesousa.github.io/pkgbrasil-site"
TODAY = date.today().isoformat()

def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value or "jogo"

def unique_slugs(games):
    seen = {}
    result = {}
    for game in games:
        base = slugify(game.get("titulo", "jogo"))
        code = slugify(game.get("codigo", ""))
        candidate = base
        if seen.get(candidate):
            candidate = f"{base}-{code}" if code else f"{base}-{game.get('id')}"
        while candidate in seen:
            candidate = f"{base}-{game.get('id')}"
        seen[candidate] = True
        result[str(game["id"])] = candidate
    return result

def schema(game, url):
    data = {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "name": game["titulo"],
        "url": url,
        "gamePlatform": "PlayStation 4",
        "genre": game.get("categoria") or "Jogos",
        "description": (
            f"{game['titulo']} no catálogo PKGBRASIL para PlayStation 4. "
            f"Código {game.get('codigo') or 'não informado'}, "
            f"versão {game.get('versao') or 'não informada'}, "
            f"categoria {game.get('categoria') or 'Jogos'}."
        ),
        "image": f"{BASE}/{game['capa']}",
        "publisher": {"@type": "Organization", "name": "PKGBRASIL"}
    }
    if game.get("codigo"):
        data["identifier"] = game["codigo"]
    extra = []
    if game.get("edicao"):
        extra.append({"@type": "PropertyValue", "name": "Edição", "value": game["edicao"]})
    extra.append({"@type": "PropertyValue", "name": "Dublado", "value": "Sim" if game.get("dublado") else "Não"})
    extra.append({"@type": "PropertyValue", "name": "DLC", "value": "Sim" if game.get("dlc") else "Não"})
    data["additionalProperty"] = extra
    data["mainEntityOfPage"] = {"@type": "WebPage", "@id": url}
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))

def breadcrumb_schema(title, url):
    data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Catálogo", "item": f"{BASE}/jogos.html"},
            {"@type": "ListItem", "position": 3, "name": title, "item": url}
        ]
    }
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))

def page(game, slug, related):
    title = game["titulo"]
    code = game.get("codigo") or "não informado"
    version = game.get("versao") or "não informada"
    category = game.get("categoria") or "Jogos"
    dubbed = "Sim" if game.get("dublado") else "Não"
    dlc = "Sim" if game.get("dlc") else "Não"
    edition = game.get("edicao") or ""
    url = f"{BASE}/jogos/{slug}.html"
    cover = f"../{game['capa']}"

    category_copy = {
        "Ação e Aventura": "Esta ficha organiza as principais informações de catálogo para quem procura este título de ação e aventura no PS4.",
        "Luta": "Esta ficha reúne os dados de catálogo para quem procura este título de luta no PS4 e precisa identificar corretamente a edição.",
        "RPG": "Esta ficha reúne os dados de catálogo para quem procura este RPG no PS4 e precisa identificar corretamente a edição.",
        "Esportes": "Esta ficha organiza os dados de catálogo para quem procura este título de esporte no PS4.",
        "Corrida": "Esta ficha organiza os dados de catálogo para quem procura este título de corrida no PS4.",
        "Terror": "Esta ficha reúne os dados disponíveis para quem procura este título de terror no PS4.",
        "Aventura": "Esta ficha organiza as informações disponíveis para quem procura este título de aventura no PS4.",
        "Plataforma": "Esta ficha organiza as informações disponíveis para quem procura este título de plataforma no PS4.",
        "Sobrevivência": "Esta ficha organiza as informações disponíveis para quem procura este título de sobrevivência no PS4.",
        "Simulação": "Esta ficha organiza as informações disponíveis para quem procura este título de simulação no PS4.",
        "Casual": "Esta ficha organiza as informações disponíveis para quem procura este título casual no PS4.",
        "Música": "Esta ficha organiza as informações disponíveis para quem procura este título musical no PS4.",
    }.get(category, f"Esta ficha reúne as informações disponíveis no catálogo para quem procura {title} no PS4.")

    edition_text = f", edição {edition}" if edition else ""
    description = (
        f"{title} para PS4 no catálogo PKGBRASIL. "
        f"Código {code}, versão {version}, categoria {category}{edition_text}, dublado {dubbed.lower()} e DLC {dlc.lower()}."
    )
    summary = (
        f"{title} está registrado no catálogo PKGBRASIL como um título de PlayStation 4 na categoria {category}. "
        f"A identificação desta ficha usa o código {code} e a versão {version}. "
        + (f"A edição indicada no título é {edition}. " if edition else "")
        + f"O catálogo informa dublagem: {dubbed.lower()}, e DLC: {dlc.lower()}."
    )
    identification = (
        f"Para diferenciar esta página de outras edições do mesmo jogo, use o código {code} junto da versão {version}. "
        f"Esses dados são os identificadores exibidos pelo catálogo PKGBRASIL para esta ficha."
    )
    related_html = "".join(
        f'<a class="related" href="{r["href"]}"><img src="../{r["capa"]}" alt="{escape(r["titulo"])}" loading="lazy"><span>{escape(r["titulo"])}</span></a>'
        for r in related
    )
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#070707">
<meta name="color-scheme" content="dark">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="description" content="{escape(description)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="PKGBRASIL">
<meta property="og:title" content="{escape(title)} | PS4 | {escape(code)} | PKGBRASIL">
<meta property="og:description" content="{escape(description)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/{game['capa']}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{escape(title)} | PS4 | {escape(code)} | PKGBRASIL">
<meta name="twitter:description" content="{escape(description)}">
<meta name="twitter:image" content="{BASE}/{game['capa']}">
<title>{escape(title)} | PS4 | {escape(code)} | PKGBRASIL</title>
<link rel="icon" href="../ativos/WhatsApp%20Image%202026-09-29%20at%2009.11.02.jpeg" type="image/jpeg">
<link rel="stylesheet" href="../styles.css?v=20261005-6">
<script type="application/ld+json">{schema(game, url)}</script>
<script type="application/ld+json">{breadcrumb_schema(title, url)}</script>
</head>
<body>
<header class="topbar">
<a class="brand brand-image" href="../" aria-label="PKGBRASIL - Início"><img src="../ativos/WhatsApp%20Image%202026-09-29%20at%2009.11.02.jpeg" alt="PKGBRASIL"></a>
<nav class="main-nav" aria-label="Navegação principal">
<a href="../">INÍCIO</a><a class="active" href="../jogos.html">CATÁLOGO</a><a href="../como-usar.html">COMO COMPRAR</a><a href="../contato.html">TELEGRAM</a>
</nav>
<div class="header-actions"><a class="account-btn primary" href="https://t.me/PKGBrasil" target="_blank" rel="noopener noreferrer">FALAR NO TELEGRAM</a></div>
<details class="mobile-menu">
<summary aria-label="Abrir menu">MENU</summary>
<nav class="mobile-menu-panel" aria-label="Menu mobile">
<a href="../">INÍCIO</a><a href="../jogos.html">CATÁLOGO</a><a href="../como-usar.html">COMO COMPRAR</a><a href="../contato.html">TELEGRAM</a>
</nav>
</details>
</header>
<main class="game-seo-page">
<nav class="breadcrumbs" aria-label="Você está aqui"><a href="../">Início</a><span>›</span><a href="../jogos.html">Catálogo</a><span>›</span><span>{escape(title)}</span></nav>
<article class="game-seo-card">
<div class="game-seo-cover"><img src="{cover}" alt="Capa de {escape(title)} para PS4"></div>
<div class="game-seo-info">
<span class="section-label">CATÁLOGO PKGBRASIL • PS4</span>
<h1>{escape(title)}</h1>
<p class="game-seo-intro">{escape(category_copy)} {escape(summary)}</p>
<section class="game-seo-description" aria-labelledby="sobre-ficha">
<h2 id="sobre-ficha">Sobre esta ficha</h2>
<p>{escape(summary)}</p>
<p>{escape(identification)}</p>
</section>
<section class="game-seo-facts" aria-labelledby="dados-edicao">
<h2 id="dados-edicao">Dados desta edição</h2>
<ul>
<li><strong>Jogo:</strong> {escape(title)}</li>
<li><strong>Plataforma:</strong> PlayStation 4</li>
<li><strong>Código:</strong> {escape(code)}</li>
<li><strong>Versão:</strong> {escape(version)}</li>
<li><strong>Categoria:</strong> {escape(category)}</li>
{f'<li><strong>Edição:</strong> {escape(edition)}</li>' if edition else ''}
<li><strong>Dublado:</strong> {dubbed}</li>
<li><strong>DLC:</strong> {dlc}</li>
</ul>
</section>
<section class="game-seo-help" aria-labelledby="como-identificar">
<h2 id="como-identificar">Como identificar a página correta</h2>
<p>Quando houver mais de uma ficha com o mesmo nome, compare o código e a versão antes de escolher a edição. Nesta página, o identificador de referência é <strong>{escape(code)}</strong>.</p>
</section>
<div class="game-seo-actions"><a class="hero-btn primary" href="https://t.me/PKGBrasil" target="_blank" rel="noopener noreferrer">FALAR NO TELEGRAM</a><a class="hero-btn secondary" href="../jogos.html">VOLTAR AO CATÁLOGO</a></div>
</div>
</article>
<section class="game-seo-related">
<div class="section-heading"><div><span class="section-bar"></span><div><span class="section-label">VOCÊ TAMBÉM PODE GOSTAR</span><h2>OUTROS JOGOS</h2></div></div></div>
<div class="related-grid">{related_html}</div>
</section>
</main>
<footer><a class="brand brand-image footer-brand" href="../"><img src="../ativos/WhatsApp%20Image%202026-09-29%20at%2009.11.02.jpeg" alt="PKGBRASIL"></a><div><strong>PKGBRASIL</strong><p>Catálogo gamer com atendimento direto pelo Telegram.</p></div><div class="page-view-counter"><span>VISUALIZAÇÕES DA PÁGINA</span><img src="https://visitor-badge.laobi.icu/badge?page_id=wesleydesousa.pkgbrasil-site-{slug}" alt="Contador de visualizações desta página" loading="lazy"></div><a class="footer-telegram" href="https://t.me/PKGBrasil" target="_blank" rel="noopener noreferrer">@PKGBrasil</a></footer>
<script src="../analytics-config.js" defer></script>
<script src="../analytics.js" defer></script>
<script src="../mobile.js" defer></script>
</body>
</html>
'''

def main():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    games = data.get("jogos", [])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.html"):
        old.unlink()
    slugs = unique_slugs(games)
    for game in games:
        related = []
        for other in games:
            if other["id"] == game["id"] or other.get("categoria") != game.get("categoria"):
                continue
            related.append({
                "titulo": other["titulo"],
                "capa": other["capa"],
                "href": f"{slugs[str(other['id'])]}.html"
            })
            if len(related) == 6:
                break
        (OUT / f"{slugs[str(game['id'])]}.html").write_text(page(game, slugs[str(game["id"])], related), encoding="utf-8")

    # Rebuild the public catalog index with crawlable HTML links to every game page.
    catalog_links = "".join(
        f'<a class="seo-game-link" href="jogos/{slugs[str(g["id"])]}.html" data-search="{escape(g["titulo"])} {escape(g.get("codigo") or "")}" aria-label="Abrir ficha de {escape(g["titulo"])}"><strong>{escape(g["titulo"])}</strong><span>PS4{(" • " + escape(g.get("codigo"))) if g.get("codigo") else ""}</span></a>'
        for g in games
    )
    item_list = json.dumps({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Catálogo PKGBRASIL - Jogos PS4",
        "numberOfItems": len(games),
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": g["titulo"], "url": f"{BASE}/jogos/{slugs[str(g['id'])]}.html"}
            for i, g in enumerate(games)
        ]
    }, ensure_ascii=False, separators=(",", ":"))
    template = ROOT / "jogos.html"
    if template.exists():
        html = template.read_text(encoding="utf-8")
        marker = '<section class="seo-catalog"'
        start = html.find(marker)
        if start >= 0:
            end = html.find("</section>", start) + len("</section>")
            if end > start:
                html = html[:start] + f'<section class="seo-catalog" aria-labelledby="lista-jogos"><div class="section-heading"><div><span class="section-bar"></span><div><span class="section-label">{len(games)} TÍTULOS</span><h2 id="lista-jogos">Jogos PS4</h2></div></div></div><div class="catalog-tools"><label class="catalog-search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0Z"/></svg><input id="catalogSearch" type="search" placeholder="Pesquisar por nome ou código CUSA..." autocomplete="off" aria-label="Pesquisar no catálogo"></label><p class="catalog-count" id="catalogSearchCount"></p></div><div class="seo-game-grid">{catalog_links}</div><div class="catalog-empty" id="catalogSearchEmpty" hidden>Nenhum jogo encontrado. Tente outro nome ou código.</div></section>' + html[end:]
        else:
            insert = '<section class="sales-cta"'
            pos = html.find(insert)
            block = f'<section class="seo-catalog" aria-labelledby="lista-jogos"><div class="section-heading"><div><span class="section-bar"></span><div><span class="section-label">{len(games)} TÍTULOS</span><h2 id="lista-jogos">Jogos PS4</h2></div></div></div><div class="seo-game-grid">{catalog_links}</div></section>'
            if pos >= 0: html = html[:pos] + block + html[pos:]
        if 'catalog.js' not in html:
            html = html.replace('</body>', '<script src="catalog.js" defer></script></body>')
        html = re.sub(r'<script type="application/ld\\+json">.*?</script>', f'<script type="application/ld+json">{item_list}</script>', html, count=1, flags=re.S)
        template.write_text(html, encoding="utf-8")
    static = ["", "jogos.html", "como-usar.html", "contato.html"]
    urls = [f"{BASE}/{p}" for p in static]
    urls += [f"{BASE}/jogos/{slugs[str(g['id'])]}.html" for g in games]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append(f"  <url><loc>{escape(u)}</loc><lastmod>{TODAY}</lastmod></url>")
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
    print(f"Generated {len(games)} SEO game pages and {len(urls)} sitemap URLs.")

if __name__ == "__main__":
    main()
