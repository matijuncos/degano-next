import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (
  element: HTMLElement,
  filename: string,
  title?: string
) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, 20);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
    }

    // Calculate starting Y position
    const startY = title ? 30 : 20;

    // Add image
    pdf.addImage(imgData, 'PNG', 0, startY, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(`${filename}.pdf`);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

export const printSection = async (element: HTMLElement, title?: string) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add title if provided
    if (title) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, 20);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
    }

    // Calculate starting Y position
    const startY = title ? 30 : 20;

    // Add image
    pdf.addImage(imgData, 'PNG', 0, startY, imgWidth, imgHeight);

    // Open in new window for printing
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl);

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    return true;
  } catch (error) {
    console.error('Error printing section:', error);
    return false;
  }
};

export const getSectionTitle = (sectionKey: string): string => {
  const titles: Record<string, string> = {
    main: 'Información Principal',
    client: 'Información de Música',
    equipment: 'Equipos',
    timing: 'Timing',
    moreInfo: 'Más Información',
    files: 'Archivos',
    payments: 'Historial de Pagos'
  };

  return titles[sectionKey] || sectionKey;
};
