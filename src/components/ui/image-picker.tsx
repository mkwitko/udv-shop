import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "#/lib/api/error-message";
import { presignUpload } from "#/lib/api/gen/clients/presignUpload";
import { cn } from "#/lib/utils";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Foto já no R2: `key` é o que a API guarda, `url` é o que a tela mostra. */
export type PickedImage = { key: string; url: string };

/**
 * Sobe fotos pelo presign e devolve as keys. Vive em componente porque produto, capa de
 * campanha e prêmio de sorteio usam o mesmo fluxo — três cópias divergiriam no primeiro
 * ajuste de mensagem de erro.
 */
export function ImagePicker({
  storeSlug,
  images,
  onChange,
  max = 10,
  multiple = true,
  onUploadingChange,
  onError,
  label = "Toque para escolher as fotos",
  coverKey,
  onCoverChange,
}: {
  storeSlug: string;
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  max?: number;
  multiple?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string | null) => void;
  label?: string;
  /** Com `onCoverChange`, cada foto ganha o botão de virar capa. Só a campanha usa. */
  coverKey?: string | null;
  onCoverChange?: (key: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const full = images.length >= max;

  function setBusy(value: boolean) {
    setUploading(value);
    onUploadingChange?.(value);
  }

  async function upload(file: File, accumulated: PickedImage[]): Promise<PickedImage | null> {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      onError?.("Use uma foto em JPG, PNG, WebP ou AVIF.");
      return null;
    }
    if (accumulated.length >= max) {
      onError?.(max === 1 ? "Só cabe uma foto aqui." : `Cabem no máximo ${max} fotos.`);
      return null;
    }
    try {
      const presigned = await presignUpload({
        storeSlug,
        contentType: file.type as AcceptedImageType,
      });
      const response = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("upload_failed");
      return { key: presigned.key, url: presigned.publicUrl };
    } catch (error) {
      onError?.(
        error instanceof Error && error.message === "upload_failed"
          ? "A foto não subiu. Tente de novo."
          : errorMessage(error),
      );
      return null;
    }
  }

  async function addFiles(files: File[]) {
    setBusy(true);
    onError?.(null);
    // uma por vez para manter a ordem; um erro interrompe as seguintes
    let next = images;
    for (const file of files) {
      const picked = await upload(file, next);
      if (!picked) break;
      next = [...next, picked];
      onChange(next);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {images.map((image) => {
            const isCover = onCoverChange !== undefined && image.key === coverKey;
            return (
              <span key={image.key} className="relative">
                <img
                  src={image.url}
                  alt=""
                  className={cn(
                    "aspect-square w-full rounded-[0.9rem] border bg-surface object-cover",
                    isCover ? "border-brand ring-2 ring-brand/30" : "border-line",
                  )}
                />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() =>
                    onChange(images.filter((candidate) => candidate.key !== image.key))
                  }
                  className="-top-2 -right-2 absolute inline-grid h-7 w-7 place-items-center rounded-full border border-line bg-elevated text-muted shadow-sm hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
                {/* a capa é a foto que viaja no link compartilhado, então ela precisa ser
                    escolhida na mão — a primeira que subiu raramente é a melhor */}
                {onCoverChange !== undefined && (
                  <button
                    type="button"
                    onClick={() => onCoverChange(image.key)}
                    aria-pressed={isCover}
                    className={cn(
                      "absolute inset-x-1 bottom-1 rounded-full px-2 py-1 text-[0.7rem] font-medium",
                      isCover
                        ? "bg-brand text-brand-ink"
                        : "bg-elevated/90 text-muted hover:text-ink",
                    )}
                  >
                    {isCover ? "Capa" : "Usar de capa"}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {!full && (
        <label
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepth.current += 1;
            setDragOver(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragOver(false);
            if (!uploading && event.dataTransfer.files.length > 0) {
              void addFiles(Array.from(event.dataTransfer.files));
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[1rem] border-2 border-dashed px-4 py-8 text-center transition-colors [transition-duration:var(--dur)] ${
            dragOver ? "border-brand bg-brand-soft/60" : "border-line hover:border-line-strong"
          }`}
        >
          <ImagePlus className="h-6 w-6 text-muted" aria-hidden />
          <span className="font-medium text-ink text-sm">
            {uploading ? "Enviando foto…" : label}
          </span>
          {/* No celular não existe arrastar: o gesto que a pessoa tem é tocar. Arrastar
              continua funcionando no computador, virou a alternativa. */}
          <span className="text-muted text-xs">ou arraste aqui · JPG, PNG, WebP</span>
          <input
            type="file"
            multiple={multiple}
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const files = event.target.files;
              if (files && files.length > 0) void addFiles(Array.from(files));
              event.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
