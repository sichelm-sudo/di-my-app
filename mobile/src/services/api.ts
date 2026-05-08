import { DiagnoseResponse, ApiError } from '../types';

const API_BASE_URL = 'https://di-my-app-production.up.railway.app';

export async function diagnoseIssue(
  imageBase64: string | null,
  mimeType: string | null,
  description: string
): Promise<DiagnoseResponse> {
  const response = await fetch(`${API_BASE_URL}/api/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageBase64, mimeType, description }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || `Server error: ${response.status}`);
  }

  return data as DiagnoseResponse;
}
