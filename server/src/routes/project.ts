import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { runStage1, runStage2, runStage3 } from '../services/project-stages';
import { ProjectStage1Request, ProjectStage2Request, ProjectStage3Request } from '../types';

const router = Router();

function anthropicErrMsg(err: unknown): string | null {
  if (err instanceof Anthropic.RateLimitError) return 'The AI is busy — please wait a moment and try again.';
  if (err instanceof Anthropic.APIConnectionTimeoutError) return 'The AI took too long to respond. Please try again.';
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service. Check your connection.';
  if (err instanceof Anthropic.BadRequestError) return 'The request was too large — try with fewer photos or a shorter description.';
  if (err instanceof Anthropic.InternalServerError) return 'The AI service returned an error. Please try again in a few moments.';
  return null;
}

router.post('/stage1', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ProjectStage1Request;
    const hasInput = (typeof body.description === 'string' && body.description.trim().length > 0)
      || (Array.isArray(body.images) && body.images.length > 0);
    if (!hasInput) {
      res.status(400).json({ error: 'Please provide a description or photo.' });
      return;
    }
    const result = await runStage1(body);
    console.log(`[/api/project/stage1] OK — mode: ${result.mode}, category: ${result.projectCategory}`);
    res.json(result);
  } catch (err) {
    const friendly = anthropicErrMsg(err);
    console.error('[/api/project/stage1]', err);
    res.status(500).json({ error: friendly ?? (err instanceof Error ? err.message : 'Stage 1 failed') });
  }
});

router.post('/stage2', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ProjectStage2Request;
    if (!body.stage1) { res.status(400).json({ error: 'stage1 context is required.' }); return; }
    const result = await runStage2(body);
    console.log(`[/api/project/stage2] OK — ${result.materials.length} materials, DIY cost: £${result.estimatedDIYCost}`);
    res.json(result);
  } catch (err) {
    const friendly = anthropicErrMsg(err);
    console.error('[/api/project/stage2]', err);
    res.status(500).json({ error: friendly ?? (err instanceof Error ? err.message : 'Material calculation failed') });
  }
});

router.post('/stage3', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ProjectStage3Request;
    if (!body.stage1 || !body.stage2) { res.status(400).json({ error: 'stage1 and stage2 context required.' }); return; }
    const result = await runStage3(body);
    console.log(`[/api/project/stage3] OK — ${result.shoppingList.length} items, ${result.steps.length} steps`);
    res.json(result);
  } catch (err) {
    const friendly = anthropicErrMsg(err);
    console.error('[/api/project/stage3]', err);
    res.status(500).json({ error: friendly ?? (err instanceof Error ? err.message : 'Shopping list generation failed') });
  }
});

export default router;
