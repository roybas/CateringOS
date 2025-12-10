# Product Context: Procurement Engine (Module 2.3)

## 1. The Core Mission
Transform raw Event JSON into operational flat lists (Shopping List & Prep Log) in Google Sheets.
**User:** Shai (Head Chef). He validates the numbers.
**Goal:** Accuracy and Trust. No "Black Box" calculations.

## 2. Business Logic (The Iron Rules)

### A. Zero Guessing (Aggregation Policy)
* **Strict Separation:** Never merge items with different units.
    * "Onion (kg)" and "Onion (unit)" -> **Two separate rows**.
    * Missing units -> Flag as "UNSPECIFIED".
* **Exact Match:** Merge only if `Name` AND `Unit` are identical.

### B. Traceability (Drill Down)
* **Requirement:** Shai must verify where the total quantity came from.
* **Data Structure:** Every aggregated item must store an array of sources:
    * `Source: { Station Name, Dish Name, Original Quantity }`

### C. Make vs. Buy (Routing)
* **Raw Materials:** Items purchased from suppliers (Default) -> Go to **Shopping List**.
* **Prep Items:** Items produced in-house (e.g., Dough, Sauces) -> Go to **Production Log**.
* *Note:* For this version, we handle Raw Materials logic first.

## 3. Visual Logic (The "God View")
* **Platform:** Google Sheets (Ephemeral/Temporary).
* **Layout:** Open Hierarchy (for visual scanning, not printing).
    * **Parent Row (Bold):** Item Name | Total Qty | Unit
    * **Child Rows (Indented):** `↳ Source Station (Qty)`
* **Language:** Hebrew (RTL). Variables in English.

## 4. Technical Data Flow
1. **Input:** JSON file (e.g., `event_lior_niv.json`).
2. **Process:** Map Stations -> Aggregate Ingredients -> Normalize -> Visualize.
3. **Output:** Write to Sheet with formatting.