// Pass It On — shared response, database, and subscription-state helpers.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// GET a RevenueCat subscriber (secret key). Returns the parsed body or null.
export async function fetchRcSubscriber(
  rcAppUserId: string,
  secretKey: string,
): Promise<any | null> {
  const res = await fetch(
    `${REVENUECAT_API_URL}/subscribers/${encodeURIComponent(rcAppUserId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!res.ok) return null;
  return await res.json();
}
