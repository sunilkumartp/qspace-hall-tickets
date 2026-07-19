import { jsPDF } from 'jspdf';

export const generateHallTicket = async (students, options = {}) => {
  const { onProgress, signal } = options;
  
  if (!students || students.length === 0) {
    throw new Error("No students provided.");
  }
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const PRIMARY_R = 59, PRIMARY_G = 111, PRIMARY_B = 174;
  const MARGIN = 12.5;
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

    // --- Outer border ---
    pdf.setDrawColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(MARGIN, MARGIN, CONTENT_W, HEIGHT - (MARGIN * 2), 3, 3);

    // --- Header ---
    let y = MARGIN + 5;
    pdf.setFillColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.roundedRect(MARGIN + 6, y, CONTENT_W - 12, 15, 1.5, 1.5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("HALL TICKET – BRAINWAVE CONTEST 2026 (ROUND 2)", WIDTH / 2, y + 7, { align: 'center' });
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Organized by QSPACe Academy", WIDTH / 2, y + 12, { align: 'center' });
    
    y += 22;

    // --- Subheader ---
    pdf.setTextColor(74, 74, 74);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Issued To: ", MARGIN + 7, y);
    pdf.setTextColor(51, 51, 51);
    pdf.text(student.school || "", MARGIN + 25, y);
    
    // Congrats badge matching reference (green text, perfect vector tick)
    pdf.setFillColor(76, 175, 80);
    const badgeX = MARGIN + CONTENT_W - 40;
    pdf.roundedRect(badgeX, y - 3.5, 4.5, 4.5, 0.5, 0.5, 'F');
    
    // Manual vector tick for perfect rendering
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.4);
    pdf.line(badgeX + 1.2, y - 1.3, badgeX + 2.0, y - 0.3); // short leg
    pdf.line(badgeX + 2.0, y - 0.3, badgeX + 3.5, y - 2.3); // long leg
    
    pdf.setTextColor(76, 175, 80);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Congratulations...!!", badgeX + 6, y);

    y += 4.5;
    pdf.setDrawColor(224, 224, 224);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN + 7, y, WIDTH - MARGIN - 6, y);
    y += 7;

    // Helper for Section Header
    const drawSectionHeader = (title, currentY) => {
      pdf.setFillColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.rect(MARGIN + 7, currentY - 3.5, 0.8, 4.5, 'F');
      pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.5);
      pdf.text(title, MARGIN + 10, currentY);
      return currentY + 5;
    };

    // --- Section 1: Student Details ---
    y = drawSectionHeader("STUDENT DETAILS", y);
    
    pdf.setFillColor(249, 251, 253);
    pdf.setDrawColor(238, 245, 255);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN + 7, y, CONTENT_W - 14, 38, 1.5, 1.5, 'FD');
    
    y += 7.5;
    const drawDetailRow = (label, val, valBold, valColor) => {
      pdf.setTextColor(85, 85, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(label, MARGIN + 11, y);
      
      if (valColor) {
        pdf.setTextColor(valColor[0], valColor[1], valColor[2]);
      } else {
        pdf.setTextColor(51, 51, 51);
      }
      pdf.setFont("helvetica", valBold ? "bold" : "normal");
      
      const maxValWidth = CONTENT_W - 60; // 45 offset + 15 right padding
      const splitVal = pdf.splitTextToSize(val || "-", maxValWidth);
      pdf.text(splitVal, MARGIN + 45, y);
      
      y += 7.5 + ((splitVal.length - 1) * 4.5);
    };

    drawDetailRow("Student Name:", student.name, true, [PRIMARY_R, PRIMARY_G, PRIMARY_B]);
    drawDetailRow("Class & Division:", student.classDivision);
    drawDetailRow("Date of Exam:", student.date);
    drawDetailRow("Reporting Time:", student.time);
    drawDetailRow("Exam Venue:", student.venue);

    y += 1;
    pdf.setTextColor(119, 119, 119);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.text("Round 2 of BrainWave contest will be conducted at Venue as mentioned above. For any information kindly contact:", MARGIN + 7, y);
    y += 4.5;
    pdf.text("9846970100 / 7511180100 / 9745370100", MARGIN + 7, y);
    y += 10;

    // --- Section 2: Parent Confirmation ---
    y = drawSectionHeader("PARENT CONFIRMATION – (PARENTS TO FILL THIS SECTION)", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text("I confirm my child's participation in Brainwave Contest 2026 – Round 2.", MARGIN + 7, y);
    y += 9;

    const drawFormRow = (label) => {
      pdf.setTextColor(85, 85, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(label, MARGIN + 7, y);
      
      // Fine Dotted line matching reference
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.setLineDashPattern([0.5, 1.5], 0);
      pdf.line(MARGIN + 36, y, WIDTH - MARGIN - 7, y);
      pdf.setLineDashPattern([], 0); // Reset dash
      y += 8.5;
    };

    drawFormRow("Student Name:");
    drawFormRow("Class & Division:");
    drawFormRow("School:");
    drawFormRow("Parent Name:");
    drawFormRow("Mobile Number:");
    drawFormRow("WhatsApp Number:");
    
    y += 3;

    // --- Section 3: Important Instructions ---
    y = drawSectionHeader("IMPORTANT INSTRUCTIONS", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFontSize(9.5);
    
    const drawMixedInstruction = (yPos, parts) => {
      pdf.setFillColor(100, 100, 100);
      pdf.circle(MARGIN + 9, yPos - 1.2, 0.5, 'F');
      
      let currentX = MARGIN + 12;
      parts.forEach(part => {
        pdf.setFont("helvetica", part.bold ? "bold" : "normal");
        pdf.setTextColor(74, 74, 74);
        pdf.text(part.text, currentX, yPos);
        currentX += pdf.getTextWidth(part.text);
      });
    };

    drawMixedInstruction(y, [
      { text: "Students shall bring this ", bold: false },
      { text: "HALL TICKET", bold: true },
      { text: " to the exam venue.", bold: false }
    ]);
    y += 5.5;

    // Line 2 wraps, but has no bold
    pdf.setFillColor(100, 100, 100);
    pdf.circle(MARGIN + 9, y - 1.2, 0.5, 'F');
    pdf.setFont("helvetica", "normal");
    const inst2 = "Students must carry school ID Card, writing board, pencil, eraser and sharpener. Other materials will be provided by the organizers.";
    const lines2 = pdf.splitTextToSize(inst2, CONTENT_W - 18);
    pdf.text(lines2, MARGIN + 12, y);
    y += lines2.length * 5.5 + 2; // Added gap below this block

    drawMixedInstruction(y, [
      { text: "There is ", bold: false },
      { text: "NO participation fee", bold: true },
      { text: " for any round.", bold: false }
    ]);
    y += 5.5;

    drawMixedInstruction(y, [
      { text: "Winners of Round 2 will qualify for the State Finals and receive certificates & trophies.", bold: false }
    ]);
    y += 5.5;

    drawMixedInstruction(y, [
      { text: "Certificates will be provided to all participants.", bold: false }
    ]);

    y += 7.5;

    // --- Bottom Banner ---
    pdf.setFillColor(230, 242, 255);
    pdf.setDrawColor(190, 215, 255);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(MARGIN + 7, y, CONTENT_W - 14, 11, 1.5, 1.5, 'FD');
    
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    const bannerText = "Please fill this form and send an image as WhatsApp to 9778137470 or 9846970100 and confirm your child's participation for the 2nd Round of Brainwave Contest.";
    const bannerLines = pdf.splitTextToSize(bannerText, CONTENT_W - 20);
    pdf.text(bannerLines, WIDTH / 2, y + 4.5, { align: 'center' });
  }
  
  if (signal?.aborted) throw new Error('Generation cancelled');

  const fileName = students.length === 1 
    ? `HallTicket_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `HallTickets_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
