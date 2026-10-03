import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Edit3, 
  ShieldCheck, 
  Code, 
  Clock, 
  Flag,
  X,
  Zap,
  Check
} from 'lucide-react';
import { generateDrillsWithGroq } from './services/groq';

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
        title: 'Equivalent fractions on the job',
        question: 'A conduit bracket specifies 3/8" clearance. Which measurement is physically equivalent?',
        options: ['6/16"', '4/10"', '9/16"', '3/16"'],
        correctIndex: 0,
        explanation: 'Multiplying numerator and denominator by 2 gives 6/16". Both represent the exact same measurement.',
        hint: 'Multiply numerator and denominator by 2 to compare against sixteenths.'
      },
      {
        id: 'drill-2',
        title: 'Dividing fractional lengths',
        question: 'You need to cut a 3/4-foot conduit into 1/8-foot segments. How many segments do you get?',
        options: ['4 segments', '6 segments', '8 segments', '3 segments'],
        correctIndex: 1,
        explanation: '3/4 divided by 1/8 equals 3/4 × 8/1 = 24/4 = 6 segments.',
        hint: 'Dividing by a fraction means multiplying by its reciprocal (invert 1/8 to 8/1).'
      },
      {
        id: 'drill-3',
        title: 'Dimension comparison',
        question: 'When comparing 5/8" and 11/16", which dimension is larger?',
        options: ['5/8" is larger', '11/16" is larger', 'Both are equal'],
        correctIndex: 1,
        explanation: '5/8 converted to sixteenths is 10/16". Since 11/16 > 10/16, 11/16" is larger.',
        hint: 'Convert 5/8 to a common denominator of 16.'
      }
    ]
  },
  finance: {
    studentName: 'Elena Rostova',
    goal: 'Personal Finance & Career Switch (Adult 34)',
    subject: 'Compound Interest vs APR',
    tutorNotes: 'Elena understands simple annual interest, but had trouble seeing why a 24% credit card APR compounded monthly costs more than a flat annual fee.',
    tutorToneNote: 'Focus on monthly statement realities, keeping terms actionable and jargon-free.',
    drills: [
      {
        id: 'drill-1',
        title: 'Monthly interest rate',
        question: 'If a credit card charges 24% APR, what is the monthly periodic rate charged on revolving balances?',
        options: ['2.0% per month', '0.24% per month', '24% each month', '1.5% per month'],
        correctIndex: 0,
        explanation: 'APR divided by 12 months: 24% / 12 = 2.0% monthly rate.',
        hint: 'Divide the annual figure evenly across the 12 months.'
      },
      {
        id: 'drill-2',
        title: 'Compounding mechanics',
        question: 'Why does carrying a balance over time increase total payments beyond simple interest?',
        options: [
          'Interest is charged only on the initial transaction',
          'Unpaid interest is added to the balance, so subsequent interest is calculated on interest',
          'Banks retroactively increase your contract APR each billing cycle'
        ],
        correctIndex: 1,
        explanation: 'Compounding means unpaid interest capitalizes into the principal balance.',
        hint: 'Consider what happens to the unpaid balance each billing cycle.'
      },
      {
        id: 'drill-3',
        title: 'First month interest charge',
        question: 'On a $1,000 balance at a 2% monthly rate, what interest is added in the first month?',
        options: ['$20.00', '$240.00', '$2.00', '$12.00'],
        correctIndex: 0,
        explanation: '$1,000 × 0.02 = $20.00 in the first cycle.',
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
  
  // Live Groq Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMeta, setGenerationMeta] = useState(null); // { durationMs, model }
  const [generationError, setGenerationError] = useState(null);
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
    setGenerationMeta(null);
    setGenerationError(null);
  };

  const handleGenerateDrills = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const result = await generateDrillsWithGroq({
        studentName,
        subject,
        tutorNotes,
        tutorToneNote
      });

      setDrills(result.drills);
      setGenerationMeta({
        durationMs: result.durationMs,
        model: result.model
      });
      setIsApprovedByTutor(false);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setShowHint(false);
      setCurrentDrillIndex(0);
      setActiveTab('review');
    } catch (err) {
      console.error('Groq generation error:', err);
      setGenerationError(err.message || 'Failed to call Groq API');
    } finally {
      setIsGenerating(false);
    }
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
          studentNote: customFlagNote || 'Requested review during next 1:1 session',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    setCustomFlagNote('');
    setIsFlagModalOpen(false);
  };

  const currentDrill = drills[currentDrillIndex] || drills[0];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col font-sans">
      {/* Top utility bar: functional, quiet */}
      <div className="border-b border-slate-800 bg-[#0b0e14] px-6 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Skyy Learn</span>
          <span className="text-slate-600">/</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
            Live Groq LPU Connected (Qwen 3.8 27B)
          </span>
        </div>
        <button 
          onClick={() => setShowArchModal(true)}
          className="text-slate-300 hover:text-white underline underline-offset-4 flex items-center gap-1.5 transition"
        >
          <Code className="w-3.5 h-3.5" />
          Technical Architecture Blueprint
        </button>
      </div>

      {/* Main Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#07090e] px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-white tracking-normal">
              Skyy Tech — Practice Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Human guidance at the center. AI-assisted drills between sessions.
            </p>
          </div>

          {/* Stepper Navigation: Clean semantic tabs */}
          <nav className="flex items-center gap-1 border border-slate-800 rounded-lg p-1 bg-[#0b0e14]" aria-label="Workflow Steps">
            <button
              onClick={() => setActiveTab('tutor')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTab === 'tutor' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Session Notes
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${
                activeTab === 'review' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Tutor Review
              {isApprovedByTutor && <span className="text-emerald-400 font-bold">✓</span>}
            </button>
            <button
              onClick={() => setActiveTab('learner')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'learner' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Learner Practice
              {flaggedForTutor.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[11px] font-mono">
                  {flaggedForTutor.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                activeTab === 'agenda' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4. Next Session
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto w-full p-6 flex-1 flex flex-col gap-6">

        {/* STEP 1: TUTOR NOTES INPUT */}
        {activeTab === 'tutor' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Context: Presets & Live Model Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-200 mb-2">Preset Scenarios</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Adult learners have concrete goals. Select a scenario or type custom notes:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handlePresetChange('fractions')}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                      selectedPreset === 'fractions'
                        ? 'border-blue-500 bg-blue-950/20 text-white font-medium'
                        : 'border-slate-800 bg-[#0b0e14] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-slate-200 font-medium">Trade Math: Fractions</div>
                    <div className="text-slate-400 mt-0.5">3/8" vs 6/16" conduit measurements</div>
                  </button>
                  <button
                    onClick={() => handlePresetChange('finance')}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                      selectedPreset === 'finance'
                        ? 'border-blue-500 bg-blue-950/20 text-white font-medium'
                        : 'border-slate-800 bg-[#0b0e14] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-slate-200 font-medium">Financial Literacy: APR</div>
                    <div className="text-slate-400 mt-0.5">Compounded interest calculations</div>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 space-y-2">
                <h3 className="text-xs font-semibold text-slate-300">Live AI Engine</h3>
                <div className="p-3 rounded border border-slate-800 bg-[#0b0e14] text-xs space-y-1">
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Provider:</span>
                    <span className="text-slate-200 font-mono">Groq Cloud</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Model:</span>
                    <span className="text-slate-200 font-mono">qwen/qwen3.8-27b</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Latency:</span>
                    <span className="text-emerald-400 font-mono">~1.2s (Groq LPU)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form */}
            <div className="md:col-span-2 space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Log 1:1 Session Takeaways</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Summarize what was covered and where the learner experienced friction.
                  </p>
                </div>
              </div>

              {generationError && (
                <div className="p-3 rounded border border-rose-800 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{generationError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Learner Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject / Topic</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tutor Notes & Specific Misunderstandings
                </label>
                <textarea
                  rows={4}
                  value={tutorNotes}
                  onChange={(e) => setTutorNotes(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Pedagogical Tone & Constraints
                </label>
                <input
                  type="text"
                  value={tutorToneNote}
                  onChange={(e) => setTutorToneNote(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerateDrills}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Live via Groq...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Generate Drills with Live Groq LPU
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: TUTOR REVIEW & APPROVAL GATE */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white">Tutor Review & Verification Gate</h2>
                  {generationMeta && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 font-mono">
                      Generated via {generationMeta.model} in {generationMeta.durationMs}ms
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Verify accuracy and tone before drills are made accessible to {studentName}.
                </p>
              </div>
              <button
                onClick={handleApproveDrills}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Send to Learner
              </button>
            </div>

            <div className="space-y-4">
              {drills.map((drill, index) => (
                <div key={drill.id || index} className="border border-slate-800 rounded-lg p-5 bg-[#0b0e14] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <span className="text-slate-500 font-mono">0{index + 1}.</span>
                      <span>{drill.title}</span>
                    </div>
                    <button
                      onClick={() => setEditingDrillId(editingDrillId === drill.id ? null : drill.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      {editingDrillId === drill.id ? 'Save changes' : 'Edit'}
                    </button>
                  </div>

                  {editingDrillId === drill.id ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Question Prompt</label>
                        <input
                          type="text"
                          value={drill.question}
                          onChange={(e) => {
                            const updated = [...drills];
                            updated[index].question = e.target.value;
                            setDrills(updated);
                          }}
                          className="w-full bg-[#07090e] border border-slate-700 rounded p-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Explanation</label>
                        <input
                          type="text"
                          value={drill.explanation}
                          onChange={(e) => {
                            const updated = [...drills];
                            updated[index].explanation = e.target.value;
                            setDrills(updated);
                          }}
                          className="w-full bg-[#07090e] border border-slate-700 rounded p-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 font-medium">{drill.question}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {drill.options?.map((opt, optIndex) => (
                      <div 
                        key={optIndex}
                        className={`p-2.5 rounded border text-xs flex items-center justify-between ${
                          optIndex === drill.correctIndex
                            ? 'border-emerald-700/60 bg-emerald-950/20 text-emerald-200 font-medium'
                            : 'border-slate-800 bg-[#07090e] text-slate-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {optIndex === drill.correctIndex && (
                          <span className="text-[11px] text-emerald-400 font-mono">Correct</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-400 border-t border-slate-800/60 pt-2 flex flex-col sm:flex-row gap-4">
                    <div>
                      <span className="text-slate-300 font-medium">Verified explanation: </span>
                      {drill.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveTab('tutor')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to notes
              </button>
              <button
                onClick={handleApproveDrills}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve all drills & open learner practice
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LEARNER PRACTICE ROOM */}
        {activeTab === 'learner' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
              <div>
                <span className="font-semibold text-slate-200">{studentName}</span>
                <span className="mx-1.5">·</span>
                <span>{subject}</span>
              </div>
              <div className="font-mono">
                Question {currentDrillIndex + 1} of {drills.length}
              </div>
            </div>

            {/* Drill Card */}
            <div className="border border-slate-800 rounded-lg p-6 bg-[#0b0e14] space-y-6">
              <div>
                <div className="text-xs font-semibold text-blue-400 mb-1">
                  {currentDrill.title}
                </div>
                <h3 className="text-lg font-semibold text-white leading-snug">
                  {currentDrill.question}
                </h3>
              </div>

              {/* Functional visual reference for fractions (no fluff) */}
              {selectedPreset === 'fractions' && (
                <div className="bg-[#07090e] border border-slate-800 rounded p-3.5 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Visual comparison</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-300 w-10">3/8"</span>
                      <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                        <div className="w-[37.5%] bg-blue-600 h-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-300 w-10">6/16"</span>
                      <div className="flex-1 h-4 bg-slate-900 rounded overflow-hidden flex border border-slate-800">
                        <div className="w-[37.5%] bg-sky-500 h-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2.5">
                {currentDrill.options?.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentDrill.correctIndex;
                  const showValidation = selectedAnswer !== null;

                  let style = "border-slate-800 bg-[#07090e] text-slate-300 hover:border-slate-700 hover:bg-slate-900/40";
                  if (showValidation) {
                    if (isCorrect) {
                      style = "border-emerald-600 bg-emerald-950/20 text-emerald-200 font-medium";
                    } else if (isSelected && !isCorrect) {
                      style = "border-rose-600 bg-rose-950/20 text-rose-200";
                    } else {
                      style = "border-slate-800/50 bg-[#07090e]/50 text-slate-500";
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
                      className={`w-full text-left p-3.5 rounded-lg border text-sm transition flex items-center justify-between ${style}`}
                    >
                      <span>{option}</span>
                      {showValidation && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {showValidation && isSelected && !isCorrect && (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hint */}
              {!showExplanation && (
                <div>
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    {showHint ? 'Hide hint' : 'Show hint'}
                  </button>
                  {showHint && (
                    <p className="mt-2 text-xs text-slate-300 bg-[#07090e] p-3 rounded border border-slate-800">
                      {currentDrill.hint}
                    </p>
                  )}
                </div>
              )}

              {/* Explanation feedback */}
              {showExplanation && (
                <div className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                  selectedAnswer === currentDrill.correctIndex
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}>
                  <div className="font-semibold">
                    {selectedAnswer === currentDrill.correctIndex ? 'Correct' : 'Explanation'}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentDrill.explanation}
                  </p>
                </div>
              )}

              {/* Actions: Flag for tutor & next question */}
              <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                <button
                  onClick={() => setIsFlagModalOpen(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 underline"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Flag this for my next 1:1 session
                </button>

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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    {currentDrillIndex < drills.length - 1 ? (
                      <>Next question <ArrowRight className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Review session summary <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: NEXT SESSION AGENDA */}
        {activeTab === 'agenda' && (
          <div className="max-w-3xl mx-auto w-full space-y-6">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Next 1:1 Session Plan</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronizing between-session practice directly into the tutor's next agenda.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Learner: {studentName}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
                <div className="text-xs text-slate-400 font-medium">Session topic</div>
                <div className="text-sm font-semibold text-white mt-1">{subject}</div>
              </div>
              <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
                <div className="text-xs text-slate-400 font-medium">Practice completed</div>
                <div className="text-sm font-semibold text-white mt-1">{drills.length} drills</div>
              </div>
              <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14]">
                <div className="text-xs text-slate-400 font-medium">Flagged items</div>
                <div className="text-sm font-semibold text-amber-400 mt-1">{flaggedForTutor.length} questions</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-slate-300">
                Queued items for tutor review in next live call
              </h3>

              {flaggedForTutor.length === 0 ? (
                <div className="p-4 border border-slate-800 rounded-lg bg-[#0b0e14] text-xs text-slate-400">
                  No items were flagged during this run. The learner completed the set without unresolved confusion.
                </div>
              ) : (
                <div className="space-y-2">
                  {flaggedForTutor.map((item, i) => (
                    <div key={i} className="p-3.5 border border-slate-800 rounded-lg bg-[#0b0e14] flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-200">
                          Question: {item.question}
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="text-amber-400 font-medium">{studentName}'s note:</span> "{item.studentNote}"
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-mono shrink-0">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <button
                onClick={() => setActiveTab('learner')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to practice
              </button>
              <button
                onClick={() => handlePresetChange(selectedPreset === 'fractions' ? 'finance' : 'fractions')}
                className="px-3.5 py-1.5 border border-slate-800 hover:border-slate-700 bg-[#0b0e14] text-slate-300 rounded text-xs font-medium transition"
              >
                Switch to {selectedPreset === 'fractions' ? 'Finance' : 'Fractions'} scenario
              </button>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: Flag for Tutor */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                Flag for Next 1:1 Session
              </h3>
              <button onClick={() => setIsFlagModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add a brief note about what felt unclear so your tutor can address it directly in your next live session.
            </p>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Your question or note</label>
              <textarea
                rows={3}
                value={customFlagNote}
                onChange={(e) => setCustomFlagNote(e.target.value)}
                placeholder="e.g. I got confused when simplifying 3/8 against 16ths."
                className="w-full bg-[#07090e] border border-slate-800 rounded p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagQuestion}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
              >
                Save to agenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Technical Architecture */}
      {showArchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">0-to-1 Technical Implementation</h3>
                <p className="text-xs text-slate-400 mt-0.5">Architecture for Skyy Learn full-stack production</p>
              </div>
              <button onClick={() => setShowArchModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="border border-slate-800 rounded p-3 bg-[#07090e] space-y-1.5">
                <div className="font-medium text-slate-200">1. Relational Data Models (PostgreSQL)</div>
                <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                  users (role: tutor/learner), sessions (scheduled_at, webrtc_room_id), session_notes (tutor_id, observations), ai_drills (drill_data, approved_at), session_flags (learner_id, note).
                </p>
              </div>

              <div className="border border-slate-800 rounded p-3 bg-[#07090e] space-y-1.5">
                <div className="font-medium text-slate-200">2. Live Groq LPU Inference</div>
                <p className="text-slate-400 leading-relaxed">
                  Real-time sub-second JSON structured generation via <code>qwen/qwen3.8-27b</code> on Groq LPUs. Drills are committed with <code>approved_at: null</code> until the human tutor verifies accuracy and tone.
                </p>
              </div>

              <div className="border border-slate-800 rounded p-3 bg-[#07090e] space-y-1.5">
                <div className="font-medium text-slate-200">3. Real-Time 1:1 Tutoring Room</div>
                <p className="text-slate-400 leading-relaxed">
                  WebRTC (LiveKit SFU) for 1:1 video and audio paired with WebSockets for synchronized session notes and lightweight canvas sharing.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowArchModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#07090e] px-6 py-3 text-xs text-slate-500 text-center">
        Skyy Learn Prototype · Live Groq LPU Powered · Human-in-the-Loop Architecture
      </footer>
    </div>
  );
}
