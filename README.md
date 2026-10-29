# House Pisos e Porcelanatos

Website de apresentação em React + Vite + TypeScript, SSR Node e Motion.

## Rodar

Dentro desta pasta: `npm install`, `npm run dev`. Porta 4173.
Build: `npm run build`; produção local: `npm start`.
Verificações: `npm run typecheck` e `npm test`.

## Estado

Apresentação publicada na Vercel. Sem banco conectado, por orientação do usuário. O catálogo público permanece vazio até cadastrar produtos com integração persistente. O painel fica em `/admin`, sem link na navegação. Não há senha demonstrativa.

Código e migrações Supabase estão preparados, mas não aplicados nem validados em serviço externo. Não ativar sem nova orientação. Categorias, configurações editoriais, upload validado por servidor e múltiplas imagens continuam pendentes do plano original. O login informa indisponibilidade enquanto não houver configuração.

## Fontes

Logo e foto pública verificados em `docs/assets-sources.md`. A foto é registro histórico, não oferta de preço atual; CSS enquadra o mostruário. Nota 4,7/171 do material fornecido pelo usuário em outubro de 2026, com link para consulta no Google. Não há sincronização de avaliações.

## Deploy

`vercel deploy --prod` com conta autorizada. Configuração legacy builders em vercel.json para direcionar as páginas ao SSR, evitando servir index.html sem renderização. A apresentação fica noindex até revisão comercial. Definir SITE_URL para domínio definitivo. Variáveis opcionais descritas em .env.example, nunca copiar credenciais da aplicação de prospecção.

## Verificação nesta entrega

TypeScript e quatro testes de contrato passaram; build de cliente/servidor passou. Sem Lighthouse ou integração de banco executados. O sistema de prospecção da raiz foi preservado.

Produção verificada em 29/10/2026: https://house-pisos-jf.vercel.app/ — home e catálogo HTTP 200 com H1 no HTML; /admin HTTP 200; caminho inexistente HTTP 404. Logo fornecido pelo usuário e paleta preto/branco/vermelho. Link administrativo ausente do HTML público. Sem conexão de banco.

## Ajustes visuais

Referência visual: projeto Máquina Team, somente composição e navegação. Marca original enviada pelo usuário preservada no cabeçalho claro; mix-blend-mode multiply integra o fundo branco ao cabeçalho sem alterar a imagem. Hero usa foto da fachada fornecida pelo usuário. Preto como base, vermelho da marca nos destaques e fotografia colorida. Avaliações de Yara Barros e Ariadnna Vaz são trechos exatos do material Google Maps enviado pelo usuário, não consultas atualizadas nem depoimentos gerados.
