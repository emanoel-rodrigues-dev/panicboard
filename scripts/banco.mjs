// npm run banco: sobe o Supabase local no Docker (lendo a pasta supabase/) e preenche o .env.local.
// npm run banco:parar: desliga os contêineres (os dados ficam guardados para a próxima vez).
// Usa o CLI do Supabase se estiver instalado; senão baixa a versão fixa abaixo pelo npx.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const VERSAO_CLI = '3.2.0';

const temNoPath = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
const [cmd, base] = temNoPath('supabase') ? ['supabase', []] : ['npx', ['--yes', `supabase@${VERSAO_CLI}`]];
const supabase = (args, opcoes = {}) => spawnSync(cmd, [...base, ...args], { shell: process.platform === 'win32', ...opcoes });

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('O Docker não está rodando. Abra o Docker Desktop e rode `npm run banco` de novo.');
  process.exit(1);
}

if (process.argv[2] === 'parar') process.exit(supabase(['stop'], { stdio: 'inherit' }).status ?? 1);

console.log('Subindo o Supabase local (na primeira vez baixa as imagens, leva alguns minutos)...');
if (supabase(['start'], { stdio: 'inherit' }).status !== 0) process.exit(1);

const status = supabase(['status', '-o', 'env'], { encoding: 'utf8' }).stdout ?? '';
const valor = (nome) => status.match(new RegExp(`^${nome}="?([^"\\n]*)"?`, 'm'))?.[1];
const url = valor('API_URL');
const chave = valor('PUBLISHABLE_KEY') || valor('ANON_KEY');
if (!url || !chave) {
  console.error('Não consegui ler a URL e a chave do Supabase local. Rode `npx supabase status` para ver.');
  process.exit(1);
}

const linhas = `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${chave}\n`;
const atual = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : null;
if (atual === null) {
  writeFileSync('.env.local', linhas);
  console.log('\n.env.local criado apontando para o Supabase local.');
} else if (atual.includes(`VITE_SUPABASE_URL=${url}`) && atual.includes(`VITE_SUPABASE_ANON_KEY=${chave}`)) {
  console.log('\n.env.local já aponta para o Supabase local.');
} else {
  // não sobrescreve: o .env.local pode ser de um Supabase na nuvem
  console.log(`\nO seu .env.local aponta para outro Supabase e não foi alterado. Para usar o local, troque por:\n\n${linhas}`);
}

console.log(`
Pronto. Agora rode \`npm run dev\` e entre com qualquer e-mail.
- E-mails de login: ${valor('MAILPIT_URL') ?? 'veja `npx supabase status`'}
- Painel do banco:  ${valor('STUDIO_URL') ?? 'veja `npx supabase status`'}
Para desligar: npm run banco:parar`);
