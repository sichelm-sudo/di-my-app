import { useState } from 'react';
import {
  Stethoscope, AlertTriangle, Hammer, ListOrdered,
  ShoppingBag, ExternalLink, HardHat, Zap, Clock, ChevronDown,
  Camera, PoundSterling, MessageCircle,
} from 'lucide-react';
import { DiagnoseResponse, Coords, TradeType, RepairStep, ProductSuggestion, ProductCategory, ProCostEstimate } from '../types';

interface Props {
  result: DiagnoseResponse;
  location: Coords | null;
  onAskAboutStep?: (stepNumber: number, title: string) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  low: '#e67e22',
  medium: '#2980b9',
  high: '#27ae60',
};

const DIFFICULTY_COLORS = ['', '#27ae60', '#5bba47', '#f0b429', '#e67e22', '#c0392b'];

const TRADE_LABEL: Record<TradeType, string> = {
  plumber: 'plumber',
  electrician: 'electrician',
  joiner: 'joiner',
  builder: 'builder',
  roofer: 'roofer',
  general: 'handyman',
};

const TRADE_PLURAL: Record<TradeType, string> = {
  plumber: 'plumbers',
  electrician: 'electricians',
  joiner: 'joiners',
  builder: 'builders',
  roofer: 'roofers',
  general: 'handymen',
};

function inferTrade(likelyIssue: string, tradeType: TradeType): TradeType {
  if (tradeType !== 'general') return tradeType;
  const t = likelyIssue.toLowerCase();
  if (/plumb|leak|sink|tap|toilet|drain|pipe|water|shower|bath|radiator|boiler/.test(t)) return 'plumber';
  if (/socket|light|wiring|fuse|electri|circuit|switch|plug|power|earth|live/.test(t)) return 'electrician';
  return 'general';
}

export default function DiagnosisCards({ result, location, onAskAboutStep }: Props) {
  const isReady = result.status === 'ready_for_repair';
  const isCallPro = result.status === 'call_professional';
  const isNeedsInfo = result.status === 'needs_more_info';
  const trade = inferTrade(result.likelyIssue, result.tradeType);

  return (
    <>
      {result.introMessage && (
        <div className="intro-message">{result.introMessage}</div>
      )}

      <DiagnosisCard result={result} />

      {result.identificationResult && (
        <IdentificationResultCard
          result={result.identificationResult}
          confidence={result.identificationConfidence}
        />
      )}

      {result.safetyWarnings.length > 0 && <SafetyCard warnings={result.safetyWarnings} />}

      {isReady && (
        <>
          {result.firstStep && <FirstStepCard firstStep={result.firstStep} />}
          {(result.toolsNeeded.length > 0 || result.partsNeeded.length > 0) && (
            <ToolsPartsCard tools={result.toolsNeeded} parts={result.partsNeeded} />
          )}
          {result.repairSteps.length > 0 && <StepsCard steps={result.repairSteps} onAskAboutStep={onAskAboutStep} />}
          <ProductsCard products={result.productSuggestions} isNeedsInfo={false} />
        </>
      )}

      {isNeedsInfo && <ProductsCard products={[]} isNeedsInfo={true} />}

      {(isReady || isCallPro) && (
        <CallProCard
          urgent={result.callProfessionalRecommended}
          reason={result.callProfessionalReason}
          tradeType={trade}
          location={location}
          estimatedProCost={result.estimatedProCost}
        />
      )}

      {isNeedsInfo && result.callProfessionalRecommended && (
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

function DiagnosisCard({ result }: { result: DiagnoseResponse }) {
  const confColor = CONFIDENCE_COLORS[result.confidence] ?? '#888';
  const score = result.estimatedDifficultyScore;
  const diffColor = score !== null ? (DIFFICULTY_COLORS[score] ?? '#888') : '#888';
  const isNeedsInfo = result.status === 'needs_more_info';

  return (
    <div className="card">
      <div className="card-header">
        <Stethoscope size={20} color="#FF6B35" />
        <span className="card-title">Diagnosis</span>
      </div>
      <div className="meta-row">
        <span className="confidence-badge" style={{ backgroundColor: confColor }}>
          {result.confidence} confidence
        </span>
        {score !== null && !isNeedsInfo && (
          <div className="difficulty-wrap">
            <div className="difficulty-dots">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  className={`dot${i <= score ? ' filled' : ''}`}
                  style={i <= score ? { backgroundColor: diffColor } : {}}
                />
              ))}
            </div>
            <span className="difficulty-label">Difficulty {score}/5</span>
          </div>
        )}
        {result.estimatedTime && !isNeedsInfo && (
          <div className="time-badge">
            <Clock size={12} />
            {result.estimatedTime}
          </div>
        )}
      </div>
      <p className="issue-text">{result.likelyIssue}</p>
      {isNeedsInfo && result.reasoning && (
        <p className="reasoning-text">{result.reasoning}</p>
      )}
      {!isNeedsInfo && result.confidenceThresholdExplanation && (
        <p className="confidence-explanation">{result.confidenceThresholdExplanation}</p>
      )}
    </div>
  );
}

function FirstStepCard({ firstStep }: { firstStep: string }) {
  return (
    <div className="card card-first-step">
      <div className="first-step-badge">
        <Zap size={13} />
        Start here
      </div>
      <p className="first-step-text">{firstStep}</p>
    </div>
  );
}

export function IdentificationResultCard({
  result,
  confidence,
}: {
  result: string;
  confidence: 'low' | 'medium' | 'high' | null;
}) {
  const confColor = confidence ? CONFIDENCE_COLORS[confidence] : '#888';
  return (
    <div className="card identification-result-card">
      <div className="card-header">
        <Camera size={20} color="#FF6B35" />
        <span className="card-title">Photo identified</span>
        {confidence && (
          <span className="id-confidence-badge" style={{ backgroundColor: confColor }}>
            {confidence} confidence
          </span>
        )}
      </div>
      <p className="id-result-text">{result}</p>
    </div>
  );
}

export function SafetyCard({ warnings }: { warnings: string[] }) {
  return (
    <div className="card card-safety">
      <div className="card-header">
        <AlertTriangle size={20} color="#e67e22" />
        <span className="card-title" style={{ color: '#e67e22' }}>Safety Warnings</span>
      </div>
      {warnings.map((w, i) => (
        <div key={i} className="list-item">
          <span className="list-bullet">⚠</span>
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

function ToolsPartsCard({ tools, parts }: { tools: string[]; parts: string[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <Hammer size={20} color="#FF6B35" />
        <span className="card-title">Tools &amp; Parts</span>
      </div>
      {tools.length > 0 && (
        <>
          <div className="subheading">Tools needed</div>
          {tools.map((t, i) => (
            <div key={i} className="list-item">
              <span className="list-bullet">•</span>
              <span>{t}</span>
            </div>
          ))}
        </>
      )}
      {parts.length > 0 && (
        <>
          <div className="subheading">Parts &amp; materials</div>
          {parts.map((p, i) => (
            <div key={i} className="list-item">
              <span className="list-bullet">•</span>
              <span>{p}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function StepsCard({ steps, onAskAboutStep }: { steps: RepairStep[]; onAskAboutStep?: (stepNumber: number, title: string) => void }) {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]));

  function toggle(idx: number) {
    setOpenSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <ListOrdered size={20} color="#FF6B35" />
        <span className="card-title">Step-by-Step Fix</span>
      </div>
      <p className="steps-hint">Tap each step for more detail.</p>
      <div className="steps-accordion">
        {steps.map((step, i) => {
          const open = openSteps.has(i);
          const alert = !!(step.safetyNote || step.stopIf);
          return (
            <div key={i} className={`step-acc-item${alert ? ' step-acc-alert' : ''}`}>
              <button
                className={`step-acc-header${open ? ' open' : ''}`}
                onClick={() => toggle(i)}
                aria-expanded={open}
              >
                <div className="step-acc-num">{step.stepNumber}</div>
                <div className="step-acc-titles">
                  <span className="step-acc-title">{step.title}</span>
                  <span className="step-acc-summary">{step.summary}</span>
                </div>
                {alert && <span className="step-acc-warn-dot" aria-label="Safety note" />}
                <ChevronDown size={18} className={`step-acc-chevron${open ? ' rotated' : ''}`} />
              </button>
              {open && (
                <div className="step-acc-body">
                  <p className="step-detail">{step.detail}</p>

                  {step.whyItMatters && (
                    <div className="step-section">
                      <div className="step-section-label">Why it matters</div>
                      <p>{step.whyItMatters}</p>
                    </div>
                  )}

                  {step.commonMistakes.length > 0 && (
                    <div className="step-section">
                      <div className="step-section-label">Common mistakes</div>
                      {step.commonMistakes.map((m, j) => (
                        <div key={j} className="list-item">
                          <span className="list-bullet">✗</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(step.toolsNeeded.length > 0 || step.partsNeeded.length > 0) && (
                    <div className="step-section">
                      <div className="step-section-label">For this step</div>
                      {step.toolsNeeded.map((t, j) => (
                        <div key={`t${j}`} className="list-item">
                          <span className="list-bullet">🔧</span>
                          <span>{t}</span>
                        </div>
                      ))}
                      {step.partsNeeded.map((p, j) => (
                        <div key={`p${j}`} className="list-item">
                          <span className="list-bullet">📦</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.safetyNote && (
                    <div className="step-safety-note">⚠ {step.safetyNote}</div>
                  )}

                  {step.stopIf && (
                    <div className="step-stop-if">🛑 Stop if: {step.stopIf}</div>
                  )}

                  {onAskAboutStep && (
                    <button
                      className="ask-about-step-btn"
                      onClick={() => onAskAboutStep(step.stepNumber, step.title)}
                    >
                      <MessageCircle size={13} />
                      Ask about this step
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CAT_COLORS: Record<ProductCategory, string> = {
  tool: '#2980b9',
  part: '#27ae60',
  safety: '#e67e22',
  cleaning: '#8e44ad',
};

function ProductItem({ p }: { p: ProductSuggestion }) {
  return (
    <div className="product-item">
      <div className="product-item-header">
        <span className="product-cat-badge" style={{ background: CAT_COLORS[p.category] }}>
          {p.category}
        </span>
        <span className="product-name">{p.name}</span>
        {p.estimatedPrice && <span className="product-price">{p.estimatedPrice}</span>}
      </div>
      <div className="product-reason">{p.whyNeeded}</div>
      <div className="retailer-btns">
        {p.retailers.map(r => (
          <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="retailer-btn">
            {r.name} <ExternalLink size={11} />
          </a>
        ))}
      </div>
    </div>
  );
}

function ProductsCard({ products, isNeedsInfo }: { products: ProductSuggestion[]; isNeedsInfo: boolean }) {
  if (isNeedsInfo) {
    return (
      <div className="card parts-pending-card">
        <div className="card-header">
          <ShoppingBag size={20} color="#aaa" />
          <span className="card-title" style={{ color: '#aaa' }}>Tools, parts &amp; supplies</span>
        </div>
        <p className="parts-pending-note">
          Once we confirm the exact issue, I'll suggest the right parts and tools so you don't buy the wrong thing.
        </p>
      </div>
    );
  }

  if (products.length === 0) return null;

  const essential = products.filter(p => p.priority === 'essential');
  const useful = products.filter(p => p.priority === 'useful');
  const optional = products.filter(p => p.priority === 'optional');

  return (
    <div className="card">
      <div className="card-header">
        <ShoppingBag size={20} color="#FF6B35" />
        <span className="card-title">Tools, parts &amp; supplies</span>
      </div>
      {essential.length > 0 && (
        <div className="product-group">
          <div className="product-group-label essential">Essential</div>
          {essential.map((p, i) => <ProductItem key={i} p={p} />)}
        </div>
      )}
      {useful.length > 0 && (
        <div className="product-group">
          <div className="product-group-label useful">Useful</div>
          {useful.map((p, i) => <ProductItem key={i} p={p} />)}
        </div>
      )}
      {optional.length > 0 && (
        <div className="product-group">
          <div className="product-group-label optional">Optional</div>
          {optional.map((p, i) => <ProductItem key={i} p={p} />)}
        </div>
      )}
    </div>
  );
}

export function CallProCard({
  urgent,
  reason,
  tradeType,
  location,
  estimatedProCost,
}: {
  urgent: boolean;
  reason?: string | null;
  tradeType: TradeType;
  location: Coords | null;
  estimatedProCost: ProCostEstimate | null;
}) {
  const label = TRADE_LABEL[tradeType] ?? 'handyman';
  const plural = TRADE_PLURAL[tradeType] ?? 'handymen';
  const q = encodeURIComponent(label);

  const links = [
    { name: 'Checkatrade', url: `https://www.checkatrade.com/search?what=${q}` },
    { name: 'Rated People', url: `https://www.ratedpeople.com/find-a-tradesperson` },
    { name: 'TrustATrader', url: `https://www.trustatrader.com/find/tradespeople/${plural}-near-me` },
    location
      ? { name: `Find ${label} near me (Maps)`, url: `https://www.google.com/maps/search/${q}/@${location.lat},${location.lng},12z` }
      : { name: `Find a ${label} near me`, url: `https://www.google.com/search?q=${encodeURIComponent(`find a ${label} near me UK`)}` },
  ];

  return (
    <div className={`card card-call-pro${urgent ? '' : ' optional'}`}>
      <div className="card-header">
        <HardHat size={20} color={urgent ? '#c0392b' : '#666'} />
        <span className="card-title" style={{ color: urgent ? '#c0392b' : undefined }}>
          {urgent ? 'Call a Professional' : 'Prefer not to DIY?'}
        </span>
      </div>
      {urgent && reason && <p className="pro-reason">{reason}</p>}
      {!urgent && <p className="pro-optional-text">Find a trusted {label} near you.</p>}

      {estimatedProCost && (
        <div className="pro-cost-section">
          <div className="pro-cost-header">
            <PoundSterling size={15} color="#888" />
            <span>Typical cost in the UK</span>
          </div>
          <div className="pro-cost-row">
            <div className="pro-cost-item">
              <span className="pro-cost-label">Job total</span>
              <span className="pro-cost-value">{estimatedProCost.likelyCostRange}</span>
            </div>
            <div className="pro-cost-item">
              <span className="pro-cost-label">Callout fee</span>
              <span className="pro-cost-value">{estimatedProCost.calloutFeeRange}</span>
            </div>
            <div className="pro-cost-item">
              <span className="pro-cost-label">Typical time</span>
              <span className="pro-cost-value">{estimatedProCost.typicalTime}</span>
            </div>
          </div>
          {estimatedProCost.costNotes.length > 0 && (
            <div className="pro-cost-notes">
              {estimatedProCost.costNotes.map((note, i) => (
                <div key={i} className="list-item">
                  <span className="list-bullet">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}
          {estimatedProCost.redFlags.length > 0 && (
            <div className="pro-red-flags">
              <div className="pro-red-flags-label">Watch out for:</div>
              {estimatedProCost.redFlags.map((flag, i) => (
                <div key={i} className="pro-red-flag-item">
                  <span>🚩</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pro-links">
        {links.map(l => (
          <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="pro-link-btn">
            {l.name} <ExternalLink size={13} />
          </a>
        ))}
      </div>
    </div>
  );
}
