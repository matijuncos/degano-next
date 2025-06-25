import React, { useRef } from 'react';
import { Button, Group, Text } from '@mantine/core';
import { IconPrinter, IconDownload } from '@tabler/icons-react';
import { generatePDF, printSection, getSectionTitle } from '@/utils/pdfUtils';

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
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    if (contentRef.current) {
      const sectionTitle = getSectionTitle(sectionKey);
      const fullTitle = eventTitle
        ? `${eventTitle} - ${sectionTitle}`
        : sectionTitle;
      await printSection(contentRef.current, fullTitle);
    }
  };

  const handleSave = async () => {
    if (contentRef.current) {
      const sectionTitle = getSectionTitle(sectionKey);
      const filename = eventTitle
        ? `${eventTitle}_${sectionTitle}`.replace(/[^a-zA-Z0-9]/g, '_')
        : sectionTitle.replace(/[^a-zA-Z0-9]/g, '_');
      await generatePDF(contentRef.current, filename, sectionTitle);
    }
  };

  return (
    <div>
      <Group justify='flex-end' my='md'>
        <Button
          variant='outline'
          size='xs'
          leftSection={<IconPrinter size={16} />}
          onClick={handlePrint}
        >
          Imprimir
        </Button>
        <Button
          variant='outline'
          size='xs'
          leftSection={<IconDownload size={16} />}
          onClick={handleSave}
        >
          Guardar PDF
        </Button>
      </Group>
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export default PDFActions;
