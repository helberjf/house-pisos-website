# Banco e autenticação da House

1. Crie um projeto Supabase dedicado ou inicie o Supabase local. A aplicação de prospecção da raiz usa outro banco.
2. Aplique `migrations/0001_catalog.sql` pelo editor SQL ou CLI.
3. Desative o cadastro público em Auth. Configure a URL do website e inclua `/admin/recuperar-senha` na lista permitida de redirecionamentos.
4. Convide o proprietário pela administração do Auth. Com o UUID da conta criada, execute como administrador do banco:

```sql
insert into public.shop_members(shop_id,user_id)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','UUID-REAL-DA-CONTA');
```

5. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente deste pacote. Nunca use a chave service role no navegador.
6. Configure SMTP para entrega real dos convites e recuperação de senha. Teste login, logout e recuperação antes de entregar o acesso.

O banco cria uma loja, sem produtos fictícios. Imagens ficam no bucket privado catalog. Leitura anônima de arquivos exige vínculo com snapshot publicado. O servidor público precisa transmitir os arquivos usando um cliente Supabase anônimo; não entregar URLs assinadas duradouras.

O frontend processa fotos em WebP e limita dimensões, enquanto Storage limita MIME e tamanho. Em produção, incluir processamento/validação de bytes em servidor confiável para uploads: a conversão no navegador é contornável. Não há política de substituição/exclusão de objetos; itens são arquivados, preservando mídia.

Migração e permissões ainda precisam ser exercitadas contra um Supabase real ou local: esta implementação não afirma validação de integração externa. A matriz mínima é visitante, administrador desta loja e usuário sem associação. Testar rascunho invisível, escrita direta negada, publicação, edição de revisão sem alterar snapshot e retirada de imagem após despublicar.
