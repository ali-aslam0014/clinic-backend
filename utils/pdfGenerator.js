const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
  }

  async generateReceipt(receipt) {
    try {
      // Generate QR code
      const qrCodeData = await QRCode.toDataURL(JSON.stringify({
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        date: receipt.paymentDate
      }));

      // Add clinic logo
      this.doc.image(path.join(__dirname, '../public/images/logo.png'), 50, 45, { width: 50 })
        .fontSize(20)
        .text('Medical Clinic', 110, 57);

      // Add clinic details
      this.doc.fontSize(10)
        .text('123 Medical Street, City, Country', 110, 80)
        .text('Phone: (123) 456-7890', 110, 95)
        .text('Email: info@medicalclinic.com', 110, 110);

      // Add receipt title
      this.doc.fontSize(16)
        .text('Payment Receipt', 0, 150, { align: 'center' });

      // Add receipt details
      this.doc.fontSize(10)
        .text(`Receipt Number: ${receipt.receiptNumber}`, 50, 200)
        .text(`Date: ${new Date(receipt.paymentDate).toLocaleString()}`, 300, 200)
        .text(`Patient Name: ${receipt.patientId.firstName} ${receipt.patientId.lastName}`, 50, 220)
        .text(`Contact: ${receipt.patientId.contactNumber}`, 300, 220)
        .text(`Bill Number: ${receipt.billId.invoiceNumber}`, 50, 240)
        .text(`Payment Method: ${receipt.paymentMethod.toUpperCase()}`, 300, 240);

      // Add table headers
      this.doc.moveTo(50, 280)
        .lineTo(550, 280)
        .stroke();

      this.doc.text('Service', 50, 290)
        .text('Quantity', 200, 290)
        .text('Unit Price', 300, 290)
        .text('Amount', 450, 290);

      this.doc.moveTo(50, 305)
        .lineTo(550, 305)
        .stroke();

      // Add table rows
      let y = 320;
      receipt.billId.items.forEach(item => {
        this.doc.text(item.serviceName, 50, y)
          .text(item.quantity.toString(), 200, y)
          .text(`$${item.unitPrice.toFixed(2)}`, 300, y)
          .text(`$${item.total.toFixed(2)}`, 450, y);
        y += 20;
      });

      // Add totals
      y += 20;
      this.doc.moveTo(50, y)
        .lineTo(550, y)
        .stroke();

      y += 10;
      this.doc.text('Subtotal:', 350, y)
        .text(`$${receipt.billId.subtotal.toFixed(2)}`, 450, y);

      if (receipt.billId.discount > 0) {
        y += 20;
        this.doc.text('Discount:', 350, y)
          .text(`$${receipt.billId.discount.toFixed(2)}`, 450, y);
      }

      y += 20;
      this.doc.text('Tax (15%):', 350, y)
        .text(`$${receipt.billId.tax.toFixed(2)}`, 450, y);

      y += 20;
      this.doc.fontSize(12)
        .text('Amount Paid:', 350, y)
        .text(`$${receipt.amount.toFixed(2)}`, 450, y);

      // Add QR code
      this.doc.image(qrCodeData, 50, y - 50, { width: 100 });

      // Add footer
      this.doc.fontSize(10)
        .text(`Processed by: ${receipt.processedBy.name}`, 0, y + 50, { align: 'center' })
        .text('Thank you for your payment!', 0, y + 70, { align: 'center' });

      return this.doc;
    } catch (error) {
      throw new Error('Error generating PDF: ' + error.message);
    }
  }
}

module.exports = PDFGenerator; 