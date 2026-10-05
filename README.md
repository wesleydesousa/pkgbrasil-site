# PKGBRASIL

Catálogo gamer responsivo para PlayStation 4, com busca, filtros, fichas individuais e atendimento pelo Telegram.

## Implementado

- Home responsiva com catálogo, destaques e CTA para Telegram
- Catálogo com 337 fichas individuais
- Busca por nome ou código CUSA
- Filtro por categoria e dublagem na home
- Busca e filtro por categoria no catálogo público
- Páginas SEO individuais com canonical, BreadcrumbList e VideoGame JSON-LD
- Informações de edição, categoria, versão, código, dublado e DLC quando disponíveis
- Navegação mobile e barra de ações fixa
- Contador visual de visualizações por página
- Estrutura de eventos para Google Analytics 4
- Validação automática do catálogo antes do deploy
- GitHub Pages com deploy por GitHub Actions

## Segurança

O antigo painel administrativo com autenticação no navegador foi removido da publicação. GitHub Pages é hospedagem estática e não oferece autenticação de servidor para esse tipo de painel. Não mantenha senhas, hashes de senha ou tokens administrativos no JavaScript público.

Para um painel administrativo completo e seguro, use uma autenticação de servidor ou um serviço de controle de acesso antes de voltar a publicar uma área administrativa.

## Analytics

O arquivo `analytics-config.js` possui a configuração do ID de medição do Google Analytics 4. O formato do ID é `G-XXXXXXXXXX`. Enquanto o campo estiver vazio, nenhum código do GA4 é carregado.

Os eventos preparados incluem visualização e seleção de jogos, buscas, filtros, cliques no Telegram, profundidade de rolagem e uso de "mostrar mais".

## Catálogo

Os registros ficam em `data/catalogo.json`. As capas seguem o padrão `fotos/<id>.jpg`.

O gerador `scripts/generate-seo-pages.py` recria as fichas individuais, a página de catálogo e o `sitemap.xml`.

## Conteúdo

O site não replica links externos de distribuição. Informações de catálogo são exibidas apenas quando existem no cadastro ou quando foram explicitamente informadas como dados da ficha.
