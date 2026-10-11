export const exampleSteps = ['Review inputs', 'Generate a plan', 'Review and approve', 'Track delivery', 'Review a disruption'];
export function exampleStep(hasRules:boolean, hasPlan:boolean, approved:boolean, delivered:boolean,disrupted=false,reviewedRevision=false) {
  return delivered&&disrupted&&reviewedRevision ? 5 : delivered ? 4 : approved ? 3 : hasPlan ? 2 : hasRules ? 1 : 0;
}
