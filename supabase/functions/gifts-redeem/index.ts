// Retired 2026-08-15. Pass It On recipients now redeem Apple or Google Play
// annual subscription offer codes through the stores. Keeping a non-mutating
// tombstone at the old endpoint prevents older app builds from granting an
// entitlement outside store billing while producing a clear support signal.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, json } from '../_shared/gifts.ts';

serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return json(
    {
      success: false,
      reason: 'retired',
      message: 'This code system has been retired. Ask the sender for a new Pass It On link.',
    },
    410,
  );
});
