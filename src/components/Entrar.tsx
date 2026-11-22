import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Marca } from './Nav';
import { QuadroVitrine } from './QuadroVitrine';
import './Entrar.css';

const ESPERA = 60; // segundos até liberar o reenvio (o Supabase também limita pedidos seguidos)

/** Login por link mágico: a pessoa escreve o e-mail e entra pelo link que chega na caixa de entrada.
 *  O cartão vira para mostrar que o link foi enviado; atrás, um quadro de exemplo mostra o que é o app.
 *  Sem db (a demonstração em ?entrar): a mesma tela, mas nada é enviado e o verso leva para os dados de exemplo. */
export function Entrar({ db, demo }: { db?: SupabaseClient; demo?: () => void }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'' | 'enviando' | 'enviado'>('');
  const [erro, setErro] = useState('');
  const [espera, setEspera] = useState(0);
  const [reenvio, setReenvio] = useState('');
  const palco = useRef<HTMLDivElement>(null), form = useRef<HTMLFormElement>(null), campo = useRef<HTMLInputElement>(null), titulo = useRef<HTMLHeadingElement>(null);
  const enviado = estado === 'enviado';

  // ao virar o cartão, o foco vai junto (para o título do verso, ou de volta para o campo)
  const antes = useRef(enviado);
  useEffect(() => {
    if (antes.current === enviado) return;
    antes.current = enviado;
    (enviado ? titulo : campo).current?.focus({ preventScroll: true });
  }, [enviado]);

  useEffect(() => {
    if (!enviado || espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [enviado, espera]);

  const tremer = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    form.current?.animate([{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none' }], { duration: 320 });
  };
  const pedir = async (v: string) => db ? db.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } }) : { error: null };
  const falha = (status?: number) => status === 429 ? 'Muitos pedidos seguidos. Espere um minuto e tente de novo.' : 'Não consegui enviar o link. Confira o e-mail e tente de novo.';

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErro('Escreva um e-mail válido.'); tremer(); campo.current?.focus(); return; }
    setErro(''); setEstado('enviando');
    const { error } = await pedir(v);
    if (error) { setEstado(''); setErro(falha(error.status)); tremer(); return; }
    setReenvio(''); setEspera(ESPERA); setEstado('enviado');
  };

  const reenviar = async () => {
    setEspera(ESPERA); setReenvio('');
    const { error } = await pedir(email.trim());
    setReenvio(error ? falha(error.status) : 'Mandei de novo. Confira também o spam.');
  };

  return (
    <div className={`en${erro ? ' is-erro' : ''}${enviado ? ' is-enviado' : ''}`}>
      <header className="en-nav"><Marca /><span>PanicBoard</span></header>
      <main className="en-tela" id="top">
        <div className="en-palco" ref={palco}>
          <div className="en-cartao">
            <form className="en-face en-frente" ref={form} noValidate onSubmit={enviar} inert={enviado} aria-labelledby="entrar-h">
              <div className="en-cab"><span>PanicBoard</span><span className="en-est"><span className="en-ponto" />Seu quadro te esperando</span></div>
              <div className="en-corpo">
                <h1 className="en-h1" id="entrar-h">Entrar</h1>
                <p className="en-sub">O quadro de demandas para quem toca vários projetos. Entre e ele te acompanha em qualquer aparelho.</p>
                <label className="en-label" htmlFor="entrar-email">E-mail</label>
                <input ref={campo} className="en-input" id="entrar-email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email}
                  aria-describedby="entrar-erro" aria-invalid={!!erro || undefined} onChange={(e) => { setEmail(e.target.value); if (erro) setErro(''); }} />
                <p className="en-erro" id="entrar-erro" hidden={!erro}>{erro}</p>
                <button className="en-btn" type="submit" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Mandar o link de entrada'}</button>
                <p className="en-nota">Sem senha: chega um link no seu e-mail e é só clicar.</p>
              </div>
            </form>
            {demo ? (
            <div className="en-face en-verso" inert={!enviado}>
              <div className="en-cab"><span>Demonstração</span><span className="en-est">Nenhum e-mail enviado</span></div>
              <div className="en-corpo">
                <h2 className="en-h2" ref={titulo} tabIndex={-1}>Na sua cópia, o link chega no e-mail</h2>
                <p className="en-sub">Aqui é só uma demonstração: os projetos são de exemplo e o que você mexer fica só neste navegador.</p>
                <button className="en-btn" type="button" data-entrar-demo="" onClick={demo}>Entrar na demonstração</button>
                <button className="en-btn en-btn--sec" type="button" onClick={() => { setEstado(''); setReenvio(''); }}>Usar outro e-mail</button>
              </div>
            </div>
            ) : (
            <div className="en-face en-verso" inert={!enviado}>
              <div className="en-cab"><span>Link enviado</span><span className="en-est">Confira a caixa de entrada</span></div>
              <div className="en-corpo">
                <h2 className="en-h2" ref={titulo} tabIndex={-1}>Abra o link neste navegador</h2>
                <p className="en-sub">Mandei para <span className="en-email">{email.trim()}</span>. Ele vale por uma hora.</p>
                <button className="en-btn" type="button" disabled={espera > 0} onClick={reenviar}>{espera > 0 ? `Reenviar em ${espera} s` : 'Reenviar o link'}</button>
                <button className="en-btn en-btn--sec" type="button" onClick={() => { setEstado(''); setReenvio(''); }}>Usar outro e-mail</button>
                <p className="en-nota" role="status">{reenvio}</p>
              </div>
            </div>
            )}
          </div>
        </div>
        <QuadroVitrine palco={palco} enviado={enviado} />
      </main>
    </div>
  );
}
