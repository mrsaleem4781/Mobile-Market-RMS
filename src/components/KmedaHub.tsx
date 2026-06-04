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

export default function KmedaHub() {
  const [selectedStory, setSelectedStory] = useState<string | null>(null);

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
              <div className="w-10 h-10 bg-indigo-505/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-400/25">
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1 font-mono">
                <Award className="w-5 h-5 text-indigo-600" /> KMEDA Recovery Honor Board
              </h2>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Documented success stories of anti-theft compliance and recoveries at Quaidabad Market
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {successStories.map((story) => {
              const isExpanded = selectedStory === story.id;
              return (
                <div 
                  key={story.id} 
                  className={`bg-white border text-slate-800 rounded-2xl p-5 hover:shadow-md transition duration-200 cursor-pointer ${
                    isExpanded ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-200'
                  }`}
                  onClick={() => setSelectedStory(isExpanded ? null : story.id)}
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
                        <Calendar className="w-3 h-3 text-slate-350" /> {story.date}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-650 leading-relaxed font-sans">{story.summary}</p>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium" dir="rtl">{story.summaryUrdu}</p>
                  </div>

                  {isExpanded ? (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 bg-slate-50 p-4 rounded-xl animate-fade-in text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] text-indigo-600 font-black tracking-widest uppercase font-mono block">PARTICIPATING INTEL & OFFICERS:</span>
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-tight">
                          <User className="w-3.5 h-3.5 text-slate-450" /> {story.keyActors}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-400 font-bold block">FULL RESOLUTION REPORT (ENGLISH):</span>
                        <p className="text-slate-700 leading-relaxed font-sans select-all">{story.fullStory}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-bold block">تفصیلی رپورٹ (اردو):</span>
                        <p className="text-slate-650 leading-relaxed font-sans font-medium select-all" dir="rtl">{story.fullStoryUrdu}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-black uppercase font-mono pt-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Case catalogued on live anti-theft register.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-blue-600 hover:text-blue-700 font-black uppercase font-mono tracking-wider mt-3 flex items-center gap-1">
                      <span>Click to view detailed story / تفصیل دیکھیں</span>
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
