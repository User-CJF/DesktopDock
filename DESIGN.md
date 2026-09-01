# DesktopDock Design System

## Direction

DesktopDock uses the selected **C · Windows 原生** direction. The interface should feel like a focused Windows 11 utility: content-first, keyboard-friendly, compact, and predictable. Win10 receives solid-surface fallbacks rather than simulated blur.

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

- Title bar: 42px.
- Primary navigation: 152px, collapses to 62px below 800px.
- Command bar: 52px.
- Content padding: 24px desktop, 16px compact.
- Frequent applications: stable eight-item grid.
- Category content: repeated category items may use restrained bordered cards; page sections remain unframed.

## Interaction

- `Alt+Space` opens search; `Esc` closes; arrow keys move selection; `Enter` opens the selected result; `Tab` switches result type only while the search input is focused.
- Active navigation uses both an accent rail and a surface change.
- Focus rings remain visible on every operable control.
- Desktop organization always previews changes, creates a restore point by default, reports progress, and offers undo after completion.
- Drag-based product capabilities must also have menu or button alternatives.

## Motion

- Search enters in 180ms and leaves in 120ms using deceleration/acceleration respectively.
- Hover and pressed feedback stays within 80–120ms.
- No bounce, overshoot, decorative entrance choreography, or layout-changing animation.
- `prefers-reduced-motion` disables non-essential movement.

## Responsive Behavior

The shipped target is a resizable Windows desktop window with a 720px minimum width. Below 800px the navigation becomes icon-only and content grids reduce columns. A narrow web preview remains operable for review, but it does not redefine the product as a mobile app.

