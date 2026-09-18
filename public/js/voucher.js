'use strict';
/**
 * public/js/voucher.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Vector PDF Cash Voucher Generator
 *
 * Generates an executive A4 voucher using jsPDF.
 */

window.generateLoanVoucherPdf = function (loan, client) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF Generator is loading. Please try again in a moment.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const d = loan.disbursement || {};
  const isMfs = d.payout_method === 'BKASH' || d.payout_method === 'NAGAD';
  const methodText = d.payout_method ? d.payout_method : 'CASH HAND-TO-HAND';
  const amount = parseFloat(loan.amount) || 0;
  const fee = parseFloat(d.mfs_fee) || 0;
  const total = d.total_disbursed ? parseFloat(d.total_disbursed) : (amount + fee);

  // ─── Border & Canvas ────────────────────────────────────────────────────────
  doc.setDrawColor(245, 158, 11); // Amber gold border
  doc.setLineWidth(1.5);
  doc.rect(8, 8, 194, 281);

  doc.setDrawColor(30, 41, 59); // Slate inner border
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277);

  // ─── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(10, 15, 29); // Obsidian background
  doc.rect(10, 10, 190, 36, 'F');

  doc.setTextColor(245, 158, 11); // Gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text("SYM EMPIRE PLATFORM (S.E.P.)", 105, 20, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("OFFICIAL TRANSACTION & LOAN VOUCHER", 105, 28, { align: 'center' });

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text("Domain: https://symloan.best-travel.ltd  |  Secure Micro-Financial Engine", 105, 34, { align: 'center' });

  // ─── Voucher Meta Strip ─────────────────────────────────────────────────────
  doc.setFillColor(241, 245, 249);
  doc.rect(10, 46, 190, 12, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`VOUCHER REF: #SEP-LN-${loan.id.slice(0, 8).toUpperCase()}`, 15, 53.5);
  doc.text(`ISSUED: ${new Date().toLocaleDateString('en-GB')}  ${new Date().toLocaleTimeString()}`, 195, 53.5, { align: 'right' });

  // ─── Client Profile Section ─────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 63, 180, 35, 'FD');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text("1. CLIENT IDENTIFICATION", 20, 71);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  doc.text("Recipient Full Name :", 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(String(client.name || 'GIXSAM'), 65, 78);

  doc.setFont('helvetica', 'bold');
  doc.text("Verified Mobile No  :", 20, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(String(client.phone_number || '—'), 65, 84);

  doc.setFont('helvetica', 'bold');
  doc.text("Master Client ID    :", 20, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(String(client.id || '—'), 65, 90);

  doc.setFont('helvetica', 'bold');
  doc.text("Account Status      :", 125, 78);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(String(client.status || 'ACTIVE'), 160, 78);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text("Active Strikes      :", 125, 84);
  doc.text(`${client.strikes_count || 0} / 3 Strikes`, 160, 84);

  // ─── Financial Disbursement Table ───────────────────────────────────────────
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text("2. DISBURSEMENT & FINANCIAL BREAKDOWN", 20, 107);

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 111, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text("FINANCIAL PARTICULARS", 20, 116.5);
  doc.text("SPECIFICATION / TRANSACTION DATA", 100, 116.5);
  doc.text("AMOUNT (BDT)", 190, 116.5, { align: 'right' });

  // Rows
  let y = 125;
  const drawRow = (label, detail, amtStr, isBold = false) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(15, y + 2, 195, y + 2);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text(label, 20, y);
    doc.text(detail, 100, y);
    doc.text(amtStr, 190, y, { align: 'right' });
    y += 7.5;
  };

  drawRow("Principal Loan Disbursed", "Requested Funds", `BDT ${amount.toLocaleString()}.00`);
  drawRow("Payment Method", methodText, "—");
  if (isMfs) {
    drawRow("MFS Destination Number", d.destination_number || client.phone_number, "—");
    drawRow("Transaction ID (TrxID)", d.trx_id || 'N/A', "—");
    drawRow("MFS Cash-Out Fee (20 BDT/1000)", `Standard Rate (${d.fee_handling || 'INCLUDED'})`, `BDT ${fee.toLocaleString()}.00`);
  } else {
    drawRow("Handover Verification", "Direct Physical Cash Handover", "BDT 0.00");
  }

  // Total Row
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.rect(15, y - 3, 180, 9, 'F');
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text("NET TOTAL REPAYABLE AMOUNT", 20, y + 3);
  doc.text(`BDT ${total.toLocaleString()}.00`, 190, y + 3, { align: 'right' });

  y += 18;

  // ─── Repayment Terms & Compliance ───────────────────────────────────────────
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text("3. REPAYMENT TERMS & STRIKE COMPLIANCE CLAUSE", 20, y);
  y += 6;

  doc.setFillColor(255, 241, 242); // Rose 50
  doc.rect(15, y, 180, 36, 'F');
  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.4);
  doc.rect(15, y, 180, 36);

  doc.setTextColor(159, 18, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`MANDATORY REPAYMENT DEADLINE: ${loan.deadline_date}`, 20, y + 7);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("• Repayment must be executed in full before 01:00 PM (Bangladesh Time) on the specified deadline date.", 20, y + 14);
  doc.text("• The automated Cron Engine checks all accounts daily at 13:00 BDT. Any overdue balance immediately incurs +1 Strike.", 20, y + 20);
  doc.text("• Accumulating 3 strikes triggers an irreversible account freeze, permanent identity blacklist, and FRAUD designation.", 20, y + 26);
  doc.text("• Accepted repayment channels: Official Admin bKash/Nagad or Hand-to-Hand Cash with validated receipt.", 20, y + 32);

  y += 50;

  // ─── Signatures ─────────────────────────────────────────────────────────────
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);

  // Recipient Signature
  doc.line(20, y, 80, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("RECIPIENT SIGNATURE / VERIFICATION", 20, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Signed: ${client.name || 'GIXSAM'} (${client.phone_number || ''})`, 20, y + 10);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, y + 14);

  // Authorizing Admin Signature
  doc.line(135, y, 195, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("AUTHORIZING OFFICER (CEO / ADMIN)", 135, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("SYM EMPIRE PLATFORM (S.E.P.)", 135, y + 10);
  doc.text(`Verification Ref: Trx#${loan.id.slice(0, 8)}`, 135, y + 14);

  // ─── Footer ─────────────────────────────────────────────────────────────────
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("This document is generated by the cryptographic engine of SYM EMPIRE PLATFORM (S.E.P.). Official archival copy.", 105, 285, { align: 'center' });

  // Download
  doc.save(`SYM-LOAN-VOUCHER-${loan.id.slice(0, 8).toUpperCase()}.pdf`);
};
