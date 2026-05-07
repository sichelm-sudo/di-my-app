import { Fragment } from 'react';
import { Check } from 'lucide-react';

const STAGES = [
  { n: 1, label: 'Analysing project' },
  { n: 2, label: 'Calculating materials' },
  { n: 3, label: 'Shopping list' },
];

interface Props {
  completedStages: number[];
  currentStage: number | null;
}

export default function ProjectProgress({ completedStages, currentStage }: Props) {
  return (
    <div className="project-progress">
      {STAGES.map(({ n, label }, idx) => {
        const isDone = completedStages.includes(n);
        const isActive = currentStage === n;
        return (
          <Fragment key={n}>
            <div className="progress-step">
              <div className={`progress-bubble${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {isDone ? (
                  <Check size={13} strokeWidth={3} />
                ) : isActive ? (
                  <span
                    className="spinner-sm"
                    style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  n
                )}
              </div>
              <span className={`progress-step-label${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={`progress-line${isDone ? ' done' : ''}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
