# For Rork Support - API Endpoint Issue

## Issue Summary
The endpoint `https://toolkit.rork.com/text/llm/` is returning `500 Internal Server Error` for all requests.

## Error Details
- **Status Code**: 500
- **Response Body**: `Internal Server Error` (plain text, not JSON)
- **Response Headers**:
  ```
  content-type: text/plain; charset=UTF-8
  server: cloudflare
  x-do-orig-status: 500
  ```

## Request Format (What We're Sending)
```json
{
  "messages": [
    {
      "role": "user",
      "content": "[FULL SYSTEM PROMPT]\n\nUser: [user's actual message]"
    }
  ]
}
```

**Notes**:
- We're using `role: "user"` and `role: "assistant"` only (NO `role: "system"`)
- This follows the workaround from Sept 25, 2025 when you made a breaking change
- The system prompt is prepended to the first user message
- Subsequent messages in the conversation don't include the prompt

## Timeline
1. **Before Sept 25**: Used `role: "system"` - worked fine
2. **Sept 25**: Rork breaking change - system role no longer accepted
3. **Sept 25**: Implemented workaround - stuff prompt in user message
4. **Sept 25 - Oct 22**: This workaround worked fine
5. **Oct 22**: Now getting 500 errors with same format

## Example Request That's Failing
```bash
curl -X POST https://toolkit.rork.com/text/llm/ \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "You are a helpful AA sponsor...[3000+ character prompt]...\n\nUser: Hello"
      }
    ]
  }'
```

## What Changed on Our Side
**Nothing that affects the API request format.** We refactored the UI:
- Added sponsor selection screen
- Modified navigation
- Changed header layout

But the `convertToAPIMessages()` function and API call logic **remained identical** to what was working before.

## What We Need
1. Server-side logs for requests to `/text/llm/` endpoint
2. Confirmation of expected request format
3. Timeline of when this started failing
4. Any recent changes to the endpoint

## Questions
1. Did the endpoint change again recently?
2. Is there a new required format?
3. Should we go back to using `role: "system"`?
4. Is there a character limit on message content?
5. Are there any authentication requirements now?

## Contact
App: Sober Dailies (iOS)  
Developer: nealw98@gmail.com  
Date Reported: October 22, 2025

