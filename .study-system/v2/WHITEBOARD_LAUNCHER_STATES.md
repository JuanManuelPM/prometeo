# Whiteboard launcher state semantics

The topic-header whiteboard affordance has two deliberately different states.

## Empty

When no persistent learner-authored content exists for the topic:

- render only a compact action button inside the topic header;
- the button inherits the Study System theme (`var(--b)` / current ink);
- no white paper card, fake thumbnail, sample stroke or decorative placeholder is shown;
- the control must remain visually secondary to the topic title and recall check;
- accessible text may say `Abrir pizarrón`, but visible copy is optional when the icon is clear.

## Authored

Once the learner has saved at least one persistent mark/object:

- replace the empty action with the actual mnemonic preview;
- the preview is white because it represents the universal white paper;
- render the learner's own stored content, never a generic placeholder;
- the preview may become larger than the empty action because it is now study content, not chrome;
- clicking/tapping the preview reopens the same board.

## Semantic invariant

A visible white thumbnail means **“there is a mnemonic artifact here.”** It must never mean merely **“you could create one.”**
