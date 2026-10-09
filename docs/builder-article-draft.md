# Making a relief plan inspectable — article draft

A relief coordinator has limited water, vehicle capacities and receiving windows. A plausible route is not enough: the coordinator needs to see unmet requests, understand tradeoffs and keep reported deliveries intact when a vehicle fails.

JalSetu's example prototype treats declared resources and requests as inputs. Four strategies share a stored travel matrix and an independent route validator. The comparison shows quantities, priority commitments, fulfilment and travel. It keeps ties and losses visible; a bounded heuristic is not a global optimization proof.

Approval creates immutable instructions. Water stays at the depot until a loading report. Delivery reports are cumulative, so repeating a total does not consume stock twice. Vehicle failure moves its remaining onboard litres to stranded stock. Only explicit recovery returns that stock. Depot-based revisions preserve completed reports and use unused vehicles; the revision table distinguishes reported quantities from future estimates.

Resource analysis is another set of calculations. The system independently solves a fresh baseline and five configurable example changes: stock, a vehicle, earlier starts, a chosen site's later closing and shorter service. Input snapshots and hashes make each result inspectable. Unsupported changes and worse outcomes remain visible. A scenario changes neither actual stock nor operations.

The local UI and API run the shared planning stages. A separately prepared AWS stack defines authenticated API access, a Standard workflow, one worker slot, owner-scoped conditional records and private immutable snapshots. Cloud execution, real road/weather data and Bedrock remain unverified; this draft deliberately makes no deployed-service claim. A read-only account check showed a free plan and $100 credits, while account verification and the Lambda quota form blocked deployment. Estimates are planning aids, not hard monetary caps.

Five synthetic fixtures generate a complete twenty-row evaluation. Results are software evidence, not real relief outcomes. No external coordinator participated. Live acceptance, user feedback and final publication links belong in a later factual update after they exist. Dependencies and AI assistance are disclosed; publication license remains a team decision.
