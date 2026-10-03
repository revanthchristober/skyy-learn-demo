import React, { useState, useEffect } from 'react';
import { Drill, FlaggedTopic, TabKey } from './types';
import { 
  fetchSession, 
  generateDrillsAPI, 
  updateDrillAPI, 
  approveAllDrillsAPI, 
  flagQuestionAPI 
} from './api/client';
import { Header } from './components/Header';
import { TutorNotesTab } from './components/TutorNotesTab';
import { TutorReviewTab } from './components/TutorReviewTab';
import { LearnerPracticeTab } from './components/LearnerPracticeTab';
import { NextSessionTab } from './components/NextSessionTab';
import { FlagModal } from './components/FlagModal';
import { ArchitectureModal } from './components/ArchitectureModal';

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

export default function App() {
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
  const [generationMeta, setGenerationMeta] = useState<{ durationMs: number; model: string } | null>(null);
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
        model: res.meta.model
      });
      setActiveTab('review');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateDrill = async (id: string, updates: { question?: string; explanation?: string }) => {
    try {
      const updated = await updateDrillAPI(id, updates);
      setDrills(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
    } catch (err) {
      console.error('Failed to update drill:', err);
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
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isApproved={isApproved}
        flagCount={flaggedTopics.length}
        onOpenArchitecture={() => setIsArchModalOpen(true)}
      />

      <main className="max-w-5xl mx-auto w-full p-6 flex-1 flex flex-col gap-6">
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

      <footer className="border-t border-slate-800 bg-[#07090e] px-6 py-3 text-xs text-slate-500 text-center">
        Skyy Learn Prototype · Full-Stack TypeScript + Node.js + Groq LPU + Zod
      </footer>
    </div>
  );
}
