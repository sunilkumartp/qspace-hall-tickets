import React, { forwardRef } from 'react';

// The Exact Template to perfectly match the PDF
export const HallTicketTemplate = forwardRef(({ students }, ref) => {
  if (!students || students.length === 0) return null;

  return (
    <div ref={ref} style={{ backgroundColor: 'white' }}>
      {students.map((student, idx) => (
        <div 
          key={student.id} 
          className="pdf-page"
          style={{ 
            width: '210mm', 
            minHeight: '297mm', // A4
            padding: '25mm', // margin matching PDF
            boxSizing: 'border-box',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            pageBreakAfter: idx < students.length - 1 ? 'always' : 'auto',
            position: 'relative'
          }}
        >
          {/* Main Container with Blue Border */}
          <div style={{
            border: '2px solid #3b6fae',
            borderRadius: '12px',
            padding: '18px 24px',
            height: '100%',
            boxSizing: 'border-box'
          }}>
            
            {/* Header */}
            <div style={{
              backgroundColor: '#3b6fae',
              color: 'white',
              textAlign: 'center',
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                HALL TICKET – BRAINWAVE CONTEST 2026 (ROUND 2)
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Organized by QSPACe Academy
              </p>
            </div>

            {/* Subheader */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e0e0e0', paddingBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: '#4a4a4a', fontSize: '15px' }}>
                Issued To: <span style={{ color: '#333' }}>{student.school}</span>
              </div>
              <div style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '6px', backgroundColor: '#4caf50', color: 'white', padding: '1px 4px', borderRadius: '3px', fontSize: '12px' }}>✓</span> 
                Congratulations...!!
              </div>
            </div>

            {/* Section 1: Student Details */}
            <SectionHeader title="STUDENT DETAILS" />
            <div style={{ 
              backgroundColor: '#f9fbfd', 
              border: '1px solid #eef5ff', 
              borderRadius: '6px', 
              padding: '20px',
              marginBottom: '16px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  <DetailRow label="Student Name:" value={student.name} valueColor="#3b6fae" isBold={true} />
                  <DetailRow label="Class & Division:" value={student.classDivision} />
                  <DetailRow label="Date of Exam:" value={student.date} />
                  <DetailRow label="Reporting Time:" value={student.time} />
                  <DetailRow label="Exam Venue:" value={student.venue} />
                </tbody>
              </table>
            </div>

            <p style={{ fontStyle: 'italic', color: '#777', fontSize: '12px', marginBottom: '24px' }}>
              Round 2 of BrainWave contest will be conducted at Venue as mentioned above. For any information kindly contact:<br/>
              9846970100 / 7511180100 / 9745370100
            </p>

            {/* Section 2: Parent Confirmation */}
            <SectionHeader title="PARENT CONFIRMATION – (PARENTS TO FILL THIS SECTION)" />
            <p style={{ fontSize: '14px', color: '#4a4a4a', marginBottom: '16px' }}>
              I confirm my child's participation in Brainwave Contest 2026 – Round 2.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <FormRow label="Student Name:" />
              <FormRow label="Class & Division:" />
              <FormRow label="School:" />
              <FormRow label="Parent Name:" />
              <FormRow label="Mobile Number:" />
              <FormRow label="WhatsApp Number:" />
            </div>

            {/* Section 3: Important Instructions */}
            <SectionHeader title="IMPORTANT INSTRUCTIONS" />
            <ul style={{ 
              fontSize: '13.5px', 
              color: '#4a4a4a', 
              paddingLeft: '20px', 
              lineHeight: '1.6',
              marginBottom: '24px',
              listStyleType: 'disc'
            }}>
              <li style={{ marginBottom: '8px' }}>Students shall bring this <strong>HALL TICKET</strong> to the exam venue.</li>
              <li style={{ marginBottom: '8px' }}>Students must carry school ID Card, writing board, pencil, eraser and sharpener. Other materials will be provided by the organizers.</li>
              <li style={{ marginBottom: '8px' }}>There is <strong>NO participation fee</strong> for any round.</li>
              <li style={{ marginBottom: '8px' }}>Winners of Round 2 will qualify for the State Finals and receive certificates & trophies.</li>
              <li style={{ marginBottom: '8px' }}>Certificates will be provided to all participants.</li>
            </ul>

            {/* Bottom Banner */}
            <div style={{
              backgroundColor: '#eef5ff',
              border: '1px solid #cce0ff',
              color: '#3b6fae',
              textAlign: 'center',
              padding: '16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Please fill this form and send an image as WhatsApp to 9778137470 or 9846970100 and confirm your child's participation for the 2nd Round of Brainwave Contest.
            </div>

          </div>
          
          {/* Page Number (bottom right inside print bounds) */}
          <div style={{ position: 'absolute', bottom: '10mm', right: '25mm', fontSize: '11px', color: '#999' }}>
            Page 1
          </div>
        </div>
      ))}
    </div>
  );
});

const SectionHeader = ({ title }) => (
  <h2 style={{ 
    fontSize: '16px', 
    fontWeight: 'bold', 
    color: '#3b6fae', 
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center'
  }}>
    <div style={{ width: '4px', height: '18px', backgroundColor: '#3b6fae', marginRight: '8px' }}></div>
    {title}
  </h2>
);

const DetailRow = ({ label, value, valueColor = '#333', isBold = false }) => (
  <tr>
    <td style={{ padding: '8px 0', width: '30%', fontWeight: '600', color: '#555', verticalAlign: 'top' }}>{label}</td>
    <td style={{ padding: '8px 0', color: valueColor, fontWeight: isBold ? 'bold' : 'normal', verticalAlign: 'top' }}>{value}</td>
  </tr>
);

const FormRow = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
    <div style={{ width: '30%', fontWeight: '600', fontSize: '14px', color: '#555' }}>{label}</div>
    <div style={{ width: '70%', borderBottom: '1px dotted #ccc', height: '20px' }}></div>
  </div>
);
