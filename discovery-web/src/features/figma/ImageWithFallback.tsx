import React, { useEffect, useMemo, useState } from 'react'

const DEFAULT_PLACEHOLDER_SRC = '/placeholders/product.webp'

// Inline copy of `public/placeholders/product.svg` as a final fallback so placeholders never vary
// even if the static file path fails (e.g. misconfigured base path).
const FINAL_FALLBACK_SRC =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2U5ZjFmZiIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIwLjU1IiBzdG9wLWNvbG9yPSIjZmZmM2U2IiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNlYWZmZjUiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJzaGVsZiIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMwZjE3MmEiIHN0b3Atb3BhY2l0eT0iMC4yMiIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMGYxNzJhIiBzdG9wLW9wYWNpdHk9IjAuMDYiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlciBpZD0ic29mdCIgeD0iLTIwIiB5PSItMjAiIHdpZHRoPSI0NDAiIGhlaWdodD0iNDQwIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSI4IiAvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgoKICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNiZykiIC8+CgogIDwhLS0gU29mdCAic2hlbHZlcyIgc28gdGhlIHBsYWNlaG9sZGVyIHJlYWRzIGxpa2UgYSByZWFsIHBob3RvIHRpbGUgLS0+CiAgPGcgZmlsdGVyPSJ1cmwoI3NvZnQpIiBvcGFjaXR5PSIwLjkiPgogICAgPHJlY3QgeD0iNDQiIHk9Ijc4IiB3aWR0aD0iMzEyIiBoZWlnaHQ9IjcyIiByeD0iMTYiIGZpbGw9InVybCgjc2hlbGYpIiAvPgogICAgPHJlY3QgeD0iNDQiIHk9IjE2OCIgd2lkdGg9IjMxMiIgaGVpZ2h0PSI3MiIgcng9IjE2IiBmaWxsPSJ1cmwoI3NoZWxmKSIgLz4KICAgIDxyZWN0IHg9IjQ0IiB5PSIyNTgiIHdpZHRoPSIzMTIiIGhlaWdodD0iNzIiIHJ4PSIxNiIgZmlsbD0idXJsKCNzaGVsZikiIC8+CiAgPC9nPgoKICA8IS0tIFByb2R1Y3QtbGlrZSBibG9ja3MgKHN1YnRsZTsga2VlcHMgaXQgInBob3RvLWxpa2UiIHdpdGhvdXQgYmVpbmcgYW4gaWNvbikgLS0+CiAgPGcgb3BhY2l0eT0iMC45MiI+CiAgICA8cmVjdCB4PSI2OCIgeT0iOTIiIHdpZHRoPSI1OCIgaGVpZ2h0PSI0NCIgcng9IjEwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNzAiIC8+CiAgICA8cmVjdCB4PSIxMzYiIHk9IjkyIiB3aWR0aD0iNzgiIGhlaWdodD0iNDQiIHJ4PSIxMCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjU1IiAvPgogICAgPHJlY3QgeD0iMjI0IiB5PSI5MiIgd2lkdGg9IjQ2IiBoZWlnaHQ9IjQ0IiByeD0iMTAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC42MiIgLz4KICAgIDxyZWN0IHg9IjI4MCIgeT0iOTIiIHdpZHRoPSI1MiIgaGVpZ2h0PSI0NCIgcng9IjEwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNDgiIC8+CgogICAgPHJlY3QgeD0iNzgiIHk9IjE4MiIgd2lkdGg9IjQ0IiBoZWlnaHQ9IjQ0IiByeD0iMTAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC41OCIgLz4KICAgIDxyZWN0IHg9IjEzMiIgeT0iMTgyIiB3aWR0aD0iOTYiIGhlaWdodD0iNDQiIHJ4PSIxMCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjY2IiAvPgogICAgPHJlY3QgeD0iMjM4IiB5PSIxODIiIHdpZHRoPSI1NCIgaGVpZ2h0PSI0NCIgcng9IjEwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNTIiIC8+CiAgICA8cmVjdCB4PSIzMDIiIHk9IjE4MiIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQ0IiByeD0iMTAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC42MCIgLz4KCiAgICA8cmVjdCB4PSI3MiIgeT0iMjcyIiB3aWR0aD0iNjQiIGhlaWdodD0iNDQiIHJ4PSIxMCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjU0IiAvPgogICAgPHJlY3QgeD0iMTQ2IiB5PSIyNzIiIHdpZHRoPSI1MiIgaGVpZ2h0PSI0NCIgcng9IjEwIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuNjQiIC8+CiAgICA8cmVjdCB4PSIyMDgiIHk9IjI3MiIgd2lkdGg9Ijg2IiBoZWlnaHQ9IjQ0IiByeD0iMTAiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC41NiIgLz4KICAgIDxyZWN0IHg9IjMwNCIgeT0iMjcyIiB3aWR0aD0iMzgiIGhlaWdodD0iNDQiIHJ4PSIxMCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjY4IiAvPgogIDwvZz4KCiAgPCEtLSBHZW50bGUgdmlnbmV0dGUgZm9yIGRlcHRoIC0tPgogIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMGYxNzJhIiBvcGFjaXR5PSIwLjA1IiAvPgo8L3N2Zz4K'

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string
}

const normalizeSrc = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const { src, fallbackSrc, alt, onError, onLoad, style, ...rest } = props

  const sources = useMemo(() => {
    const unique = new Set<string>()
    for (const entry of [normalizeSrc(src), normalizeSrc(fallbackSrc), DEFAULT_PLACEHOLDER_SRC, FINAL_FALLBACK_SRC]) {
      if (entry.length > 0) unique.add(entry)
    }
    return Array.from(unique)
  }, [fallbackSrc, src])

  const [attemptIndex, setAttemptIndex] = useState(0)

  useEffect(() => {
    setAttemptIndex(0)
  }, [src, fallbackSrc])

  const effectiveIndex = Math.min(attemptIndex, Math.max(0, sources.length - 1))
  const effectiveSrc = sources[effectiveIndex] ?? FINAL_FALLBACK_SRC
  const isFallback = effectiveIndex > 0

  const [isLoaded, setIsLoaded] = useState(false)
  useEffect(() => {
    setIsLoaded(false)
  }, [effectiveSrc])

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setIsLoaded(true)
    onLoad?.(event)
  }

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    setAttemptIndex((prev) => Math.min(prev + 1, sources.length - 1))
    onError?.(event)
  }

  const placeholderBg: React.CSSProperties = isLoaded
    ? {}
    : {
        backgroundImage: `url(${DEFAULT_PLACEHOLDER_SRC})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }

  const debugStyle: React.CSSProperties = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDev = Boolean((import.meta as any)?.env?.DEV);
    if (!isDev || !isFallback) return {};
    if (typeof window === 'undefined') return {};
    const enabled = window.location.search.includes('debugImages=1');
    return enabled ? { outline: '2px dashed #f59e0b', outlineOffset: '-2px' } : {};
  })()

  const mergedStyle: React.CSSProperties = { ...(style ?? {}), ...placeholderBg, ...debugStyle }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      {...rest}
      style={mergedStyle}
      onError={handleError}
      onLoad={handleLoad}
      data-original-url={isFallback ? src : undefined}
      data-fallback={isFallback ? '1' : undefined}
      data-fallback-level={isFallback ? String(effectiveIndex) : undefined}
    />
  )
}
