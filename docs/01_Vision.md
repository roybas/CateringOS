# Layer 1: CateringOS Platform Vision
> **Scope:** These are the guiding principles for the entire CateringOS ecosystem. They apply to all modules and all clients.

## Core Principles (The Constitution)

### 1. Single Source of Truth (SSOT)
* **Concept:** Every event has one unique data source (The JSON in Drive).
* **Code Rule:** Modules never store parallel copies of data. They always read from the source. If the source changes, the output changes.

### 2. Single Entry (One-Time Input)
* **Concept:** Information is entered once in its natural place in the lifecycle.
* **Code Rule:** Never ask the user to re-type data that already exists in a previous stage. Carry it forward automatically.

### 3. Support, Do Not Replace (DSS)
* **Concept:** The system creates clarity for the Chef, but does not make executive decisions.
* **Code Rule:** Provide calculations, summaries, and warnings (Alerts), but never perform irreversible actions (like changing a menu or ordering) without explicit user confirmation.

### 4. Clarity Over Magic
* **Concept:** When choosing between a complex "smart" automation and a simple, predictable solution – choose simple.
* **Code Rule:** Avoid "Black Box" algorithms. The Chef must understand *how* the system reached a number. If logic is too complex to explain in a tooltip, simplify the logic.

### 5. Managed Uncertainty
* **Concept:** Processes must be binary: Open or Closed. No vague states.
* **Code Rule:** Do not leave values as `undefined`. Use explicit placeholders (e.g., "To Be Decided") so the user knows action is required.

### 6. Organizational Memory (Learning)
* **Concept:** The system learns from past events to save manual work in the future.
* **Code Rule:** Structure data in a way that allows future re-use (e.g., saving "Kebab" as a reusable object, not just a string).