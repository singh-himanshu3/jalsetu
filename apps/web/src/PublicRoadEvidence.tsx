import {useState} from 'react';
import evidence from './public-road-summary';

const scenarios:Record<string,string> = {north_delhi_example:'North Delhi example', balanced_supply:'Enough water for each request',
  stock_shortage:'Less water available', narrow_time_windows:'Shorter receiving hours', vehicle_unavailable:'One vehicle unavailable'};
const strategies:Record<string,string> = {equal_share:'Equal share', demand_proportional:'Demand proportional', greedy:'Priority first', jalsetu:'JalSetu'};
const quantities = (value:number) => value.toLocaleString('en-IN');

export default function PublicRoadEvidence() {
  const [scenario,setScenario] = useState('north_delhi_example');
  const [setting,setSetting] = useState('1');
  const source = setting === 'sample' ? 'synthetic_reference' : 'public_roads';
  const multiplier = setting === 'sample' ? 1 : Number(setting);
  const rows = evidence.rows.filter(row => row.scenario === scenario && row.source === source && row.travelMultiplier === multiplier);
  return <section className="panel" aria-labelledby="public-road-heading">
    <h3 id="public-road-heading">What we checked on public roads</h3>
    <p><strong>Public road estimates. Example relief resources.</strong> We tested the existing planner with road distances and car travel estimates from OpenStreetMap and OSRM. Requests, stock, vehicles and receiving locations are still examples.</p>
    <p>{evidence.nodeCount} example locations · {evidence.calculationCount} planning runs · {evidence.passedChecks} independent route checks passed.</p>
    <p className="hint">This research check is separate from your current exercise. It does not change your plan or saved delivery reports.</p>
    <div className="form-grid">
      <label>Research scenario<select value={scenario} onChange={event=>setScenario(event.target.value)}>{Object.entries(scenarios).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
      <label>Travel assumptions<select value={setting} onChange={event=>setSetting(event.target.value)}>
        <option value="1">Public road estimates</option><option value="1.5">Example: travel takes 50% longer</option>
        <option value="2">Example: travel takes twice as long</option><option value="sample">Original sample travel estimates</option>
      </select></label>
    </div>
    <div className="table-wrap"><table><caption>{scenarios[scenario]} — {setting === 'sample' ? 'sample travel' : multiplier === 1 ? 'public road estimates' : `example ${multiplier}× travel times`}</caption>
      <thead><tr><th scope="col">Planning option</th><th scope="col">Scheduled water</th><th scope="col">Unmet request</th><th scope="col">Estimated travel</th><th scope="col">Lowest fulfilment</th><th scope="col">Check</th></tr></thead>
      <tbody>{rows.map(row=>{const ready=row.valid && row.status==='feasible';return <tr key={row.strategy}><th scope="row">{strategies[row.strategy]}</th>
        <td>{ready ? `${quantities(row.scheduledLitres)} L` : 'Unavailable'}</td><td>{ready ? `${quantities(row.unmetLitres)} L` : 'Unavailable'}</td>
        <td>{ready ? `${row.travelKm.toFixed(1)} km` : 'Unavailable'}</td><td>{ready ? `${(row.lowestFulfilment*100).toFixed(1)}%` : 'Unavailable'}</td><td>{ready ? 'Passed' : 'No checked plan found'}</td></tr>;})}</tbody>
    </table></div>
    <p>More scheduled water can require more travel. Compare both before choosing; these results do not establish one option as best in every situation.</p>
    <details><summary>Sources and what this evidence means</summary>
      <p>Road estimates retrieved {new Date(evidence.retrievedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST. {evidence.mapDate ? `Provider map date: ${evidence.mapDate}.` : 'The provider did not supply the map date.'} Every strategy uses the same saved estimates; viewing this page makes no provider requests.</p>
      <p>The slower travel settings are invented checks, not measured congestion. The experiment uses finish-unloading-by-close, parallel loading, 100-litre quantities and the same calculation allowance for all options.</p>
      <p>Car routes do not confirm tanker access, road safety or receiving permission. These calculations do not prove actual deliveries or people helped. Observed delivery records and feedback from a coordinator are the next evidence needed.</p>
      <p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>; routing by <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a>, hosted by FOSSGIS. <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">Source and usage policy</a> · <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Fix the map</a>.</p>
    </details>
  </section>;
}
