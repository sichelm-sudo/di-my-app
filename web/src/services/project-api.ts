import {
  ProjectStage1Request, ProjectStage1Result,
  ProjectStage2Request, ProjectStage2Result,
  ProjectStage3Request, ProjectStage3Result,
} from '../types';

const API_BASE = 'http://localhost:3001';

async function callProject<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/project/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('This step timed out — please try again.');
      }
      throw new Error('Could not reach the DI-MY server. Make sure it is running on port 3001.');
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Unexpected server response (HTTP ${response.status}). Please try again.`);
    }
    if (!response.ok) {
      throw new Error((data as { error: string }).error || `Server error: ${response.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(id);
  }
}

export function projectStage1(req: ProjectStage1Request): Promise<ProjectStage1Result> {
  return callProject<ProjectStage1Result>('stage1', req, 30_000);
}

export function projectStage2(req: ProjectStage2Request): Promise<ProjectStage2Result> {
  return callProject<ProjectStage2Result>('stage2', req, 60_000);
}

export function projectStage3(req: ProjectStage3Request): Promise<ProjectStage3Result> {
  return callProject<ProjectStage3Result>('stage3', req, 90_000);
}
