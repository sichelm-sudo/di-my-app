import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { diagnoseIssue } from '../services/claude';
import { DiagnoseRequest, DiagnoseImage } from '../types';

const router = Router();

function anthropicErrorMessage(err: unknown): { status: number; message: string } | null {
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: 'The AI is busy right now — please wait a moment and try again.' };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: 'Server configuration error: invalid API key. Contact support.' };
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { status: 504, message: 'The AI took too long to respond. Please try again — project plans sometimes need a second attempt.' };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, message: 'Could not reach the AI service. Check your internet connection and try again.' };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { status: 400, message: 'The request could not be processed — try reducing the number of photos or shortening your description.' };
  }
  if (err instanceof Anthropic.InternalServerError) {
    return { status: 502, message: 'The AI service returned an error. Please try again in a few moments.' };
  }
  return null;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { description, images, conversationHistory, location, skillLevel } = req.body as DiagnoseRequest;

  const hasImages = Array.isArray(images) &&
    images.some((img: DiagnoseImage) => typeof img?.imageBase64 === 'string' && img.imageBase64.length > 0);
  const hasDescription = typeof description === 'string' && description.trim().length > 0;

  if (!hasImages && !hasDescription) {
    res.status(400).json({ error: 'Please add a photo, a short description, or both.' });
    return;
  }

  const imgCount = Array.isArray(images) ? images.length : 0;
  console.log(`[/api/diagnose] ${new Date().toISOString()} — images: ${imgCount}, desc: ${hasDescription}, history: ${Array.isArray(conversationHistory) ? conversationHistory.length : 0} msgs`);

  try {
    const result = await diagnoseIssue({
      description: hasDescription ? (description as string).trim() : null,
      images: hasImages ? (images as DiagnoseImage[]) : [],
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      location: location ?? null,
      skillLevel: skillLevel ?? null,
    });

    console.log(`[/api/diagnose] OK — mode: ${result.mode}, status: ${result.status}`);
    res.json(result);
  } catch (err) {
    const anthropic = anthropicErrorMessage(err);
    if (anthropic) {
      console.error(`[/api/diagnose] Anthropic error (${anthropic.status}):`, err);
      res.status(anthropic.status).json({ error: anthropic.message });
      return;
    }

    console.error('[/api/diagnose] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (err instanceof SyntaxError) {
      res.status(502).json({ error: 'The AI returned an unparseable response. Please try again.' });
      return;
    }

    res.status(500).json({ error: `Something went wrong: ${message}` });
  }
});

export default router;
