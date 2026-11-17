import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Marca } from './Nav';

/** Login por link mágico: a pessoa escreve o e-mail e entra pelo link que chega na caixa de entrada. */
export function Entrar({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado'>('');
  const [erro, setErro] = useState('');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErro('Escreva um e-mail válido.'); document.getElementById('entrar-email')?.focus(); return; }
    setErro(''); setEstado('enviando');
    const { error } = await db.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) { setEstado(''); setErro(error.status === 429 ? 'Muitos pedidos seguidos. Espere um minuto e tente de novo.' : 'Não consegui enviar o link. Confira o e-mail e tente de novo.'); return; }
    setEstado('enviado');
  };

  return (
    <>
      <header className="nav"><div className="wrap nav__in"><span className="logo"><Marca /><span>PanicBoard</span></span></div></header>
      <main id="top">
        <section className="tela" aria-labelledby="entrar-h">
          <div className="wrap">
            <div className="tela__topo"><h1 id="entrar-h" tabIndex={-1}>Entrar</h1></div>
            <p className="ideias__sub">Seus projetos e demandas ficam na sua conta e aparecem em qualquer aparelho.</p>
            {estado === 'enviado'
              ? <p className="ideias__vazio" role="status">{`Pronto. Abra o link que mandei para ${email.trim()} neste navegador.`}</p>
              : (
                <form className="ficha" noValidate onSubmit={enviar} style={{ maxWidth: 520, paddingInline: 0 }}>
                  <div className="campo">
                    <label htmlFor="entrar-email">E-mail</label>
                    <input id="entrar-email" type="email" autoComplete="email" inputMode="email" value={email} aria-describedby="entrar-erro" aria-invalid={!!erro || undefined} onChange={(e) => setEmail(e.target.value)} />
                    <p className="field__error" id="entrar-erro" hidden={!erro}>{erro}</p>
                  </div>
                  <div className="ficha__acoes"><button className="btn btn--primary" type="submit" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Mandar o link de entrada'}</button></div>
                  <p className="ficha__salvo">Sem senha: chega um link no seu e-mail e é só clicar.</p>
                </form>
              )}
          </div>
        </section>
      </main>
    </>
  );
}
