import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Camera, AlertCircle, Plus, MapPin,
  X, ImagePlus, Send, MessageSquare, Menu, Wrench, Ruler, ArrowRight,
} from 'lucide-react';
import { diagnoseIssue } from './services/api';
import { projectStage1, projectStage2, projectStage3 } from './services/project-api';
import { storage } from './services/storage';
import { generateThumbnail } from './utils/thumbnail';
import { resizeImageForUpload } from './utils/resize';
import { calculateSavings, getProCostMidpoint } from './utils/savings';
import {
  DiagnoseResponse, Coords, ConversationMessage, DiagnosisStatus,
  DiagnosisSession, CompletionStatus, SkillLevel,
  ProjectPlanState, ProjectStage1Result, ProjectStage2Result, ProjectStage3Result,
} from './types';
import DiagnosisCards from './components/DiagnosisCards';
import ProjectPlanCards from './components/ProjectPlanCards';
import BasketPanel from './components/BasketPanel';
import HistorySidebar from './components/HistorySidebar';
import SavingsDashboard from './components/SavingsDashboard';
import CompletionPrompt from './components/CompletionPrompt';
import ProjectProgress from './components/ProjectProgress';

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied';
type FlowState =
  | 'input' | 'needs_more_info' | 'ready_for_repair' | 'call_professional'
  | 'needs_measurements' | 'planning_complete' | 'project_questions';

interface ImageItem {
  id: string;
  preview: string;
  imageBase64: string;
  mimeType: string;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function statusToFlow(status: DiagnosisStatus): Exclude<FlowState, 'input'> {
  switch (status) {
    case 'needs_more_info': return 'needs_more_info';
    case 'ready_for_repair': return 'ready_for_repair';
    case 'needs_measurements': return 'needs_measurements';
    case 'planning_complete': return 'planning_complete';
    default: return 'call_professional';
  }
}

function isProjectRequest(desc: string): boolean {
  const lower = desc.toLowerCase();
  return [
    'tile', 'tiling', 'retile', 'floor', 'flooring',
    'paint', 'painting', 'redecorate', 'wallpaper', 'wallpapering',
    'plaster', 'plastering', 'replaster', 'render', 'rendering',
    'shelf', 'shelving', 'garden', 'lay ',
    'install', 'renovate', 'renovation', 'carpet', 'laminate',
    'parquet', 'sanding', 'varnish', 'repoint',
  ].some(kw => lower.includes(kw));
}

function assembleStagedResult(
  s1: ProjectStage1Result,
  s2: ProjectStage2Result | null,
  s3: ProjectStage3Result | null,
): DiagnoseResponse {
  return {
    status: s3 ? 'planning_complete' : 'needs_more_info',
    introMessage: s3?.introMessage ?? s2?.introMessage ?? s1.introMessage,
    confidence: s1.confidence,
    likelyIssue: s1.projectTitle,
    reasoning: '',
    confidenceThresholdExplanation: '',
    followUpQuestions: s1.clarifyingQuestions,
    requestedPhotos: [],
    safetyWarnings: s1.safetyWarnings,
    estimatedDifficultyScore: s2?.estimatedDifficultyScore ?? null,
    estimatedTime: s2?.estimatedTime ?? null,
    callProfessionalRecommended: false,
    callProfessionalReason: null,
    firstStep: null,
    toolsNeeded: [],
    partsNeeded: [],
    repairSteps: s3?.steps ?? [],
    productSuggestions: [],
    tradeType: 'general',
    photoHelpRequested: false,
    photoHelpPrompt: '',
    identificationResult: null,
    identificationConfidence: null,
    estimatedProCost: s2?.estimatedProCost ?? null,
    estimatedDIYCost: s2?.estimatedDIYCost ?? null,
    mode: 'project_planning',
    projectCategory: s1.projectCategory,
    projectTitle: s1.projectTitle,
    skillLevel: null,
    measurementsNeeded: s1.clarifyingQuestions,
    materials: s2?.materials ?? [],
    shoppingList: s3?.shoppingList ?? [],
    proTips: s3?.proTips ?? [],
  };
}

function generateSessionTitle(res: DiagnoseResponse, description: string): string {
  const source = res.mode === 'project_planning'
    ? (res.projectTitle || res.likelyIssue || description || 'New project')
    : (res.likelyIssue || description || 'New diagnosis');
  return source.length > 50 ? source.slice(0, 47) + '…' : source;
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Coords | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<number | null>(null);
  const [result, setResult] = useState<DiagnoseResponse | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('input');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [followUpText, setFollowUpText] = useState('');
  const [photoCountAtLastSubmit, setPhotoCountAtLastSubmit] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<DiagnosisSession[]>(() => storage.getSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('pending');
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [currentStepContext, setCurrentStepContext] = useState<{ stepNumber: number; title: string } | null>(null);
  const [projectPlanState, setProjectPlanState] = useState<ProjectPlanState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const followUpRef = useRef<HTMLDivElement>(null);

  const totalSavings = useMemo(
    () => sessions
      .filter(s => s.completionStatus === 'completed_diy')
      .reduce((acc, s) => acc + (s.estimatedSavings ?? 0), 0),
    [sessions]
  );

  const currentSession = currentSessionId
    ? sessions.find(s => s.id === currentSessionId) ?? null
    : null;

  useEffect(() => {
    if (result) topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result]);

  function processFiles(fileList: FileList) {
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const preview = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const rawBase64 = dataUrl.split(',')[1];
        // Resize to max 1200px / JPEG 0.7 before storing — reduces upload payload ~5–10×
        const { base64, mimeType: outMime } = await resizeImageForUpload(rawBase64, file.type);
        setImages(prev => [...prev, {
          id: newId(),
          preview, // original blob URL for display quality
          imageBase64: base64, // resized for API calls
          mimeType: outMime,
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }

  function removeImage(id: string) {
    setImages(prev => prev.filter(img => img.id !== id));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied')
    );
  }

  function startNewSession() {
    setImages([]);
    setDescription('');
    setResult(null);
    setConversationHistory([]);
    setFollowUpText('');
    setPhotoCountAtLastSubmit(0);
    setError(null);
    setFlowState('input');
    setLocationStatus('idle');
    setLocation(null);
    setCurrentSessionId(null);
    setCompletionStatus('pending');
    setCurrentStepContext(null);
    setProjectPlanState(null);
    setLoadingStage(null);
    // skill level intentionally preserved across sessions
  }

  function loadSession(s: DiagnosisSession) {
    setResult(s.result);
    setConversationHistory(s.conversationHistory);
    setDescription(s.description);
    const baseFlow = s.status ? statusToFlow(s.status) : 'input';
    const effectiveFlow: FlowState =
      s.mode === 'project_planning' && baseFlow === 'needs_more_info'
        ? 'project_questions'
        : baseFlow;
    setFlowState(effectiveFlow);
    setCurrentSessionId(s.id);
    setImages([]);
    setPhotoCountAtLastSubmit(0);
    setFollowUpText('');
    setError(null);
    setCompletionStatus(s.completionStatus);
    setCurrentStepContext(null);
    setProjectPlanState(s.projectPlanState ?? null);
    setLoadingStage(null);
    if (s.skillLevel) setSkillLevel(s.skillLevel);
    window.scrollTo(0, 0);
  }

  function handleAskAboutStep(stepNumber: number, title: string) {
    setCurrentStepContext({ stepNumber, title });
    setFollowUpText('');
    setTimeout(() => {
      followUpRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function handleDeleteSession(id: string) {
    storage.deleteSession(id);
    setSessions(storage.getSessions());
    if (id === currentSessionId) startNewSession();
  }

  function handleRenameSession(id: string, title: string) {
    storage.updateSession(id, { title });
    setSessions(storage.getSessions());
  }

  async function handleCompletion(status: CompletionStatus) {
    setCompletionStatus(status);
    if (currentSessionId) {
      const updates: Partial<DiagnosisSession> = { completionStatus: status };
      if (status === 'completed_diy') updates.completedAt = new Date().toISOString();
      storage.updateSession(currentSessionId, updates);
      setSessions(storage.getSessions());
    }
  }

  async function handleRepairFlow() {
    try {
      const [res, thumbnails] = await Promise.all([
        diagnoseIssue({
          description: description.trim() || null,
          images: images.slice(0, 3).map(({ imageBase64, mimeType }) => ({ imageBase64, mimeType })),
          conversationHistory: [],
          location,
          skillLevel,
        }),
        Promise.all(images.map(img => generateThumbnail(img.imageBase64, img.mimeType))),
      ]);

      const sessionId = newId();
      const newHistory: ConversationMessage[] = [
        { role: 'user', content: description.trim() || '(photo only)' },
        { role: 'assistant', content: JSON.stringify(res) },
      ];

      setResult(res);
      setConversationHistory(newHistory);
      setPhotoCountAtLastSubmit(images.length);
      setFlowState(statusToFlow(res.status));
      setCurrentSessionId(sessionId);
      setCompletionStatus('pending');
      setProjectPlanState(null);

      const session: DiagnosisSession = {
        id: sessionId,
        title: generateSessionTitle(res, description),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        description: description.trim(),
        imageThumbnails: thumbnails.filter(Boolean),
        conversationHistory: newHistory,
        result: res,
        status: res.status,
        mode: res.mode,
        projectCategory: res.projectCategory,
        skillLevel: res.skillLevel ?? skillLevel,
        estimatedDIYCost: res.estimatedDIYCost,
        estimatedProCostMidpoint: getProCostMidpoint(res),
        estimatedSavings: calculateSavings(res),
        completionStatus: 'pending',
        tradeType: res.tradeType,
        projectPlanState: null,
      };
      storage.saveSession(session);
      setSessions(storage.getSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectFlow() {
    setLoadingStage(1);
    try {
      const [s1, thumbnails] = await Promise.all([
        projectStage1({
          description: description.trim(),
          images: images.slice(0, 3).map(({ imageBase64, mimeType }) => ({ imageBase64, mimeType })),
          location,
          skillLevel,
        }),
        Promise.all(images.map(img => generateThumbnail(img.imageBase64, img.mimeType))),
      ]);

      const planState: ProjectPlanState = { stage1: s1, stage2: null, stage3: null, completedStages: [1] };
      const assembled = assembleStagedResult(s1, null, null);
      const sessionId = newId();
      const initHistory: ConversationMessage[] = [
        { role: 'user', content: description.trim() || '(photo only)' },
        { role: 'assistant', content: JSON.stringify(s1) },
      ];

      setProjectPlanState(planState);
      setResult(assembled);
      setConversationHistory(initHistory);
      setPhotoCountAtLastSubmit(images.length);
      setFlowState('project_questions');
      setCurrentSessionId(sessionId);
      setCompletionStatus('pending');

      const rawTitle = s1.projectTitle || description.trim() || 'New project';
      const session: DiagnosisSession = {
        id: sessionId,
        title: rawTitle.length > 50 ? rawTitle.slice(0, 47) + '…' : rawTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        description: description.trim(),
        imageThumbnails: thumbnails.filter(Boolean),
        conversationHistory: initHistory,
        result: assembled,
        status: assembled.status,
        mode: 'project_planning',
        projectCategory: s1.projectCategory,
        skillLevel,
        estimatedDIYCost: null,
        estimatedProCostMidpoint: null,
        estimatedSavings: null,
        completionStatus: 'pending',
        tradeType: 'general',
        projectPlanState: planState,
      };
      storage.saveSession(session);
      setSessions(storage.getSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoadingStage(null);
      setLoading(false);
    }
  }

  async function handleProjectStages23(userAnswers: string) {
    if (!projectPlanState?.stage1) return;
    const s1 = projectPlanState.stage1;
    try {
      setLoadingStage(2);
      const s2 = await projectStage2({ stage1: s1, userAnswers, skillLevel });

      setProjectPlanState(prev =>
        prev ? { ...prev, stage2: s2, completedStages: [1, 2] } : null
      );

      setLoadingStage(3);
      let s3: ProjectStage3Result | null = null;
      try {
        s3 = await projectStage3({ stage1: s1, stage2: s2, skillLevel });
      } catch (err3) {
        console.warn('[stage3] failed, showing partial result:', err3);
      }

      const finalPlanState: ProjectPlanState = {
        stage1: s1, stage2: s2, stage3: s3,
        completedStages: s3 ? [1, 2, 3] : [1, 2],
      };
      const assembled = assembleStagedResult(s1, s2, s3);
      const updatedHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: userAnswers },
        { role: 'assistant', content: JSON.stringify({ s2, s3 }) },
      ];

      setProjectPlanState(finalPlanState);
      setResult(assembled);
      setConversationHistory(updatedHistory);
      setFlowState('planning_complete');

      if (currentSessionId) {
        const existing = storage.getSession(currentSessionId);
        if (existing) {
          storage.saveSession({
            ...existing,
            updatedAt: new Date().toISOString(),
            conversationHistory: updatedHistory,
            result: assembled,
            status: assembled.status,
            estimatedDIYCost: s2.estimatedDIYCost,
            estimatedProCostMidpoint: getProCostMidpoint(assembled),
            estimatedSavings: calculateSavings(assembled),
            projectPlanState: finalPlanState,
          });
          setSessions(storage.getSessions());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculating materials failed. Please try again.');
    } finally {
      setLoadingStage(null);
      setLoading(false);
    }
  }

  async function handleDiagnose() {
    if (!canDiagnose) return;
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setLoading(true);
    setError(null);

    if (description.trim().length >= 5 && isProjectRequest(description)) {
      await handleProjectFlow();
    } else {
      await handleRepairFlow();
    }
  }

  async function handleFollowUp() {
    if (!canFollowUp) return;
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setLoading(true);
    setError(null);

    if (flowState === 'project_questions') {
      const userAnswers = followUpText.trim()
        || 'No additional measurements or answers provided — please estimate based on a typical UK room.';
      setFollowUpText('');
      setCurrentStepContext(null);
      await handleProjectStages23(userAnswers);
      return;
    }

    try {
      const parts: string[] = [];
      if (currentStepContext) {
        parts.push(`[Asking about Step ${currentStepContext.stepNumber}: ${currentStepContext.title}]`);
      }
      if (followUpText.trim()) parts.push(followUpText.trim());
      const userMessageText = parts.join('\n') || '(additional photos)';

      const res = await diagnoseIssue({
        description: userMessageText,
        images: images.slice(0, 3).map(({ imageBase64, mimeType }) => ({ imageBase64, mimeType })),
        conversationHistory,
        location,
        skillLevel,
      });

      const updatedHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: userMessageText },
        { role: 'assistant', content: JSON.stringify(res) },
      ];

      setConversationHistory(updatedHistory);
      setResult(res);
      setFollowUpText('');
      setCurrentStepContext(null);
      setPhotoCountAtLastSubmit(images.length);
      setFlowState(statusToFlow(res.status));

      if (currentSessionId) {
        const existing = storage.getSession(currentSessionId);
        if (existing) {
          storage.saveSession({
            ...existing,
            updatedAt: new Date().toISOString(),
            conversationHistory: updatedHistory,
            result: res,
            status: res.status,
            mode: res.mode,
            projectCategory: res.projectCategory,
            estimatedDIYCost: res.estimatedDIYCost,
            estimatedProCostMidpoint: getProCostMidpoint(res),
            estimatedSavings: calculateSavings(res),
            tradeType: res.tradeType,
          });
          setSessions(storage.getSessions());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canDiagnose = (images.length > 0 || description.trim().length >= 5) && !loading;
  const canFollowUp = (
    followUpText.trim().length > 0 ||
    images.length > photoCountAtLastSubmit ||
    !!currentStepContext
  ) && !loading;
  const isResultView = flowState !== 'input';
  const isProjectMode = result?.mode === 'project_planning';
  const showBasket = result && (
    (flowState === 'ready_for_repair' && result.productSuggestions.length > 0) ||
    (flowState === 'planning_complete' && result.shoppingList.length > 0)
  );
  const hasDIYContent = sessions.some(s =>
    s.status === 'ready_for_repair' || s.status === 'planning_complete' || s.completionStatus === 'completed_diy'
  );

  const loadingStageMessage = loadingStage === 1
    ? 'Analysing your project…'
    : loadingStage === 2
    ? 'Calculating materials and costs…'
    : loadingStage === 3
    ? 'Building your shopping list…'
    : isProjectMode
    ? 'Planning your project… just a moment'
    : 'Working through this… just a second';

  const followUpTitle = flowState === 'needs_measurements'
    ? 'Provide your measurements'
    : flowState === 'project_questions'
    ? 'Quick questions before I plan'
    : flowState === 'needs_more_info'
    ? 'A few more details…'
    : 'Need help as you go?';

  const followUpIsInfo =
    flowState === 'needs_more_info' ||
    flowState === 'needs_measurements' ||
    flowState === 'project_questions';

  const followUpPlaceholder = currentStepContext
    ? `Ask about step ${currentStepContext.stepNumber}…`
    : flowState === 'needs_measurements'
    ? 'Type your measurements here, e.g. "room is 3.5m × 2.8m, tiles are 600×300mm, straight lay"…'
    : flowState === 'project_questions'
    ? 'Type your measurements and answers here, then click Continue…'
    : flowState === 'needs_more_info'
    ? 'Type your answers here…'
    : 'Ask a question, add an update, or describe what you see…';

  return (
    <div className="app-shell">
      <HistorySidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        totalSavings={totalSavings}
        isOpen={sidebarOpen}
        onSelectSession={(s) => { loadSession(s); setSidebarOpen(false); }}
        onNewSession={() => { startNewSession(); setSidebarOpen(false); }}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        <header className="mobile-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="mobile-brand">DI-MY</div>
          <div style={{ width: 40 }} />
        </header>

        <main className="container">
          <div ref={topRef} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* ── Input view ── */}
          {flowState === 'input' && (
            <>
              {images.length === 0 ? (
                <div
                  className={`upload-zone${dragging ? ' dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  aria-label="Upload photos"
                >
                  <div className="upload-placeholder">
                    <Camera size={44} color="#FF6B35" />
                    <div className="upload-placeholder-title">Add photos</div>
                    <div className="upload-placeholder-sub">Click to browse · drag &amp; drop · multiple OK</div>
                    <span className="upload-optional">Works for repairs and projects — add photos, describe it, or both.</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`photo-grid${dragging ? ' dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  {images.map(img => (
                    <div key={img.id} className="photo-thumb-wrap">
                      <img src={img.preview} alt="Uploaded" className="photo-thumb" />
                      <button
                        className="photo-remove-btn"
                        onClick={() => removeImage(img.id)}
                        aria-label="Remove photo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="photo-add-tile"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Add more photos"
                  >
                    <ImagePlus size={22} color="#FF6B35" />
                    <span>Add</span>
                  </button>
                </div>
              )}

              {images.length > 0 && (
                <p className="photo-limit-note">We'll analyse up to 3 photos at a time.</p>
              )}

              <div className="location-row">
                {locationStatus === 'idle' && (
                  <button className="location-btn" onClick={handleGetLocation}>
                    <MapPin size={14} /> Use my location
                  </button>
                )}
                {locationStatus === 'loading' && (
                  <span className="location-status"><span className="spinner-sm" /> Locating…</span>
                )}
                {locationStatus === 'granted' && (
                  <span className="location-status location-granted">
                    <MapPin size={13} /> Location enabled — pro search will be near you
                  </span>
                )}
                {locationStatus === 'denied' && (
                  <span className="location-status location-denied">Location access denied</span>
                )}
              </div>

              <div className="input-section">
                <label className="input-label" htmlFor="description">What do you need help with?</label>
                <textarea
                  id="description"
                  className="textarea"
                  placeholder="e.g. My tap is dripping / I want to tile my bathroom floor / Planning to paint my living room…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <div className="char-count">{description.length}/500</div>
              </div>

              <div className="skill-level-row">
                <span className="skill-level-label">Your DIY experience:</span>
                <div className="skill-level-chips">
                  {([
                    { value: 'beginner' as SkillLevel, label: 'Beginner' },
                    { value: 'intermediate' as SkillLevel, label: 'Fairly handy' },
                    { value: 'experienced' as SkillLevel, label: 'Experienced' },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`skill-chip${skillLevel === value ? ' active' : ''}`}
                      onClick={() => setSkillLevel(prev => prev === value ? null : value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="diagnose-btn" onClick={handleDiagnose} disabled={!canDiagnose}>
                {loading
                  ? <span className="spinner" />
                  : <><Wrench size={20} /> Get started</>
                }
              </button>

              {loading && loadingStage !== null && (
                <ProjectProgress completedStages={[]} currentStage={loadingStage} />
              )}

              {loading && (
                <p className="loading-text">{loadingStageMessage}</p>
              )}

              {error && (
                <div className="error-box">
                  <AlertCircle size={18} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span className="error-text">{error}</span>
                </div>
              )}

              {hasDIYContent && <SavingsDashboard sessions={sessions} />}
            </>
          )}

          {/* ── Result view ── */}
          {isResultView && result && (
            <>
              {loading && (
                <>
                  <div className="loading-banner">
                    <span className="spinner-sm loading-banner-spinner" />
                    {loadingStageMessage}
                  </div>
                  {loadingStage !== null && (
                    <ProjectProgress
                      completedStages={projectPlanState?.completedStages ?? []}
                      currentStage={loadingStage}
                    />
                  )}
                </>
              )}

              {images.length > 0 && (
                <div className="photo-strip">
                  {images.map(img => (
                    <img key={img.id} src={img.preview} alt="Uploaded" className="photo-strip-thumb" />
                  ))}
                </div>
              )}

              <div className="results">
                {isProjectMode ? (
                  <ProjectPlanCards
                    result={result}
                    location={location}
                    onAskAboutStep={handleAskAboutStep}
                  />
                ) : (
                  <DiagnosisCards
                    result={result}
                    location={location}
                    onAskAboutStep={handleAskAboutStep}
                  />
                )}

                {showBasket && <BasketPanel result={result} />}

                {(flowState === 'ready_for_repair' || flowState === 'planning_complete') && (
                  <CompletionPrompt
                    completionStatus={completionStatus}
                    estimatedSavings={currentSession?.estimatedSavings ?? null}
                    isProject={isProjectMode}
                    onComplete={handleCompletion}
                  />
                )}

                {/* ── Follow-up card ── */}
                <div
                  ref={followUpRef}
                  className={`card follow-up-card${!followUpIsInfo ? ' follow-up-card-ongoing' : ''}`}
                >
                  <div className="card-header">
                    {flowState === 'needs_measurements'
                      ? <Ruler size={20} color="#2980b9" />
                      : <MessageSquare size={20} color="#FF6B35" />
                    }
                    <span className="card-title" style={flowState === 'needs_measurements' ? { color: '#2980b9' } : undefined}>
                      {followUpTitle}
                    </span>
                  </div>

                  {(flowState === 'needs_more_info' || flowState === 'project_questions') && result.followUpQuestions.length > 0 && (
                    <div className="follow-up-questions">
                      {result.followUpQuestions.map((q, i) => (
                        <div key={i} className="follow-up-question">
                          <span className="follow-up-q-num">{i + 1}</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {flowState === 'needs_measurements' && result.measurementsNeeded.length > 0 && (
                    <div className="follow-up-questions">
                      {result.measurementsNeeded.map((q, i) => (
                        <div key={i} className="follow-up-question">
                          <span className="follow-up-q-num" style={{ background: '#2980b9' }}>{i + 1}</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {flowState === 'needs_more_info' && result.requestedPhotos.length > 0 && (
                    <div className="follow-up-photos-requested">
                      <div className="follow-up-photos-label">Helpful photos to add:</div>
                      {result.requestedPhotos.map((p, i) => (
                        <div key={i} className="list-item">
                          <span className="list-bullet">📷</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!followUpIsInfo && (
                    <p className="ongoing-help-hint">
                      {isProjectMode
                        ? 'Add updates, photos, or ask about any step as you go.'
                        : "Add a quick update or photo at any point and I'll help you check the next step."}
                    </p>
                  )}

                  {result.photoHelpRequested && result.photoHelpPrompt && (
                    <div className="photo-help-prompt">
                      <span className="photo-help-icon">📸</span>
                      <span>{result.photoHelpPrompt}</span>
                    </div>
                  )}

                  {currentStepContext && (
                    <div className="step-context-pill">
                      <span>
                        Step {currentStepContext.stepNumber}: <strong>{currentStepContext.title}</strong>
                      </span>
                      <button
                        className="step-context-clear"
                        onClick={() => setCurrentStepContext(null)}
                        aria-label="Clear step context"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <textarea
                    className="textarea follow-up-textarea"
                    placeholder={followUpPlaceholder}
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    rows={3}
                    maxLength={600}
                  />

                  <div className="follow-up-actions">
                    <button
                      className="add-photo-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus size={15} />
                      Add photo
                      {images.length > photoCountAtLastSubmit && (
                        <span className="new-photo-badge">+{images.length - photoCountAtLastSubmit}</span>
                      )}
                    </button>
                    <button
                      className="send-btn"
                      onClick={handleFollowUp}
                      disabled={!canFollowUp}
                    >
                      {loading
                        ? <span className="spinner spinner-sm-white" />
                        : flowState === 'project_questions'
                        ? <><ArrowRight size={15} /> Continue</>
                        : <><Send size={15} /> Send</>
                      }
                    </button>
                  </div>

                  {error && (
                    <div className="error-box" style={{ marginTop: 12 }}>
                      <AlertCircle size={18} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span className="error-text">{error}</span>
                    </div>
                  )}
                </div>

                <button className="reset-btn" onClick={startNewSession}>
                  <Plus size={18} /> New {isProjectMode ? 'Project' : 'Diagnosis'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
