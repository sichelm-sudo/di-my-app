import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { DiagnosisSession, CompletionStatus } from '../types';

const STATUS_DOT: Record<string, string> = {
  ready_for_repair: '#27ae60',
  planning_complete: '#27ae60',
  needs_more_info: '#e67e22',
  needs_measurements: '#3498db',
  call_professional: '#c0392b',
};

const COMPLETION_BADGE: Record<CompletionStatus, string> = {
  pending: '',
  completed_diy: '✓',
  completed_pro: '🔧',
  skipped: '',
};

interface SidebarItemProps {
  session: DiagnosisSession;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

interface Props {
  sessions: DiagnosisSession[];
  currentSessionId: string | null;
  totalSavings: number;
  isOpen: boolean;
  onSelectSession: (s: DiagnosisSession) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onClose: () => void;
}

export default function HistorySidebar({
  sessions, currentSessionId, totalSavings, isOpen,
  onSelectSession, onNewSession, onDeleteSession, onRenameSession, onClose,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function startRename(s: DiagnosisSession) {
    setRenamingId(s.id);
    setRenameValue(s.title);
  }

  function confirmRename(id: string) {
    if (renameValue.trim()) onRenameSession(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  const groups = groupByDate(sessions);

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">DI-MY</span>
            <span className="sidebar-tagline">DIY Repair Assistant</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <button className="sidebar-new-btn" onClick={onNewSession}>
          <Plus size={15} />
          New diagnosis
        </button>

        {totalSavings > 0 && (
          <div className="sidebar-savings-chip">
            <span>💰</span>
            <span>£{totalSavings} saved</span>
          </div>
        )}

        <div className="sidebar-sessions">
          {sessions.length === 0 ? (
            <div className="sidebar-empty">
              No previous diagnoses yet.<br />Start by describing your problem.
            </div>
          ) : (
            groups.map(([label, items]) => (
              <div key={label} className="sidebar-group">
                <div className="sidebar-group-label">{label}</div>
                {items.map(s => (
                  <SidebarItem
                    key={s.id}
                    session={s}
                    isActive={s.id === currentSessionId}
                    isRenaming={renamingId === s.id}
                    renameValue={renameValue}
                    onRenameValueChange={setRenameValue}
                    onSelect={() => onSelectSession(s)}
                    onStartRename={() => startRename(s)}
                    onConfirmRename={() => confirmRename(s.id)}
                    onCancelRename={cancelRename}
                    onDelete={() => onDeleteSession(s.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  session: s, isActive, isRenaming, renameValue, onRenameValueChange,
  onSelect, onStartRename, onConfirmRename, onCancelRename, onDelete,
}: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);
  const dotColor = s.status ? (STATUS_DOT[s.status] ?? '#888') : '#888';
  const badge = COMPLETION_BADGE[s.completionStatus];

  if (isRenaming) {
    return (
      <div className={`sidebar-item${isActive ? ' active' : ''}`}>
        <input
          className="sidebar-rename-input"
          value={renameValue}
          onChange={e => onRenameValueChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onConfirmRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
        />
        <div className="sidebar-rename-actions">
          <button className="sidebar-action-btn" onClick={onConfirmRename} aria-label="Confirm">
            <Check size={13} />
          </button>
          <button className="sidebar-action-btn" onClick={onCancelRename} aria-label="Cancel">
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  const showActions = hovered || isActive;

  return (
    <div
      className={`sidebar-item${isActive ? ' active' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div className="sidebar-item-content">
        {s.imageThumbnails.length > 0 && (
          <img src={s.imageThumbnails[0]} className="sidebar-thumb" alt="" />
        )}
        <div className="sidebar-item-text">
          <div className="sidebar-item-title">{s.title}</div>
          <div className="sidebar-item-meta">
            <span className="sidebar-status-dot" style={{ background: dotColor }} />
            <span className="sidebar-item-date">{formatRelDate(s.updatedAt)}</span>
            {badge && <span className="sidebar-completion-badge">{badge}</span>}
          </div>
        </div>
      </div>
      {showActions && (
        <div className="sidebar-item-actions" onClick={e => e.stopPropagation()}>
          <button className="sidebar-action-btn" onClick={onStartRename} title="Rename">
            <Pencil size={12} />
          </button>
          <button className="sidebar-action-btn danger" onClick={onDelete} title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatRelDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function groupByDate(sessions: DiagnosisSession[]): [string, DiagnosisSession[]][] {
  const map = new Map<string, DiagnosisSession[]>();
  for (const s of sessions) {
    const key = groupLabel(s.updatedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

function groupLabel(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  if (diff < 30) return 'This month';
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
