import React, { useState } from 'react';
import { useShiftOps } from '../../context/ShiftOpsContext';
import { calculateHours, formatDateLabel } from '../../utils/time';
import { SAMPLE_JSON_SHIFTS } from '../../data/mockData';
import { 
  Plus, 
  FileCode, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  Trash2, 
  Search, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export const ShiftManager: React.FC = () => {
  const { 
    shifts, 
    createShift, 
    bulkImportShifts, 
    markShiftFilled, 
    reopenShift, 
    deleteShift,
    hideFilledShifts,
    setHideFilledShifts 
  } = useShiftOps();

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('07:00');
  const [urgency, setUrgency] = useState<'standard' | 'emergency'>('standard');
  const [hourlyRate, setHourlyRate] = useState('25.00');
  const [notes, setNotes] = useState('');
  const [showJsonImporter, setShowJsonImporter] = useState(false);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON_SHIFTS);
  const [jsonError, setJsonError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto calculated hours
  const calculatedHours = calculateHours(startTime, endTime);

  const handleCreateSingleShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    createShift({
      siteName,
      location,
      date,
      startTime,
      endTime,
      urgency,
      hourlyRate: parseFloat(hourlyRate) || 24,
      notes
    });

    // Reset inputs
    setSiteName('');
    setLocation('');
    setNotes('');
  };

  const handleImportJson = () => {
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonText);
      const result = bulkImportShifts(parsed);
      if (result.errors.length > 0) {
        setJsonError(result.errors.join('\n'));
      } else {
        setShowJsonImporter(false);
      }
    } catch (e: any) {
      setJsonError('Invalid JSON syntax: ' + e.message);
    }
  };

  // Filtered list
  const filteredShifts = shifts.filter((s) => {
    if (hideFilledShifts && s.status === 'filled') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.siteName.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.assignedGuardName && s.assignedGuardName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Shift Creation Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#1e3a8a]" />
            Post New Operational Shift
          </h2>
          <button
            id="toggle-json-import-btn"
            type="button"
            onClick={() => setShowJsonImporter(!showJsonImporter)}
            className="text-xs font-bold text-[#1e3a8a] hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            {showJsonImporter ? 'Hide JSON Importer' : 'Mass JSON Import'}
          </button>
        </div>

        {/* JSON Importer Drawer */}
        {showJsonImporter ? (
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl mb-4 border border-slate-800 animate-in fade-in duration-150">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-mono text-blue-300 font-bold uppercase">
                Paste JSON Shift Array
              </span>
              <button
                type="button"
                onClick={() => setJsonText(SAMPLE_JSON_SHIFTS)}
                className="text-[11px] font-mono text-slate-400 hover:text-white underline"
              >
                Reset Sample Schema
              </button>
            </div>
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs text-emerald-400 p-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {jsonError && (
              <p className="text-xs text-red-400 font-mono mt-1 whitespace-pre-wrap bg-red-950/60 p-2 rounded border border-red-800">
                {jsonError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowJsonImporter(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                id="bulk-import-shifts-btn"
                type="button"
                onClick={handleImportJson}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider shadow-md"
              >
                Import Shift Array
              </button>
            </div>
          </div>
        ) : (
          /* Single Shift Creation Form */
          <form onSubmit={handleCreateSingleShift} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gotham Bank - Main Vault"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Shift Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a] bg-white font-medium"
                >
                  <option value="standard">Standard</option>
                  <option value="emergency">Emergency (High Priority)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Rate ($/hr)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>
            </div>

            {/* Auto hours calculation alert banner */}
            <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Auto-calculated Duration: <strong className="text-[#1e3a8a] font-bold font-mono">{calculatedHours} Hours</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                {urgency === 'emergency' ? '🚨 Flagged as Emergency' : 'Standard Routine Shift'}
              </span>
            </div>

            <button
              id="post-shift-submit-btn"
              type="submit"
              className="w-full bg-[#1e3a8a] text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider shadow-md hover:bg-blue-900 active:bg-blue-950 transition-all"
            >
              POST TO OPEN BOARD
            </button>
          </form>
        )}
      </div>

      {/* 2. Active Shift Feed Table / List */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Active Shift Feed ({filteredShifts.length})
            </h2>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter site/guard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Hide Filled Shifts Toggle */}
          <button
            id="hide-filled-toggle-btn"
            onClick={() => setHideFilledShifts(!hideFilledShifts)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-slate-500">Hide Filled</span>
            <div className={`w-8 h-4 rounded-full transition-colors relative ${hideFilledShifts ? 'bg-[#1e3a8a]' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hideFilledShifts ? 'left-4.5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        {/* Scrollable Table View */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200 font-bold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Site & Schedule</th>
                <th className="px-3 py-2.5">Duration</th>
                <th className="px-3 py-2.5">Urgency</th>
                <th className="px-4 py-2.5">Guard Assignment</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No shifts found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => {
                  const isFilled = shift.status === 'filled';
                  return (
                    <tr
                      key={shift.id}
                      id={`ops-shift-row-${shift.id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isFilled ? 'bg-slate-50/60 opacity-60' : ''
                      }`}
                    >
                      {/* Site & Time */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{shift.siteName}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {formatDateLabel(shift.date)} • {shift.startTime} - {shift.endTime}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-700">
                        {shift.hours}h
                      </td>

                      {/* Urgency */}
                      <td className="px-3 py-3">
                        {shift.urgency === 'emergency' ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            Emergency
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Assigned Guard */}
                      <td className="px-4 py-3">
                        {isFilled ? (
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {shift.assignedGuardName || 'Marcus Wright'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Unassigned ({shift.bidsCount} Bid{shift.bidsCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isFilled ? (
                            <button
                              id={`reopen-shift-btn-${shift.id}`}
                              onClick={() => reopenShift(shift.id)}
                              className="text-slate-600 hover:text-[#1e3a8a] font-bold text-xs hover:underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reopen
                            </button>
                          ) : (
                            <button
                              id={`mark-filled-shift-btn-${shift.id}`}
                              onClick={() => markShiftFilled(shift.id, 'Assigned via Ops')}
                              className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Mark Filled
                            </button>
                          )}

                          <button
                            onClick={() => deleteShift(shift.id)}
                            title="Delete shift"
                            className="text-slate-300 hover:text-red-600 p-1 rounded hover:bg-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
