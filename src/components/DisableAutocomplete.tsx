'use client';
import { useEffect } from 'react';

/**
 * Componente que desactiva el autocomplete del navegador en todos los inputs
 * No afecta los componentes Select/Autocomplete de Mantine
 *
 * Chrome ignora autocomplete="off" en muchos casos, por eso usamos técnicas más agresivas
 */
export default function DisableAutocomplete() {
  useEffect(() => {
    // Desactivar autocomplete en todos los formularios
    const disableFormAutocomplete = () => {
      const forms = document.querySelectorAll('form');
      forms.forEach((form) => {
        form.setAttribute('autocomplete', 'off');
      });
    };

    // Función para agregar autocomplete="off" a inputs relevantes
    const disableAutocomplete = () => {
      // Primero, desactivar en formularios
      disableFormAutocomplete();

      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="search"], input[type="url"], textarea'
      );

      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;

        // Verificar si es un input de Mantine Select/Autocomplete (estos tienen role="combobox")
        const isMantineSelect = htmlInput.getAttribute('role') === 'combobox' ||
                                htmlInput.closest('[role="combobox"]') !== null;

        // No modificar inputs de Select/Autocomplete de Mantine
        if (isMantineSelect) {
          return;
        }

        // Chrome respeta mejor "nope" o valores aleatorios que "off"
        // También "new-password" funciona bien
        htmlInput.setAttribute('autocomplete', 'nope');

        // Atributos adicionales para Safari y Chrome
        htmlInput.setAttribute('data-form-type', 'other');
        htmlInput.setAttribute('data-lpignore', 'true'); // Para LastPass y otros gestores

        // Readonly trick: Chrome no sugiere en campos readonly
        // Lo activamos brevemente y luego lo quitamos
        if (!htmlInput.readOnly) {
          htmlInput.setAttribute('readonly', 'readonly');
          setTimeout(() => {
            htmlInput.removeAttribute('readonly');
          }, 100);
        }
      });
    };

    // Ejecutar múltiples veces para asegurar que capture inputs dinámicos
    disableAutocomplete();
    setTimeout(disableAutocomplete, 100);
    setTimeout(disableAutocomplete, 300);
    setTimeout(disableAutocomplete, 1000);

    // Observar cambios en el DOM para inputs dinámicos
    const observer = new MutationObserver(() => {
      disableAutocomplete();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // También ejecutar cuando el usuario hace focus en un input
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const isMantineSelect = target.getAttribute('role') === 'combobox' ||
                                target.closest('[role="combobox"]') !== null;
        if (!isMantineSelect) {
          target.setAttribute('autocomplete', 'nope');
        }
      }
    };

    document.addEventListener('focus', handleFocus, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);

  return null;
}
