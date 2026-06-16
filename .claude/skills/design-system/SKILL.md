---
name: design-system
description: "The Launchpad platform's complete UX/UI design system — colors, typography, components, animations, layout rules, and interaction patterns. Use this skill whenever building, editing, or reviewing any UI component, page, or feature for The Launchpad. This includes: creating new pages (admin or learner), adding components, modifying styles, building modals or forms, adding animations, working with cards or list items, styling notifications, implementing gamification UI (XP bars, badges, confetti, level-up), or any frontend work in this Next.js/Tailwind/Framer Motion codebase. If the task touches JSX, Tailwind classes, or visual output in this project, consult this skill first to ensure consistency."
---

# Launchpad Design System & UX-UI Guide

Follow these patterns exactly when building any page, component, or feature for The Launchpad. Visual consistency is non-negotiable — every color, radius, spacing, and animation choice below was established across the production app and must stay coherent.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS with custom theme extensions (`tailwind.config.js`)
- **Animation:** Framer Motion (spring-based physics, never CSS transitions for interactive elements)
- **Icons:** Lucide React (consistent 13-18px sizing)
- **Utility:** `cn()` from `lib/utils.ts` (clsx + tailwind-merge) — use for all conditional class merging
- **Confetti:** canvas-confetti for celebration moments

---

## Color System

### Brand Palette (Purple)

The brand is purple. Every primary action, active state, and accent uses this palette.

```
brand-50:  #F0ECFF   (tinted backgrounds)
brand-100: #E4DEFF   (borders, soft bg — the default card border)
brand-200: #C9BBFF
brand-300: #A897FF
brand-400: #8B72FF   (accent text, section labels)
brand-500: #6C47FF   (focus rings)
brand-600: #5B38F5   (primary buttons, active nav, accent lines) ← PRIMARY
brand-700: #4829E0   (hover states on primary buttons)
brand-800: #3520C4
brand-900: #1A1033   (ink / headings — all primary text uses this) ← TEXT PRIMARY
```

### Coral Palette (Orange/Warm)
```
coral-50:  #FFF3EE
coral-100: #FFE4D5
coral-400: #FF8A5B
coral-500: #FF6B35   (project highlights)
coral-600: #E55520
```

### Semantic Colors — never swap these meanings
```
Success:   #10B981 (emerald-500) — completed states, green borders, checkmarks
Warning:   #F59E0B (amber-500) — badges, gold accents, celebration gradients
Error:     #EF4444 (red-500) — danger buttons, error states, AI-generated flags
Info:      #3B82F6 (blue-500) — retry grants, info badges
```

### CSS Custom Properties (globals.css)
```css
--bg-page:       #F8F6FF        (learner page background — light lavender)
--bg-hero:       linear-gradient(145deg, #EDEAFF 0%, #F5F3FF 50%, #FAFAFE 100%)
--border-soft:   #E4DEFF        (default card/section borders)
--text-ink:      #1A1033        (primary text color)
--brand-primary: #5B38F5        (brand accent)
```

### Category Tag Colors
```
tech:       border #5B38F5, bg #F0ECFF, text #4829E0
marketing:  border #f97316, bg #fff7ed, text #c2410c
```

### Notification Type Colors
```
project_graded:      bg #ECFDF5, border #BBF7D0 (green)
badge_earned:        bg #FEFCE8, border #FDE68A (yellow)
retry_granted:       bg #EFF6FF, border #BFDBFE (blue)
reminder_quiz:       bg #FFF7ED, border #FED7AA (orange)
reminder_project:    bg #FFF7ED, border #FED7AA (orange)
reminder_reflection: bg #F5F3FF, border #E4DEFF (purple)
ungraded_submission: bg #FFF7ED, border #FED7AA (orange)
at_risk_learner:     bg #FEF2F2, border #FECACA (red)
new_submissions:     bg #F0FDF4, border #BBF7D0 (green)
```

---

## Typography

- **Headings:** `font-black` or `font-bold`, color `#1A1033` (brand-900)
- **Section labels:** `text-[10px] font-bold uppercase tracking-widest` in `text-brand-400` or `text-gray-400`
- **Body text:** `text-sm text-gray-500` or `text-xs text-gray-400`
- **Stat numbers:** `tabular-nums` for alignment
- **Truncation:** `line-clamp-2` for descriptions, `truncate` for single lines

---

## Spacing & Layout

### Learner Pages
- Navbar fixed top, `h-14`, `bg-white/90 backdrop-blur-md`, border `1px solid #E4DEFF`
- Content: `max-w-7xl mx-auto px-4 pt-20` (accounts for fixed nav)
- Background: `#F8F6FF` (page-bg / light lavender)

### Admin Pages
- Fixed sidebar left, `w-60`, `bg-gray-900`
- Content area: `ml-60 flex-1 p-8`
- Background: `bg-gray-50`

### Card Patterns

**Standard learner card:**
```
bg-white rounded-2xl p-6
border: 1.5px solid #E4DEFF
box-shadow: 0 2px 12px rgba(91,56,245,0.06)
```

**Admin list card:**
```
bg-white rounded-xl border border-gray-200 hover:border-brand-300 transition-colors
padding: p-5
```

**Completed card:**
```
border: 1.5px solid #10B981
hover shadow: rgba(16,185,129,0.18)
```

---

## Component Library

Reuse these existing components — do not create duplicates.

### Button (`components/ui/Button.tsx`)
Variants: `primary` | `secondary` | `danger` | `ghost`
Sizes: `sm` (px-3 py-1.5) | `md` (px-4 py-2) | `lg` (px-6 py-3)
- Primary: `bg-brand-600 text-white hover:bg-brand-700`
- Secondary: `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`
- Danger: `bg-red-600 text-white hover:bg-red-700`
- Ghost: `text-gray-600 hover:bg-gray-100`
- Focus ring: `focus:ring-2 focus:ring-brand-500`
- Always `rounded-lg`

### Modal (`components/ui/Modal.tsx`)
- Backdrop: `bg-black/50`, click outside to close
- Container: `bg-white rounded-2xl shadow-xl`
- Sizes: sm (max-w-sm), md (max-w-lg), lg (max-w-2xl)
- Header: `px-6 py-4 border-b` with title + X close button (lucide X icon)
- Body: `p-6`

### NotificationBell (`components/ui/NotificationBell.tsx`)
- Bell icon 17px in `w-8 h-8 rounded-xl` container
- Unread badge: `bg-red-500 text-white text-[9px] font-black`, animated with spring
- Dropdown: `w-80 bg-white rounded-2xl`, shadow `0 8px 32px rgba(91,56,245,0.12)`
- Border: `1px solid #E4DEFF`
- Supports `placement="bottom-right"` (default) or `placement="right"` (for sidebar)

### XPBar (`components/ui/XPBar.tsx`)
- Track: `h-2 bg-white/20 rounded-full`
- Fill: gradient `#818cf8 → #6366f1 → #7c3aed`, animated width with spring
- Uses `useCountUp` hook for number animation

### XPGainToast (`components/ui/XPGainToast.tsx`)
- Pill: `bg-brand-600 text-white text-sm font-bold px-3.5 py-2 rounded-full`
- Shadow: `shadow-lg shadow-brand-500/30`
- Lightning icon (Zap): `text-yellow-300`
- Float-up animation, auto-dismiss after 900ms

### BadgeUnlockModal (`components/ui/BadgeUnlockModal.tsx`)
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Card: `bg-white rounded-3xl p-8 text-center max-w-xs`
- Badge circle: `w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500`
- SVG sparkle stars around badge
- CTA: `bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl`
- Fires confetti on open

### LevelUpOverlay (`components/ui/LevelUpOverlay.tsx`)
- Larger than badge modal: `p-10 max-w-sm rounded-3xl`
- Gradient per level: 1=gray, 2=blue, 3=indigo, 4=purple, 5=pink, 6=amber, 7=yellow
- Pulsing glow ring behind card
- CTA: `bg-gradient-to-r from-brand-600 to-purple-600`
- Auto-closes after 4 seconds, fires "celebration" confetti (double-burst)

### ConfettiCannon (`components/ui/ConfettiCannon.tsx`)
- `useConfetti()` hook returns a `fire(intensity)` function
- Two intensities: `medium` (60 particles, centered) and `celebration` (2x 80 particles, from both sides)
- Colors: `['#4f46e5', '#7c3aed', '#06b6d4', '#10b981']`
- Respects `prefers-reduced-motion`

---

## Admin UI Patterns

### Sidebar Navigation (`components/admin/AdminSidebar.tsx`)
- Dark sidebar: `bg-gray-900 text-white w-60 fixed h-full`
- Active link: `bg-brand-600 text-white rounded-lg`
- Inactive: `text-gray-300 hover:bg-gray-800 hover:text-white`
- Items: `px-3 py-2.5 rounded-lg text-sm font-medium`, icons at 18px
- Logo top: rocket emoji + "The Launchpad", subtitle "Admin Panel"
- Bottom: "Learner view" link with ArrowLeft icon

### Admin List Items
- White card with `rounded-xl border border-gray-200 hover:border-brand-300`
- Left icon badge: `w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-bold`
- Status pill: `text-xs px-2 py-0.5 rounded-full font-medium`
  - Published: `bg-green-100 text-green-700`
  - Draft: `bg-gray-100 text-gray-500`
- Stats row: `text-xs` with colored counts (green for quizzes, orange for projects)

### Admin Detail Pages
- Header: title + description with back button
- Content sections: white card `rounded-xl border border-gray-200 p-5`
- Sub-items: rows with icons, titles, action buttons
- Inline add/delete: Trash2 icon (red hover), plus button for adding

### CRUD Pattern (same for Resources and Projects)
- List rows: icon + title link + trash button (right-aligned)
- Trash: `text-gray-300 hover:text-red-500 transition-colors`
- Add button: always visible below the list, `+ Add [Item]` text
- Delete: browser `confirm()` dialog before deletion
- Create: Modal with form fields

---

## Learner UI Patterns

### WeekCard (`components/learner/WeekCard.tsx`)

**Locked state:**
- Background: `linear-gradient(145deg, #F8F7FF, #F2EFFF)`, border `#E4DEFF`
- Content blurred: `blur-[2px] opacity-40`
- Lock overlay centered: pulsing lock icon on `#EDE9FF` bg
- Shimmer sweep on hover (translate-x animation)
- Shake animation on click (rejected access feedback)

**Unlocked state:**
- White card, `1.5px solid #E4DEFF` border, top accent line (gradient `#5B38F5 → #7C3AED`)
- Hover: lift `-4px`, purple shadow
- Badge icon with hover rotate
- Label: `text-[10px] font-bold uppercase tracking-widest` in brand-500, "Mission N"
- Progress bar: `h-1.5 rounded-full` on `#F0ECFF` track, brand gradient fill
- CTA text: "Start mission" / "Continue mission" / "Mission complete"

**Completed state:**
- Green border `#10B981`, green accent line, green progress text
- CheckCircle2 icon with spring scale-in animation

### Inline Content Rows (Week Detail Page)
- **Subtopics:** white rows in topic accordion sections
- **Topic projects:** orange-tinted rows below subtopics (`bg-orange-50 border-orange-200`)
- **Week project:** purple section below all topics (`bg-purple-50 border-purple-200`)

### Learner Navbar (`components/learner/Navbar.tsx`)
- Fixed top, `h-14 bg-white/90 backdrop-blur-md`
- Border: `1px solid #E4DEFF`
- Logo: rocket emoji + "The Launchpad" in `font-black`, color `#1A1033`
- Right side: streak pill (orange bg), rankings link, notification bell, avatar + name, logout
- Avatar fallback: initials on `linear-gradient(135deg, #5B38F5, #7C3AED)`, white text

---

## Animation System (`lib/animations.ts`)

Import and use these presets — do not define new spring configs unless the existing ones don't fit.

### Spring Presets
```ts
spring:       { stiffness: 400, damping: 28 }      // default interactions
smoothSpring: { stiffness: 220, damping: 24 }      // gentle transitions
bouncySpring: { stiffness: 500, damping: 22 }      // celebrations, badge pop
gentleSpring: { stiffness: 150, damping: 20 }      // slow reveals
```

### Motion Variants
- `fadeUp` — slide from y:16, smoothSpring in (use for list items)
- `fadeIn` — opacity only, 350ms ease-out
- `scaleIn` — scale from 0.7, bouncySpring (badges, icons)
- `scaleInSmooth` — scale from 0.9, smoothSpring
- `slideInRight` / `slideInLeft` — horizontal slide with smoothSpring
- `popIn` — scale 0 + rotate -12 → 1 + 0, bouncySpring (celebration pop)
- `pulsate` — scale 1↔1.06, opacity 1↔0.85, infinite 2.4s cycle

### Stagger Patterns
- `staggerContainer` — 80ms between children, 50ms initial delay (standard lists)
- `staggerContainerFast` — 50ms between children, no delay (dense lists)

### Hover Effects
- `cardHover` — y:-4, purple-tinted shadow `rgba(79,70,229,0.15)`
- `cardHoverSubtle` — y:-2, neutral shadow `rgba(0,0,0,0.08)`
- `shakeKeyframes` — x: [0, -8, 8, -6, 6, -4, 4, 0], 500ms (locked card rejection)

---

## Scoring Display Patterns

### Week 2+ Reflections (0-3 scale)
```
Level 0: bg-red-100 text-red-700     — "Level 0 (Invalid)"
Level 1: bg-orange-100 text-orange-700 — "Level 1 (Weak)"
Level 2: bg-blue-100 text-blue-700   — "Level 2 (Basic)"
Level 3: bg-green-100 text-green-700  — "Level 3 (Strong)"
```

### Week 1 Reflections (0-10 scale)
- Score/10 display with standard text

### AI-Generated Flag
- Red badge: `bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full`

---

## Key Design Principles

1. **Purple = brand, green = success, orange = projects/warnings** — never mix these semantics
2. **Spring physics everywhere** — no CSS transitions for interactive elements, always Framer Motion springs
3. **Cards have 1.5px borders** — not 1px, not 2px. brand-100 (#E4DEFF) default, green for completed
4. **Border radius hierarchy:** `rounded-2xl` for cards, `rounded-xl` for inner elements, `rounded-lg` for buttons
5. **Stagger children in lists** — always use `staggerContainer` variant for list reveals
6. **Celebration pipeline:** confetti → badge modal → XP toast → level up overlay (if applicable)
7. **10px uppercase tracking-widest** for all section/category labels
8. **Never auto-approve on error** — all AI evaluation defaults to `needs_revision`
9. **Three project scopes:** subtopic (legacy, Week 1), topic (multiple per topic, Week 2+), week (capstone) — render each scope differently
10. **Admin = gray-900 sidebar + gray-50 content; Learner = white nav + lavender (#F8F6FF) content**
