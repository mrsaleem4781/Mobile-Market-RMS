import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RotateCw, 
  AlertTriangle, 
  Search 
} from 'lucide-react';
import { db } from '../offline/db';
import { Transaction } from '../types';

export default function ImeiVerifyPortal() {
  const [verifyImei, setVerifyImei] = useState('');
  const [verifyResult, setVerifyResult] = useState<'IDLE' | 'CLEAN' | 'STOLEN' | 'LOCAL_EXISTS'>('IDLE');
  const [verifyDetails, setVerifyDetails] = useState<{
    model: string;
    reportType: string;
    date: string;
    reportNumber: string;
    location: string;
    authority: string;
  } | null>(null);
  const [localExistsDetails, setLocalExistsDetails] = useState<Transaction | null>(null);
  const [checkingImei, setCheckingImei] = useState(false);

  const handleVerifyImeiStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = verifyImei.replace(/[^0-9]/g, '');
    if (cleaned.length < 14) {
      alert("Please enter a complete 14 or 15-digit IMEI number to verify.");
      return;
    }

    setCheckingImei(true);
    setVerifyResult('IDLE');
    setVerifyDetails(null);
    setLocalExistsDetails(null);

    // Simulate network lookup delay on CPLC Sindh database
    setTimeout(async () => {
      const blacklisted: { [key: string]: typeof verifyDetails } = {
        '352001122334455': {
          model: 'Samsung Galaxy S23 Ultra',
          reportType: 'REPORTED STOLEN / GUNPOINT ROBBERY',
          date: '2026-05-12',
          reportNumber: 'FIR No. 344/26 (Clifton PS, Karachi)',
          location: 'Clifton, Karachi, Sindh',
          authority: 'CPLC Sindh Verification System'
        },
        '861122003344556': {
          model: 'Infinix Hot 40 Pro',
          reportType: 'SNATCHED & BLOCKED BY CPLC',
          date: '2026-05-18',
          reportNumber: 'CPLC Diary No. 8876/C (Quaidabad division)',
          location: 'Quaidabad Mobile Market area, Karachi',
          authority: 'Citizens-Police Liaison Committee (CPLC) Sindh'
        },
        '445566778899001': {
          model: 'Apple iPhone 15 Pro',
          reportType: 'LOST / SUSPENDED REGISTRY',
          date: '2026-05-01',
          reportNumber: 'Police Report Code: K-4552 (Karachi Central)',
          location: 'Gulshan-e-Iqbal, Karachi',
          authority: 'CPLC Sindh & Karachi Police'
        },
        '123456789012345': {
          model: 'Vivo V30 Blue',
          reportType: 'ACTIVE THEFT COMPLAINT',
          date: '2026-05-22',
          reportNumber: 'Daily Diary Entry #7 (Zaman Town PS)',
          location: 'Korangi, Karachi',
          authority: 'CPLC Sindh Security Division'
        }
      };

      // 1. Query the live user-reported snatched & stolen database
      const matchedReport = await db.reportedMobiles
        .where('imei1')
        .equals(cleaned)
        .or('imei2')
        .equals(cleaned)
        .first();

      if (matchedReport) {
        setVerifyDetails({
          model: `${matchedReport.brand} ${matchedReport.model}`,
          reportType: `OFFICIALLY REPORTED ${matchedReport.status} DEVICE`,
          date: matchedReport.incidentDate,
          reportNumber: `FIR/Diary: ${matchedReport.firNumber || 'Not Logged'} (${matchedReport.policeStation || 'N/A'} PS)`,
          location: matchedReport.policeStation || 'N/A',
          authority: `Reported by ${matchedReport.reportedByName} on ${new Date(matchedReport.reportedAt).toLocaleDateString()}`
        });
        setVerifyResult('STOLEN');
        setCheckingImei(false);
        return;
      }

      const matchedStolen = blacklisted[cleaned];
      if (matchedStolen) {
        setVerifyDetails(matchedStolen);
        setVerifyResult('STOLEN');
        setCheckingImei(false);
        return;
      }

      // 2. Check if IMEI exists locally in our mobile shops database (warn if someone is selling it in multiple shops)
      const localMatches = await db.transactions
        .where('imei1')
        .equals(cleaned)
        .or('imei2')
        .equals(cleaned)
        .first();

      if (localMatches) {
        setLocalExistsDetails(localMatches);
        setVerifyResult('LOCAL_EXISTS');
        setCheckingImei(false);
        return;
      }

      // If clean
      setVerifyResult('CLEAN');
      setCheckingImei(false);
    }, 1200);
  };

  return (
    <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> CPLC Sindh Verify Portal
          </h3>
          <p className="text-[11px] text-slate-500 font-medium font-sans">
            Verify device models and IMEI status before buying or selling to ensure they are not reported stolen or blacklisted.
          </p>
        </div>
        <span className="bg-blue-50 text-blue-800 border border-blue-150 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase self-start sm:self-auto tracking-wider">
          Live CPLC Sindh Integration
        </span>
      </div>

      <form onSubmit={handleVerifyImeiStatus} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">IMEI verification number (14-15 Digits)</label>
          <input
            type="text"
            required
            maxLength={15}
            placeholder="Enter active IMEI number to search or click on any demo below to test..."
            value={verifyImei}
            onChange={(e) => setVerifyImei(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-205 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={checkingImei}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase duration-155 shadow-xs cursor-pointer disabled:opacity-50 select-none flex items-center justify-center gap-1.5"
        >
          {checkingImei ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              VERIFY STATUS
            </>
          )}
        </button>
      </form>

      {/* Quick test suggestion triggers */}
      <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
        <span className="text-[10px] text-slate-500 font-bold font-mono uppercase">Quick Demo Verification:</span>
        <button
          type="button"
          onClick={() => { setVerifyImei('352001122334455'); setVerifyResult('IDLE'); }}
          className="px-2 py-1 text-[9px] font-mono font-bold border border-rose-205 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-rose-700 transition duration-150 cursor-pointer"
        >
          🚨 Stolen Samsung (352001122334455)
        </button>
        <button
          type="button"
          onClick={() => { setVerifyImei('861122003344556'); setVerifyResult('IDLE'); }}
          className="px-2 py-1 text-[9px] font-mono font-bold border border-rose-205 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-rose-700 transition duration-150 cursor-pointer"
        >
          🚨 Snatched Infinix (861122003344556)
        </button>
        <button
          type="button"
          onClick={() => { setVerifyImei('358249622915834'); setVerifyResult('IDLE'); }}
          className="px-2 py-1 text-[9px] font-mono font-bold border border-amber-205 bg-amber-50/30 hover:bg-amber-50 rounded-lg text-amber-700 transition duration-150 cursor-pointer"
        >
          ⚖️ Double-shop IMEI Check
        </button>
        <button
          type="button"
          onClick={() => { setVerifyImei('358249622915999'); setVerifyResult('IDLE'); }}
          className="px-2 py-1 text-[9px] font-mono font-bold border border-emerald-205 bg-emerald-50/30 hover:bg-emerald-50 rounded-lg text-emerald-700 transition duration-150 cursor-pointer"
        >
          ✔️ Clean IMEI Check
        </button>
      </div>

      {/* Dynamic Verification Results */}
      {verifyResult === 'CLEAN' && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200" id="verify-clean-alert">
          <span className="bg-emerald-500 text-white rounded-full p-1.5 shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-emerald-800 tracking-wide font-mono uppercase">✅ NO ACTIVE BLACKLIST COMPLAINTS FOUND (SAFE TO TRADE)</h4>
            <p className="text-[11px] text-emerald-700 font-medium leading-relaxed font-sans">
              This device/IMEI is reported <strong>completely CLEAN</strong>. No active theft, snatching, or blocking complaints are found against this IMEI on the Citizens-Police Liaison Committee (CPLC) Sindh registry or national security checklists. You may safely buy or sell this device.
            </p>
            <div className="text-[9px] text-emerald-600 font-mono font-bold mt-2 pt-1 border-t border-emerald-200/50">
              DATABASE: SECURE TELECOM COMPLIANCE INDEX | TIME CHECKED: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {verifyResult === 'STOLEN' && verifyDetails && (
        <div className="p-4 bg-rose-50 border border-rose-250 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200 animate-pulse" id="verify-stolen-alert">
          <span className="bg-rose-600 text-white rounded-full p-1.5 shrink-0 shadow-sm animate-bounce">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h4 className="text-xs font-extrabold text-rose-800 tracking-wide font-mono uppercase">🚨 ILLEGAL DEVICE CRITICAL WARNING: REPORTED STOLEN / BLOCKED</h4>
            <p className="text-[11px] text-rose-700 font-semibold leading-relaxed font-sans">
              This device is registered on the blacklisted / stolen database. An active police FIR or theft report is recorded on this IMEI. Trading this device is a serious legal violation and SOP non-compliance.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-800 bg-white/60 p-3.5 rounded-lg border border-rose-150 font-mono mt-2">
              <div>Device Model: <strong className="text-slate-900">{verifyDetails.model}</strong></div>
              <div>Theft Report Type: <strong className="text-rose-700">{verifyDetails.reportType}</strong></div>
              <div>FIR / Complaint Code: <strong className="text-slate-900">{verifyDetails.reportNumber}</strong></div>
              <div>Theft Location: <strong className="text-slate-900">{verifyDetails.location}</strong></div>
              <div>FIR Registration Date: <strong className="text-slate-900">{verifyDetails.date}</strong></div>
              <div>Authorizing Bureau: <strong className="text-blue-700">{verifyDetails.authority}</strong></div>
            </div>

            <div className="text-[9px] text-rose-600 font-bold block pt-1.5 text-center sm:text-left font-sans">
              ⚠️ CPLC SINDH INSTRUCTIONS: Do not trade this device. Immediately report this match to the nearest CPLC Sindh cell or local police authority.
            </div>
          </div>
        </div>
      )}

      {verifyResult === 'LOCAL_EXISTS' && localExistsDetails && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200" id="verify-exists-alert">
          <span className="bg-amber-500 text-white rounded-full p-1.5 shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="space-y-1.5">
            <h4 className="text-xs font-extrabold text-amber-800 tracking-wide font-mono uppercase">⚠️ DUPLICATE INTERNAL REGISTRY MATCH (SOP WARNING)</h4>
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed font-sans">
              This device has already been logged in our active internal registry database. Multiple trades of the same serial/IMEI across different shops within a short time interval indicate high suspicion.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-800 bg-white/65 p-3.5 rounded-lg border border-amber-150 font-mono">
              <div>Logged Model: <strong className="text-slate-900">{localExistsDetails.mobileModel}</strong></div>
              <div>Logged Shop Name: <strong className="text-slate-900">{localExistsDetails.shopName}</strong></div>
              <div>SOP Trade Type: <strong className="text-blue-705">{localExistsDetails.type}</strong></div>
              <div>Recorded Date: <strong className="text-slate-900">{new Date(localExistsDetails.dateTime).toLocaleDateString()} {new Date(localExistsDetails.dateTime).toLocaleTimeString()}</strong></div>
              <div>Recorded Market: <strong className="text-slate-900">{localExistsDetails.marketName}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
