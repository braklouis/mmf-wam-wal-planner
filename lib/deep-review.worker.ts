import { deepReview, type ReviewInput } from './deep-review.ts';
self.onmessage = (event: MessageEvent<ReviewInput>) => {
  try { self.postMessage({ report: deepReview(event.data) }); }
  catch { self.postMessage({ error: true }); }
};
