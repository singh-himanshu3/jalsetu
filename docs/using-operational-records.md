# Using actual operational records in JalSetu

This workflow is available locally. It does not require AWS. You need genuine, permitted records; the app cannot obtain a coordinator's requests or inventory from a map. Operator-entered records are declarations and are not independently verified. The hosted demo remains example-only.

## 1. Obtain one day's records

Ask a water-delivery coordinator for an anonymized past day: depot location/stock/loading hours, vehicle capacities/working hours, receiving locations, actual requested litres, receiving limits/hours and unloading time. Ask the coordinator to specify minimum useful deliveries, priorities/reasons and confirmation. Do not invent absent values. Keep their original dispatch plan and observed delivery/arrival records separately for a later historical comparison. Personal names and phone numbers are not required.

This pilot supports one depot, at most five vehicles and twenty receiving points, inside a Delhi area no wider than 0.1 degrees longitude or latitude. The supported envelope is longitude 76.8–77.5 and latitude 28.3–29.0. Other locations require a separate scope change. Routes use a public car profile; the coordinator must check tanker access and receiving permission.

## 2. Open the application

Open **Start JalSetu.cmd** and keep its window running. Visit **http://127.0.0.1:8787** when ready. If that port is occupied, stop the previous local copy first. A separate agent preview may use 8789 and separate test storage; it is not your normal saved workspace.

## 3. Create an empty project

On Home, expand **Saved projects & operational records**. Enter a project name and the actual operating date. Select **Use operational records · local only**, acknowledge permitted/anonymized records, and choose **Create empty record-based project**. Nothing is prefilled as an actual operational resource.

## 4. Enter the depot and rules

In **Water & timing**, enter actual available litres, opening/closing hours and loading minutes. Times are IST. Choose both operating rules yourself: whether unloading must finish before closure, and whether loading can happen in parallel. Expand **Names, coordinates and resource setup** and enter the depot's name and actual longitude/latitude. These are separate numbers; do not swap them. The safe-water checkbox records the responsible operator's declaration, not a certification.

## 5. Enter vehicles

Choose **Next: Vehicles**. In resource setup, click **Add vehicle** and give it an anonymized name. Enter capacity and availability. Expand **Vehicle working hours** to enter its actual start and return deadline. Repeat for each vehicle. New vehicles start unavailable with blank quantities/hours; you must supply these records.

## 6. Enter receiving points manually or by CSV

Choose **Next: Water requests**. For manual entry, add points in resource setup, enter names/coordinates and priority reasons, then fill requested litres, minimum useful litres, receiving limits, priority and confirmation in the table. Enter receiving hours and unloading minutes in the dedicated section. Only confirmed requests can receive planned visits.

For CSV import, first enter the source notes in step 7 below. Then expand **Import receiving points from a spreadsheet**, download the blank template, fill it in your spreadsheet app, and save as CSV. The headings are:

| Column | What to enter |
|---|---|
| Point name | An anonymized label |
| Longitude / Latitude | Recorded location, separate numeric columns |
| Requested litres | Actual request, whole litres |
| Minimum useful litres | Coordinator-declared minimum useful delivery |
| Receiving limit litres | Confirmed maximum the point can receive |
| Opens at (IST) / Closes at (IST) | 24-hour HH:MM, such as the format 08:30 |
| Unloading minutes | Recorded or explicitly coordinator-declared service duration |
| Priority | critical, high or standard |
| Priority reason | Coordinator's reason, not inferred from map/weather data |
| Request status | draft, contacted or confirmed |

Select the CSV, choose **Check & preview receiving points**, inspect the names/quantities/hours, then choose **Replace draft points with these records**. This replaces the entire draft point list and clears old road estimates and planning results. It does not change saved approved runs. The new import does not merge with existing point IDs. Depot/vehicles remain entered through the forms.

## 7. Record the source and review

In **Where these records came from**, enter an anonymized organization/log reference and the date the records were recorded. The record date can differ from the operating day. Select a planning quantity step that divides every entered quantity exactly. For example, a 100-litre step only accepts multiples of 100; do not round real quantities just to make them fit. Smaller steps are allowed subject to the planner's existing 10,000-unit limit. Review the fields and acknowledge checking them against the records.

## 8. Fetch matching roads

Confirm that the locations may be shared with the public provider, then click **Check records & fetch matching roads**. Only depot/point coordinates go to OSRM; the provider may log the request. Records are validated before the request. One bounded request obtains the distance/time table and stores the original response locally. Source dates, attribution and limits appear in readable form. A missing map date stays unknown. Failed requests do not substitute sample roads.

If any coordinate or receiving-point membership changes, the old matrix is cleared. Fetch matching roads again. A new CSV list requires a new fetch too. Saved roads are reused for comparisons; opening a project or planning does not silently refresh them.

## 9. Save and compare

Expand **More setup options**, click **Save changes**, then choose **Create delivery plan**. Review unmet requests, times and vehicle capacities. **Compare other options** shows four strategies using the same records and road estimates. Download printable instructions to retain readable source information and data limits. The plan proposes deliveries; it does not establish that they happened.

You may review/approve a plan and enter loading/delivery reports through the existing workflow. Record actual quantities/times yourself; the example autofill helpers are unavailable for record projects. Reports remain self-entered and are not independently verified outcomes.

## 10. Build stronger evidence

Show the original anonymized records, declared sources, road retrieval date, checked plan and all comparison results to the coordinator. Open **More → Compare original plan** to preview the original stop-order/quantity CSV, optionally add reported delivery records, and download a readable same-input comparison. Follow [the historical comparison guide](comparing-original-delivery-plans.md). Ask whether the route is practical. Observed deliveries and independent feedback are required before claiming operational benefit. We have not obtained genuine coordinator records yet; software tests use explicitly synthetic declarations.

Local drafts, reports and source responses are stored on this computer. Keep them anonymized and out of public repositories; this loopback app has no individual-user sign-in or encrypted record vault.
