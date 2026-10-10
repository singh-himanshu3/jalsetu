# Compare an original delivery plan with JalSetu

This local workflow creates a retrospective **model comparison**. It does not prove that JalSetu improved actual deliveries. Genuine anonymized coordinator records are still needed; the project has not obtained any.

## 1. Collect one day's records

Ask the coordinator for the stock, vehicle capacities/availability, confirmed point requests/windows, loading/unloading durations, and their **original dispatch sheet**. Keep the original files and references. Do not create an “original plan” by copying a JalSetu result. Use anonymized vehicle/point labels consistently; omit personal contacts and confidential details.

Optional: obtain actual reported delivered litres and recorded arrival/unloading-finish times. These may be added separately; they are not required for comparing the two modelled plans.

## 2. Enter that day's setup

Open **Start JalSetu.cmd**. Follow [using operational records](using-operational-records.md) to create a blank record project, enter resources and requests, select the actual operating rules, review the source and explicitly fetch matching roads. Save changes.

Use the original day's resources and requests, rather than changing them to make either plan perform better. Public roads collected now are later estimates, not historical traffic. Record this limitation when showing the report.

## 3. Open the original-plan comparison

In that record project, open **More → Compare original plan**. A previously generated JalSetu plan is not required: this action calculates a fresh proposal from the current setup. This feature is local; the prepared hosted release remains example-only.

Download the blank original-plan template and open it in a spreadsheet. Fill one row per originally planned stop, then save as CSV:

| Column | What to enter |
|---|---|
| Vehicle name | Exact vehicle label from Set up |
| Stop number | 1, 2, 3… in the original order, separately for each vehicle |
| Point name | Exact receiving-point label from Set up |
| Planned litres | Original whole-litre quantity; do not round or change it |
| Loading starts at (IST) | Recorded/planned original loading start, 24-hour HH:MM; repeat the same start on every row for that vehicle |

Only names that occur once in Set up can be matched. This version supports one trip per vehicle and one visit per point, with at most twenty stops in total. Multi-trip or repeated-point operations need a different comparison; do not squeeze them into this template.

## 4. Add reported deliveries if available

Download the optional delivery-record template:

| Column | What to enter |
|---|---|
| Point name | Exact receiving-point label from Set up |
| Reported delivered litres | One cumulative whole-litre total for that point on the day; partial quantities remain exact |
| Arrival at (IST) | Recorded 24-hour HH:MM time |
| Unloading finished at (IST) | Recorded 24-hour HH:MM time, at/after arrival |

A positive reported quantity needs both times. An explicitly recorded zero may leave both times blank. Omit points with unknown outcomes; **a missing report is not a zero delivery**. Multiple rows for the same point are rejected rather than double-counted. Do not sum partial deliveries with different timing into a single made-up timestamp: such records are outside this small workflow.

## 5. Preview and compare

Select the original CSV and, optionally, the delivery CSV. Enter an anonymized original-sheet/log reference. Click **Preview historical records**, inspect the tables, acknowledge review, then click **Compare original plan with JalSetu**.

The app preserves original quantities, stop order and loading starts. It reconstructs arrival/return times using the same stored roads, travel multiplier, declared loading/unloading durations and waiting until a point opens. It does not import original arrival estimates or repair the original plan. Both plans use the same independent constraint checker.

Unknown names, ambiguous sequences, duplicate visits or unavailable road legs are rejected with an explanation. A structurally readable original with stock/capacity/time/minimum/increment failures remains visible, but its feasible metrics and improvement difference are withheld. Do not interpret a failure against today's road estimates as proof that the original real operation failed.

## 6. Read and keep the evidence

The table shows scheduled litres, unmet requests, priority minimums, fulfilment, travel and return times. Zero and negative JalSetu-minus-original differences remain visible. No strategy is declared a universal winner.

Reported outcomes are shown separately. Only imported quantities are summed; missing points stay unknown. The selected start/finish closing rule classifies their recorded receiving-window timing. Oversupply, unconfirmed requests and reports above initial stock are flagged without rewriting the recorded totals. These rows do not verify vehicle capacity, actual travel, stock changes or physical dispatch.

Click **Download printable comparison report**. Open the HTML file and print or save as PDF. It includes record references, source dates/attribution, both plans' resources and constraints, all metrics, per-point quantities, reconstructed routes, reported outcomes and limitations. The comparison is read-only: it does not approve anything, import delivery events, or change saved operations. The on-screen report is temporary; download it before leaving the page. Retain the original anonymized input files too.

Honest wording: “Using the same declared resources and saved road estimates, JalSetu scheduled X more/fewer modelled litres than the original plan.” Actual outcome improvements, practicality and field impact require coordinator review and a real trial. No independently verified deliveries or NGO partnership are established by an import.
