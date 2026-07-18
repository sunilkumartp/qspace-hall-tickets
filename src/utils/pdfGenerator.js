import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generateHallTicket = async (students) => {
  const container = document.getElementById('pdf-render-container');
  if (!container) throw new Error("PDF render container not found in DOM");
  
  // Give React a moment to render the newly selected students into the hidden container
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const pages = Array.from(container.querySelectorAll('.pdf-page'));
  
  if (pages.length === 0) {
    throw new Error("No pages found to render.");
  }
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // Generate canvas
    const canvas = await html2canvas(page, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    if (i > 0) {
      pdf.addPage();
    }
    
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    // 210mm x 297mm A4 size approx
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  }
  
  const fileName = students.length === 1 
    ? `HallTicket_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `HallTickets_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
