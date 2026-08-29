# PS 26003 — AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients (NER)

An end-to-end, **100% offline-first** cognitive healthcare and clinical surveillance platform designed for elderly dementia and Mild Cognitive Impairment (MCI) patients in India's North Eastern Region (NER), their family caregivers, and clinicians.

---

## 1. System Architecture & Surfaces

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

## 2. Key Clinical & Algorithmic Features

### 2.1 Standardized Clinical Cognitive Scoring Pipeline
- Implements clinical trial psychometrics ($Z$-score $\rightarrow T$-score $\rightarrow 0\text{--}100$ rescaling):
  $$Z = \frac{\text{raw} - \mu_{\text{pop}}}{\sigma_{\text{pop}}}, \quad Z_{RT} = \frac{\mu_{RT} - \text{raw}_{RT}}{\sigma_{RT}} \text{ (inverted for speed)}, \quad Z_{\text{hint}} = \frac{\mu_{\text{hints}} - \text{raw}_{\text{hints}}}{\sigma_{\text{hints}}}$$
  $$T = 50 + (Z \times 10), \quad \text{Domain Score}_{0\text{--}100} = \text{clip}\left(\frac{T - 20}{60} \times 100, 0, 100\right)$$
- **Education & NER Bias Correction**: $+2$ points adjustment for $\le 12$ years education (LASI-DAD calibrated).
- **MoCA (0–30) / MMSE (0–30) Mapping**: Equipercentile translation to clinical stages (*Normal, MCI, Mild Dementia, Moderate/Severe Dementia*).

### 2.2 Two-Stage Cognitive Decline Anomaly Detection (arXiv:2511.16445)
- **Stage 1 (EWMA, $\lambda = 0.25$)**: Filters single-day fatigue/noise.
- **Stage 2 (Tabular CUSUM)**: Accumulates negative deviations to trigger a clinical alert upon detecting a sustained $>15\%$ drop over 7–14 days with near-zero false alarms.

### 2.3 Dynamic Difficulty Adjustment (DDA) & Flow State Psychometrics
- **Performance Index ($P_t \in [0, 1]$)**:
  $$P_t = \alpha \cdot A_t + \beta \cdot \max\left(0, 1 - \frac{RT_t}{RT_{\max}}\right) - \gamma \cdot \left(\frac{H_t}{H_{\max}}\right)$$
  Where $A_t \in [0, 1]$ is task accuracy, $RT_t$ is reaction time (ms), $H_t$ is hints consumed, with weights $\alpha = 0.5, \beta = 0.3, \gamma = 0.2$ ($\alpha + \beta + \gamma = 1.0$).
- **Continuous Difficulty Update**:
  $$D_{t+1} = \text{clamp}\left(D_t + \eta \cdot (P_t - P_{\text{target}}), D_{\min}, D_{\max}\right)$$
  Where $P_{\text{target}} = 0.70$ (Optimal Flow State zone), learning rate $\eta = 0.1$, $D_{\min} = 1.0, D_{\max} = 5.0$.
- **Frustration Guard**:
  If consecutive failure count $F \ge 2 \implies D_{t+1} = \max(D_{\min}, D_t - 2.0)$, time limits scaled $1.5\times$, and multimodal audio/visual cues triggered.
- **Plateau Guard**:
  If moving variance $\sigma^2(P_{t-5:t}) < 0.02$ and $P_{\text{avg}} < 0.50 \implies$ lock $D_t$ from increasing to avoid neurodegenerative cognitive fatigue.

#### Psychomotor Reaction Time Clinical Baselines:
| Cognitive Status | Simple Visual RT | Choice / Search RT | Memory Recall Task RT |
| :--- | :--- | :--- | :--- |
| **Healthy Elderly (65–80y)** | 320 – 420 ms | 650 – 850 ms | 900 – 1,400 ms |
| **Mild Cognitive Impairment (MCI)** | 450 – 600 ms | 900 – 1,300 ms | 1,600 – 2,500 ms |
| **Mild / Moderate Dementia** | 650 – 950 ms | 1,500 – 2,500+ ms | 3,000 – 5,000+ ms (with prompts) |

### 2.4 Offline-First Sync with Hybrid Logical Clocks & FHIR
- **Outbox Mutation Schema**: Client records queued with client-generated UUIDv4 and Hybrid Logical Clocks (`timestampms:counter:node_id`).
- **HL7 FHIR MedicationStatement**: Automatically transforms on-device daily adherence records into standard FHIR JSON format with LOINC/SNOMED-CT clinical codes.
- **India DPDP Act 2023 & Mental Healthcare Act 2017**: Validates legal representative consent before cloud ingestion.

---

## 3. The 4 Cognitive Mini-Games

1. **Memory Pairs (স্মৃতি খেল)**: Card pair matching featuring North Eastern cultural motifs (*Assamese Japi, Great Hornbill, One-Horned Rhino, Bihu Dhol, Mizo Bamboo, Tea Leaf*).
2. **Attention & Odd-One-Out (মনোযোগ খেল)**: Visual search and feature discrimination across dynamic $3\times 3, 4\times 4, 5\times 5$ grids.
3. **Daily Routine Sequencing (ধাৰাবাহিকতা খেল)**: Drag/tap temporal ordering of daily living tasks (*Brewing Assam Tea, Morning Medication, Washing Hands, Wearing Traditional Shawl*).
4. **Pattern & Shape Recognition (আকৃতি চিনাক্তকৰণ)**: Traditional handloom geometric pattern completion and silhouette discrimination.

---

## 4. Multi-Language Support (7 Languages)

- **Assamese (অসমীয়া)**
- **Bengali (বাংলা)**
- **Manipuri / Meitei (মৈতৈলোন্)**
- **Khasi (Ka Ktien Khasi)**
- **Mizo (Mizo ṭawng)**
- **Hindi (हिंदी)**
- **English**

---

## 5. Quickstart & Running Locally

### 5.1 Run AI Backend (FastAPI)
```bash
# In workspace root
python backend/seed_data.py   # Ingests OASIS dataset & seeds 30-day clinical trajectories
python backend/run.py         # Starts FastAPI on http://localhost:8000
```
- Interactive Swagger API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 5.2 Run Patient App (Offline Tablet PWA)
Open `patient-app/index.html` directly in any web browser, or serve with any static server:
```bash
npx serve patient-app
```
- Includes top-bar **"✈️ Airplane Mode / 📶 Online Sync"** toggle for live hackathon demonstration!

### 5.3 Run Caregiver & Clinician Web Portal (React / Vite)
```bash
cd caregiver-portal
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 6. Running Automated Tests
```bash
python -m pytest backend/tests
```
**Test Coverage:**
- `test_analytics.py`: Z-to-T score rescaling, MoCA/MMSE equipercentile mappings, education adjustments.
- `test_anomaly.py`: EWMA smoothing and CUSUM decline change-point detection.
- `test_dda.py`: Performance heuristics, frustration guard, plateau guard.
- `test_sync.py`: Idempotent UUID batch upserts and conflict resolution.
- `test_api_integration.py`: Endpoints for patient trajectories, alerts, and PDF report generation.
