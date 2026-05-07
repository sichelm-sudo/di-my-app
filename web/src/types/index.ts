export interface ProductRetailer {
  name: string;
  url: string;
}

export type ProductCategory = 'tool' | 'part' | 'safety' | 'cleaning';
export type ProductPriority = 'essential' | 'useful' | 'optional';

export interface ProductSuggestion {
  category: ProductCategory;
  name: string;
  whyNeeded: string;
  priority: ProductPriority;
  estimatedPrice: string;
  searchQuery: string;
  retailers: ProductRetailer[];
}

export type TradeType = 'plumber' | 'electrician' | 'joiner' | 'builder' | 'roofer' | 'general';
export type DiagnosisStatus =
  | 'needs_more_info' | 'ready_for_repair' | 'call_professional'
  | 'needs_measurements' | 'planning_complete';

export type AppMode = 'repair_diagnosis' | 'project_planning';
export type ProjectCategory =
  | 'painting_decorating' | 'wallpapering' | 'flooring' | 'tiling'
  | 'plastering' | 'shelving_mounting' | 'garden' | 'furniture_assembly'
  | 'carpentry' | 'kitchen_refresh' | 'bathroom_refresh';
export type SkillLevel = 'beginner' | 'intermediate' | 'experienced';

export interface MaterialCalculation {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  baseArea: string | null;
  wastagePercent: number;
  coveragePerUnit: string | null;
  estimatedUnitCost: number | null;
  estimatedTotalCost: number | null;
  notes: string | null;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface ShoppingListItem {
  category: string;
  item: string;
  quantity: string;
  estimatedCost: string;
  priority: 'essential' | 'recommended' | 'optional';
  retailerLinks: ProductRetailer[];
  notes: string | null;
  searchQuery: string;
}

export interface DiagnoseImage {
  imageBase64: string;
  mimeType: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiagnoseRequest {
  description?: string | null;
  images: DiagnoseImage[];
  conversationHistory: ConversationMessage[];
  location?: { lat: number; lng: number } | null;
  skillLevel?: SkillLevel | null;
}

export interface RepairStep {
  stepNumber: number;
  title: string;
  summary: string;
  detail: string;
  whyItMatters: string;
  commonMistakes: string[];
  safetyNote: string;
  toolsNeeded: string[];
  partsNeeded: string[];
  stopIf: string;
}

export interface ProCostEstimate {
  tradeType: string;
  likelyCostRange: string;
  calloutFeeRange: string;
  typicalTime: string;
  costNotes: string[];
  redFlags: string[];
}

export interface DiagnoseResponse {
  status: DiagnosisStatus;
  introMessage: string;
  confidence: 'low' | 'medium' | 'high';
  likelyIssue: string;
  reasoning: string;
  confidenceThresholdExplanation: string;
  followUpQuestions: string[];
  requestedPhotos: string[];
  safetyWarnings: string[];
  estimatedDifficultyScore: number | null;
  estimatedTime: string | null;
  callProfessionalRecommended: boolean;
  callProfessionalReason: string | null;
  firstStep: string | null;
  toolsNeeded: string[];
  partsNeeded: string[];
  repairSteps: RepairStep[];
  productSuggestions: ProductSuggestion[];
  tradeType: TradeType;
  photoHelpRequested: boolean;
  photoHelpPrompt: string;
  identificationResult: string | null;
  identificationConfidence: 'low' | 'medium' | 'high' | null;
  estimatedProCost: ProCostEstimate | null;
  estimatedDIYCost: number | null;
  // Project planning fields
  mode: AppMode;
  projectCategory: ProjectCategory | null;
  projectTitle: string | null;
  skillLevel: SkillLevel | null;
  measurementsNeeded: string[];
  materials: MaterialCalculation[];
  shoppingList: ShoppingListItem[];
  proTips: string[];
}

export type CompletionStatus = 'pending' | 'completed_diy' | 'completed_pro' | 'skipped';

export interface ProjectStage1Result {
  mode: AppMode;
  projectCategory: ProjectCategory | null;
  projectTitle: string;
  introMessage: string;
  confidence: 'low' | 'medium' | 'high';
  detectedItems: string[];
  clarifyingQuestions: string[];
  safetyWarnings: string[];
  canProceed: boolean;
}

export interface ProjectStage2Result {
  introMessage: string;
  materials: MaterialCalculation[];
  estimatedDIYCost: number | null;
  estimatedProCost: ProCostEstimate | null;
  estimatedDifficultyScore: number | null;
  estimatedTime: string | null;
  calculationNotes: string;
}

export interface ProjectStage3Result {
  introMessage: string;
  shoppingList: ShoppingListItem[];
  steps: RepairStep[];
  proTips: string[];
}

export interface ProjectPlanState {
  stage1: ProjectStage1Result | null;
  stage2: ProjectStage2Result | null;
  stage3: ProjectStage3Result | null;
  completedStages: number[];
}

export interface ProjectStage1Request {
  description: string;
  images: DiagnoseImage[];
  location?: { lat: number; lng: number } | null;
  skillLevel?: SkillLevel | null;
}

export interface ProjectStage2Request {
  stage1: ProjectStage1Result;
  userAnswers: string;
  skillLevel?: SkillLevel | null;
}

export interface ProjectStage3Request {
  stage1: ProjectStage1Result;
  stage2: ProjectStage2Result;
  skillLevel?: SkillLevel | null;
}

export interface DiagnosisSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  description: string;
  imageThumbnails: string[];
  conversationHistory: ConversationMessage[];
  result: DiagnoseResponse | null;
  status: DiagnosisStatus | null;
  mode: AppMode;
  projectCategory: ProjectCategory | null;
  skillLevel: SkillLevel | null;
  estimatedDIYCost: number | null;
  estimatedProCostMidpoint: number | null;
  estimatedSavings: number | null;
  completionStatus: CompletionStatus;
  tradeType: TradeType | null;
  projectPlanState: ProjectPlanState | null;
}

export interface Coords {
  lat: number;
  lng: number;
}

export type BasketItemPriority = 'essential' | 'recommended' | 'optional';

export interface BasketItem {
  id: string;
  name: string;
  quantity: string;
  estimatedCost: string;
  searchQuery: string;
  category: string;
  priority: BasketItemPriority;
}

export interface ApiError {
  error: string;
}
