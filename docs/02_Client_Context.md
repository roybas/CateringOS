# Layer 2: Client Context - a22 (Avigdor)

## 1. The Venue & Business
* **Entity:** "a22" is the high-end catering company operating within the "Avigdor" venue.
* **Standard:** Zero tolerance for errors. High-pressure operations.
* **System Goal:** To provide absolute order and clarity. The system must never "guess" or introduce ambiguity.

## 2. Key Personas (The Users)
* **Shai (Head Chef & Ops):** The Super User.
    * **Role:** He breaks down the menu into ingredients. He is the *only* one authorizing procurement.
    * **Requirement:** "God View". Needs to see the connection between the *Dish* and the *Ingredient*.
* **Ronen (Production Manager):**
    * **Role:** Executing the prep.
    * **Requirement:** Needs operational lists (what to prep/cook), not financial data or prices.
* **Arnon (Sales):**
    * **Role:** Client facing.
    * **Impact:** Changes menus frequently. The system must support updates without breaking existing data.

## 3. Operational Logic (Iron Rules for a22)

### A. Station-Centricity (העמדה היא העוגן)
* Every item and every task belongs to a **Station** (e.g., Grill, Taboon, Bakery).
* Nothing "floats". If we order onions, we must know if they are for the *Grill* or the *Salads*.

### B. The Input Structure (Tables)
* Data entry is done by Shai, manually adding ingredient tables under each station in the menu document.
* **The Format:** These tables typically have 6 columns (Right-to-Left), listing Item, Quantity, and Unit. The code must parse this specific structure accurately.

### C. Make vs. Buy (רכש מול הכנות)
* The system must distinguish between two types of items:
    1.  **Raw Materials:** Items purchased from suppliers (e.g., Fish, Flour).
    2.  **Prep Items:** Items produced in the kitchen (e.g., Aioli, Dough, Sauces).
* **Logic:** "Raw Materials" go to the *Shopping List*. "Prep Items" go to the *Kitchen Log*.

### D. Traceability
* When aggregating quantities (e.g., "Total Onions"), the system must retain the ability to "Drill Down" and show which Station and Dish generated the demand.

## 4. Technical Constraints
* **Language:** User Interface (Logs, Headers, Alerts) must be in **Hebrew**. Code variables in English.
* **Reliability:** Prefer explicit alerts over silent auto-correction. If an input is unclear, flag it.