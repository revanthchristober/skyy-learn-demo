import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  UserCheck, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Edit3, 
  ShieldCheck, 
  Send, 
  BookmarkPlus, 
  Code, 
  Layers, 
  ChevronRight,
  HelpCircle,
  Clock,
  Check,
  Flag
} from 'lucide-react';

// Pre-seeded realistic scenarios for instant demoing
const PRESET_SCENARIOS = {
  fractions: {
    studentName: 'Marcus Vance',
    goal: 'Apprentice Electrician Math Prep (Adult 28)',
    subject: 'Fractions & Proportions',
    tutorNotes: 'Marcus grasps basic division, but got stuck calculating wire gauge fractions (comparing 3/8" vs 6/16"). Confuses cross-multiplication with reciprocal division.',
    tutorToneNote: 'Keep practice grounded in shop measurements. Do not use pizza or pie metaphors.',
    drills: [
      {
        id: 'drill-1',
        title: 'Equivalent Fractions on the Job',
        question: 'You have a conduit bracket requiring a 3/8" clearance. Which of these bolt drillings is exactly equivalent?',
        options: ['6/16"', '4/10"', '9/16"', '3/16"'],
        correctIndex: 0,
        explanation: 'Multiplying both numerator and denominator by 2 gives (3×2)/(8×2) = 6/16". Both represent the exact same physical measurement.',
        hint: 'Multiply numerator and denominator by 2 to compare with sixteenths.'
      },
      {
        id: 'drill-2',
        title: 'Dividing Fractional Lengths',
        question: 'You need to cut a 3/4-foot conduit into 1/8-foot segments. How many segments do you get?',
        options: ['4 segments', '6 segments', '8 segments', '3 segments'],
        correctIndex: 1,
        explanation: '3/4 divided by 1/8 is calculated as 3/4 × 8/1 = 24/4 = 6 segments.',
        hint: 'Remember: dividing by a fraction means multiplying by its reciprocal (invert 1/8 to 8/1).'
      },
      {
        id: 'drill-3',
        title: 'Scenario Reflection',
        question: 'When comparing 5/8" and 11/16", which dimension is larger?',
        options: ['5/8" is larger', '11/16" is larger', 'They are identical'],
        correctIndex: 1,
        explanation: 'Convert 5/8 to sixteenths: (5×2)/(8×2) = 10/16". Since 11/16 > 10/16, 11/16" is larger.',
        hint: 'Convert 5/8 to have a common denominator of 16.'
      }
    ]
  },
  finance: {
    studentName: 'Elena Rostova',
    goal: 'Personal Finance & Career Switch (Adult 34)',
    subject: 'Compound Interest vs APR',
    tutorNotes: 'Elena understands simple annual interest, but had trouble seeing why a 24% credit card APR compounded monthly costs significantly more than a flat 24% fee.',
    tutorToneNote: 'Focus on monthly statement realities, keeping terms actionable and jargon-free.',
    drills: [
      {
        id: 'drill-1',
        title: 'Monthly Interest Compounding',
        question: 'If a credit card charges 24% APR, what is the approximate monthly periodic rate charged on the revolving balance?',
        options: ['2.0% per month', '0.24% per month', '24% each billing cycle', '1.5% per month'],
        correctIndex: 0,
        explanation: 'Annual percentage rate (APR) is divided by 12 months: 24% / 12 = 2.0% per month.',
        hint: 'Divide the annual figure across the 12 months in the year.'
      },
      {
        id: 'drill-2',
        title: 'Balance Drift',
        question: 'Why does leaving a balance on a card increase total payments beyond simple interest?',
        options: ['Interest is calculated only on the original purchase', 'Unpaid interest is added to the balance, so you pay interest on interest', 'Banks recalculate your APR daily to a higher rate'],
        correctIndex: 1,
        explanation: 'Compounding means unpaid interest capitalizes into the principal balance each billing cycle.',
        hint: 'Think about what happens to the unpaid balance each month.'
      },
      {
        id: 'drill-3',
        title: 'Actionable Calculation',
        question: 'On a $1,000 balance at 2% monthly rate, how much interest is added in the first month before principal payments?',
        options: ['$20.00', '$240.00', '$2.00', '$12.00'],
        correctIndex: 0,
        explanation: '$1,000 × 0.02 = $20.00 in the first month alone.',
        hint: 'Calculate 2% of $1,000.'
      }
    ]
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('tutor'); // 'tutor' | 'review' | 'learner' | 'agenda'
  const [selectedPreset, setSelectedPreset] = useState('fractions');
  
  // Tutor Input State
  const [studentName, setStudentName] = useState(PRESET_SCENARIOS.fractions.studentName);
  const [subject, setSubject] = useState(PRESET_SCENARIOS.fractions.subject);
  const [tutorNotes, setTutorNotes] = useState(PRESET_SCENARIOS.fractions.tutorNotes);
  const [tutorToneNote, setTutorToneNote] = useState(PRESET_SCENARIOS.fractions.tutorToneNote);
  
  // Generation & Guardrail State
  const [isGenerating, setIsGenerating] = useState(false);
  const [drills, setDrills] = useState(PRESET_SCENARIOS.fractions.drills);
  const [isApprovedByTutor, setIsApprovedByTutor] = useState(false);
  const [editingDrillId, setEditingDrillId] = useState(null);

  // Learner Interaction State
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [flaggedForTutor, setFlaggedForTutor] = useState([]);
  const [customFlagNote, setCustomFlagNote] = useState('');
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);

  // Architecture Modal
  const [showArchModal, setShowArchModal] = useState(false);

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    const data = PRESET_SCENARIOS[presetKey];
    setStudentName(data.studentName);
    setSubject(data.subject);
    setTutorNotes(data.tutorNotes);
    setTutorToneNote(data.tutorToneNote);
    setDrills(data.drills);
    setIsApprovedByTutor(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setCurrentDrillIndex(0);
  };

  const handleGenerateDrills = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsApprovedByTutor(false);
      setActiveTab('review');
    }, 900);
  };

  const handleApproveDrills = () => {
    setIsApprovedByTutor(true);
    setActiveTab('learner');
  };

  const handleFlagQuestion = () => {
    const activeDrill = drills[currentDrillIndex];
    if (!flaggedForTutor.some(f => f.drillId === activeDrill.id)) {
      setFlaggedForTutor([
        ...flaggedForTutor,
        {
          drillId: activeDrill.id,
          question: activeDrill.question,
          studentNote: customFlagNote || 'Requested clarification during practice',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    setCustomFlagNote('');
    setIsFlagModalOpen(false);
  };

  const currentDrill = drills[currentDrillIndex];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      {/* Top Banner / Concept Bridge */}
      <div className="border-b border-blue-900/40 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-blue-950/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            Prototype
          </span>
          <span>Proof-of-Concept for <strong>Skyy Learn</strong>: Connecting human 1:1 sessions with guardrailed AI practice.</span>
        </div>
        <button 
          onClick={() => setShowArchModal(true)}
          className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 transition"
        >
          <Code className="w-3.5 h-3.5" />
          View Production 0-to-1 Architecture
        </button>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-800/80 bg-[#030712]/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center font-black text-black text-lg skyy-glow">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">SKYY</span>
                <span className="font-semibold text-slate-400 text-sm">LEARN</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                  Concept Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Human guidance at the center · AI support along the way</p>
            </div>
          </div>

          {/* Workflow Stepper / Navigation */}
          <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'tutor' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              1. Tutor Notes
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'review' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              2. Tutor Review Gate
              {isApprovedByTutor && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button
              onClick={() => setActiveTab('learner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'learner' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              3. Learner Practice
              {flaggedForTutor.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                  {flaggedForTutor.length}
                </span>
              )}
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'agenda' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              4. Next Session Loop
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full p-6 flex-1 flex flex-col gap-6">

        {/* STEP 1: TUTOR SESSION LOG */}
        {activeTab === 'tutor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Left Column: Context & Presets */}
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-blue-400 mb-2 font-semibold text-sm">
                  <UserCheck className="w-4 h-4" />
                  Select Demo Scenario
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Skyy Learn targets adult learners building practical skills. Choose a pre-seeded session or edit freely:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handlePresetChange('fractions')}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1 ${
                      selectedPreset === 'fractions'
                        ? 'border-blue-500 bg-blue-950/30 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Trades & Carpentry Math (Fractions)</div>
                    <div className="text-[11px] text-slate-400">Directly mirrors the fractions example on skyytechhq.com</div>
                  </button>
                  <button
                    onClick={() => handlePresetChange('finance')}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1 ${
                      selectedPreset === 'finance'
                        ? 'border-blue-500 bg-blue-950/30 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Financial Literacy (Compound Interest)</div>
                    <div className="text-[11px] text-slate-400">Adult career-switcher practical finance session</div>
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Dakota's Thesis in Action</h4>
                <blockquote className="text-xs italic text-slate-300 border-l-2 border-blue-500 pl-3 py-1 space-y-1">
                  <p>"AI should enhance—not replace—the learning experience. A human tutor helps make sense of difficult ideas; AI helps work on them between sessions."</p>
                  <footer className="text-[10px] text-slate-500 not-italic">— Skyy Tech Founder Vision</footer>
                </blockquote>
              </div>
            </div>

            {/* Right Column: Tutor Session Input Form */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    Step 1: Tutor Logs 1:1 Session Notes
                  </h2>
                  <p className="text-xs text-slate-400">
                    After the live session ends, the human tutor logs what was covered and where the learner stumbled.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Session Completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Adult Learner</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject Focus</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tutor Session Observations & Confusion Points
                </label>
                <textarea
                  rows={4}
                  value={tutorNotes}
                  onChange={(e) => setTutorNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                  placeholder="What was covered? What specifically caused confusion?"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  The AI uses these exact notes to synthesize targeted drills targeting the student's specific breakdown point.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tutor Guardrail Directive (Pedagogical Tone & Constraints)
                </label>
                <input
                  type="text"
                  value={tutorToneNote}
                  onChange={(e) => setTutorToneNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Ground in real shop examples, avoid childish metaphors"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerateDrills}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition flex items-center gap-2 skyy-glow disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Synthesizing Guardrailed Drills...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Adaptive Practice Drills
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: TUTOR REVIEW & GUARDRAIL GATE */}
        {activeTab === 'review' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Guardrail Disclaimer Banner */}
            <div className="border border-blue-500/30 bg-blue-950/30 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/40">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Step 2: Human-in-the-Loop Review Gate</h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Guardrail Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  As stated on Skyy Tech's manifesto, <em>"AI is a supporting tool. Its suggestions can be wrong and need review."</em> These drills remain locked until the tutor reviews or edits them for accuracy.
                </p>
              </div>
              <button
                onClick={handleApproveDrills}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Unlock for {studentName}
              </button>
            </div>

            {/* Drills List for Tutor Review */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Generated 3 personalized drills based on session with <strong>{studentName}</strong></span>
                <span>Click any question to tweak wording or verify explanation</span>
              </div>

              {drills.map((drill, index) => (
                <div key={drill.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 transition hover:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs flex items-center justify-center font-bold">
                        0{index + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{drill.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        Multiple Choice
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingDrillId(editingDrillId === drill.id ? null : drill.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {editingDrillId === drill.id ? 'Done Editing' : 'Edit Question'}
                    </button>
                  </div>

                  {editingDrillId === drill.id ? (
                    <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Question Prompt</label>
                        <input
                          type="text"
                          value={drill.question}
                          onChange={(e) => {
                            const updated = [...drills];
                            updated[index].question = e.target.value;
                            setDrills(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Tutor Explanation</label>
                        <input
                          type="text"
                          value={drill.explanation}
                          onChange={(e) => {
                            const updated = [...drills];
                            updated[index].explanation = e.target.value;
                            setDrills(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 font-medium pl-8">{drill.question}</p>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                    {drill.options.map((opt, optIndex) => (
                      <div 
                        key={optIndex}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          optIndex === drill.correctIndex
                            ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 font-medium'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {optIndex === drill.correctIndex && (
                          <span className="text-[10px] text-emerald-400 font-mono">Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Verified explanation & hint */}
                  <div className="pl-8 pt-2 flex flex-col sm:flex-row gap-4 text-xs text-slate-400 border-t border-slate-800/60">
                    <div>
                      <strong className="text-slate-300">Tutor Verified Explanation: </strong>
                      {drill.explanation}
                    </div>
                    <div>
                      <strong className="text-slate-300">Adaptive Hint: </strong>
                      {drill.hint}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActiveTab('tutor')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                ← Back to Session Notes
              </button>
              <button
                onClick={handleApproveDrills}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-2 skyy-glow"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve All 3 Drills & Launch Practice Room →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LEARNER PRACTICE ROOM */}
        {activeTab === 'learner' && (
          <div className="max-w-3xl mx-auto w-full space-y-6 animate-fadeIn">
            {/* Status bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="text-slate-300 font-semibold">{studentName}'s Practice Room</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Drill {currentDrillIndex + 1} of {drills.length}</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${((currentDrillIndex + 1) / drills.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Practice Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500"></div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
                    Step {currentDrillIndex + 1}
                  </span>
                  <span className="text-slate-600">/</span>
                  <span className="text-xs text-slate-400">{currentDrill.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Tutor Verified
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                  {currentDrill.question}
                </h3>
              </div>

              {/* Visual Aid (inspired by skyytechhq.com interactive fraction bars) */}
              {selectedPreset === 'fractions' && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                    <span>Visual Reference</span>
                    <span className="text-blue-400">Equivalent Breakdown</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300 w-8">3/8</span>
                      <div className="flex-1 h-5 bg-slate-900 rounded-md overflow-hidden flex border border-slate-800">
                        <div className="w-[37.5%] bg-blue-500/80 h-full border-r border-blue-400/50"></div>
                        <div className="flex-1 h-full bg-slate-900/60"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300 w-8">6/16</span>
                      <div className="flex-1 h-5 bg-slate-900 rounded-md overflow-hidden flex border border-slate-800">
                        <div className="w-[37.5%] bg-sky-400/80 h-full border-r border-sky-300/50"></div>
                        <div className="flex-1 h-full bg-slate-900/60"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                {currentDrill.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentDrill.correctIndex;
                  const showValidation = selectedAnswer !== null;

                  let cardStyle = "border-slate-800 bg-slate-950/50 text-slate-200 hover:border-slate-700 hover:bg-slate-900/50";
                  if (showValidation) {
                    if (isCorrect) {
                      cardStyle = "border-emerald-500/80 bg-emerald-950/30 text-white font-medium";
                    } else if (isSelected && !isCorrect) {
                      cardStyle = "border-rose-500/80 bg-rose-950/30 text-rose-200";
                    } else {
                      cardStyle = "border-slate-800/40 bg-slate-950/20 text-slate-500 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={showValidation}
                      onClick={() => {
                        setSelectedAnswer(idx);
                        setShowExplanation(true);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${cardStyle}`}
                    >
                      <span className="font-medium">{option}</span>
                      {showValidation && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                      {showValidation && isSelected && !isCorrect && (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hint Accordion */}
              {!showExplanation && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showHint ? 'Hide Hint' : 'Need a quick hint?'}
                  </button>
                  {showHint && (
                    <p className="mt-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      💡 <strong>Hint: </strong>{currentDrill.hint}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback & Explanation Box */}
              {showExplanation && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  selectedAnswer === currentDrill.correctIndex
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}>
                  <div className="font-semibold flex items-center gap-1.5">
                    {selectedAnswer === currentDrill.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Correct! You've got the concept.
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Not quite, but that's how we learn.
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentDrill.explanation}
                  </p>
                </div>
              )}

              {/* Action Bar (The Critical Dakota Hook: Flag for Tutor) */}
              <div className="border-t border-slate-800 pt-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setIsFlagModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Flag this for My Next 1:1 Session
                </button>

                <div className="flex items-center gap-2">
                  {selectedAnswer !== null && (
                    <button
                      onClick={() => {
                        setSelectedAnswer(null);
                        setShowExplanation(false);
                        setShowHint(false);
                        if (currentDrillIndex < drills.length - 1) {
                          setCurrentDrillIndex(currentDrillIndex + 1);
                        } else {
                          setActiveTab('agenda');
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 skyy-glow"
                    >
                      {currentDrillIndex < drills.length - 1 ? (
                        <>Next Drill <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <>Complete Practice & View Shared Plan <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: NEXT SESSION AGENDA / THE CLOSED LOOP */}
        {activeTab === 'agenda' && (
          <div className="max-w-4xl mx-auto w-full space-y-6 animate-fadeIn">
            <div className="border border-slate-800 bg-slate-900/80 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Step 4: Continuous Learning Cycle
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Shared Learning Plan & Next Session Agenda
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    How between-session AI practice loops directly back into the human tutor's next lesson.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
                  {studentName} · Next 1:1 in 3 days
                </div>
              </div>

              {/* 3-Column Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    Last Session Covered
                  </div>
                  <p className="text-xs text-slate-400">{subject}</p>
                  <p className="text-[11px] text-slate-500 italic">"{tutorNotes.slice(0, 90)}..."</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Asynchronous AI Drills
                  </div>
                  <p className="text-xs text-slate-400">3 of 3 Drills Completed</p>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
                    Tutor Guardrail Verified
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Flag className="w-4 h-4 text-amber-400" />
                    Flagged for Next 1:1
                  </div>
                  <p className="text-xs text-slate-400">{flaggedForTutor.length} items flagged by learner</p>
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                    Ready for Tutor Review
                  </span>
                </div>
              </div>

              {/* Items Flagged by Student */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-amber-400" />
                  Learner Questions Queued for Next 1:1 Session
                </h4>

                {flaggedForTutor.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No questions flagged during this practice run. (You can test flagging an item in Step 3).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flaggedForTutor.map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-200">
                            Drill #{i + 1}: {item.question}
                          </div>
                          <div className="text-xs text-amber-300 flex items-center gap-1.5">
                            <span className="font-semibold">{studentName}'s note:</span> "{item.studentNote}"
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-5 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('learner')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Return to Practice Room
                </button>
                <button
                  onClick={() => handlePresetChange(selectedPreset === 'fractions' ? 'finance' : 'fractions')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Alternate Persona Scenario
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: Flag for Tutor */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <Flag className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Flag for Your Tutor</h3>
            </div>
            <p className="text-xs text-slate-300">
              Stuck on this concept? Save your question so your tutor can walk through it with you in your next 1:1 session.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">What felt confusing?</label>
              <textarea
                rows={3}
                value={customFlagNote}
                onChange={(e) => setCustomFlagNote(e.target.value)}
                placeholder="e.g. I understand multiplying fractions, but why do we invert the divisor here?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagQuestion}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
              >
                Add to Next Session Agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Technical Architecture & 0-to-1 Plan */}
      {showArchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono">Engineering Blueprint</span>
                <h3 className="text-lg font-bold text-white mt-1">Skyy Learn 0-to-1 Production Architecture</h3>
              </div>
              <button 
                onClick={() => setShowArchModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> 1. Data Schema (PostgreSQL + Prisma / Drizzle)
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[11px]">
                  <li><code>Users</code>: Role-based (Learner, Tutor, Admin)</li>
                  <li><code>TutoringSessions</code>: Scheduled times, WebRTC room IDs, Stripe escrow status</li>
                  <li><code>SessionNotes</code>: Tutor-authored recap, key struggles, custom guidance</li>
                  <li><code>AIDrills</code>: Structured JSON questions, hints, <code>approved_by_tutor_at</code> (ISO8601)</li>
                  <li><code>LearnerAttempts</code>: Time spent, chosen answer, correctness</li>
                  <li><code>FlaggedTopics</code>: Unresolved questions passed to next session's agenda</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 2. LLM Pipeline & Guardrail Strategy
                </h4>
                <p className="text-slate-400">
                  Using structured JSON output validation (e.g. Instructor/Zod schema enforcement). The LLM is restricted from dispensing general knowledge without citing the tutor's session takeaways. Every drill requires explicit human-tutor sign-off before learner distribution.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 3. Realtime & Video Infrastructure
                </h4>
                <p className="text-slate-400">
                  1-on-1 tutoring sessions powered by LiveKit (or raw WebRTC SFU) with WebSocket-driven synchronized markdown notes and visual whiteboard canvas. Keeps infra costs under $0.005/min while maintaining ultra-low latency.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowArchModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
              >
                Close Blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#030712] px-6 py-4 text-xs text-slate-500 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          Built as a founding engineer prototype demonstration for <strong>Skyy Tech</strong> / Dakota Munro.
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>React 19</span>
          <span>·</span>
          <span>Tailwind CSS</span>
          <span>·</span>
          <span>Guardrail Human-in-the-Loop</span>
        </div>
      </footer>
    </div>
  );
}
