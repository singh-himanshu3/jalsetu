import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'motion/react';

export function Reveal({children,className='',delay=0}:{children:ReactNode;className?:string;delay?:number}) {
  const reduced=useReducedMotion();
  return <m.div className={className} initial={reduced?false:{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.08}} transition={{duration:reduced?0:.5,delay:reduced?0:delay,ease:[.22,1,.36,1]}}>{children}</m.div>;
}

export function PageTransition({children}:{children:ReactNode}) {
  const reduced=useReducedMotion();
  return <m.div className="page-transition" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.28,ease:'easeOut'}}>{children}</m.div>;
}
