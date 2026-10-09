# Current limits

This prototype is an example-only planning exercise. Resources, requests, coordinates and travel are synthetic. Neither approved plans nor self-entered reports independently establish a dispatch, water quality, actual need or delivery.

- One depot, at most five vehicles and twenty points, one trip per vehicle. No reload or active-position replanning. A positive delivery report fixes that point; a second visit is outside this implementation.
- Planning is a bounded heuristic. Valid routes satisfy the declared constraints; failure within a calculation limit does not prove infeasibility. A resource scenario can tie or worsen the baseline; no universal best resource is claimed.
- Marginal analysis recalculates its baseline and five configurable alternatives, at most eight seconds each. It does not update physical stock, resource drafts, approvals or reports. An out-of-bounds alternative remains explicitly unavailable. Deltas are withheld unless both its baseline and child have feasible results.
- Source dates and attribution are visible; synthetic fixtures have no public retrieval time. Weather and population are not loaded. Live Location routing, source refresh/fallback wiring and provider policy choices remain pending.
- Optional explanation fact selection has an offline schema and failure fallback. Bedrock access, model choice, account eligibility and live SDK adapter remain unverified. Current output uses locally rendered deterministic facts.
- Local authentication is loopback isolation only. Cloud ownership/expiry and conditional storage are tested with fakes/SDK stubs; live sign-in, export expiry, orchestration and cloud concurrency require deployed acceptance.
- No external coordinator participated. Developer walkthroughs and synthetic evaluation are software evidence, not field validation. Hindi review is pending; no bilingual review is claimed.
- Browser download contents are tested, but the in-app browser did not confirm saving an actual file. A signed-out public review, real AWS recording and submitted commit do not exist yet.
- Mumbai account verification and Lambda quota block deployment. Credits are shared across the account. The seven-day estimate is not a spending cap. No free-plan upgrade or out-of-pocket spending is authorized.
- Three OR-Tools SWIG deprecation warnings remain. An earlier local operations-cache check flaked and then passed repeated diagnostics; its root cause remains unverified.
