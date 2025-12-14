# Layer 3: Module A - Procurement Engine

## 1. The Mission
Transform raw Event JSON (nested hierarchy) into operational flat lists (Shopping List & Prep Log) in Google Sheets, serving as a staging area before sending orders via WhatsApp.

## 2. Core Logic Principles

### A. Zero Guessing (Crucial)
* **Strict Separation:** Never merge items with different units. "Onion (kg)" and "Onion (unit)" are distinct rows.
* **Ambiguity:** Missing units are flagged as "UNSPECIFIED".
* **Validation:** Accuracy > Aesthetics.

### B. Traceability & Drill Down
* **Source Tracking:** Every aggregated total keeps an array of sources: `{ Station, Dish, Quantity }`.
* **Purpose:** Shai must validate the numbers on-screen before locking.

### C. Make vs. Buy (Classification)
* **Default:** Raw Materials (Buy).
* **Prep Items:** Marked items go to *Production Log*.

## 3. Data Structure & Input
* **Source:** JSON Snapshot in Drive (Parsing logic must handle flat arrays as fallback).
* **Hierarchy:** `Event` -> `Stations` -> `Dishes` -> `Ingredients`.
* **Parsing:** Respect `N.M` indexing.

## 4. Output & Persistence (Google Sheets)

### 4.1 Persistence & Learning (The Snapshot)
* **Final Save:** When the order is locked, save a JSON snapshot.
* **The Diff Log (Critical):** We must record the "Human Correction".
    * Save `Calculated_Qty` (System output) vs. `Final_Qty` (Shai's manual edit).
    * **Goal:** Future AI training data to predict Shai's adjustments.

### 4.2 Sheet Structure: Open Hierarchy
* **Visual Validation:** The sheet uses an "Open Hierarchy" layout (Parent row + Indented Child rows).
* **Reasoning:** NOT for printing, but for immediate visual validation ("God View"). Shai scans the sheet and needs to see the breakdown without clicking or hovering.
* **Format:**
    * **Parent:** **Item Name | Total | Unit**
    * **Child:** `   ↳ Station Name (Qty)` (No values in quantity columns to avoid double counting).

### 4.3 Export Strategy (Future)
* **No Physical Printing:** The table is never printed on paper.
* **Target Output:** Text format for WhatsApp (Supplier/Agent).
* **Mechanism:** A sidebar action will convert the locked table into formatted text strings.