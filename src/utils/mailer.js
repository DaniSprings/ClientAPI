import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env, isEmailConfigured } from "../config/env.js";
import { HttpError } from "./http-error.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (value === "TBA") {
    return "TBA";
  }

  return `${value}${suffix}`;
};

let transporter = null;
let resendClient = null;

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new HttpError(
      503,
      "Email sending is not configured on the server. Please set SMTP environment variables.",
    );
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
};

const getResendClient = () => {
  if (!env.resendApiKey) {
    throw new HttpError(
      503,
      "Resend API key is not configured. Set RESEND_API_KEY in environment variables.",
    );
  }

  if (resendClient) {
    return resendClient;
  }

  resendClient = new Resend(env.resendApiKey);
  return resendClient;
};

const buildTableRows = (cars = []) =>
  cars
    .map((entry, index) => {
      const details = entry?.details || {};
      const brand = details.brand || entry?.brand || "N/A";
      const model = details.model || entry?.model || "N/A";
      const price =
        Number(details.price) > 0 ? `R${Number(details.price).toLocaleString()}` : "N/A";

      return `
        <tr>
          <td style="padding:10px;border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(brand)}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(model)}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(price)}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.engine))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.cylinders))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.power, " kW"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.torque, " Nm"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.topSpeed, " km/h"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.acceleration, " s"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.fuelConsumption, " L/100km"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.fuelRange, " km"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.widthExclMirrorsInclMirrors, " mm"))}</td>
          <td style="padding:10px;border:1px solid #ddd;">${escapeHtml(formatValue(details.length, " mm"))}</td>
        </tr>
      `;
    })
    .join("");

export const sendComparisonResultsEmail = async ({ toEmail, recipientName, cars }) => {
  const smtpTransporter = getTransporter();

  const subject = "Your RevReview Compared Car Results";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4;color:#111;">
      <h2 style="margin:0 0 12px;">Compared Car Results</h2>
      <p style="margin:0 0 14px;">Hi ${escapeHtml(recipientName || "there")}, here are the compared vehicle details you requested.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="background:#1877e0;color:#fff;">
            <th style="padding:10px;border:1px solid #ddd;">#</th>
            <th style="padding:10px;border:1px solid #ddd;">Brand</th>
            <th style="padding:10px;border:1px solid #ddd;">Model</th>
            <th style="padding:10px;border:1px solid #ddd;">Price</th>
            <th style="padding:10px;border:1px solid #ddd;">Engine</th>
            <th style="padding:10px;border:1px solid #ddd;">Cylinders</th>
            <th style="padding:10px;border:1px solid #ddd;">Power</th>
            <th style="padding:10px;border:1px solid #ddd;">Torque</th>
            <th style="padding:10px;border:1px solid #ddd;">Top Speed</th>
            <th style="padding:10px;border:1px solid #ddd;">0-60 km/h</th>
            <th style="padding:10px;border:1px solid #ddd;">Fuel Consumption</th>
            <th style="padding:10px;border:1px solid #ddd;">Fuel Range</th>
            <th style="padding:10px;border:1px solid #ddd;">Width</th>
            <th style="padding:10px;border:1px solid #ddd;">Length</th>
          </tr>
        </thead>
        <tbody>
          ${buildTableRows(cars)}
        </tbody>
      </table>
      <p style="margin-top:14px;font-size:12px;color:#555;">Generated by RevReview.</p>
    </div>
  `;

  return smtpTransporter.sendMail({
    from: env.smtpFrom,
    to: toEmail,
    subject,
    html,
  });
};

export const listResendEmailAttachments = async (emailId) => {
  if (!emailId || typeof emailId !== "string") {
    throw new HttpError(400, "A valid emailId is required.");
  }

  const resend = getResendClient();
  const { data, error } = await resend.emails.attachments.list({ emailId });

  if (error) {
    throw new HttpError(502, error.message || "Failed to list email attachments from Resend.");
  }

  return data;
};
