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
  Users,
  UserCheck,
  Newspaper,
  Megaphone,
  Calendar,
  Award
} from 'lucide-react';
import { db } from '../../offline/db';
import { SEED_USERS, SEED_MARKETS } from '../../offline/seedData';
import { AppUser, UserRole, Market } from '../../types';

export const defaultPortalStories = [
  {
    id: 'story-spark-20c',
    title: "Tecno Spark 20C Snatched Mobile Swift Recovery",
    titleUrdu: "ٹیکنو اسپارک 20C چھینے گئے موبائل کی کامیاب واپسی",
    date: "May 2026",
    badge: "RECOVERED",
    badgeStyle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    summary: "Suspicious buyer approached Shopkeeper Hassan with a Spark 20C. Hassan immediately stalled and verified the device.",
    summaryUrdu: "دکاندار حسن نے ایک مشکوک گاہک سے اسپارک 20C فون آنے پر فوری کارروائی کی اور صڈر ضیاء خان محسود کو مطلع کیا۔"
  },
  {
    id: 'story-spark-go2',
    title: "Tecno Spark Go 2 Recovered via CPLC & Technical Cell",
    titleUrdu: "ٹیکنو اسپارک گو 2 کی کامیاب بازیابی",
    date: "May 2026",
    badge: "RETURNED",
    badgeStyle: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    summary: "Snatched device retrieved through systematic tracking and returned to its verified owner at KMEDA Headquarters.",
    summaryUrdu: "چھینا گیا اسپارک گو 2 موبائل فون سی پی ایل سی اور پولیس کے ٹیکنیکل ڈیپارٹمنٹ کی مدد سے ٹریس کر کے بازیاب کرایا گیا۔"
  },
  {
    id: 'story-rafiq-center',
    title: "Rafiq Shopping Center Robbery Solved, Thieves Arrested",
    titleUrdu: "رفیق شاپنگ سینٹر تالے توڑ چوری کا معمہ حل، چور گرفتار",
    date: "April 2026",
    badge: "ARRESTED",
    badgeStyle: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    summary: "Burglars broke lock of Zulfiqar's shop. Technical institutions tracked they are now behind bars and all products returned.",
    summaryUrdu: "رفیق شاپنگ سینٹر میں دکاندار ذوالفقار کی دکان کے تالے توڑ کر چوری کی گئی تھی، چور مال سمیت قانون کی گرفت میں۔"
  }
];

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
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  
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

      try {
        // Fetch newly reported mobiles registered by the president
        const liveReports = await db.reportedMobiles.toArray();
        const newsItems: any[] = [];
        
        liveReports.forEach(rep => {
          const isRecovered = rep.status === 'RECOVERED';
          const dateStr = rep.reportedAt ? new Date(rep.reportedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'May 2026';
          
          newsItems.push({
            id: rep.id,
            title: `${rep.brand || 'Device'} ${rep.model || 'Mobile'} Tracking Added`,
            titleUrdu: `${rep.brand || 'ڈیوائس'} ${rep.model || 'موبائل'} کا کامیاب اندراج`,
            date: dateStr,
            badge: rep.status,
            badgeStyle: isRecovered 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
            summary: `CPLC blacklisted check active. FIR number: ${rep.firNumber || 'Direct Report'}. Marked status: ${rep.status}.`,
            summaryUrdu: `صدر صاحب نے اس ڈیوائس کا شناختی اندراج مکمل کر لیا ہے۔ آئی ایم ای آئی: ${rep.imei1 || 'محفوظ'}۔ کاغذی کارروائی: ${rep.firNumber || 'براہ راست اطلاعات'}۔`
          });
        });

        // Load configured stories from localStorage (if any)
        const saved = localStorage.getItem('kmeda_success_stories');
        let fallbackStories = defaultPortalStories;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            fallbackStories = parsed;
          }
        }

        // Merge latest live cases first, then defaults, maximum of 10 items
        setNewsFeed([...newsItems, ...fallbackStories].slice(0, 10));
      } catch (err) {
        console.error("Error rendering dynamic news feed indices:", err);
        setNewsFeed(defaultPortalStories);
      }
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-emerald-500 font-sans relative overflow-hidden" id="auth-root">
      {/* Flipping mobile keyframe animation */}
      <style>{`
        @keyframes flip-phone-animation {
          0% { transform: perspective(250px) rotateY(0deg); }
          50% { transform: perspective(250px) rotateY(180deg); }
          100% { transform: perspective(250px) rotateY(360deg); }
        }
        .animate-flip-phone {
          animation: flip-phone-animation 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.22; }
        }
        .animate-subtle-pulse {
          animation: subtle-pulse 4s infinite ease-in-out;
        }
      `}</style>

      {/* Futuristic Grid and Star Pattern Backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 -z-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 animate-subtle-pulse -z-10"></div>

      {/* 3D Flipping Mobile Phone Loading Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6" id="mobile-loading-spinner-modal">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 max-w-xs text-center border border-slate-800">
            <div className="w-12 h-20 bg-slate-800 rounded-xl relative flex items-center justify-center shadow-lg border border-slate-700 animate-flip-phone">
              <div className="w-10 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xs">
                ✓
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest font-mono">Verifying Profile...</p>
              <p className="text-xs font-semibold text-slate-300 leading-tight">
                {loadingText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Dual Column Split Workspace */}
      <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]" id="auth-main-panel">
        
        {/* LEFT COLUMN: THE PREMIUM BRAND LANDING STAGE */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            {/* Branding Logo Block */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Smartphone className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-white tracking-widest uppercase font-mono">
                  Pak CPLC
                </h1>
                <p className="text-[10px] font-black text-sky-400 tracking-wider uppercase font-mono">
                  Compliance Portal
                </p>
              </div>
            </div>

            {/* Split description with beauty subheadings and localized Urdu translations */}
            <div className="space-y-5 pt-4">
              <div className="space-y-1">
                <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest font-mono">SECURE TRADING / محفوظ کاروبار</span>
                <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                  Verify IMEI and Log Trustworthy Customer Trade Records
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  موبائل خریدتے اور بیچتے وقت آئی ایم ای آئی (IMEI) کا اندراج لازمی کریں اور چوری شدہ موبائلوں کی فوری شناخت پائیں۔
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] text-teal-400 font-extrabold uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-teal-400 shrink-0 animate-pulse" /> SHUBA ITLAAT / شعبہ اطلاعات و بازیابی
                  </span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-bold font-mono">LIVE FEED</span>
                </div>
                
                {/* News Container with scrollbar */}
                <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                  {newsFeed && newsFeed.length > 0 ? (
                    newsFeed.map((story: any) => (
                      <div key={story.id} className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl space-y-2 hover:border-slate-800 transition duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase font-mono ${
                            story.badge === 'RECOVERED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                            story.badge === 'RETURNED' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' :
                            'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          }`}>
                            {story.badge}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-slate-600" /> {story.date}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-white/95 leading-tight tracking-tight font-sans">
                            {story.title}
                          </h4>
                          {story.titleUrdu && (
                            <h4 className="text-[11px] font-black text-sky-300 text-right leading-tight font-sans" dir="rtl">
                              {story.titleUrdu}
                            </h4>
                          )}
                          <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-0.5">
                            {story.summary}
                          </p>
                          {story.summaryUrdu && (
                            <p className="text-[10.5px] text-slate-400 leading-relaxed text-right font-sans font-medium" dir="rtl">
                              {story.summaryUrdu}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">No announcement bulletins posted yet.</p>
                  )}
                </div>

                <p className="text-[9px] italic text-slate-505 text-center leading-tight">
                  President Zia Khan Mehsood or zone administrators publish verified recovery stories on the live registry.
                </p>
              </div>
            </div>

            {/* Visual reassurance badge card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex gap-3.5 items-center">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-[11px] text-slate-300 leading-snug font-sans">
                Complies with national cellular compliance directive <strong className="text-white font-mono font-bold">#DIRBS-2026</strong> for anti-theft operations.
              </p>
            </div>
          </div>

          {/* Secure system stats indicator */}
          <div className="pt-6 border-t border-slate-800 text-[10px] text-slate-500 font-mono space-y-1">
            <div>SECURE SYSTEM RUNTIME STATUS: <span className="text-teal-400 font-bold">● ACTIVE</span></div>
            <div>LOCAL ENCRYPTION CIPHER: <span className="text-slate-400 font-sans font-bold">AES-XOR-256</span></div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE COMPLIANCE INTERACTION TERMINAL (Form workspace) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-10 flex flex-col justify-between" id="auth-form-terminal">
          <div>
            
            {/* Form Selection Tabs switcher */}
            {!isRecovering && (
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); clearAlert(); }}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-xl transition ${
                    !isRegistering 
                      ? 'bg-blue-600 text-white shadow-md font-bold' 
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                  id="tab-login-btn"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign In / لاگ ان
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); clearAlert(); }}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-xl transition ${
                    isRegistering 
                      ? 'bg-emerald-600 text-white shadow-md font-bold' 
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                  id="tab-register-btn"
                >
                  <Store className="w-3.5 h-3.5" />
                  Register Shop / رجسٹریشن
                </button>
              </div>
            )}

            {/* Status Alert Banner */}
            {statusAlert && (
              <div className="p-4 rounded-2xl border border-slate-100 mb-6 text-xs bg-slate-50 leading-relaxed font-sans shadow-xs animate-fade-in" id="auth-status-message">
                <div className="flex items-start gap-3">
                  {statusAlert.type === 'SUCCESS' ? (
                    <div className="bg-emerald-100 text-emerald-805 p-2 rounded-xl shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    </div>
                  ) : statusAlert.type === 'PENDING' ? (
                    <div className="bg-amber-100 text-amber-805 p-2 rounded-xl shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-750" />
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
                    <p className="text-slate-600 font-semibold leading-relaxed font-sans">{statusAlert.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Form Switcher (Recovery vs Standard) */}
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
                    className="text-[10px] bg-slate-100 font-bold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 transition font-mono"
                  >
                    ← Back to Login
                  </button>
                </div>

                {recoveryStep === 1 && (
                  <form onSubmit={handleVerifyEmailAndQuestion} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Apna Registered Email Likhen / درج کریں</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. mrsaleem4781@gmail.com"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase duration-150 cursor-pointer text-center font-mono tracking-wider font-bold"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-500"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-blue-500"
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
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
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
              <div>
                {!isRegistering ? (
                  /* EXTREMELY CLEAN & FRIENDLY LOGIN CONTAINER */
                  <div className="space-y-6" id="login-flow-container">
                    
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-705 block">Password / پاس ورڈ</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                          <input
                            type="password"
                            required
                            value={enteredPassword}
                            onChange={(e) => setEnteredPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleStartRecovery}
                          className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer font-sans"
                        >
                          Forgot Password? / پاس ورڈ بھول گئے؟
                        </button>

                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 duration-150 cursor-pointer shadow-sm active:scale-[0.98] font-mono"
                          id="btn-email-signin"
                        >
                          Sign In / داخل ہوں
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>

                    {/* INSTANT LOGINS FOR PROFESSIONAL AUDIT & DEMOS */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">
                        Quick Demo Portals / فوری لاگ ان کرنے کے لیے کلک کریں:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePresetLogin('usr-shopkeeper-saleem')}
                          className="flex items-center gap-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-2 md:p-2.5 text-left duration-200 cursor-pointer shadow-2xs text-xs font-semibold"
                        >
                          <div className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg shrink-0">
                            <Store className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[10.5px] leading-tight">Saleem Shop</p>
                            <p className="text-[9px] text-slate-400 font-mono italic mt-0.5">saleem123</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePresetLogin('usr-mktadmin-quaid')}
                          className="flex items-center gap-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-2 md:p-2.5 text-left duration-200 cursor-pointer shadow-2xs text-xs font-semibold"
                        >
                          <div className="bg-indigo-100 text-indigo-805 p-1.5 rounded-lg shrink-0">
                            <UserCheck className="w-4 h-4 text-indigo-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[10.5px] leading-tight flex items-center gap-1">Zia Mehsood</p>
                            <p className="text-[9px] text-slate-400 font-mono italic mt-0.5">quaidabad123</p>
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handlePresetLogin('usr-superadmin')}
                          className="flex items-center gap-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl p-2 md:p-2.5 text-left duration-200 cursor-pointer shadow-2xs text-xs font-semibold"
                        >
                          <div className="bg-blue-100 text-blue-800 p-1.5 rounded-lg shrink-0">
                            <ShieldCheck className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-[10.5px] leading-tight">Super Admin</p>
                            <p className="text-[9px] text-slate-400 font-mono italic mt-0.5">admin123</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Simple Help Line */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 leading-normal border-t border-slate-100 pt-3">
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      <p>
                        New registrations must be approved by the Bureau Admin before gaining access.
                      </p>
                    </div>

                  </div>
                ) : (
                  /* HIGHLY SIMPLE, STEPPED STYLE REGISTRATION FORM */
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Who are you? / اکاؤنٹ کی قسم</label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as UserRole)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="SHOPKEEPER">🛒 Shopkeeper (Dukandar)</option>
                          <option value="SUPER_ADMIN">🛡️ Super Admin (Manager/Admin)</option>
                        </select>
                      </div>
                    </div>

                    {/* Market selection (not for super admin) */}
                    {regRole !== 'SUPER_ADMIN' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block font-mono">Select Market / مارکیٹ</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                          <select
                            value={regMarketId}
                            onChange={(e) => setRegMarketId(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                          <label className="text-xs font-bold text-slate-700 block font-mono">Shop Business Name / دکان کا رجسٹرڈ نام</label>
                          <input
                            type="text"
                            required
                            value={regShopName}
                            onChange={(e) => setRegShopName(e.target.value)}
                            placeholder="e.g. Al-Razzaq Mobile Zone"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-extrabold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 block font-mono">Shop Floor Location Address / دکان کا پتہ</label>
                          <input
                            type="text"
                            required
                            value={regShopAddress}
                            onChange={(e) => setRegShopAddress(e.target.value)}
                            placeholder="e.g. Shop G-15, Ground Floor, Quaidabad Market"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Security Question Section (Simple and neat) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Recovery Security Setup / سیکیورٹی سوال:</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block">Security Question</label>
                          <select
                            value={regSecurityQuestion}
                            onChange={(e) => setRegSecurityQuestion(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                          >
                            {SECURITY_QUESTIONS.map(q => (
                              <option key={q.value} value={q.value}>{q.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 block font-mono">Your Answer</label>
                          <input
                            type="text"
                            required
                            placeholder="Type question answer"
                            value={regSecurityAnswer}
                            onChange={(e) => setRegSecurityAnswer(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm text-xs uppercase duration-150 cursor-pointer text-center font-mono"
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

          {/* Trademarks & Footer brand info inside the form terminal panel */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10.5px] text-slate-400 font-semibold font-mono uppercase tracking-widest flex items-center justify-center gap-1">
            <span>PLATFORM DEVELOPED & SECURED BY</span>
            <span className="text-blue-600 font-extrabold">{`Aasan AI Software Solution`}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
