# Fidelity ledger

Accepted references:

- `popup-concept.png`
- `options-concept.png`

Verified browser renders:

- `popup-render.png` at 384 × 560
- `options-render.png` at 1280 × 800
- `options-mobile-render.png` at 390px wide, full-page capture

| Comparison point | Reference evidence | Render evidence | Result |
| --- | --- | --- | --- |
| Copy and hierarchy | Original Slash/Ready header, test area, Commands list, two actions | Same hierarchy; brand intentionally changed to /Expander | Updated by request |
| Palette | True white, near-black, cool gray rules, coral accent, green status | Exact token family used across both surfaces | Matched |
| Container model | Open list rows and one divided editor workspace | No dashboard cards; list and editor remain flat | Matched |
| Typography | Compact Inter/Geist-style sans with deliberate control sizes | System Inter/Geist stack and explicit sizes on every control | Matched |
| Popup viewport | Complete surface with footer at the bottom | Footer and primary actions visible at 384 × 560 | Matched after spacing repair |
| Options viewport | Two columns with utilities and sync footer visible | Fixed desktop workspace keeps the full footer visible at 1280 × 800 | Matched after viewport repair |
| Icons | Coral slash mark, thin chevrons, search and directional arrows | Deterministic SVG/PNG mark and consistent 1.6–1.8px SVG strokes | Matched |
| Responsive behavior | Practical continuation implied by the implementation brief | Columns collapse cleanly below 760px with open vertical flow | Verified |

Intentional functional deviation: the reference shows `/` as a visually fixed prefix. The implementation makes that prefix field editable so the MVP fulfills the requested custom-prefix behavior. A short help line explains the control.

Above-the-fold copy diff: the requested `/Expander` brand replaces `Slash`, the options page adds the functional help line “Choose any punctuation prefix and a command without spaces,” and empty states replace seeded sample commands.
