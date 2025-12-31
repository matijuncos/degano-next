import React from 'react';
import { Button, Group } from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import { pdf } from '@react-pdf/renderer';
import { useDeganoCtx } from '@/context/DeganoContext';
import {
  PrintableMainSection,
  PrintableBandsSection,
  PrintableMusicSection,
  PrintableMoreInfoSection,
  PrintableEquipmentSection,
  PrintableFilesSection,
  PrintablePaymentsSection,
  PrintableTimingSection
} from '../PrintableSections';
import PrintableFullEventSection from '../PrintableSections/PrintableFullEventSection';

interface PDFActionsProps {
  sectionKey: string;
  children: React.ReactNode;
  eventTitle?: string;
  showFullEventButton?: boolean;
  isAdmin?: boolean;
}

const PDFActions: React.FC<PDFActionsProps> = ({
  sectionKey,
  children,
  eventTitle,
  showFullEventButton = false,
  isAdmin = false
}) => {
  const { selectedEvent } = useDeganoCtx();

  const getPrintableComponent = () => {
    if (!selectedEvent) return null;

    const components = {
      main: <PrintableMainSection event={selectedEvent} />,
      bands: <PrintableBandsSection event={selectedEvent} />,
      music: <PrintableMusicSection event={selectedEvent} />,
      moreInfo: <PrintableMoreInfoSection event={selectedEvent} />,
      equipment: <PrintableEquipmentSection event={selectedEvent} />,
      files: <PrintableFilesSection event={selectedEvent} />,
      payments: <PrintablePaymentsSection event={selectedEvent} />,
      timing: <PrintableTimingSection event={selectedEvent} />
    };

    return components[sectionKey as keyof typeof components] || null;
  };

  const handlePrint = async () => {
    const component = getPrintableComponent();
    if (component) {
      const blob = await pdf(component).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url);
    }
  };

  const handlePrintFullEvent = async () => {
    if (!selectedEvent) return;

    const fullEventComponent = (
      <PrintableFullEventSection event={selectedEvent} />
    );

    const blob = await pdf(fullEventComponent).toBlob();
    const url = URL.createObjectURL(blob);

    // Abrir el PDF directamente en una nueva ventana
    const printWindow = window.open(url, '_blank');

    if (printWindow) {
      // Intentar disparar la impresión automáticamente cuando la ventana se cargue
      printWindow.onload = function() {
        setTimeout(function() {
          printWindow.print();
        }, 1000);
      };
    }
  };

  const printableComponent = getPrintableComponent();

  return (
    <div>
      <Group justify='flex-end' my='md'>
        {showFullEventButton && (
          <Button
            variant='filled'
            color='green'
            size='xs'
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrintFullEvent}
            disabled={!selectedEvent}
          >
            Imprimir evento completo
          </Button>
        )}
        <Button
          variant='outline'
          size='xs'
          leftSection={<IconPrinter size={16} />}
          onClick={handlePrint}
          disabled={!printableComponent}
        >
          Imprimir hoja
        </Button>
      </Group>
      <div>{children}</div>
    </div>
  );
};

export default PDFActions;
