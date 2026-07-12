/**
 * Utilitário de preparação de imagens para o Supabase Storage.
 *
 * Regras:
 * - aceita JPEG, PNG e WebP;
 * - bloqueia arquivo original acima de 10 MB;
 * - redimensiona mantendo a proporção;
 * - converte para WebP;
 * - reduz qualidade progressivamente;
 * - bloqueia o resultado caso permaneça acima do limite final.
 */

export interface PrepareImageOptions {
  maxWidth: number;
  maxHeight: number;
  maxOutputBytes: number;
  outputFileName: string;
}

const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;

const ALLOWED_INPUT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.50];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };

    image.src = objectUrl;
  });
}

function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível converter a imagem para WebP.'));
          return;
        }

        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

function calculateDimensions(params: {
  sourceWidth: number;
  sourceHeight: number;
  maxWidth: number;
  maxHeight: number;
  extraScale?: number;
}) {
  const {
    sourceWidth,
    sourceHeight,
    maxWidth,
    maxHeight,
    extraScale = 1
  } = params;

  const baseScale = Math.min(
    maxWidth / sourceWidth,
    maxHeight / sourceHeight,
    1
  );

  const finalScale = Math.min(baseScale * extraScale, 1);

  return {
    width: Math.max(1, Math.round(sourceWidth * finalScale)),
    height: Math.max(1, Math.round(sourceHeight * finalScale))
  };
}

async function renderImageToCanvas(params: {
  image: HTMLImageElement;
  width: number;
  height: number;
}): Promise<HTMLCanvasElement> {
  const { image, width, height } = params;
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('O navegador não conseguiu processar a imagem.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  return canvas;
}

export async function prepareImageForStorage(
  file: File,
  options: PrepareImageOptions
): Promise<File> {
  if (!file) {
    throw new Error('Nenhuma imagem foi selecionada.');
  }

  if (!ALLOWED_INPUT_TYPES.has(file.type)) {
    throw new Error('Formato inválido. Use uma imagem JPG, PNG ou WebP.');
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error('A imagem original deve ter no máximo 10 MB.');
  }

  const image = await loadImage(file);

  if (!image.width || !image.height) {
    throw new Error('A imagem selecionada possui dimensões inválidas.');
  }

  const scaleAttempts = [1, 0.9, 0.8, 0.7];

  for (const extraScale of scaleAttempts) {
    const dimensions = calculateDimensions({
      sourceWidth: image.width,
      sourceHeight: image.height,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      extraScale
    });

    const canvas = await renderImageToCanvas({
      image,
      width: dimensions.width,
      height: dimensions.height
    });

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToWebpBlob(canvas, quality);

      if (blob.size <= options.maxOutputBytes) {
        return new File(
          [blob],
          options.outputFileName,
          {
            type: 'image/webp',
            lastModified: Date.now()
          }
        );
      }
    }
  }

  const maxKilobytes = Math.round(options.maxOutputBytes / 1024);

  throw new Error(
    `Não foi possível reduzir esta imagem para até ${maxKilobytes} KB. Escolha outra foto com menor resolução.`
  );
}
