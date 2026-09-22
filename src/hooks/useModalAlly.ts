import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Lo que le faltaba a los 6 modales del proyecto: mover el foco adentro
// al abrir, atraparlo con Tab/Shift+Tab mientras está abierto, cerrar
// con Escape, y devolver el foco a lo que lo tenía antes al cerrar.
// `closeDisabled` frena el cierre por Escape mientras hay un submit en
// curso — mismo criterio que ya usa el botón "Cancelar" en cada modal.
export function useModalAlly(
  isOpen: boolean,
  onClose: () => void,
  closeDisabled = false,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  // Mantiene las refs al día sin disparar de nuevo el efecto principal
  // (que solo debe correr en la transición abierto/cerrado, no en cada
  // render) — mutar un ref durante el render rompe las garantías que
  // asume el React Compiler, así que esto vive en su propio efecto.
  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  });

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const first = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0];
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (closeDisabledRef.current) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !container) return;

      const items = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}
