# VaxPlan Indicator Reference Manual

This documentation acts as the central reference guide for all standard performance, coverage, financial, and supportive supervision metrics monitored in VaxPlan.

---

## 1. Immunization Coverage & Performance

### 1.1 Coverage

#### Vaccination Coverage Rate
- **Description**: Percentage of the target cohort group vaccinated with a specific antigen dose.
- **Numerator**: Number of children vaccinated with a specific antigen dose (e.g., Penta 3, MCV 1) in the target cohort period.
- **Numerator Data Source**: Client vaccination records from completed outreach/static sessions (logbooks).
- **Denominator**: Estimated target population of children in the same age group (e.g., Under-1 target population).
- **Denominator Data Source**: Imported census target population or WorldPop gridded population data.
- **Calculation Formula**: `Coverage Rate (%) = (Vaccinated Count / Target Population) * 100`
- **Calculation Example**: If 85 children out of 100 estimated under-1 children are vaccinated: `(85 / 100) * 100 = 85% coverage.`
- **Online Reference Guide**: [WHO Immunization Coverage Guidelines](https://www.who.int/teams/immunization-vaccines-and-biologicals/immunization-analysis-and-insights/surveillance-and-monitoring/immunization-coverage)

#### Zero-Dose Villages Count
- **Description**: Total number of villages in the catchment area that have received no vaccination sessions.
- **Numerator**: Number of villages that have not been reached by any completed/achieved outreach or vaccination session.
- **Numerator Data Source**: Session plans achievement status database tables.
- **Denominator**: Total number of registered villages within the health facility's or administrative area's catchment.
- **Denominator Data Source**: Village registry and geographic boundaries configuration.
- **Calculation Formula**: A village is Zero-Dose if there are zero records of achieved session plans associated with it.
- **Calculation Example**: If a facility catchment has 10 villages, and 2 villages have no recorded achieved sessions: 2 zero-dose villages.
- **Online Reference Guide**: [Gavi Zero-Dose Funding Guidelines](https://www.gavi.org/our-alliance/strategy/phase-5-2021-2025/zero-dose-children-and-missed-communities)

#### Hard-to-Reach (HTR) Zero-Dose Villages
- **Description**: Total number of zero-dose villages with the Hard-to-Reach (HTR) flag enabled.
- **Numerator**: Number of zero-dose villages with the Hard-to-Reach (HTR) flag set to true in the database.
- **Numerator Data Source**: Village table is_hard_to_reach attributes and session plans status.
- **Denominator**: Total number of registered villages within the catchment area.
- **Denominator Data Source**: Village registry database table.
- **Calculation Formula**: Sum of villages where is_hard_to_reach = true AND no achieved outreach sessions have occurred.
- **Calculation Example**: If 4 out of 10 villages are hard-to-reach, and 1 has no sessions recorded: 1 HTR zero-dose village.
- **Online Reference Guide**: [UNICEF Equity in Immunization / Gavi REACH](https://www.unicef.org/reports/reaching-every-child-health-equity)

---

### 1.2 Dropouts

#### DTP1 → DTP3 Dropout Rate
- **Description**: Percentage of children starting the DTP series who dropped out before completing the 3rd dose.
- **Numerator**: Number of children who received DTP1 (Penta 1) but did not receive DTP3 (Penta 3) in the target period.
- **Numerator Data Source**: DTP1 and DTP3 client-level vaccination records.
- **Denominator**: Total number of children who received DTP1 (Penta 1) in the cohort period.
- **Denominator Data Source**: DTP1 vaccination entries in client logbooks.
- **Calculation Formula**: `Dropout Rate (%) = ((DTP1 - DTP3) / DTP1) * 100`
- **Calculation Example**: If 120 children received DTP1 and only 90 received DTP3: `((120 - 90) / 120) * 100 = 25% dropout rate.`
- **Online Reference Guide**: [WHO Guidance on Immunization Performance Monitoring](https://www.who.int/publications/i/item/9789241514941)

#### DTP1 → MCV1 Dropout Rate
- **Description**: Percentage of children starting the DTP series who did not receive their first Measles dose.
- **Numerator**: Number of children who received DTP1 (Penta 1) but did not receive MCV1 (Measles-Containing Vaccine 1).
- **Numerator Data Source**: DTP1 and MCV1 client-level vaccination records.
- **Denominator**: Total number of children who received DTP1 (Penta 1) in the cohort period.
- **Denominator Data Source**: DTP1 vaccination entries in client logbooks.
- **Calculation Formula**: `Dropout Rate (%) = ((DTP1 - MCV1) / DTP1) * 100`
- **Calculation Example**: If 100 children received DTP1 and only 80 received MCV1: `((100 - 80) / 100) * 100 = 20% dropout rate.`
- **Online Reference Guide**: [WHO Guidance on Immunization Performance Monitoring](https://www.who.int/publications/i/item/9789241514941)

---

## 2. Operational & Planning

### 2.1 Session Execution

#### Session Completion Rate
- **Description**: Percentage of scheduled vaccination sessions successfully conducted.
- **Numerator**: Number of planned outreach/static sessions successfully executed and marked as achieved.
- **Numerator Data Source**: Conducted/achieved session plans.
- **Denominator**: Total number of planned sessions registered within the microplan period.
- **Denominator Data Source**: Session planning registry (scheduled/cancelled/conducted).
- **Calculation Formula**: `Completion Rate (%) = (Achieved Sessions / Total Planned Sessions) * 100`
- **Calculation Example**: If a facility planned 20 sessions for the quarter and successfully conducted 18: `(18 / 20) * 100 = 90% completion rate.`
- **Online Reference Guide**: [National Ministry of Health Routine Microplanning Framework](https://www.who.int/teams/immunization-vaccines-and-biologicals)

#### Missed Communities Count
- **Description**: Total number of unique villages with planned sessions that were not achieved.
- **Numerator**: Number of unique villages associated with planned sessions that were not achieved.
- **Numerator Data Source**: Unconducted/missed session plans linked to villages.
- **Denominator**: Total number of villages planned for sessions in the microplan.
- **Denominator Data Source**: Microplan session villages targets.
- **Calculation Formula**: Count of unique village_ids where the parent session plan is_achieved = false.
- **Calculation Example**: If 5 villages were scheduled to be visited but session-days were cancelled for 2 of them: 2 missed communities.
- **Online Reference Guide**: [VaxPlan Missed Communities Monitoring Protocol](https://www.who.int/teams/immunization-vaccines-and-biologicals)

---

### 2.2 Microplanning Status

#### Microplan Completion Rate
- **Description**: Percentage of expected facility microplans approved/locked.
- **Numerator**: Number of microplans currently in approved or locked status.
- **Numerator Data Source**: Microplan workflow logs and approval stamps.
- **Denominator**: Total microplans initiated or created for the current planning cycle.
- **Denominator Data Source**: Microplan registry entries.
- **Calculation Formula**: `Percentage (%) = (Approved or Locked Microplans / Total Microplans) * 100`
- **Calculation Example**: If 8 out of 10 health facilities have approved microplans for the cycle: `(8 / 10) * 100 = 80% completion rate.`
- **Online Reference Guide**: [National Health Operations Management Guidelines](https://www.who.int/teams/immunization-vaccines-and-biologicals)

---

## 3. Financial & Budget

### 3.1 Resource Allocation

#### Budget Realization Rate
- **Description**: Percentage of requested budget lines approved for disbursement.
- **Numerator**: Total cost of budget items that have been officially reviewed and approved.
- **Numerator Data Source**: Approved lines in facility/district budget sheets.
- **Denominator**: Total planned cost of all submitted budget items.
- **Denominator Data Source**: Submitted planned budget items.
- **Calculation Formula**: `Realization Rate (%) = (Approved Budget / Total Planned Budget) * 100`
- **Calculation Example**: If a microplan requested $5,000 and the district approved budget lines totaling $4,000: `($4,000 / $5,000) * 100 = 80% realization rate.`
- **Online Reference Guide**: [WHO Vaccine Financing and Sustainable Funding](https://www.who.int/teams/immunization-vaccines-and-biologicals/financing-and-sustainable-funding)

---

## 4. Supervision

### 4.1 Supervision Performance

#### Supervision Visit Completion Rate
- **Description**: Percentage of scheduled supportive supervision visits completed.
- **Numerator**: Number of planned supportive supervision visits marked as conducted.
- **Numerator Data Source**: Conducted supportive supervision checklists.
- **Denominator**: Total scheduled supervision visits registered in the system.
- **Denominator Data Source**: Scheduled supervision records.
- **Calculation Formula**: `Completion Rate (%) = (Conducted Visits / Total Scheduled Visits) * 100`
- **Calculation Example**: If 5 visits were scheduled for the quarter and 4 were conducted: `(4 / 5) * 100 = 80% completion rate.`
- **Online Reference Guide**: [WHO Integrated Supportive Supervision (ISS) guidelines](https://www.who.int/publications/i/item/training-for-mid-level-managers-(mlm)-module-4-supportive-supervision)

#### Average Supervision Score
- **Description**: Rolled up quality score across all supervision scorecards.
- **Numerator**: Sum of score percentages obtained across all conducted supervision visits.
- **Numerator Data Source**: Supportive supervision checklist scorecards.
- **Denominator**: Total number of conducted supervision visits with recorded scorecards.
- **Denominator Data Source**: Conducted supportive supervision checklist log.
- **Calculation Formula**: `Average Score = Sum(recorded scores) / Count(recorded scores)`
- **Calculation Example**: If three supervision scorecards recorded scores of 70%, 80%, and 90%: `(70 + 80 + 90) / 3 = 80% average score.`
- **Online Reference Guide**: [WHO Integrated Supportive Supervision (ISS) guidelines](https://www.who.int/publications/i/item/training-for-mid-level-managers-(mlm)-module-4-supportive-supervision)
