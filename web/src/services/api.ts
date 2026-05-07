import { DiagnoseRequest, DiagnoseResponse, ApiError } from '../types';

const API_BASE_URL = 'http://localhost:3001';

// Project planning responses are large — allow up to 2 minutes before aborting
const TIMEOUT_MS = 120_000;

export async function diagnoseIssue(request: DiagnoseRequest): Promise<DiagnoseResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        throw new Error(
          'The request timed out — project plans can take up to 60 seconds. Please try again.',
        );
      }
      // TypeError: Failed to fetch — server not reachable or connection reset
      throw new Error(
        'Could not reach the DI-MY server. Make sure the server is running on port 3001, then try again.',
      );
    }

    // Handle non-JSON responses (e.g. Express body-too-large HTML error pages)
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (response.status === 413) {
        throw new Error(
          'Your photos are too large to send. Try reducing the number of photos or use lower-resolution images.',
        );
      }
      throw new Error(`Unexpected server response (HTTP ${response.status}). Please try again.`);
    }

    if (!response.ok) {
      throw new Error((data as ApiError).error || `Server error: ${response.status}`);
    }

    return data as DiagnoseResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}
