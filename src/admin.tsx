import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from './supabase';

type Content = { title: string; summary: string; description: string; imagePath: string; imageAlt: string; priceCents: number | null; priceUnit: string };
type Item = { id: string; kind: string; slug: string; state: string; version: number; item_drafts: { content: Content; featured: boolean; sort_order: number } | null };
const empty: Content = { title: '', summary: '', description: '', imagePath: '', imageAlt: '', priceCents: null, priceUnit: '' };
function slugify(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function Admin() {
  const db = getSupabase();
  const [ready, setReady] = useState(false), [signed, setSigned] = useState(false), [shop, setShop] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState<Item | null>(null), [editing, setEditing] = useState(false);
  const [content, setContent] = useState<Content>({ ...empty }), [kind, setKind] = useState('product'), [slug, setSlug] = useState(''), [featured, setFeatured] = useState(false), [order, setOrder] = useState(0), [preview, setPreview] = useState('');
  const [recovery, setRecovery] = useState(false);
  async function load(shopId: string) {
    if (!db) return;
    const { data, error } = await db.from('catalog_items').select('*,item_drafts(content,featured,sort_order)').eq('shop_id', shopId).order('updated_at', { ascending: false });
    if (error) throw error;
    setItems((data || []) as unknown as Item[]);
  }
  useEffect(() => {
    if (!db) { setReady(true); return; }
    let live = true;
    async function sync() {
      const { data: { session } } = await db!.auth.getSession();
      if (!live) return;
      setSigned(Boolean(session)); setShop(''); setItems([]); setEditing(false);
      if (session) {
        const { data, error } = await db!.from('shop_members').select('shop_id').eq('user_id', session.user.id).eq('active', true).limit(1).maybeSingle();
        if (!live) return;
        if (error || !data) setMessage('Sua conta não tem acesso a esta loja. Fale com o responsável.');
        else { setShop(data.shop_id); try { await load(data.shop_id); } catch (e) { setMessage((e as Error).message); } }
      }
      setReady(true);
    }
    void sync();
    const { data: { subscription } } = db.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setRecovery(true); if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') setTimeout(() => void sync(), 0); });
    return () => { live = false; subscription.unsubscribe(); };
  }, [db]);
  useEffect(() => {
    let objectUrl = '';
    setPreview('');
    if (db && content.imagePath) void db.storage.from('catalog').download(content.imagePath).then(({ data }) => { if (data) { objectUrl = URL.createObjectURL(data); setPreview(objectUrl); } });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [db, content.imagePath]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await fn(); } catch (e) { setMessage((e as Error).message || 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); }
  }
  async function login(e: FormEvent) { e.preventDefault(); await action(async () => { const { error } = await db!.auth.signInWithPassword({ email, password }); if (error) throw error; setPassword(''); }); }
  function edit(item: Item | null) {
    setSelected(item); setContent(item?.item_drafts?.content || { ...empty }); setKind(item?.kind || 'product'); setSlug(item?.slug || ''); setFeatured(item?.item_drafts?.featured || false); setOrder(item?.item_drafts?.sort_order || 0); setEditing(true); setMessage('');
  }
  async function save(): Promise<Item> {
    const { data, error } = await db!.rpc('save_item', { p_item_id: selected?.id || null, p_shop_id: shop, p_kind: kind, p_slug: slug || slugify(content.title), p_content: content, p_featured: featured, p_sort_order: order, p_expected_version: selected?.version || 0 });
    if (error) throw error;
    const row = data as Item; setSelected(row); setSlug(row.slug); await load(shop); return row;
  }
  async function publish() { await action(async () => { const row = await save(); const { error } = await db!.rpc('publish_item', { p_item_id: row.id, p_expected_version: row.version }); if (error) throw error; await load(shop); setEditing(false); setMessage('Publicação atualizada. O conteúdo já pode ser consultado no site.'); }); }
  async function remove(item: Item, archive: boolean) { await action(async () => { const { error } = await db!.rpc('unpublish_item', { p_item_id: item.id, p_expected_version: item.version, p_archive: archive }); if (error) throw error; await load(shop); setMessage(archive ? 'Item arquivado.' : 'Item retirado do site e preservado como rascunho.'); }); }
  async function upload(file?: File) {
    if (!file) return;
    await action(async () => {
      if (file.size > 8 * 1024 * 1024) throw new Error('A foto deve ter no máximo 8 MB.');
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) throw new Error('Envie uma foto JPEG, PNG, WebP ou AVIF.');
      const bitmap = await createImageBitmap(file); if (bitmap.width > 12000 || bitmap.height > 12000) { bitmap.close(); throw new Error('Imagem muito grande. Use até 12.000 pixels por lado.'); }
      const factor = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * factor); canvas.height = Math.round(bitmap.height * factor); canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(new Error('Não foi possível processar a imagem.')), 'image/webp', .85));
      const path = `${shop}/${crypto.randomUUID()}.webp`; const { error } = await db!.storage.from('catalog').upload(path, blob, { contentType: 'image/webp', upsert: false }); if (error) throw error;
      setContent(c => ({ ...c, imagePath: path })); setMessage('Foto anexada ao editor. Salve o rascunho para guardar a alteração.');
    });
  }
  const field = (key: keyof Content, value: string) => setContent(c => ({ ...c, [key]: value }));
  return <main className="admin-page"><div className="admin-container"><a href="/">← Voltar ao site</a><p className="eyebrow">HOUSE · ÁREA DO RESPONSÁVEL</p><h1>Seu catálogo, do seu jeito.</h1><p>Gerencie os produtos e serviços que aparecem no site.</p>
    {!db ? <section className="admin-card"><h2>Painel aguardando configuração</h2><p>A autenticação precisa ser conectada ao Supabase para liberar o acesso. Os produtos serão salvos em banco de dados e publicados por você.</p><p>O responsável técnico deve configurar as variáveis de ambiente, aplicar a migração e convidar o administrador.</p></section> : !ready ? <p role="status">Carregando acesso…</p> : !signed ? <form className="admin-card admin-form" onSubmit={login}><h2>Entrar no painel</h2><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar'}</button><button type="button" disabled={busy || !email} onClick={() => void action(async () => { const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/recuperar-senha` }); if (error) throw error; setMessage('Se a conta estiver cadastrada, você receberá as instruções no e-mail.'); })}>Esqueci minha senha</button></form> : recovery ? <form className="admin-card admin-form" onSubmit={e => { e.preventDefault(); void action(async () => { const { error } = await db.auth.updateUser({ password }); if (error) throw error; setRecovery(false); setPassword(''); setMessage('Senha atualizada.'); }); }}><h2>Definir nova senha</h2><label>Nova senha<input type="password" minLength={10} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></label><button disabled={busy}>Salvar nova senha</button></form> : <><div className="admin-toolbar"><button disabled={busy} onClick={() => void db.auth.signOut()}>Sair</button>{shop && <button onClick={() => edit(null)}>+ Novo produto ou serviço</button>}</div>{shop && (editing ? <form className="admin-card admin-form" onSubmit={e => { e.preventDefault(); void action(async () => { await save(); setMessage('Rascunho salvo. A versão publicada permanece como estava.'); }); }}><h2>{selected ? 'Editar item' : 'Novo item'}</h2><label>Tipo<select value={kind} onChange={e => setKind(e.target.value)}><option value="product">Produto</option><option value="service">Serviço</option></select></label><label>Nome<input required maxLength={160} value={content.title} onChange={e => field('title', e.target.value)} /></label><label>Endereço da página<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug || slugify(content.title)} onChange={e => setSlug(e.target.value)} /></label><label>Resumo<textarea maxLength={500} required value={content.summary} onChange={e => field('summary', e.target.value)} /></label><label>Descrição<textarea rows={6} maxLength={20000} required value={content.description} onChange={e => field('description', e.target.value)} /></label><label>Preço em reais (opcional)<input type="number" min="0" step="0.01" value={content.priceCents === null ? '' : content.priceCents / 100} onChange={e => setContent(c => ({ ...c, priceCents: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) }))} /></label><label>Unidade (ex.: m²)<input value={content.priceUnit} onChange={e => field('priceUnit', e.target.value)} /></label><label>Foto<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label>{preview && <img src={preview} alt={content.imageAlt || 'Prévia da foto selecionada'} style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }} />}<label>Descrição da foto<input value={content.imageAlt} onChange={e => field('imageAlt', e.target.value)} /></label><label><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Destacar na página inicial</label><label>Ordem de exibição (menores primeiro)<input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} /></label><div className="admin-toolbar"><button type="submit" disabled={busy}>Salvar rascunho</button><button type="button" disabled={busy} onClick={() => void publish()}>Publicar / atualizar site</button><button type="button" onClick={() => setEditing(false)}>Voltar à lista</button></div></form> : <section className="admin-card"><h2>Produtos e serviços</h2>{!items.length && <p>Seu catálogo está vazio. Adicione o primeiro item para começar.</p>}{items.map(item => <article className="admin-item" key={item.id}><div><strong>{item.item_drafts?.content.title || item.slug}</strong><p>{item.kind === 'product' ? 'Produto' : 'Serviço'} · {({ draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' } as Record<string, string>)[item.state]}</p></div><div className="admin-toolbar"><button onClick={() => edit(item)}>Editar</button>{item.state === 'published' && <><a href={`/${item.kind === 'product' ? 'produtos' : 'servicos'}/${item.slug}`}>Ver no site</a><button disabled={busy} onClick={() => void remove(item, false)}>Retirar do site</button></>}<button disabled={busy} onClick={() => void remove(item, true)}>Arquivar</button></div></article>)}</section>)}</>}
    {message && <p className="admin-message" role="status" aria-live="polite">{message}</p>}
  </div></main>;
}
