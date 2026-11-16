import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { repositorioLocal } from './data/armazenamento';
import './styles.css';

const repo = repositorioLocal();
const carga = await repo.carregar();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repo={repo} inicial={carga.estado} avisoInicial={carga.aviso} />
  </StrictMode>,
);
