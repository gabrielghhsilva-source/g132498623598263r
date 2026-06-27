import { useRef, useState, useCallback } from "react";

interface SwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  /** Distância mínima em px para disparar a ação. */
  threshold?: number;
  /** Distância máxima do offset visual mostrado durante o gesto. */
  maxOffset?: number;
  /** Desabilita o swipe (ex: drag ativo). */
  disabled?: boolean;
}

/**
 * Hook simples de swipe horizontal pra elementos tipo card.
 * Retorna `offset` (px, positivo = direita) e handlers `onPointerDown/Move/Up`.
 */
export function useSwipe({ onSwipeRight, onSwipeLeft, threshold = 80, maxOffset = 140, disabled }: SwipeOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const [offset, setOffset] = useState(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    if (e.pointerType !== "touch") return; // só toque, evita conflito com mouse drag
    startX.current = e.clientX;
    startY.current = e.clientY;
    active.current = false;
  }, [disabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!active.current) {
      // só ativa horizontal se for claramente horizontal
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        startX.current = null;
        return;
      }
      active.current = true;
    }
    const clamped = Math.max(-maxOffset, Math.min(maxOffset, dx));
    setOffset(clamped);
  }, [maxOffset]);

  const reset = useCallback(() => {
    startX.current = null;
    startY.current = null;
    active.current = false;
    setOffset(0);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!active.current) { reset(); return; }
    if (offset >= threshold && onSwipeRight) onSwipeRight();
    else if (offset <= -threshold && onSwipeLeft) onSwipeLeft();
    reset();
  }, [offset, threshold, onSwipeRight, onSwipeLeft, reset]);

  return { offset, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset };
}
