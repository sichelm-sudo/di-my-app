import Anthropic from '@anthropic-ai/sdk';
import {
  ProjectStage1Request, ProjectStage1Result,
  ProjectStage2Request, ProjectStage2Result,
  ProjectStage3Request, ProjectStage3Result,
  ProjectCategory, AppMode, SkillLevel,
  MaterialCalculation, ShoppingListItem, RepairStep, ProCostEstimate, ProductRetailer,
} from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Shared parse helpers ──────────────────────────────────────────────────────

type RawJSON = Record<string, unknown>;

function tryParse(text: string): RawJSON | null {
  const c = text.replace(/^﻿/, '').trim();
  try { return JSON.parse(c) as RawJSON; } catch { /* fall through */ }
  const fence = c.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) { try { return JSON.parse(fence[1].trim()) as RawJSON; } catch { /* fall through */ } }
  const a = c.indexOf('{'); const b = c.lastIndexOf('}');
  if (a !== -1 && b > a) { try { return JSON.parse(c.slice(a, b + 1)) as RawJSON; } catch { /* fall through */ } }
  return null;
}

async function callClaude(system: string, userMessage: string, maxTokens: number): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude API');
  return block.text.trim();
}

const VALID_ITEM_PRIS = ['essential', 'recommended', 'optional'] as const;

function buildProjectRetailers(searchQuery: string, category: string): ProductRetailer[] {
  const q = encodeURIComponent(searchQuery);
  const cat = (category || '').toLowerCase();
  const bq: ProductRetailer = { name: 'B&Q', url: `https://www.diy.com/search?term=${q}` };
  const wickes: ProductRetailer = { name: 'Wickes', url: `https://www.wickes.co.uk/search?text=${q}` };
  const screwfix: ProductRetailer = { name: 'Screwfix', url: `https://www.screwfix.com/search?search=${q}` };
  const toolstation: ProductRetailer = { name: 'Toolstation', url: `https://www.toolstation.com/search?q=${q}` };
  const toppsTiles: ProductRetailer = { name: 'Topps Tiles', url: `https://www.toppstiles.co.uk/search?q=${q}` };
  const tileGiant: ProductRetailer = { name: 'Tile Giant', url: `https://www.tilegiant.co.uk/search?q=${q}` };
  const carpetright: ProductRetailer = { name: 'Carpetright', url: `https://www.carpetright.co.uk/search?q=${q}` };
  if (/tile|grout|adhesive|ceramic|porcelain/.test(cat)) return [toppsTiles, tileGiant, bq, wickes];
  if (/floor|laminate|vinyl|lvt|underlay|carpet|wood/.test(cat)) return [carpetright, bq, wickes];
  if (/paint|primer|emulsion|gloss|satinwood|decorat/.test(cat)) return [bq, wickes];
  if (/tool|equipment|fixing|drill|screw/.test(cat)) return [screwfix, toolstation, bq];
  if (/wallpaper|paste|lining/.test(cat)) return [bq, wickes];
  return [bq, wickes, screwfix, toolstation];
}

function normMaterial(raw: unknown): MaterialCalculation {
  const o = (typeof raw === 'object' && raw !== null) ? raw as RawJSON : {};
  return {
    name: typeof o.name === 'string' ? o.name : '',
    category: typeof o.category === 'string' ? o.category : 'primary_material',
    quantity: typeof o.quantity === 'number' ? o.quantity : 0,
    unit: typeof o.unit === 'string' ? o.unit : '',
    baseArea: typeof o.baseArea === 'string' && o.baseArea ? o.baseArea : null,
    wastagePercent: typeof o.wastagePercent === 'number' ? o.wastagePercent : 10,
    coveragePerUnit: typeof o.coveragePerUnit === 'string' && o.coveragePerUnit ? o.coveragePerUnit : null,
    estimatedUnitCost: typeof o.estimatedUnitCost === 'number' ? o.estimatedUnitCost : null,
    estimatedTotalCost: typeof o.estimatedTotalCost === 'number' ? o.estimatedTotalCost : null,
    notes: typeof o.notes === 'string' && o.notes ? o.notes : null,
    priority: VALID_ITEM_PRIS.includes(o.priority as typeof VALID_ITEM_PRIS[number])
      ? (o.priority as typeof VALID_ITEM_PRIS[number]) : 'essential',
  };
}

function normShoppingItem(raw: unknown): ShoppingListItem {
  const o = (typeof raw === 'object' && raw !== null) ? raw as RawJSON : {};
  const cat = typeof o.category === 'string' ? o.category : '';
  const q = typeof o.searchQuery === 'string' ? o.searchQuery : '';
  return {
    category: cat,
    item: typeof o.item === 'string' ? o.item : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    estimatedCost: typeof o.estimatedCost === 'string' ? o.estimatedCost : '',
    priority: VALID_ITEM_PRIS.includes(o.priority as typeof VALID_ITEM_PRIS[number])
      ? (o.priority as typeof VALID_ITEM_PRIS[number]) : 'essential',
    retailerLinks: buildProjectRetailers(q, cat),
    notes: typeof o.notes === 'string' && o.notes ? o.notes : null,
    searchQuery: q,
  };
}

function normStep(s: unknown, idx: number): RepairStep {
  if (typeof s !== 'object' || s === null) {
    return { stepNumber: idx + 1, title: `Step ${idx + 1}`, summary: '', detail: '', whyItMatters: '', commonMistakes: [], safetyNote: '', toolsNeeded: [], partsNeeded: [], stopIf: '' };
  }
  const o = s as RawJSON;
  return {
    stepNumber: typeof o.stepNumber === 'number' ? o.stepNumber : idx + 1,
    title: typeof o.title === 'string' ? o.title : `Step ${idx + 1}`,
    summary: typeof o.summary === 'string' ? o.summary : '',
    detail: typeof o.detail === 'string' ? o.detail : '',
    whyItMatters: typeof o.whyItMatters === 'string' ? o.whyItMatters : '',
    commonMistakes: Array.isArray(o.commonMistakes) ? o.commonMistakes.map(String) : [],
    safetyNote: typeof o.safetyNote === 'string' ? o.safetyNote : '',
    toolsNeeded: Array.isArray(o.toolsNeeded) ? o.toolsNeeded.map(String) : [],
    partsNeeded: Array.isArray(o.partsNeeded) ? o.partsNeeded.map(String) : [],
    stopIf: typeof o.stopIf === 'string' ? o.stopIf : '',
  };
}

function normProCost(raw: unknown): ProCostEstimate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as RawJSON;
  return {
    tradeType: typeof o.tradeType === 'string' ? o.tradeType : '',
    likelyCostRange: typeof o.likelyCostRange === 'string' ? o.likelyCostRange : '',
    calloutFeeRange: typeof o.calloutFeeRange === 'string' ? o.calloutFeeRange : '',
    typicalTime: typeof o.typicalTime === 'string' ? o.typicalTime : '',
    costNotes: Array.isArray(o.costNotes) ? o.costNotes.map(String) : [],
    redFlags: Array.isArray(o.redFlags) ? o.redFlags.map(String) : [],
  };
}

// ── Stage 1: Project Understanding ───────────────────────────────────────────

const STAGE1_SYSTEM = `You are DI-MY, a UK DIY assistant.

TASK: Classify the user's request and ask targeted measurement questions.

MODE — set mode to exactly one of:
"repair_diagnosis" — something is BROKEN, DAMAGED or MALFUNCTIONING
"project_planning" — user wants to IMPROVE, BUILD, INSTALL or REDECORATE

PROJECT CATEGORIES (if project_planning — pick one):
painting_decorating | wallpapering | flooring | tiling | plastering | shelving_mounting | garden | furniture_assembly | carpentry | kitchen_refresh | bathroom_refresh

PHOTOS: If images provided, identify tile dimensions, surface condition, approximate room size, or material types. Add findings to detectedItems.

QUESTIONS: Ask 2–3 targeted questions to gather measurements for calculations:
- tiling/flooring: room dimensions (L×W) + tile/plank size + pattern (straight or diagonal)
- painting/decorating: room perimeter + ceiling height + door and window count
- wallpapering: room perimeter + ceiling height + pattern repeat if known
- plastering: surface area + type of coat needed
Set canProceed: true only if you already have ALL measurements needed. Otherwise false.

UK English only. introMessage must NOT start with "I".

Return ONLY raw JSON starting with {:
{"mode":"project_planning","projectCategory":"tiling","projectTitle":"Bathroom Floor Tiling","introMessage":"...","confidence":"high","detectedItems":[],"clarifyingQuestions":["What are the floor dimensions (length × width)?","What tile size are you planning to use?"],"safetyWarnings":[],"canProceed":false}`;

const VALID_CATS: ProjectCategory[] = ['painting_decorating','wallpapering','flooring','tiling','plastering','shelving_mounting','garden','furniture_assembly','carpentry','kitchen_refresh','bathroom_refresh'];
const VALID_MODES: AppMode[] = ['repair_diagnosis','project_planning'];
const VALID_CONF = ['low','medium','high'] as const;

export async function runStage1(req: ProjectStage1Request): Promise<ProjectStage1Result> {
  const imageBlocks: Anthropic.ImageBlockParam[] = (req.images ?? []).map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: (['image/jpeg','image/png','image/gif','image/webp'].includes(img.mimeType)
        ? img.mimeType : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: img.imageBase64,
    },
  }));

  const textParts: string[] = [];
  if (req.images?.length) textParts.push(`${req.images.length} photo(s) provided.`);
  if (req.description) textParts.push(`Description: "${req.description}"`);
  if (req.skillLevel) textParts.push(`Skill level: ${req.skillLevel}`);
  textParts.push('Return ONLY raw JSON.');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: STAGE1_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: textParts.join('\n') },
      ],
    }],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude API');

  const raw = tryParse(block.text.trim());
  if (!raw) {
    console.error('[stage1] Parse failed:', block.text.slice(0, 200));
    return {
      mode: 'project_planning',
      projectCategory: null,
      projectTitle: req.description || 'Home improvement project',
      introMessage: "Happy to help! I just need a few more details to get started.",
      confidence: 'low',
      detectedItems: [],
      clarifyingQuestions: [
        'What room or area is this project in?',
        'What are the approximate dimensions of the area?',
        'What materials or products are you planning to use?',
      ],
      safetyWarnings: [],
      canProceed: false,
    };
  }

  return {
    mode: VALID_MODES.includes(raw.mode as AppMode) ? (raw.mode as AppMode) : 'project_planning',
    projectCategory: VALID_CATS.includes(raw.projectCategory as ProjectCategory) ? (raw.projectCategory as ProjectCategory) : null,
    projectTitle: typeof raw.projectTitle === 'string' && raw.projectTitle ? raw.projectTitle : (req.description || 'Home improvement project'),
    introMessage: typeof raw.introMessage === 'string' ? raw.introMessage : '',
    confidence: VALID_CONF.includes(raw.confidence as typeof VALID_CONF[number]) ? (raw.confidence as typeof VALID_CONF[number]) : 'medium',
    detectedItems: Array.isArray(raw.detectedItems) ? raw.detectedItems.map(String) : [],
    clarifyingQuestions: Array.isArray(raw.clarifyingQuestions) ? raw.clarifyingQuestions.map(String) : [],
    safetyWarnings: Array.isArray(raw.safetyWarnings) ? raw.safetyWarnings.map(String) : [],
    canProceed: !!raw.canProceed,
  };
}

// ── Stage 2: Scope & Calculations ────────────────────────────────────────────

const STAGE2_SYSTEM = `You are DI-MY, a UK DIY assistant. Calculate exact material quantities and costs.

FORMULAS (use precisely):
PAINT: wall_area=(perimeter×height)-(doors×1.9)-(windows×1.2). litres=ceil((area×2)/12)×1.1. Round tins up to 1L/2.5L/5L.
TILES: wastage 10% straight, 15% diagonal, 20% complex. boxes=ceil(area×(1+waste/100)/coverage). Adhesive 1×20kg/8m². Grout 1×3kg/5m².
WALLPAPER: drop=height+0.15m. drops_per_roll=floor(10/drop). rolls=ceil(perimeter/0.53/drops_per_roll)+1.
FLOORING: ×1.10 straight, ×1.15 diagonal. Underlay area×1.05.
PLASTERING: 1×25kg MultiFinish=9m² at 3mm. Two-coat: bonding 1×25kg/6m², finish 1×25kg/9m².

UK PRICES: Paint £20–35/5L. Tiles £10–45/m². Flooring £8–40/m². Wallpaper £15–40/roll. Adhesive £8–12/20kg. Grout £6–10/3kg. Underlay £3–8/m².
PRO RATES: Painter £250–500/day. Tiler £30–55/m² supply+fit. Floorer £10–25/m². Plasterer £200–400/day.

Return ONLY raw JSON starting with {:
{"introMessage":"...","materials":[{"name":"Porcelain tiles 600×300mm","category":"primary_material","quantity":14,"unit":"boxes","baseArea":"7.2m²","wastagePercent":10,"coveragePerUnit":"0.54m²","estimatedUnitCost":35,"estimatedTotalCost":490,"notes":null,"priority":"essential"}],"estimatedDIYCost":185,"estimatedProCost":{"tradeType":"tiler","likelyCostRange":"£500–£750","calloutFeeRange":"n/a","typicalTime":"1–2 days","costNotes":[],"redFlags":[]},"estimatedDifficultyScore":3,"estimatedTime":"1–2 days","calculationNotes":"Based on 7.2m² floor, 10% wastage"}`;

export async function runStage2(req: ProjectStage2Request): Promise<ProjectStage2Result> {
  const { stage1, userAnswers, skillLevel } = req;

  const userMessage = [
    `PROJECT: ${stage1.projectTitle}`,
    `CATEGORY: ${stage1.projectCategory || 'unknown'}`,
    `SKILL LEVEL: ${skillLevel || 'intermediate'}`,
    stage1.detectedItems.length > 0 ? `DETECTED FROM PHOTOS: ${stage1.detectedItems.join(', ')}` : '',
    '',
    'USER MEASUREMENTS:',
    userAnswers || '(no measurements provided — estimate based on a typical UK room for this project type)',
    '',
    'Calculate all material quantities and costs. Return JSON.',
  ].filter(l => l !== undefined).join('\n');

  const raw = tryParse(await callClaude(STAGE2_SYSTEM, userMessage, 2000));

  if (!raw) throw new Error('Could not calculate materials — please check your measurements and try again.');

  return {
    introMessage: typeof raw.introMessage === 'string' ? raw.introMessage : '',
    materials: Array.isArray(raw.materials) ? raw.materials.map(normMaterial) : [],
    estimatedDIYCost: typeof raw.estimatedDIYCost === 'number' ? Math.round(raw.estimatedDIYCost) : null,
    estimatedProCost: normProCost(raw.estimatedProCost),
    estimatedDifficultyScore: typeof raw.estimatedDifficultyScore === 'number'
      ? Math.min(5, Math.max(1, Math.round(raw.estimatedDifficultyScore))) : null,
    estimatedTime: typeof raw.estimatedTime === 'string' ? raw.estimatedTime : null,
    calculationNotes: typeof raw.calculationNotes === 'string' ? raw.calculationNotes : '',
  };
}

// ── Stage 3: Shopping & Guidance ─────────────────────────────────────────────

const STAGE3_SYSTEM = `You are DI-MY, a UK DIY assistant. Generate the complete shopping list and project guide.

SKILL CALIBRATION:
beginner: explain every step, name all tools, warn about common mistakes
intermediate: standard detail, assume basic tool knowledge
experienced: concise steps, include pro-level techniques

SHOPPING LIST: Cover all materials from scope PLUS tools. UK product names and search terms. No retailerLinks field (generated server-side from searchQuery).
TOOLS: Include in shopping list with category "Tools & Equipment". Note hireable items: add "(or hire)" to notes.
STEPS: 6–12 sequential steps specific to this project type. Be practical and precise.
PRO TIPS: 3–5 practical tips for the stated skill level.

Return ONLY raw JSON starting with {:
{"introMessage":"...","shoppingList":[{"category":"Floor Tiles","item":"Porcelain tiles 600×300mm","quantity":"14 boxes","estimatedCost":"£350–£490","priority":"essential","notes":null,"searchQuery":"porcelain floor tiles 600x300mm"}],"steps":[{"stepNumber":1,"title":"...","summary":"...","detail":"...","whyItMatters":"...","commonMistakes":[],"safetyNote":"","toolsNeeded":[],"partsNeeded":[],"stopIf":""}],"proTips":[]}`;

export async function runStage3(req: ProjectStage3Request): Promise<ProjectStage3Result> {
  const { stage1, stage2, skillLevel } = req;

  const materialsSummary = stage2.materials.length > 0
    ? stage2.materials.map(m => `- ${m.name}: ${m.quantity} ${m.unit}`).join('\n')
    : '(no specific materials calculated)';

  const userMessage = [
    `PROJECT: ${stage1.projectTitle} (${stage1.projectCategory || 'general'})`,
    `SKILL LEVEL: ${skillLevel || 'intermediate'}`,
    `ESTIMATED TIME: ${stage2.estimatedTime || 'unknown'}`,
    `DIFFICULTY: ${stage2.estimatedDifficultyScore || 'moderate'}/5`,
    '',
    'MATERIALS FROM STAGE 2:',
    materialsSummary,
    '',
    `DIY COST: ~£${stage2.estimatedDIYCost ?? 'unknown'}`,
    stage2.calculationNotes ? `NOTES: ${stage2.calculationNotes}` : '',
    '',
    'Generate complete shoppingList (including tools), steps, and proTips. Return JSON.',
  ].filter(Boolean).join('\n');

  const raw = tryParse(await callClaude(STAGE3_SYSTEM, userMessage, 4096));

  if (!raw) {
    console.error('[stage3] Parse failed — returning partial result');
    return { introMessage: '', shoppingList: [], steps: [], proTips: [] };
  }

  return {
    introMessage: typeof raw.introMessage === 'string' ? raw.introMessage : '',
    shoppingList: Array.isArray(raw.shoppingList) ? raw.shoppingList.map(normShoppingItem) : [],
    steps: Array.isArray(raw.steps) ? raw.steps.map(normStep) : [],
    proTips: Array.isArray(raw.proTips) ? raw.proTips.map(String) : [],
  };
}
