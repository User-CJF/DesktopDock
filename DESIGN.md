---
name: DesktopDock
description: Windows 桌面右侧的透明信息仓与快捷方式启动面板
colors:
  dark-card: "rgba(31, 43, 47, 0.78)"
  light-card: "rgba(235, 247, 252, 0.82)"
  dark-text: "#f4f8f9"
  light-text: "#162126"
  accent-dark: "#55b9ed"
  accent-light: "#0078d4"
  dark-muted: "#92a3a8"
  light-muted: "#596b73"
  border-dark: "rgba(210, 232, 238, 0.16)"
  border-light: "rgba(82, 117, 132, 0.2)"
typography:
  display:
    fontFamily: "PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Segoe UI Variable Text, Segoe UI, sans-serif"
    fontSize: "25px"
    fontWeight: 680
    lineHeight: 1
    letterSpacing: "0"
  title:
    fontFamily: "PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Segoe UI Variable Text, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 620
    lineHeight: 1.2
  body:
    fontFamily: "PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Segoe UI Variable Text, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Segoe UI Variable Text, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "3px"
  sm: "4px"
  md: "7px"
  lg: "10px"
components:
  glass-card:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: "7px"
  search-rail:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    height: "38px"
---

# Design System: DesktopDock

## Overview

**Creative North Star: "The Desktop Information Wall"**

DesktopDock is a quiet, dense Windows companion surface attached to the desktop edge. The wallpaper remains visible beside it and subtly passes through its Acrylic layers. The interface is for repeated glances and quick actions, so content leads, cards stay compact, and the product avoids the visual grammar of a full management window.

**Key Characteristics:**
- Right-edge, full-work-area Acrylic surface with no titlebar or bottom navigation.
- 4px seams, 6px card corners, hairline environment-colored borders.
- Native Fluent controls and real Windows Shell application icons.
- A responsive 58/42 compact grid and 35/34/31 wide grid.

## Colors

The palette is restrained: cool translucent surfaces, one blue interaction accent, and separate readable muted tones for light and dark wallpaper scenes.

### Primary
- **Desktop Blue** (`#0078d4` light, `#55b9ed` dark): focus, active controls, weather and card actions.

### Neutral
- **Acrylic Light** (`rgba(235,247,252,.82)`): light card surface.
- **Acrylic Dark** (`rgba(31,43,47,.78)`): dark card surface.
- **Ink Light** (`#162126`) and **Ink Dark** (`#f4f8f9`): primary text.
- **Muted Light** (`#596b73`) and **Muted Dark** (`#92a3a8`): supporting text with readable contrast.
- **Hairline Light/Dark** (`rgba(82,117,132,.2)` / `rgba(210,232,238,.16)`): card and control boundaries.

**The Wallpaper-Through Rule.** The panel canvas and ordinary cards remain translucent; wallpaper is part of the visual scene and must not be replaced by an opaque app background.

## Typography

**Display Font:** PingFang SC (with Microsoft YaHei UI, Microsoft YaHei, Segoe UI Variable Text, and Segoe UI fallbacks)
**Body Font:** PingFang SC (with the same Windows-safe fallback chain)
**Label/Mono Font:** system UI numerals with tabular figures where time or weather data changes.

**Character:** Native, compact, and information-first. Large type is reserved for temperature and time. Users can select a 10–16px global base size and five weights from 300–700; text roles scale proportionally while Fluent and application icons retain fixed dimensions.

### Hierarchy
- **Display** (680, 18–25px, 1): weather temperature and compact clock.
- **Title** (620, 12px, 1.2): card titles and primary controls.
- **Body** (400–550, 10–11px, 1.4): task, note, file, and media text.
- **Label** (500, 10px, 1.2): application names and secondary metadata.

## Layout

The Electron window is positioned against the active display's right work-area edge and fills the height above the taskbar. Production width is approximately 41% of the work area, clamped to 460–560px. The search rail is 38px high. Below it, cards sit in a single scrolling region with 4px gaps.

At 460–519px, the dashboard starts from a 58/42 two-zone composition. At 520–560px it starts from three equal logical zones. A dense 10/12-track grid lets cards snap across multiple tracks while a continuous height is stored per mode; neighboring cards automatically reflow. Card order, zone placement, and custom size are stored per mode, and user categories are added to the same wall without automatic classification.

## Elevation & Depth

Depth comes from Acrylic blur and tonal layering, not heavy shadows. Cards use 22px backdrop blur and a low-opacity 4px/12px separation shadow. Dialogs and search results may use a stronger transient shadow and a 6px scrim blur.

**The Quiet Elevation Rule.** Resting cards use a hairline border and translucency; shadows are only strong enough to separate transient layers.

## Shapes

The shape language is compact and rectangular: 6px card corners, 4px control corners, 1px environment-colored borders, and no oversized pills. Icon tiles reserve fixed cells so long names wrap to two lines without moving neighboring icons.

## Components

### Buttons
- **Shape:** compact 4px corners with 24–28px visual targets.
- **Primary:** Windows blue for save/action states; controls use icon plus a visible tooltip/aria label where text is not present.
- **Hover / Focus:** a subtle surface highlight and a 2px visible focus ring; no scale or layout shift.

### Cards / Containers
- **Corner Style:** 6px.
- **Background:** Acrylic Light or Acrylic Dark with 22px blur.
- **Shadow Strategy:** low ambient separation only; dialogs/search may elevate.
- **Border:** 1px translucent environment-colored line.
- **Internal Padding:** 7px with 4px inter-card seams.

### Inputs / Fields
- **Style:** transparent input inside the 38px search rail, or a 4px bordered field in dialogs.
- **Focus:** visible blue outline and preserved caret; Escape clears search or closes a dialog.

### Navigation
- **Style:** no persistent navigation. Module access is represented by simultaneous cards; card menus provide reordering, hiding, collapsing, resizing, and category deletion.

### Shortcut Grid
- **Signature:** real Windows Shell icon data, fixed 29px icon cell, 10px label, two-line clamp, drag-to-classify with menu and keyboard alternatives.

## Do's and Don'ts

### Do:
- **Do** keep the panel anchored to the right desktop layer and leave wallpaper visible on the left.
- **Do** preserve 4px gaps, 6px corners, native Fluent glyphs, and real shortcut icons.
- **Do** offer keyboard actions for every drag action, including card movement and shortcut categorization.
- **Do** test both 460px dark and 540px light states for overflow and contrast.

### Don't:
- **Don't** add a conventional titlebar, sidebar, bottom navigation, or opaque full-panel background.
- **Don't** use decorative gradients, thick borders, oversized shadows, emoji structural icons, or scaled hover effects.
- **Don't** auto-classify user shortcuts; categories are created and removed by the user.
