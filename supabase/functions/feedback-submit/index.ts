// Supabase Edge Function: feedback-submit
//
// Receives app feedback, stores it in the app_feedback table, and emails a
// copy to soberdailies@gmail.com via Resend. The email is best-effort: if
// Resend fails (or RESEND_API_KEY isn't configured), the row is still saved
// and the request still succeeds — the table is the source of truth.
//
// Required Supabase Secrets:
// - RESEND_API_KEY: Resend API key (starts with re_). Until the soberdailies.com
//   domain is verified in Resend, mail sends from onboarding@resend.dev and can
//   only be delivered to the Resend account owner's address — sign up with
//   soberdailies@gmail.com.
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: Auto-provided by Supabase.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FEEDBACK_TO = 'soberdailies@gmail.com';
const FEEDBACK_FROM = 'Sober Dailies <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  anonymous_id: string;
  feedback_text: string;
  contact_info: string;
  app_version?: string | null;
  build_number?: string | null;
  platform?: 'ios' | 'android' | null;
  device_model?: string | null;
  os_version?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
  font_scale?: number | null;
  manufacturer?: string | null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const feedbackText = body.feedback_text?.trim();
    const contactInfo = body.contact_info?.trim();

    if (!body.anonymous_id || !feedbackText) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: anonymous_id, feedback_text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await supabase.from('app_feedback').insert({
      anonymous_id: body.anonymous_id,
      feedback_text: feedbackText,
      contact_info: contactInfo || null,
      app_version: body.app_version ?? null,
      build_number: body.build_number ?? null,
      platform: body.platform ?? null,
      device_model: body.device_model ?? null,
      os_version: body.os_version ?? null,
      screen_width: body.screen_width ?? null,
      screen_height: body.screen_height ?? null,
      font_scale: body.font_scale ?? null,
      manufacturer: body.manufacturer ?? null,
    });

    if (insertError) {
      console.error('[feedback-submit] Insert failed:', insertError);
      return new Response(
        JSON.stringify({ success: false, message: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Best-effort email notification — never fails the request.
    let emailed = false;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[feedback-submit] RESEND_API_KEY not set — feedback saved, email skipped');
    } else {
      try {
        const meta = [
          body.platform,
          body.app_version && `v${body.app_version}`,
          body.build_number && `build ${body.build_number}`,
        ].filter(Boolean).join(' · ');
        // Troubleshooting block (Daily Paths style): OS, model, screen, font scale.
        const deviceLines = [
          body.os_version,
          [body.manufacturer, body.device_model].filter(Boolean).join(' '),
          body.screen_width && body.screen_height && `${body.screen_width}×${body.screen_height}`,
          body.font_scale != null && `Font ${body.font_scale}×`,
        ].filter(Boolean) as string[];
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FEEDBACK_FROM,
            to: [FEEDBACK_TO],
            reply_to: contactInfo || undefined,
            subject: `App feedback${meta ? ` (${meta})` : ''}`,
            html: [
              `<p style="white-space:pre-wrap">${escapeHtml(feedbackText)}</p>`,
              '<hr>',
              `<p style="color:#666;font-size:13px">From: ${escapeHtml(contactInfo || 'no email given')}<br>`,
              `${escapeHtml(meta || 'unknown')}<br>`,
              ...deviceLines.map((l) => `${escapeHtml(l)}<br>`),
              `Anonymous ID: ${escapeHtml(body.anonymous_id)}</p>`,
            ].join('\n'),
          }),
        });
        if (res.ok) {
          emailed = true;
        } else {
          console.error('[feedback-submit] Resend error:', res.status, await res.text());
        }
      } catch (e) {
        console.error('[feedback-submit] Email send failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[feedback-submit] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Unexpected error: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
