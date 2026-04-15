# KauntyBursary — UI/UX Design System & Screen Specifications
**Version:** 1.0.0  
**Stack:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui base, custom design tokens  
**References:** PRD v1.0.0, System Design v1.0.0

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens](#2-design-tokens)
3. [Typography System](#3-typography-system)
4. [Color System](#4-color-system)
5. [Spacing & Layout](#5-spacing--layout)
6. [Component Library](#6-component-library)
7. [Form Design Patterns](#7-form-design-patterns)
8. [Role-Based Portal Designs](#8-role-based-portal-designs)
9. [PDF Form Template Spec](#9-pdf-form-template-spec)
10. [Motion & Interactions](#10-motion--interactions)
11. [Responsive Breakpoints](#11-responsive-breakpoints)
12. [Accessibility Standards](#12-accessibility-standards)
13. [Dark Mode](#13-dark-mode)
14. [Tailwind Config](#14-tailwind-config)

---

## 1. Design Philosophy

### Aesthetic Direction: **Civic Clarity**

The platform serves Kenyan county governments — institutions that must project trustworthiness, accessibility, and official authority. The design aesthetic is **institutional clarity with a warm African palette**: structured and grid-based like a government portal, but warmer and more human than a cold civil service interface.

**Design principles:**

1. **Trust through structure.** Consistent grid, generous whitespace, and clear hierarchy signal reliability. Users applying for financial assistance need to feel the system is legitimate.

2. **Mobile-first poverty-aware.** A student in Lodwar is likely using a mid-range Android phone on 3G. Every interaction must work on a 360px viewport with no animations that drain battery.

3. **Guided, not overwhelming.** Multi-step forms with clear progress, not a wall of fields. Each step has one job.

4. **County identity.** Each county's branding (logo, colour) is surfaced prominently. The system feels like *Turkana County's* portal, not a generic SaaS.

5. **Progressive disclosure.** Complex information (AI score breakdowns, budget analytics) is available on demand — not forced on every view.

### Aesthetic Influences

The visual language draws from:
- The clean authority of the Kenyan national government's eCitizen portal.
- The warmth of East African textile patterns (subtle geometric border accents).
- The legibility principles of OECD government service design guidelines.
- Bold typography with strong hierarchy — African government documents are text-heavy; we use type to guide, not decorate.

---

## 2. Design Tokens

### Core Tokens (CSS Custom Properties)

```css
:root {
  /* ── Brand ──────────────────────────────── */
  --color-brand-900: #0D2B4E;   /* Deep navy — primary actions, headings */
  --color-brand-700: #1E3A5F;   /* Navy — sidebar, header */
  --color-brand-500: #2E5F8F;   /* Medium navy — links, accents */
  --color-brand-300: #6B9EC4;   /* Light blue — hover states */
  --color-brand-100: #D6E8F5;   /* Ice blue — selected backgrounds */
  --color-brand-50:  #EFF6FC;   /* Near white — subtle tints */

  /* ── Accent (Savanna Gold) ─────────────── */
  --color-accent-900: #5A3600;  /* Deep amber */
  --color-accent-700: #8A5700;  /* Dark gold */
  --color-accent-500: #C47D00;  /* Savanna gold — CTAs, highlights */
  --color-accent-400: #D4900D;  /* Warm gold — hover */
  --color-accent-100: #FDF0D5;  /* Light gold — badge backgrounds */
  --color-accent-50:  #FEFAF0;  /* Near white gold */

  /* ── Status ─────────────────────────────── */
  --color-success-700: #145C3A;
  --color-success-500: #1E8A57;
  --color-success-100: #D1F5E3;
  --color-success-50:  #EDFBF4;

  --color-warning-700: #7A4500;
  --color-warning-500: #B86500;
  --color-warning-100: #FDECC8;
  --color-warning-50:  #FFF8ED;

  --color-danger-700:  #8B1A1A;
  --color-danger-500:  #C0392B;
  --color-danger-100:  #FDDEDE;
  --color-danger-50:   #FFF4F4;

  --color-info-700:    #0C4B8A;
  --color-info-500:    #1565C0;
  --color-info-100:    #DBEAFE;
  --color-info-50:     #EFF6FF;

  /* ── Neutral ────────────────────────────── */
  --color-gray-950: #0D0D0D;
  --color-gray-900: #1A1A1A;
  --color-gray-800: #2C2C2C;
  --color-gray-700: #404040;
  --color-gray-600: #595959;
  --color-gray-500: #737373;
  --color-gray-400: #9CA3AF;
  --color-gray-300: #D1D5DB;
  --color-gray-200: #E5E7EB;
  --color-gray-100: #F3F4F6;
  --color-gray-50:  #F9FAFB;
  --color-white:    #FFFFFF;

  /* ── Surface ────────────────────────────── */
  --color-surface-primary:   var(--color-white);
  --color-surface-secondary: var(--color-gray-50);
  --color-surface-tertiary:  var(--color-gray-100);
  --color-surface-overlay:   rgba(0, 0, 0, 0.50);

  /* ── Border ─────────────────────────────── */
  --color-border-default: var(--color-gray-200);
  --color-border-strong:  var(--color-gray-300);
  --color-border-focus:   var(--color-brand-500);

  /* ── Text ───────────────────────────────── */
  --color-text-primary:   var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-tertiary:  var(--color-gray-400);
  --color-text-inverse:   var(--color-white);
  --color-text-brand:     var(--color-brand-700);
  --color-text-accent:    var(--color-accent-700);

  /* ── Spacing scale ──────────────────────── */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;

  /* ── Border radius ──────────────────────── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  /* ── Shadow ─────────────────────────────── */
  --shadow-xs:   0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:   0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05);
  --shadow-lg:   0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:   0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04);

  /* ── Z-index scale ──────────────────────── */
  --z-base:    0;
  --z-raised:  10;
  --z-dropdown: 100;
  --z-sticky:  200;
  --z-modal:   300;
  --z-toast:   400;
  --z-tooltip: 500;

  /* ── Transition ─────────────────────────── */
  --transition-fast:   100ms ease;
  --transition-normal: 200ms ease;
  --transition-slow:   350ms ease;
}
```

### County-Variable Tokens

Each county customises these two tokens via their settings. These override the brand defaults at the `:root` level when a county is loaded:

```css
/* Applied dynamically from county settings */
--county-primary:     #1E3A5F;   /* county.primary_color */
--county-primary-text: #FFFFFF;  /* contrast-computed */
```

---

## 3. Typography System

### Font Stack

```css
/* Display / Headings — strong, authoritative */
--font-display: 'Plus Jakarta Sans', 'DM Sans', sans-serif;

/* Body / UI — clean, readable at small sizes */
--font-body: 'Noto Sans', 'Inter', sans-serif;

/* Mono — form references, codes */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

*Both Plus Jakarta Sans and Noto Sans have strong Latin and extended character support including Swahili diacritics.*

### Type Scale

```css
/* Display */
--text-display-2xl: clamp(2.5rem, 5vw, 4rem);    /* 40–64px — county name hero */
--text-display-xl:  clamp(2rem, 4vw, 3rem);       /* 32–48px — page hero */
--text-display-lg:  clamp(1.5rem, 3vw, 2.25rem);  /* 24–36px — section title */

/* Heading */
--text-h1:   1.875rem;   /* 30px */
--text-h2:   1.5rem;     /* 24px */
--text-h3:   1.25rem;    /* 20px */
--text-h4:   1.125rem;   /* 18px */
--text-h5:   1rem;       /* 16px */
--text-h6:   0.875rem;   /* 14px */

/* Body */
--text-xl:   1.25rem;    /* 20px — lead paragraph */
--text-lg:   1.125rem;   /* 18px — large body */
--text-base: 1rem;       /* 16px — default body */
--text-sm:   0.875rem;   /* 14px — secondary text */
--text-xs:   0.75rem;    /* 12px — captions, labels */

/* Font weights */
--weight-regular:   400;
--weight-medium:    500;
--weight-semibold:  600;
--weight-bold:      700;

/* Line heights */
--leading-tight:  1.25;
--leading-snug:   1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose:  2;
```

---

## 4. Color System

### Status Badge Colors

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| DRAFT | `gray-100` | `gray-600` | `gray-300` |
| SUBMITTED | `info-50` | `info-700` | `info-100` |
| WARD_REVIEW | `warning-50` | `warning-700` | `warning-100` |
| COUNTY_REVIEW | `accent-50` | `accent-700` | `accent-100` |
| APPROVED | `success-50` | `success-700` | `success-100` |
| REJECTED | `danger-50` | `danger-700` | `danger-100` |
| WAITLISTED | `gray-50` | `gray-500` | `gray-200` |
| DISBURSED | `success-100` | `success-700` | `success-500` |

### AI Score Color Ramp

| Score | Color | Label |
|-------|-------|-------|
| 80–100 | `success-500` | Critical Need |
| 60–79 | `brand-500` | High Need |
| 40–59 | `accent-500` | Moderate Need |
| 20–39 | `warning-500` | Low Need |
| 0–19 | `danger-500` | Review Required |

---

## 5. Spacing & Layout

### Grid System

```css
/* 12-column grid */
--grid-cols: 12;
--grid-gutter: 24px;     /* desktop */
--grid-gutter-md: 16px;  /* tablet */
--grid-gutter-sm: 12px;  /* mobile */
--grid-max-width: 1280px;
```

### Page Layouts

**Student Portal:**
```
[Full-width header — county branding]
[Centered content — max-width 680px — form/content area]
[Optional bottom nav on mobile]
```

**Admin Portal:**
```
[Top header — 64px — logo + user menu]
[Sidebar — 240px — collapsed to 64px on tablet]
[Main content — flex remainder]
[Optional right panel — 360px — detail/review pane]
```

**Dashboard:**
```
[Stats row — 4 stat cards]
[2-column: main table (8 cols) + summary panel (4 cols)]
```

---

## 6. Component Library

### Primary Button

```tsx
// Primary — used for main CTAs
<Button variant="primary" size="md">Submit Application</Button>

// Styles:
background: var(--county-primary)    /* county-configurable */
color: var(--color-text-inverse)
padding: 10px 20px
border-radius: var(--radius-md)
font-weight: var(--weight-semibold)
font-size: var(--text-sm)
transition: background var(--transition-fast)
hover: darken 10%
disabled: opacity 0.5, cursor not-allowed
```

### Form Input

```tsx
<Input
  label="Full Name"
  required
  placeholder="Enter your full name"
  helper="As it appears on your national ID"
  error="This field is required"
/>

// Label: 14px, weight-medium, gray-700, margin-bottom 6px
// Input: 16px, height 44px, border gray-300, radius-md, focus: brand-500 ring 2px
// Helper: 12px, gray-500, margin-top 4px
// Error: 12px, danger-500, margin-top 4px, with error icon
```

### Status Badge

```tsx
<StatusBadge status="WARD_REVIEW" />
// → Renders: "Ward Review" with warning colors
// Pill shape: radius-full, padding 4px 10px, font-size xs, font-weight medium
```

### Score Card Widget

```tsx
<AIScoreCard
  score={78.5}
  grade="HIGH"
  dimensions={[...]}
  anomalyFlags={[]}
/>
// Score ring: circular SVG progress (0–100), colored by grade
// Dimension bars: horizontal bar chart, each dimension labelled
// Flag section: collapsible, shows anomaly details
```

### Application Card (Ward Admin List View)

```tsx
<ApplicationCard
  reference="TRK-2024-00142"
  applicantName="Aisha Lokiru"
  ward="Kalokol"
  institution="University of Nairobi"
  amountRequested={45000}
  status="WARD_REVIEW"
  aiScore={78.5}
  submittedAt="2024-08-10"
/>
// Card: white surface, shadow-sm, radius-lg, padding 16px
// Left: applicant info stack
// Right: AI score badge + status badge
// Bottom: action buttons (Review, View Documents)
```

### Step Progress Indicator (Form Wizard)

```tsx
<StepProgress
  steps={['Personal', 'Amounts', 'Family', 'Financial', 'Disclosures', 'Documents', 'Preview']}
  currentStep={3}
/>
// Desktop: horizontal stepper with numbered circles and connecting line
// Mobile: "Step 3 of 7 — Family Details" text + progress bar
// Completed: filled brand circle with checkmark
// Current: outlined brand circle, pulsing ring
// Upcoming: gray outlined circle
```

### Budget Utilization Bar

```tsx
<BudgetBar
  programName="2024 Ward Bursary"
  ceiling={5000000}
  allocated={2150000}
  disbursed={1800000}
/>
// Full-width bar with two layers: disbursed (solid) + allocated (lighter)
// Labels: ceiling amount right, percentage left, remaining below
```

---

## 7. Form Design Patterns

### Multi-Step Wizard Pattern

The application form follows a strict wizard pattern. No step can be skipped. Progress is saved after each section.

**Navigation rules:**
- "Next" validates the current step before advancing.
- "Back" always allowed without validation.
- Steps completed are marked with a checkmark and clickable for editing.
- Draft saved automatically on every field blur (debounced 500ms).

**Step layout (mobile-first):**
```
[County logo + program name — compact header]
[Step progress indicator]
[Step title + description]
[Form fields — single column on mobile, 2-column on desktop where appropriate]
[Navigation: Back (ghost) | Save & Continue (primary)]
[Auto-save indicator: "Saved just now"]
```

### Field Grouping

Related fields are visually grouped using a card container with a group label:

```tsx
<FieldGroup title="Mother's Details">
  <Input label="Occupation" />
  <Input label="Gross Annual Income (KES)" type="number" />
</FieldGroup>
```

### Sibling Education Table (Section C — Question 15)

The sibling table is rendered as a dynamic list, not a static table, for mobile compatibility:

```
[+ Add Sibling] button
→ Accordion item per sibling:
   Name | Institution | Year/Class | Total Fees | Fee Paid | Outstanding
→ Remove sibling button
→ Maximum 8 rows
```

### Income Grid (Section D — Question 16)

```
3-column grid layout:
         Father    Mother    Guardian/Sponsor
Occupation  [____]   [____]    [____]
Gross income [____]  [____]    [____]
```

On mobile: stacked as 3 separate FieldGroups (Father, Mother, Guardian).

---

## 8. Role-Based Portal Designs

### 8.1 Student Portal

#### Landing / Login Screen

```
[County logo — centered — 80px]
[County name — display-lg — bold]
["[CountyName] Bursary Fund" — h4 — brand color]
[Divider]
[Email input]
[Password input]
[Login button — full width — county primary color]
[Forgot password link]
[Divider: "Don't have an account?"]
[Register button — outlined]
[Footer: county government branding + year]
```

#### Student Dashboard

```
[Header: County logo + "My Bursary Portal" + user avatar/name]

[Welcome banner]
"Hello, Aisha. Here are your open bursary programs."

[Open Programs section]
┌─────────────────────────────────────────────┐
│ 2024 Ward Bursary Programme          ACTIVE │
│ Kalokol Ward · Closes 31 Aug 2024           │
│ ─────────────────────────────────────────── │
│ KES 5,000,000 budget  ·  43% allocated      │
│ ████████████░░░░░░░░░ budget bar            │
│                                             │
│ [Apply Now →]                               │
└─────────────────────────────────────────────┘

[My Applications section]
┌─────────────────────────────────────────────┐
│ TRK-2024-00142                  WARD REVIEW │
│ 2024 Ward Bursary · KES 45,000 requested    │
│ Submitted 10 Aug 2024                       │
│ [View Details]  [Download Form PDF]         │
└─────────────────────────────────────────────┘

[Bottom nav (mobile only): Home | Applications | Profile | Help]
```

#### Application Wizard — Step 7: Preview & Submit

```
[Header: "Review Your Application"]
[Subtitle: "This is how your completed form will look. Download a copy for your records."]

[PDF Preview iframe — scrollable — county-branded form]
  ┌──────────────────────────────────┐
  │  [County Logo]    No. 4          │
  │  COUNTY GOVERNMENT OF TURKANA   │
  │  MINISTRY OF EDUCATION...        │
  │  WARD BURSARY APPLICATION FORM   │
  │                                  │
  │  A. STUDENTS PERSONAL DETAILS    │
  │  1. Full Name: Aisha Lokiru      │
  │  2. Sub County: Turkana Central  │
  │     Ward: Kalokol                │
  │  ...                             │
  └──────────────────────────────────┘

[Actions row]
[⬇ Download PDF]    [✓ Submit Application]

[Declaration checkbox]
"I declare that the information given is true to the best of my knowledge."
[☐ I agree to this declaration]

[Submit button — disabled until checkbox checked]
```

#### Application Status Page

```
[Status timeline — vertical steps]

  ✓ Application Created         09 Aug 2024
  ✓ Submitted                   10 Aug 2024
  ✓ AI Scoring Complete         10 Aug 2024
  ◉ Ward Review                 In progress
  ○ County Review               Pending
  ○ Decision                    Pending

[Current status banner]
"Your application is being reviewed by the Ward Bursary Committee.
You will receive an SMS when a decision is made."

[Download application PDF]
[Contact ward office button]
```

---

### 8.2 Ward Admin Portal

#### Ward Dashboard

```
[Header: County logo | Ward name badge | User name | Logout]
[Sidebar — collapsed on tablet]
  ● Dashboard
  ● Applications
  ● Reports
  ● Help

[Main Content]

[Stats row]
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│    312     │ │     45     │ │     89     │ │   KES 1.8M │
│ Pending    │ │ Reviewed   │ │  Rejected  │ │ Recommended│
│ Review     │ │ Today      │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

[Application List — ranked by AI Score DESC]
Filter bar: [Status ▼] [Program ▼] [Sort: AI Score ▼] [Search...]

┌───────────────────────────────────────────────────────────┐
│ TRK-2024-00142  Aisha Lokiru        University of Nairobi │
│ Kalokol Ward · KES 45,000 requested · Submitted 10 Aug    │
│                                                            │
│ AI Score: [████████████░] 78.5 / 100   ● WARD REVIEW     │
│ Flags: None                                                │
│                                   [Review] [View Docs]    │
└───────────────────────────────────────────────────────────┘
[... repeat ...]
[Load more / Pagination]
```

#### Application Review Panel (Right Drawer / Full Page on Mobile)

```
[← Back to list]

[Application: TRK-2024-00142]
[Status badge: WARD REVIEW]

[Tabbed navigation]
[Details] [Documents] [AI Score] [Timeline]

── Details tab ──
[Applicant section]
  Full Name: Aisha Lokiru
  Ward: Kalokol · Sub-county: Turkana Central
  DOB: 15 March 2002 · Gender: Female

[Academic section]
  Institution: University of Nairobi (University)
  Year: Year 2 · Course: Bachelor of Education
  Admission No: F56/1234/2023

[Amounts section]
  Total Fees: KES 75,000
  Outstanding: KES 60,000
  Can Pay: KES 15,000
  Requested: KES 45,000

[Family section]
  Status: Single Parent — Mother
  Mother's Income: KES 18,000/year
  Siblings in school: 2
  Has disability: No

── AI Score tab ──
[Score ring: 78.5 / 100 — HIGH NEED]
[Dimension breakdown bars]
  Family Status     ████████████████████ 25/25
  Family Income     ████████████████     20/25
  Education Burden  ████████████         15/20
  Academic Standing ███████             10.5/15
  Document Quality  ████████             8/10
  Integrity         ░░░░░                0/5
[Anomaly flags: None detected ✓]

── Documents tab ──
[Document list]
  ✓ Fee Structure          [View] [Download]
  ✓ Admission Letter       [View] [Download]
  ✓ Transcript             [View] [Download]
  ⚠ School ID — PENDING SCAN

── Review section (always visible, sticky bottom) ──
[Decision]
○ Recommend for County Review
○ Return to Applicant (request more info)
○ Reject

[Recommended Amount (KES)] [____________________]
[Maximum: KES 60,000 per program rules]

[Review Note]
[_____________________________________________]
[_____________________________________________]

[Submit Review] button — primary
```

---

### 8.3 Finance Officer Portal

#### County Review Queue

```
[Header + sidebar — same as ward admin]

[Stats]
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│    245     │ │  KES 2.15M │ │  KES 2.85M │ │     67     │
│ Approved   │ │ Allocated  │ │ Remaining  │ │ Disbursed  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

[Budget bar — full width]
2024 Ward Bursary: KES 5,000,000
[████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░] 43% allocated

[County Review Queue]
[All ward-recommended applications, sorted by AI score]

[Application row — same as ward admin but with ward recommendation column]
  TRK-2024-00142  Aisha Lokiru  78.5/100  Ward Rec: KES 40,000  [Final Review]

[Disbursement Queue tab]
[Approved but not yet disbursed applications]
  [Select all] [Disburse via M-Pesa] [Export EFT Batch]
```

#### OCOB Report Screen

```
[Reports / OCOB Report]

[Filter row: Program ▼ | Academic Year ▼ | Ward ▼ | Format: Excel / PDF]
[Generate Report button]

[Preview table]
  Ward | Applications | Approved | Total Allocated (KES) | Disbursed (KES) | Balance
  ─────────────────────────────────────────────────────────────────────────────────
  Kalokol      | 142 | 45 | 1,800,000 | 1,620,000 | 180,000
  Lokichar     |  98 | 31 | 1,240,000 |   930,000 | 310,000
  ─────────────────────────────────────────────────────────────────────────────────
  TOTAL        | 498 |187 | 5,000,000 | 4,200,000 | 800,000

[Download Excel] [Download PDF]
```

---

### 8.4 County Admin Portal

#### Settings — County Branding

```
[Settings / County Identity]

[Logo upload area — dashed border, 200×200px preview]
  [Upload Logo] · PNG, SVG, min 200px · Max 2MB

[County Name]   [Turkana County_________________]
[Fund Name]     [Turkana County Education Fund___]
[Legal Reference] [No. 4 of 2023_________________]

[Primary Colour]
[  #1E3A5F  ] ←→ [Colour picker swatch grid]

[Preview section]
"Here's how your portal will look to students:"
┌──────────────────────────┐
│ [Logo] Turkana County    │  ← Live preview
│ [████████████] header    │
└──────────────────────────┘

[Save Settings button]
```

#### AI Scoring Weights Configuration

```
[Settings / AI Scoring Weights]

[Info banner]
"Adjust the weight of each scoring dimension. 
All weights must sum to 100%. Changes apply from the next intake cycle."

[Dimension sliders]
Family Status        [━━━━━━━━━━━━━━━━━━━━━━] 30%  [−] [+]
Family Income        [━━━━━━━━━━━━━━━━━━━━━━] 25%  [−] [+]
Education Burden     [━━━━━━━━━━━━━━━━━━━━━━] 20%  [−] [+]
Academic Standing    [━━━━━━━━━━━━━━━━━━━━━━] 10%  [−] [+]
Document Quality     [━━━━━━━━━━━━━━━━━━━━━━] 10%  [−] [+]
Integrity Checks     [━━━━━━━━━━━━━━━━━━━━━━]  5%  [−] [+]

Total: [100%] ← live sum, red if not 100

[Save Weights]
```

---

## 9. PDF Form Template Spec

### Template Structure

The PDF template is built using `@react-pdf/renderer` and mirrors the official county bursary form exactly.

```
Page size: A4 (210mm × 297mm)
Margins: 20mm all sides
Font: Times New Roman (body) / Helvetica Bold (headings) — matches official form
```

### Sections

```
[Page header]
  Left: Page number ("21") 
  Center: "[County Fund Name]"
  Right: "No. 4" (legal reference)
  Year left: "2023"
  
[County Government Logo — centered — 60×60px]
[County Government Name — centered bold — 14pt]
[Ministry name — centered — 12pt]
[Form title: "WARD BURSARY APPLICATION FORM [Section 10]"]

[Section A: STUDENTS PERSONAL DETAILS]
  Numbered fields rendered as "1. Full Name: [value_______________]"
  Institution subsections as per official form layout
  
[Section B: AMOUNTS APPLIED]
  8. (i) Total payable fee: [value]
     (ii) Outstanding balance: [value]
     (iii) Amount paid/able to pay: [value]
  (b) Bank details table: Account Name, Account Number, Bank, Branch

[Page break]

[Section C: FAMILY DETAILS]
  Family status checkboxes — rendered as □ with ✓ for selected
  Question 15: Sibling table — exact 6-column format from official form

[Section D: FINANCIAL STATUS]
  Question 16: 3-column income grid (Father | Mother | Guardian)

[Section E: OTHER DISCLOSURES]
  Questions 17–20: fill-in line responses

[Section F: DECLARATIONS]
  Student signature area (blank — for printing)
  Parent/guardian declaration
  
[Section G: SCHOOL/COLLEGE VERIFICATION]
  Verification fields + principal signature area

[Section H: OFFICIAL USE ONLY]
  Total Score: [___]
  Approved / Not approved checkboxes

[QR Code — bottom right]
  Contains: application reference number + verification URL
  
[Footer]
  Submission timestamp | Application reference | "Official Copy"
```

### County Branding Variables in PDF

```tsx
const pdfTheme = {
  countyName: county.name,
  fundName: county.fund_name,
  logoUrl: county.logo_s3_key ? getPresignedUrl(county.logo_s3_key) : defaultLogo,
  primaryColor: county.primary_color,
  legalReference: county.legal_reference,
};
```

Section header backgrounds use `primaryColor` at 10% opacity. Section header text uses `primaryColor` at full opacity.

---

## 10. Motion & Interactions

### Principles

- Animations are purely functional (communicate state, not decorate).
- All animations respect `prefers-reduced-motion: reduce`.
- Maximum animation duration: 300ms.
- No animations on form fields (disruptive during data entry).

### Transitions

```css
/* Page transitions (Next.js App Router) */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease, transform 200ms ease;
}

/* Form section transitions */
.section-enter {
  opacity: 0;
  transform: translateX(16px);
}
.section-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 250ms ease, transform 250ms ease;
}

/* Status badge pulse (WARD_REVIEW, IN_PROGRESS) */
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(var(--color-accent-500), 0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(var(--color-accent-500), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--color-accent-500), 0); }
}

/* AI Score ring animation */
@keyframes score-fill {
  from { stroke-dashoffset: 283; }
  to   { stroke-dashoffset: var(--target-offset); }
}
```

### Micro-interactions

- **Auto-save:** "Saving..." → "Saved ✓" text transition on draft persistence.
- **Form validation:** Error messages slide down from above the field on blur.
- **Button loading:** Spinner replaces button icon (never disables entire button immediately — await 200ms first).
- **Document scan status:** Poll every 3 seconds; animate from PENDING → CLEAN with a green fade-in checkmark.
- **Budget bar:** Animated fill on dashboard load (progress-bar-style, 600ms).

---

## 11. Responsive Breakpoints

```css
--breakpoint-xs:   320px;   /* Smallest Android phones */
--breakpoint-sm:   375px;   /* iPhone SE */
--breakpoint-md:   768px;   /* Tablets */
--breakpoint-lg:   1024px;  /* Laptops */
--breakpoint-xl:   1280px;  /* Desktop */
--breakpoint-2xl:  1536px;  /* Large monitors */
```

### Mobile-First Rules

| Feature | Mobile (< 768px) | Desktop (≥ 768px) |
|---------|-----------------|------------------|
| Sidebar | Bottom tab nav (4 items) | Collapsible sidebar (240px) |
| Application list | Single column cards | Table layout |
| Form wizard | Full-screen steps | Centered card (max 680px) |
| Review panel | Full-screen modal | Right drawer (480px) |
| PDF preview | Full-width iframe | Centered max-width |
| AI score card | Stacked dimensions | 2-column grid |
| Income grid | 3 stacked cards | 3-column inline table |
| Stats row | 2×2 grid | 4-column row |

---

## 12. Accessibility Standards

### WCAG 2.1 AA Compliance

- **Colour contrast:** All text meets 4.5:1 ratio (normal text) or 3:1 (large text).
- **Focus indicators:** All interactive elements have visible focus ring (2px `brand-500` outline, 2px offset).
- **Screen reader:** All form fields have associated `<label>`. ARIA roles on custom components (combobox, status badge, progress stepper).
- **Error identification:** Errors are announced via `aria-live="polite"` region and linked to field via `aria-describedby`.
- **Keyboard navigation:** All interactive elements reachable by Tab. Modals and drawers trap focus. Escape closes.
- **Skip link:** "Skip to main content" visible on focus at top of every page.
- **Form autocomplete:** Student form fields use correct `autocomplete` attributes (`name`, `bday`, `tel`, etc.).

### Swahili Language Support

- `lang="sw"` on Swahili-content blocks.
- All status labels and error messages translated (toggle via language switcher in portal header).
- Swahili translations stored in `messages/sw.json` (next-intl).

---

## 13. Dark Mode

Dark mode is available but **optional** — government portals typically default to light mode. Dark mode activated via system preference or user toggle in portal settings.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-primary:   #1A1A2E;
    --color-surface-secondary: #16213E;
    --color-surface-tertiary:  #0F3460;
    --color-text-primary:      #E8E8E8;
    --color-text-secondary:    #9CA3AF;
    --color-border-default:    #374151;
    --color-border-strong:     #4B5563;
  }
}
```

County branding colours are tested for dark mode contrast automatically during county setup.

---

## 14. Tailwind Config

```js
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EFF6FC',
          100: '#D6E8F5',
          300: '#6B9EC4',
          500: '#2E5F8F',
          700: '#1E3A5F',
          900: '#0D2B4E',
        },
        accent: {
          50:  '#FEFAF0',
          100: '#FDF0D5',
          400: '#D4900D',
          500: '#C47D00',
          700: '#8A5700',
          900: '#5A3600',
        },
        success: {
          50:  '#EDFBF4',
          100: '#D1F5E3',
          500: '#1E8A57',
          700: '#145C3A',
        },
        warning: {
          50:  '#FFF8ED',
          100: '#FDECC8',
          500: '#B86500',
          700: '#7A4500',
        },
        danger: {
          50:  '#FFF4F4',
          100: '#FDDEDE',
          500: '#C0392B',
          700: '#8B1A1A',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'DM Sans', 'sans-serif'],
        body:    ['Noto Sans', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl': '24px',
      },
      boxShadow: {
        xs:  '0 1px 2px rgba(0,0,0,0.05)',
        sm:  '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        md:  '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
        lg:  '0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)',
        xl:  '0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'score-fill': 'score-fill 1s ease-out forwards',
        'fade-in-up': 'fade-in-up 200ms ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 125, 0, 0.4)' },
          '70%':       { boxShadow: '0 0 0 8px rgba(196, 125, 0, 0)' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      screens: {
        xs:  '320px',
        sm:  '375px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config
```