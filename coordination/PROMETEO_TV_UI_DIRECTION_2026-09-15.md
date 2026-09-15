# Prometeo TV UI direction — 2026-09-15

Status: ACTIVE EXPERIMENT / NOT HUMAN ACCEPTED

Current design correction:

- Bottom dock is the application launcher.
- Keep only YouTube, Texto and Pomodoro for now.
- Remove Spotify and Chess placeholders.
- YouTube opens by default to one mixed Recientes feed from every configured channel.
- The top-level YouTube navigation is only Recientes / Canales / Categorías. Do not add duplicate controls such as “Últimos de todos”.
- Progressive disclosure: show only the options relevant to the selected section. Avoid horizontal rows of every possible filter at once.
- Avoid generic AI-dashboard styling, excessive pills/bubbles and decorative controls. Prefer flat lists, separators, clear hierarchy and app-like navigation.
- YouTube Shorts remain filtered by backend heuristics.
- Texto remains a small local text-to-speech utility.
- Pomodoro is a first-class local app: adjustable work/break durations, timer state that survives navigation, local tasks, completion timestamp and fast task capture by text or voice.
- Recurring household tasks (cadence, last completion, overdue logic) are explicitly future work; current task records already preserve `lastDone` as groundwork.

Public experiment:
`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-tv-simple/`

Do not promote to Human Accepted until the revised UI and voice-task flow are physically tested on the phone.