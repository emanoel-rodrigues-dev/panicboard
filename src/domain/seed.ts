// Dados de exemplo. Horários em horas relativas ao momento em que o exemplo é carregado,
// montados para que cada projeto comece numa regra do motor de reações.
import type { Estado, Item, Prioridade, Projeto, Status } from './tipos';

export const PROJETOS: Projeto[] = [
  { id: 'meta', sigla: 'MM', nome: 'CRMundi / MetaMundi', curto: 'MetaMundi', cor: '#61b771', tinta: '#0e2413' },
  { id: 'rhia', sigla: 'RH', nome: 'RHIA', curto: 'RHIA', cor: '#3b6fa3', tinta: '#ffffff' },
  { id: 'luga', sigla: 'LG', nome: 'Luga', curto: 'Luga', cor: '#ff8000', tinta: '#241200' },
  { id: 'estudos', sigla: 'ES', nome: 'Estudos & Inglês', curto: 'Estudos', cor: '#8b5cf6', tinta: '#ffffff' },
];

// status: backlog | fazer | fazendo | revisao | feito ; prioridade: alta | media | baixa
// prazo/atualizado/criado: horas relativas (negativo = passado)
type Linha = [string, number, string, Status, Prioridade, number | null, number, number, string, [string, boolean][]];
const D: Linha[] = [
  // MetaMundi: trabalho em andamento, mas nada se mexe há 60 h -> abandonado
  ['meta', 31, 'Importar contatos do CRM antigo por CSV', 'fazendo', 'alta', 118, -60, -200,
    'Planilha da base antiga tem 14 mil linhas. Mapear colunas "Telefone 2" e "Origem" para os campos novos e validar e-mails duplicados antes de gravar.',
    [['Mapear colunas', true], ['Rodar em homologação', false], ['Conferir duplicados', false]]],
  ['meta', 32, 'Funil de vendas: arrastar negócio entre etapas', 'fazendo', 'media', 140, -62, -180,
    'Hoje a mudança de etapa é por select. Trocar por arrastar e soltar na lista, mantendo o teclado (setas + Enter).',
    [['Protótipo', true], ['Acessibilidade de teclado', false]]],
  ['meta', 29, 'Relatório mensal de oportunidades perdidas', 'fazer', 'baixa', 260, -75, -240,
    'Agrupar por motivo de perda e por vendedor. Exportar PDF.', []],
  ['meta', 27, 'Ajustar permissões do perfil Gerente', 'feito', 'media', -30, -90, -300,
    'Gerente vê a carteira da equipe, mas não edita comissão.', [['Regra no backend', true], ['Teste', true]]],

  // RHIA: uma entrega estourada -> atrasado
  ['rhia', 14, 'Corrigir cálculo de férias proporcionais', 'fazendo', 'alta', -20, -6, -120,
    'Colaborador admitido no dia 31 aparece com 1/12 a menos. Revisar o arredondamento de meses incompletos (regra dos 15 dias).',
    [['Reproduzir com o caso do dia 31', true], ['Corrigir arredondamento', false], ['Teste de regressão', false]]],
  ['rhia', 15, 'Tela de admissão: anexar documentos pelo celular', 'revisao', 'media', 70, -4, -96,
    'Upload de RG e comprovante direto da câmera. Limite de 8 MB por arquivo.', [['Câmera no iOS', true], ['Compressão', true]]],
  ['rhia', 16, 'Exportar folha para o contador (layout novo)', 'fazer', 'alta', 50, -3, -40,
    'O escritório mudou o layout do arquivo. Ver o PDF que chegou por e-mail.', []],
  ['rhia', 12, 'Migrar envio de holerites para fila', 'feito', 'media', -50, -48, -260, 'Fila com novas tentativas automáticas.', []],

  // Luga: entrega nas próximas 24 h -> prazo apertado
  ['luga', 8, 'Página de reserva: cupom de desconto', 'fazendo', 'alta', 9, -2, -70,
    'Campo de cupom no resumo da reserva. Validar no servidor e mostrar o desconto antes do pagamento.',
    [['Campo e validação', true], ['Mensagem de cupom inválido', false], ['Testar no celular', false]]],
  ['luga', 9, 'Fotos dos imóveis em tamanho certo', 'fazer', 'media', 86, -1, -30,
    'Gerar versões 640 e 1280 no upload. Hoje a vitrine baixa a foto original.', []],
  ['luga', 6, 'Calendário de disponibilidade', 'feito', 'alta', -12, -10, -150, 'Bloqueio de datas pelo anfitrião.', []],

  // Estudos & Inglês: ciclo todo entregue -> em dia
  ['estudos', 21, 'Shadowing: 3 episódios de Brooklyn Nine-Nine', 'feito', 'media', -10, -8, -110,
    'Repetir as falas do Jake em voz alta. Anotar 10 expressões novas.', [['Ep. 1', true], ['Ep. 2', true], ['Ep. 3', true]]],
  ['estudos', 22, 'Ler capítulo 4 de Designing Data-Intensive Applications', 'feito', 'media', -30, -12, -130,
    'Encoding e evolução de esquema. Resumo de uma página.', []],
  ['estudos', 23, 'Aula de conversação com a professora', 'feito', 'alta', -26, -26, -90, 'Tema: entrevistas técnicas em inglês.', []],
];

export const IDEIAS: [string, number][] = [
  ['App de leitura que marca as palavras novas em inglês e monta flashcards sozinho #estudos', -3],
  ['MetaMundi: aviso no WhatsApp quando um negócio fica 7 dias parado na mesma etapa #crm', -20],
  ['Luga com check-in por QR code na porta do imóvel', -46],
  ['Template de PR com print antes/depois obrigatório #processo', -70],
  ['RHIA: simulador de rescisão para o próprio colaborador ver', -130],
];

export function montarExemplo(agora: number): Estado {
  const h = (n: number) => new Date(agora + n * 3600e3).toISOString();
  const itens: Item[] = D.map(([projeto, num, titulo, status, prioridade, prazo, atualizado, criado, descricao, checklist]) => {
    const p = PROJETOS.find((x) => x.id === projeto)!;
    return {
      id: `${p.sigla}-${num}`, projeto, titulo, status, prioridade,
      prazo: prazo === null ? null : h(prazo), atualizado: h(atualizado), criado: h(criado),
      descricao, checklist: checklist.map(([t, feito]) => ({ t, feito })),
      historico: [
        { em: h(criado), texto: 'Demanda criada' },
        ...(atualizado > criado ? [{ em: h(atualizado), texto: status === 'feito' ? 'Movida para Feito' : 'Última atualização' }] : []),
      ],
    };
  });
  const ideias = IDEIAS.map(([texto, criado], i) => ({ id: `ID-${i + 1}`, texto, criado: h(criado), promovida: null as string | null }));
  const seq = Object.fromEntries(PROJETOS.map((p) => [p.id, Math.max(...itens.filter((i) => i.projeto === p.id).map((i) => +i.id.split('-')[1]))]));
  return { versao: 1, itens, ideias, seq, seqIdeia: ideias.length, girar: {} };
}
