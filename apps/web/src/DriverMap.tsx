import {lazy,Suspense,type ComponentProps} from 'react';
import type RouteMapType from './RouteMap';

const RouteMap = lazy(()=>import('./RouteMap'));
export default function DriverMap(props:ComponentProps<typeof RouteMapType>) {
  return <Suspense fallback={<section className="panel" role="status">Opening the driver view…</section>}><RouteMap {...props}/></Suspense>;
}
