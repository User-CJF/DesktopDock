# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

The production application uses Electron + Vue 3 + Vite on Windows 10/11. `prototype/` preserves the three-way comparison and `final/` remains the browser-safe selected interface; the production renderer progressively uses the secure Electron preload bridge.

## Users

Desktop users with many installed applications and files, especially developers, designers, and other keyboard-oriented knowledge workers who frequently switch tools.

## Product Purpose

DesktopDock adds a compact right-edge desktop status bar for launching and organizing local content without opening a conventional management window. It combines global search, desktop shortcuts, applications, recent files, desktop organization, and settings in one tray-first local utility.

## Positioning

DesktopDock unifies instant keyboard-first launch and ongoing desktop organization. It is not only a launcher and not only a file organizer.

## Operating Context

- Invoked repeatedly for a few seconds at a time through `Alt+Space` or the system tray.
- Used in Windows 10/11 alongside installed applications, Start menu shortcuts, desktop files, and system settings.
- The right-edge status bar stays within a 392px footprint; desktop, application, file, and settings modules switch in place.
- Closing the surface hides it to the tray. Global shortcuts or the tray icon reveal it again.

## Capabilities and Constraints

- Search applications, files, and settings with keyboard navigation.
- Show desktop shortcuts directly in the sidebar and load Windows Shell icons progressively.
- Create, edit, reorder, and open application categories.
- Organize desktop items with a preview, restore point, progress, and undo path.
- Show recent files and favorite folders.
- Support light, dark, and system themes, high DPI, and reduced motion.
- Keep user data local and target Windows 10/11.
- Windows Start Menu and desktop application scanning, SQLite persistence, usage counts, pinning, custom-category management, Windows Shell icon extraction/cache, secure Electron IPC, and real application launching are implemented.
- Metadata-only file indexing, recent-file search/opening, favorite folders, transactional desktop file organization, collision-safe undo, settings persistence, login startup, shortcut re-registration, and configuration import/export are implemented.
- Desktop file organization never moves folders or ordinary files. The separate shortcut vault moves current-user and public desktop shortcut files when Windows permissions allow, preserves Windows system icons, records failures per item, and supports collision-safe restoration. Automated tests use temporary directories; the Electron smoke test performs only a read-only desktop preview.

## Brand Commitments

- Product name: `桌面舱 DesktopDock`.
- Primary accent: `#4F6BFF`.
- Chinese UI copy should be direct and compact.
- Category emoji are permitted by the supplied specifications; structural and control icons use the Windows Fluent icon font.

## Evidence on Hand

- `桌面舱 DesktopDock — UI  UX 视觉与设计规范说明书.md`
- `桌面舱DesktopDock_UI设计文档.md`
- `DesktopDock_UI设计文档.docx`
- `桌面舱DesktopDock_完整开发文档.md`
- Native smoke screenshots are generated in `dist/electron-*.png`; no testimonials or externally sourced performance claims are used.

## Product Principles

- Complete the launch/search task without interrupting the user's flow.
- Keep keyboard and pointer workflows equally clear.
- Let application and file content lead; interface decoration stays secondary.
- Make organization actions reversible and explain consequential changes before execution.
- Feel at home on Windows before trying to look distinctive.

## Accessibility & Inclusion

- All operable controls require visible keyboard focus and meaningful accessible names.
- Text and control contrast target WCAG AA.
- Reduced-motion preferences must disable non-essential transitions.
