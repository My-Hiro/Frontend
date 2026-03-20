'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  file: File | null;
  title: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  onApply: (blob: Blob) => Promise<void> | void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

export function ImageCropModal({
  open,
  file,
  title,
  aspectRatio,
  outputWidth,
  outputHeight,
  onCancel,
  onApply
}: Props) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageNatural, setImageNatural] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!open || !file) {
      setSourceUrl("");
      setImageNatural(null);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError("");
      return;
    }
    setError("");
    setBusy(false);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    void readFileAsDataUrl(file)
      .then((url) => {
        if (!mounted) return;
        setSourceUrl(url);
      })
      .catch((cause) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "Unable to open image.");
      });
    return () => {
      mounted = false;
    };
  }, [open, file]);

  const objectPosition = useMemo(
    () => `${50 + offsetX * 0.5}% ${50 + offsetY * 0.5}%`,
    [offsetX, offsetY]
  );

  const exportCrop = async () => {
    if (!sourceUrl || !imageNatural) {
      setError("Image is not ready yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");

      const imageAspect = imageNatural.width / imageNatural.height;
      const targetAspect = aspectRatio;

      let baseCropWidth = imageNatural.width;
      let baseCropHeight = imageNatural.height;

      if (imageAspect > targetAspect) {
        baseCropWidth = imageNatural.height * targetAspect;
        baseCropHeight = imageNatural.height;
      } else {
        baseCropWidth = imageNatural.width;
        baseCropHeight = imageNatural.width / targetAspect;
      }

      const cropWidth = baseCropWidth / zoom;
      const cropHeight = baseCropHeight / zoom;

      const maxOffsetX = Math.max(0, (imageNatural.width - cropWidth) / 2);
      const maxOffsetY = Math.max(0, (imageNatural.height - cropHeight) / 2);

      const normalizedX = clamp(offsetX / 100, -1, 1);
      const normalizedY = clamp(offsetY / 100, -1, 1);
      const centerX = imageNatural.width / 2 + normalizedX * maxOffsetX;
      const centerY = imageNatural.height / 2 + normalizedY * maxOffsetY;

      const sx = clamp(centerX - cropWidth / 2, 0, imageNatural.width - cropWidth);
      const sy = clamp(centerY - cropHeight / 2, 0, imageNatural.height - cropHeight);

      const img = imageRef.current;
      if (!img) throw new Error("Image preview missing.");
      ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error("Could not export image."));
              return;
            }
            resolve(result);
          },
          "image/webp",
          0.92
        );
      });
      await onApply(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply crop.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div 
            className="relative bg-muted rounded-lg overflow-hidden border" 
            style={{ aspectRatio: `${aspectRatio}` }}
          >
            {sourceUrl ? (
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Crop preview"
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  objectPosition,
                  transform: `scale(${zoom})`
                }}
                onLoad={(event) => {
                  const target = event.currentTarget;
                  setImageNatural({
                    width: target.naturalWidth,
                    height: target.naturalHeight
                  });
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Loading image preview...
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Zoom: {zoom.toFixed(2)}x</Label>
              <input
                type="range"
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Horizontal Offset</Label>
                <input
                  type="range"
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  min={-100}
                  max={100}
                  step={1}
                  value={offsetX}
                  onChange={(event) => setOffsetX(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vertical Offset</Label>
                <input
                  type="range"
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  min={-100}
                  max={100}
                  step={1}
                  value={offsetY}
                  onChange={(event) => setOffsetY(Number(event.target.value))}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void exportCrop()} disabled={busy}>
            {busy ? "Applying..." : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
