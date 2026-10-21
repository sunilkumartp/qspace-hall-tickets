import { jsPDF } from 'jspdf';

/**
 * Parses time strings (e.g. "9:00 AM", "11:30 AM", "2:30 PM", "9.30 am", "14:30")
 * into minutes from midnight for chronological comparison.
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const str = timeStr.trim().toLowerCase();

  const match = str.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (meridiem === 'pm') {
    if (hours < 12) hours += 12;
  } else if (meridiem === 'am') {
    if (hours === 12) hours = 0;
  }

  return hours * 60 + minutes;
};

/**
 * Derives example 'from' and 'to' slots matching the custom examination timeslots,
 * ensuring that 'to' time is strictly greater (later in the day) than 'from' time.
 */
export const getExampleTimingSlots = (validSlots) => {
  if (!validSlots || validSlots.length === 0) {
    return { egFrom: '11:30 AM', egTo: '2:30 PM' };
  }

  const parsedSlots = validSlots
    .map((slot, index) => ({
      slot: String(slot).trim(),
      index,
      minutes: parseTimeToMinutes(slot)
    }))
    .filter(s => Boolean(s.slot));

  if (parsedSlots.length === 0) {
    return { egFrom: '11:30 AM', egTo: '2:30 PM' };
  }

  // Sort ascending by time in minutes (if parseable), preserving relative order otherwise
  const sorted = [...parsedSlots].sort((a, b) => {
    if (a.minutes !== null && b.minutes !== null) {
      return a.minutes - b.minutes;
    }
    if (a.minutes !== null) return -1;
    if (b.minutes !== null) return 1;
    return a.index - b.index;
  });

  if (sorted.length === 1) {
    return { egFrom: sorted[0].slot, egTo: sorted[0].slot };
  }

  // If there are 3 or more slots, prefer index 1 and index 2 (e.g. 11:30 AM to 2:30 PM)
  // as long as sorted[2] > sorted[1]
  if (sorted.length >= 3) {
    const slotFrom = sorted[1];
    const slotTo = sorted[2];
    if (
      slotFrom.minutes !== null &&
      slotTo.minutes !== null &&
      slotTo.minutes > slotFrom.minutes
    ) {
      return { egFrom: slotFrom.slot, egTo: slotTo.slot };
    }
  }

  // Find the first pair (i, j) where j > i and sorted[j].minutes > sorted[i].minutes
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (
        sorted[i].minutes !== null &&
        sorted[j].minutes !== null &&
        sorted[j].minutes > sorted[i].minutes
      ) {
        return { egFrom: sorted[i].slot, egTo: sorted[j].slot };
      }
    }
  }

  // Fallback: take first and second slots if times cannot be parsed
  return { egFrom: sorted[0].slot, egTo: sorted[1].slot };
};

export const generateHallTicket = async (students, options = {}) => {
  const { onProgress, signal, slots } = options;
  
  if (!students || students.length === 0) {
    throw new Error("No students provided.");
  }

  // If slots is provided (even if []), use it; otherwise default to the standard 3 slots
  const rawSlots = slots !== undefined ? slots : ['9:00 AM', '11:30 AM', '2:30 PM'];
  const validSlots = Array.isArray(rawSlots)
    ? rawSlots.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : [];
  
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

    // Support per-student custom slots if present, or fallback to batch slots
    const studentRawSlots = student.slots !== undefined 
      ? student.slots 
      : (student.examinationSlots !== undefined ? student.examinationSlots : rawSlots);
    const currentSlots = Array.isArray(studentRawSlots)
      ? studentRawSlots.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
      : [];

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
    
    y += 20;

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
    y += 7;

    // Helper for Section Header
    const drawSectionHeader = (title, currentY) => {
      pdf.setFillColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.rect(MARGIN + 7, currentY - 3.5, 0.8, 4.5, 'F');
      pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.2);
      pdf.text(title, MARGIN + 10, currentY);
      return currentY + 5.8;
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
    const venueExtraHeight = Math.max(0, (venueLines.length - 1) * 4.4);
    
    pdf.roundedRect(MARGIN + 7, y, CONTENT_W - 14, 35 + venueExtraHeight, 1.5, 1.5, 'FD');
    
    y += 6.8;
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
      
      y += 6.4 + ((splitVal.length - 1) * 4.4);
    };

    drawDetailRow("Student Name:", student.name, true, [PRIMARY_R, PRIMARY_G, PRIMARY_B]);
    drawDetailRow("Class & Division:", student.classDivision);
    drawDetailRow("Date of Exam:", student.date);
    drawDetailRow("Reporting Time:", student.time);
    drawDetailRow("Exam Venue:", student.venue);

    y += 0.8;
    pdf.setTextColor(119, 119, 119);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7.8);
    pdf.text("Round 2 of BrainWave contest will be conducted at Venue as mentioned above. For any information kindly contact:", MARGIN + 7, y);
    y += 4.0;
    pdf.text("9846970100 / 7511180100 / 9745370100", MARGIN + 7, y);
    y += 7.5;

    // --- Section 2: Parent Confirmation ---
    y = drawSectionHeader("PARENT CONFIRMATION – (PARENTS TO FILL THIS SECTION)", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.2);
    pdf.text("I confirm my child's participation in Brainwave Contest 2026 – Round 2.", MARGIN + 7, y);
    y += 6.0;

    const drawFormRow = (label) => {
      pdf.setTextColor(85, 85, 85);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.2);
      pdf.text(label, MARGIN + 7, y);
      
      // Fine Dotted line matching reference
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.setLineDashPattern([1, 1.5], 0);
      pdf.line(MARGIN + 44, y, WIDTH - MARGIN - 7, y);
      pdf.setLineDashPattern([], 0); // Reset dash
      y += 6.5;
    };

    drawFormRow("Student Name:");
    drawFormRow("Class & Division:");
    drawFormRow("School:");
    drawFormRow("Parent Name:");
    drawFormRow("Mobile Number:");
    drawFormRow("WhatsApp Number:");
    
    y += 3.5;

    // --- Section 3: Important Instructions ---
    y = drawSectionHeader("IMPORTANT INSTRUCTIONS", y);
    pdf.setTextColor(74, 74, 74);
    pdf.setFontSize(9.2);
    
    const drawMixedInstruction = (yPos, parts, hasBullet = true) => {
      if (hasBullet) {
        pdf.setFillColor(100, 100, 100);
        pdf.circle(MARGIN + 9, yPos - 1.2, 0.48, 'F');
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
    y += 5.5;

    // Line 2 wraps, but has no bold
    pdf.setFillColor(100, 100, 100);
    pdf.circle(MARGIN + 9, y - 1.2, 0.48, 'F');
    pdf.setFont("helvetica", "normal");
    const inst2 = "Students must carry school ID Card, writing board, pencil, eraser and sharpener. Other materials will be provided by the organizers.";
    const lines2 = pdf.splitTextToSize(inst2, CONTENT_W - 18);
    pdf.text(lines2, MARGIN + 12, y);
    y += lines2.length * 4.6 + 2.0;

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
      { text: "Round 1 winner certificates will be provided to all participants.", bold: false }
    ]);
    y += 6.5;

    // --- Examination Slots & Timing Change Notice ---
    if (currentSlots.length > 0) {
      const slotParts = [
        { text: "The available examination slots are : ", bold: false }
      ];
      currentSlots.forEach((slot, idx) => {
        if (idx > 0) {
          slotParts.push({ text: "   |   ", bold: false, color: [140, 140, 140] });
        }
        slotParts.push({ text: slot, bold: true, color: [PRIMARY_R, PRIMARY_G, PRIMARY_B] });
      });

      // Check if slotParts fit on one line or need splitting
      pdf.setFontSize(9.2);
      let totalSlotWidth = 0;
      slotParts.forEach(p => {
        pdf.setFont("helvetica", p.bold ? "bold" : (p.italic ? "italic" : "normal"));
        totalSlotWidth += pdf.getTextWidth(p.text);
      });

      const maxLineW = CONTENT_W - 14;
      if (totalSlotWidth <= maxLineW) {
        drawMixedInstruction(y, slotParts);
        y += 5.8;
      } else {
        drawMixedInstruction(y, [
          { text: "The available examination slots are : ", bold: false }
        ]);
        y += 5.0;
        let slotX = MARGIN + 14;
        currentSlots.forEach((slot, idx) => {
          if (idx > 0) {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(140, 140, 140);
            pdf.text("   |   ", slotX, y);
            slotX += pdf.getTextWidth("   |   ");
          }
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
          pdf.text(slot, slotX, y);
          slotX += pdf.getTextWidth(slot);
        });
        y += 5.8;
      }

      // Timing change notice
      pdf.setFillColor(100, 100, 100);
      pdf.circle(MARGIN + 9, y - 1.2, 0.48, 'F');
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(74, 74, 74);
      const slotNotice = "If the examination timing mentioned in this Hall Ticket is not convenient, you may request a change to any of the above available slots.";
      const slotNoticeLines = pdf.splitTextToSize(slotNotice, CONTENT_W - 18);
      pdf.text(slotNoticeLines, MARGIN + 12, y);
      y += slotNoticeLines.length * 4.6 + 2.0;

      // To request a change:
      drawMixedInstruction(y, [
        { text: "To request a change:", bold: true }
      ]);
      y += 5.0;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(74, 74, 74);
      const reqNotice = "Send a WhatsApp message to any of the numbers mentioned below, in the following format:";
      const reqNoticeLines = pdf.splitTextToSize(reqNotice, CONTENT_W - 20);
      pdf.text(reqNoticeLines, MARGIN + 14, y);
      y += reqNoticeLines.length * 4.6 + 2.0;

      // Format line
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
      pdf.text("<Name of Child> – Change timing from <Current Time> to <Required Time>", MARGIN + 14, y);
      y += 5.5;

      // Example
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(74, 74, 74);
      pdf.text("Example:", MARGIN + 14, y);
      y += 4.8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 51, 51);
      const { egFrom, egTo } = getExampleTimingSlots(currentSlots);
      pdf.text(`Ananya – Change timing from ${egFrom} to ${egTo}`, MARGIN + 14, y);
      y += 5.5;
    }

    // Force banner to dock near the bottom border with comfortable breathing room
    const bannerY = Math.max(y + 6, HEIGHT - MARGIN - 18);

    // --- Bottom Banner ---
    pdf.setFillColor(242, 249, 255); // Much lighter background
    pdf.setDrawColor(170, 200, 255);
    pdf.setLineWidth(0.2); // Finer dotted line
    pdf.setLineDashPattern([0.8, 1.2], 0); // Finer dash pattern
    pdf.roundedRect(MARGIN + 7, bannerY, CONTENT_W - 14, 10.5, 1.5, 1.5, 'FD');
    pdf.setLineDashPattern([], 0); // Reset dash
    
    pdf.setTextColor(PRIMARY_R, PRIMARY_G, PRIMARY_B);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    const bannerText = "Please fill this form and send an image as WhatsApp to 9778137470 or 9846970100 and confirm your child's participation for the 2nd Round of Brainwave Contest.";
    const bannerLines = pdf.splitTextToSize(bannerText, CONTENT_W - 20);
    pdf.text(bannerLines, WIDTH / 2, bannerY + 4.2, { align: 'center' });
  }
  
  if (signal?.aborted) throw new Error('Generation cancelled');

  if (options.returnDoc) {
    return pdf;
  }

  const fileName = students.length === 1 
    ? `HallTicket_${students[0].name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    : `HallTickets_Batch_${new Date().getTime()}.pdf`;
    
  pdf.save(fileName);
};
