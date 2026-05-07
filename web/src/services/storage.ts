import { DiagnosisSession } from '../types';

const KEY = 'dimy_v1_sessions';

export interface IStorageService {
  getSessions(): DiagnosisSession[];
  getSession(id: string): DiagnosisSession | null;
  saveSession(session: DiagnosisSession): void;
  deleteSession(id: string): void;
  updateSession(id: string, updates: Partial<DiagnosisSession>): void;
}

class LocalStorageService implements IStorageService {
  private read(): DiagnosisSession[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as unknown[]).map((s) => {
        const o = s as Record<string, unknown>;
        return {
          ...o,
          mode: o.mode ?? 'repair_diagnosis',
          projectCategory: o.projectCategory ?? null,
          skillLevel: o.skillLevel ?? null,
          projectPlanState: o.projectPlanState ?? null,
        } as DiagnosisSession;
      });
    } catch {
      return [];
    }
  }

  private write(sessions: DiagnosisSession[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('[dimy:storage]', e);
    }
  }

  getSessions(): DiagnosisSession[] {
    return this.read().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getSession(id: string): DiagnosisSession | null {
    return this.read().find(s => s.id === id) ?? null;
  }

  saveSession(session: DiagnosisSession): void {
    const all = this.read();
    const idx = all.findIndex(s => s.id === session.id);
    if (idx >= 0) all[idx] = session;
    else all.unshift(session);
    this.write(all);
  }

  deleteSession(id: string): void {
    this.write(this.read().filter(s => s.id !== id));
  }

  updateSession(id: string, updates: Partial<DiagnosisSession>): void {
    const s = this.getSession(id);
    if (!s) return;
    this.saveSession({ ...s, ...updates, updatedAt: new Date().toISOString() });
  }
}

export const storage: IStorageService = new LocalStorageService();
