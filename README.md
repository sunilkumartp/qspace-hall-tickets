# QSpace Hall Ticket Generator

A premium, fast, completely browser-based application built for QSPACe Academy to generate thousands of PDF Hall Tickets from Excel data seamlessly.

## Features

- **Import Excel Data**: Upload your student data from `.xlsx`, `.xls`, or `.csv`.
- **Intelligent Parsing**: Automatically formats `Date` to exact required standards (e.g., `Sunday, 07 December 2025`) and standardizes Class & Division labels.
- **Student Roster**: An elegant interface to manage, select, and view imported students.
- **Quick Edit**: Inline editing of student data directly from the roster via an interactive modal to ensure accurate details.
- **Status Tracking**: Keep track of which tickets have been generated along with precise timestamps using an internal local database (IndexedDB via Dexie).
- **Pixel-Perfect A4 PDFs**: Utilizes off-screen DOM rendering to generate exact replicas of the official QSPACe Academy Hall Ticket design perfectly scaled to A4 standard dimensions.

## Tech Stack

- **Framework**: React 18 & Vite
- **Styling**: Vanilla CSS with modern Glassmorphism aesthetics
- **Database**: IndexedDB (using `dexie` and `dexie-react-hooks`)
- **PDF Engine**: `html2canvas` and `jsPDF`
- **Excel Parsing**: `xlsx`

## Getting Started

Because this application utilizes an internal browser database (IndexedDB), there is no backend server required. All generation happens securely on your local machine.

### Prerequisites
Make sure you have Node.js installed.

### Installation

1. Clone or download the repository.
2. Install the dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the development server:
```bash
npm run dev
```

Open your browser to `http://localhost:5173`.

### Production Build

To build the application for production deployment (e.g., Vercel, Netlify, or a standard web server):
```bash
npm run build
```
The optimized files will be located in the `dist` directory.

## Usage Guide

1. **Upload**: Drag and drop your `.xlsx` file onto the upload zone.
2. **Review & Edit**: Review the list of students. Click the pencil icon to fix any typos in names, dates, or school information.
3. **Generate**: Select one, multiple, or all students using the checkboxes, and click the **Generate** button.
4. **Download**: The application will automatically process the designs and trigger a download of the PDF file containing your hall tickets. The UI will then update to indicate generation timestamps.

## Database Information
All data is stored purely within the browser's IndexedDB. Clearing site data/cache in your browser will erase the import history and generation status.
