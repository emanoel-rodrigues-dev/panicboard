import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type Conta } from './App';
import { repositorioLocal, type Carga, type Repositorio } from './data/armazenamento';
import { imagensLocais, imagensSupabase, type ArmazemImagens } from './data/imagens';
import './styles.css';

// PWA: só no build (no dev o cache atrapalharia o recarregar)
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { /* sem PWA, o app funciona igual */ });

const raiz = createRoot(document.getElementById('root')!);
const abrir = (repo: Repositorio, carga: Carga, conta?: Conta, imagens: ArmazemImagens = imagensLocais()) => raiz.render(
  <StrictMode>
    <App repo={repo} imagens={imagens} inicial={carga.estado} avisoInicial={carga.aviso} conta={conta} />
  </StrictMode>,
);

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !chave) {
  // sem Supabase configurado: tudo no navegador, como uma demonstração
  const repo = repositorioLocal();
  if (new URLSearchParams(location.search).has('entrar')) {
    // ?entrar: a demonstração começa pela tela de entrada, como na instância com conta
    const { Entrar } = await import('./components/Entrar');
    const carga = await repo.carregar();
    const entrar = () => { history.replaceState(null, '', location.pathname + location.hash); abrir(repo, carga); };
    raiz.render(<StrictMode><Entrar demo={entrar} /></StrictMode>);
  } else {
    abrir(repo, await repo.carregar());
  }
} else {
  // a biblioteca só é baixada quando o Supabase está configurado
  const [{ createClient }, { repositorioSupabase }, { Entrar }] = await Promise.all([import('@supabase/supabase-js'), import('./data/supabase'), import('./components/Entrar')]);
  const db = createClient(url, chave, { auth: { flowType: 'pkce' } });
  const { data } = await db.auth.getSession(); // troca o ?code= do link mágico pela sessão
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
  const sessao = data.session;
  if (!sessao) {
    raiz.render(<StrictMode><Entrar db={db} /></StrictMode>);
    db.auth.onAuthStateChange((_e, s) => { if (s) location.reload(); });
  } else {
    const avisar = (msg: string) => window.dispatchEvent(new CustomEvent('panicboard:aviso', { detail: msg }));
    const conta: Conta = { email: sessao.user.email ?? '', sair: async () => { await db.auth.signOut(); location.reload(); } };
    const repo = repositorioSupabase(db, { onErro: avisar });
    try {
      abrir(repo, await repo.carregar(), conta, imagensSupabase(db, sessao.user.id));
    } catch (e) {
      console.error(e);
      const local = repositorioLocal();
      const carga = await local.carregar();
      abrir(local, { ...carga, aviso: 'Não consegui abrir a sua conta. Mostrando a cópia deste navegador; as mudanças ficam só aqui até recarregar.' }, conta, imagensSupabase(db, sessao.user.id));
    }
  }
}
