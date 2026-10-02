'use client';
import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { boxFromPoints, idsInBox, rangeIds, toggleId, unionIds } from '@/utils/rowSelection';

// Selección de filas tipo explorador de archivos, con rectángulo de selección:
// - mantener click y arrastrar → se dibuja un recuadro azul y se marcan las filas que toca
// - Shift + click → rango desde la última fila clickeada
// - Cmd/Ctrl + click (o arrastre) → suma/quita sin perder lo anterior
// - click simple o Esc → limpia
// Las filas se marcan con `data-select-id`. El resaltado se pinta directo en el DOM
// (atributo `data-selected`) para no re-renderizar la tabla mientras se arrastra;
// el estado de React se actualiza una sola vez, al soltar.

const ROW_SELECTOR = '[data-select-id]';
const INTERACTIVE_SELECTOR = 'input, button, textarea, select, a, label, [role="button"]';
const DRAG_THRESHOLD_PX = 4;
const EDGE_PX = 48;
const MAX_SCROLL_STEP = 20;

type DragState = {
  // Punto inicial en coordenadas de pantalla + scroll al empezar (el recuadro acompaña el scroll)
  startX: number;
  startY: number;
  startScrollTop: number;
  startScrollLeft: number;
  x: number;
  y: number;
  base: string[];
  additive: boolean;
  anchorId: string | null;
  active: boolean;
  preview: string[];
  previewKey: string;
  scroller: HTMLElement;
  isPageScroller: boolean;
  overlay: HTMLDivElement | null;
  raf: number;
};

function findScrollParent(el: HTMLElement | null): HTMLElement {
  let node = el;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '400',
    pointerEvents: 'none',
    border: '1px solid #228be6',
    background: 'rgba(34, 139, 230, 0.15)',
    borderRadius: '2px'
  });
  document.body.appendChild(el);
  return el;
}

// Evita que el click que sigue a un arrastre abra/seleccione la fila.
function suppressNextClick() {
  const stop = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, true), 0);
}

export function useDragSelect(containerRef: RefObject<HTMLElement>, resetKey?: unknown) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;
  const anchorRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const getRows = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? []),
    [containerRef]
  );

  const paint = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      getRows().forEach((row) => row.toggleAttribute('data-selected', set.has(row.dataset.selectId!)));
    },
    [getRows]
  );

  const clear = useCallback(() => {
    anchorRef.current = null;
    if (selectedRef.current.length) setSelectedIds([]);
  }, []);

  // Mantener el DOM en sync después de cada render (filas nuevas, cambio de datos, etc.)
  useLayoutEffect(() => {
    if (!dragRef.current?.active) paint(selectedIds);
  });

  useEffect(() => {
    anchorRef.current = null;
    setSelectedIds([]);
  }, [resetKey]);

  useEffect(() => {
    // Dibuja el recuadro y recalcula qué filas toca
    const update = (drag: DragState) => {
      const scrollDy = drag.scroller.scrollTop - drag.startScrollTop;
      const scrollDx = drag.scroller.scrollLeft - drag.startScrollLeft;
      const box = boxFromPoints(drag.startX - scrollDx, drag.startY - scrollDy, drag.x, drag.y);

      if (drag.overlay) {
        // Recortar el dibujo al área visible del contenedor con scroll
        const clip = drag.isPageScroller
          ? { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
          : drag.scroller.getBoundingClientRect();
        const top = Math.max(box.top, clip.top);
        const bottom = Math.min(box.bottom, clip.bottom);
        const left = Math.max(box.left, clip.left);
        const right = Math.min(box.right, clip.right);
        Object.assign(drag.overlay.style, {
          display: bottom > top && right > left ? 'block' : 'none',
          top: `${top}px`,
          left: `${left}px`,
          width: `${Math.max(0, right - left)}px`,
          height: `${Math.max(0, bottom - top)}px`
        });
      }

      const rows = getRows().map((row) => {
        const r = row.getBoundingClientRect();
        return { id: row.dataset.selectId!, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
      const hits = idsInBox(rows, box);
      const next = drag.additive ? unionIds(drag.base, hits) : hits;
      const key = next.join('\u0000');
      if (key !== drag.previewKey) {
        drag.preview = next;
        drag.previewKey = key;
        paint(next);
      }
    };

    // Un frame por vuelta: auto-scroll cerca del borde + actualización del recuadro
    const tick = () => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.active) {
        const rect = drag.isPageScroller
          ? { top: 0, bottom: window.innerHeight }
          : drag.scroller.getBoundingClientRect();
        let step = 0;
        if (drag.y < rect.top + EDGE_PX) step = -((rect.top + EDGE_PX - drag.y) / EDGE_PX) * MAX_SCROLL_STEP;
        else if (drag.y > rect.bottom - EDGE_PX) step = ((drag.y - (rect.bottom - EDGE_PX)) / EDGE_PX) * MAX_SCROLL_STEP;
        if (step !== 0) drag.scroller.scrollTop += Math.round(Math.max(-MAX_SCROLL_STEP, Math.min(MAX_SCROLL_STEP, step)));
        update(drag);
      }
      drag.raf = requestAnimationFrame(tick);
    };

    const endDrag = () => {
      const drag = dragRef.current;
      if (!drag) return null;
      cancelAnimationFrame(drag.raf);
      drag.overlay?.remove();
      document.body.style.userSelect = '';
      dragRef.current = null;
      return drag;
    };

    const onPointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container || e.button !== 0 || e.pointerType === 'touch') return;
      const target = e.target as Element;
      if (!container.contains(target) || target.closest(INTERACTIVE_SELECTOR)) return;

      const row = target.closest<HTMLElement>(ROW_SELECTOR);
      const id = row?.dataset.selectId ?? null;
      const additive = e.metaKey || e.ctrlKey;

      if (e.shiftKey && id && anchorRef.current) {
        const order = getRows().map((r) => r.dataset.selectId!);
        const range = rangeIds(order, anchorRef.current, id);
        setSelectedIds(additive ? unionIds(selectedRef.current, range) : range);
        window.getSelection()?.removeAllRanges();
        suppressNextClick();
        return;
      }

      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
      const scroller = findScrollParent(container);
      const base = additive ? selectedRef.current : [];
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startScrollTop: scroller.scrollTop,
        startScrollLeft: scroller.scrollLeft,
        x: e.clientX,
        y: e.clientY,
        base,
        additive,
        anchorId: id,
        active: false,
        preview: base,
        previewKey: '',
        scroller,
        isPageScroller: scroller === document.scrollingElement || scroller === document.documentElement,
        overlay: null,
        raf: 0
      };
      dragRef.current.raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.x = e.clientX;
      drag.y = e.clientY;
      // El recuadro aparece recién al moverse unos px, así un click común sigue siendo click
      if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > DRAG_THRESHOLD_PX) {
        drag.active = true;
        drag.overlay = createOverlay();
      }
    };

    const onPointerUp = () => {
      const drag = endDrag();
      if (!drag) return;
      if (drag.active) {
        setSelectedIds(drag.preview);
        suppressNextClick();
      } else if (drag.additive && drag.anchorId) {
        anchorRef.current = drag.anchorId;
        setSelectedIds(toggleId(selectedRef.current, drag.anchorId));
        suppressNextClick();
      } else {
        // Click simple: limpia y deja pasar el click (comportamiento de siempre de la fila)
        anchorRef.current = drag.anchorId;
        if (selectedRef.current.length) setSelectedIds([]);
      }
    };

    const onPointerCancel = () => {
      if (endDrag()) paint(selectedRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRef.current.length) clear();
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      endDrag();
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, getRows, paint, clear]);

  return { selectedIds, clear };
}
