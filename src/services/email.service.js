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

// Category/field definitions mirroring the sections shown on the CarStats
// comparison page (including the "More Info" additional-spec sections).
const CATEGORY_SPECS = [
  {
    title: 'Overview',
    fields: [{ label: 'Price', key: 'price', formatter: formatPrice }],
  },
  {
    title: 'Engine Specifications',
    fields: [
      { label: 'Type', key: 'engine' },
      { label: 'Cylinders', key: 'cylinders' },
      { label: 'Power', key: 'power', suffix: ' kW' },
      { label: 'Torque', key: 'torque', suffix: ' Nm' },
    ],
  },
  {
    title: 'Performance',
    fields: [
      { label: 'Top Speed', key: 'topSpeed', suffix: ' km/h' },
      { label: '0-100 km/h', key: 'acceleration', suffix: ' s' },
    ],
  },
  {
    title: 'Fuel Economy',
    fields: [
      { label: 'Consumption', key: 'fuelConsumption', suffix: ' L/100km' },
      { label: 'Range', key: 'fuelRange', suffix: ' km' },
      { label: 'Tank Size', key: 'tankSize', suffix: ' L' },
    ],
  },
  {
    title: 'Dimensions',
    fields: [
      { label: 'Length', key: 'length', suffix: ' mm' },
      { label: 'Width Excl. Mirrors', key: 'widthExclMirrors', suffix: ' mm' },
      { label: 'Width Incl. Mirrors', key: 'widthInclMirrors', suffix: ' mm' },
      { label: 'Height', key: 'height', suffix: ' mm' },
      { label: 'Wheelbase', key: 'wheelbase', suffix: ' mm' },
      { label: 'Ground Clearance', key: 'groundClearance', suffix: ' mm' },
    ],
  },
  {
    title: 'Towing & Mass',
    fields: [
      { label: 'Kerb Weight (EU)', key: 'kerbWeight', suffix: ' kg' },
      { label: 'Dry Weight (DIN)', key: 'dryWeight', suffix: ' kg' },
      { label: 'GVM', key: 'gvm', suffix: ' kg' },
      { label: 'Payload Capacity', key: 'payloadCapacity', suffix: ' kg' },
      { label: 'Load Volume', key: 'loadVolume', suffix: ' L' },
      { label: 'Towing (Braked)', key: 'towingBraked', suffix: ' kg' },
      { label: 'Towing (Unbraked)', key: 'towingUnbraked', suffix: ' kg' },
      { label: 'Towbar Fitted', key: 'towbarFitted' },
      { label: 'Wading Depth', key: 'wadingDepth', suffix: ' mm' },
    ],
  },
  {
    title: 'Features & Extras',
    fields: [
      { label: 'Air Conditioning', key: 'airConditioning' },
      { label: 'Navigation', key: 'navigation' },
      { label: 'Cruise Control', key: 'cruiseControl' },
      { label: 'Adaptive Cruise Control', key: 'adaptiveCruiseControl' },
      { label: 'Bluetooth', key: 'bluetooth' },
      { label: 'USB Port', key: 'usbPort' },
      { label: 'Leather Upholstery', key: 'leatherUpholstery' },
      { label: 'Electric Driver Seat', key: 'electricDriverSeat' },
      { label: 'Head-Up Display', key: 'headUpDisplay' },
      { label: 'Lane Departure Warning', key: 'laneDepartureWarning' },
      { label: 'Heated Rear Screen', key: 'heatedRearScreen' },
    ],
  },
  {
    title: 'Additional Economy',
    fields: [
      { label: 'Steering', key: 'steering' },
      { label: 'Driven Wheels', key: 'drivenWheels' },
      { label: 'Gear Ratios', key: 'gearRatios' },
      { label: 'Tank Size', key: 'tankSize', suffix: ' L' },
    ],
  },
  {
    title: 'Additional Safety',
    fields: [
      { label: 'Passenger Knee Airbag', key: 'passengerKneeAirbag' },
      { label: 'Driver Airbag', key: 'driverAirbag' },
      { label: 'Front Passenger Airbag', key: 'frontPassengerAirbag' },
      { label: 'Front Side Airbags', key: 'frontSideAirbags' },
      { label: 'Rear Side Airbags', key: 'rearSideAirbags' },
      { label: 'Curtain Airbags', key: 'curtainAirbags' },
      { label: 'Driver Knee Airbag', key: 'driverKneeAirbag' },
    ],
  },
  {
    title: 'Additional Features & Comfort',
    fields: [
      { label: 'Rear A/C Controls', key: 'rearAirConditioningControls' },
      { label: 'Power Steering', key: 'powerSteering' },
      { label: 'Electric Power Steering', key: 'electricPowerSteering' },
      { label: 'Leather Steering Wheel Rim', key: 'leatherSteeringWheelRim' },
      { label: 'Multi-Function Steering Wheel', key: 'multiFunctionSteeringWheelControls' },
      { label: 'Electric Windows', key: 'electricWindows' },
      { label: 'Suede-Cloth Upholstery', key: 'suedeClothUpholstery' },
      { label: 'Lumbar Support Adjustment', key: 'lumbarSupportAdjustment' },
      { label: 'Electric Seat Memory', key: 'electricSeatMemory' },
      { label: 'Front Ventilated Seats', key: 'frontVentilatedSeats' },
      { label: 'Controls Screen Input', key: 'controlsScreenInputMethod' },
      { label: 'Attention Assist', key: 'attentionAssist' },
      { label: 'Auto-Dim Exterior Mirrors', key: 'autoDimExteriorMirrors' },
    ],
  },
  {
    title: 'Service & Warranty',
    fields: [
      { label: 'Warranty (Years)', key: 'warrantyYears', suffix: ' yrs' },
      { label: 'Warranty (Distance)', key: 'warrantyDistance', suffix: ' km' },
      { label: 'Service Plan (Years)', key: 'servicePlanYears', suffix: ' yrs' },
      { label: 'Service Plan (Distance)', key: 'servicePlanDistance', suffix: ' km' },
      { label: 'Maintenance Plan (Years)', key: 'maintenancePlanYears', suffix: ' yrs' },
      { label: 'Maintenance Plan (Distance)', key: 'maintenancePlanDistance', suffix: ' km' },
      { label: 'Service Interval', key: 'serviceIntervalDistance', suffix: ' km' },
      { label: 'Service/Maintenance Plan', key: 'serviceMaintenancePlan' },
      { label: 'Maintenance Plan (Alt)', key: 'maintenancePlan' },
      { label: 'Service Interval (Alt)', key: 'serviceIntervalDistance1', suffix: ' km' },
    ],
  },
];

const LABEL_COLUMN_WIDTH = 110;
const CAR_HEADER_HEIGHT = 28;
const CATEGORY_HEADER_HEIGHT = 16;
const ROW_HEIGHT = 13;
const HEADER_FONT_SIZE = 8;
const BODY_FONT_SIZE = 7.5;

// Draws the comparison table for up to 6 cars, splitting the usable page
// width evenly between one car-column per compared vehicle (plus a fixed
// label column on the left), and paginating automatically as rows overflow.
const drawComparisonTable = (doc, cars) => {
  const carsCount = cars.length;
  const pageMargin = doc.page.margins.left;
  const usableWidth = doc.page.width - pageMargin - doc.page.margins.right;
  const carColWidth = (usableWidth - LABEL_COLUMN_WIDTH) / carsCount;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  const columnX = (index) => pageMargin + LABEL_COLUMN_WIDTH + index * carColWidth;

  const drawDivider = (y, color = '#d5dce6') => {
    doc
      .strokeColor(color)
      .lineWidth(0.5)
      .moveTo(pageMargin, y)
      .lineTo(pageMargin + usableWidth, y)
      .stroke();
  };

  const drawCarHeaderRow = (y) => {
    doc.rect(pageMargin, y, usableWidth, CAR_HEADER_HEIGHT).fill('#1877e0');
    doc.fillColor('#ffffff').fontSize(HEADER_FONT_SIZE).font('Helvetica-Bold');
    doc.text('Spec', pageMargin + 4, y + 10, { width: LABEL_COLUMN_WIDTH - 8 });
    cars.forEach((car, index) => {
      const details = car?.details || {};
      const brand = details.brand || car?.brand || 'N/A';
      const model = details.model || car?.model || 'N/A';
      doc.text(`${brand}\n${model}`, columnX(index) + 3, y + 4, {
        width: carColWidth - 6,
        align: 'center',
      });
    });
    doc.fillColor('#000000').font('Helvetica');
    return y + CAR_HEADER_HEIGHT;
  };

  const drawCategoryHeaderRow = (title, y) => {
    doc.rect(pageMargin, y, usableWidth, CATEGORY_HEADER_HEIGHT).fill('#dbe9fb');
    doc.fillColor('#0b3d7a').fontSize(HEADER_FONT_SIZE).font('Helvetica-Bold');
    doc.text(title, pageMargin + 4, y + 4, { width: usableWidth - 8 });
    doc.fillColor('#000000').font('Helvetica');
    return y + CATEGORY_HEADER_HEIGHT;
  };

  const drawSpecRow = (label, values, y, shaded) => {
    if (shaded) {
      doc.rect(pageMargin, y, usableWidth, ROW_HEIGHT).fill('#f4f7fb');
      doc.fillColor('#000000');
    }
    doc.fontSize(BODY_FONT_SIZE).font('Helvetica-Bold');
    doc.text(label, pageMargin + 4, y + 3, { width: LABEL_COLUMN_WIDTH - 8, ellipsis: true });
    doc.font('Helvetica');
    values.forEach((value, index) => {
      doc.text(value, columnX(index) + 3, y + 3, {
        width: carColWidth - 6,
        align: 'center',
        ellipsis: true,
      });
    });
    drawDivider(y + ROW_HEIGHT);
    return y + ROW_HEIGHT;
  };

  const hasFieldData = (field) =>
    cars.some((car) => {
      const value = car?.details?.[field.key];
      return value !== null && value !== undefined && value !== '';
    });

  let y = doc.y;
  y = drawCarHeaderRow(y);

  CATEGORY_SPECS.forEach((category) => {
    const fieldsWithData = category.fields.filter(hasFieldData);
    if (fieldsWithData.length === 0) {
      return;
    }

    if (y + CATEGORY_HEADER_HEIGHT + ROW_HEIGHT > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      y = drawCarHeaderRow(y);
    }

    y = drawCategoryHeaderRow(category.title, y);

    fieldsWithData.forEach((field, rowIndex) => {
      if (y + ROW_HEIGHT > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
        y = drawCarHeaderRow(y);
        y = drawCategoryHeaderRow(`${category.title} (cont.)`, y);
      }

      const values = cars.map((car) => {
        const rawValue = car?.details?.[field.key];
        return field.formatter ? field.formatter(rawValue) : formatValue(rawValue, field.suffix);
      });

      y = drawSpecRow(field.label, values, y, rowIndex % 2 === 0);
    });
  });

  doc.y = y;
};

const createComparisonPdfBuffer = ({ recipientName, cars }) =>
  new Promise((resolve, reject) => {
    // `compress: true` enables pdfkit's built-in stream compression so the
    // generated file stays small enough to download/open smoothly on mobile
    // devices and email clients.
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      layout: 'landscape',
      compress: true,
      bufferPages: true,
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cap at 6 cars (matches the "Compare Cars" limit and the max column
    // count supported on a single A4 page).
    const comparisonCars = (cars || []).slice(0, 6);

    doc.fontSize(16).font('Helvetica-Bold').text('RevReview Car Comparison', { align: 'left' });
    doc.font('Helvetica');
    doc.moveDown(0.2);
    doc
      .fontSize(10)
      .text(`Recipient: ${recipientName || 'RevReview user'}`)
      .text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.6);

    if (comparisonCars.length > 0) {
      drawComparisonTable(doc, comparisonCars);
    }

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