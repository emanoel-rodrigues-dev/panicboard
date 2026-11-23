// Prepara a imagem antes de guardar: reduz para no máximo 1600 px e comprime, para ficar leve no banco e na tela.

const MAX_LADO = 1600;
/** arquivo original maior que isto nem é lido */
export const MAX_ORIGINAL = 25 * 1024 * 1024;

export interface ImagemPronta { arquivo: Blob; largura: number; altura: number }

const paraBlob = (c: HTMLCanvasElement, tipo: string) => new Promise<Blob | null>((ok) => c.toBlob(ok, tipo, 0.86));

export async function prepararImagem(original: Blob): Promise<ImagemPronta> {
  const bmp = await createImageBitmap(original);
  const escala = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const largura = Math.round(bmp.width * escala), altura = Math.round(bmp.height * escala);
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  c.getContext('2d')!.drawImage(bmp, 0, 0, largura, altura);
  bmp.close();
  // WebP onde o navegador sabe gerar; senão JPEG (o navegador devolve PNG quando não conhece o tipo pedido)
  let arquivo = await paraBlob(c, 'image/webp');
  if (!arquivo || arquivo.type !== 'image/webp') arquivo = await paraBlob(c, 'image/jpeg');
  if (!arquivo) throw new Error('não consegui converter a imagem');
  return { arquivo, largura, altura };
}

/** só os arquivos de imagem de uma lista (colar, arrastar ou escolher) */
export const soImagens = (fs: FileList | File[] | null | undefined) => [...(fs ?? [])].filter((f) => f.type.startsWith('image/'));
