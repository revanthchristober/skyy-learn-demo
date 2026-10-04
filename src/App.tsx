import React, { useState, useEffect } from 'react';
import { Drill, FlaggedTopic, TabKey } from './types';
import { 
  fetchSession, 
  generateDrillsAPI, 
  updateDrillAPI, 
  approveAllDrillsAPI, 
  flagQuestionAPI,
  acceptSuggestionAPI,
  dismissFlagAPI
} from './api/client';
import { Header } from './components/Header';
import { TutorNotesTab } from './components/TutorNotesTab';
import { TutorReviewTab } from './components/TutorReviewTab';
import { LearnerPracticeTab } from './components/LearnerPracticeTab';
import { NextSessionTab } from './components/NextSessionTab';
import { FlagModal } from './components/FlagModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AuthModal } from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

const PRESETS = {
  fractions: {
    studentName: 'Marcus Vance',
    subject: 'Fractions & Proportions',
    tutorNotes: 'Marcus grasps basic division, but got stuck calculating conduit fractions (comparing 3/8" vs 6/16"). Confuses cross-multiplication with reciprocal division.',
    tutorToneNote: 'Keep practice grounded in shop measurements. Do not use pizza or pie metaphors.'
  },
  finance: {
    studentName: 'Elena Rostova',
    subject: 'Compound Interest vs APR',
    tutorNotes: 'Elena understands simple annual interest, but had trouble seeing why a 24% credit card APR compounded monthly costs more than a flat annual fee.',
    tutorToneNote: 'Focus on monthly statement realities, keeping terms actionable and jargon-free.'
  }
};

function SkyyLearnApp() {
  const { activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('tutor');
  const [selectedPreset, setSelectedPreset] = useState<'fractions' | 'finance'>('fractions');

  // Session & Form State
  const [studentName, setStudentName] = useState(PRESETS.fractions.studentName);
  const [subject, setSubject] = useState(PRESETS.fractions.subject);
  const [tutorNotes, setTutorNotes] = useState(PRESETS.fractions.tutorNotes);
  const [tutorToneNote, setTutorToneNote] = useState(PRESETS.fractions.tutorToneNote);

  // Drills & Approval State
  const [drills, setDrills] = useState<Drill[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [flaggedTopics, setFlaggedTopics] = useState<FlaggedTopic[]>([]);

  // Async Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<{
    durationMs: number;
    model: string;
    auditorModel?: string;
    auditDurationMs?: number;
    attempts?: number;
    flaggedCount?: number;
    retryLogs?: Array<{
      attempt: number;
      reason: string;
      errors: string[];
    }>;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Modals
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // Initial load from backend database
  useEffect(() => {
    fetchSession()
      .then(data => {
        if (data.session) {
          setStudentName(data.session.studentName);
          setSubject(data.session.subject);
          setTutorNotes(data.session.tutorNotes || PRESETS.fractions.tutorNotes);
          setTutorToneNote(data.session.tutorToneNote || PRESETS.fractions.tutorToneNote);
          setIsApproved(data.session.isApproved);
        }
        if (data.drills && data.drills.length > 0) {
          setDrills(data.drills);
        }
        if (data.flags) {
          setFlaggedTopics(data.flags);
        }
      })
      .catch(err => {
        console.warn('Backend not responding yet, running with preset state:', err);
      });
  }, []);

  const handlePresetChange = (key: 'fractions' | 'finance') => {
    setSelectedPreset(key);
    const data = PRESETS[key];
    setStudentName(data.studentName);
    setSubject(data.subject);
    setTutorNotes(data.tutorNotes);
    setTutorToneNote(data.tutorToneNote);
    setGenerationMeta(null);
    setGenerationError(null);
  };

  const handleGenerateDrills = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const res = await generateDrillsAPI({
        studentName,
        subject,
        tutorNotes,
        tutorToneNote
      });

      setDrills(res.drills);
      setIsApproved(false);
      setGenerationMeta({
        durationMs: res.meta.durationMs,
        model: res.meta.model,
        auditorModel: res.meta.auditorModel,
        auditDurationMs: res.meta.auditDurationMs,
        attempts: res.meta.attempts,
        flaggedCount: res.meta.flaggedCount,
        retryLogs: res.meta.retryLogs
      });
      setActiveTab('review');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateDrill = async (id: string, updates: { question?: string; explanation?: string; correctIndex?: number }) => {
    try {
      const updated = await updateDrillAPI(id, updates);
      setDrills(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    } catch (err) {
      console.error('Failed to update drill:', err);
    }
  };

  const handleAcceptSuggestion = async (id: string) => {
    try {
      const updated = await acceptSuggestionAPI(id);
      setDrills(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error('Failed to accept suggestion:', err);
    }
  };

  const handleDismissFlag = async (id: string) => {
    try {
      const updated = await dismissFlagAPI(id);
      setDrills(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error('Failed to dismiss flag:', err);
    }
  };

  const handleApproveAll = async () => {
    setIsApproving(true);
    try {
      const approved = await approveAllDrillsAPI();
      setDrills(approved);
      setIsApproved(true);
      setActiveTab('learner');
    } catch (err) {
      console.error('Failed to approve drills:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleFlagQuestion = async (note: string) => {
    const activeDrill = drills[0];
    if (!activeDrill) return;

    try {
      const flagged = await flagQuestionAPI({
        drillId: activeDrill.id,
        question: activeDrill.question,
        studentNote: note
      });
      setFlaggedTopics(prev => [...prev, flagged]);
    } catch (err) {
      console.error('Failed to flag question:', err);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas md:flex">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isApproved={isApproved}
        flagCount={flaggedTopics.length}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
      />

      <main key={activeTab} className="view-in flex-1 min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className={activeTab === 'tutor' ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
        {activeTab === 'tutor' && (
          <TutorNotesTab
            selectedPreset={selectedPreset}
            onPresetChange={handlePresetChange}
            studentName={studentName}
            setStudentName={setStudentName}
            subject={subject}
            setSubject={setSubject}
            tutorNotes={tutorNotes}
            setTutorNotes={setTutorNotes}
            tutorToneNote={tutorToneNote}
            setTutorToneNote={setTutorToneNote}
            onGenerate={handleGenerateDrills}
            isGenerating={isGenerating}
            generationError={generationError}
          />
        )}

        {activeTab === 'review' && (
          <TutorReviewTab
            drills={drills}
            studentName={studentName}
            generationMeta={generationMeta}
            onUpdateDrill={handleUpdateDrill}
            onApproveAll={handleApproveAll}
            onBackToNotes={() => setActiveTab('tutor')}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissFlag={handleDismissFlag}
            isApproving={isApproving}
          />
        )}

        {activeTab === 'learner' && (
          <LearnerPracticeTab
            drills={drills}
            studentName={studentName}
            subject={subject}
            onOpenFlagModal={() => setIsFlagModalOpen(true)}
            onCompletePractice={() => setActiveTab('agenda')}
          />
        )}

        {activeTab === 'agenda' && (
          <NextSessionTab
            studentName={studentName}
            subject={subject}
            totalDrills={drills.length}
            flaggedTopics={flaggedTopics}
            selectedPreset={selectedPreset}
            onPresetChange={handlePresetChange}
            onReturnToPractice={() => setActiveTab('learner')}
          />
        )}
        </div>
      </main>

      <FlagModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        onSubmit={handleFlagQuestion}
      />

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      <AuthModal />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SkyyLearnApp />
    </AuthProvider>
  );
}
