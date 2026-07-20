import { jsPDF } from 'jspdf';

export const generateWorkshopSlip = async (students, options = {}) => {
  const { onProgress, signal, year = '2025' } = options;
  
  if (!students || students.length === 0) {
    throw new Error("No students provided.");
  }
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const MARGIN = 15;
  const WIDTH = 210;
  const HEIGHT = 297;
  const CONTENT_W = WIDTH - (MARGIN * 2);

  // Helper wait for non-blocking UI
  const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

  for (let i = 0; i < students.length; i++) {
    if (signal?.aborted) throw new Error('Generation cancelled');
    if (onProgress) onProgress(i + 1, students.length);
    
    if (i % 10 === 0) await yieldToMain();

    if (i > 0) pdf.addPage();

    const student = students[i];
    let y = MARGIN + 10;

    // --- LOGO (Top Right Placeholder / Vector drawing) ---
    // User requested "use the logo from the PDF for now"
    // I'll draw a QSPACe-like vector logo: A blue rounded box with white 'Q' and text
    const logoSize = 18;
    const logoX = WIDTH - MARGIN - logoSize + 5; // right aligned
    pdf.setFillColor(34, 123, 192); // A rich blue color matching the logo
    pdf.roundedRect(logoX, y - 5, logoSize, logoSize, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Q", logoX + (logoSize/2), y + 4, { align: "center" });
    pdf.setFontSize(6);
    pdf.text("QSPACe", logoX + (logoSize/2), y + 10, { align: "center" });

    // --- Headers ---
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "bold");
    
    // Invitation title with underline
    pdf.setFontSize(16.5);
    const titleText = "Invitation to Competitive Skills Enrichment Workshop";
    const titleWidth = pdf.getTextWidth(titleText);
    const titleX = WIDTH / 2;
    pdf.text(titleText, titleX, y + 15, { align: 'center' });
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(titleX - (titleWidth/2), y + 16.5, titleX + (titleWidth/2), y + 16.5);

    // Subtitle
    pdf.setFont("times", "bold");
    pdf.setFontSize(14.5);
    pdf.text(`BRAINWAVE CONTEST ${year}`, WIDTH / 2, y + 23.5, { align: 'center' });
    
    // Organizer
    pdf.setFontSize(12.5);
    pdf.text("Organized by QSPACe Academy", WIDTH / 2, y + 30.5, { align: 'center' });

    y += 48;

    // --- Issued To ---
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("Issued To: ", MARGIN - 2, y);
    
    // Line for issued to
    pdf.setLineWidth(0.6);
    pdf.line(MARGIN + 20, y, WIDTH - MARGIN + 2, y);
    
    // Value for Issued To
    pdf.setFont("helvetica", "bold"); 
    pdf.setFontSize(12);
    pdf.text(student.school || "", MARGIN + 22, y - 1);
    
    y += 10;

    // Helper: Draw Checkbox Title
    const drawCheckboxTitle = (text, currentY) => {
      // Draw checkbox vector
      pdf.setDrawColor(81, 143, 206); // Light blue border
      pdf.setLineWidth(0.5);
      pdf.roundedRect(MARGIN - 2, currentY - 4, 4.5, 4.5, 0.8, 0.8, 'D');
      
      // Draw Checkmark
      pdf.setDrawColor(81, 143, 206);
      pdf.setLineWidth(0.6);
      pdf.line(MARGIN - 1.2, currentY - 1.8, MARGIN - 0.2, currentY - 0.5); // short leg
      pdf.line(MARGIN - 0.2, currentY - 0.5, MARGIN + 2.8, currentY - 4.2); // long leg

      pdf.setTextColor(81, 143, 206); // matching blue text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(text, MARGIN + 4, currentY);
      return currentY + 4;
    };

    // --- SECTION 1: STUDENT DETAILS ---
    y = drawCheckboxTitle("STUDENT DETAILS", y);
    
    // Table 1
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    
    const table1Y = y;
    const rowHeight = 7.5;
    const col1Width = 32;
    const tableWidth = CONTENT_W + 4;
    
    // Row 1
    pdf.rect(MARGIN - 2, table1Y, tableWidth, rowHeight);
    pdf.line(MARGIN - 2 + col1Width, table1Y, MARGIN - 2 + col1Width, table1Y + rowHeight);
    pdf.text("Student Name:", MARGIN, table1Y + 5);
    pdf.text(student.name || "-", MARGIN - 2 + col1Width + 2, table1Y + 5);
    
    // Row 2
    pdf.rect(MARGIN - 2, table1Y + rowHeight, tableWidth, rowHeight);
    pdf.line(MARGIN - 2 + col1Width, table1Y + rowHeight, MARGIN - 2 + col1Width, table1Y + (rowHeight * 2));
    pdf.text("Class & Division", MARGIN, table1Y + rowHeight + 5);
    pdf.text(student.classDivision || "-", MARGIN - 2 + col1Width + 2, table1Y + rowHeight + 5);
    
    y = table1Y + (rowHeight * 2) + 7;

    // Paragraph
    pdf.setFont("times", "normal");
    pdf.setFontSize(11.5);
    const paraText = `This student has attended the Round 1 of Brainwave contest ${year} conducted by QSPACe Academy. Brainwave ${year} is a unique contest designed to enhance the competitive skills of children. This student is eligible to attend a FREE Online workshop from our institution.\nFor any queries kindly contact: 9846970100 / 7511180100.`;
    const paraLines = pdf.splitTextToSize(paraText, tableWidth);
    pdf.text(paraLines, MARGIN - 2, y, { lineHeightFactor: 1.35 });
    
    y += (paraLines.length * 5) + 7;

    // --- SECTION 2: PARENT CONFIRMATION ---
    y = drawCheckboxTitle("PARENT CONFIRMATION – (Parents to fill this section)", y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "normal");
    pdf.setFontSize(11.5);
    // Bold 'Competitive Skills Enrichment Workshop.'
    pdf.text("I confirm my child's participation in the ", MARGIN - 2, y);
    pdf.setFont("times", "bold");
    const offset1 = pdf.getTextWidth("I confirm my child's participation in the ");
    pdf.text("Competitive Skills Enrichment Workshop.", MARGIN - 2 + offset1, y);
    
    y += 4;

    // Table 2
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "normal");
    pdf.setFontSize(11);
    
    const t2Rows = [
      "Student Name:",
      "Class & Division:",
      "School Name:",
      "Parent Name:",
      "Mobile Number:",
      "WhatsApp Number:"
    ];
    
    let currentY = y;
    const col21Width = 37.5;
    t2Rows.forEach(label => {
      pdf.rect(MARGIN - 2, currentY, tableWidth, rowHeight);
      pdf.line(MARGIN - 2 + col21Width, currentY, MARGIN - 2 + col21Width, currentY + rowHeight);
      pdf.text(label, MARGIN, currentY + 5);
      currentY += rowHeight;
    });

    y = currentY + 9;

    // --- SECTION 3: IMPORTANT INSTRUCTIONS ---
    y = drawCheckboxTitle("IMPORTANT INSTRUCTIONS", y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "normal");
    pdf.setFontSize(11.5);
    
    const bullets = [
      "There is no participation Fee for this workshop.",
      "Students shall attend this workshop ONLINE.",
      "Students shall login to a device to attend the workshop. Ensure proper internet \nconnectivity.",
      "The date and time of workshop shall be informed after confirming the participation."
    ];
    
    bullets.forEach(b => {
      pdf.circle(MARGIN + 2, y - 1.2, 0.6, 'F');
      const blines = pdf.splitTextToSize(b, tableWidth - 7);
      pdf.text(blines, MARGIN + 5, y, { lineHeightFactor: 1.35 });
      y += (blines.length * 5.3);
    });

    y += 4;

    // --- BOTTOM BANNER ---
    // Drop shadow simulation
    pdf.setFillColor(160, 180, 200); 
    pdf.roundedRect(MARGIN - 1, y + 1.5, tableWidth, 23, 3, 3, 'F');
    
    pdf.setFillColor(245, 248, 255);
    pdf.setDrawColor(81, 143, 206);
    pdf.setLineWidth(1.2);
    pdf.roundedRect(MARGIN - 2, y, tableWidth, 23, 3, 3, 'FD');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("times", "bold");
    pdf.setFontSize(12.5);
    
    const bannerLines = pdf.splitTextToSize(
      "Please fill this form and send an image as WhatsApp to 9778137470 or \n9846970100 and confirm your child’s participation for the FREE Online \nWorkshop.",
      tableWidth - 4
    );
    
    pdf.text(bannerLines, MARGIN - 2 + (tableWidth/2), y + 7.5, { align: 'center', lineHeightFactor: 1.45 });
  }
  
  if (signal?.aborted) throw new Error('Generation cancelled');

  const fileName = students.length === 1 
    ? `WorkshopSlip_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `WorkshopSlips_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
