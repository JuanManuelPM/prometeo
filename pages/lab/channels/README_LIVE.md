# Channels live surface

- UI: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/
- Human setup: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/setup/
- Frontend contract: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/frontend-contract.json
- Backend: https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-api
- External work bridge: https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-work?schema=1

When a valid Prometeo Supabase session exists, the UI reads real channels/stories/videos/timeline data. Without a session it preserves the approved local simulation instead of exposing backend state.

External story work returns are automatically applied transactionally if the story version has not changed. Paid video generation remains disabled until an explicit spend policy is saved.
