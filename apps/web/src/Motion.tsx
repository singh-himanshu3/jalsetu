import {useEffect,useRef,useState,type ReactNode} from 'react';
import { m, useReducedMotion } from 'motion/react';

export function Reveal({children,className='',delay=0}:{children:ReactNode;className?:string;delay?:number}) {
  const reduced=useReducedMotion();
  const element=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(true);
  useEffect(()=>{
    if(reduced||!element.current||typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    let observer:IntersectionObserver|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    try{observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer?.disconnect();if(timer)clearTimeout(timer);}}, {threshold:.08});observer.observe(element.current);setVisible(false);timer=setTimeout(()=>{setVisible(true);observer?.disconnect();},1800);}
    catch{setVisible(true);observer?.disconnect();}
    return()=>{observer?.disconnect();if(timer)clearTimeout(timer);};
  },[reduced]);
  return <m.div ref={element} className={className} initial={false} animate={{opacity:reduced||visible?1:0,y:reduced||visible?0:18}} transition={{duration:reduced?0:.25,delay:reduced||!visible?0:delay,ease:[.22,1,.36,1]}}>{children}</m.div>;
}

export function PageTransition({children}:{children:ReactNode}) {
  const reduced=useReducedMotion();
  return <m.div className="page-transition" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.28,ease:'easeOut'}}>{children}</m.div>;
}
