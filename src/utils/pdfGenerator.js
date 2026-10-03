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
    let y = MARGIN + 4.5;
    pdf.setFillColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.roundedRect(MARGIN + 6, y, CONTENT_W - 12, 14.5, 1.5, 1.5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13.5);
    pdf.text("HALL TICKET – BRAINWAVE CONTEST 2026 (ROUND 2)", WIDTH / 2, y + 6.5, { align: 'center' });
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text("Organized by QSPACe Academy", WIDTH / 2, y + 11.5, { align: 'center' });
    
    y += 19.5;

    // --- Subheader ---
    pdf.setTextColor(74, 74, 74);
    pdf.setFontSize(9.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("Issued To: ", MARGIN + 7, y);
    pdf.setTextColor(51, 51, 51);
    pdf.text(student.school || "", MARGIN + 25, y);
    
    // Congrats badge perfectly right-aligned to the blue border
    pdf.setFillColor(76, 175, 80);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    const congratsText = "Congratulations...!!";
    const boxSize = 4.2;
    const boxPadding = 1.5;
    const congratsWidth = pdf.getTextWidth(congratsText);
    const badgeX = MARGIN + CONTENT_W - 6 - (boxSize + boxPadding + congratsWidth);
    pdf.roundedRect(badgeX, y - 3.2, boxSize, boxSize, 0.5, 0.5, 'F');
    
    // Manual vector tick for perfect rendering
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.4);
    pdf.line(badgeX + 1.1, y - 1.2, badgeX + 1.9, y - 0.3); // short leg
    pdf.line(badgeX + 1.9, y - 0.3, badgeX + 3.3, y - 2.1); // long leg
    
    pdf.setTextColor(76, 175, 80);
    pdf.setFontSize(9.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(congratsText, badgeX + boxSize + boxPadding, y);

    y += 4.5;
    pdf.setDrawColor(224, 224, 224);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN + 7, y, WIDTH - MARGIN - 6, y);
    y += 6.5;

    // Helper for Section Header
    const drawSectionHeader = (title, currentY) => {
      pdf.setFillColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.rect(MARGIN + 7, currentY - 3.5, 0.8, 4.5, 'F');
      pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(title, MARGIN + 10, currentY);
      return currentY + 5.5;
    };

    // --- Section 1: Student Details ---
    y = drawSectionHeader("STUDENT DETAILS", y);
    
    pdf.setFillColor(249, 251, 253);
    pdf.setDrawColor(238, 245, 255);
    pdf.setLineWidth(0.3);
    
    // Calculate dynamic height based on Exam Venue text wrapping
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const maxValWidth = CONTENT_W - 60;
    const venueLines = pdf.splitTextToSize(student.venue || "-", maxValWidth);
    const venueExtraHeight = Math.max(0, (venueLines.length - 1) * 4.2);
    
    pdf.roundedRect(MARGIN + 7, y, CONTENT_W - 14, 34 + venueExtraHeight, 1.5, 1.5, 'FD');
    
    y += 6.5;
    const drawDetailRow = (label, val, valBold, valColor) => {
      pdf.setTextColor(85, 85, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(label, MARGIN + 11, y);
      
      if (valColor) {
        pdf.setTextColor(valColor[0], valColor[1], valColor[2]);
      } else {
        pdf.setTextColor(51, 51, 51);
      }
      pdf.setFont("helvetica", valBold ? "bold" : "normal");
      pdf.setFontSize(9.5);
      
      const splitVal = pdf.splitTextToSize(val || "-", maxValWidth);
      pdf.text(splitVal, MARGIN + 44, y);
      
      y += 6.2 + ((splitVal.length - 1) * 4.2);
    };

    drawDetailRow("Student Name:", student.name, true, [PRIMARY_R, PRIMARY_G, PRIMARY_B]);
    drawDetailRow("Class & Division:", student.classDivision);
    drawDetailRow("Date of Exam:", student.date);
    drawDetailRow("Reporting Time:", student.time);
    drawDetailRow("Exam Venue:", student.venue);

    y += 0.5;
    pdf.setTextColor(119, 119, 119);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.5);
    pdf.text("Round 2 of BrainWave contest will be conducted at Venue as mentioned above. For any information kindly contact:", MARGIN + 7, y);
    y += 3.8;
    pdf.text("9846970100 / 7511180100 / 9745370100", MARGIN + 7, y);
    y += 6.5;

    // --- Section 2: Parent Confirmation ---
    y = drawSectionHeader("PARENT CONFIRMATION – (PARENTS TO FILL THIS SECTION)", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("I confirm my child's participation in Brainwave Contest 2026 – Round 2.", MARGIN + 7, y);
    y += 5.5;

    const drawFormRow = (label) => {
      pdf.setTextColor(85, 85, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(label, MARGIN + 7, y);
      
      // Fine Dotted line matching reference
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.setLineDashPattern([1, 1.5], 0);
      pdf.line(MARGIN + 44, y, WIDTH - MARGIN - 7, y);
      pdf.setLineDashPattern([], 0); // Reset dash
      y += 6.2;
    };

    drawFormRow("Student Name:");
    drawFormRow("Class & Division:");
    drawFormRow("School:");
    drawFormRow("Parent Name:");
    drawFormRow("Mobile Number:");
    drawFormRow("WhatsApp Number:");
    
    y += 2.5;

    // --- Section 3: Important Instructions ---
    y = drawSectionHeader("IMPORTANT INSTRUCTIONS", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFontSize(8.8);
    
    const drawMixedInstruction = (yPos, parts, hasBullet = true) => {
      if (hasBullet) {
        pdf.setFillColor(100, 100, 100);
        pdf.circle(MARGIN + 9, yPos - 1.1, 0.45, 'F');
      }
      
      let currentX = MARGIN + 12;
      parts.forEach(part => {
        pdf.setFont("helvetica", part.bold ? "bold" : (part.italic ? "italic" : "normal"));
        if (part.color) {
          pdf.setTextColor(part.color[0], part.color[1], part.color[2]);
        } else {
          pdf.setTextColor(74, 74, 74);
        }
        pdf.text(part.text, currentX, yPos);
        currentX += pdf.getTextWidth(part.text);
      });
    };

    drawMixedInstruction(y, [
      { text: "Students shall bring this ", bold: false },
      { text: "HALL TICKET", bold: true },
      { text: " to the exam venue.", bold: false }
    ]);
    y += 4.5;

    // Line 2 wraps, but has no bold
    pdf.setFillColor(100, 100, 100);
    pdf.circle(MARGIN + 9, y - 1.1, 0.45, 'F');
    pdf.setFont("helvetica", "normal");
    const inst2 = "Students must carry school ID Card, writing board, pencil, eraser and sharpener. Other materials will be provided by the organizers.";
    const lines2 = pdf.splitTextToSize(inst2, CONTENT_W - 18);
    pdf.text(lines2, MARGIN + 12, y);
    y += lines2.length * 4.2 + 1.2;

    drawMixedInstruction(y, [
      { text: "There is ", bold: false },
      { text: "NO participation fee", bold: true },
      { text: " for any round.", bold: false }
    ]);
    y += 4.5;

    drawMixedInstruction(y, [
      { text: "Winners of Round 2 will qualify for the State Finals and receive certificates & trophies.", bold: false }
    ]);
    y += 4.5;

    drawMixedInstruction(y, [
      { text: "Certificates will be provided to all participants.", bold: false }
    ]);
    y += 5.5;

    // --- Examination Slots & Timing Change Notice ---
    drawMixedInstruction(y, [
      { text: "Three examination slots are available:", bold: false }
    ]);
    y += 4.5;

    // Timeslots in bold
    let slotX = MARGIN + 14;
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.text("9:00 AM", slotX, y);
    slotX += pdf.getTextWidth("9:00 AM");

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(140, 140, 140);
    pdf.text("   |   ", slotX, y);
    slotX += pdf.getTextWidth("   |   ");

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.text("11:30 AM", slotX, y);
    slotX += pdf.getTextWidth("11:30 AM");

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(140, 140, 140);
    pdf.text("   |   ", slotX, y);
    slotX += pdf.getTextWidth("   |   ");

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.text("2:30 PM", slotX, y);
    y += 5.0;

    // Timing change notice
    pdf.setFillColor(100, 100, 100);
    pdf.circle(MARGIN + 9, y - 1.1, 0.45, 'F');
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(74, 74, 74);
    const slotNotice = "If the examination timing mentioned in this Hall Ticket is not convenient, you may request a change to any of the above available slots.";
    const slotNoticeLines = pdf.splitTextToSize(slotNotice, CONTENT_W - 18);
    pdf.text(slotNoticeLines, MARGIN + 12, y);
    y += slotNoticeLines.length * 4.2 + 1.2;

    // To request a change:
    drawMixedInstruction(y, [
      { text: "To request a change:", bold: true }
    ]);
    y += 4.2;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(74, 74, 74);
    const reqNotice = "Send a WhatsApp message to the same number from which this Hall Ticket was received, in the following format:";
    const reqNoticeLines = pdf.splitTextToSize(reqNotice, CONTENT_W - 20);
    pdf.text(reqNoticeLines, MARGIN + 14, y);
    y += reqNoticeLines.length * 4.2 + 1.2;

    // Format line
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.text("<Name of Child> – Change timing from <Current Time> to <Required Time>", MARGIN + 14, y);
    y += 4.5;

    // Example
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(74, 74, 74);
    pdf.text("Example:", MARGIN + 14, y);
    y += 4.0;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(51, 51, 51);
    pdf.text("Ananya – Change timing from 11:30 AM to 2:30 PM", MARGIN + 14, y);
    y += 5.5;

    // Force banner to dock near the bottom border
    y = Math.max(y + 2, HEIGHT - MARGIN - 18);

    // --- Bottom Banner ---
    pdf.setFillColor(242, 249, 255); // Much lighter background
    pdf.setDrawColor(170, 200, 255);
    pdf.setLineWidth(0.2); // Finer dotted line
    pdf.setLineDashPattern([0.8, 1.2], 0); // Finer dash pattern
    pdf.roundedRect(MARGIN + 7, y, CONTENT_W - 14, 10.5, 1.5, 1.5, 'FD');
    pdf.setLineDashPattern([], 0); // Reset dash
    
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    const bannerText = "Please fill this form and send an image as WhatsApp to 9778137470 or 9846970100 and confirm your child's participation for the 2nd Round of Brainwave Contest.";
    const bannerLines = pdf.splitTextToSize(bannerText, CONTENT_W - 20);
    pdf.text(bannerLines, WIDTH / 2, y + 4.2, { align: 'center' });
  }
  
  if (signal?.aborted) throw new Error('Generation cancelled');

  const fileName = students.length === 1 
    ? `HallTicket_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `HallTickets_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
