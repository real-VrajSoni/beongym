"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_EDGE = 320;
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Gym profile image.
 *
 * The file is downscaled to a 320px square in the browser and submitted as a
 * data URL, so there is no object storage to run and no broken-image risk from
 * a third-party host. Anything larger than a logo would be the wrong tool.
 */
export function ImageUpload({
  name,
  defaultValue,
  fallback,
  accentColor,
}: {
  name: string;
  defaultValue?: string | null;
  fallback: string;
  accentColor: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Pick an image under 4 MB.");
      return;
    }

    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      // Square crop from the centre, then downscale.
      const edge = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = MAX_EDGE;
      canvas.height = MAX_EDGE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(
        bitmap,
        (bitmap.width - edge) / 2,
        (bitmap.height - edge) / 2,
        edge,
        edge,
        0,
        0,
        MAX_EDGE,
        MAX_EDGE,
      );
      setValue(canvas.toDataURL("image/webp", 0.85));
    } catch {
      setError("That image couldn't be read. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[19px] font-bold text-white",
            !value && "ring-1 ring-[var(--border)] ring-inset",
          )}
          style={{ background: value ? undefined : accentColor }}
        >
          {value ? (
            // Data URL, already sized — next/image would add nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            fallback
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus /> {value ? "Replace image" : "Upload image"}
            </Button>
            {value ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setValue("")}>
                <Trash2 /> Remove
              </Button>
            ) : null}
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {error ? (
              <span className="text-[var(--danger)]">{error}</span>
            ) : (
              "Square works best. Resized to 320px before saving."
            )}
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onPick(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
