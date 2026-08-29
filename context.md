# Context & Architecture Reference: Cognitive Care Platform (PS 26003)

> **File:** `context.md`  
> **Purpose:** Master reference and context document for AI agents and developers. Contains complete architectural blueprints, algorithmic formulations, data models, file breakdowns, API endpoints, and deployment instructions.

---

## 1. Project Overview & Clinical Mission

- **Problem Statement:** PS 26003 — AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia & Mild Cognitive Impairment (MCI) Patients in India's North Eastern Region (NER).
- **Core Vision:** A **100% offline-first**, culturally adapted, bilingual/multilingual cognitive surveillance and memory rehabilitation platform catering to elderly patients across Assam, Meghalaya, Manipur, Mizoram, and broader India.
- **Key Stakeholders:**
  1. **Elderly Patients (60–85+ years):** Tablet/PWA interface with accessible targets ($\ge 64\text{dp}$), high contrast, voice guidance in 7 languages, and non-stigmatizing cultural games.
  2. **Family Caregivers & ASHA / Anganwadi Workers:** Care plan manager, adherence tracking, real-time alert triage, and emergency escalations.
  3. **Clinicians / Neurologists:** Longitudinal 30-day cognitive trends, LOINC-compliant PDF clinical exports, MoCA/MMSE equipercentile mappings, and anomaly detection.

---

## 2. High-Level System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                       PATIENT DEVICE (Tablet / PWA)                       │
│  ┌──────────────────┐   ┌──────────────────────┐   ┌────────────────────┐ │
│  │ Accessible UI    │   │ 4 Mini-Games         │   │ Multilingual Voice │ │
│  │ (>=64dp targets, │   │ (Memory, Attention,  │   │ (STT/TTS: As, Bn,  │ │
│  │  >=20sp text,    │   │  Sequencing,         │   │  Mni, Kha, Lus,    │ │
│  │  High-Contrast)  │   │  Pattern Match)      │   │  Hi, En)           │ │
│  └────────┬─────────┘   └──────────┬───────────┘   └─────────┬──────────┘ │
│           └────────────────┬───────┴────────────────┬────────┘            │
│                            ▼                        ▼                     │
│                  ┌───────────────────┐    ┌───────────────────┐           │
│                  │ On-Device DDA     │    │ IndexedDB Local DB│           │
│                  │ (Heuristic Model +│    │ (synced=0 queue,  │           │
│                  │  Guards)          │    │  tasks, mood logs)│           │
│                  └───────────────────┘    └─────────┬─────────┘           │
│                                                     │ Opportunistic Sync  │
│                                                     │ (When Online)       │
└─────────────────────────────────────────────────────┼─────────────────────┘
                                                      │
                                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         AI BACKEND (FastAPI, Python)                      │
│  ┌──────────────────┐   ┌──────────────────────┐   ┌────────────────────┐ │
│  │ Batch Sync API   │   │ Cognitive Analytics  │   │ Clinical Alert     │ │
│  │ (Idempotent UUID │   │ & Anomaly Pipeline   │   │ Engine (Drop >15%, │ │
│  │  Upserts)        │   │ (Z->T Rescaling,     │   │  Missed Meds,      │ │
│  │                  │   │  EWMA + CUSUM)       │   │  Inactivity)       │ │
│  └────────┬─────────┘   └──────────┬───────────┘   └─────────┬──────────┘ │
│           └────────────────┬───────┴────────────────┬────────┘            │
│                            ▼                        ▼                     │
│                  ┌───────────────────┐    ┌───────────────────┐           │
│                  │ SQLite / Postgres │    │ Clinical PDF Gen  │           │
│                  │ Database          │    │ (ReportLab/LOINC) │           │
│                  └─────────┬─────────┘    └───────────────────┘           │
└────────────────────────────┼──────────────────────────────────────────────┘
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│               CAREGIVER / CLINICIAN WEB PORTAL (React, Recharts)          │
│  • 30-Day Domain Trends (Recharts)   • Clinical Alert Center              │
│  • 4-Axis Cognitive Radar Profile    • Care Plan & Medication Scheduler   │
│  • SIH Live Sync Demo Sandbox        • LOINC 72172-0 PDF Report Exporter  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory & File Manifest

```
sih/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py          # API router aggregating all endpoints
│   │   │       ├── alerts.py            # Alert list, get, acknowledge endpoints
│   │   │       ├── analytics.py         # Cognitive trajectories, radar profiles, MMSE/MoCA
│   │   │       ├── auth.py              # Caregiver/Clinician JWT authentication
│   │   │       ├── dda.py               # Difficulty recommendation endpoints
│   │   │       ├── patients.py          # Patient CRUD, reminders, task logs
│   │   │       ├── reports.py           # Clinical PDF generation & export
│   │   │       ├── sync.py              # Offline-first batch mutation sync endpoint
│   │   │       └── voice.py             # Voice AI, translation & transliteration API
│   │   ├── core/
│   │   │   ├── config.py                # Pydantic Settings & environment config
│   │   │   ├── database.py              # SQLAlchemy engine, session maker, Base
│   │   │   ├── dpdp_compliance.py       # India DPDP Act 2023 & MHA 2017 consent validator
│   │   │   └── security.py              # Password hashing (bcrypt) and JWT tokens
│   │   ├── models/
│   │   │   ├── __init__.py              # Export database models
│   │   │   ├── alert.py                 # Clinical Alert model
│   │   │   ├── cognitive.py             # CognitiveScore and DDAConfig models
│   │   │   ├── patient.py               # Patient, Caregiver, AuditLog models
│   │   │   ├── session.py               # GameSession raw gameplay telemetry model
│   │   │   └── task.py                  # TaskLog (ADL), MoodLog, Reminder models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── alert_schemas.py         # Alert Pydantic schemas
│   │   │   ├── analytics_schemas.py     # Analytics & profile schemas
│   │   │   ├── dda_schemas.py           # DDA configuration schemas
│   │   │   ├── patient_schemas.py       # Patient registration & detail schemas
│   │   │   └── sync_schemas.py          # Batch sync payload schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── alert_engine.py          # Rule engine for missed meds, inactivity & drops
│   │   │   ├── analytics_service.py     # Z-to-T score, LASI-DAD education bias, MoCA/MMSE
│   │   │   ├── anomaly_detector.py      # EWMA filtering & Tabular CUSUM decline detector
│   │   │   ├── dda_engine.py            # Flow state heuristics, Frustration & Plateau guards
│   │   │   ├── report_generator.py      # ReportLab clinical PDF generator (LOINC 72172-0)
│   │   │   ├── sync_service.py          # Idempotent UUID upserts & outbox mutation processor
│   │   │   └── voice_ai/
│   │   │       ├── asr_engine.py        # Speech-to-Text wrapper (Bhashini/Whisper)
│   │   │       ├── translation_engine.py# IndicTrans2 7-language translation engine
│   │   │       ├── transliteration_engine.py # Indic transliteration for NER scripts
│   │   │       └── tts_engine.py        # Text-to-Speech synthesis (FastSpeech2/Kokoro)
│   │   └── main.py                      # FastAPI app instance, CORS, SQLite auto-migration
│   ├── tests/
│   │   ├── test_analytics.py            # Unit tests for scoring, Z/T scale, LASI-DAD adjustments
│   │   ├── test_anomaly.py              # Unit tests for EWMA and CUSUM decline detection
│   │   ├── test_api_integration.py      # End-to-end FastAPI endpoint integration tests
│   │   ├── test_dda.py                  # Unit tests for flow index, frustration & plateau guards
│   │   ├── test_sync.py                 # Unit tests for idempotent batch sync & conflict resolution
│   │   └── test_voice_ai.py             # Unit tests for Indic translation & transliteration
│   ├── Dockerfile                       # Container definition for FastAPI backend
│   ├── requirements.txt                 # Python dependencies
│   ├── run.py                           # CLI entrypoint to run uvicorn
│   └── seed_data.py                     # Synthetic & OASIS dataset seeder (30-day trajectories)
│
├── caregiver-portal/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CognitiveRadar.jsx       # 4-Axis Recharts Radar chart (Memory/Attention/Seq/Pattern)
│   │   │   ├── Header.jsx               # Navigation bar with online status & language switcher
│   │   │   ├── LiveSyncSimulator.jsx    # SIH Live Interactive Hackathon Sync Demonstration sandbox
│   │   │   ├── RegisterPatientModal.jsx # Form modal to register new patients with baseline MoCA
│   │   │   ├── Sidebar.jsx              # App navigation sidebar
│   │   │   └── TrendCharts.jsx          # 30-day longitudinal line charts with EWMA & CUSUM alerts
│   │   ├── pages/
│   │   │   ├── AlertsPage.jsx           # Triage interface for clinical & adherence alerts
│   │   │   ├── CarePlansPage.jsx        # Care plan scheduler, medication reminders & task tracker
│   │   │   ├── Dashboard.jsx            # High-level overview, patient list, alert counters
│   │   │   ├── PatientDetail.jsx        # Comprehensive 360-degree patient cognitive overview
│   │   │   └── ReportsPage.jsx          # LOINC clinical report generation & PDF download page
│   │   ├── services/
│   │   │   └── api.js                   # Axios/Fetch API client communicating with FastAPI backend
│   │   ├── App.jsx                      # Main React application with 3-second auto-polling
│   │   ├── index.css                    # Tailwind CSS imports & custom styles
│   │   └── main.jsx                     # React DOM root render
│   ├── package.json                     # React, Vite, Lucide-react, Recharts, TailwindCSS
│   ├── vite.config.js                   # Vite configuration (port 3000)
│   └── Dockerfile                       # Production NGINX/Node build container
│
├── patient-app/
│   ├── js/
│   │   ├── db/
│   │   │   └── local_db.js              # IndexedDB wrapper (sessions, scores, tasks, sync queue)
│   │   ├── dda/
│   │   │   └── on_device_dda.js         # Client-side DDA logic, difficulty scaling & flow index
│   │   ├── games/
│   │   │   ├── attention_game.js        # Odd-One-Out grid visual discrimination game
│   │   │   ├── memory_game.js           # Cultural card-matching memory game
│   │   │   ├── pattern_game.js          # Traditional handloom pattern recognition game
│   │   │   └── sequencing_game.js       # Daily routine temporal order sequencing game
│   │   ├── sync/
│   │   │   └── sync_manager.js          # Offline queue manager, auto-sync upon reconnection
│   │   ├── voice/
│   │   │   ├── translations.js          # Full 7-language UI & game localization strings
│   │   │   └── voice_service.js         # Web Speech API & audio playback integration
│   │   └── app.js                       # Main PWA application logic, tab switcher, audio feedback
│   ├── index.html                       # Accessible, high-contrast dark theme PWA interface
│   └── manifest.json                    # Web App Manifest for tablet installation
│
├── resouces/                            # Clinical validation papers & OASIS dataset
│   ├── dementia_dataset.csv             # OASIS Longitudinal Dementia clinical dataset
│   ├── 2511.16445v1.pdf                 # Reference paper for EWMA/CUSUM decline detection
│   ├── DAD2-18-e70291.pdf               # LASI-DAD population cognitive calibration paper
│   └── ...                              # Clinical and DPDP compliance whitepapers
│
├── cognitive_care.db                    # Pre-seeded SQLite database for instant local demo
├── docker-compose.yml                   # Multi-container orchestration (Backend + Caregiver Portal)
├── package.json                         # Root project scripts
└── README.md                            # Comprehensive public documentation
```

---

## 4. Algorithmic Formulations & Clinical Science

### 4.1 Psychometric Cognitive Scoring Pipeline
Clinical trial psychometrics standardizes raw gameplay metrics into norm-referenced $0\text{--}100$ scores:

$$Z = \frac{\text{raw} - \mu_{\text{pop}}}{\sigma_{\text{pop}}}$$

$$Z_{\text{RT}} = \frac{\mu_{\text{RT}} - \text{raw}_{\text{RT}}}{\sigma_{\text{RT}}} \quad (\text{inverted so faster reaction time yields higher } Z)$$

$$Z_{\text{hint}} = \frac{\mu_{\text{hints}} - \text{raw}_{\text{hints}}}{\sigma_{\text{hints}}}$$

$$T = 50 + (Z \times 10)$$

$$\text{Domain Score}_{0\text{--}100} = \text{clip}\left(\frac{T - 20}{60} \times 100, 0, 100\right)$$

#### Education & NER Bias Correction (LASI-DAD Calibrated)
Elderly individuals with low formal schooling ($\le 12$ years) receive $+2$ to $+4$ points adjustment on raw scoring to prevent false positive dementia classification caused by educational/literacy disparity.

#### Equipercentile Mapping to MoCA / MMSE Stages
| Composite Score ($0\text{--}100$) | Estimated MoCA ($0\text{--}30$) | Estimated MMSE ($0\text{--}30$) | Clinical Stage |
| :--- | :--- | :--- | :--- |
| $\ge 80$ | $26\text{--}30$ | $28\text{--}30$ | Normal Cognition |
| $65\text{--}79$ | $22\text{--}25$ | $24\text{--}27$ | Mild Cognitive Impairment (MCI) |
| $45\text{--}64$ | $16\text{--}21$ | $18\text{--}23$ | Mild Dementia |
| $< 45$ | $< 16$ | $< 18$ | Moderate to Severe Dementia |

---

### 4.2 Two-Stage Cognitive Decline Anomaly Detection

To eliminate daily noise (sleep deprivation, temporary illness, fatigue) while detecting genuine neurodegenerative decline:

1. **Stage 1 (EWMA Filtering, $\lambda = 0.25$):**
   $$S_t = \lambda \cdot X_t + (1 - \lambda) \cdot S_{t-1}$$
2. **Stage 2 (Tabular CUSUM Change-Point Detection):**
   $$C_t^- = \max\left(0, C_{t-1}^- + (\mu_0 - S_t - k)\right)$$
   Where reference parameter $k = 0.5 \cdot \sigma$, and threshold $h = 4 \cdot \sigma$.  
   When $C_t^- > h$, an automated clinical escalation alert is generated indicating a sustained drop $>15\%$ over $7\text{--}14$ days.

---

### 4.3 Dynamic Difficulty Adjustment (DDA) & Flow State

To keep elderly dementia patients in Csíkszentmihályi's **Optimal Flow State** (preventing both anxiety/frustration and boredom):

- **Performance Index ($P_t \in [0, 1]$):**
  $$P_t = \alpha \cdot A_t + \beta \cdot \max\left(0, 1 - \frac{\text{RT}_t}{\text{RT}_{\max}}\right) - \gamma \cdot \left(\frac{H_t}{H_{\max}}\right)$$
  Default weights: $\alpha = 0.50$, $\beta = 0.30$, $\gamma = 0.20$.
- **Continuous Update:**
  $$D_{t+1} = \text{clamp}\left(D_t + \eta \cdot (P_t - P_{\text{target}}), 1.0, 5.0\right) \quad (\text{Target } P_{\text{target}} = 0.70, \eta = 0.1)$$
- **Frustration Guard:** If consecutive abandonment / failure count $F \ge 2 \implies D_{t+1} = \max(1.0, D_t - 2.0)$, time limits multiplied by $1.5\times$, and multimodal audio/visual prompts enabled.
- **Plateau Guard:** If variance $\sigma^2(P_{t-5:t}) < 0.02$ and $P_{\text{avg}} < 0.50$, difficulty is locked to prevent cognitive exhaustion.

---

## 5. Multilingual & Cultural Support (7 Languages)

The platform supports 7 regional and national languages with native audio prompts and cultural motifs:

1. **Assamese (অসমীয়া / `as`):** Japi, Great Hornbill, Kaziranga Rhino, Bihu Dhol, Assam Tea.
2. **Bengali (বাংলা / `bn`):** Regional folk art and daily routine sequences.
3. **Manipuri / Meitei (মৈতৈলোন্ / `mni`):** Traditional motifs and bilingual Meitei Mayek script.
4. **Khasi (Ka Ktien Khasi / `kha`):** Meghalaya handloom patterns and local living tasks.
5. **Mizo (Mizo ṭawng / `lus`):** Traditional Mizo bamboo and handloom art.
6. **Hindi (हिंदी / `hi`):** Devanagari geriatric voice synthesis.
7. **English (`en`):** International clinical baseline standard.

---

## 6. Database Models & Schema Summary

| Table Name | Primary Purpose | Key Fields |
| :--- | :--- | :--- |
| `caregivers` | Caregiver and clinician logins | `id`, `email`, `hashed_password`, `full_name`, `role`, `phone`, `created_at` |
| `patients` | Patient demographic and baseline clinical profile | `id`, `first_name`, `last_name`, `age`, `gender`, `education_years`, `state_region`, `primary_language`, `baseline_mmse`, `baseline_moca`, `caregiver_id` |
| `game_sessions` | Granular telemetry per game round | `id` (UUID), `patient_id`, `game_type`, `level`, `score`, `accuracy`, `reaction_time_ms`, `hints_used`, `completion_status`, `started_at`, `ended_at` |
| `cognitive_scores` | Normalized daily domain evaluations | `id` (UUID), `patient_id`, `date`, `memory_score`, `attention_score`, `sequencing_score`, `pattern_score`, `composite_score`, `estimated_mmse`, `estimated_moca` |
| `dda_configs` | Patient-specific dynamic difficulty state | `id`, `patient_id`, `game_type`, `current_level`, `performance_index`, `consecutive_failures`, `plateau_detected` |
| `task_logs` | Daily living (ADL) and medication adherence | `id` (UUID), `patient_id`, `task_name`, `task_type`, `scheduled_time`, `completed_at`, `status`, `notes` |
| `mood_logs` | Daily emotional wellbeing logs | `id` (UUID), `patient_id`, `mood_score`, `notes`, `created_at` |
| `reminders` | Medication and hydration reminders | `id`, `patient_id`, `title`, `time_str`, `medication_name`, `dosage`, `is_active` |
| `alerts` | Clinical, decline, and adherence alerts | `id`, `patient_id`, `alert_type`, `severity`, `title`, `description`, `is_acknowledged`, `action_taken`, `created_at` |
| `audit_logs` | DPDP Act 2023 compliance audit trail | `id`, `user_id`, `action`, `resource_type`, `resource_id`, `timestamp` |

---

## 7. REST API Endpoints Reference (`/api/v1`)

### Authentication (`/auth`)
- `POST /api/v1/auth/login`: Authenticates caregiver/clinician and returns JWT access token.

### Patients (`/patients`)
- `GET /api/v1/patients`: List all registered patients.
- `POST /api/v1/patients`: Register a new patient.
- `GET /api/v1/patients/{id}`: Get full patient details.
- `GET /api/v1/patients/{id}/reminders`: Get reminders for a patient.
- `POST /api/v1/patients/{id}/reminders`: Add a new medication/task reminder.
- `DELETE /api/v1/patients/{id}/reminders/{rem_id}`: Delete a reminder.

### Cognitive Analytics (`/analytics`)
- `GET /api/v1/analytics/{patient_id}/trends?range_days=30`: 30-day longitudinal scores with EWMA & CUSUM anomaly tags.
- `GET /api/v1/analytics/{patient_id}/cognitive-profile`: 4-axis domain radar profile ($0\text{--}100$) + MMSE/MoCA.

### Clinical Alerts (`/alerts`)
- `GET /api/v1/alerts`: List alerts filtered by severity or acknowledgement status.
- `POST /api/v1/alerts/{id}/acknowledge`: Acknowledge an alert with clinical action notes.

### Offline Sync (`/sync`)
- `POST /api/v1/sync/batch`: Ingests queued client mutations (sessions, scores, task logs, mood logs) with idempotent UUID upserts.

### Clinical Reports (`/reports`)
- `GET /api/v1/reports/{patient_id}/export?range_days=30`: Generates downloadable clinical PDF report (LOINC 72172-0).

### Voice AI (`/voice`)
- `POST /api/v1/voice/translate`: Translate prompt text into target Indic language.
- `POST /api/v1/voice/transliterate`: Transliterate text between Latin and Indic scripts.
- `POST /api/v1/voice/tts`: Generate TTS audio stream for patient guidance.

---

## 8. Offline-First Sync & Data Privacy

1. **Client Storage:** IndexedDB stores raw telemetry, gameplay logs, medication completions, and DDA state on the client device.
2. **Outbox Synchronization:** Records are marked `is_synced = 0`. When network connectivity is established, `sync_manager.js` sends an idempotent batch payload to `/api/v1/sync/batch`.
3. **Conflict Resolution:** Server enforces `client_generated_uuid` uniqueness. If an identical UUID exists, timestamps are compared to prevent duplicate ingestion.
4. **Regulatory Compliance:**
   - **India DPDP Act 2023:** On-device patient pseudonymization; explicit legal representative consent required.
   - **Mental Healthcare Act 2017:** Nominated representative consent verification.
   - **HL7 FHIR & LOINC 72172-0:** Standardized clinical document formatting.

---

## 9. Verification & Automated Tests

To run the complete test suite:

```bash
python -m pytest backend/tests
```

**20 Automated Tests verify:**
- `test_analytics.py`: Z-to-T score rescaling, MoCA/MMSE equipercentile mappings, education adjustments.
- `test_anomaly.py`: EWMA smoothing and CUSUM decline change-point detection.
- `test_dda.py`: Performance heuristics, frustration guard, plateau guard.
- `test_sync.py`: Idempotent UUID batch upserts and conflict resolution.
- `test_api_integration.py`: Endpoints for patient trajectories, alerts, and PDF report generation.
- `test_voice_ai.py`: Indic translation lexicon and transliteration engines.

---

## 10. Quickstart Commands

```bash
# 1. AI Backend (FastAPI)
python backend/seed_data.py   # Ingests OASIS dataset & seeds 30-day clinical trajectories
python backend/run.py         # Starts FastAPI on http://localhost:8000 (Swagger docs at /docs)

# 2. Patient App (PWA)
# Open patient-app/index.html in any browser, or serve with:
npx serve patient-app

# 3. Caregiver & Clinician Portal (React + Vite)
cd caregiver-portal
npm install
npm run dev                   # Starts React dashboard on http://localhost:3000
```
