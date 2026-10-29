# House Pisos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Este plano não autoriza iniciar a implementação nesta entrega; o usuário pretende continuar com Sol 6.1.

**Goal:** Entregar website local da House e painel real de produtos e serviços com publicação controlada.

**Architecture:** Pacote isolado em `sites/house-pisos`, React + Vite com SSR em Node. Supabase fornece Auth, Postgres com RLS e Storage privado. O website renderiza snapshots publicados e o painel edita revisões privadas.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, Motion, Lucide React, Express, Supabase JS, Zod, Sharp, Vitest e Playwright. Fixar versões compatíveis no lockfile na implementação; não copiar versões antigas do pacote Next.js da raiz.

---

## Como executar

Ler primeiro `docs/superpowers/specs/2026-10-29-house-pisos-design.md` e o prompt mestre preservado em `docs/house-pisos/prompt-mestre-original.txt`. A especificação define comportamento; os trechos abaixo definem contratos e pontos críticos, não são uma aplicação completa já pronta para compilar.

Todos os caminhos de código abaixo são relativos a `sites/house-pisos/`. Não alterar src/, package.json, lockfile, .env ou banco da raiz. Usar terminal com diretório de trabalho explícito no pacote novo. Não herdar segredos da ferramenta de prospecção.

## Mapa de arquivos

```text
sites/house-pisos/
  package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html
  .env.example, .gitignore, README.md
  public/                         favicon e arquivos institucionais autorizados
  src/
    entry-client.tsx              hydrateRoot com payload do SSR
    entry-server.tsx              renderização do App e metadados por request
    App.tsx                      composição por rota resolvida
    config/business.ts           valores iniciais factuais da House
    domain/catalog.ts            tipos e validação
    domain/routes.ts             resolução única de rota, slug e canonical
    domain/whatsapp.ts           normalização e mensagem contextual
    lib/supabase-browser.ts      cliente do painel
    lib/supabase-public.ts       cliente servidor anônimo por request
    components/                  Header, MobileMenu, Footer, SectionHeading,
                                 WhatsAppButton, ScrollReveal, ImageGallery,
                                 FAQ, ContactForm, SeoHead, ServiceCard,
                                 ProductCard, Testimonial (uso condicionado)
    features/public/             HomePage, CatalogPage, ItemPage,
                                 AboutPage, ContactPage, PrivacyPage, NotFoundPage
    features/admin/              LoginPage, PasswordRecoveryPage, AdminShell,
                                 ItemsPage, ItemEditor, MediaEditor, PreviewPage,
                                 CategoriesPage, SettingsPage
    styles/theme.css             tokens, tipografia, responsividade e foco
  server/
    index.ts                     inicialização Node e middleware Vite em dev
    app.ts                       rotas HTTP e fallback SSR
    load-page.ts                 dados públicos, paginação e status HTTP
    render-document.ts           HTML, payload escapado, SEO e cabeçalhos
    media.ts                     leitura pública autorizada e upload privado
    sitemap.ts                   URLs publicadas e conteúdo XML
    security.ts                  limites, headers e autenticação de upload
  supabase/
    config.toml                  desenvolvimento local isolado
    migrations/0001_catalog.sql   tabelas, índices, RLS, funções e Storage
    seed.sql                     dados locais explicitamente fictícios
  scripts/bootstrap-admin.mts     provisionamento fora do navegador
  tests/
    unit/catalog.test.ts, routes.test.ts, whatsapp.test.ts, seo.test.ts
    integration/permissions.test.ts, publication.test.ts, media.test.ts
    e2e/public.spec.ts, admin.spec.ts, responsive.spec.ts
  docs/validation.md              evidências e limitações reais
```

Separar componentes maiores em arquivos próprios quando a implementação exigir. O App não deve concentrar queries, autenticação e edição.

## Contratos de dados

```ts
export type ItemKind = 'product' | 'service';
export type PublicationState = 'draft' | 'published' | 'archived';

export interface ItemContent {
  title: string;
  summary: string;
  description: string;
  categoryId: string | null;
  priceCents: number | null;
  priceUnit: string | null;
  attributes: Record<string, string>;
}

export interface CatalogItem {
  id: string;
  shopId: string;
  kind: ItemKind;
  slug: string;
  state: PublicationState;
  featured: boolean;
  sortOrder: number;
  version: number;
  publishedAt: string | null;
}

export interface PublishedItem extends CatalogItem {
  content: ItemContent;
  media: Array<{
    id: string;
    alt: string;
    width: number;
    height: number;
    publicPath: string;
  }>;
}
```

Banco: `shops` (identidade pública), `shop_members` (shop_id, user_id, papel admin, ativo), `categories`, `catalog_items` (identidade estável), `item_drafts` (content JSONB + version), `item_publications` (snapshot, featured, sort_order, published_at), `media_assets`, `draft_media`, `publication_media`, `site_content_drafts`, `site_content_publications`. IDs UUID; timestamps timestamptz; preços inteiros não negativos. Chaves e FKs devem impedir referência cruzada entre lojas; unicidade de slug por loja e tipo.

`shop_members` não tem escrita pelo cliente. RLS usa função de associação ativa baseada em auth.uid(), com search_path fixo e sem privilégios concedidos ao público. Políticas de leitura e escrita explícitas; negar por padrão. Não expor colunas administrativas por view que contorne RLS.

Funções transacionais:

```ts
type PublishArgs = { itemId: string; expectedVersion: number };
type PublishResult = {
  itemId: string;
  slug: string;
  publishedVersion: number;
  publishedAt: string;
};
type CatalogErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION'
  | 'CONFLICT' | 'NOT_FOUND' | 'UNAVAILABLE';
```

RPC `publish_item(p_item_id, p_expected_version)`: validar associação, bloquear item, comparar versão, validar conteúdo e mídia pronta, copiar revisão e vínculos para publicação e alterar estado em uma transação. Nunca aceitar shop_id como autorização. `unpublish_item` remove snapshot/vínculos públicos e marca rascunho; `archive_item` faz o mesmo e marca arquivado. `save_draft` usa versão esperada e incrementa versão. Edição de destaque/ordem também deve respeitar a publicação explícita. Auditoria mínima: usuário e horário da alteração.

## Tarefa 1 — pacote isolado e renderização mínima

Arquivos: package.json, lockfile, tsconfig.json, vite.config.ts, index.html, entradas React e server/index.ts, app.ts, render-document.ts.

- [ ] Confirmar a ausência de `sites/house-pisos` ou inspecionar seu conteúdo antes de criar; não sobrescrever trabalho existente.
- [ ] Criar pacote Vite/React/TypeScript, Tailwind e scripts `dev`, `build:client`, `build:server`, `build`, `start`, `typecheck`, `test`, `test:integration`, `test:e2e`.
- [ ] Configurar builds separados: `vite build --outDir dist/client` e `vite build --ssr server/index.ts --outDir dist/server`; conferir que servidor inclui a entrada React e assets são referenciados pelo HTML transformado do build.
- [ ] Em dev, usar middleware Vite; em produção, servir assets de dist/client e template transformado. Não usar `vite preview` como servidor SSR de produção.
- [ ] Criar rota home com dados factuais, hidratação consistente e 404 com status real.
- [ ] Escapar payload JSON antes de embutir no HTML. Exemplo de utilitário:

```ts
export function serializeForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

- [ ] Testar `</script>` em título/descrição para garantir ausência de injeção; testar que HTML cru contém H1 e não apenas div vazia.
- [ ] Rodar `npm run typecheck` e `npm run build`; esperar saída zero. Rodar servidor de produção e acessar home e caminho inexistente; esperar 200 e 404, respectivamente.

## Tarefa 2 — banco, permissões e estados

Arquivos: supabase/migrations/0001_catalog.sql, config.toml, seed.sql, src/domain/catalog.ts, tests/integration/permissions.test.ts e publication.test.ts.

- [ ] Criar schema conforme contratos, constraints de valor/tamanho, índices de busca e ordenação, e as FKs com escopo de loja.
- [ ] Antes das políticas, escrever testes com visitante, administrador da House, usuário sem associação e administrador de outra loja; registrar falha antes da correção.
- [ ] Implementar RLS para catálogo, revisões, publicações, categorias, conteúdo institucional e vínculos de mídia. Anônimo nunca lê item_drafts.
- [ ] Implementar RPCs de salvar/publicar/retirar/arquivar com bloqueio e versão esperada, e validação também no banco.
- [ ] Criar fixture em que salvar uma revisão de título não altera o snapshot público; só publish_item pode alterá-lo.
- [ ] Rodar `npm run test:integration` contra Supabase local isolado. Esperar todas as identidades negadas/autorizadas conforme a matriz; não rodar seed/reset no banco de produção.

Exemplo de caso executável a materializar com clientes do ambiente de teste:

```ts
it('anon não lê revisões privadas', async () => {
  const { data, error } = await anon.from('item_drafts').select('*');
  expect(error).toBeNull();
  expect(data).toEqual([]);
});
```

O cliente anon da fixture deve ter grants de SELECT e RLS filtrando linhas. Para escrita negada, verificar erro ou ausência de alteração real: PostgREST pode retornar zero linhas em vez de erro de autorização.

## Tarefa 3 — login real e sessão

Arquivos: src/lib/supabase-browser.ts, features/admin/LoginPage.tsx, PasswordRecoveryPage.tsx, AdminShell.tsx, scripts/bootstrap-admin.mts e tests/e2e/admin.spec.ts.

- [ ] Criar cliente Supabase com URL/chave publicável e validar configuração ausente com mensagem de indisponibilidade, sem modo de login falso.
- [ ] Usar `signInWithPassword`, `signOut` e fluxo de recuperação com redirects em allowlist. Configurar remetente real de e-mail para produção.
- [ ] Desativar signup público no serviço. Provisionar primeiro membro por script administrativo, sem credenciais fixas e sem imprimir senha/token.
- [ ] Ao entrar, consultar associação ativa; usuário autenticado sem associação recebe acesso negado.
- [ ] Proteger painel contra flash de conteúdo privado; limpar consultas privadas e prévia ao sair. Toda operação continua sujeita a RLS.
- [ ] Testar senha inválida, sessão expirada, logout, reload, recuperação e usuário removido da loja. Quando SMTP real não estiver configurado, registrar que entrega externa de e-mail não foi validada.

## Tarefa 4 — edição e mídia

Arquivos: features/admin/ItemsPage.tsx, ItemEditor.tsx, MediaEditor.tsx, PreviewPage.tsx, CategoriesPage.tsx, SettingsPage.tsx, server/media.ts e security.ts.

- [ ] Editor com validação Zod, campos descritos na especificação e estados carregando/salvando/erro/conflito. Valores monetários brasileiros são convertidos em centavos sem float acumulado.
- [ ] Salvar revisão privada; publicação usa RPC e apresenta sucesso só após confirmação. Em timeout, consultar versão antes de repetir operação.
- [ ] Upload multipart recebe JWT do administrador; servidor valida identidade e associação, inspeciona bytes e usa Sharp para derivados. Limitar corpo antes de alocar tudo em memória.
- [ ] Guardar objetos com IDs gerados, nunca usar nome fornecido como caminho. Não aceitar URL externa para processamento de imagem. Originais e derivados permanecem em Storage privado.
- [ ] Vincular derivado pronto à revisão. RLS de Storage permite ao administrador da loja gerenciar seus arquivos e ao anônimo ler apenas derivados ligados a snapshot publicado.
- [ ] Implementar GET `/media/:assetId/:variant` consultando vínculo público e fazendo download com cliente anônimo sujeito a RLS; transmitir Content-Type seguro, nosniff e no-store. Não redirecionar para URL assinada. ID inexistente/privado retorna 404, erro do backend retorna 503.
- [ ] Prévia privada usa download autenticado e object URL revogada no unmount; nenhum token na query string. Sem serviço de cache para resposta privada.
- [ ] Não apagar objeto referenciado por publicação ou revisão. Limpeza de órfãos pode ser comando manual com dry-run; não precisa de rotina automática no MVP.
- [ ] Testar arquivo falso, arquivo grande, mídia de outra loja, acesso após retirar publicação e falha de processamento. Publicação sem mídia pronta deve ser recusada.
- [ ] Testar criar produto e serviço; salvar revisão; publicar; destacar; reordenar; retirar; arquivar; editar configurações e categorias. Controles de ordem funcionam por teclado.

## Tarefa 5 — website público e conversão

Arquivos: src/config/business.ts, domain/routes.ts e whatsapp.ts, features/public/*, components/*, styles/theme.css e server/load-page.ts.

- [ ] Implementar tokens visuais e layout mobile primeiro, com dados da House centralizados e sobrescritos apenas por configuração publicada.
- [ ] Resolver todas as rotas da especificação e carregar conteúdo público no servidor. Listagens com 12 itens por página, pesquisa limitada a 100 caracteres e parâmetros validados.
- [ ] Adicionar filtros e paginação por links/GET para funcionar sem JS. Usar busca parametrizada; não concatenar entrada do visitante em SQL.
- [ ] Montar home editorial com seções condicionais: ocultar serviços, galeria e depoimentos sem conteúdo elegível. Não preencher lacunas com afirmações inventadas.
- [ ] Criar detalhes com imagens responsivas, ficha técnica e CTA contextual. Não transformar preço ausente em R$ 0.
- [ ] Implementar contato e formulário que abre o WhatsApp, com mensagem de que o envio ainda será concluído lá.

```ts
export function buildWhatsAppUrl(itemTitle?: string): string {
  const message = itemTitle
    ? `Olá, House! Gostaria de informações sobre ${itemTitle}.`
    : 'Olá, House! Gostaria de conversar sobre pisos e porcelanatos.';
  return `https://wa.me/5532999709900?text=${encodeURIComponent(message)}`;
}
```

- [ ] Testar acentos, caracteres especiais e links tel/rota; abrir conversa não envia mensagem automaticamente.
- [ ] Usar erro 503 e opção de contato quando dados estiverem indisponíveis, sem apresentar produto inexistente ou confirmar operação não concluída.

## Tarefa 6 — SEO e navegação sem JavaScript

Arquivos: components/SeoHead.tsx, server/render-document.ts, sitemap.ts, domain/routes.ts e tests/unit/seo.test.ts.

- [ ] Definir SITE_URL validada em produção, sem depender do header Host para canonical. Ambiente de demonstração usa noindex global e acesso privado quando hospedado.
- [ ] Gerar title/description/canonical/OG/Twitter por página a partir de dados publicados; tags presentes no HTML inicial.
- [ ] Serializar JSON-LD com escape; Store e breadcrumbs apenas com dados confirmados. Não adicionar schema de reviews nem horários inferidos.
- [ ] Gerar sitemap por consulta de publicações, escapar XML e excluir filtros, admin e serviços vazios. Criar robots.txt usando domínio real.
- [ ] Definir noindex em buscas/filtros e páginas privadas; servidor entrega 404 real para item retirado ou caminho inexistente.
- [ ] Testar com JavaScript desativado e inspecionar HTML HTTP: nome da empresa, produto publicado, H1, canonical e descrição devem existir.
- [ ] Validar JSON-LD, sitemap e canonical com parser/testes; executar Rich Results Test quando houver URL acessível e registrar o limite caso ainda seja só local.

## Tarefa 7 — animações, acessibilidade e qualidade visual

Arquivos: components/ScrollReveal.tsx, MobileMenu.tsx, FAQ.tsx, ImageGallery.tsx e styles/theme.css.

- [ ] MotionConfig com reducedMotion="user"; componentes consultam preferência para desativar sequências e zoom. Não adicionar GSAP.
- [ ] Conteúdo SSR visível; reveals habilitados após hidratação apenas fora da viewport. Hero usa microtransição que não atrasa o conteúdo principal.
- [ ] Implementar foco do menu, Escape, retorno de foco, labels, aria-live para erros e FAQ semântico.
- [ ] Verificar cada viewport exigida, orientação paisagem, zoom de 200% e navegação por teclado; documentar capturas e correções.
- [ ] Otimizar imagem LCP com dimensões e prioridade; outras imagens com lazy loading; fontes locais e painel carregado separadamente das páginas públicas.

## Tarefa 8 — integração final e entrega

Arquivos: tests/e2e/*, README.md, .env.example e docs/validation.md.

- [ ] Rodar, dentro de sites/house-pisos: `npm run typecheck`, `npm test`, `npm run test:integration`, `npm run build` e `npm run test:e2e`. Esperado: saída zero; registrar falhas e limites sem ocultá-los.
- [ ] Contra build de produção, testar criação → rascunho invisível → publicar → HTML indexável → revisão privada → atualizar → arquivar → 404 e mídia inacessível.
- [ ] Verificar que scripts de admin e segredos não aparecem no bundle público. Verificar console, hidratação e links quebrados.
- [ ] Medir Lighthouse em home, catálogo e detalhe mobile/desktop; registrar valores realmente obtidos. Não confundir TBT de laboratório com INP real de campo.
- [ ] Escrever README com instalação, desenvolvimento, banco local, migração, bootstrap de admin, build, recuperação de senha, backup/restore e deploy SSR.
- [ ] Incluir .env.example só com nomes e exemplos não secretos: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SITE_URL, PORT; credencial administrativa somente no processo de bootstrap. Nunca copiar .env da raiz.
- [ ] Revisar material real e pendências da especificação antes da publicação. Não contratar infraestrutura nem publicar apenas por executar este plano.
- [ ] Se houver pedido posterior de deploy: escolher adaptador do host, aplicar migrações, configurar Auth/SMTP/domínio, validar TLS, testar rotas diretas e manter versão anterior para rollback.

## Evidência mínima a preencher na execução

Registrar data, versão do código, ambiente, comando, resultado e limitações. O planejamento atual não executou testes de website, não criou login, não conectou Supabase e não mediu Lighthouse. Não transferir métricas do sistema de prospecção para este projeto.
