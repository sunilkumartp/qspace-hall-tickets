import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export const generateHallTicket = async (students, options = {}) => {
  const { onProgress, signal } = options;
  const container = document.getElementById('pdf-render-container');
  if (!container) throw new Error("PDF render container not found in DOM");
  
  // Give React a moment to render the newly selected students into the hidden container
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (signal?.aborted) throw new Error('Generation cancelled');

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
    if (signal?.aborted) throw new Error('Generation cancelled');
    
    if (onProgress) {
      onProgress(i + 1, pages.length);
    }

    const page = pages[i];
    
    // Generate canvas with fixed A4 pixel width to prevent narrowing
    const canvas = await html2canvas(page, {
      scale: 2,             // High resolution for crisp text
      useCORS: true,
      logging: false,
      width: A4_WIDTH_PX,   // Force exact A4 width capture
      windowWidth: A4_WIDTH_PX, // Simulate a viewport of exactly A4 width
    });
    
    if (signal?.aborted) throw new Error('Generation cancelled');

    const imgData = canvas.toDataURL('image/png');
    
    if (i > 0) {
      pdf.addPage();
    }
    
    // Fill the full A4 page (210mm x 297mm)
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  }
  
  if (signal?.aborted) throw new Error('Generation cancelled');

  const fileName = students.length === 1 
    ? `HallTicket_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `HallTickets_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
