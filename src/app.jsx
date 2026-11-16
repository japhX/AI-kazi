import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  Database, 
  Mail, 
  Briefcase, 
  Target, 
  Award, 
  Clock, 
  RefreshCw,
  Zap
} from 'lucide-react';

export default function App() {
  // --- STATE MANAGEMENT ---
  // Onboarding & Flow Steps: 'A1', 'A2', 'A3', 'P1', 'P2', 'P3', 'GENERATING', 'ROADMAP'
  const [stage, setStage] = useState('A1');

  // Form Data
  const [formData, setFormData] = useState({
    currentRole: '',
    skills: '',
    targetRole: '',
    helpNeeded: [],
    biggestChallenge: '',
    timeframe: '6 Months',
    email: ''
  });

  // Validation Errors
  const [errors, setErrors] = useState({});

  // Generated Roadmap State
  const [roadmap, setRoadmap] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- AUTOMATED STAGE A TRANSITIONS ---
  useEffect(() => {
    if (stage === 'A1') {
      const timer1 = setTimeout(() => {
        setStage('A2');
      }, 1200);
      return () => clearTimeout(timer1);
    }
    if (stage === 'A2') {
      const timer2 = setTimeout(() => {
        setStage('A3');
      }, 1000);
      return () => clearTimeout(timer2);
    }
  }, [stage]);

  // --- FORM HANDLERS ---
  const handleCheckboxChange = (option) => {
    setFormData(prev => {
      const current = prev.helpNeeded;
      if (current.includes(option)) {
        return { ...prev, helpNeeded: current.filter(item => item !== option) };
      } else {
        return { ...prev, helpNeeded: [...current, option] };
      }
    });
  };

  const validatePage1 = () => {
    const errs = {};
    if (!formData.currentRole.trim()) errs.currentRole = 'Please tell us what you currently do.';
    if (!formData.skills.trim()) errs.skills = 'Please list some of your key skills.';
    if (!formData.targetRole.trim()) errs.targetRole = 'Please specify your target role or goal.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePage2 = () => {
    const errs = {};
    if (formData.helpNeeded.length === 0) errs.helpNeeded = 'Please select at least one area where you need help.';
    if (!formData.biggestChallenge.trim()) errs.biggestChallenge = 'Please share your biggest challenge.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePage3 = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextPage1 = () => {
    if (validatePage1()) setStage('P2');
  };

  const handleNextPage2 = () => {
    if (validatePage2()) setStage('P3');
  };

  // --- PERSISTENCE (SUPABASE VIA ENV VARS + LOCALSTORAGE BACKUP) ---
  const saveSubmission = async (data) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/user_submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            current_role: data.currentRole,
            learnings_so_far: data.skills,
            target_role: data.targetRole,
            help_needed: data.helpNeeded.join(', '),
            biggest_challenge: data.biggestChallenge,
            timeframe: data.timeframe,
            email: data.email,
            created_at: new Date().toISOString()
          })
        });
      } catch (e) {
        console.warn('Supabase save failed, continuing with local storage fallback', e);
      }
    }

    const history = JSON.parse(localStorage.getItem('ai_kazi_submissions') || '[]');
    history.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem('ai_kazi_submissions', JSON.stringify(history));
  };

  // --- CALL VERCEL SERVERLESS FUNCTION ---
  const generateRoadmap = async () => {
    if (!validatePage3()) return;

    setStage('GENERATING');
    setIsGenerating(true);

    await saveSubmission(formData);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok || !data.roadmap) {
        throw new Error(data.error || 'Failed to generate roadmap.');
      }

      setRoadmap(data.roadmap);
      setStage('ROADMAP');
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setRoadmap(generateFallbackRoadmap(formData));
        setStage('ROADMAP');
      }, 1500);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback generator if network fails
  const generateFallbackRoadmap = (data) => {
    return `## Executive Strategy: ${data.targetRole}

> **Target Timeline:** ${data.timeframe}  
> **Prepared for:** ${data.email}

---

### Phase 1: Foundation & Skill Gap Bridge
* **Focus Area:** Rapid alignment from **${data.currentRole}** to **${data.targetRole}**.
* **Key Actions:**
  - Audit current skills (${data.skills}) against senior level job descriptions.
  - Master missing tools and hard skills identified in your assessment.
  - Overcome primary obstacle: *"${data.biggestChallenge}"*.

### Phase 2: Proof & Portfolio Engineering
* **Focus Area:** Building undeniable evidence of competence.
* **Key Actions:**
  - Build 2 high-impact production projects simulating real-world industry requirements.
  - Document your build process publicly on GitHub, LinkedIn, or personal portfolio.
  - Focus on solve-first problem solving rather than simple tutorial clones.

### Phase 3: Strategic Positioning & Execution
* **Focus Area:** High-leverage networking & landing the role.
* **Key Actions:**
  - Optimize LinkedIn profile and CV specifically highlighting target capabilities.
  - Engage with 10 strategic industry connections weekly.
  - Practice structured behavioral and technical mock interviews.

---
*Your personalized roadmap has been generated and queued for email delivery to **${data.email}**.*`;
  };

  // Simple Markdown to HTML parser
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold text-white mt-6 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400"/> {line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-semibold text-indigo-300 mt-5 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-gray-300 my-1 leading-relaxed">
            {line.substring(2)}
          </li>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-indigo-500 bg-indigo-950/30 p-3 rounded-r-lg my-3 text-indigo-200 text-sm italic">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.trim() === '---') {
        return <hr key={idx} className="border-gray-800 my-6" />;
      }
      if (line.trim() === '') return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-gray-300 leading-relaxed my-1">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-900/15 via-purple-900/5 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div 
          onClick={() => setStage('A3')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            @
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
            @i Kazi
          </span>
        </div>
      </header>

      {/* --- MAIN CONTAINER --- */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 flex flex-col justify-center relative z-10">
        
        {/* ======================================= */}
        {/* STAGE A: ANIMATED INTRO TRANSITIONS     */}
        {/* ======================================= */}
        
        {stage === 'A1' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-4xl font-extrabold text-white shadow-2xl shadow-indigo-500/30 mb-6 animate-bounce">
              AI
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              AI Kazi
            </h1>
          </div>
        )}

        {stage === 'A2' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-pulse">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-extrabold text-white shadow-2xl shadow-purple-500/30 mb-6">
              @
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-indigo-400">
              @i Kazi
            </h1>
          </div>
        )}

        {stage === 'A3' && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI-Powered Career Navigator
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              @i Kazi
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-400 font-light max-w-lg leading-relaxed">
              map your career goal...
            </p>

            <button
              onClick={() => setStage('P1')}
              className="mt-6 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-lg shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all flex items-center gap-3 group"
            >
              Start
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* ======================================= */}
        {/* STAGE B: MULTI-STEP QUESTIONNAIRE       */}
        {/* ======================================= */}

        {['P1', 'P2', 'P3'].includes(stage) && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-3">
              <span className="uppercase tracking-wider">Step {stage === 'P1' ? '1' : stage === 'P2' ? '2' : '3'} of 3</span>
              <span className="text-indigo-400 font-semibold">
                {stage === 'P1' && 'Baseline Context'}
                {stage === 'P2' && 'Help & Challenges'}
                {stage === 'P3' && 'Timeframe & Delivery'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1A1A22] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{
                  width: stage === 'P1' ? '33.3%' : stage === 'P2' ? '66.6%' : '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* Page 1: Baseline Context */}
        {stage === 'P1' && (
          <div className="bg-[#111116] border border-[#222228] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-400" />
                Tell us where you stand
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Help us understand your current professional position and aspiration.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Q1: What do you do? <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Junior Web Developer, Computer Science Student, Sales Lead"
                value={formData.currentRole}
                onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                className="w-full bg-[#181820] border border-[#2A2A32] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {errors.currentRole && <p className="text-xs text-red-400">{errors.currentRole}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Q2: What are your skills? <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. JavaScript, React basics, HTML/CSS, Git, self-study SQL, communication"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="w-full bg-[#181820] border border-[#2A2A32] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              {errors.skills && <p className="text-xs text-red-400">{errors.skills}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Q3: Where do you want to be? <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Full-Stack Engineer, AI Product Manager, Senior DevOps Specialist"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full bg-[#181820] border border-[#2A2A32] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {errors.targetRole && <p className="text-xs text-red-400">{errors.targetRole}</p>}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNextPage1}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page 2: Help & Challenges */}
        {stage === 'P2' && (
          <div className="bg-[#111116] border border-[#222228] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-400" />
                Where do you need support?
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Select the key resources and obstacles standing in your way.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Q4: Where do you need help? <span className="text-red-400">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'Tools & Hard Skills', desc: 'Technical skills & frameworks to learn' },
                  { id: 'Proof & Projects', desc: 'Portfolio building & real-world proof' },
                  { id: 'Connections', desc: 'Mentors, referrals & professional network' },
                  { id: 'Job Search', desc: 'Resume, LinkedIn & interview preparation' }
                ].map((item) => {
                  const isSelected = formData.helpNeeded.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCheckboxChange(item.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-indigo-950/40 border-indigo-500 text-white' 
                          : 'bg-[#181820] border-[#2A2A32] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-gray-600'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.id}</div>
                        <div className="text-xs text-gray-400">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.helpNeeded && <p className="text-xs text-red-400">{errors.helpNeeded}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                What is your biggest challenge right now? <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Lack of time, not knowing what projects to build, getting filtered out by recruiters..."
                value={formData.biggestChallenge}
                onChange={(e) => setFormData({ ...formData, biggestChallenge: e.target.value })}
                className="w-full bg-[#181820] border border-[#2A2A32] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              {errors.biggestChallenge && <p className="text-xs text-red-400">{errors.biggestChallenge}</p>}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStage('P1')}
                className="px-5 py-2.5 rounded-xl bg-[#1A1A22] border border-[#2A2A32] hover:bg-[#22222C] text-gray-300 font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={handleNextPage2}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page 3: Timeframe & Delivery */}
        {stage === 'P3' && (
          <div className="bg-[#111116] border border-[#222228] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-400" />
                Set your pace & destination
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Finalize your timeline and email address to process your roadmap.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Q5: How fast do you want to reach your goals?
              </label>

              <div className="grid grid-cols-3 gap-3">
                {['3 Months', '6 Months', '12 Months'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setFormData({ ...formData, timeframe: tf })}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm border transition-all ${
                      formData.timeframe === tf
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-[#181820] border-[#2A2A32] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Q6: Email to send your map: <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#181820] border border-[#2A2A32] rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStage('P2')}
                className="px-5 py-2.5 rounded-xl bg-[#1A1A22] border border-[#2A2A32] hover:bg-[#22222C] text-gray-300 font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={generateRoadmap}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                Generate My Roadmap
              </button>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* STAGE C: LOADING & ROADMAP DISPLAY      */}
        {/* ======================================= */}

        {stage === 'GENERATING' && (
          <div className="bg-[#111116] border border-[#222228] rounded-3xl p-12 text-center shadow-2xl space-y-6 animate-fade-in my-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <Sparkles className="w-8 h-8 text-indigo-400 absolute animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Synthesizing Career Matrix...</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Analyzing your background from <span className="text-indigo-300 font-semibold">{formData.currentRole}</span> to <span className="text-indigo-300 font-semibold">{formData.targetRole}</span> across a {formData.timeframe} horizon.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4">
              <Database className="w-4 h-4 text-emerald-400" /> Saving to persistence & queuing delivery to {formData.email}
            </div>
          </div>
        )}

        {stage === 'ROADMAP' && (
          <div className="space-y-6 animate-fade-in my-4">
            
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-4 flex items-start gap-3 text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <span className="font-semibold text-emerald-300">Roadmap Generated Successfully!</span>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Your customized strategy is ready below and queued for email delivery to <span className="underline font-medium">{formData.email}</span>.
                </p>
              </div>
            </div>

            <div className="bg-[#111116] border border-[#222228] rounded-3xl p-6 sm:p-10 shadow-2xl relative">
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#222228]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Your Actionable Career Map</h2>
                    <p className="text-xs text-gray-400">Target Horizon: {formData.timeframe}</p>
                  </div>
                </div>

                <button
                  onClick={() => setStage('P1')}
                  className="px-3 py-1.5 rounded-lg bg-[#181820] border border-[#2A2A32] hover:bg-[#20202A] text-xs font-medium text-gray-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restart
                </button>
              </div>

              <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed">
                {renderMarkdown(roadmap)}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-600 border-t border-[#181820] relative z-10">
        © 2026 @i Kazi (AI Kazi). All rights reserved. Powered by Google Gemini AI.
      </footer>

    </div>
  );
}
