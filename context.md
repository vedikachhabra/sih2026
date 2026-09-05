# Context & Architecture Reference: Cognitive Care Platform (PS 26003)

> **File:** `context.md`  
> **Purpose:** Master reference and context document for AI agents and developers. Contains complete architectural blueprints, algorithmic formulations, data models, file breakdowns, API endpoints, and development rules for the SIH 2026 Cognitive Care project.

---

## 1. PROJECT OVERVIEW & COMPLETE PRODUCT VISION

**Project:** AI-powered Cognitive Care Platform for elderly dementia patients.

**SIH 2026 Problem Statement:** PS 26003 — AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER).

**Complete Product Vision:**
This project is NOT merely a collection of dementia games.
The intended solution is an: **"AI-powered, multilingual, offline-first cognitive-care ecosystem for elderly users in low-connectivity/rural NER regions."**

The ecosystem connects:
- **PATIENT** → Cognitive Games → On-device RL personalization → Memory support → Voice assistance → Reminders
- **CAREGIVER/FAMILY** → Activity monitoring → Care plans → Reminders → Personal memory content
- **DOCTOR** → Longitudinal performance analytics → Cognitive-domain performance indicators → Clinical-support information

**IMPORTANT DISTINCTION:**
The platform distinguishes between:
- Cognitive training/stimulation (through gameplay)
- Behavioural/game-derived performance indicators (telemetry)
- Clinical diagnosis (performed by doctors)

**Rule:** The system must NOT claim that gameplay alone diagnoses, cures, or determines dementia severity. Game-derived indicators support—but do not replace—clinical assessment. The platform should be described as a support/training system and NOT as a replacement for professional diagnosis or treatment.

---

## 2. FULL FEATURE ECOSYSTEM

**CORE:**
- Cognitive games
- On-device reinforcement learning
- Offline-first operation
- Local telemetry
- Local persistence
- Synchronization

**ACCESSIBILITY:**
- Multilingual interface
- Voice assistance
- Elder-friendly UI/UX
- Large touch targets
- High contrast
- Minimal typing
- Simple navigation

**MEMORY SUPPORT:**
- Personal memory album (Planned)
- Family photographs (Planned)
- Names/relationships (Planned)
- Personalized memory activities (Planned)

**DAILY CARE:**
- Reminders
- Medication reminders
- Meals (Planned)
- Hydration where implemented (Planned)
- Appointments (Planned)
- Daily tasks
- Cognitive training reminders

**CARE NETWORK:**
- Doctor dashboard
- Caregiver dashboard
- Family involvement
- Longitudinal analytics
- Alerts

---

## 3. COGNITIVE DOMAIN MAPPING & CURRENT GAMES

The following games are currently implemented in the `patient-app/js/games/` directory. Each game is designed to stimulate specific cognitive domains.

**IMPORTANT:** Use "stimulate", "exercise", "train", or "game-derived performance indicators". Do NOT use language such as "cures dementia", "improves dementia", or "diagnoses dementia" unless specifically supported by clinical evidence and appropriately qualified.

1. **Memory Pairs (`memory_game.js`)**
   - **Patient Action:** Matches pairs of hidden cards featuring cultural motifs.
   - **Domains Exercised:** Visual memory, Working memory, Recognition, Recall, Memory retrieval, Response efficiency.
   - **Cognitive Process:** SEE → ENCODE → REMEMBER → RETRIEVE → MATCH
   - **Difficulty Parameters:** Number of pairs, time limit, number of hints available.
   - **Telemetry:** Accuracy, attempts, reaction times, hint usage, hesitation metrics.
   - **Adaptation:** Fully integrated with the on-device Reinforcement Learning (RL) agent.

2. **Attention & Focus (`attention_game.js`)**
   - **Patient Action:** Identifies the "odd-one-out" symbol in a grid.
   - **Domains Exercised:** Selective attention, Sustained attention, Visual discrimination, Concentration, Response efficiency.
   - **Cognitive Process:** SCAN → FILTER → IDENTIFY → RESPOND
   - **Difficulty Parameters:** Grid size, time limits.
   - **Telemetry:** Accuracy, visual speed (reaction time).
   - **Adaptation:** Currently uses legacy deterministic on-device DDA.

3. **Daily Sequencing (`sequencing_game.js`)**
   - **Patient Action:** Arranges familiar daily activities (e.g., making tea) in the correct chronological order.
   - **Domains Exercised:** Working memory, Sequencing, Planning-related behaviour, Executive-function-related behaviour, Logical ordering.
   - **Cognitive Process:** UNDERSTAND → HOLD INFORMATION → ORGANIZE → SEQUENCE → EXECUTE
   - **Difficulty Parameters:** Number of steps, presence of distractors, time limits.
   - **Telemetry:** Accuracy, executive speed.
   - **Adaptation:** Currently uses legacy deterministic on-device DDA.

4. **Pattern Recognition (`pattern_game.js`)**
   - **Patient Action:** Identifies the missing symbol to complete a cultural/geometric pattern.
   - **Domains Exercised:** Pattern recognition, Visual-spatial processing, Visual reasoning, Attention, Problem solving.
   - **Cognitive Process:** OBSERVE → IDENTIFY PATTERN → PREDICT → SELECT → COMPLETE
   - **Difficulty Parameters:** Sequence complexity, time limits.
   - **Telemetry:** Accuracy, reaction time.
   - **Adaptation:** Currently uses legacy deterministic on-device DDA.

---

## 4. TELEMETRY

The application (specifically `memory_game.js`) actively collects rich gameplay telemetry:

- **Implemented Fields:**
  - `score`: Calculated based on accuracy and hint usage.
  - `accuracy`: Ratio of correct to total attempts.
  - `total_attempts`, `correct_attempts`, `incorrect_attempts`
  - `avg_reaction_time_ms`, `median_reaction_time_ms`, `min_reaction_time_ms`, `max_reaction_time_ms`
  - `actual_duration_ms` (completion time)
  - `hints_used`, `hint_limit`
  - `hint_events`: Detailed timestamps of when hints were triggered.
  - `attempt_history`: Granular record of every card flipped, duration, and correctness.
  - `time_to_first_action_ms`, `maximum_hesitation_ms`, `hesitation_count` (Hesitation metrics).
  - `difficulty_level` (current level), `game_type`
  - `completion_status`: "completed", "timeout", or "abandoned".
  - `started_at`, `ended_at`

- **Planned Fields:** Cross-session progress aggregation (handled primarily by the backend/dashboards after sync).

---

## 5. REINFORCEMENT LEARNING ARCHITECTURE

**CRITICAL: The current direction is ON-DEVICE REINFORCEMENT LEARNING (Q-Learning) for offline operation.**

Implemented in `patient-app/js/ai/memory_rl_agent.js`.

### EXACTLY WHAT THE AI/RL CONTROLS
The RL agent does not control the patient's entire game. It controls the challenge/assistance configuration presented in subsequent rounds.
The AI is adapting the CHALLENGE, not diagnosing the patient.

**Supported Parameters (Memory Pairs RL configuration):**
- Level/difficulty
- Number of pairs
- Time limit
- Number of hints

**Potential parameters RL can adapt (in general ecosystem):**
- Level/difficulty
- Number of pairs/items/steps
- Time limit
- Number of hints
- Assistance level
- Pattern/sequence complexity
- Distractor complexity where supported
- Repetition/reinforcement of challenging task types

The agent can decide to: increase difficulty, decrease difficulty, maintain difficulty, give more time, give less time, provide more hints, provide fewer hints.

### RL REWARD EXPLANATION
The reward is NOT simply equal to the patient's score. It is derived from multiple behavioural/game-performance signals. The intended objective is to find an appropriate "challenge/flow" zone rather than simply maximizing raw score.
*Note: The reward calculation specifically targets a ~75% accuracy "flow" state. This is an optimization target for game difficulty, NOT a clinical threshold.*

- **Potential positive contributors:** appropriate accuracy, successful completion, reasonable completion efficiency, low error rate, manageable response behaviour, appropriate independence from hints.
- **Potential negative contributors:** excessive errors, excessive hesitation, excessive hint dependence, abandonment, poor completion outcome.

### PATIENT-SPECIFIC LEARNING
The RL agent learns from the individual patient's own gameplay history. It is NOT intended to assume that every elderly patient has the same optimal difficulty.
*Examples (Intended logic, not hardcoded rules):*
- **Patient A:** high accuracy, fast responses, few errors, few/no hints → agent can gradually increase challenge.
- **Patient B:** lower accuracy, repeated errors, slower responses, frequent hints → agent can maintain/reduce challenge or increase assistance/time.
- **Patient C:** good accuracy but slow response → agent may maintain difficulty while modifying time rather than simply increasing/decreasing level.

### OFFLINE RL VS "ONLINE LEARNING"
"Online learning" in machine learning means updating a model incrementally as new observations arrive. It does NOT inherently mean an internet connection is required.
The CURRENT architecture prioritizes ON-DEVICE Q-LEARNING so that both gameplay and incremental RL updates can happen without internet.
- **OFFLINE:** Game works → telemetry collected → reward calculated → Q-table updated → next configuration selected. No backend connection required.
- **ONLINE/CONNECTED:** Local data can later synchronize to the backend for dashboards/analytics.
Future AI agents must not confuse "online learning" with "online/internet operation."

---

## 6. HOW THE NEXT LEVEL/CONFIGURATION IS SELECTED

**Actual Decision Flow:**
1. Patient plays the current round.
2. Telemetry is collected.
3. Telemetry is converted into a discrete state.
4. A reward is calculated.
5. The previous state/action Q-value is updated.
6. The RL agent evaluates valid actions for the new state.
7. Epsilon-greedy policy selects an action.
8. The action maps to the next game configuration.
9. The next round starts using that configuration.

**VERY IMPORTANT:**
The system does NOT use a simple rule such as `accuracy > 80% = level up`.
- 100% accuracy does not mechanically force a level-up.
- 75% accuracy does not mechanically force a level-down.

The selected action depends on the current state, learned Q-values, and epsilon-greedy exploration/exploitation policy. The resulting level is an outcome of the selected action.

### RL EXPLORATION VS EXPLOITATION
- **EXPLOITATION:** The agent chooses the action with the highest known Q-value for the current state.
- **EXPLORATION:** The agent occasionally tries another valid/safe action to learn whether it performs better.
Epsilon controls this balance. During early sessions, the agent does not know the best configuration for a patient, so it must safely explore. As it gathers experience, it increasingly exploits what it has learned.
Exploration is NOT random uncontrolled difficulty changes; the action space must remain safe and bounded.

---

## 7. OFFLINE-FIRST DESIGN & WHY ON-DEVICE Q-LEARNING WAS CHOSEN

The platform is designed for environments with intermittent or zero internet connectivity.

**Design Rationale for On-Device Q-Learning:**
- Rural/NER areas may have unreliable connectivity.
- Core cognitive gameplay must continue without internet.
- Patient-specific learning should continue offline.
- Local persistence allows learning across sessions.
- Backend becomes synchronization/analytics infrastructure instead of a gameplay dependency.
- Q-learning is lightweight enough for a browser/device implementation.
- The system can incrementally learn from individual patient interactions.

---

## 8. FULL PATIENT EXPERIENCE

**Intended end-to-end patient journey:**
1. Patient opens app.
2. Simple home screen.
3. Patient chooses/starts a cognitive activity.
4. Voice instructions can assist.
5. Patient plays.
6. Telemetry is collected automatically.
7. RL evaluates the session.
8. Reward is calculated.
9. Q-table is updated.
10. Next challenge is personalized.
11. Progress is stored locally.
12. Patient can continue offline.
13. When connectivity returns, data synchronizes.

---

## 9. IMPORTANT ARCHITECTURE HISTORY & BACKEND COMPONENTS

The backend is built with FastAPI and Python (SQLite database).

**Architecture Evolution:**
- **Original:** Backend contextual bandit / SGDRegressor (`backend/ml/memory_bandit.py`, `backend/app/api/v1/memory_adaptation.py`).
- **Then:** On-device Q-learning (`patient-app/js/ai/memory_rl_agent.js`).
- **WHY:** The shift was made to satisfy the offline-first requirement and eliminate backend dependency from the core patient adaptation loop.

**Status:** The backend ML components (SGDRegressor, Bandit) are **LEGACY**. The active implementation relies on the local JS RL agent.

---

## 10. LEGACY DDA

The `patient-app/js/dda/on_device_dda.js` file contains an older deterministic Dynamic Difficulty Adjustment (DDA) mechanism. 
- **Status:** Legacy/Fallback for Memory Pairs. It remains the active adaptation mechanism for the other three games (Attention, Pattern, Sequencing) until they are migrated to the RL agent.
- **Rule:** Documentation must NOT claim that old hardcoded accuracy thresholds (from `onDeviceDDA.js`) control the current Memory Pairs adaptation.

---

## 11. DOCTOR VS CAREGIVER RESPONSIBILITIES

Make the distinction explicit.

**DOCTOR:**
- Clinical/professional interpretation
- Longitudinal performance trends
- Cognitive-domain performance indicators
- Patient history
- Analytics
- Clinical reports where implemented

**CAREGIVER/FAMILY:**
- Daily activity
- Adherence
- Reminders
- Care plans
- Memory album
- Engagement
- Practical support

The caregiver dashboard (`Caregiver Portal React App`) should NOT be described as a clinical diagnostic dashboard.

---

## 12. PERSONAL MEMORY ALBUM + COGNITIVE TRAINING

**Status:** Planned / Not Fully Implemented in core gameplay loop.
**Intended Concept:** Generic cognitive tasks can be personalized using familiar information from the patient's life.
**Example:** A family photo can be associated with a person's name, relationship, place, or event. This information can potentially be used in recognition/recall activities. The goal is to make cognitive interaction more personally meaningful.

---

## 13. VOICE ASSISTANT ROLE

Voice is not merely decorative.
**Potential Role:** Game instructions, repeating instructions, feedback, navigation, starting activities, reminder announcements, accessibility support.

**Distinction:**
- **CURRENT:** Browser Web Speech API implementation for basic instructions (`voiceService.speak`).
- **FUTURE:** Advanced multilingual STT/TTS conversational assistant. (Do not claim advanced conversational voice capabilities are implemented).

---

## 14. MULTILINGUAL / NER LOCALIZATION

**Why it matters:** The target users include elderly people in NER/rural areas who may not be comfortable with English.

**Current languages:** Assamese, Bengali, Manipuri/Meitei, Khasi, Mizo, Hindi, English.
Cultural motifs and familiar regional content are also part of the localization strategy where actually implemented (e.g., Japi, Assam Tea motifs in Memory Pairs).
*Do not claim every feature is fully translated unless verified.*

---

## 15. ELDER-FRIENDLY DESIGN RATIONALE

**Why the UI is intentionally simple:**
- Elderly users may have limited digital literacy.
- Complex menus create unnecessary cognitive load.
- Large targets make touch interaction easier.
- High contrast improves readability.
- Consistent controls reduce navigation confusion.
- Voice instructions reduce dependence on reading.
- Minimal typing makes interaction easier.
*(Note: This is a usability/accessibility design goal, not a clinical claim).*

---

## 16. DATA FLOW DIAGRAM IN TEXT

**OFFLINE (Core patient gameplay):**
Patient
↓
Game
↓
Telemetry
↓
Local Database
↓
RL Agent
↓
Q-table update
↓
Next configuration
↓
Next game

**CONNECTED (Optional for core patient gameplay):**
Local Database
↓
Sync Manager
↓
FastAPI
↓
Backend Database
↓
Doctor Dashboard / Caregiver Dashboard

---

## 17. SECURITY / PRIVACY

**Intended Principles (Planned/Partial Implementation):**
- Patient-specific data protection.
- Role-based access (doctor vs caregiver separation).
- Local storage for offline operation.
- Controlled synchronization.
- Minimize unnecessary patient data.
- Do not expose clinical information to unauthorized roles.
*If exact authentication/security implementation is incomplete, this is considered planned/currently partial rather than full production security.*

---

## 18. LIMITATIONS / HONEST CLAIMS

Future AI agents must never turn planned features into "implemented" claims.
- Cognitive games are training/stimulation tools.
- Gameplay telemetry is not a standalone diagnostic instrument.
- RL learns from limited patient-specific interaction data.
- Early sessions require exploration.
- Current RL coverage may not yet include every game (currently only Memory Pairs).
- Memory Album integration may still be incomplete.
- Advanced voice interaction may still be incomplete.
- Some dashboards/features may be partially implemented.
- Offline functionality depends on browser/device capabilities for specific services such as advanced speech recognition.
- Backend analytics are not required for core offline gameplay.

---

## 19. DEMO / PRESENTATION EXPLANATION

**How to explain the system to judges:**
"Our platform uses cognitive games to stimulate memory, attention, sequencing and visual-spatial reasoning. Instead of giving every patient the same difficulty, an on-device reinforcement-learning agent observes gameplay behaviour such as accuracy, response time, errors, hesitation and hint usage. It learns which challenge configuration works best for that individual and adapts the next session by modifying difficulty, time, hints and complexity. Because the RL agent runs locally, the patient can continue receiving personalized training even without internet connectivity."

**Simplified loop:**
PLAY → OBSERVE → REWARD → LEARN → ADAPT → PLAY AGAIN

---

## 20. CURRENT IMPLEMENTATION STATUS MATRIX

| Feature | Status | Current Implementation | Notes |
| :--- | :--- | :--- | :--- |
| **Memory Pairs + RL** | Implemented | `memory_game.js`, `memory_rl_agent.js` | Uses on-device Q-Learning. |
| **Attention & Focus** | Implemented | `attention_game.js` | Uses legacy DDA. |
| **Daily Sequencing** | Implemented | `sequencing_game.js` | Uses legacy DDA. |
| **Pattern Recognition** | Implemented | `pattern_game.js` | Uses legacy DDA. |
| **Legacy DDA** | Implemented | `on_device_dda.js` | Maintained for 3 games temporarily. |
| **On-device Q-learning** | Implemented | `memory_rl_agent.js` | Fully active for Memory Pairs. |
| **Offline local persistence** | Implemented | `local_db.js` (IndexedDB) | Active. |
| **Sync** | Implemented | `sync_manager.js`, `/api/v1/sync` | Active. |
| **Multilingual UI** | Implemented | `translations.js` | 7 languages supported. |
| **Voice instructions** | Implemented | `voice_service.js` (Web Speech) | Basic prompts active. |
| **Advanced voice assistant** | Planned | N/A | Conversational STT/TTS not yet active. |
| **Doctor dashboard** | Partially Implemented | `caregiver-portal/` | View trends/profiles. |
| **Caregiver dashboard** | Partially Implemented | `caregiver-portal/` | Alert and CarePlan UI present. |
| **Reminders** | Partially Implemented | Models exist, React UI exists. | Integration ongoing. |
| **Memory Album** | Planned | N/A | Not integrated into gameplay yet. |
| **Backend analytics** | Implemented | `analytics.py`, `anomaly_detector.py` | Functional but optional for gameplay. |

---

## 21. FUTURE DEVELOPMENT PRIORITIES

*(Based on the existing architecture. Do not present these as completed).*
1. Migrate remaining games from legacy DDA to on-device RL.
2. Improve cross-session RL state/history.
3. Complete Memory Album integration.
4. Improve multilingual voice interaction.
5. Improve offline synchronization robustness.
6. Expand caregiver/doctor analytics.
7. Add stronger testing for RL behaviour.
8. Validate that RL actions remain safe and bounded.
9. Improve patient-specific personalization.
