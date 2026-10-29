# House Pisos e Porcelanatos — proposta de website e painel

Data: 29/10/2026. Estado: planejamento proposto para revisão; não implementado nem publicado.

## 1. Pedido e limites

Criar um website premium, responsivo, com SEO local, React + Vite e animações. Dar à pessoa responsável um login para cadastrar produtos e serviços e escolher o que aparece no website. Esta entrega contém o desenho e o roteiro técnico; a implementação será realizada posteriormente com Sol 6.1, conforme pedido do usuário.

O repositório atual contém uma ferramenta de prospecção em Next.js com alterações em andamento. O website será um pacote independente em `sites/house-pisos/`, com package.json, lockfile, variáveis de ambiente e banco próprios. Não migrar a ferramenta existente nem reutilizar suas credenciais. A instrução antiga de não usar Vite no handoff de prospecção diz respeito àquela ferramenta; o pedido atual exige Vite neste website.

Escopo inicial: website institucional, catálogo, páginas de detalhes, contato por WhatsApp, painel editorial e autenticação. Sem carrinho, pagamento online, estoque integrado, campanhas automáticas ou construtor livre de páginas.

## 2. Dados conhecidos e pendências

Fonte dos dados comerciais: material enviado pelo usuário, não uma auditoria independente do estabelecimento.

| Campo | Valor / tratamento |
|---|---|
| Nome | House Pisos e Porcelanatos |
| Segmento | Loja de pisos e porcelanatos |
| Endereço | R. Santos Dumont, 730 - Lj 50 - Granbery, Juiz de Fora - MG, 36010-386 |
| Telefone exibido | (32) 99970-9900 |
| Telefone técnico | +5532999709900 |
| WhatsApp | https://wa.me/5532999709900 — número normalizado do contato fornecido |
| Mapa | https://www.google.com/maps/search/?api=1&query=House+Pisos+e+Porcelanatos+Rua+Santos+Dumont+730+Juiz+de+Fora |
| Coordenadas no link fornecido | -21.7697375, -43.3425816; confirmar antes de usar no JSON-LD |
| Modalidades informadas | Compra na loja, retirada na porta, entrega |
| Avaliação no material enviado | 4,7 / 171 avaliações; fotografia do dado, não atualização em tempo real |
| Horário | Grade semanal desconhecida; não deduzir de “fecha às 18h / abre sexta às 8h” |

Faltam para publicação: logo autorizado, fotos próprias ou licenciadas, catálogo real, categorias e especificações, serviços efetivamente oferecidos, condições e regiões de entrega, horários completos, domínio, e-mail do administrador e destino de recuperação de senha, dados para a política de privacidade e infraestrutura de produção.

Essas ausências não bloqueiam desenvolver e testar localmente. Conteúdo de demonstração deve ser claramente marcado em ambiente privado e removido antes da publicação. Não inventar marcas vendidas, preços, estoque, história, instalação de pisos, certificações ou anos de mercado. Não tratar imagens ilustrativas como fotos da loja ou produtos disponíveis. Não copiar imagens do Google Maps automaticamente.

Não publicar depoimentos pessoais sem autorização e texto completo. Os fragmentos enviados são insuficientes. A seção será omitida por padrão. Uma eventual nota visual precisa de fonte, data de consulta e revalidação; não incluir aggregateRating da própria empresa no JSON-LD.

## 3. Alternativas e decisão proposta

| Opção | Vantagem | Custo / limite |
|---|---|---|
| React + Vite com SSR e Supabase — recomendada | HTML indexável atualizado a cada acesso; login, banco e arquivos persistentes | Precisa de runtime servidor, banco e configuração de autenticação |
| React + Vite pré-renderizado e Supabase | Hospedagem estática simples | Cada publicação exige rebuild e tratamento de fila, falhas e atraso no catálogo |
| React + Vite com API e autenticação próprias | Controle completo da infraestrutura | Mais código de segurança e manutenção para uma loja |

Recomendação de projeto, não contratação: React + Vite com SSR, servidor Node e Supabase. As páginas públicas leem somente registros publicados. O painel usa Supabase Auth e operações autorizadas por RLS. Não é necessário um rebuild para cadastrar produtos. A hospedagem precisa executar o servidor; subir apenas `dist/client` em hospedagem estática não entrega essa arquitetura.

Priorizar um servidor Node portátil. Se a hospedagem escolhida for Vercel, criar e testar o adaptador serverless na fase de deploy; não presumir que um servidor Express persistente funciona sem adaptação. Não vincular o website ao plugin Sites ou publicar nesta fase de planejamento.

## 4. Direção visual

Conceito: showroom de acabamentos, com composição editorial e foco em textura, espaço e material. Paleta proposta, sujeita ao logo real: marfim #F5F2EC, grafite #252522, areia #DDD3C3 e verde profundo #31483E. Conferir contraste das combinações no código.

Títulos com uma serifada discreta, como uma família licenciada da coleção Source Serif; interface com sans-serif como Inter. Fontes locais WOFF2, no máximo duas famílias e poucos pesos. Nome da loja como marca tipográfica provisória, sem simular um logotipo oficial.

Hero com fotografia ampla de ambiente, identificada como ilustrativa quando não for própria, e texto direto: “Pisos e porcelanatos em Juiz de Fora”. Subtítulo proposto: “Encontre os acabamentos para o seu ambiente e converse com a House no Granbery.” Botões “Explorar produtos” e “Falar no WhatsApp”. Sem prometer estoque, prazo ou melhor preço.

Desktop: navegação limpa, hero em duas áreas, cards com fotografias generosas, seções alternadas em fundo claro. Mobile: uma coluna no hero, catálogo com uma coluna a 320 px e duas somente quando título e botões couberem; filtros em painel acessível. Barra inferior de contato apenas no mobile, com espaço reservado no documento e safe area.

## 5. Páginas e conteúdo

| Rota | Conteúdo / regra |
|---|---|
| `/` | Hero; categorias reais; produtos em destaque; apresentação factual; serviços publicados; galeria autorizada; FAQ; localização; contato |
| `/produtos` | Busca por nome, filtro por categoria, ordenação editorial e paginação; links HTML navegáveis |
| `/produtos/:slug` | Galeria, descrição original, ficha técnica informada, unidade, preço opcional e WhatsApp contextual |
| `/servicos` | Lista de serviços reais publicados; ocultar navegação e não indexar se vazia |
| `/servicos/:slug` | Escopo real do serviço, descrição e contato; não presumir instalação |
| `/sobre` | Informações factuais e fotos autorizadas; história só se fornecida |
| `/contato` | Endereço, ligação, WhatsApp, rota, horários confirmados e formulário de preparação de mensagem |
| `/privacidade` | Conteúdo compatível com coleta e fornecedores reais; revisão antes de publicar |
| `/admin/login` | Login, recuperação e erros acessíveis |
| `/admin/recuperar-senha` | Conclusão segura do fluxo de recuperação |
| `/admin` | Resumo e atalhos; autenticação obrigatória |
| `/admin/itens` | Lista de produtos/serviços, filtros de estado e ordenação |
| `/admin/itens/novo` e `/admin/itens/:id` | Editor, mídia, prévia, publicação e arquivamento |
| `/admin/categorias` | Categorias ordenadas; impedir remoção se houver itens associados |
| `/admin/configuracoes` | Dados comerciais, horários, fotos institucionais, FAQ e textos da home |

Categorias de navegação são geradas a partir do banco, não de uma lista inventada. Páginas de categoria indexáveis ficam fora do MVP; filtros não geram centenas de páginas SEO.

O formulário de contato prepara a mensagem e abre WhatsApp com ação explícita. Texto do botão: “Continuar no WhatsApp”. A interface explica que o envio será concluído no WhatsApp, sem alegar “mensagem enviada”. Oferecer telefone e cópia da mensagem se o aplicativo não abrir. Captura de leads por e-mail ou banco é uma extensão posterior com integração real.

## 6. Painel e publicação

O responsável recebe acesso por convite; não existe cadastro público. Deve conseguir usar o painel no celular.

Fluxo: entrar → novo item → escolher produto ou serviço → preencher dados → anexar fotos → salvar rascunho → visualizar prévia privada → publicar → abrir a página pública. Também pode retirar da publicação, destacar na home e alterar a ordem por botões acessíveis “Subir” e “Descer”. Arrastar não será a única forma de ordenar.

Campos comuns: tipo, título, slug, categoria, resumo, descrição em texto, fotos com texto alternativo, preço opcional, unidade opcional, destaque e posição. Produtos podem ter marca, dimensões, acabamento e indicação de uso; serviços podem ter escopo e região de atendimento. Todos opcionais quando desconhecidos, sem inventar preenchimento.

Regras: preço ausente significa “Consulte condições”; preço zero não significa ausência. Moeda BRL, armazenamento em centavos. Valores negativos são inválidos. Publicar exige título, resumo, descrição e ao menos uma imagem com texto alternativo. Slug fica estável após primeira publicação; alteração futura exige redirecionamento persistido, fora do MVP.

Estados: rascunho, publicado, arquivado. Rascunhos e arquivados não aparecem em consultas públicas, mídia pública ou sitemap. Arquivamento preserva dados; não usar exclusão irreversível como ação principal.

Editar item publicado mantém a versão pública anterior até “Atualizar publicação”. “Salvar rascunho” nunca altera silenciosamente o site. Uma revisão de trabalho e um snapshot público separado suportam esse comportamento. Publicação é transacional: dados, mídia, slug e estado tornam-se públicos juntos. Atualizações simultâneas exigem controle de versão e mensagem de conflito.

## 7. Segurança e persistência

- Supabase Auth para senha, sessão, logout e recuperação. Autorizar administrador por tabela interna de membros, jamais por e-mail hardcoded ou user_metadata editável.
- RLS obrigatória em todas as tabelas expostas. Visitante lê apenas snapshots publicados; membros ativos administram somente a loja atribuída. Testar chamadas diretas ao banco/API, além da interface.
- Não permitir que o usuário promova a si próprio a administrador. Convites e membros são provisionados por operação administrativa confiável.
- JWT de usuário validado pelo serviço de autenticação. Proteção de rota no React é apenas conveniência visual.
- Originais e revisões de imagens em bucket privado. A rota pública de mídia consulta vínculo com publicação antes de transmitir bytes. O visitante não recebe URLs assinadas de rascunhos.
- Upload autorizado, limite de 8 MB por imagem e 12 fotos por item; validar bytes, dimensões máximas e tipo JPEG/PNG/WebP/AVIF, remover metadados e gerar derivados. Não aceitar SVG ou HTML enviado pelo usuário.
- CSP, HTTPS, escape de conteúdo e limite de tentativas de login. Descrição em texto estruturado, sem HTML arbitrário.
- Apenas URL e chave publicável do Supabase podem usar prefixo VITE_. Chave service role, SMTP e segredos de servidor nunca entram no bundle.
- Excluir itens do navegador não é persistência. Sem login fictício, senha padrão publicada ou localStorage como banco de produtos.
- Atualizações de conteúdo não coletam nem transmitem dados dos visitantes. Analytics desativado por padrão; avaliar privacidade e consentimento quando houver integração.

## 8. SEO, renderização e atualização

SSR entrega título, descrição, canonical absoluta, Open Graph, H1, conteúdo e JSON-LD no HTML inicial. React hidrata exatamente os mesmos dados. Sem leitura de window no servidor e sem buscar conteúdo diferente durante a primeira hidratação.

Primeira versão sem cache de HTML, dados e mídia pública: `Cache-Control: no-store`. Isso simplifica remoção imediata da publicação; otimizar com cache e invalidação apenas após medição. A resposta seguinte a uma publicação confirmada deve refletir o novo snapshot. Erro do banco retorna 503, nunca um catálogo vazio com 200 ou um falso 404.

Snapshot ausente ou não publicado retorna HTTP 404 real. Busca e filtros preservam navegação e canonical da listagem; combinações filtradas usam noindex,follow. Sitemap lista somente URLs públicas indexáveis, com lastmod real; sem admin, prévias, filtros ou rascunhos. /admin e prévias usam noindex e não são segurança baseada em robots.txt.

JSON-LD inicial: `Store`, com nome, endereço e telefone reais. Domínio, logo, horários, coordenadas e redes só entram quando confirmados. BreadcrumbList em detalhes. Não gerar Offer sem preço e condições confirmados, nem avaliações estruturadas da própria empresa. Conteúdo para “pisos e porcelanatos em Juiz de Fora” e referência natural ao Granbery, sem páginas artificiais de cidades.

## 9. Animações e acessibilidade

Motion para entradas de 300–500 ms, deslocamentos de até 16 px e stagger de 50–70 ms, no máximo seis cards por sequência. Botões com feedback de 120–180 ms; zoom de imagem no hover até 1,025. Sem GSAP no MVP: não há requisito que justifique uma segunda biblioteca de animação.

HTML inicial sempre visível: não renderizar conteúdo SEO com opacity:0 aguardando JavaScript. Ativar reveals somente após hidratação e apenas em elementos ainda fora da tela. Com movimento reduzido, eliminar deslocamento, zoom e sequências. Menu com foco controlado, Escape, aria-expanded e devolução de foco. FAQ semântico com details/summary, funcional sem JS.

Toque mínimo de 44 px, foco visível, contraste WCAG AA, mensagens de erro associadas aos campos, tipografia clamp(), imagens com dimensões, srcset/sizes e hero sem lazy loading. Mapa externo só após interação.

## 10. Critérios de aceite

1. Produto e serviço criados pelo administrador aparecem após publicação, incluindo acesso direto e HTML sem JS.
2. Salvar alterações em rascunho preserva a publicação anterior. Arquivar remove página, listagem, sitemap e acesso público à mídia.
3. Anônimo, usuário não autorizado e membro de outra loja não leem rascunhos nem alteram dados, inclusive via API direta.
4. Upload, sessão expirada, erro de rede e conflito de edição têm retorno claro, sem sucesso falso ou perda silenciosa.
5. Responsividade verificada a 320, 375, 390, 430, 768, 1024 e 1440 px; teclado, paisagem e movimento reduzido também.
6. Build de produção, rotas diretas, 404/503, metadados, sitemap, robots e imagens verificados.
7. Medir Lighthouse mobile/desktop; metas Performance ≥90, Accessibility ≥95 e SEO ≥95. LCP ≤2,5 s, CLS ≤0,1 e INP ≤200 ms são metas, não resultados já obtidos; INP real depende de dados de uso.
8. README, migrações, configuração e registro de evidências entregues. Integrações indisponíveis e pendências de publicação devem ficar explícitas.

## Referências técnicas consultadas

- Vite SSR: https://vite.dev/guide/ssr
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase autenticação por senha: https://supabase.com/docs/guides/auth/passwords
- Motion e acessibilidade: https://motion.dev/docs/react-accessibility

Essas referências fundamentam as capacidades das ferramentas; as decisões de arquitetura e UX acima são propostas deste projeto.
