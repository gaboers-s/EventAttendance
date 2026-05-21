import { jsPDF } from 'jspdf';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  return n + (s[v % 10] || s[0]);
}

export function formatCertDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(d.getTime())) return dateStr;
  return `${ordinal(d.getDate())} day of ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

// Load image from URL and return as base64 data URL
function loadImageAsDataURL(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Load image with reduced opacity for watermark
function loadImageAsFadedDataURL(url, opacity = 0.08) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Clear transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set global alpha for faded effect
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
        ctx.globalAlpha = 1.0;
        
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateCertificate(student, event) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;

  // ===== BACKGROUND =====
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, W, H, 'F');

  // Cyan outer border
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(2.5);
  doc.rect(6, 6, W - 12, H - 12);

  // White inner border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.rect(9, 9, W - 18, H - 18);

  // ===== CENTER WATERMARK (faded background logo) =====
  const centerLogoURL = await loadImageAsFadedDataURL(event.event_logo_center || event.event_logo_left || '/sti-logo.png', 0.08);
  if (centerLogoURL) {
    const centerW = 120;
    const centerH = 120;
    const centerX = (W - centerW) / 2;
    const centerY = (H - centerH) / 2 + 5;
    doc.addImage(centerLogoURL, 'PNG', centerX, centerY, centerW, centerH);
  }

  // ===== LOGOS =====
  const logoLeftURL = await loadImageAsDataURL(event.event_logo_left || '/sti-logo.png');
  const logoRightURL = await loadImageAsDataURL(event.event_logo_right || '/cs-logo.png');

  if (logoLeftURL) {
    doc.addImage(logoLeftURL, 'PNG', 12, 10, 40, 32, undefined, 'FAST');
  }
  if (logoRightURL) {
    doc.addImage(logoRightURL, 'PNG', W - 52, 10, 40, 32, undefined, 'FAST');
  }

  // ===== HEADER TEXT =====
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(24);
  doc.text('STI COLLEGE ALABANG', W / 2, 28, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPUTER SOCIETY', W / 2, 38, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('RZB Building Interior Montillano St. Alabang Muntinlupa City', W / 2, 45, { align: 'center' });

  // ===== TITLE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 83, 9);
  doc.text('C E R T I F I C A T E   O F   A T T E N D A N C E', W / 2, 62, { align: 'center' });

  // ===== BODY =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('This certificate is proudly presented to', W / 2, 78, { align: 'center' });

  // Student name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(15, 23, 42);
  const firstName = student.first_name ? student.first_name.toUpperCase() : '';
  const mi = student.middle_initial ? ' ' + student.middle_initial.toUpperCase().replace('.', '') + '.' : '';
  const displayName = `${student.last_name.toUpperCase()}, ${firstName}${mi}`;
  doc.text(displayName, W / 2, 96, { align: 'center' });

  // Event text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('for their dedicated participation in', W / 2, 110, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(event.event_name || 'test', W / 2, 120, { align: 'center' });

  // Date & Venue
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const venue = event.event_venue || 'avr';
  const rawDate = event.event_date;
  const formattedDate = rawDate ? formatCertDate(rawDate) : formatCertDate('2026-05-22');
  doc.text(`Held this ${formattedDate}, at the ${venue}.`, W / 2, 130, { align: 'center' });

  // Footer quote
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(130, 130, 130);
  const footer = 'This gathering signifies the successful convergence of academic theory and the evolving demands of the global industry.';
  doc.text(footer, W / 2, 142, { align: 'center', maxWidth: W - 80 });

  // ===== SIGNATORIES =====
  const nameY = 168;
  const titleY = 175;
  const leftX = 75;
  const rightX = W - 75;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Ms. Annabelle A. Peralta', leftX, nameY, { align: 'center' });
  doc.text('Mr. Ricson M. Ricardo', rightX, nameY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('School Administrator', leftX, titleY, { align: 'center' });
  doc.text('Academic Head', rightX, titleY, { align: 'center' });

  // Return as base64 data URL
  return doc.output('dataurlstring');
}