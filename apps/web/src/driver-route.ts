export type LocationRow = { name?: unknown; site_id?: unknown; requested_litres?: unknown; minimum_useful_litres?: unknown; priority_class?: unknown; priority_reason?: unknown; location?: {latitude: number | null; longitude: number | null} };
export type DriverInput = { data_mode?: string; depot?: LocationRow; sites?: LocationRow[]; vehicles?: {[key:string]:unknown; vehicle_id?: unknown; name?: unknown}[] };
export type DriverStop = {site_id: string; planned_litres: number; estimated_arrival: string; estimated_departure: string};
export type DriverRoute = {vehicle_id: string; planned_load_litres: number; stops: DriverStop[]};
export type DriverState = {failed: boolean; trip_completed: boolean; loaded: boolean};
export type RoutePoint = {name: string; latitude: number; longitude: number; stop?: DriverStop; order: number};

function point(row: LocationRow | undefined, order: number, stop?: DriverStop): RoutePoint | null {
  const lat = row?.location?.latitude, lon = row?.location?.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return {name: String(row?.name ?? (stop ? 'Receiving point' : 'Depot')), latitude: lat, longitude: lon, order, stop};
}

// Never silently omit a stop with missing coordinates or substitute a name search.
export function routePoints(input: DriverInput, route: DriverRoute): RoutePoint[] | null {
  if (!route.stops.length) return null;
  const depot = point(input.depot, 0);
  if (!depot) return null;
  const stops = route.stops.map((stop, i) => point(input.sites?.find(row => row.site_id === stop.site_id), i+1, stop));
  if (stops.some(row => !row)) return null;
  return [depot, ...stops as RoutePoint[], {...depot, order: stops.length+1}];
}

const coordinate = (p: RoutePoint) => `${p.latitude},${p.longitude}`;
function url(origin: RoutePoint | undefined, destination: RoutePoint, waypoints: RoutePoint[] = [], navigate = false) {
  const params = new URLSearchParams({api:'1', destination:coordinate(destination), travelmode:'driving'});
  if (origin) params.set('origin',coordinate(origin));
  if (waypoints.length) params.set('waypoints',waypoints.map(coordinate).join('|'));
  if (navigate) params.set('dir_action','navigate');
  const result = `https://www.google.com/maps/dir/?${params}`;
  if (result.length > 2048) throw new Error('Directions link exceeds the supported length.');
  return result;
}

// At most three intermediate waypoints: the documented mobile-browser limit.
// Parts overlap at their boundary, preserving every leg and the depot return.
export function directionsParts(points: RoutePoint[]) {
  const parts: {url:string; from:string; to:string; first:number; last:number}[] = [];
  for (let i=0; i<points.length-1; i+=4) {
    const end = Math.min(i+4, points.length-1);
    parts.push({url:url(points[i], points[end], points.slice(i+1,end)),from:points[i].name,to:points[end].name,first:i,last:end});
  }
  return parts;
}

export const legDirections = (points: RoutePoint[], index: number) => index > 0 && index < points.length ? url(points[index-1], points[index]) : null;
// Omit origin so Google Maps uses the driver's current location, if available.
export const navigateTo = (p: RoutePoint) => url(undefined,p,[],true);

export function driverBlock(route: DriverRoute, states: Record<string,DriverState> = {}, closed: string[] = []) {
  const state = states[route.vehicle_id];
  if (state?.failed) return 'Vehicle reported failed. Ask the coordinator for updated instructions.';
  if (state?.trip_completed) return 'This vehicle has returned and its trip is complete.';
  if (route.stops.some(stop => closed.includes(stop.site_id))) return 'A receiving point on this route is closed. Ask the coordinator to review the route.';
  return '';
}
