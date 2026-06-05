/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Award, 
  ShieldCheck, 
  PhoneCall, 
  BookOpen, 
  Sparkles, 
  CheckCircle, 
  UserCheck, 
  HelpCircle,
  Building,
  Smartphone,
  Info,
  Calendar,
  User,
  HeartHandshake,
  AlertTriangle
} from 'lucide-react';

interface SuccessStory {
  id: string;
  title: string;
  titleUrdu: string;
  date: string;
  brand: string;
  model: string;
  keyActors: string;
  badge: 'RECOVERED' | 'ARRESTED' | 'RETURNED';
  badgeStyle: string;
  summary: string;
  summaryUrdu: string;
  fullStory: string;
  fullStoryUrdu: string;
}

interface StoryComment {
  id: string;
  storyId: string;
  author: string;
  date: string;
  text: string;
  textUrdu?: string;
}

const defaultComments: StoryComment[] = [
  {
    id: 'c1',
    storyId: 'story-spark-20c',
    author: 'Zia Khan Mehsood (President)',
    date: 'May 03, 2026',
    text: 'Suspicious IMEI matching successfully triggered early dispatch. Quaidabad Zone notified.',
    textUrdu: 'مشکوک فون کی اطلاع ملتی ہی ہم نے پولیس کو الرٹ کیا اور موقع پر پہنچے تا کہ گاہک بھاگ نہ سکے۔'
  },
  {
    id: 'c2',
    storyId: 'story-spark-20c',
    author: 'Hassan Shopkeeper',
    date: 'May 05, 2026',
    text: 'Truly thankful for President Sadar Zia Khan Mehsood for immediate legal representation and support.',
    textUrdu: 'صدر ضیاء خان محسود صاحب کا بے حد شکریہ جنہوں نے فوری آ کر ہماری رہنمائی اور حوصلہ افزائی کی۔'
  },
  {
    id: 'c3',
    storyId: 'story-spark-go2',
    author: 'CPLC Technical Team',
    date: 'May 14, 2026',
    text: 'Device tracking system detected SIM swapping on IMEI. Alert generated.',
    textUrdu: 'ہم نے رن ٹائم پر نئے سم کے ایکٹیویشن کا سگنل حاصل کر کے فوری قائدآباد کمیڈا ٹیم کو آگاہ کیا۔'
  },
  {
    id: 'c4',
    storyId: 'story-rafiq-center',
    author: 'Sadar Zia Khan Mehsood',
    date: 'April 22, 2026',
    text: 'Strict instructions issued to Rafiq Market watchmen. Double locks are now mandatory.',
    textUrdu: 'مارکیٹ چوکیداروں کی تعداد بڑھا دی ہے اور تمام دکانوں کو ڈبل تالے لگانے کی وارننگ دی گئی ہے۔'
  }
];

const defaultStories: SuccessStory[] = [
  {
    id: 'story-spark-20c',
    title: "Tecno Spark 20C Snatched Mobile Swift Recovery",
    titleUrdu: "ٹیکنو اسپارک 20C چھینے گئے موبائل کی کامیاب واپسی",
    date: "May 2026",
    brand: "Tecno",
    model: "Spark 20C",
    keyActors: "Shopkeeper Hassan, President Zia Khan Mehsood, KMEDA Quaidabad Office",
    badge: "RECOVERED",
    badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-250",
    summary: "Suspicious buyer approached Shopkeeper Hassan with a Spark 20C. Hassan immediately stalled and verified the device.",
    summaryUrdu: "دکاندار حسن نے ایک مشکوک گاہک سے اسپارک 20C فون آنے پر فوری کارروائی کی اور کمیڈا صڈر ضیاء خان محسود کو مطلع کیا۔",
    fullStory: "A customer brought a Tecno Spark 20C to Shopkeeper Hassan's outlet. Detecting suspicious behavior, Hassan cross-checked the database and immediately contacted Quaidabad Zone President Zia Khan Mehsood. The owner was contacted who verified with the original box, and the recovered device was formally returned at the KMEDA Quaidabad executive assembly.",
    fullStoryUrdu: "ایک مشکوک گاہک حسن دکاندار کے پاس ٹیکنو اسپارک 20C فروخت کرنے لایا۔ حسن نے عقلمندی کا ثبوت دیتے ہوئے صڈر ضیاء خان محسود کو مطلع کیا۔ موبائل کا اصل مالک تلاش کیا گیا جو اپنا موبائل باکس لے کر کمیڈا کے دفتر پہنچا، اور مکمل تصدیق کے بعد موبائل فون ان کے حوالے کر دیا گیا۔"
  },
  {
    id: 'story-spark-go2',
    title: "Tecno Spark Go 2 Recovered via CPLC & Technical Cell",
    titleUrdu: "ٹیکنو اسپارک گو 2 کی بذریعہ سی پی ایل سی ٹریکنگ اور بازیابی",
    date: "May 2026",
    brand: "Tecno",
    model: "Spark Go 2",
    keyActors: "KMEDA Leadership, CPLC Sindh, Police IT Technical Branch",
    badge: "RETURNED",
    badgeStyle: "bg-blue-105 text-blue-800 border-blue-200",
    summary: "Snatched device retrieved through systematic tracking and returned to its verified owner at KMEDA Headquarters.",
    summaryUrdu: "چھینا گیا اسپارک گو 2 موبائل فون سی پی ایل سی اور پولیس کے ٹیکنیکل ڈیپارٹمنٹ کی مدد سے ٹریس کر کے بازیاب کرایا گیا۔",
    fullStory: "Through state monitoring networks and coordination with the Sindh CPLC and police technical departments, KMEDA successfully locked the coordinates and recovered a stolen Tecno Spark Go 2. The phone was handed back to the grateful citizen at KMEDA office.",
    fullStoryUrdu: "سندھ سی پی ایل سی اور پولیس آئی ٹی ٹیکنیکل برانچ کے اشتراک سے چھینا گیا اسپارک گو 2 موبائل فون ٹریس کیا گیا۔ کمیڈا کے عہدیداران نے کارروائی کرتے ہوئے موبائل فون واپس حاصل کیا اور دفتر میں اصل مالک کے سپرد کیا۔"
  },
  {
    id: 'story-rafiq-center',
    title: "Rafiq Shopping Center Robbery Solved, Thieves Arrested",
    titleUrdu: "رفیق شاپنگ سینٹر تالے توڑ چوری کا معمہ حل، چور گرفتار",
    date: "April 2026",
    brand: "Multiple Devices",
    model: "Various Mobile Phones",
    keyActors: "Shopkeeper Zulfiqar, Quaidabad Police, CPLC Sindh, KMEDA Cabinet",
    badge: "ARRESTED",
    badgeStyle: "bg-rose-100 text-rose-800 border-rose-250",
    summary: "Burglars broke lock of Zulfiqar's shop. Technical institutions tracked they are now behind bars and all products returned.",
    summaryUrdu: "رفیق شاپنگ سینٹر میں دکاندار ذوالفقار کی دکان کے تالے توڑ کر چوری کی گئی تھی، چور مال سمیت قانون کی گرفت میں۔",
    fullStory: "Robbers cut the padlocks of Merchant Zulfiqar's shop at Rafiq Shopping Center Quaidabad, carting away heavy inventory. Upon coordination with intelligence cells and tactical police branches by President Zia Khan Mehsood, the offenders were apprehended with the stolen merchandise, sent to jail, and the clearing items returned to Zulfiqar.",
    fullStoryUrdu: "رفیق شاپنگ سینٹر قائد آباد میں دکاندار ذوالفقار کی دکان کے تالے توڑ کر چوری کا بڑا واقعہ ہوا تھا۔ تاجر برادری اور صڈر ضیاء خان محسود نے تکنیکی اداروں اور پولیس کے ساتھ تال میل کر کے چوروں کو رنگے ہاتھوں گرفتار کروایا۔ مال برآمد کر کے مالک ذوالفقار کو واپس فراہم کیا گیا۔"
  }
];

export default function KmedaHub() {
  const [selectedStory, setSelectedStory] = useState<string | null>(null);

  const [stories, setStories] = useState<SuccessStory[]>(() => {
    const saved = localStorage.getItem('kmeda_success_stories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return defaultStories;
  });

  const [comments, setComments] = useState<StoryComment[]>(() => {
    const saved = localStorage.getItem('kmeda_story_comments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    return defaultComments;
  });

  // State controls for New Story Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleUrdu, setNewTitleUrdu] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newActors, setNewActors] = useState('');
  const [newBadge, setNewBadge] = useState<'RECOVERED' | 'ARRESTED' | 'RETURNED'>('RECOVERED');
  const [newSummary, setNewSummary] = useState('');
  const [newSummaryUrdu, setNewSummaryUrdu] = useState('');
  const [newFullStory, setNewFullStory] = useState('');
  const [newFullStoryUrdu, setNewFullStoryUrdu] = useState('');

  // Comment input form variables
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentTextUrdu, setCommentTextUrdu] = useState('');

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newFullStory) {
      alert("Please fill in the title and the detailed report!");
      return;
    }

    const badgeStyleMap = {
      RECOVERED: 'bg-emerald-100 text-emerald-800 border-emerald-250',
      RETURNED: 'bg-blue-100 text-blue-800 border-blue-200',
      ARRESTED: 'bg-rose-100 text-rose-800 border-rose-250',
    };

    const newStory: SuccessStory = {
      id: `story-${Date.now()}`,
      title: newTitle,
      titleUrdu: newTitleUrdu || newTitle,
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      brand: newBrand || 'Various',
      model: newModel || 'Devices',
      keyActors: newActors || 'KMEDA Management Council',
      badge: newBadge,
      badgeStyle: badgeStyleMap[newBadge],
      summary: newSummary || newTitle,
      summaryUrdu: newSummaryUrdu || newTitleUrdu || newTitle,
      fullStory: newFullStory,
      fullStoryUrdu: newFullStoryUrdu || newFullStory,
    };

    const updated = [newStory, ...stories];
    setStories(updated);
    localStorage.setItem('kmeda_success_stories', JSON.stringify(updated));

    // Reset Form
    setNewTitle('');
    setNewTitleUrdu('');
    setNewBrand('');
    setNewModel('');
    setNewActors('');
    setNewBadge('RECOVERED');
    setNewSummary('');
    setNewSummaryUrdu('');
    setNewFullStory('');
    setNewFullStoryUrdu('');
    setShowAddForm(false);
  };

  const handleAddComment = (storyId: string) => {
    if (!commentAuthor || !commentText) {
      alert("Please enter both Name and Comment details!");
      return;
    }

    const newCommentObj: StoryComment = {
      id: `comment-${Date.now()}`,
      storyId,
      author: commentAuthor,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      text: commentText,
      textUrdu: commentTextUrdu || undefined,
    };

    const updated = [...comments, newCommentObj];
    setComments(updated);
    localStorage.setItem('kmeda_story_comments', JSON.stringify(updated));

    setCommentAuthor('');
    setCommentText('');
    setCommentTextUrdu('');
  };

  const officialSOPs = [
    {
      id: 1,
      title: "Mandatory IMEI Logging",
      titleUrdu: "لازمی آئی ایم ای آئی اندراج",
      desc: "Every purchase (BUY) or transfer (SELL) must have both IMEIs accurately catalogued on this M-RMS Portal. No exceptions.",
      descUrdu: "تمام خرید و فروخت پر IMEI کا اندراج اس پورٹل پر لازمی کریں۔"
    },
    {
      id: 2,
      title: "Customer CNIC Logging & Verification",
      titleUrdu: "گاہک کے شناختی کارڈ کی تصدیق",
      desc: "Always input exactly 13 digits of CNIC and verify with physical card. Upload device receipt to clear the ledger audit.",
      descUrdu: "گاہک کے شناختی کارڈ کے 13 ہندسے درج کریں اور رسید اپ لوڈ کریں۔"
    },
    {
      id: 3,
      title: "Pre-Trade Security Lookup",
      titleUrdu: "خریداری سے پہلے تلاش کی تصدیق",
      desc: "Run IMEI check on this portal or cross-reference CPLC databases prior to releasing payments for second-hand items.",
      descUrdu: "خریداری کرنے سے پہلے اس پورٹل پر آئی ایم ای آئی (IMEI) ضرور چیک کریں۔"
    },
    {
      id: 4,
      title: "Dealing with Suspicious Customers",
      titleUrdu: "مشکوک گاہکوں سے متعلق رپورٹ",
      desc: "If a suspect acts suspiciously or is unable to provide valid credentials/box, stall page operations and immediately alert President Zia Khan Mehsood.",
      descUrdu: "مشکوک افراد یا بغیر اصلی رسید کے فروخت کرنے والوں کی اطلاع فوری کمیڈا افس کو دیں۔"
    }
  ];

  const successStories: SuccessStory[] = [
    {
      id: 'story-spark-20c',
      title: "Tecno Spark 20C Snatched Mobile Swift Recovery",
      titleUrdu: "ٹیکنو اسپارک 20C چھینے گئے موبائل کی کامیاب واپسی",
      date: "May 2026",
      brand: "Tecno",
      model: "Spark 20C",
      keyActors: "Shopkeeper Hassan, President Zia Khan Mehsood, KMEDA Quaidabad Office",
      badge: "RECOVERED",
      badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-250",
      summary: "Suspicious buyer approached Shopkeeper Hassan with a Spark 20C. Hassan immediately stalled and verified the device.",
      summaryUrdu: "دکاندار حسن نے ایک مشکوک گاہک سے اسپارک 20C فون آنے پر فوری کارروائی کی اور کمیڈا صڈر ضیاء خان محسود کو مطلع کیا۔",
      fullStory: "A customer brought a Tecno Spark 20C to Shopkeeper Hassan's outlet. Detecting suspicious behavior, Hassan cross-checked the database and immediately contacted Quaidabad Zone President Zia Khan Mehsood. The owner was contacted who verified with the original box, and the recovered device was formally returned at the KMEDA Quaidabad executive assembly.",
      fullStoryUrdu: "ایک مشکوک گاہک حسن دکاندار کے پاس ٹیکنو اسپارک 20C فروخت کرنے لایا۔ حسن نے عقلمندی کا ثبوت دیتے ہوئے صڈر ضیاء خان محسود کو مطلع کیا۔ موبائل کا اصل مالک تلاش کیا گیا جو اپنا موبائل باکس لے کر کمیڈا کے دفتر پہنچا، اور مکمل تصدیق کے بعد موبائل فون ان کے حوالے کر دیا گیا۔"
    },
    {
      id: 'story-spark-go2',
      title: "Tecno Spark Go 2 Recovered via CPLC & Technical Cell",
      titleUrdu: "ٹیکنو اسپارک گو 2 کی بذریعہ سی پی ایل سی ٹریکنگ اور بازیابی",
      date: "May 2026",
      brand: "Tecno",
      model: "Spark Go 2",
      keyActors: "KMEDA Leadership, CPLC Sindh, Police IT Technical Branch",
      badge: "RETURNED",
      badgeStyle: "bg-blue-105 text-blue-800 border-blue-200",
      summary: "Snatched device retrieved through systematic tracking and returned to its verified owner at KMEDA Headquarters.",
      summaryUrdu: "چھینا گیا اسپارک گو 2 موبائل فون سی پی ایل سی اور پولیس کے ٹیکنیکل ڈیپارٹمنٹ کی مدد سے ٹریس کر کے بازیاب کرایا گیا۔",
      fullStory: "Through state monitoring networks and coordination with the Sindh CPLC and police technical departments, KMEDA successfully locked the coordinates and recovered a stolen Tecno Spark Go 2. The phone was handed back to the grateful citizen at KMEDA office.",
      fullStoryUrdu: "سندھ سی پی ایل سی اور پولیس آئی ٹی ٹیکنیکل برانچ کے اشتراک سے چھینا گیا اسپارک گو 2 موبائل فون ٹریس کیا گیا۔ کمیڈا کے عہدیداران نے کارروائی کرتے ہوئے موبائل فون واپس حاصل کیا اور دفتر میں اصل مالک کے سپرد کیا۔"
    },
    {
      id: 'story-rafiq-center',
      title: "Rafiq Shopping Center Robbery Solved, Thieves Arrested",
      titleUrdu: "رفیق شاپنگ سینٹر تالے توڑ چوری کا معمہ حل، چور گرفتار",
      date: "April 2026",
      brand: "Multiple Devices",
      model: "Various Mobile Phones",
      keyActors: "Shopkeeper Zulfiqar, Quaidabad Police, CPLC Sindh, KMEDA Cabinet",
      badge: "ARRESTED",
      badgeStyle: "bg-rose-100 text-rose-800 border-rose-250",
      summary: "Burglars broke lock of Zulfiqar's shop. Technical institutions tracked they are now behind bars and all products returned.",
      summaryUrdu: "رفیق شاپنگ سینٹر میں دکاندار ذوالفقار کی دکان کے تالے توڑ کر چوری کی گئی تھی، چور مال سمیت قانون کی گرفت میں۔",
      fullStory: "Robbers cut the padlocks of Merchant Zulfiqar's shop at Rafiq Shopping Center Quaidabad, carting away heavy inventory. Upon coordination with intelligence cells and tactical police branches by President Zia Khan Mehsood, the offenders were apprehended with the stolen merchandise, sent to jail, and the clearing items returned to Zulfiqar.",
      fullStoryUrdu: "رفیق شاپنگ سینٹر قائد آباد میں دکاندار ذوالفقار کی دکان کے تالے توڑ کر چوری کا بڑا واقعہ ہوا تھا۔ تاجر برادری اور صڈر ضیاء خان محسود نے تکنیکی اداروں اور پولیس کے ساتھ تال میل کر کے چوروں کو رنگے ہاتھوں گرفتار کروایا۔ مال برآمد کر کے مالک ذوالفقار کو واپس فراہم کیا گیا۔"
    }
  ];

  return (
    <div className="space-y-6" id="kmeda-hub-container">
      {/* 1. Brand Banner Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden" id="kmeda-prime-banner">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
          <Building className="w-64 h-64 text-white" />
        </div>
        
        <div className="space-y-4 max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-bold text-sky-300 font-mono tracking-wider uppercase">COMMUNITY COMPLIANCE & SAFETY DRIVE</span>
          </div>
          
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" id="kmeda-title">
            Karachi Mobile & Electronics Dealers Association
            <span className="block text-sky-400 text-lg sm:text-xl font-bold mt-1 font-mono">KMEDA Quaidabad Zone (Karachi East)</span>
          </h1>
          
          {/* Presidential cabinet card badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-400/25">
                <UserCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black font-mono tracking-widest">PRESIDENT QUAIDABAD</p>
                <h4 className="text-xs font-black text-white">Zia Khan Mehsood</h4>
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center shrink-0 border border-sky-400/25">
                <Building className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black font-mono tracking-widest">CENTRAL KMEDA PRESIDENT</p>
                <h4 className="text-xs font-black text-white">Minhaj Gulfam</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Success recovery stories board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="kmeda-grid-body">
        
        {/* LEFT COLUMN: Success Honor Board */}
        <div className="lg:col-span-7 space-y-4" id="honor-column">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Award className="w-5 h-5 text-indigo-600" /> KMEDA Recovery Honor Board
              </h2>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Documented success stories of anti-theft compliance and recoveries at Quaidabad Market
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold leading-none shadow-xs hover:shadow-sm duration-150 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
              <span>{showAddForm ? 'Close Form / بند کریں' : 'Log New Recovery / نئی رپورٹ درج کریں'}</span>
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateStory} className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-md animate-fade-in text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">New Success Story Registry</h3>
                    <p className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">کامیابی کی نئی رپورٹ کا باقاعدہ اندراج</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-lg transition"
                >
                  Cancel / منسوخ
                </button>
              </div>

              {/* CARD 1: Core Device & Actor Details */}
              <div className="bg-slate-50/75 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100/60 pb-2 flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase">
                  <span>1. Core Device & Case Details / ڈیوائس کی معلومات</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Device Brand / برانڈ</label>
                    <input 
                      type="text" 
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="e.g. Samsung, Apple, Tecno" 
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Device Model / ماڈل</label>
                    <input 
                      type="text" 
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Galaxy S24, Spark Go" 
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                  {/* Badge Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Resolution status / پوزیشن</label>
                    <select
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value as any)}
                      className="w-full text-xs font-bold px-3 py-2.5 bg-white border border-slate-205 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all"
                    >
                      <option value="RECOVERED">RECOVERED / بازیاب شدہ</option>
                      <option value="RETURNED">RETURNED / سپرد شدہ</option>
                      <option value="ARRESTED">ARRESTED / گرفتار مجرم</option>
                    </select>
                  </div>
                </div>

                {/* Key Actors */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Key Actors Involved / شریک برادری و پولیس</label>
                  <input 
                    type="text" 
                    value={newActors}
                    onChange={(e) => setNewActors(e.target.value)}
                    placeholder="e.g. Shopkeeper Bilal, Sadar Zia Khan Mehsood, Quaidabad Police" 
                    className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* TWO COLUMN English / Urdu details grid - Clean, separate columns with generous gap to avoid overlapping */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                
                {/* COLUMN 1: English Details Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-3xs">
                  <div className="border-b border-slate-100 pb-2 flex items-center justify-between text-xs font-black text-indigo-900 uppercase">
                    <span>2. English Documentation</span>
                    <span className="text-[9px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-700 font-mono font-bold">EN Form</span>
                  </div>

                  {/* Title (English) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Incident Title</label>
                    <input 
                      type="text" 
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. iPhone 13 Pro Recovered in 24 Hours" 
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    />
                  </div>

                  {/* Summaries */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Brief Summary</label>
                    <textarea 
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      rows={2}
                      placeholder="Brief 1-sentence summary of what happened." 
                      className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    />
                  </div>

                  {/* Full Stories */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 font-bold block uppercase tracking-wide">Full Incident Story</label>
                    <textarea 
                      required
                      value={newFullStory}
                      onChange={(e) => setNewFullStory(e.target.value)}
                      rows={4}
                      placeholder="Comprehensive description of tracking process, database verifications, and KMEDA return Ceremony..." 
                      className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* COLUMN 2: Urdu Details Card (RTL aligned, colored border) */}
                <div className="bg-blue-50/10 border border-blue-100 rounded-2xl p-5 space-y-4 shadow-3xs">
                  <div className="border-b border-blue-100/50 pb-2 flex items-center justify-between text-xs font-black text-blue-900">
                    <span className="text-[9px] bg-blue-100/80 px-2 py-0.5 rounded text-blue-800 font-sans font-bold">اردو فارم</span>
                    <span className="font-sans font-extrabold text-blue-950">3. بازیابی اور تفصیلی رپورٹ (اردو)</span>
                  </div>

                  {/* Title (Urdu) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] text-slate-500 font-extrabold block">رپورٹ کا عنوان (اردو)</label>
                    <input 
                      type="text" 
                      dir="rtl"
                      value={newTitleUrdu}
                      onChange={(e) => setNewTitleUrdu(e.target.value)}
                      placeholder="مثال: ایک دن میں آئی فون 13 کی کامیاب بازیابی" 
                      className="w-full text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-slate-800 text-right focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Summaries (Urdu) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] text-slate-500 font-extrabold block">مختصر خلاصہ (اردو)</label>
                    <textarea 
                      value={newSummaryUrdu}
                      onChange={(e) => setNewSummaryUrdu(e.target.value)}
                      rows={2}
                      dir="rtl"
                      placeholder="کیس کی مختصر صورتحال اردو میں تحریر کریں۔" 
                      className="w-full text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-right focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Full Stories (Urdu) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] text-slate-500 font-extrabold block">تفصیلی رپورٹ (اردو)</label>
                    <textarea 
                      value={newFullStoryUrdu}
                      onChange={(e) => setNewFullStoryUrdu(e.target.value)}
                      rows={4}
                      dir="rtl"
                      placeholder="پوری کہانی، اور صدر ضیاء خان محسود صاحب کی موجودگی میں واپس ملنے کی تقریب کی تفصیل..." 
                      className="w-full text-xs font-extrabold px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-right focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium font-sans italic">All recovery logs are instantly validated against local database records.</span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition duration-150"
                  >
                    Cancel / منسوخ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition duration-150 shadow-md shadow-emerald-500/10 hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-100" />
                    <span>Publish Case / رپورٹ شائع کریں</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {stories.map((story) => {
              const isExpanded = selectedStory === story.id;
              const storyComments = comments.filter(c => c.storyId === story.id);
              
              return (
                <div 
                  key={story.id} 
                  className={`bg-white border text-slate-800 rounded-2xl p-5 hover:shadow-md transition duration-200 cursor-pointer ${
                    isExpanded ? 'border-indigo-600 ring-2 ring-indigo-55/60' : 'border-slate-200'
                  }`}
                  onClick={(e) => {
                    // Prevent closing if clicking inside input boxes or buttons
                    const target = e.target as HTMLElement;
                    if (target.closest('input') || target.closest('textarea') || target.closest('button')) {
                      return;
                    }
                    setSelectedStory(isExpanded ? null : story.id);
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="space-y-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase tracking-wide border inline-block ${story.badgeStyle}`}>
                        {story.badge}
                      </span>
                      <h3 className="text-xs font-black text-slate-800 leading-tight">
                        {story.title}
                      </h3>
                      <p className="text-[12px] font-extrabold text-blue-700 font-sans" dir="rtl">
                        {story.titleUrdu}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[9.5px] text-slate-400 font-bold font-mono tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {story.date}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-650 leading-relaxed font-sans">{story.summary}</p>
                    <p className="text-xs text-slate-550 leading-relaxed font-sans font-semibold text-right" dir="rtl">{story.summaryUrdu}</p>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 pt-4 border-t border-slate-150 space-y-4 bg-slate-50/70 p-4 rounded-xl animate-fade-in text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] text-indigo-600 font-black tracking-widest uppercase font-mono block">PARTICIPATING INTEL & OFFICERS:</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-tight">
                          <User className="w-3.5 h-3.5 text-slate-450" /> {story.keyActors}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200/50">
                          <span className="text-[9px] text-slate-400 font-bold block font-mono">FULL RESOLUTION REPORT (ENGLISH):</span>
                          <p className="text-slate-700 leading-relaxed font-sans select-all font-medium">{story.fullStory}</p>
                        </div>

                        <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200/50 text-right" dir="rtl">
                          <span className="text-[9px] text-slate-400 font-bold block font-sans text-left">تفصیلی رپورٹ (اردو):</span>
                          <p className="text-slate-650 leading-relaxed font-sans font-extrabold select-all">{story.fullStoryUrdu}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-black uppercase font-mono pt-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Case catalogued on live anti-theft register.
                      </div>

                      {/* COMMUNITY FEEDBACK & REPLIES SECTION */}
                      <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10.5px] font-black text-indigo-950 uppercase tracking-widest font-mono flex items-center gap-1">
                            <HeartHandshake className="w-4 h-4 text-indigo-500" /> Cases Responses & Updates / کیس اپڈیٹس اور تبصرے
                          </h4>
                          <span className="text-[9.5px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full font-bold font-mono">
                            {storyComments.length} Records
                          </span>
                        </div>

                        {/* Story Response Feed */}
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {storyComments.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2 bg-white border border-slate-100 rounded-xl text-center">
                              No formal feedback logs posted yet. Be the first to type an update below!
                            </p>
                          ) : (
                            storyComments.map((comment) => (
                              <div key={comment.id} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-3xs space-y-1.5 hover:border-slate-300 transition duration-150">
                                <div className="flex items-center justify-between text-[10px] border-b border-dashed border-slate-100 pb-1.5">
                                  <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-550 shrink-0"></div>
                                    {comment.author}
                                  </span>
                                  <span className="text-slate-400 font-mono font-medium">{comment.date}</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <p className="text-slate-700 font-sans leading-relaxed">{comment.text}</p>
                                  {comment.textUrdu && (
                                    <p className="text-slate-550 font-semibold leading-relaxed text-right font-sans" dir="rtl">
                                      {comment.textUrdu}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Inline Comments Submit Box */}
                        <div className="bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 space-y-3">
                          <h5 className="text-[10px] text-slate-650 font-black uppercase tracking-wider font-mono">
                            ✍️ Log Response or Legal Instruction / تفصیلی معلومات یا جواب تحریر کریں
                          </h5>

                          <div className="space-y-3">
                            <input 
                              type="text"
                              required
                              placeholder="Your Name & Title (e.g., Sub-Inspector Muhammad Bilal / دکاندار سلیم)"
                              value={commentAuthor}
                              onChange={(e) => setCommentAuthor(e.target.value)}
                              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={2}
                                placeholder="Write update in English (e.g. Device returned successfully...)"
                                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                              />
                              <textarea
                                value={commentTextUrdu}
                                onChange={(e) => setCommentTextUrdu(e.target.value)}
                                rows={2}
                                dir="rtl"
                                placeholder="اردو میں تفصیل لکھیں (مثال: موبائل فون دکان پر باقاعدہ وریفائی کر کے واپس کیا گیا)"
                                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddComment(story.id)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] tracking-wider uppercase font-mono rounded-lg ml-auto block shadow-xs hover:shadow-sm duration-150 cursor-pointer"
                            >
                              Post Response / جواب پوسٹ کریں 
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="text-[10px] text-indigo-600 hover:text-indigo-700 font-black uppercase font-mono tracking-wider mt-3 flex items-center gap-1">
                      <span>Click to view detailed story & case timeline / تفصیل اور کیس اپڈیٹس دیکھیں</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SOP Directives & Helpline */}
        <div className="lg:col-span-5 space-y-6" id="compliance-rules-column">
          {/* Cabinet SOP List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Official KMEDA SOP Directives
              </h3>
              <p className="text-[10px] text-slate-450 font-medium">Compliance guidelines for second-hand phone sellers</p>
            </div>

            <div className="space-y-3.5">
              {officialSOPs.map((sop) => (
                <div key={sop.id} className="flex gap-3 relative">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[11px] font-black shrink-0 border border-indigo-200">
                    {sop.id}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {sop.title}
                    </h4>
                    <p className="text-[11.5px] font-bold text-indigo-700 leading-snug" dir="rtl">
                      {sop.titleUrdu}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{sop.desc}</p>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans" dir="rtl">{sop.descUrdu}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-150/40 text-[10px] text-indigo-700 leading-normal flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="font-semibold font-mono">
                Failure to log CNIC or IMEI data will result in immediate shopkeeper operational hold or trade license cancellation under President Zia Khan Mehsood.
              </p>
            </div>
          </div>

          {/* EMERGENCY HELPDESK & NOTIFY CHANNELS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-white shadow-md">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <PhoneCall className="w-4 h-4 text-emerald-400" /> Emergency Report Hotline
              </h3>
              <p className="text-[10.5px] text-slate-400 font-semibold font-mono">KMEDA Quaidabad Desk & CPLC Coordination</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-medium block">ZIA KHAN MEHSOOD President</span>
                  <span className="text-[11px] font-black">0321-1234567</span>
                </div>
                <a href="tel:03211234567" className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 duration-150 text-[10px] font-bold rounded-lg font-mono">CALL Sadar</a>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-medium block">MINHAJ GULFAM Central Sadar</span>
                  <span className="text-[11px] font-black">0300-9876543</span>
                </div>
                <a href="tel:03009876543" className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 duration-150 text-[10px] font-bold rounded-lg font-mono">CALL Central</a>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-medium block">CPLC SINDH Main Control Room</span>
                  <span className="text-[11px] font-black">1101 / 021-35682222</span>
                </div>
                <a href="tel:1101" className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 duration-150 text-[10px] font-bold rounded-lg font-mono">DIAL 1101</a>
              </div>
            </div>

            <p className="text-[9.5px] text-center text-slate-500 font-mono italic">
              Aasan AI Software Solutions System Security Certificate ID: #AA-MS2026-OK
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
