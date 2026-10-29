import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';

export async function createApp(production=false){
 if(!production)Object.assign(process.env,(await import('vite')).loadEnv('production',process.cwd(),''));
 const app=express();app.disable('x-powered-by');
 const vite=production?null:await (await import('vite')).createServer({server:{middlewareMode:true},appType:'custom'});
 if(vite)app.use(vite.middlewares);else app.use(express.static(path.resolve('dist/client'),{index:false}));
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const db=url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
 const siteUrl=(process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'http://localhost:4173')).replace(/\/$/,'');
 app.use((_req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','strict-origin-when-cross-origin');next()});
 app.get('/robots.txt',(_req,res)=>res.type('text').send('User-agent: *\nDisallow: /admin\nSitemap: '+siteUrl+'/sitemap.xml'));
 app.get('/media/*path',async(req,res)=>{if(!db){res.sendStatus(503);return}const objectPath=Array.isArray(req.params.path)?req.params.path.join('/'):req.params.path;const {data,error}=await db.storage.from('catalog').download(objectPath);if(error||!data){res.sendStatus(404);return}res.type(data.type||'image/webp').send(Buffer.from(await data.arrayBuffer()));});
 app.use(async(req,res)=>{try{let items:any[]=[],unavailable=false;if(db){const result=await db.from('item_publications').select('*').order('sort_order');if(result.error)unavailable=true;else items=result.data||[];}const route=req.path.replace(/\/$/,'')||'/';if(route==='/sitemap.xml'){res.type('xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/produtos','/sobre','/contato',...items.map(i=>`/${i.kind==='product'?'produtos':'servicos'}/${i.slug}`)].map(p=>`<url><loc>${siteUrl}${p}</loc></url>`).join('')+'</urlset>');return}const template=production?await fs.readFile('dist/client/index.html','utf8'):await vite!.transformIndexHtml(req.originalUrl,await fs.readFile('index.html','utf8'));const module=production?await import('../dist/server/entry-server.js' as string):await vite!.ssrLoadModule('/src/entry-server.tsx');const rendered=module.render({path:route,items,unavailable,siteUrl});res.status(rendered.status).type('html').send(template.replace('<!--head-->',rendered.head).replace('<!--app-->',rendered.html).replace('<!--data-->',rendered.payload));}catch(error){console.error(error);res.status(503).type('html').send('<h1>Site temporariamente indisponível</h1><a href="https://wa.me/5532999709900">Fale com a House</a>')}});
 return app;
}
