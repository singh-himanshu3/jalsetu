export const exampleSteps = ['Review the sample', 'Create your plan', 'Approve your plan', 'Record a delivery'];
export function exampleStep(hasRules:boolean, hasPlan:boolean, approved:boolean, delivered:boolean) {
  return delivered ? 4 : approved ? 3 : hasPlan ? 2 : hasRules ? 1 : 0;
}
