import type { SigningRequest } from '@/types/walsign';

/**
 * Generates a high-fidelity signature certificate as a PNG and downloads it.
 */
export function downloadCertificate(request: SigningRequest, nameMap: Map<string, string | null>) {
  const canvas = document.createElement('canvas');
  // 4:3 high-res aspect ratio (suitable for print/saving)
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background Gradient (Sleek Dark Theme)
  const bgGrad = ctx.createLinearGradient(0, 0, 1600, 1200);
  bgGrad.addColorStop(0, '#0b0f19');
  bgGrad.addColorStop(0.5, '#111827');
  bgGrad.addColorStop(1, '#070a13');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1600, 1200);

  // 2. Decorative Background Grid Lines
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 1600; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1200);
    ctx.stroke();
  }
  for (let j = 0; j < 1200; j += 40) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(1600, j);
    ctx.stroke();
  }

  // 3. Double Borders (Outer: Gold, Inner: Thin Blue)
  // Outer Gold
  ctx.strokeStyle = '#d97706'; // Dark Gold
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, 1520, 1120);

  // Inner Gold Accent
  ctx.strokeStyle = '#fbbf24'; // Light Gold
  ctx.lineWidth = 2;
  ctx.strokeRect(55, 55, 1490, 1090);

  // Inner Thin Blue Border
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, 80, 1440, 1040);

  // Corner Accents (Draw Gold Crosshairs/Ornaments at corners)
  const corners = [
    [55, 55],
    [1545, 55],
    [55, 1145],
    [1545, 1145],
  ];
  ctx.fillStyle = '#fbbf24';
  corners.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Header: Logo, Title & Subtitle
  // App Title Logo
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#60a5fa'; // Light blue
  ctx.textAlign = 'center';
  ctx.fillText('✍️ WalSign', 800, 140);

  // Main Header
  ctx.font = '900 64px sans-serif';
  const headerGrad = ctx.createLinearGradient(400, 0, 1200, 0);
  headerGrad.addColorStop(0, '#ffffff');
  headerGrad.addColorStop(0.5, '#fbbf24'); // Gold middle
  headerGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = headerGrad;
  ctx.fillText('CERTIFICATE OF CRYPTOGRAPHIC SIGNATURE', 800, 230);

  // Subtitle
  ctx.font = 'italic 20px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Secured by Sui Blockchain Protocol & Walrus Decentralized Storage Network', 800, 280);

  // 5. Divider Line
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 320);
  ctx.lineTo(1300, 320);
  ctx.stroke();

  // 6. Certificate Statement
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#e5e7eb';
  ctx.fillText('This document certifies that the electronic file described below has been permanently anchored on-chain', 800, 380);
  ctx.fillText('and signed by the designated parties using secure cryptographic signatures.', 800, 415);

  // 7. Document Details Card (Center Panel)
  const cardY = 470;
  const cardH = 260;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.fillRect(200, cardY, 1200, cardH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(200, cardY, 1200, cardH);

  // Card Content
  ctx.textAlign = 'left';

  // Labels
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('DOCUMENT TITLE:', 240, cardY + 60);
  ctx.fillText('WALRUS BLOB ID:', 240, cardY + 115);
  ctx.fillText('SHA-256 HASH:', 240, cardY + 170);
  ctx.fillText('CREATION DATE:', 240, cardY + 225);

  // Values
  ctx.fillStyle = '#ffffff';
  ctx.fillText(request.title, 460, cardY + 60);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#60a5fa'; // Blue for Blob ID
  ctx.fillText(request.blobId, 460, cardY + 115);

  ctx.fillStyle = '#fbbf24'; // Gold for SHA-256
  ctx.fillText(request.documentHash, 460, cardY + 170);

  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(new Date(request.createdAt).toUTCString(), 460, cardY + 225);

  // 8. Signers Section
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL CRYPTOGRAPHIC SIGNERS', 800, 800);

  // List Signers
  const startY = 860;
  const itemHeight = 60;
  
  request.requiredSigners.forEach((addr, idx) => {
    const hasSigned = request.signedBy.includes(addr);
    const resolvedName = nameMap.get(addr) || '';
    const displayName = resolvedName ? `${resolvedName} (${addr.slice(0, 10)}...${addr.slice(-6)})` : addr;
    const currentY = startY + idx * itemHeight;

    // Draw Signer Card background
    ctx.fillStyle = hasSigned ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.03)';
    ctx.strokeStyle = hasSigned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)';
    ctx.lineWidth = 1;
    ctx.fillRect(200, currentY - 35, 1200, 50);
    ctx.strokeRect(200, currentY - 35, 1200, 50);

    // Bullet Indicator
    ctx.beginPath();
    ctx.arc(240, currentY - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = hasSigned ? '#10b981' : '#ef4444';
    ctx.fill();

    // Signer Name/Address
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(displayName, 270, currentY - 3);

    // Status Text
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = hasSigned ? '#10b981' : '#ef4444';
    ctx.fillText(hasSigned ? '✓ SIGNED' : '⏳ PENDING SIGNATURE', 1360, currentY - 4);
  });

  // 9. Holographic Seal & QR Code Emblems (Bottom Right & Left)
  // Holographic Blue-Gold Seal on bottom right
  const sealX = 1380;
  const sealY = 400;
  const sealRadius = 70;

  // Outer spiky circle (simulated using multiple overlapping rotated squares)
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
  for (let r = 0; r < 8; r++) {
    ctx.rotate(Math.PI / 8);
    ctx.fillRect(-sealRadius, -sealRadius, sealRadius * 2, sealRadius * 2);
  }
  ctx.restore();

  // Solid gold outer rim
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius - 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner gradient seal
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius - 10, 0, Math.PI * 2);
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 5, sealX, sealY, sealRadius - 10);
  sealGrad.addColorStop(0, '#fbbf24');
  sealGrad.addColorStop(0.7, '#d97706');
  sealGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = sealGrad;
  ctx.fill();

  // Seal Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('VERIFIED', sealX, sealY - 12);
  ctx.fillText('ON-CHAIN', sealX, sealY + 6);
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('SUI PROTOCOL', sealX, sealY + 22);

  // Mock QR Code / Verification Emblem on bottom left
  const qrX = 170;
  const qrY = 170;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(qrX - 60, qrY - 60, 120, 120);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 60, qrY - 60, 120, 120);

  // Draw simulated QR blocks
  ctx.fillStyle = '#ffffff';
  // 3 Anchor corners
  ctx.fillRect(qrX - 50, qrY - 50, 30, 30);
  ctx.clearRect(qrX - 45, qrY - 45, 20, 20);
  ctx.fillRect(qrX - 40, qrY - 40, 10, 10);

  ctx.fillRect(qrX + 20, qrY - 50, 30, 30);
  ctx.clearRect(qrX + 25, qrY - 45, 20, 20);
  ctx.fillRect(qrX + 30, qrY - 40, 10, 10);

  ctx.fillRect(qrX - 50, qrY + 20, 30, 30);
  ctx.clearRect(qrX - 45, qrY + 25, 20, 20);
  ctx.fillRect(qrX - 40, qrY + 30, 10, 10);

  // Random pixel blocks
  ctx.fillStyle = '#fbbf24';
  for (let x = -20; x < 20; x += 10) {
    for (let y = -20; y < 20; y += 10) {
      if (Math.random() > 0.4) {
        ctx.fillRect(qrX + x, qrY + y, 8, 8);
      }
    }
  }

  // 10. Footer info
  ctx.font = '14px monospace';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.fillText('This document certificate is mathematically cryptographically tied to the Walrus Blob and Sui Object.', 800, 1140);
  ctx.fillText('Verify the document hash on https://walsign.vercel.app/verify or locally using SHA-256.', 800, 1160);

  // 11. Trigger Download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Signature_Certificate_${request.title.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
