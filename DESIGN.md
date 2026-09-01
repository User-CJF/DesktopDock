# DesktopDock Design System

## Direction

DesktopDock uses the selected **C · Windows 原生** direction as a right-edge desktop status bar. It should feel like a native Windows 11 companion surface rather than a conventional application window: glanceable, keyboard-friendly, compact, and predictable. Win10 receives solid-surface fallbacks rather than simulated blur.

## Mode

Operate. Users repeatedly launch, find, classify, and organize local items. Task speed and state clarity outrank expression.

## Visual World

- Windows Fluent structure with Mica for the main window and Acrylic only for transient search, menus, and protected dialogs.
- Neutral surfaces carry most of the interface. Brand blue marks focus, selection, and primary actions.
- Application icons and filenames are the strongest visual signals; containers remain quiet.
- No decorative gradients, glow, oversized radii, nested cards, or broad colored shadows.

## Tokens

### Color

| Role | Light | Dark |
| --- | --- | --- |
| Window | `#F3F4F7` | `#11121A` |
| Surface | `#FFFFFF` | `#1B1C28` |
| Secondary surface | `#EAECF1` | `#262736` |
| Primary text | `#1B1B22` | `#F0F0F4` |
| Secondary text | `#5D6470` | `#B7B7C7` |
| Border | `#DADDE4` | `#353647` |
| Accent | `#4F6BFF` | `#7A8FFF` |
| Accent surface | `rgba(79,107,255,.11)` | `rgba(122,143,255,.16)` |
| Success | `#21865B` | `#4BC38A` |
| Warning | `#A56300` | `#F3B454` |
| Danger | `#C42B1C` | `#FF6B62` |

### Typography

Use `Segoe UI Variable`, `Segoe UI`, and `Microsoft YaHei UI`. Page titles are 20px/600, section titles 16px/600, application and control labels 13px, supporting text 12px. Letter spacing remains `0`.

### Geometry

- Spacing: `4 / 8 / 12 / 16 / 24 / 32`.
- Window radius: 12px on Win11, square fallback on Win10.
- Cards, inputs, menus: 6–8px.
- Buttons: 6px.
- Controls: 32px visual height; pointer target never below 24px.
- Shadows: only transient layers use elevation. Ordinary content relies on spacing and 1px borders.

## Layout

- Production surface: fixed 392px width, positioned against the active display's right work-area edge.
- Status header: 48px with product state, clock, refresh, and tray-hide actions.
- Search: always available directly under the status header.
- Content: vertically scrollable desktop, application, file, and settings modules.
- Navigation: four-item bottom module switcher; no large sidebar or conventional command bar.
- Desktop shortcuts: four-column grid with progressive Shell icon hydration.

## Interaction

- `Alt+Space` opens search; `Esc` closes; arrow keys move selection; `Enter` opens the selected result; `Tab` switches result type only while the search input is focused.
- Active navigation uses both an accent rail and a surface change.
- Focus rings remain visible on every operable control.
- Consequential organization actions use a focused confirmation inside the status bar, create a restore point, report completion, and offer restoration.
- Closing the surface hides it to the tray; only the explicit settings action exits the process.
- Drag-based product capabilities must also have menu or button alternatives.

## Motion

- Search enters in 180ms and leaves in 120ms using deceleration/acceleration respectively.
- Hover and pressed feedback stays within 80–120ms.
- No bounce, overshoot, decorative entrance choreography, or layout-changing animation.
- `prefers-reduced-motion` disables non-essential movement.

## Responsive Behavior

The shipped target is a fixed-width Windows desktop status bar. Its height follows the active display work area between 560px and 920px, while internal content scrolls without horizontal overflow. The browser preview uses the same narrow composition.
