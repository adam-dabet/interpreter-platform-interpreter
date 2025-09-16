const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFInvoiceService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF
   * @param {Object} jobData - Job data
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateInvoicePDF(jobData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'LETTER'
        });
        
        const filename = `invoice_${jobData.job_number || jobData.id}_${Date.now()}.pdf`;
        const filePath = path.join(this.outputDir, filename);
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);
        
        // Generate content
        this.generatePDFContent(doc, jobData);
        
        doc.end();
        
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate the actual PDF content - optimized for single page
   * @param {PDFDocument} doc - PDF document instance
   * @param {Object} jobData - Job data
   */
  generatePDFContent(doc, jobData) {
    const margin = 50;
    const pageWidth = 612;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;
    const lineHeight = 14;
    const sectionSpacing = 15;
    
    // Calculate total amount - use existing value from billing info
    const totalAmount = jobData.total_amount || jobData.billed_amount || 0;
    
    // Header with styling
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('INVOICE', margin, yPosition);
    
    // Add subtle line under header
    doc.moveTo(margin, yPosition + 25)
       .lineTo(pageWidth - margin, yPosition + 25)
       .strokeColor('#e5e7eb')
       .lineWidth(1)
       .stroke();
    
    yPosition += 30;
    
    // Invoice info in a subtle box
    doc.rect(margin, yPosition, contentWidth, 25)
       .fillColor('#f9fafb')
       .fill()
       .strokeColor('#d1d5db')
       .lineWidth(0.5)
       .stroke();
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Invoice Number:', margin + 10, yPosition + 8)
       .font('Helvetica')
       .text(jobData.job_number || jobData.id, margin + 90, yPosition + 8)
       .font('Helvetica-Bold')
       .text('Invoice Date:', margin + 200, yPosition + 8)
       .font('Helvetica')
       .text(this.formatDate(new Date()), margin + 270, yPosition + 8);
    
    yPosition += 35;
    
    // Billing Company
    this.addStyledSectionHeader(doc, 'Billing Company Services Provided For', margin, yPosition);
    yPosition += 20;
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(jobData.billing_company || 'N/A', margin, yPosition);
    
    if (jobData.billing_company_address) {
      yPosition += lineHeight;
      doc.font('Helvetica')
         .text(jobData.billing_company_address, margin, yPosition);
    }
    
    yPosition += sectionSpacing + 20; // Add more spacing after billing company address
    
    // Claimant Information
    this.addStyledSectionHeader(doc, 'Claimant Information', margin, yPosition);
    yPosition += 20;
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica');
    
    const claimantInfo = [
      `Name: ${jobData.claimant_first_name || ''} ${jobData.claimant_last_name || ''}`,
      `Claim/Case Number: ${jobData.case_claim_number || 'N/A'}`,
      `Billing Reference #: ${jobData.billing_reference || ''}`,
      `DOB: ${this.formatDate(jobData.claimant_dob) || 'N/A'}`,
      `DOI: ${this.formatDate(jobData.date_of_injury) || 'N/A'}`,
      `Employer: ${jobData.employer || 'N/A'}`
    ];
    
    claimantInfo.forEach(info => {
      if (info && !info.includes('undefined')) {
        doc.text(info, margin, yPosition);
        yPosition += lineHeight;
      }
    });
    
    yPosition += sectionSpacing + 15; // Add more spacing
    
    // Service Address
    this.addStyledSectionHeader(doc, 'Service Address', margin, yPosition);
    yPosition += 20;
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica');
    
    if (jobData.service_address) {
      doc.text(jobData.service_address, margin, yPosition);
    } else {
      doc.text('N/A', margin, yPosition);
    }
    
    yPosition += sectionSpacing + 15; // Add more spacing
    
    // Appointment Details
    this.addStyledSectionHeader(doc, 'Appointment Details', margin, yPosition);
    yPosition += 20;
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica');
    
    const appointmentDetails = [
      `Language: ${jobData.language_name || 'N/A'}`,
      `Interpreter Type: ${jobData.interpreter_type_name || 'N/A'}`,
      `Service Type: ${jobData.service_type_name || 'N/A'}`,
      `Billing Company: ${jobData.billing_company || 'N/A'}`,
      `Appointment Type: ${jobData.appointment_type || 'N/A'}`,
      `Status: ${this.formatStatus(jobData.status)}`,
      `Service Date: ${this.formatDate(jobData.scheduled_date) || 'N/A'}`,
      `Start Time: ${this.formatDateTime(jobData.scheduled_date, jobData.scheduled_time) || 'N/A'}`,
      `End Time: ${this.formatEndDateTime(jobData.scheduled_date, jobData.scheduled_time, jobData.actual_duration_minutes || jobData.estimated_duration_minutes) || 'N/A'}`,
      `Notes: ${jobData.notes || ''}`,
      `Certification #: ${jobData.certification_number || ''}`,
      `Authorization: ${jobData.authorized_by || 'N/A'} on ${this.formatDate(jobData.authorized_date) || 'N/A'}`
    ];
    
    appointmentDetails.forEach(detail => {
      if (detail && !detail.includes('undefined')) {
        doc.text(detail, margin, yPosition);
        yPosition += lineHeight;
      }
    });
    
    yPosition += sectionSpacing + 15; // Add more spacing
    
    // Total Due with styling
    doc.rect(margin, yPosition - 5, contentWidth, 25)
       .fillColor('#fef3c7')
       .fill()
       .strokeColor('#f59e0b')
       .lineWidth(1)
       .stroke();
    
    doc.fillColor('#92400e')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`TOTAL DUE: $${this.formatCurrency(totalAmount)}`, margin + 10, yPosition + 5);
    
    yPosition += 35;
    
    // Payment Information
    this.addStyledSectionHeader(doc, 'Payment Information', margin, yPosition);
    yPosition += 20;
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica');
    
    const paymentInfo = [
      'The Integrity Company',
      '5116 Francis St.',
      'Oceanside CA 92057',
      '888-418-2565',
      'TAX ID: 86-2339896'
    ];
    
    paymentInfo.forEach(info => {
      doc.text(info, margin, yPosition);
      yPosition += lineHeight;
    });
  }

  /**
   * Add a styled section header with underline
   * @param {PDFDocument} doc - PDF document instance
   * @param {string} title - Section title
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  addStyledSectionHeader(doc, title, x, y) {
    doc.fillColor('#1f2937')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(title, x, y);
    
    // Add subtle underline
    doc.moveTo(x, y + 12)
       .lineTo(x + 150, y + 12)
       .strokeColor('#3b82f6')
       .lineWidth(0.5)
       .stroke();
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} - Formatted date
   */
  formatDate(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Format date and time for display
   * @param {string|Date} date - Date
   * @param {string} time - Time
   * @returns {string} - Formatted date and time
   */
  formatDateTime(date, time) {
    if (!date || !time) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const dateStr = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      
      const timeStr = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `${dateStr}, ${timeStr}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Format end date and time for display
   * @param {string|Date} date - Date
   * @param {string} time - Start time
   * @param {number} durationMinutes - Duration in minutes
   * @returns {string} - Formatted end date and time
   */
  formatEndDateTime(date, time, durationMinutes) {
    if (!date || !time || !durationMinutes) return '';
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      const dateStr = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      
      const startTime = new Date(`2000-01-01T${time}`);
      const endTime = new Date(startTime.getTime() + (durationMinutes * 60000));
      const timeStr = endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return `${dateStr}, ${timeStr}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} - Formatted currency
   */
  formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0.00';
    return parseFloat(amount).toFixed(2);
  }

  /**
   * Format status for display
   * @param {string} status - Status to format
   * @returns {string} - Formatted status
   */
  formatStatus(status) {
    if (!status) return 'N/A';
    
    const statusMap = {
      'completed': 'Completed',
      'billed': 'Billed',
      'paid': 'Paid',
      'cancelled': 'Cancelled',
      'scheduled': 'Scheduled',
      'in_progress': 'In Progress'
    };
    
    return statusMap[status.toLowerCase()] || status;
  }

  /**
   * Clean up temporary files older than 1 hour
   */
  async cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      files.forEach(file => {
        const filepath = path.join(this.outputDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filepath);
        }
      });
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

module.exports = new PDFInvoiceService();