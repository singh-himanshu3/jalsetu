// Validate the authorized live scope before CDK synthesizes deployment assets.
// This does not check credits, grant access, or delete resources at expiry.
export function deploymentScope(env, now = Date.now()) {
  const region = env.JALSETU_REGION ?? 'ap-south-1';
  if (region !== 'ap-south-1') throw new Error('The authorized deployment region is Mumbai (ap-south-1).');
  const expiry = env.JALSETU_EXPIRES_AT;
  if (!expiry || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(expiry)) {
    throw new Error('Set JALSETU_EXPIRES_AT to an explicit UTC timestamp ending in Z.');
  }
  const deadline = Date.parse(expiry);
  if (!Number.isFinite(deadline) || new Date(deadline).toISOString().slice(0, 19) !== expiry.slice(0, 19)) {
    throw new Error('The deployment expiry must be a valid calendar timestamp.');
  }
  if (deadline <= now || deadline > now + 7 * 24 * 60 * 60 * 1000) {
    throw new Error('The deployment expiry must be in the future and within seven days.');
  }
  return { region, expiry, account: env.CDK_DEFAULT_ACCOUNT };
}
