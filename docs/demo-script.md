# Demo rehearsal script

Target 2:45. This is a draft for a real recording, not a video or completed rehearsal. Use the local version while AWS remains blocked; do not narrate it as deployed.

| Time | Action | Spoken point |
|---|---|---|
| 0:00–0:12 | Overview and synthetic banner | “JalSetu helps a relief coordinator allocate limited water and vehicles within receiving windows. This is a synthetic exercise.” |
| 0:12–0:30 | Load example; explicitly choose both policies | “Stock, capacity and confirmed requests are declared examples. We choose the loading and closing rules explicitly.” |
| 0:30–0:52 | Generate; show job details, validator and unmet demand | “The planner checks its routes before publishing. Scheduled litres are estimates, not proof of delivery.” |
| 0:52–1:13 | Compare four strategies; show one tied or losing metric | “JalSetu need not win every metric. The complete comparison preserves tradeoffs.” |
| 1:13–1:37 | Approve; record loading, one cumulative delivery and failure | “Approval does not consume water. A report records delivered water; failure strands what remains.” |
| 1:37–1:58 | Generate depot revision; show difference and conservation | “Reported deliveries stay fixed. Unused depot vehicles can take new routes; recovery must be explicit.” |
| 1:58–2:18 | Compare tab; select closing target; run resource alternatives | “Each alternative and its baseline is solved separately. These example changes do not edit stock or approved operations.” |
| 2:18–2:34 | Evidence source dates/limitations, source ledger and task-card export | “No public weather is loaded. Toy routing is labelled. Source assumptions and checked instructions can be exported.” |
| 2:34–2:45 | Current architecture and evaluation | Local: “This runs offline through shared stages. The AWS stack is prepared; deployment and live checks are pending.” Live replacement only after evidence exists: show actual authorized execution and its recorded stages. |

Before recording: reset a clearly named exercise, choose test policies, confirm the solver completes within the segment, rehearse the precise event timestamps and keep a checked synthetic fallback fixture ready. Capture actual results; do not fabricate a spinner, execution ARN, provider map or output. The script's timing is a target, not a measured video duration.

AWS/video publication must show an actual deployed run before claiming cloud acceptance. Validate duration below three minutes and all final URLs in a signed-out browser. Store the video URL, deployment URL and submitted commit in the evidence manifest only when real.
