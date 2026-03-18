import { useEffect, useMemo, useRef, useState } from "react";

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

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Adjust image crop">
      <div className="modal modal-wide">
        <header>
          <h3>{title}</h3>
          <button className="icon-btn" type="button" onClick={onCancel} disabled={busy}>
            X
          </button>
        </header>
        <div className="modal-body">
          <div className="crop-preview-wrap" style={{ aspectRatio: `${aspectRatio}` }}>
            {sourceUrl ? (
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Crop preview"
                className="crop-preview-image"
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
              <span className="muted">Loading image preview...</span>
            )}
          </div>

          <div className="crop-controls">
            <label>
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
            <label>
              Horizontal
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={offsetX}
                onChange={(event) => setOffsetX(Number(event.target.value))}
              />
            </label>
            <label>
              Vertical
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={offsetY}
                onChange={(event) => setOffsetY(Number(event.target.value))}
              />
            </label>
          </div>

          {error && <p className="danger-text">{error}</p>}
        </div>
        <footer>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void exportCrop()} disabled={busy}>
            {busy ? "Applying..." : "Apply crop"}
          </button>
        </footer>
      </div>
    </div>
  );
}
