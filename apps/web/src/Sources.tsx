import type { Input } from './App';

export default function Sources({ input }: { input: Input | null }) {
  const real=input?.data_mode==='operator_entered';
  const source=input?.operational_source as {description:string;recorded_date:string;reviewed:boolean}|undefined;
  return <section className="panel"><h3>{real?'What this record-based plan uses':'What this example uses'}</h3>
    <p>{real?'Requests, stock, vehicles and locations were entered by the operator. The source declaration does not independently verify them. Road estimates were downloaded for those locations.':'Requests, water stock, vehicles and travel times are made up for practice. They do not represent a real relief operation.'}</p>
    {real&&source&&<p>Declared source: {source.description} · Record date: {source.recorded_date}</p>}
    <ul><li>The plan uses one depot and one trip per vehicle.</li><li>Only confirmed requests receive planned visits.</li><li>{real?'Road estimates use a car profile, not tanker clearance or live traffic.':'Travel times are sample estimates, not current traffic or road directions.'}</li><li>Weather and population information are not included.</li><li>Approving a plan does not dispatch a vehicle. Loading and deliveries must be recorded separately.</li></ul>
    {real&&input?.travel_matrix&&<><p>Road estimates retrieved: {new Date(String(input.travel_matrix.retrieved_at)).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Underlying map date: {input.travel_matrix.represented_at?String(input.travel_matrix.represented_at):'not supplied'}.</p><p>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · OSRM / FOSSGIS · <a href="https://routing.openstreetmap.de/about.html">Provider policy</a> · <a href="https://www.openstreetmap.org/">Fix the map</a></p></>}
    {input&&!input.travel_matrix&&<p className="hint">{real?'Fetch matching roads in Set up before creating a plan.':'Update the sample travel estimates in More setup options before creating a plan.'}</p>}
    <h3>Before using a plan in the field</h3><p>Confirm the actual requests, safe water supply, vehicle availability, receiving permissions and road conditions with the people responsible. This prototype has not been validated in a real operation.</p>
  </section>;
}
