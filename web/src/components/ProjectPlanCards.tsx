import { useState } from 'react';
import {
  Ruler, ShoppingBag, PoundSterling, Lightbulb, Package,
  ExternalLink, ChevronDown, Paintbrush, Layers, LayoutGrid,
  Hammer, Sprout, Utensils, Bath, BookOpen, Wrench, HardHat,
} from 'lucide-react';
import {
  DiagnoseResponse, Coords, MaterialCalculation, ShoppingListItem,
  ProjectCategory, TradeType,
} from '../types';
import { StepsCard, IdentificationResultCard, SafetyCard, CallProCard } from './DiagnosisCards';

const CAT_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  painting_decorating: { label: 'Painting & Decorating', color: '#e74c3c', icon: <Paintbrush size={13} /> },
  wallpapering:        { label: 'Wallpapering',          color: '#8e44ad', icon: <Layers size={13} /> },
  flooring:            { label: 'Flooring',              color: '#c0392b', icon: <Layers size={13} /> },
  tiling:              { label: 'Tiling',                color: '#1abc9c', icon: <LayoutGrid size={13} /> },
  plastering:          { label: 'Plastering',            color: '#7f8c8d', icon: <Layers size={13} /> },
  shelving_mounting:   { label: 'Shelving & Mounting',   color: '#2980b9', icon: <BookOpen size={13} /> },
  garden:              { label: 'Garden',                color: '#27ae60', icon: <Sprout size={13} /> },
  furniture_assembly:  { label: 'Furniture',             color: '#e67e22', icon: <Package size={13} /> },
  carpentry:           { label: 'Carpentry',             color: '#d35400', icon: <Hammer size={13} /> },
  kitchen_refresh:     { label: 'Kitchen Refresh',       color: '#e67e22', icon: <Utensils size={13} /> },
  bathroom_refresh:    { label: 'Bathroom Refresh',      color: '#2980b9', icon: <Bath size={13} /> },
};

const SKILL_INFO: Record<string, { label: string; color: string }> = {
  beginner:     { label: 'Beginner',       color: '#27ae60' },
  intermediate: { label: 'Fairly handy',   color: '#f0b429' },
  experienced:  { label: 'Experienced',    color: '#2980b9' },
};

const PRIORITY_CONFIG = {
  essential:   { label: 'Essential',   color: '#c0392b' },
  recommended: { label: 'Recommended', color: '#2980b9' },
  optional:    { label: 'Optional',    color: '#888' },
};

const MAT_CAT_COLORS: Record<string, string> = {
  primary_material: '#2980b9',
  adhesive:         '#e67e22',
  grout:            '#7f8c8d',
  underlay:         '#1abc9c',
  primer:           '#8e44ad',
  paint:            '#e74c3c',
  trim:             '#95a5a6',
  sealant:          '#2ecc71',
  fixings:          '#7f8c8d',
  tools:            '#3498db',
  paste:            '#e67e22',
};

function projectCategoryToTrade(cat: ProjectCategory | null): TradeType {
  switch (cat) {
    case 'tiling': case 'plastering': case 'kitchen_refresh': return 'builder';
    case 'carpentry': return 'joiner';
    case 'bathroom_refresh': return 'plumber';
    default: return 'general';
  }
}

interface Props {
  result: DiagnoseResponse;
  location: Coords | null;
  onAskAboutStep?: (stepNumber: number, title: string) => void;
}

export default function ProjectPlanCards({ result, location, onAskAboutStep }: Props) {
  const needsMeasurements = result.status === 'needs_measurements';
  const isComplete = result.status === 'planning_complete';
  const trade = projectCategoryToTrade(result.projectCategory);

  return (
    <>
      {result.introMessage && (
        <div className="intro-message">{result.introMessage}</div>
      )}

      <ProjectHeaderCard result={result} />

      {result.identificationResult && (
        <IdentificationResultCard
          result={result.identificationResult}
          confidence={result.identificationConfidence}
        />
      )}

      {result.safetyWarnings.length > 0 && (
        <SafetyCard warnings={result.safetyWarnings} />
      )}

      {needsMeasurements && result.measurementsNeeded.length > 0 && (
        <MeasurementsNeededCard questions={result.measurementsNeeded} />
      )}

      {isComplete && (
        <>
          {result.materials.length > 0 && (
            <MaterialsCard materials={result.materials} />
          )}
          {result.shoppingList.length > 0 && (
            <ShoppingListCard items={result.shoppingList} />
          )}
          {(result.estimatedDIYCost !== null || result.estimatedProCost !== null) && (
            <BudgetCard result={result} />
          )}
          {result.repairSteps.length > 0 && (
            <StepsCard steps={result.repairSteps} onAskAboutStep={onAskAboutStep} />
          )}
        </>
      )}

      {result.proTips.length > 0 && (
        <ProTipsCard tips={result.proTips} />
      )}

      {isComplete && (
        <CallProCard
          urgent={result.callProfessionalRecommended}
          reason={result.callProfessionalReason}
          tradeType={trade}
          location={location}
          estimatedProCost={result.callProfessionalRecommended ? result.estimatedProCost : null}
        />
      )}

      {needsMeasurements && result.callProfessionalRecommended && (
        <CallProCard
          urgent={true}
          reason={result.callProfessionalReason}
          tradeType={trade}
          location={location}
          estimatedProCost={result.estimatedProCost}
        />
      )}
    </>
  );
}

function ProjectHeaderCard({ result }: { result: DiagnoseResponse }) {
  const cat = result.projectCategory ? CAT_INFO[result.projectCategory] : null;
  const skill = result.skillLevel ? SKILL_INFO[result.skillLevel] : null;

  return (
    <div className="card project-header-card">
      <div className="project-mode-badge">
        <Wrench size={12} />
        Project Planner
      </div>
      <div className="project-badges-row">
        {cat && (
          <span className="project-cat-badge" style={{ background: cat.color }}>
            {cat.icon}
            {cat.label}
          </span>
        )}
        {skill && (
          <span className="project-skill-badge" style={{ borderColor: skill.color, color: skill.color }}>
            {skill.label}
          </span>
        )}
      </div>
      {result.projectTitle && (
        <h2 className="project-title-text">{result.projectTitle}</h2>
      )}
      {result.likelyIssue && result.likelyIssue !== result.projectTitle && (
        <p className="project-description">{result.likelyIssue}</p>
      )}
      {result.estimatedTime && (
        <div className="project-time-row">
          <span className="project-time-label">Estimated time:</span>
          <span className="project-time-value">{result.estimatedTime}</span>
        </div>
      )}
    </div>
  );
}

function MeasurementsNeededCard({ questions }: { questions: string[] }) {
  return (
    <div className="card measurements-needed-card">
      <div className="card-header">
        <Ruler size={20} color="#2980b9" />
        <span className="card-title" style={{ color: '#2980b9' }}>Measurements needed</span>
      </div>
      <p className="measurements-hint">
        Answer these questions in the box below and I'll calculate exactly what you need.
      </p>
      <div className="measurements-list">
        {questions.map((q, i) => (
          <div key={i} className="measurement-question">
            <span className="measurement-q-num">{i + 1}</span>
            <span>{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsCard({ materials }: { materials: MaterialCalculation[] }) {
  const essential = materials.filter(m => m.priority === 'essential');
  const recommended = materials.filter(m => m.priority === 'recommended');
  const optional = materials.filter(m => m.priority === 'optional');

  return (
    <div className="card">
      <div className="card-header">
        <Package size={20} color="#FF6B35" />
        <span className="card-title">Materials calculator</span>
      </div>
      <p className="materials-hint">Quantities calculated for your project including recommended wastage allowance.</p>

      {essential.length > 0 && (
        <div className="material-group">
          <div className="material-group-label essential">Essential</div>
          <div className="materials-grid">
            {essential.map((m, i) => <MaterialItem key={i} m={m} />)}
          </div>
        </div>
      )}
      {recommended.length > 0 && (
        <div className="material-group">
          <div className="material-group-label recommended">Recommended</div>
          <div className="materials-grid">
            {recommended.map((m, i) => <MaterialItem key={i} m={m} />)}
          </div>
        </div>
      )}
      {optional.length > 0 && (
        <div className="material-group">
          <div className="material-group-label optional">Optional / Pro finish</div>
          <div className="materials-grid">
            {optional.map((m, i) => <MaterialItem key={i} m={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialItem({ m }: { m: MaterialCalculation }) {
  const catColor = MAT_CAT_COLORS[m.category] ?? '#888';
  return (
    <div className="material-item">
      <div className="material-item-header">
        <span className="material-cat-dot" style={{ background: catColor }} />
        <span className="material-name">{m.name}</span>
      </div>
      <div className="material-qty">
        {m.quantity} <span className="material-unit">{m.unit}</span>
      </div>
      <div className="material-meta-row">
        {m.coveragePerUnit && (
          <span className="material-meta-chip">{m.coveragePerUnit}</span>
        )}
        {m.wastagePercent > 0 && (
          <span className="material-meta-chip">+{m.wastagePercent}% waste</span>
        )}
        {m.baseArea && (
          <span className="material-meta-chip">{m.baseArea}</span>
        )}
      </div>
      {m.estimatedTotalCost !== null && (
        <div className="material-cost">~£{m.estimatedTotalCost}</div>
      )}
      {m.notes && <div className="material-notes">{m.notes}</div>}
    </div>
  );
}

function ShoppingListCard({ items }: { items: ShoppingListItem[] }) {
  const essential = items.filter(i => i.priority === 'essential');
  const recommended = items.filter(i => i.priority === 'recommended');
  const optional = items.filter(i => i.priority === 'optional');

  return (
    <div className="card">
      <div className="card-header">
        <ShoppingBag size={20} color="#FF6B35" />
        <span className="card-title">Shopping list</span>
      </div>

      {essential.length > 0 && (
        <ShoppingGroup label="Essential" items={essential} />
      )}
      {recommended.length > 0 && (
        <ShoppingGroup label="Recommended" items={recommended} />
      )}
      {optional.length > 0 && (
        <ShoppingGroup label="Optional / Pro finish" items={optional} />
      )}
    </div>
  );
}

function ShoppingGroup({ label, items }: { label: string; items: ShoppingListItem[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="shopping-group">
      <button className="shopping-group-header" onClick={() => setOpen(o => !o)}>
        <span className="shopping-group-label">{label}</span>
        <span className="shopping-group-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <ChevronDown size={15} className={`step-acc-chevron${open ? ' rotated' : ''}`} />
      </button>
      {open && (
        <div className="shopping-group-body">
          {items.map((item, i) => <ShoppingItem key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

function ShoppingItem({ item }: { item: ShoppingListItem }) {
  return (
    <div className="shopping-item">
      <div className="shopping-item-header">
        <span className="shopping-cat-badge">{item.category}</span>
        <span className="shopping-item-name">{item.item}</span>
      </div>
      <div className="shopping-item-row">
        <span className="shopping-item-qty">{item.quantity}</span>
        <span className="shopping-item-cost">{item.estimatedCost}</span>
      </div>
      {item.notes && <div className="shopping-item-notes">{item.notes}</div>}
      {item.retailerLinks.length > 0 && (
        <div className="retailer-btns" style={{ marginTop: 8 }}>
          {item.retailerLinks.map(r => (
            <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="retailer-btn">
              {r.name} <ExternalLink size={11} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetCard({ result }: { result: DiagnoseResponse }) {
  const diy = result.estimatedDIYCost;
  const pro = result.estimatedProCost;

  const proMid = pro?.likelyCostRange
    ? (() => {
        const nums = [...pro.likelyCostRange.matchAll(/(\d+)/g)]
          .map(m => parseInt(m[1], 10))
          .filter(n => n > 0 && n < 100000);
        return nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b) / nums.length) : null;
      })()
    : null;

  const saving = diy !== null && proMid !== null ? Math.max(0, proMid - diy) : null;

  return (
    <div className="card budget-card">
      <div className="card-header">
        <PoundSterling size={20} color="#FF6B35" />
        <span className="card-title">Cost estimate</span>
      </div>

      <div className="budget-rows">
        {diy !== null && (
          <div className="budget-row budget-diy">
            <span className="budget-label">DIY materials total</span>
            <span className="budget-value">~£{diy}</span>
          </div>
        )}
        {pro?.likelyCostRange && (
          <div className="budget-row budget-pro">
            <span className="budget-label">Professional cost</span>
            <span className="budget-value">{pro.likelyCostRange}</span>
          </div>
        )}
        {saving !== null && saving > 0 && (
          <div className="budget-row budget-saving">
            <span className="budget-label">Estimated saving by DIY</span>
            <span className="budget-value budget-saving-value">~£{saving}</span>
          </div>
        )}
      </div>

      {result.estimatedTime && (
        <div className="budget-time">
          <HardHat size={13} color="#888" />
          <span>Professional time: {result.estimatedProCost?.typicalTime || result.estimatedTime}</span>
        </div>
      )}

      {pro && pro.costNotes.length > 0 && (
        <div className="budget-notes">
          {pro.costNotes.map((note, i) => (
            <div key={i} className="list-item" style={{ fontSize: 12 }}>
              <span className="list-bullet">•</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}

      <p className="budget-caveat">
        Material costs are estimates based on current UK retail prices. Professional rates vary by region and contractor.
      </p>
    </div>
  );
}

function ProTipsCard({ tips }: { tips: string[] }) {
  return (
    <div className="card pro-tips-card">
      <div className="card-header">
        <Lightbulb size={20} color="#f0b429" />
        <span className="card-title">Pro tips</span>
      </div>
      <div className="pro-tips-list">
        {tips.map((tip, i) => (
          <div key={i} className="pro-tip-item">
            <span className="pro-tip-bullet">💡</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
