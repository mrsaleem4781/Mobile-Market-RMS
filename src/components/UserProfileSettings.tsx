/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  CreditCard, 
  Briefcase,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { db } from '../offline/db';
import { AppUser } from '../types';

interface UserProfileSettingsProps {
  currentUser: AppUser;
  onUserUpdate: (updatedUser: AppUser) => void;
}

export default function UserProfileSettings({
  currentUser,
  onUserUpdate
}: UserProfileSettingsProps) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [designation, setDesignation] = useState(currentUser.designation || '');
  const [contactNumber, setContactNumber] = useState(currentUser.contactNumber || '');
  const [cnic, setCnic] = useState(currentUser.cnic || '');
  
  const [password, setPassword] = useState(currentUser.password || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    
    const trimmedEmail = email.trim().toLowerCase();
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Name is required / نام لکھنا لازمی ہے۔' });
      return;
    }
    if (!trimmedEmail) {
      setStatusMsg({ type: 'error', text: 'Email is required / ای میل لازمی ہے۔' });
      return;
    }

    // Password change validation if typed
    let finalPassword = password;
    if (newPassword) {
      if (newPassword.length < 6) {
        setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters long / نیا پاس ورڈ کم از کم 6 ہندسوں کا ہونا چاہیے۔' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatusMsg({ type: 'error', text: 'New passwords do not match / نئے پاس ورڈز آپس میں مطابقت نہیں رکھتے۔' });
        return;
      }
      finalPassword = newPassword;
    }

    setIsSaving(true);

    try {
      // 1. Prepare updated user model
      const updatedUser: AppUser = {
        ...currentUser,
        name: name.trim(),
        email: trimmedEmail,
        designation: designation.trim(),
        contactNumber: contactNumber.trim(),
        cnic: cnic.trim(),
        password: finalPassword
      };

      // 2. Persist to Dexie DB
      await db.users.put(updatedUser);

      // 3. Update top-level application state
      onUserUpdate(updatedUser);

      // Reset password change fields
      setNewPassword('');
      setConfirmPassword('');
      setPassword(finalPassword);

      setStatusMsg({
        type: 'success',
        text: 'Profile updated successfully! / پروفائل کامیابی سے اپ ڈیٹ ہو گئی ہے۔'
      });
      
      // Auto-clear message
      setTimeout(() => {
        setStatusMsg(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to update profile settings:', err);
      setStatusMsg({
        type: 'error',
        text: 'An error occurred while saving profile settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-3xl mx-auto" id="profile-settings-container">
      {/* Visual Identity Title Board */}
      <div className="px-6 py-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
              Profile Settings / پروفائل سیٹنگز
            </h2>
            <p className="text-white/80 text-[11px] leading-none mt-1 font-semibold uppercase tracking-wider">
              Manage your personal and security credentials
            </p>
          </div>
        </div>
        <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15 self-start text-xs font-bold font-mono">
          Role: {currentUser.role === 'SUPER_ADMIN' ? '🛡️ Super Admin' : '🛒 Merchant'}
        </div>
      </div>

      <form onSubmit={handleProfileSave} className="p-6 md:p-8 space-y-6">
        {/* Alerts Center */}
        {statusMsg && (
          <div 
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed font-semibold transition ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
            id="profile-alert-message"
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>{statusMsg.text}</div>
          </div>
        )}

        {/* Section 1: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-100 pb-2">
            1. Personal Directory Information / ذاتی معلومات
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Full Name / مکمل نام <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Title / Designation Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Designation / سرکاری عہدہ
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Director Regulatory Control"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email Contact Direct Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Official Email / سرکاری ای میل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. office@domain.pk"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Contact Telephone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Phone Contact Number / فون نمبر
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 03001234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* National Identity CNIC */}
            <div className="grid grid-cols-1 col-span-1 md:col-span-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                  National CNIC / شناختی کارڈ نمبر
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="e.g. 42101-1234567-3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Account Security Credentials */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-100 pb-2">
            2. Authentication & Credentials / پاس ورڈ کی تبدیلی
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Show/Inspect current running Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Current Password / موجودہ پاس ورڈ
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  disabled
                  value={password}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-500 font-bold focus:outline-none select-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 duration-150"
                  id="btn-toggle-current-pass"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-sans italic">
                This is your running system authentication key.
              </p>
            </div>

            <div className="hidden md:block"></div>

            {/* Input target for New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                New Action Key / نیا پاس ورڈ لکھیں
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 duration-150"
                  id="btn-toggle-new-pass"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm target New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-tight block">
                Re-type Password / نیا پاس ورڈ دوبارہ درج کریں
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Row buttons */}
        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs uppercase tracking-wide px-6 py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 duration-100 cursor-pointer flex items-center gap-2"
            id="btn-save-profile-settings"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Settings / محفوظ کریں'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
