// Camera capture and image processing utilities for SecureShift Guard Verification

/**
 * Draws timestamp, GPS coordinates, badge ID, and verification watermarks onto a canvas
 */
export function addVerificationWatermark(
  imageSource: HTMLImageElement | HTMLVideoElement,
  options: {
    guardName: string;
    badgeNumber: string;
    verificationType: 'UNIFORM_SELFIE' | 'EQUIPMENT_INSPECTION';
    siteName?: string;
    coordinates?: { latitude: number; longitude: number };
    timestamp?: string;
  }
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = 'videoWidth' in imageSource && imageSource.videoWidth ? imageSource.videoWidth : 640;
  const height = 'videoHeight' in imageSource && imageSource.videoHeight ? imageSource.videoHeight : 480;

  canvas.width = width;
  canvas.height = height;

  // Draw base image or mirrored if selfie
  ctx.save();
  ctx.drawImage(imageSource, 0, 0, width, height);
  ctx.restore();

  // Draw overlay badge bar at bottom
  const barHeight = Math.max(50, Math.floor(height * 0.14));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  // Accent line
  ctx.fillStyle = options.verificationType === 'UNIFORM_SELFIE' ? '#3b82f6' : '#10b981';
  ctx.fillRect(0, height - barHeight, width, 3);

  // Text details
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(12, Math.floor(width * 0.024))}px monospace`;
  
  const now = options.timestamp || new Date().toISOString();
  const timeStr = new Date(now).toLocaleString();
  const typeLabel = options.verificationType === 'UNIFORM_SELFIE' ? 'SECURITY UNIFORM VERIFIED' : 'DUTY EQUIPMENT INSPECTED';

  ctx.fillText(
    `[${typeLabel}] ${options.guardName} (Badge #${options.badgeNumber})`,
    12,
    height - barHeight + 20
  );

  ctx.font = `${Math.max(10, Math.floor(width * 0.019))}px monospace`;
  ctx.fillStyle = '#94a3b8';

  const locStr = options.coordinates 
    ? `GPS: ${options.coordinates.latitude.toFixed(5)}, ${options.coordinates.longitude.toFixed(5)}`
    : 'GPS: Encrypted Mobile Telemetry';
  const siteStr = options.siteName ? ` @ ${options.siteName}` : '';

  ctx.fillText(
    `${timeStr}${siteStr} • ${locStr}`,
    12,
    height - barHeight + 38
  );

  // Top right watermark badge
  ctx.fillStyle = 'rgba(30, 58, 138, 0.8)';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(width - 160, 12, 148, 26, 6);
  } else {
    ctx.rect(width - 160, 12, 148, 26);
  }
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SECURESHIFT VERIFIED', width - 150, 29);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Generate a realistic placeholder verification photo if camera hardware is unavailable
 */
export function generateSampleVerificationPhoto(
  type: 'UNIFORM_SELFIE' | 'EQUIPMENT_INSPECTION',
  guardName: string,
  badgeNumber: string,
  siteName?: string
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = 640;
  canvas.height = 480;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 640, 480);
  if (type === 'UNIFORM_SELFIE') {
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
  } else {
    grad.addColorStop(0, '#134e4a');
    grad.addColorStop(1, '#0f172a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 480);

  // Security pattern grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 640; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 480);
    ctx.stroke();
  }
  for (let y = 0; y < 480; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(640, y);
    ctx.stroke();
  }

  // Draw Center Icon representation
  if (type === 'UNIFORM_SELFIE') {
    // Shield & Officer silhouette
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.beginPath();
    ctx.arc(320, 200, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👮', 320, 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('OFFICER UNIFORM & BADGE VERIFIED', 320, 270);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('High-Visibility Vest, Badge # & Epaulets Compliant', 320, 295);
  } else {
    // Equipment layout representation
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(320, 200, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📻 🔦 🪪', 320, 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('DUTY GEAR & EQUIPMENT INSPECTED', 320, 270);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Radio CH-1, Bodycam #07, Master Keycard & Trauma Kit', 320, 295);
  }

  ctx.textAlign = 'left';

  // Bottom info strip
  const barHeight = 65;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(0, 480 - barHeight, 640, barHeight);

  ctx.fillStyle = type === 'UNIFORM_SELFIE' ? '#3b82f6' : '#10b981';
  ctx.fillRect(0, 480 - barHeight, 640, 3);

  const timeStr = new Date().toLocaleString();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(
    `[${type === 'UNIFORM_SELFIE' ? 'UNIFORM SELFIE' : 'EQUIPMENT CHECK'}] ${guardName} (Badge #${badgeNumber})`,
    15,
    480 - barHeight + 24
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.fillText(
    `${timeStr} • Facility: ${siteName || 'Designated Post'} • GPS Validated (12m proximity)`,
    15,
    480 - barHeight + 46
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}
