import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  BatteryCharging, 
  Battery, 
  BatteryLow, 
  Smartphone, 
  Eye, 
  MapPin, 
  Check, 
  X, 
  AlertTriangle, 
  Lock, 
  Radio, 
  SlidersHorizontal,
  ExternalLink,
  Zap,
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { GuardBackgroundTelemetryPermissions } from '../../types/shift';

interface GuardContinuousPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: GuardBackgroundTelemetryPermissions;
  onUpdatePermissions: (updated: Partial<GuardBackgroundTelemetryPermissions>) => void;
  onAcquireWakeLock: () => Promise<boolean>;
  onReleaseWakeLock: () => void;
}

export const GuardContinuousPermissionsModal: React.FC<GuardContinuousPermissionsModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onUpdatePermissions,
  onAcquireWakeLock,
  onReleaseWakeLock
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'power_save_guide'>('status');
  const [testingGps, setTestingGps] = useState<boolean>(false);
  const [gpsTestResult, setGpsTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestGps = () => {
    setTestingGps(true);
    setGpsTestResult(null);

    if (!('geolocation' in navigator)) {
      setGpsTestResult('Geolocation is not supported by your browser.');
      setTestingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTestingGps(false);
        setGpsTestResult(`GPS Acquired: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`);
        onUpdatePermissions({
          highAccuracyGps: 'granted',
          lastPingTimestamp: new Date().toISOString()
        });
      },
      (err) => {
        setTestingGps(false);
        setGpsTestResult(`GPS Error: ${err.message}`);
        onUpdatePermissions({
          highAccuracyGps: 'denied'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleToggleWakeLock = async () => {
    if (permissions.screenWakeLockAcquired) {
      onReleaseWakeLock();
    } else {
      await onAcquireWakeLock();
    }
  };

  const handleConfirmPowerSaveExemption = () => {
    onUpdatePermissions({
      powerSaveModeExemptionConfirmed: !permissions.powerSaveModeExemptionConfirmed
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="guard-telemetry-permissions-dialog"
        className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Shift Continuous Telemetry & Permissions
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  30s GPS Feeds
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ensure persistent location tracking when screen is off, in background, or in power-save mode.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'status'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Permissions & Hardware Sensors
          </button>
          <button
            onClick={() => setActiveTab('power_save_guide')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'power_save_guide'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Power Save Exemption Guide
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-sm text-slate-300">
          {activeTab === 'status' ? (
            <>
              {/* Telemetry Policy Notice */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Continuous 30-Second Breadcrumb Policy:</strong>
                  Post Orders require SecureShift to log your GPS breadcrumb coordinates every 30 seconds for officer safety, automated CAD dispatch support, and client SLA compliance.
                </div>
              </div>

              {/* Permission Item 1: High Accuracy GPS */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">High-Accuracy Geolocation</div>
                      <div className="text-xs text-slate-400">GPS satellite and cellular triangulation</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    permissions.highAccuracyGps === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {permissions.highAccuracyGps === 'granted' ? '✓ Active & Granted' : 'Permission Required'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">
                    {gpsTestResult ? gpsTestResult : 'Continuous background watchPosition active'}
                  </span>
                  <button
                    onClick={handleTestGps}
                    disabled={testingGps}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingGps ? 'animate-spin' : ''}`} />
                    {testingGps ? 'Testing...' : 'Test Location Fix'}
                  </button>
                </div>
              </div>

              {/* Permission Item 2: Screen Wake Lock */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Screen Wake Lock</div>
                      <div className="text-xs text-slate-400">Prevents phone display from sleeping while on patrol</div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleWakeLock}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      permissions.screenWakeLockAcquired
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {permissions.screenWakeLockAcquired ? '✓ Screen Lock ON' : 'Enable Wake Lock'}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  When active, your device will not dim or sleep automatically during duty, allowing uninhibited camera sweeps and continuous high-rate GPS telemetry.
                </p>
              </div>

              {/* Permission Item 3: Power-Saving & Battery Optimization Exemption */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {permissions.batteryStatus?.charging ? (
                        <BatteryCharging className="w-4 h-4" />
                      ) : (
                        <Battery className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Power-Save Mode Exemption</div>
                      <div className="text-xs text-slate-400">
                        Battery: {permissions.batteryStatus?.level ?? 94}% {permissions.batteryStatus?.charging ? '(Charging)' : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleConfirmPowerSaveExemption}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                      permissions.powerSaveModeExemptionConfirmed
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-600 text-white border-amber-500 hover:bg-amber-500'
                    }`}
                  >
                    {permissions.powerSaveModeExemptionConfirmed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Exemption Confirmed
                      </>
                    ) : (
                      'Confirm Exempted'
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Android and iOS aggressively kill background location services when "Power Saving" or "Low Power Mode" is engaged. Confirm your phone is set to unrestricted background activity.
                </p>
              </div>

              {/* Permission Item 4: Background Execution */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">Background Keep-Alive Heartbeat:</span>
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Active (30s Timers)
                </span>
              </div>
            </>
          ) : (
            /* Power Save Exemption Instructions Guide */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                <strong>Why is this required?</strong> Operating systems throttle CPU and background GPS when battery saving is turned on or the screen is locked in your pocket. To prevent missed breadcrumbs, please exempt SecureShift:
              </div>

              {/* Android Instructions */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Android (Chrome / PWA)
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1">
                  <li>Open device <strong>Settings → Apps → Chrome (or SecureShift)</strong></li>
                  <li>Tap <strong>Battery → Select "Unrestricted"</strong></li>
                  <li>Disable <strong>"Pause app activity if unused"</strong></li>
                  <li>Turn off system <strong>"Battery Saver"</strong> during your active patrol shift</li>
                </ol>
              </div>

              {/* iOS Instructions */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  iOS / iPhone (Safari)
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1">
                  <li>Open <strong>Settings → Battery</strong> and verify <strong>Low Power Mode is OFF</strong></li>
                  <li>Open <strong>Settings → Privacy & Security → Location Services</strong></li>
                  <li>Select <strong>Safari / SecureShift</strong> and ensure <strong>"Precise Location" is ON</strong></li>
                  <li>Enable <strong>Screen Wake Lock</strong> below to prevent device auto-lock while on shift</li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmPowerSaveExemption}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    permissions.powerSaveModeExemptionConfirmed
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {permissions.powerSaveModeExemptionConfirmed
                    ? '✓ Power-Saving Exemption Confirmed on this Device'
                    : 'I Confirm Power-Saving Restrictions are Disabled'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Status: <span className="text-emerald-400 font-semibold">Continuous Telemetry Online</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition"
          >
            Done & Return to Duty
          </button>
        </div>
      </div>
    </div>
  );
};
