import type { Input } from './App';

export default function Sources({ input }: { input: Input | null }) {
  return <section className="panel"><h3>What this example uses</h3>
    <p>Requests, water stock, vehicles and travel times are made up for practice. They do not represent a real relief operation.</p>
    <ul><li>The plan uses one depot and one trip per vehicle.</li><li>Only confirmed requests receive planned visits.</li><li>Travel times are sample estimates, not current traffic or road directions.</li><li>Weather and population information are not included.</li><li>Approving a plan does not dispatch a vehicle. Loading and deliveries must be recorded separately.</li></ul>
    {input && <p className="hint">{input.travel_matrix ? 'Sample travel estimates are ready for this example.' : 'Update the sample travel estimates in More setup options before creating a plan.'}</p>}
    <h3>Before using a plan in the field</h3><p>Confirm the actual requests, safe water supply, vehicle availability, receiving permissions and road conditions with the people responsible. This prototype has not been validated in a real operation.</p>
  </section>;
}
