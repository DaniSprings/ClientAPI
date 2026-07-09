import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import { HttpError } from '../utils/http-error.js';

let resendClient = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new HttpError(503, 'Email service is not configured. Set RESEND_API_KEY.');
  }

  if (resendClient) {
    return resendClient;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

export const sendEmail = async ({ to, subject, html, from }) => {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: from || 'RevReview <no-reply@revreview.co.za>',
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw error;
  }

  return data;
};

const formatValue = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (value === 'TBA') {
    return 'TBA';
  }

  return `${value}${suffix}`;
};

const formatPrice = (value) => {
  const asNumber = Number(value);
  if (!asNumber || asNumber <= 0) {
    return 'N/A';
  }

  return `R${asNumber.toLocaleString()}`;
};

const createComparisonPdfBuffer = ({ recipientName, cars }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('RevReview Car Comparison', { align: 'left' });
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .text(`Recipient: ${recipientName || 'RevReview user'}`)
      .text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    cars.forEach((entry, index) => {
      const details = entry?.details || {};
      const brand = details.brand || entry?.brand || 'N/A';
      const model = details.model || entry?.model || 'N/A';

      if (index > 0 && doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(13).text(`${index + 1}. ${brand} ${model}`);
      doc.moveDown(0.2);
      doc
        .fontSize(10)
        .text(`Price: ${formatPrice(details.price)}`)
        .text(`Engine: ${formatValue(details.engine)}`)
        .text(`Cylinders: ${formatValue(details.cylinders)}`)
        .text(`Power: ${formatValue(details.power, ' kW')}`)
        .text(`Torque: ${formatValue(details.torque, ' Nm')}`)
        .text(`Top Speed: ${formatValue(details.topSpeed, ' km/h')}`)
        .text(`0-60 km/h: ${formatValue(details.acceleration, ' s')}`)
        .text(`Fuel Consumption: ${formatValue(details.fuelConsumption, ' L/100km')}`)
        .text(`Fuel Range: ${formatValue(details.fuelRange, ' km')}`)
        .text(
          `Width (excl./incl. mirrors): ${formatValue(details.widthExclMirrorsInclMirrors, ' mm')}`,
        )
        .text(`Length: ${formatValue(details.length, ' mm')}`);
      doc.moveDown(0.8);
    });

    doc.end();
  });

export const sendComparisonPdfEmail = async ({ to, recipientName, cars, from }) => {
  const resend = getResendClient();
  const pdfBuffer = await createComparisonPdfBuffer({ recipientName, cars });

  const { data, error } = await resend.emails.send({
    from: from || 'RevReview <no-reply@revreview.co.za>',
    to,
    subject: 'Your RevReview Car Comparison PDF',
    html: `<p>Hi ${recipientName || 'there'}, your RevReview car comparison PDF is attached.</p>`,
    attachments: [
      {
        filename: 'revreview-car-comparison.pdf',
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  if (error) {
    console.error('Resend email error:', error);
    throw error;
  }

  return data;
};