import { CheckCircle2, Clock, HardHat } from 'lucide-react';
import { CompletionStatus } from '../types';

interface Props {
  completionStatus: CompletionStatus;
  estimatedSavings: number | null;
  isProject?: boolean;
  onComplete: (status: CompletionStatus) => void;
}

export default function CompletionPrompt({ completionStatus, estimatedSavings, isProject, onComplete }: Props) {
  if (completionStatus === 'completed_diy') {
    return (
      <div className="card completion-done-card">
        <div className="completion-done-inner">
          <span className="completion-done-emoji">🎉</span>
          <div>
            <div className="completion-done-title">Brilliant — well done!</div>
            {estimatedSavings !== null && estimatedSavings > 0 && (
              <div className="completion-done-saving">
                You saved an estimated <strong>£{estimatedSavings}</strong> by doing this yourself.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (completionStatus === 'completed_pro' || completionStatus === 'skipped') {
    return null;
  }

  return (
    <div className="card completion-prompt-card">
      <div className="completion-prompt-title">
        {isProject ? 'Did you complete this project yourself?' : 'Did you complete this repair yourself?'}
      </div>
      <div className="completion-btns">
        <button className="completion-btn completion-btn-yes" onClick={() => onComplete('completed_diy')}>
          <CheckCircle2 size={15} />
          <span>
            {isProject ? 'Yes, I completed it' : 'Yes, I fixed it'}
            {estimatedSavings !== null && estimatedSavings > 0 && (
              <span className="completion-saving-hint"> · save ~£{estimatedSavings}</span>
            )}
          </span>
        </button>
        <button className="completion-btn completion-btn-later" onClick={() => onComplete('skipped')}>
          <Clock size={15} />
          Not yet
        </button>
        <button className="completion-btn completion-btn-pro" onClick={() => onComplete('completed_pro')}>
          <HardHat size={15} />
          I hired a professional
        </button>
      </div>
    </div>
  );
}
