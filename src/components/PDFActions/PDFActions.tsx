import React, { useRef } from 'react';
import { Button, Group } from '@mantine/core';
import { IconPrinter, IconDownload } from '@tabler/icons-react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { useDeganoCtx } from '@/context/DeganoContext';
import {
  PrintableMainSection,
  PrintableBandsSection,
  PrintableMusicSection,
  PrintableMoreInfoSection,
  PrintableEquipmentSection,
  PrintableFilesSection,
  PrintablePaymentsSection
} from '../PrintableSections';

interface PDFActionsProps {
  sectionKey: string;
  children: React.ReactNode;
  eventTitle?: string;
}

const PDFActions: React.FC<PDFActionsProps> = ({
  sectionKey,
  children,
  eventTitle
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
      payments: <PrintablePaymentsSection event={selectedEvent} />
    };

    return components[sectionKey as keyof typeof components] || null;
  };

  const getSectionTitle = (sectionKey: string): string => {
    const titles: Record<string, string> = {
      main: 'Información Principal',
      bands: 'Banda en vivo',
      music: 'Música',
      moreInfo: 'Más Información',
      equipment: 'Equipos',
      files: 'Archivos',
      payments: 'Historial de Pagos'
    };

    return titles[sectionKey] || sectionKey;
  };

  const handlePrint = async () => {
    const component = getPrintableComponent();
    if (component) {
      const blob = await pdf(component).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const getFilename = () => {
    const sectionTitle = getSectionTitle(sectionKey);
    const baseFilename = eventTitle
      ? `${eventTitle}_${sectionTitle}`.replace(/[^a-zA-Z0-9]/g, '_')
      : sectionTitle.replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseFilename}.pdf`;
  };

  const printableComponent = getPrintableComponent();

  return (
    <div>
      <Group justify='flex-end' my='md'>
        <Button
          variant='outline'
          size='xs'
          leftSection={<IconPrinter size={16} />}
          onClick={handlePrint}
          disabled={!printableComponent}
        >
          Imprimir
        </Button>
        {printableComponent && (
          <PDFDownloadLink
            document={printableComponent}
            fileName={getFilename()}
          >
            {({ loading }) => (
              <Button
                variant='outline'
                size='xs'
                leftSection={<IconDownload size={16} />}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Guardar PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </Group>
      <div>{children}</div>
    </div>
  );
};

export default PDFActions;
