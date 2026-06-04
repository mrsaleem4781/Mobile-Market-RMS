/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { formatCNICInput } from '../../utils/security';
import { 
  Lock, 
  Smartphone, 
  User, 
  Mail, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles,
  Building,
  Store,
  IdCard,
  Phone,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Users
} from 'lucide-react';
import { db } from '../../offline/db';
import { SEED_USERS, SEED_MARKETS } from '../../offline/seedData';
import { AppUser, UserRole, Market } from '../../types';

interface AuthModuleProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const SECURITY_QUESTIONS = [
  { value: 'birth_city', label: 'What city were you born in?' },
  { value: 'first_school', label: 'What was the name of your first school?' },
  { value: 'first_pet', label: 'What was your first pet\'s name?' },
  { value: 'favorite_food', label: 'What is your favorite food?' },
];

export default function AuthModule({ onLoginSuccess }: AuthModuleProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [enteredEmail, setEnteredEmail] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [customUsers, setCustomUsers] = useState<AppUser[]>([]);
  
  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSecurityQuestion, setRegSecurityQuestion] = useState('birth_city');
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('SHOPKEEPER');
  const [regCnic, setRegCnic] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regMarketId, setRegMarketId] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regShopAddress, setRegShopAddress] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Loading indicator states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Verifying credentials...');

  // Rich Status Notification structure
  const [statusAlert, setStatusAlert] = useState<{
    type: 'SUCCESS' | 'ERROR' | 'PENDING' | 'REJECTED' | 'INFO';
    heading: string;
    message: string;
  } | null>(null);

  const triggerAlert = (
    type: 'SUCCESS' | 'ERROR' | 'PENDING' | 'REJECTED' | 'INFO',
    heading: string,
    message: string
  ) => {
    setStatusAlert({ type, heading, message });
    setStatusMessage(message);
  };

  const clearAlert = () => {
    setStatusAlert(null);
    setStatusMessage(null);
  };

  // Account Recovery States
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [dbUserForRecovery, setDbUserForRecovery] = useState<AppUser | null>(null);
  const [providedRecoveryAnswer, setProvidedRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Email verify/Security Q look-up, 2: Q&A Answer, 3: Set Password

  const handleStartRecovery = () => {
    setIsRecovering(true);
    setRecoveryEmail('');
    setDbUserForRecovery(null);
    setProvidedRecoveryAnswer('');
    setNewPassword('');
    setRecoveryStep(1);
    clearAlert();
  };

  // Load markets and custom registered merchants
  useEffect(() => {
    const loadData = async () => {
      const dbMarkets = await db.markets.toArray();
      setMarkets(dbMarkets.length > 0 ? dbMarkets : SEED_MARKETS);
      
      const allUsers = await db.users.toArray();
      const seedIds = SEED_USERS.map(u => u.id);
      const custom = allUsers.filter(u => !seedIds.includes(u.id));
      setCustomUsers(custom);
    };
    loadData();
  }, [isRegistering, isRecovering]);

  // Handle Preset Account Clicks - copies email and requests password entry
  const handlePresetLogin = async (presetId: string) => {
    let profile = await db.users.get(presetId);
    if (!profile) {
      // Fallback to seed config
      const sUser = SEED_USERS.find(u => u.id === presetId);
      if (sUser) {
        profile = sUser;
        await db.users.put(sUser);
      }
    }
    
    if (profile) {
      setEnteredEmail(profile.email);
      setEnteredPassword('');
      const pHelp = profile.password || (profile.role === 'SUPER_ADMIN' ? 'admin123' : profile.role === 'MARKET_ADMIN' ? 'quaidabad123' : 'saleem123');
      
      triggerAlert(
        'INFO',
        `Accessing Preset Portal: ${profile.name}`,
        `Credential email selected! Please enter password "${pHelp}" below and click the sign-in button.`
      );
    } else {
      triggerAlert(
        'ERROR',
        "Credential Load Error",
        "Could not load selected user compliance profile. Please register a new account."
      );
    }
  };

  // Secure customized login verify
  const handleCustomEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();

    const cleanEmail = enteredEmail.trim().toLowerCase();
    if (!cleanEmail) {
      triggerAlert(
        'ERROR',
        "Email Verification Failed",
        "Please input your registered email address before logging in."
      );
      return;
    }
    if (!enteredPassword) {
      triggerAlert(
        'ERROR',
        "Password Verification Failed",
        "Please enter your account password to verify your identity."
      );
      return;
    }

    setIsLoading(true);
    setLoadingText("Verifying credentials against the compliance ledger. Please wait...");

    setTimeout(async () => {
      try {
        // Search local database profiles
        let profile = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
        
        // Check presets if not found
        if (!profile) {
          profile = SEED_USERS.find(u => u.email.toLowerCase() === cleanEmail);
          if (profile) {
            await db.users.put(profile);
          }
        }

        if (profile) {
          // Compare password
          const correctPass = profile.password || (profile.role === 'SUPER_ADMIN' ? 'admin123' : profile.role === 'MARKET_ADMIN' ? 'quaidabad123' : 'saleem123');
          if (correctPass !== enteredPassword) {
            setIsLoading(false);
            triggerAlert(
              'REJECTED',
              "Access Rejected: Invalid Credentials",
              "The security password you entered is incorrect. Access to compliance records is denied. Please try again."
            );
            return;
          }

          // Check account approval status
          if (profile.role === 'SHOPKEEPER' || profile.role === 'MARKET_ADMIN') {
            if (profile.status === 'PENDING') {
              setIsLoading(false);
              triggerAlert(
                'PENDING',
                "Access Suspended: Approval Pending",
                `The trade profile for "${profile.name}" has been recorded but is currently PENDING. A system inspector must approve your profile under regulatory compliance before system access is granted.`
              );
              return;
            } else if (profile.status === 'REJECTED') {
              setIsLoading(false);
              triggerAlert(
                'REJECTED',
                "Access Blocked: Account Rejected",
                `Your account application for "${profile.name}" was REJECTED by administrative enforcement. Device trade authorization has been revoked.`
              );
              return;
            }
          }

          setLoadingText(`Identity Authorized! Preparing secure workspace dashboard...`);
          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(profile!);
          }, 800);
        } else {
          setIsLoading(false);
          triggerAlert(
            'ERROR',
            "Profile Not Registered",
            `No compliance profile matching "${enteredEmail}" exists in our registers. Please register a new account.`
          );
        }
      } catch (err) {
        setIsLoading(false);
        triggerAlert(
          'ERROR',
          "Portal Connection Interrupt",
          "An index lookup error occurred on the secure database registers. Please restart the portal and retry."
        );
      }
    }, 1500);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();

    if (!regName || !regEmail || !regCnic || !regContact || !regPassword || !regSecurityAnswer) {
      triggerAlert(
        'ERROR',
        "Registration Denied: Missing Fields",
        "Please fill in all mandatory legal, compliance, and security fields."
      );
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanedCnic = regCnic.replace(/[^0-9]/g, "");
    if (cleanedCnic.length !== 13) {
      triggerAlert(
        'ERROR',
        "Identity Check Failed: Invalid CNIC",
        "Your CNIC must consist of exactly 13 digits (Format: XXXXX-XXXXXXX-X)."
      );
      return;
    }
    const formattedCnic = cleanedCnic.slice(0, 5) + "-" + cleanedCnic.slice(5, 12) + "-" + cleanedCnic.slice(12, 13);

    setIsLoading(true);
    setLoadingText("Registering user profile with Quaidabad Compliance Portal. Please wait...");

    setTimeout(async () => {
      try {
        // Enforce uniqueness constraints (no duplicate email or CNIC allowed)
        const allRegisteredUsers = await db.users.toArray();
        
        const emailExists = allRegisteredUsers.some(u => u.email.toLowerCase() === cleanEmail);
        if (emailExists) {
          setIsLoading(false);
          triggerAlert(
            'REJECTED',
            "Registration Blocked: Duplicate Email",
            `The email address "${regEmail}" is already registered. Please sign in or initiate recovery.`
          );
          return;
        }

        const cnicExists = allRegisteredUsers.some(u => u.cnic && u.cnic.replace(/[^0-9]/g, "") === cleanedCnic);
        if (cnicExists) {
          setIsLoading(false);
          triggerAlert(
            'REJECTED',
            "Registration Blocked: Duplicate CNIC",
            `The CNIC/Identity Card "${formattedCnic}" is already registered. Only one account per citizen is permitted.`
          );
          return;
        }

        const matchedMarket = regRole !== 'SUPER_ADMIN' ? markets.find(m => m.id === regMarketId) : undefined;

        const newUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
        const newShopId = regRole === 'SHOPKEEPER' ? `shp-${Math.random().toString(36).substr(2, 9)}` : undefined;

        // Super Admin registered are APPROVED directly; other roles start as PENDING
        const initialStatus = regRole === 'SUPER_ADMIN' ? 'APPROVED' : 'PENDING';

        const newUser: AppUser = {
          id: newUserId,
          name: regName,
          email: regEmail.trim(),
          password: regPassword,
          securityQuestion: regSecurityQuestion,
          securityAnswer: regSecurityAnswer,
          role: regRole,
          status: initialStatus,
          cnic: formattedCnic,
          contactNumber: regContact,
          marketId: regMarketId || undefined,
          marketName: matchedMarket ? matchedMarket.name : undefined,
          shopId: newShopId,
          shopName: regRole === 'SHOPKEEPER' ? regShopName : undefined,
          shopAddress: regRole === 'SHOPKEEPER' ? regShopAddress : undefined,
          createdAt: new Date().toISOString()
        };

        // 1. Write user to local IndexedDB profiles cache
        await db.users.put(newUser);

        // 2. If Shopkeeper, register corresponding Shop node as PENDING
        if (regRole === 'SHOPKEEPER' && newShopId) {
          const newShop = {
            id: newShopId,
            name: regShopName || `${regName}'s Mobile Shop`,
            marketId: regMarketId,
            marketName: matchedMarket ? matchedMarket.name : 'Unknown Market',
            ownerName: regName,
            contactNumber: regContact,
            cnic: formattedCnic,
            shopAddress: regShopAddress,
            status: 'PENDING' as const,
            createdAt: new Date().toISOString()
          };
          await db.shops.put(newShop);
          
          await db.syncQueue.put({
            id: `${newShopId}_create_${Date.now()}`,
            transactionId: newShopId,
            action: 'CREATE',
            payload: newShop,
            timestamp: new Date().toISOString(),
            retryCount: 0
          });
        }

        setIsLoading(false);

        if (initialStatus === 'APPROVED') {
          triggerAlert(
            'SUCCESS',
            "Administrator Enrolled Successfully",
            `National Administration Portal registered user "${regName}" and APPROVED instantly. You can now login with your credentials.`
          );
        } else {
          triggerAlert(
            'PENDING',
            "Account Registration Recorded",
            `Welcome ${regName}! Your trade compliance profile was created successfully. Your account status is currently PENDING. Note: To log in, you must be approved by a Market Inspector or Super Admin.`
          );
        }
        
        // Auto switch back to login and focus the newly created user
        setTimeout(() => {
          setIsRegistering(false);
          setEnteredEmail(regEmail);
          setEnteredPassword('');
          clearAlert();
        }, 5000);

      } catch (err) {
        setIsLoading(false);
        triggerAlert(
          'ERROR',
          "Infrastructure Write Error",
          "Failed to write trade profile parameters. Please reboot database registry cache and try again."
        );
      }
    }, 1500);
  };

  // Secure self-service account recovery triggers
  const handleVerifyEmailAndQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    const emailToFind = recoveryEmail.trim().toLowerCase();
    if (!emailToFind) {
      triggerAlert(
        'ERROR',
        "Lookup Failed",
        "Please enter your registered email address before continuing."
      );
      return;
    }

    setIsLoading(true);
    setLoadingText("Querying secure CPLC registries for identity parameters...");

    setTimeout(async () => {
      let userProfile = await db.users.where('email').equalsIgnoreCase(emailToFind).first();
      if (!userProfile) {
        userProfile = SEED_USERS.find(u => u.email.toLowerCase() === emailToFind);
      }

      setIsLoading(false);

      if (!userProfile) {
        triggerAlert(
          'ERROR',
          "No Registration Found",
          "No profile matches this email address in local CPLC registers."
        );
        return;
      }

      if (!userProfile.securityQuestion) {
        // Standard default question settings for preloaded seed accounts
        userProfile.securityQuestion = 'birth_city';
        userProfile.securityAnswer = userProfile.role === 'SUPER_ADMIN' ? 'islamabad' : 'karachi';
      }

      setDbUserForRecovery(userProfile);
      setRecoveryStep(2);
    }, 1500);
  };

  const handleVerifyAnswerAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    if (!dbUserForRecovery) return;

    const provided = providedRecoveryAnswer.trim().toLowerCase();
    const correct = (dbUserForRecovery.securityAnswer || '').trim().toLowerCase();

    if (provided !== correct) {
      triggerAlert(
        'REJECTED',
        "Security Check Failed",
        "Verification failed. Incorrect security question answer provided."
      );
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      triggerAlert(
        'ERROR',
        "Weak Identity Credentials",
        "Please specify a secure password (minimum of 4 characters required)."
      );
      return;
    }

    setIsLoading(true);
    setLoadingText("Updating biometric entry passcodes on registry...");

    setTimeout(async () => {
      try {
        dbUserForRecovery.password = newPassword;
        await db.users.put(dbUserForRecovery);
        
        setIsLoading(false);
        setRecoveryStep(3);
        triggerAlert(
          'SUCCESS',
          "Credentials Synchronized Successfully",
          "Account credential security password successfully reset! You can now sign in with your new password."
        );
      } catch (e) {
        setIsLoading(false);
        triggerAlert(
          'ERROR',
          "Database Cache Error",
          "Failed to save your new password security parameter to database."
        );
      }
    }, 1500);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-red-50 text-red-705 text-[9px] px-2 py-0.5 rounded-full font-bold border border-red-200">FEDERAL BUREAU</span>;
      case 'MARKET_ADMIN':
        return <span className="bg-amber-50 text-amber-705 text-[9px] px-2 py-0.5 rounded-full font-bold border border-amber-200 font-mono">MARKET INSPECTOR</span>;
      default:
        return <span className="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 font-mono">MERCHANT / SHOP</span>;
    }
  };

  const selectedQuestionObj = SECURITY_QUESTIONS.find(q => q.value === (dbUserForRecovery?.securityQuestion || 'birth_city'));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-blue-105 selection:text-blue-950 font-sans" id="auth-root">
      {/* Flipping mobile keyframe animation */}
      <style>{`
        @keyframes flip-phone-animation {
          0% { transform: perspective(300px) rotateY(0deg); }
          50% { transform: perspective(300px) rotateY(180deg); }
          100% { transform: perspective(300px) rotateY(360deg); }
        }
        .animate-flip-phone {
          animation: flip-phone-animation 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Subtle Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 -z-10"></div>

      {/* 3D Flipping Mobile Phone Loading Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[9999] flex flex-col items-center justify-center p-6 animate-fade-in" id="mobile-loading-spinner-modal">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-4 max-w-xs text-center border border-slate-100">
            <div className="w-12 h-20 bg-slate-850 rounded-xl relative flex items-center justify-center shadow-lg border border-slate-700 animate-flip-phone">
              <div className="w-10 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xs">
                ✓
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-650 uppercase tracking-wider font-mono">Processing...</p>
              <p className="text-xs font-semibold text-slate-700 leading-tight">
                {loadingText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-lg space-y-6">
        
        {/* Simplified Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-blue-600 text-white p-3 rounded-2xl shadow-md">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight" id="main-brand-title">
            Quaidabad Mobile Registry
          </h1>
          <p className="text-xs font-bold text-slate-500 font-mono tracking-wide uppercase flex items-center justify-center gap-1">
            <span>DEVICE COMPLIANCE PORTAL</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-bold">ڈوائس رجسٹریشن</span>
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden relative" id="auth-main-panel">
          
          {/* Top Tabs switcher (Only if not recovering account) */}
          {!isRecovering && (
            <div className="flex border-b border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => { setIsRegistering(false); clearAlert(); }}
                className={`flex-1 py-4 text-xs font-extrabold uppercase tracking-wider duration-150 flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                  !isRegistering 
                    ? 'border-blue-600 bg-white text-blue-700 font-black' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-login-btn"
              >
                <Lock className="w-3.5 h-3.5" />
                Sign In / لاگ ان
              </button>
              <button
                type="button"
                onClick={() => { setIsRegistering(true); clearAlert(); }}
                className={`flex-1 py-4 text-xs font-extrabold uppercase tracking-wider duration-150 flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
                  isRegistering 
                    ? 'border-emerald-600 bg-white text-emerald-750 font-black' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-register-btn"
              >
                <Store className="w-3.5 h-3.5" />
                Register Shop / رجسٹریشن
              </button>
            </div>
          )}

          <div className="p-6 md:p-8 space-y-6">
            
            {/* Status Alert Banner */}
            {statusAlert && (
              <div className="p-4 rounded-2xl border border-slate-150 text-xs bg-slate-50 leading-relaxed font-sans shadow-xs animate-fade-in" id="auth-status-message">
                <div className="flex items-start gap-3">
                  {statusAlert.type === 'SUCCESS' ? (
                    <div className="bg-emerald-100 text-emerald-805 p-2 rounded-xl shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    </div>
                  ) : statusAlert.type === 'PENDING' ? (
                    <div className="bg-amber-100 text-amber-805 p-2 rounded-xl shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-750 animate-bounce" />
                    </div>
                  ) : statusAlert.type === 'REJECTED' ? (
                    <div className="bg-rose-100 text-rose-805 p-2 rounded-xl shrink-0">
                      <Lock className="w-5 h-5 text-rose-700" />
                    </div>
                  ) : statusAlert.type === 'INFO' ? (
                    <div className="bg-blue-100 text-blue-805 p-2 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5 text-blue-700" />
                    </div>
                  ) : (
                    <div className="bg-red-100 text-red-805 p-2 rounded-xl shrink-0">
                      <ShieldAlert className="w-5 h-5 text-red-700" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <span className={`font-black uppercase tracking-wider text-[10.5px] block ${
                      statusAlert.type === 'SUCCESS' ? 'text-emerald-800' :
                      statusAlert.type === 'PENDING' ? 'text-amber-800' :
                      statusAlert.type === 'REJECTED' ? 'text-rose-800' :
                      statusAlert.type === 'INFO' ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {statusAlert.heading}
                    </span>
                    <p className="text-slate-655 font-semibold leading-relaxed font-sans">{statusAlert.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Recovery Flow */}
            {isRecovering ? (
              <div className="space-y-6 animate-fade-in" id="recovery-flow-container">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                      <HelpCircle className="w-4 h-4 text-blue-600" /> Recover Password / ریسٹ
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsRecovering(false); clearAlert(); }}
                    className="text-[10px] bg-slate-100 font-bold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                  >
                    ← Back to Login
                  </button>
                </div>

                {recoveryStep === 1 && (
                  <form onSubmit={handleVerifyEmailAndQuestion} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Apna Registered Email Likhen / درج کریں</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. mrsaleem4781@gmail.com"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase duration-150 cursor-pointer"
                    >
                      Find Security Question / سیکیورٹی سوال تلاش کریں
                    </button>
                  </form>
                )}

                {recoveryStep === 2 && dbUserForRecovery && (
                  <form onSubmit={handleVerifyAnswerAndResetPassword} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Sawaal / Security Question:</span>
                      <p className="text-xs font-extrabold text-slate-800">
                        {selectedQuestionObj ? selectedQuestionObj.label : 'What city were you born in?'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Jawaab Likhen / Answer</label>
                      <input
                        type="text"
                        required
                        placeholder="Security question answer"
                        value={providedRecoveryAnswer}
                        onChange={(e) => setProvidedRecoveryAnswer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Naya Password / New Password (min 4 chars)</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase duration-150 cursor-pointer"
                    >
                      Reset Password / محفوظ کریں
                    </button>
                  </form>
                )}

                {recoveryStep === 3 && (
                  <div className="py-4 text-center space-y-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 uppercase">Password Updated / پاس ورڈ تبدیل ہو گیا</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Now you can easily return and sign in with your brand new password.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setIsRecovering(false); clearAlert(); }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs uppercase cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Normal sign/register */
              <div>
                {!isRegistering ? (
                  /* SIMPLIFIED LOGIN CARD */
                  <div className="space-y-6 animate-fade-in" id="login-flow-container">
                    
                    {/* Compact Login Form */}
                    <form onSubmit={handleCustomEmailLogin} className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Email Address / ای میل</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                          <input
                            type="email"
                            required
                            value={enteredEmail}
                            onChange={(e) => setEnteredEmail(e.target.value)}
                            placeholder="e.g. mrsaleem4781@gmail.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-850 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Password / پاس ورڈ</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                          <input
                            type="password"
                            required
                            value={enteredPassword}
                            onChange={(e) => setEnteredPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-850 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleStartRecovery}
                          className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Forgot Password?
                        </button>

                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 duration-150 cursor-pointer shadow-sm active:scale-[0.98]"
                          id="btn-email-signin"
                        >
                          Sign In / داخل ہوں
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                    {/* SUPER FRIENDLY QUICK LOGINS */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">
                        Quick Demo Accounts / فوری لاگ ان کرنے کے لیے کلک کریں:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePresetLogin('usr-shopkeeper-saleem')}
                          className="flex items-center gap-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-2.5 text-left duration-200 cursor-pointer shadow-2xs text-xs font-semibold"
                        >
                          <div className="bg-emerald-100 text-emerald-805 p-1.5 rounded-lg shrink-0">
                            <Store className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[11px] leading-tight">Saleem Shopkeeper</p>
                            <p className="text-[10px] text-slate-400 font-mono italic">Password: saleem123</p>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handlePresetLogin('usr-superadmin')}
                          className="flex items-center gap-2 bg-white hover:bg-blue-550/5 border border-slate-200 hover:border-blue-400 rounded-xl p-2.5 text-left duration-200 cursor-pointer shadow-2xs text-xs font-semibold"
                        >
                          <div className="bg-blue-100 text-blue-805 p-1.5 rounded-lg shrink-0">
                            <ShieldCheck className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[11px] leading-tight">Super Admin Bureau</p>
                            <p className="text-[10px] text-slate-400 font-mono idalic">Password: admin123</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Simple Helpful Rule Note */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 leading-normal border-t border-slate-100 pt-3">
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      <p>
                        New registrations must be approved by the Bureau Admin before gaining access.
                      </p>
                    </div>

                  </div>
                ) : (
                  /* SIMPLIFIED CUSTOM REGISTRATION FORM */
                  <form onSubmit={handleRegister} className="space-y-4 animate-fade-in" id="reg-form-container">
                    
                    {/* Name and Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Full Name / پورا نام</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Asif Raza"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Email / ای میل</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="e.g. asif@gmail.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password and Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Password / پاس ورڈ</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Set password (min 4 chars)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Mobile No / فون نمبر</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            required
                            value={regContact}
                            onChange={(e) => setRegContact(e.target.value)}
                            placeholder="e.g. 03001234567"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CNIC and Account Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">CNIC Card No / شناختی کارڈ</label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            required
                            value={regCnic}
                            onChange={(e) => setRegCnic(formatCNICInput(e.target.value))}
                            placeholder="e.g. 42101-1234567-3"
                            maxLength={15}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Who are you? / اکاؤنٹ کی قسم</label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as UserRole)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
                        >
                          <option value="SHOPKEEPER">🛒 Shopkeeper (Dukandar)</option>
                          <option value="SUPER_ADMIN">🛡️ Super Admin (Manager/Admin)</option>
                        </select>
                      </div>
                    </div>

                    {/* Market selection (not for super admin) */}
                    {regRole !== 'SUPER_ADMIN' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Select Market / مارکیٹ</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 text-slate-400 w-4 h-4 mr-0.5" />
                          <select
                            value={regMarketId}
                            onChange={(e) => setRegMarketId(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                          >
                            <option value="">Select market hub...</option>
                            {markets.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Shop Details Context for Shopkeeper */}
                    {regRole === 'SHOPKEEPER' && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">Shop Business Name / دکان کا نام</label>
                          <input
                            type="text"
                            required
                            value={regShopName}
                            onChange={(e) => setRegShopName(e.target.value)}
                            placeholder="e.g. Al-Razzaq Mobile Zone"
                            className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block">Shop Floor Address / دکان کا پتہ</label>
                          <input
                            type="text"
                            required
                            value={regShopAddress}
                            onChange={(e) => setRegShopAddress(e.target.value)}
                            placeholder="e.g. Shop G-15, Ground Floor, Quaidabad Market"
                            className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Security Question Section (Simple and neat) */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-3">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Recovery Security Setup / سیکیورٹی سوال:</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-500 block">Security Question</label>
                          <select
                            value={regSecurityQuestion}
                            onChange={(e) => setRegSecurityQuestion(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                          >
                            {SECURITY_QUESTIONS.map(q => (
                              <option key={q.value} value={q.value}>{q.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-500 block">Your Answer</label>
                          <input
                            type="text"
                            required
                            placeholder="Type security answer"
                            value={regSecurityAnswer}
                            onChange={(e) => setRegSecurityAnswer(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 pt-3">
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm text-xs uppercase duration-150 cursor-pointer text-center"
                        id="btn-registrations-ledger"
                      >
                        Register Shop Account / اکاؤنٹ بنائیں
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(false); clearAlert(); }}
                        className="w-full bg-transparent hover:bg-slate-50 text-slate-500 font-bold py-2 px-4 rounded-xl text-xs uppercase duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                        id="btn-return-login"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Cancel and return to login
                      </button>
                    </div>

                  </form>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
