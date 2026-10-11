const key=(scope:string)=>`jalsetu.onboarding:${scope}`;
export function onboardingCompleted(scope?:string){if(!scope)return false;try{return localStorage.getItem(key(scope))==='complete';}catch{return false;}}
export function completeOnboarding(scope?:string){if(scope)try{localStorage.setItem(key(scope),'complete');}catch{/* Storage restrictions must not block the workspace. */}}
