# Technical Specification: Math Tic-Tac-Toe Worksheet Generator

## 1. Feature Overview
**Goal:** Add a new math worksheet type to the Bodhana portal that generates printable US Letter-sized Tic-Tac-Toe grids filled with vertical math problems. 
**Target Audience:** K-12 students practicing arithmetic.
**Core Functionality:** A Single Page Application (SPA) with a control panel on the left and a live, paginated US Letter preview on the right. Users can customize operations, digit lengths, difficulty, and layout, then print directly or save as PDF.

## 2. UI/UX Requirements

### 2.1 Layout Structure
*   **Left Pane (Sidebar):** Fixed width (~320px), dark theme (`#2c3e50`), scrollable. Contains all configuration controls.
*   **Right Pane (Preview):** Flexible width, light gray background (`#bdc3c7`), scrollable. Displays the rendered US Letter pages with a white background, drop shadow, and 0.5in padding.
*   **Print View:** Sidebar is hidden. Preview pane becomes the printed output.

### 2.2 Typography
*   **Global Font:** `Andika` (imported from Google Fonts).
*   **Math Font:** `Andika`, monospace-like alignment using `font-variant-numeric: tabular-nums;`.
*   **Print Header:** Simple `Data: _______________` line at the top of each page. No Name, Score, or Time fields.

### 2.3 Control Panel Configuration
*   **Difficulty Level:** Dropdown (`Easy`, `Medium`, `Hard`, `Custom`). 
*   **Operations:** Checkboxes for Addition (`+`), Subtraction (`-`), Multiplication (`×`), Division (`÷`).
*   **Number Properties:** 
    *   Min Digits (1-6, default 2)
    *   Max Digits (1-6, default 2)
    *   Operands (2-6, default 2)
    *   Toggle: Mixed Operators per Problem (default unchecked)
*   **Multiplier Properties:** (Conditionally visible when Multiplication is checked)
    *   Min Digits (1-6, default 1)
    *   Max Digits (1-6, default 2)
*   **Divisor Properties:** (Conditionally visible when Division is checked)
    *   Min Digits (1-6, default 1)
    *   Max Digits (1-6, default 2)
*   **Layout Options:**
    *   Pages (1-10, default 1)
    *   Games per Page (1, 2, or 4, default 1)
*   **Actions:** "Generate Worksheet" button, "Print / Save as PDF" button.

## 3. State Management & UI Logic

### 3.1 UI Synchronization Rules
*   **Difficulty Preset Logic:**
    *   If `Custom`: All controls are enabled. Multiplier/Divisor sections are visible if their respective operations are checked.
    *   If `Easy`, `Medium`, or `Hard`: Operations, Number Properties, Multiplier, and Divisor controls are disabled (grayed out). Mixed Operators is forced to `false` for Easy/Medium, and `true` for Hard.
*   **Digit Validation:** If Min Digits > Max Digits, automatically adjust the other to match (e.g., if Min is set to 4 and Max is 2, Max automatically updates to 4).
*   **Conditional Visibility:** Multiplier controls only show if Multiplication is checked. Divisor controls only show if Division is checked.

## 4. Math Generation Engine

### 4.1 General Rules
*   **Number Generation:** Generate a random integer based on a specified digit length. (1 digit = 1-9, 2 digits = 10-99, etc.).
*   **Uniqueness Check:** Maintain a `Set` of generated problem strings (e.g., `12+34`). If a generated problem already exists in the set, discard and regenerate. Clear the set when generating a new worksheet.
*   **Fallback Mechanism:** If a valid problem cannot be generated after 200 attempts (due to restrictive constraints), return a safe fallback problem (e.g., `12 + 34`) that respects the primary selected operation.

### 4.2 Difficulty Rules
*   **Easy:** 2 operands. All numbers have the same digit length (randomly chosen between Min/Max). Single operation only.
*   **Medium:** 2 operands. All numbers have the same digit length. Mixed operations.
*   **Hard:** Random number of operands (2-6). Mixed digit lengths (within Min/Max). Mixed operations. Multipliers default to 1-2 digits to prevent huge numbers.
*   **Custom:** Strictly obeys all user inputs.

### 4.3 Operation-Specific Algorithms
*   **Addition (`+`):** Generate numbers randomly within the digit range. Identical numbers are allowed.
*   **Subtraction (`-`):** 
    *   Must not result in negative numbers at any step. 
    *   The next operand must be less than the current total. 
    *   The next operand cannot be equal to the current total (prevents `X - X = 0`).
    *   Identical numbers are strictly forbidden.
*   **Multiplication (`×`):** 
    *   Uses the specific Multiplier Digits range (if Custom). 
    *   In Easy/Medium, multiplier matches the main digit range. 
    *   In Hard, multiplier is 1-2 digits.
*   **Division (`÷`):**
    *   Must be perfectly divisible (no remainders).
    *   Divisor cannot be equal to the Dividend (prevents `X ÷ X = 1`).
    *   Divisor must be greater than 1.
    *   Uses the specific Divisor Digits range (if Custom).

## 5. Rendering & Layout Engine

### 5.1 Grid Structure
*   Each game is a 3x3 CSS Grid with a 2px solid black border.
*   Each cell has a 1px solid black border.
*   Math problems are rendered vertically:
    *   First operand at the top.
    *   Subsequent operands stacked below with their operators (`+`, `-`, `×`, `÷`) aligned to the left.
    *   A solid black line (`border-top: 2px`) underneath the last operand, followed by empty space for the answer.

### 5.2 Page Layouts
*   **1 Game:** Centered vertically and horizontally. Maximum size 7in x 9in.
*   **2 Games:** Stacked vertically using CSS Grid (`grid-template-rows: 1fr 1fr`), with a 20px gap between them. Each game takes 50% of the vertical space.
*   **4 Games:** Tiled 2x2 using CSS Grid (`grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr`), with a 20px gap between them.

### 5.3 Dynamic Font Sizing
To prevent overflow, font sizes must scale based on **both** the Games per Page and the number of operands.
*   **1 Game:** 2 operands = `2.5rem` ... 6 operands = `1.2rem`
*   **2 Games:** 2 operands = `1.8rem` ... 6 operands = `0.85rem`
*   **4 Games:** 2 operands = `1.2rem` ... 6 operands = `0.65rem`
*   *Implementation:* Apply a `data-operands` attribute to the math problem container and use CSS attribute selectors to adjust `font-size`.

## 6. Print / PDF Requirements
*   **Page Size:** US Letter (`8.5in x 11in`).
*   **Margins:** `0.5in` on all sides.
*   **CSS Print Rules:**
    *   Hide the `.sidebar` completely.
    *   Remove background colors, shadows, and preview padding.
    *   Set `.worksheet-page` to `page-break-after: always`.
    *   Ensure the last page does not have a trailing blank page (`page-break-after: auto`).
    *   Maintain grid borders and math problem alignments exactly as seen on screen.

## 7. Technical Stack & Integration
*   **Frontend:** Vanilla HTML, CSS, and JavaScript (or convert to React/Vue components if the portal uses a framework).
*   **State Management:** A simple centralized `state` object containing all configuration variables. Update state on every input `change` event.
*   **Integration Point:** Place the generator inside a new route/component in the Bodhana portal (e.g., `/worksheets/math/tic-tac-toe`). Ensure the print button triggers the browser's native `window.print()`.

## 8. Acceptance Criteria (QA Checklist)
- [ ] Can generate 1, 2, or 4 games per page across multiple pages.
- [ ] Subtraction never yields negative numbers or `X - X`.
- [ ] Division never yields fractions, `X ÷ X`, or `X ÷ 1`.
- [ ] Min/Max digit sliders/inputs automatically correct each other if inverted.
- [ ] Changing difficulty to Easy/Medium/Hard disables manual controls.
- [ ] Multiplier and Divisor controls only appear when their operations are selected.
- [ ] Math problems align vertically and do not overflow their grid cells, even with 6 operands and 4 games per page.
- [ ] Print preview shows exactly US Letter size with no sidebar and correct page breaks.
- [ ] The font "Andika" is applied consistently across the UI and the worksheet.
