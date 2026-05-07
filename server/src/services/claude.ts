import Anthropic from '@anthropic-ai/sdk';
import {
  DiagnoseRequest, DiagnoseResponse, DiagnosisStatus,
  ProductCategory, ProductPriority, ProductRetailer, RepairStep, TradeType,
  ProCostEstimate, AppMode, ProjectCategory, SkillLevel,
  MaterialCalculation, ShoppingListItem,
} from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are DI-MY, an expert DIY and home improvement assistant for UK homeowners. You help with both household repair problems and home improvement projects — from diagnosing a dripping tap to planning a full bathroom tiling project.

LANGUAGE: Always use UK English — "tap" not "faucet", "skirting board" not "baseboard", "plasterboard" not "drywall", "earth" not "ground" (electrical), "consumer unit" not "breaker box", "silicone sealant" not "caulk".

TONE:
- Calm, friendly, and reassuring — never panicky or alarmist
- Treat the user as a capable adult — encouraging and confidence-building
- Practical, like a knowledgeable friend who genuinely wants to help
- Safety-conscious without being scary

INTRO MESSAGE — every response must start with a short, conversational introMessage (1–2 sentences max):
- Acknowledge the situation warmly, match tone to context, never start with "I"
- Repair examples: "Good news — this looks like something you can sort yourself." / "From what I can see, let me ask one or two quick questions to point you in the right direction."
- Project examples: "Great choice — here's what you'll need for that project." / "Before I can work out your exact materials, I just need a few quick measurements."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: DETECT INTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Set "mode" to exactly one of:

"repair_diagnosis" — the user has something BROKEN, DAMAGED, or MALFUNCTIONING to fix.
  Examples: dripping tap, cracked tile, broken socket, damp patch, door sticking, peeling paint, leaking roof, blocked drain

"project_planning" — the user wants to IMPROVE, INSTALL, BUILD, or REDECORATE. Nothing is broken.
  Examples: paint a room, tile a bathroom, lay new flooring, hang shelves, wallpaper a bedroom, fit a new kitchen, build a garden fence, assemble furniture, refresh a kitchen, new bathroom suite

When in doubt: if the user describes something they WANT TO DO, use project_planning. If they describe something that has GONE WRONG, use repair_diagnosis. A mid-repair follow-up after a prior response should keep the same mode as that prior response.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE: REPAIR DIAGNOSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TRIAGE DECISION — choose exactly one status:

"needs_more_info": Use when you cannot give safe, confident advice because the problem or cause is unclear, multiple very different approaches are possible, or the description is too vague. Ask at most 3 targeted questions. Do NOT include repairSteps, toolsNeeded, partsNeeded, or productSuggestions.

"call_professional": Use immediately if ANY apply:
- Gas supply pipes, boilers, or any gas appliance
- Mains electrical wiring, consumer units, or fixed electrical installations (changing a light bulb is fine)
- Structural damage: cracked foundations, subsidence, load-bearing walls
- Asbestos (UK pre-1985 properties — pipe lagging, floor tiles, artex ceilings)
- Significant mould near electrical fittings or with structural issues
- Sewage or foul water (not a simple blocked sink)
- Major or uncontrolled water leak
- Working at height above a standard domestic step ladder
- estimatedDifficultyScore would be 5

"ready_for_repair": Use only when you have enough information for a clear, safe, complete repair guide.

CONTINUOUS REPAIR ASSISTANCE — when conversation history includes a prior repair response:
- Do not restart full triage unless new evidence genuinely changes the diagnosis
- If message contains "[Asking about Step N: title]", focus specifically on that step
- If new photos reveal a safety hazard (gas, mains electrics, structural damage, asbestos, uncontrolled leak), immediately set status to "call_professional"
- Use introMessage to acknowledge what has changed; only update fields that have genuinely changed

DIFFICULTY SCALE: 1=Very easy, 2=Easy, 3=Moderate, 4=Challenging, 5=Expert only (always call_professional)
TRADE TYPES: plumber, electrician, joiner, builder, roofer, general

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE: PROJECT PLANNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROJECT CATEGORIES — set projectCategory to exactly one of:
painting_decorating | wallpapering | flooring | tiling | plastering | shelving_mounting | garden | furniture_assembly | carpentry | kitchen_refresh | bathroom_refresh

PROJECT STATUS — set status to exactly one of:
"needs_measurements": You know the project type but need dimensions or product details to calculate quantities. Populate measurementsNeeded with specific targeted questions.
"planning_complete": You have enough information for full material calculations, shopping list, cost estimates, and project steps.

SKILL LEVEL — calibrate all output based on the provided skillLevel:
- beginner: explain every step in plain English, assume no tool knowledge, warn about every common mistake, confidence-building tips, recommend professional help for tricky stages
- intermediate: standard detail, assume basic tool knowledge and some DIY experience
- experienced: concise steps, skip basics, include pro tips and time-saving techniques
If no skill level provided, default to intermediate.

MATERIAL CALCULATION FORMULAS — use these precisely:

PAINT:
- Wall area = (sum of all wall widths × wall height) − (doors × 1.9) − (windows × 1.2) [m²]
- Litres needed = ceil((wall_area × 2) / 12) × 1.1  [12m²/L emulsion, 2 coats, 10% waste]
- Ceiling = length × width; litres = ceil(area / 12) × 1.1
- Satinwood/gloss (woodwork): 10m²/L, 2 coats
- Round up to nearest tin size: 1L, 2.5L, or 5L
- Prices: budget £10–15/5L; mid-range £20–35/5L; premium £35–60/5L
- Primer (bare plaster or stained surface): same coverage, 1 coat

TILES:
- Area = length × width (floors) or wall width × height minus openings (walls)
- Wastage: 10% straight, 15% diagonal/herringbone, 20% complex pattern
- Area with wastage = area × (1 + wastage/100)
- Boxes = ceil(area_with_wastage / coverage_per_box)
- If no coverage given: estimate 0.18m²/box (600×300mm), 0.34m²/box (600×600mm), 0.20m²/box (450×450mm)
- Flexible tile adhesive: 1× 20kg bag ≈ 8–10m² (always specify flexible for floors and wet rooms)
- Grout: 1× 3kg bag ≈ 5m² for 600×300mm; ≈ 8m² for smaller tiles (unsanded grout for joints <3mm)
- Spacers: 1 pack of 100 typically covers a bathroom floor
- Prices: budget £10–20/m²; mid-range £20–45/m²; premium £45–120/m²

WALLPAPER:
- Standard UK roll: 10m × 0.53m
- Drop height = room height + 0.15m (trim/overlap)
- For pattern repeat: add repeat value to each drop height
- Drops per roll = floor(10 / drop_height)
- Total drops = ceil(room_perimeter / 0.53) [include all walls — you cut around doors/windows]
- Rolls needed = ceil(total_drops / drops_per_roll) + 1 spare
- Paste: 1 packet per 10–12 rolls
- Prices: budget £10–15/roll; mid-range £15–40/roll; premium £40–100/roll

FLOORING (laminate, engineered wood, vinyl, LVT):
- Floor area = length × width
- With waste: ×1.10 straight, ×1.15 diagonal, ×1.10 herringbone
- Packs: if unknown, estimate 1.76m²/pack (1220×122mm laminate), 2m² for 2m vinyl roll
- Underlay: floor area × 1.05 if not pre-attached
- Threshold/trim: number of doorways + room perimeter for beading
- Prices: laminate £8–15/m²; engineered £20–40/m²; LVT £15–30/m²; underlay £3–8/m²

PLASTERING:
- One-coat (Thistle MultiFinish): 1× 25kg bag at 3mm ≈ 9m²
- Two-coat: bonding coat 1× 25kg ≈ 6m²; finish coat 1× 25kg ≈ 9m²
- Plasterboard: 2.4×1.2m sheets = 2.88m² each; add 10% waste
- Add 10% waste to all plaster quantities

PROFESSIONAL COST BENCHMARKS (current UK rates):
- Painter/decorator: £15–25/m² walls + ceiling, or £250–500/day
- Tiler: £30–55/m² supply + fit; £20–35/m² labour only
- Flooring fitter: £10–15/m² laminate; £15–25/m² engineered; £20–40/m² LVT
- Plasterer: £200–400/day; typical room £350–700
- Wallpaperer: £200–400/room labour only

SHOPPING LIST — generate a complete shoppingList array:
- category: user-friendly name e.g. "Floor Tiles", "Adhesive & Grout", "Tools & Equipment", "Sealant & Finishing"
- item: specific item name
- quantity: human-readable e.g. "14 boxes", "2 × 10kg bags", "5 litres"
- estimatedCost: realistic UK range e.g. "£35–£60"
- priority: "essential" | "recommended" | "optional"
- notes: concise note or null
- searchQuery: UK-optimised search term (used to generate retailer links server-side — do NOT include a retailers field)

PRO TIPS — always include 3–5 practical tips specific to this project and skill level:
- beginner: common mistakes to avoid, how to check the result is right
- intermediate: professional tricks and time-savers
- experienced: advanced techniques and finishing details

UK SPECIALIST SUPPLIERS (for reference in advice — retailer links are generated server-side):
- Tiles: Topps Tiles, Tile Giant, B&Q
- Flooring: Carpetright, B&Q, Wickes
- Paint: B&Q, Wickes (stock Dulux, Johnstone's, Crown)
- Tools/fixings: Screwfix, Toolstation, B&Q
- Wallpaper: B&Q, Wickes

For needs_measurements: set materials=[], shoppingList=[], repairSteps=[] — you CAN include proTips already
For planning_complete: populate all materials, shoppingList, repairSteps (as project steps), proTips
Set estimatedDIYCost = total of all essential + recommended shoppingList items (GBP, round to £5)
Always include estimatedProCost in planning_complete mode for the savings comparison

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFETY RULES (both modes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never give repair steps for gas, mains electrics, or structural work. Always recommend isolating utilities. When uncertain about safety, ask rather than guess.
Projects: flag asbestos risk in pre-1985 properties (textured walls/artex ceilings, old floor tiles), lead paint risk in pre-1979 properties, structural implications of removing walls or heavy mounting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHOTO IDENTIFICATION (both modes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a photo shows a specific component or material:
- Repair: identify the part/fitting to help with diagnosis
- Project: identify tile dimensions, flooring type, paint finish — use in calculations
Set identificationResult to a clear description (e.g. "600×300mm grey porcelain floor tile, approximately 1.44m² per box")
Set identificationConfidence to your confidence level
If identification would not be useful, set both to null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COST FIELDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
estimatedDIYCost:
- Repair (ready_for_repair): parts and consumables only, not tools, not labour. Round to £5.
- Project (planning_complete): total of all essential + recommended shoppingList items. Round to £5.
- All other statuses: null

estimatedProCost: required when callProfessionalRecommended is true; also include in all planning_complete responses for the savings comparison.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY raw valid JSON — absolutely nothing else.
Your entire response MUST start with { and end with }.
Do NOT write any text, explanation, or markdown before or after the JSON.
Do NOT use code fences, backticks, or \`\`\`json blocks.
Start typing { immediately as the very first character of your response.

Required JSON structure:
{
  "mode": "repair_diagnosis" | "project_planning",
  "introMessage": "Calm, friendly 1–2 sentence opening",
  "status": "needs_more_info" | "ready_for_repair" | "call_professional" | "needs_measurements" | "planning_complete",
  "confidence": "low" | "medium" | "high",
  "likelyIssue": "Problem description (repair) or project description (project)",
  "reasoning": "Why you chose this status",
  "confidenceThresholdExplanation": "One sentence on confidence level",
  "followUpQuestions": ["Up to 3 questions — repair needs_more_info only, empty otherwise"],
  "requestedPhotos": ["Photo requests — repair mode only, empty in project mode"],
  "safetyWarnings": ["Safety warnings — empty array if none"],
  "estimatedDifficultyScore": 1-5 or null,
  "estimatedTime": "e.g. 2–3 days" or null,
  "callProfessionalRecommended": true | false,
  "callProfessionalReason": "Reason or null",
  "firstStep": "Most important immediate action or null",
  "toolsNeeded": ["Tools — empty array in project mode (tools go in shoppingList)"],
  "partsNeeded": ["Parts — empty array in project mode (use shoppingList)"],
  "repairSteps": [
    {
      "stepNumber": 1,
      "title": "Short action title",
      "summary": "One sentence overview",
      "detail": "Full explanation",
      "whyItMatters": "Why this step matters",
      "commonMistakes": ["Mistakes to avoid"],
      "safetyNote": "Safety note or empty string",
      "toolsNeeded": ["Tools for this step"],
      "partsNeeded": ["Parts for this step"],
      "stopIf": "When to stop or empty string"
    }
  ],
  "productSuggestions": [
    {
      "category": "tool" | "part" | "safety" | "cleaning",
      "name": "UK-available product name",
      "whyNeeded": "One sentence reason",
      "priority": "essential" | "useful" | "optional",
      "estimatedPrice": "e.g. £3–8",
      "searchQuery": "UK-optimised search term"
    }
  ],
  "tradeType": "plumber" | "electrician" | "joiner" | "builder" | "roofer" | "general",
  "photoHelpRequested": true | false,
  "photoHelpPrompt": "One sentence on what you see, or empty string",
  "identificationResult": "Identified component description or null",
  "identificationConfidence": "low" | "medium" | "high" | null,
  "estimatedDIYCost": 15,
  "estimatedProCost": {
    "tradeType": "e.g. tiler",
    "likelyCostRange": "e.g. £600–£900",
    "calloutFeeRange": "e.g. n/a (day rate)",
    "typicalTime": "e.g. 1–2 days",
    "costNotes": ["Note about what affects the price"],
    "redFlags": ["Warning sign of overcharging or poor trader"]
  } | null,
  "projectTitle": "Short project title e.g. 'Bathroom Floor Tiling' or null",
  "projectCategory": "painting_decorating" | "wallpapering" | "flooring" | "tiling" | "plastering" | "shelving_mounting" | "garden" | "furniture_assembly" | "carpentry" | "kitchen_refresh" | "bathroom_refresh" | null,
  "skillLevel": "beginner" | "intermediate" | "experienced" | null,
  "measurementsNeeded": ["Specific measurement question — empty array when planning_complete"],
  "materials": [
    {
      "name": "e.g. Porcelain floor tiles (600×300mm)",
      "category": "primary_material | adhesive | grout | underlay | primer | paint | trim | sealant | fixings | tools | paste",
      "quantity": 14,
      "unit": "boxes | rolls | litres | bags | m² | lengths | sheets | tubs | packs",
      "baseArea": "e.g. 7.5m² or null",
      "wastagePercent": 10,
      "coveragePerUnit": "e.g. 0.6m² per box or null",
      "estimatedUnitCost": 35,
      "estimatedTotalCost": 490,
      "notes": "Optional note or null",
      "priority": "essential" | "recommended" | "optional"
    }
  ],
  "shoppingList": [
    {
      "category": "e.g. Floor Tiles",
      "item": "e.g. Porcelain floor tiles",
      "quantity": "e.g. 14 boxes",
      "estimatedCost": "e.g. £420–£560",
      "priority": "essential" | "recommended" | "optional",
      "notes": "Note or null",
      "searchQuery": "UK-optimised search term"
    }
  ],
  "proTips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
}`;

const VALID_STATUSES: DiagnosisStatus[] = [
  'needs_more_info', 'ready_for_repair', 'call_professional',
  'needs_measurements', 'planning_complete',
];
const VALID_CONFIDENCES = ['low', 'medium', 'high'] as const;
const VALID_TRADES: TradeType[] = ['plumber', 'electrician', 'joiner', 'builder', 'roofer', 'general'];
const VALID_CATEGORIES: ProductCategory[] = ['tool', 'part', 'safety', 'cleaning'];
const VALID_PRIORITIES: ProductPriority[] = ['essential', 'useful', 'optional'];
const VALID_MODES: AppMode[] = ['repair_diagnosis', 'project_planning'];
const VALID_PROJECT_CATS: ProjectCategory[] = [
  'painting_decorating', 'wallpapering', 'flooring', 'tiling', 'plastering',
  'shelving_mounting', 'garden', 'furniture_assembly', 'carpentry',
  'kitchen_refresh', 'bathroom_refresh',
];
const VALID_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'experienced'];
const VALID_ITEM_PRIORITIES = ['essential', 'recommended', 'optional'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawResponse = Record<string, any>;

function buildRetailers(searchQuery: string): ReturnType<typeof buildProjectRetailers> {
  return buildProjectRetailers(searchQuery, 'general');
}

function buildProjectRetailers(searchQuery: string, category: string): { name: string; url: string }[] {
  const q = encodeURIComponent(searchQuery);
  const cat = (category || '').toLowerCase();

  const bq: ProductRetailer = { name: 'B&Q', url: `https://www.diy.com/search?term=${q}` };
  const wickes: ProductRetailer = { name: 'Wickes', url: `https://www.wickes.co.uk/search?text=${q}` };
  const screwfix: ProductRetailer = { name: 'Screwfix', url: `https://www.screwfix.com/search?search=${q}` };
  const toolstation: ProductRetailer = { name: 'Toolstation', url: `https://www.toolstation.com/search?q=${q}` };
  const toppsTiles: ProductRetailer = { name: 'Topps Tiles', url: `https://www.toppstiles.co.uk/search?q=${q}` };
  const tileGiant: ProductRetailer = { name: 'Tile Giant', url: `https://www.tilegiant.co.uk/search?q=${q}` };
  const carpetright: ProductRetailer = { name: 'Carpetright', url: `https://www.carpetright.co.uk/search?q=${q}` };

  if (/tile|grout|adhesive|mosaic|ceramic|porcelain/.test(cat)) return [toppsTiles, tileGiant, bq, wickes];
  if (/floor|laminate|vinyl|lvt|underlay|carpet|wood/.test(cat)) return [carpetright, bq, wickes];
  if (/paint|primer|emulsion|gloss|satinwood|decorat/.test(cat)) return [bq, wickes];
  if (/tool|equipment|fixing|drill|screw/.test(cat)) return [screwfix, toolstation, bq];
  if (/wallpaper|paste|lining/.test(cat)) return [bq, wickes];
  return [bq, wickes, screwfix, toolstation];
}

function normaliseStep(s: unknown, idx: number): RepairStep {
  if (typeof s !== 'object' || s === null) {
    return {
      stepNumber: idx + 1, title: `Step ${idx + 1}`, summary: '',
      detail: typeof s === 'string' ? s : '', whyItMatters: '',
      commonMistakes: [], safetyNote: '', toolsNeeded: [], partsNeeded: [], stopIf: '',
    };
  }
  const o = s as Record<string, unknown>;
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

function normaliseMaterial(raw: unknown): MaterialCalculation {
  const o = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
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
    priority: VALID_ITEM_PRIORITIES.includes(o.priority as typeof VALID_ITEM_PRIORITIES[number])
      ? (o.priority as typeof VALID_ITEM_PRIORITIES[number]) : 'essential',
  };
}

function normaliseShoppingItem(raw: unknown): ShoppingListItem {
  const o = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
  const cat = typeof o.category === 'string' ? o.category : '';
  const q = typeof o.searchQuery === 'string' ? o.searchQuery : '';
  return {
    category: cat,
    item: typeof o.item === 'string' ? o.item : '',
    quantity: typeof o.quantity === 'string' ? o.quantity : '',
    estimatedCost: typeof o.estimatedCost === 'string' ? o.estimatedCost : '',
    priority: VALID_ITEM_PRIORITIES.includes(o.priority as typeof VALID_ITEM_PRIORITIES[number])
      ? (o.priority as typeof VALID_ITEM_PRIORITIES[number]) : 'essential',
    retailerLinks: buildProjectRetailers(q, cat),
    notes: typeof o.notes === 'string' && o.notes ? o.notes : null,
    searchQuery: q,
  };
}

function tryParseJson(text: string): RawResponse | null {
  // Strip BOM and leading/trailing whitespace
  const cleaned = text.replace(/^﻿/, '').trim();
  try { return JSON.parse(cleaned) as RawResponse; } catch { /* fall through */ }

  // Strip markdown fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) as RawResponse; } catch { /* fall through */ }
  }

  // Extract from first { to last } (handles preamble/postamble text)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as RawResponse; } catch { /* fall through */ }
  }

  return null;
}

async function retryParseAsJson(rawText: string): Promise<RawResponse | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `The following text is a JSON object with some formatting problems. Return ONLY the corrected JSON — nothing else. Do not add any explanation. Start your response immediately with {.\n\n${rawText}`,
      }],
    });
    const content = message.content[0];
    if (content.type !== 'text') return null;
    return tryParseJson(content.text.trim());
  } catch (e) {
    console.error('[claude] Retry parse failed:', e);
    return null;
  }
}

const PROJECT_KEYWORDS = /\b(paint|tile|floor|wallpaper|plaster|shelf|shelv|garden|furniture|assemble|assembly|carpent|kitchen|bathroom|decor|lay|hang|fit|install|build|redecor)\b/i;
const REPAIR_KEYWORDS = /\b(broken|leak|crack|drip|damp|stuck|sticking|worn|damaged|fix|repair|replace|fault|not working|stopped|noise|smell|mould|mold|rust|peel|loose|fallen|fallen off|snapped)\b/i;

function buildSmartFallback(description: string, history: { role: string; content: string }[]): DiagnoseResponse {
  const allText = [description, ...history.map(h => h.content)].join(' ');
  const isProject = PROJECT_KEYWORDS.test(allText) && !REPAIR_KEYWORDS.test(allText);

  const base = buildFallback();

  if (isProject) {
    return {
      ...base,
      mode: 'project_planning',
      status: 'needs_measurements',
      introMessage: "Happy to help with your project — I just need a bit more detail to get started.",
      likelyIssue: description || 'Home improvement project',
      followUpQuestions: [
        'What room or area is this project in?',
        'Do you have rough dimensions (length × width, or the area in m²)?',
        'What is your approximate budget for this project?',
      ],
    };
  }

  return {
    ...base,
    introMessage: "Sorry, I had trouble understanding that — could you give me a bit more detail?",
    followUpQuestions: [
      'Can you describe exactly what the problem looks like?',
      'When did it start, and has it got worse?',
      'Can you share a clear photo of the issue?',
    ],
  };
}

function buildFallback(): DiagnoseResponse {
  return {
    mode: 'repair_diagnosis',
    status: 'needs_more_info',
    introMessage: "Something went wrong on my end — let's try again.",
    confidence: 'low',
    likelyIssue: 'Unable to analyse — please try again with a clearer photo or more detail.',
    reasoning: 'The AI did not return a structured response for this input.',
    confidenceThresholdExplanation: 'No response could be parsed.',
    followUpQuestions: ['Can you describe the problem in more detail or provide a clearer photo?'],
    requestedPhotos: [],
    safetyWarnings: [],
    estimatedDifficultyScore: null,
    estimatedTime: null,
    callProfessionalRecommended: false,
    callProfessionalReason: null,
    firstStep: null,
    toolsNeeded: [],
    partsNeeded: [],
    repairSteps: [],
    productSuggestions: [],
    tradeType: 'general',
    photoHelpRequested: false,
    photoHelpPrompt: '',
    identificationResult: null,
    identificationConfidence: null,
    estimatedProCost: null,
    estimatedDIYCost: null,
    projectCategory: null,
    projectTitle: null,
    skillLevel: null,
    measurementsNeeded: [],
    materials: [],
    shoppingList: [],
    proTips: [],
  };
}

function normaliseProCost(raw: unknown): ProCostEstimate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  return {
    tradeType: typeof o.tradeType === 'string' ? o.tradeType : '',
    likelyCostRange: typeof o.likelyCostRange === 'string' ? o.likelyCostRange : '',
    calloutFeeRange: typeof o.calloutFeeRange === 'string' ? o.calloutFeeRange : '',
    typicalTime: typeof o.typicalTime === 'string' ? o.typicalTime : '',
    costNotes: Array.isArray(o.costNotes) ? o.costNotes.map(String) : [],
    redFlags: Array.isArray(o.redFlags) ? o.redFlags.map(String) : [],
  };
}

function normaliseResponse(raw: RawResponse): DiagnoseResponse {
  const mode: AppMode = VALID_MODES.includes(raw.mode) ? raw.mode as AppMode : 'repair_diagnosis';

  const status: DiagnosisStatus = VALID_STATUSES.includes(raw.status)
    ? raw.status as DiagnosisStatus
    : mode === 'project_planning' ? 'needs_measurements' : 'needs_more_info';

  const confidence = VALID_CONFIDENCES.includes(raw.confidence)
    ? raw.confidence as typeof VALID_CONFIDENCES[number]
    : 'low';

  const score = typeof raw.estimatedDifficultyScore === 'number'
    ? Math.min(5, Math.max(1, Math.round(raw.estimatedDifficultyScore)))
    : null;

  return {
    mode,
    status,
    introMessage: typeof raw.introMessage === 'string' && raw.introMessage ? raw.introMessage : '',
    confidence,
    likelyIssue: typeof raw.likelyIssue === 'string' ? raw.likelyIssue : 'Unknown issue',
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : '',
    confidenceThresholdExplanation: typeof raw.confidenceThresholdExplanation === 'string' ? raw.confidenceThresholdExplanation : '',
    followUpQuestions: Array.isArray(raw.followUpQuestions) ? raw.followUpQuestions.map(String) : [],
    requestedPhotos: Array.isArray(raw.requestedPhotos) ? raw.requestedPhotos.map(String) : [],
    safetyWarnings: Array.isArray(raw.safetyWarnings) ? raw.safetyWarnings.map(String) : [],
    estimatedDifficultyScore: score,
    estimatedTime: typeof raw.estimatedTime === 'string' ? raw.estimatedTime : null,
    callProfessionalRecommended: !!raw.callProfessionalRecommended,
    callProfessionalReason: typeof raw.callProfessionalReason === 'string' ? raw.callProfessionalReason : null,
    firstStep: typeof raw.firstStep === 'string' && raw.firstStep ? raw.firstStep : null,
    toolsNeeded: Array.isArray(raw.toolsNeeded) ? raw.toolsNeeded.map(String) : [],
    partsNeeded: Array.isArray(raw.partsNeeded) ? raw.partsNeeded.map(String) : [],
    repairSteps: Array.isArray(raw.repairSteps) ? raw.repairSteps.map(normaliseStep) : [],
    productSuggestions: (Array.isArray(raw.productSuggestions) ? raw.productSuggestions : []).map(
      (p: Record<string, unknown>) => {
        const q = typeof p.searchQuery === 'string' ? p.searchQuery : '';
        return {
          category: VALID_CATEGORIES.includes(p.category as ProductCategory) ? (p.category as ProductCategory) : 'part',
          name: typeof p.name === 'string' ? p.name : '',
          whyNeeded: typeof p.whyNeeded === 'string' ? p.whyNeeded : (typeof p.reason === 'string' ? p.reason : ''),
          priority: VALID_PRIORITIES.includes(p.priority as ProductPriority) ? (p.priority as ProductPriority) : 'useful',
          estimatedPrice: typeof p.estimatedPrice === 'string' ? p.estimatedPrice : '',
          searchQuery: q,
          retailers: buildRetailers(q),
        };
      }
    ),
    tradeType: VALID_TRADES.includes(raw.tradeType as TradeType) ? (raw.tradeType as TradeType) : 'general',
    photoHelpRequested: !!raw.photoHelpRequested,
    photoHelpPrompt: typeof raw.photoHelpPrompt === 'string' ? raw.photoHelpPrompt : '',
    identificationResult: typeof raw.identificationResult === 'string' && raw.identificationResult ? raw.identificationResult : null,
    identificationConfidence: VALID_CONFIDENCES.includes(raw.identificationConfidence)
      ? raw.identificationConfidence as typeof VALID_CONFIDENCES[number]
      : null,
    estimatedProCost: normaliseProCost(raw.estimatedProCost),
    estimatedDIYCost: typeof raw.estimatedDIYCost === 'number' && raw.estimatedDIYCost >= 0
      ? Math.round(raw.estimatedDIYCost)
      : null,
    // Project fields
    projectCategory: VALID_PROJECT_CATS.includes(raw.projectCategory) ? raw.projectCategory as ProjectCategory : null,
    projectTitle: typeof raw.projectTitle === 'string' && raw.projectTitle ? raw.projectTitle : null,
    skillLevel: VALID_SKILL_LEVELS.includes(raw.skillLevel) ? raw.skillLevel as SkillLevel : null,
    measurementsNeeded: Array.isArray(raw.measurementsNeeded) ? raw.measurementsNeeded.map(String) : [],
    materials: Array.isArray(raw.materials) ? raw.materials.map(normaliseMaterial) : [],
    shoppingList: Array.isArray(raw.shoppingList) ? raw.shoppingList.map(normaliseShoppingItem) : [],
    proTips: Array.isArray(raw.proTips) ? raw.proTips.map(String) : [],
  };
}

export async function diagnoseIssue(request: DiagnoseRequest): Promise<DiagnoseResponse> {
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const images = request.images ?? [];
  const history = request.conversationHistory ?? [];
  const description = request.description?.trim() ?? '';
  const locationNote = request.location
    ? ` User location: approx ${request.location.lat.toFixed(4)}N, ${request.location.lng.toFixed(4)}E.`
    : '';
  const skillNote = request.skillLevel ? `\nSkill level: ${request.skillLevel}` : '';

  const imageBlocks: Anthropic.ImageBlockParam[] = images.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: validMimeTypes.includes(img.mimeType)
        ? (img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp')
        : 'image/jpeg',
      data: img.imageBase64,
    },
  }));

  const imageNote = imageBlocks.length > 0
    ? `${imageBlocks.length} photo${imageBlocks.length > 1 ? 's' : ''} provided.`
    : 'No photos provided.';

  type ContentBlock = Anthropic.ImageBlockParam | Anthropic.TextBlockParam;
  const messages: Anthropic.MessageParam[] = [];

  if (history.length === 0) {
    const parts = [imageNote];
    if (description) parts.push(`Description: "${description}"`);
    if (locationNote) parts.push(locationNote);
    if (skillNote) parts.push(skillNote);
    parts.push('Return ONLY raw JSON.');

    const content: ContentBlock[] = [
      ...imageBlocks,
      { type: 'text', text: parts.join('\n') },
    ];
    messages.push({ role: 'user', content });
  } else {
    const firstContent: ContentBlock[] = [
      ...imageBlocks,
      { type: 'text', text: `${imageNote}\nInitial report: "${history[0].content}"${locationNote}${skillNote}` },
    ];
    messages.push({ role: 'user', content: firstContent });

    for (let i = 1; i < history.length; i++) {
      messages.push({ role: history[i].role as 'user' | 'assistant', content: history[i].content });
    }

    const currentText = description || 'I have added more photos. Please reassess with all available information.';
    messages.push({ role: 'user', content: `${currentText}\nReturn ONLY raw JSON.` });
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages,
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude API');

  const responseText = content.text.trim();
  let raw = tryParseJson(responseText);

  if (!raw) {
    console.error('[claude] Failed to parse response — attempting retry. Raw text:\n', responseText);
    raw = await retryParseAsJson(responseText);
  }

  if (!raw) {
    console.error('[claude] Retry also failed — using smart fallback.');
    return buildSmartFallback(description, history);
  }

  return normaliseResponse(raw);
}
