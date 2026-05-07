export interface ProductSuggestion {
  name: string;
  description: string;
  estimatedPrice: string;
  searchQuery: string;
}

export interface DiagnoseResponse {
  likelyIssue: string;
  confidence: 'low' | 'medium' | 'high';
  safetyWarnings: string[];
  callProfessional: boolean;
  callProfessionalReason?: string;
  toolsNeeded: string[];
  partsNeeded: string[];
  repairSteps: string[];
  productSuggestions: ProductSuggestion[];
}

export interface ApiError {
  error: string;
}
