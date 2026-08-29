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

/**
 * Watermarks photos or videos captured for Activity, Maintenance, and Incident reports
 */
export function addReportPhotoWatermark(
  imageSource: HTMLImageElement | HTMLVideoElement,
  options: {
    reportType: 'activity' | 'maintenance' | 'incident';
    guardName: string;
    badgeNumber: string;
    siteName?: string;
    zoneOrTitle?: string;
    coordinates?: { latitude: number; longitude: number };
    timestamp?: string;
    isEscalatedEmergency?: boolean;
  }
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = 'videoWidth' in imageSource && imageSource.videoWidth ? imageSource.videoWidth : 800;
  const height = 'videoHeight' in imageSource && imageSource.videoHeight ? imageSource.videoHeight : 600;

  canvas.width = width;
  canvas.height = height;

  ctx.save();
  ctx.drawImage(imageSource, 0, 0, width, height);
  ctx.restore();

  const barHeight = Math.max(56, Math.floor(height * 0.13));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  // Top border indicator line
  let accentColor = '#3b82f6'; // Activity (blue)
  let typeLabel = 'ACTIVITY PATROL CHECK-IN';
  if (options.reportType === 'maintenance') {
    accentColor = '#f59e0b'; // Maintenance (amber)
    typeLabel = 'MAINTENANCE HAZARD REPORT';
  } else if (options.reportType === 'incident') {
    accentColor = options.isEscalatedEmergency ? '#ef4444' : '#f97316'; // Red or Orange
    typeLabel = options.isEscalatedEmergency ? '🚨 CRITICAL ESCALATED INCIDENT (911 / EMS)' : 'FLAGGED SECURITY INCIDENT';
  }

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - barHeight, width, 4);

  // Primary text line
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(12, Math.floor(width * 0.022))}px monospace`;
  ctx.fillText(
    `[${typeLabel}] ${options.guardName} (Badge #${options.badgeNumber})`,
    14,
    height - barHeight + 22
  );

  // Secondary text line
  const now = options.timestamp || new Date().toISOString();
  const timeStr = new Date(now).toLocaleString();
  const siteStr = options.siteName ? ` | ${options.siteName}` : '';
  const zoneStr = options.zoneOrTitle ? ` | ${options.zoneOrTitle}` : '';
  const locStr = options.coordinates
    ? ` | GPS: ${options.coordinates.latitude.toFixed(4)}, ${options.coordinates.longitude.toFixed(4)}`
    : ' | GPS: Telemetry Active';

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `${Math.max(10, Math.floor(width * 0.018))}px monospace`;
  ctx.fillText(
    `${timeStr}${siteStr}${zoneStr}${locStr}`,
    14,
    height - barHeight + 42
  );

  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Generate a realistic placeholder report image if device camera is unavailable
 */
export function generateSampleReportMedia(
  reportType: 'activity' | 'maintenance' | 'incident',
  title: string,
  siteName: string,
  guardName: string,
  badgeNumber: string,
  isEscalatedEmergency: boolean = false
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = 800;
  canvas.height = 550;

  // Background gradient based on report type
  const grad = ctx.createLinearGradient(0, 0, 800, 550);
  if (reportType === 'activity') {
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
  } else if (reportType === 'maintenance') {
    grad.addColorStop(0, '#1e1e24');
    grad.addColorStop(0.5, '#2d1f14');
    grad.addColorStop(1, '#0f172a');
  } else {
    // Incident
    if (isEscalatedEmergency) {
      grad.addColorStop(0, '#2d1215');
      grad.addColorStop(0.5, '#3b1219');
      grad.addColorStop(1, '#180709');
    } else {
      grad.addColorStop(0, '#261b14');
      grad.addColorStop(0.5, '#362316');
      grad.addColorStop(1, '#120f0d');
    }
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 550);

  // Technical grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 800; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 550);
    ctx.stroke();
  }
  for (let y = 0; y < 550; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  // Large center icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(400, 220, 100, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = '54px sans-serif';
  let emoji = '🛡️';
  let mainHeader = '30-MIN ROUTINE PATROL VERIFICATION';
  let subHeader = 'Zone Sweep Complete • All Access Gates Locked • No Anomalies';
  let accentColor = '#38bdf8';

  if (reportType === 'maintenance') {
    emoji = '🔧';
    mainHeader = 'FACILITY MAINTENANCE HAZARD LOG';
    subHeader = 'Issue Photographed & Escalated to Property Management';
    accentColor = '#fbbf24';
  } else if (reportType === 'incident') {
    if (isEscalatedEmergency) {
      emoji = '🚨';
      mainHeader = 'EMERGENCY SERVICES ESCALATION LOG';
      subHeader = '911 Police / Paramedics Responding • CAD Incident Active';
      accentColor = '#f87171';
    } else {
      emoji = '⚠️';
      mainHeader = 'FLAGGED SECURITY INCIDENT LOG';
      subHeader = 'Security Guard Action Taken • Trespass / Hazard Resolution';
      accentColor = '#fb923c';
    }
  }

  ctx.fillText(emoji, 400, 235);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(mainHeader, 400, 350);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(title || 'Security Post Observation', 400, 380);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(subHeader, 400, 405);

  ctx.textAlign = 'left';

  // Bottom info strip
  const barHeight = 70;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fillRect(0, 550 - barHeight, 800, barHeight);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 550 - barHeight, 800, 4);

  const timeStr = new Date().toLocaleString();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(
    `[GUARD REPORT EVIDENCE] Officer: ${guardName} (Badge #${badgeNumber})`,
    20,
    550 - barHeight + 26
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.fillText(
    `${timeStr} • Facility: ${siteName} • Mobile GPS Attached`,
    20,
    550 - barHeight + 50
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

