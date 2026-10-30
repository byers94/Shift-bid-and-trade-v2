// Utility to guarantee Leaflet (window.L) is available and configured with zero-watermark free tile servers:
// - Dark Matter (Default): Esri World Dark Gray Canvas
// - Satellite: Esri World Imagery
// - Street Day: OpenStreetMap Standard

declare global {
  interface Window {
    L: any;
  }
}

export const ESRI_DARK_GRAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const ESRI_DARK_GRAY_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

export const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ESRI_SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

export const OSM_STREET_DAY_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_ATTRIBUTION =
  '&copy; OpenStreetMap contributors';

// Backward-compatible aliases pointing to the zero-watermark providers
export const CARTODB_DARK_MATTER_URL = ESRI_DARK_GRAY_URL;
export const CARTODB_VOYAGER_URL = OSM_STREET_DAY_URL;
export const MAP_ATTRIBUTION = ESRI_DARK_GRAY_ATTRIBUTION;

export function getTileLayerConfig(mode: 'dark_matter' | 'satellite' | 'street_day' | 'tactical' | 'high_contrast' | 'street_voyager') {
  if (mode === 'satellite') {
    return {
      url: ESRI_SATELLITE_URL,
      attribution: ESRI_SATELLITE_ATTRIBUTION,
      options: { maxZoom: 19 }
    };
  }
  if (mode === 'street_day' || mode === 'high_contrast' || mode === 'street_voyager') {
    return {
      url: OSM_STREET_DAY_URL,
      attribution: OSM_ATTRIBUTION,
      options: { maxZoom: 19, subdomains: 'abc' }
    };
  }
  // Default: Dark Matter (Esri World Dark Gray Canvas)
  return {
    url: ESRI_DARK_GRAY_URL,
    attribution: ESRI_DARK_GRAY_ATTRIBUTION,
    options: { maxZoom: 16, maxNativeZoom: 16 }
  };
}

let leafletLoadingPromise: Promise<any> | null = null;

export function ensureLeafletLoaded(): Promise<any> {
  if (typeof window !== 'undefined' && window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletLoadingPromise) {
    return leafletLoadingPromise;
  }

  leafletLoadingPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document not available'));
      return;
    }

    // Ensure CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="leaflet.js"]') as HTMLScriptElement | null;
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.L) {
          clearInterval(checkInterval);
          resolve(window.L);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.L) resolve(window.L);
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.async = true;
    script.onload = () => {
      resolve(window.L);
    };
    script.onerror = (err) => {
      leafletLoadingPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return leafletLoadingPromise;
}
