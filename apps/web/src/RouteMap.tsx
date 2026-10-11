import {useEffect, useRef, useState} from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {routePoints, directionsParts, legDirections, navigateTo, driverBlock, type DriverInput, type DriverRoute, type DriverState} from './driver-route';

const litres = (n:number) => `${n.toLocaleString('en-IN')} L`;
const time = (s:string) => new Date(s).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'});
const External = ({href,children}: {href:string;children:React.ReactNode}) => <a className="secondary direction-link" href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;

export default function RouteMap({input,routes,approved=false,states={},closed=[],reported={}}:{input:DriverInput;routes:DriverRoute[];approved?:boolean;states?:Record<string,DriverState>;closed?:string[];reported?:Record<string,number>}) {
  const [vehicle,setVehicle]=useState(routes[0]?.vehicle_id??'');
  const [enabled,setEnabled]=useState(false);
  const [mapState,setMapState]=useState<'unloaded'|'loading'|'loaded'|'failed'>('unloaded');
  const [attempt,setAttempt]=useState(0);
  const [selectedOrder,setSelectedOrder]=useState(1);
  const [mobileView,setMobileView]=useState('map');
  const container=useRef<HTMLDivElement>(null);
  const map=useRef<L.Map|null>(null);
  const markers=useRef(new Map<number,L.Marker>());
  const routeBounds=useRef<L.LatLngBounds|null>(null);
  const route=routes.find(r=>r.vehicle_id===vehicle)??routes[0];
  const points=route?routePoints(input,route):null;
  const pointsKey=JSON.stringify(points);
  const mapVisible=enabled&&Boolean(points);
  const real=input.data_mode==='operator_entered';
  const blocked=route?driverBlock(route,states,closed):'';
  const canNavigate=Boolean(real&&approved&&route&&states[route.vehicle_id]?.loaded&&!blocked);
  const order=route&&selectedOrder<=route.stops.length?selectedOrder:0;
  const activeStop=order?route?.stops[order-1]:undefined;
  const activeSite=activeStop?input.sites?.find(s=>s.site_id===activeStop.site_id):undefined;

  function selectStop(next:number) {
    setSelectedOrder(next);
    const marker=markers.current.get(next);
    if(marker&&map.current) map.current.panInside(marker.getLatLng(),{padding:[45,45],animate:false});
  }
  useEffect(()=>{
    if(!mapVisible||!container.current)return;
    let alive=true;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let instance:L.Map;try{instance=L.map(container.current,{scrollWheelZoom:false,zoomAnimation:!reduced,fadeAnimation:!reduced,markerZoomAnimation:!reduced}).setView([28.7,77.2],12);}catch{setMapState('failed');return;}
    map.current=instance;setMapState('loading');let failed=false;const timeout=setTimeout(()=>{if(alive)setMapState('failed');},15000);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,crossOrigin:true,referrerPolicy:'strict-origin-when-cross-origin',keepBuffer:0,updateWhenIdle:true,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror',()=>{failed=true;clearTimeout(timeout);if(alive)setMapState('failed');}).on('load',()=>{clearTimeout(timeout);if(alive&&!failed)setMapState('loaded');}).addTo(instance);
    // Resizing must not undo the user's zoom. Only a new route or Fit route resets it.
    const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>instance.invalidateSize({pan:false})):null;
    resize?.observe(container.current);
    return ()=>{alive=false;clearTimeout(timeout);resize?.disconnect();instance.remove();map.current=null;routeBounds.current=null;markers.current.clear();};
  },[mapVisible,attempt]);

  useEffect(()=>{
    if(!mapVisible||!map.current)return;
    const rows=JSON.parse(pointsKey) as ReturnType<typeof routePoints>;
    const group=L.layerGroup().addTo(map.current);
    markers.current.clear();
    if(rows){
      const coords=rows.map(p=>[p.latitude,p.longitude] as L.LatLngTuple);
      L.polyline(coords,{color:'#0f766e',weight:3,dashArray:'7 9'}).addTo(group);
      rows.slice(0,-1).forEach(p=>{
        const text=document.createElement('span');
        text.textContent=p.name;
        const marker=L.marker([p.latitude,p.longitude],{
          title:`${p.order?`Stop ${p.order}`:'Depot'}: ${p.name}`,
          icon:L.divIcon({className:`route-pin ${p.order?'':'depot-pin'}`,html:`<span>${p.order||'D'}</span>`,iconSize:[44,44],iconAnchor:[22,22]}),
        }).bindTooltip(text).on('click',()=>setSelectedOrder(p.order)).addTo(group);
        marker.getElement()?.setAttribute('aria-label',`${p.order?`Stop ${p.order}`:'Depot'}: ${p.name}`);
        marker.getElement()?.addEventListener('keydown',event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setSelectedOrder(p.order);}
        });
        markers.current.set(p.order,marker);
      });
      routeBounds.current=L.latLngBounds(coords);
      map.current.fitBounds(routeBounds.current.pad(.15),{maxZoom:14,animate:false});
    }
    return ()=>{group.remove();markers.current.clear();};
  },[mapVisible,pointsKey,attempt]);
  useEffect(()=>{
    markers.current.forEach((marker,index)=>{
      marker.getElement()?.classList.toggle('selected-pin',index===order);
      marker.getElement()?.setAttribute('aria-pressed',String(index===order));
      marker.setZIndexOffset(index===order?1000:0);
    });
  },[mapVisible,pointsKey,order,attempt]);

  if(!route)return <section className="panel"><h3>Route workspace</h3><p>No vehicle route was scheduled. Review available vehicles and confirmed requests in Set up.</p></section>;
  const parts=points?directionsParts(points):[];
  const selectedPoint=points?.[order];
  const selectedLeg=points&&order?legDirections(points,order):null;
  return <section className="panel driver-panel" aria-label="Driver route map">
    <div className="driver-heading"><div><span className="eyebrow">ROUTE WORKSPACE</span><h3>Your run, stop by stop.</h3><p>Select a stop on the map or in the list to see its details.</p></div><label>Choose vehicle<select value={route.vehicle_id} onChange={e=>{setVehicle(e.target.value);setSelectedOrder(1);}}>{routes.map(r=><option key={r.vehicle_id} value={r.vehicle_id}>{String(input.vehicles?.find(v=>v.vehicle_id===r.vehicle_id)?.name??'Vehicle')}</option>)}</select></label></div>
    <div className="route-summary"><span><strong>{litres(route.planned_load_litres)}</strong> planned load</span><span><strong>{route.stops.length}</strong> delivery stops</span><span className="route-state">{approved?'Approved route':'Draft · review before approval'}</span></div>
    {!real&&<p className="route-disclosure">Example locations · directions are previews for this exercise.</p>}
    {real&&!approved&&<p className="attention">Draft route. Get the coordinator’s approval before a real trip.</p>}
    {blocked&&<p className="attention" role="status">{blocked}</p>}
    <div className="map-view-switch" aria-label="Route view"><button className={mobileView==='map'?'selected':''} aria-pressed={mobileView==='map'} onClick={()=>setMobileView('map')}>Map</button><button className={mobileView==='stops'?'selected':''} aria-pressed={mobileView==='stops'} onClick={()=>setMobileView('stops')}>Stop list</button></div>
    <div className={`route-workspace mobile-${mobileView}`}>
      <div className="map-column">
        <div className="map-toolbar"><span><span className="depot-key">D</span> Depot <span className="stop-key">1</span> Receiving point</span>{mapState==='loaded'&&<button className="text-button" onClick={()=>{if(routeBounds.current)map.current?.fitBounds(routeBounds.current.pad(.15),{maxZoom:14,animate:false});}}>Fit route</button>}</div>
        {!points?<div className="map-placeholder"><strong>Map unavailable for this route</strong><p>Coordinates are missing or invalid. Update the setup and create a checked plan; no stops will be skipped. The full stop list is still available.</p><button className="secondary" onClick={()=>setMobileView('stops')}>See stop list</button></div>:!enabled?<div className="map-placeholder"><svg aria-hidden="true" viewBox="0 0 80 80"><path d="m10 18 20-8 20 8 20-8v52l-20 8-20-8-20 8ZM30 10v52M50 18v52" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M20 42h40" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4"/></svg><strong>See the whole route.</strong><p>Load the street map to explore numbered stops. Map tiles come from OpenStreetMap.</p><button className="primary" onClick={()=>{setMapState('loading');setEnabled(true);}}>Load interactive map</button></div>:<div className="driver-map" ref={container} role="region" aria-label="Interactive map of the selected vehicle’s stop order"/>}
        {mapState==='loading'&&<p role="status" aria-live="polite"><span className="spinner"/> Loading interactive map…</p>}{mapState==='failed'&&<div className="attention" role="status"><p>Street tiles could not load. Your stop list and Google Maps links still work.</p><button className="secondary" onClick={()=>{setMapState('loading');setAttempt(n=>n+1);}}>Retry map</button></div>}
        <p className="map-caption"><span className="dash-key"/> Dashed lines show stop order, not roads to drive.</p>
        {points&&!blocked&&<div className="directions-overview"><h4>{parts.length===1?'Road directions':'Road directions · follow parts in order'}</h4><div className="actions">{parts.map((part,i)=><External key={part.first} href={part.url}>{parts.length===1?'View route in Google Maps':`Part ${i+1}: ${part.from} → ${part.to}`}</External>)}</div>{parts.length>1&&<small>Phone-friendly parts include every stop and the depot return. Check the numbered list if Maps omits a stop.</small>}</div>}
      </div>
      <div className="stops-column">
        <section className="selected-stop" aria-label="Selected stop details" aria-live="polite" aria-atomic="true">
          <span className="eyebrow">{order?`STOP ${order} OF ${route.stops.length}`:'WATER DEPOT'}</span><h4>{String(activeSite?.name??input.depot?.name??'The depot')}</h4>
          {activeStop?<><div className="stop-volume"><strong>{litres(activeStop.planned_litres)}</strong><span>Planned delivery</span></div><dl><div><dt>Estimated arrival</dt><dd>{time(activeStop.estimated_arrival)} IST</dd></div><div><dt>Estimated departure</dt><dd>{time(activeStop.estimated_departure)} IST</dd></div>{typeof activeSite?.requested_litres==='number'&&<div><dt>Requested water</dt><dd>{litres(activeSite.requested_litres)}</dd></div>}<div><dt>Reported delivered</dt><dd>{litres(reported[activeStop.site_id]??0)}</dd></div></dl>{activeSite?.priority_class&&<p className="stop-priority">{String(activeSite.priority_class)} priority{activeSite.priority_reason?<> · {String(activeSite.priority_reason)}</>:null}</p>}{selectedPoint&&selectedLeg&&!blocked&&<External href={canNavigate?navigateTo(selectedPoint):selectedLeg}>{canNavigate?'Navigate to this stop':'Preview directions'}</External>}</>:<><div className="stop-volume"><strong>{litres(route.planned_load_litres)}</strong><span>Planned vehicle load</span></div><p>Start here and return after your final stop. Record loading separately in Deliveries.</p></>}
        </section>
        <div className="stop-list-heading"><h4>Stop sequence</h4><span>{route.stops.length} stops + return</span></div>
        <ol className="driver-stops">{route.stops.map((stop,index)=>{const row=input.sites?.find(s=>s.site_id===stop.site_id);return <li key={stop.site_id}><button className={order===index+1?'stop-select selected':'stop-select'} aria-pressed={order===index+1} onClick={()=>selectStop(index+1)}><span className="stop-number">{index+1}</span><span className="stop-copy"><strong>{String(row?.name??'Receiving point')}</strong><span>{litres(stop.planned_litres)} · {time(stop.estimated_arrival)} IST</span>{closed.includes(stop.site_id)&&<small>Closed · review this route</small>}</span></button></li>;})}<li className="depot-return"><button className={order===0?'stop-select selected':'stop-select'} aria-pressed={order===0} onClick={()=>selectStop(0)}><span className="stop-number depot-number">D</span><span className="stop-copy"><strong>Return to {String(input.depot?.name??'the depot')}</strong><span>After the last delivery stop</span></span></button>{points&&!blocked&&<External href={canNavigate?navigateTo(points.at(-1)!):legDirections(points,points.length-1)!}>{canNavigate?'Navigate to depot':'Preview return'}</External>}</li></ol>
      </div>
    </div>
    <details className="map-notes"><summary>Before you follow this route</summary><p>Google Maps roads and times may differ from the planning estimates. Check tanker access with the coordinator. Opening a directions link shares that route’s coordinates with Google Maps. JalSetu does not track your location or record a delivery when you open it.</p>{real&&approved&&!canNavigate&&!blocked&&<p>Record loading in Deliveries to enable navigation from your current location. You can preview road directions now.</p>}<p>Reported totals do not automatically choose your next stop. Plans and reports remain separate.</p></details>
  </section>;
}
