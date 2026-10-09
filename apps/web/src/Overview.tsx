import type { Input } from './App';

type Props = {
  input: Input | null;
  busy: boolean;
  onLoad: () => void;
  onNavigate: (tab: string) => void;
  hasPlan: boolean;
};

export function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    Overview: 'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',
    Inputs: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    Plan: 'M6 5h12v16H6ZM9 3h6v4H9ZM9 12h6M9 16h4',
    Compare: 'M5 20V10h4v10M15 20V4h4v16M3 20h18',
    Operations: 'M3 7h11v11H3ZM14 11h4l3 4v3h-7M5 18a2 2 0 1 0 4 0M16 18a2 2 0 1 0 4 0',
    Evidence: 'M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6ZM8 12l3 3 5-6',
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.Plan}/></svg>;
}

export default function Overview({ input, busy, onLoad, onNavigate, hasPlan }: Props) {
  const confirmed = input?.sites.filter(site => site.confirmation_status === 'confirmed') ?? [];
  const requests = confirmed.reduce((sum, site) => sum + Number(site.requested_litres ?? 0), 0);
  const stock = input?.depot.available_stock_litres;
  const stockLabel = typeof stock === 'number' && Number.isFinite(stock) ? `${stock.toLocaleString('en-IN')} L` : 'Not entered';
  const requestsLabel = confirmed.every(site => typeof site.requested_litres === 'number' && Number.isFinite(site.requested_litres)) ? `${requests.toLocaleString('en-IN')} L` : 'Needs review';
  return <>
    <section className="relief-hero" aria-labelledby="relief-title">
      <div className="hero-copy">
        <span className="eyebrow"><span className="status-dot"/> A PLANNING DESK FOR HEAT RELIEF</span>
        <h2 id="relief-title">Limited water.<br/><em>Every stop matters.</em></h2>
        <p>Plan where your available water should go. Review requests, approve a route, and track deliveries in one place.</p>
        <div className="hero-actions"><button className="primary" disabled={busy} onClick={input ? () => onNavigate(hasPlan ? 'Plan' : 'Inputs') : onLoad}>{input ? hasPlan ? 'Open your plan' : 'Continue setup' : 'Try the example'} <span aria-hidden="true">→</span></button>{input && <button className="text-button" disabled={busy} onClick={onLoad}>Start a new example</button>}</div>
        <p className="hero-caption">Sample requests, vehicles and travel times. No real dispatch.</p>
      </div>
      <div className="relief-visual">
        <div className="visual-top"><span className="eyebrow">THE RELIEF RUN</span><span className="visual-tag">Planning concept</span></div>
        <h3>One run.<br/>Fully accounted for.</h3>
        <svg viewBox="0 0 460 260" role="img" aria-label="Illustrative planning flow from depot stock to receiving points; not a calculated route">
          <defs><pattern id="relief-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="currentColor" strokeOpacity=".1"/></pattern></defs>
          <rect width="460" height="260" fill="url(#relief-grid)"/>
          <path d="M70 158C145 158 125 66 220 66S300 126 381 85M70 158C155 158 163 213 264 201S335 173 381 173" fill="none" stroke="#bce2b7" strokeWidth="3" strokeDasharray="5 8"/>
          <circle cx="70" cy="158" r="29" fill="#d7ecc3"/>
          <path d="M70 140c-4 7-11 14-11 20a11 11 0 0 0 22 0c0-6-7-13-11-20Z" fill="#125b50"/>
          {[[220,66],[381,85],[264,201],[381,173]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="11" fill="#0c4b43" stroke="#d7ecc3" strokeWidth="2"/><circle cx={x} cy={y} r="3" fill="#d7ecc3"/></g>)}
          <text x="70" y="210" textAnchor="middle" fill="#f0f7e7" fontSize="12">Depot stock</text>
          <text x="220" y="42" textAnchor="middle" fill="#f0f7e7" fontSize="12">Receiving windows</text>
          <text x="318" y="244" textAnchor="middle" fill="#f0f7e7" fontSize="12">Confirmed requests</text>
        </svg>
        <div className="visual-checks"><span>✓ Capacity & stock</span><span>✓ Time windows</span><span>✓ Independent checks</span></div>
        <p>Illustration only. Generate a plan to see calculated assignments.</p>
      </div>
    </section>

    <section className="capability-strip" aria-label="Planning capabilities">
      <div><NavIcon name="Inputs"/><span>Review water, vehicles & requests</span></div>
      <div><NavIcon name="Plan"/><span>Approve your delivery plan</span></div>
      <div><NavIcon name="Operations"/><span>Track loading & deliveries</span></div>
    </section>

    {input && <section className="panel current-draft">
      <div><span className="eyebrow">YOUR CURRENT EXAMPLE</span><h3>{input.name}</h3><p>{String(input.operating_date)} · {String(input.depot.name)} · IST</p></div>
      <div className="draft-facts"><span><strong>{stockLabel}</strong>Depot stock</span><span><strong>{requestsLabel}</strong>Confirmed requests</span><span><strong>{input.vehicles.filter(vehicle => vehicle.status === 'available').length}</strong>Available vehicles</span></div>
      <button className="secondary" onClick={() => onNavigate('Inputs')}>Edit setup <span aria-hidden="true">→</span></button>
    </section>}

    <section className="overview-story" aria-labelledby="story-title">
      <div className="section-head"><div><span className="eyebrow">FROM A REQUEST TO A REPORTED DELIVERY</span><h2 id="story-title">A clear trail, at every step.</h2></div><p>Planning estimates and delivery reports<br/>stay distinct throughout the run.</p></div>
      <div className="story-cards">
        <article><span className="story-number">01 / SET UP</span><NavIcon name="Inputs"/><h3>Start with what you have.</h3><p>Review available water, vehicles and requests in three short steps. Sample details are already filled in.</p></article>
        <article><span className="story-number">02 / APPROVE</span><NavIcon name="Plan"/><h3>See where the water goes.</h3><p>Review each vehicle’s stops and the requests that remain unmet. Approve only when you are ready.</p></article>
        <article><span className="story-number">03 / TRACK</span><NavIcon name="Operations"/><h3>Keep every litre in view.</h3><p>Record loading and deliveries. If a vehicle breaks down, record it and review an updated plan.</p></article>
      </div>
    </section>
    <details className="panel"><summary>About the example and its limits</summary><p className="hint">Requests, vehicles, water stock and travel times are made up for this example. The plan uses one depot and one trip per vehicle. Actual inventory, site permissions and traffic have not been verified.</p><button className="text-button" onClick={() => onNavigate('Evidence')}>About the example →</button></details>
  </>;
}
