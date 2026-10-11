import {useState} from 'react';
import {confirmEmailAccount,createEmailAccount,resendEmailCode,signIn} from './auth';

export default function EmailAccess({disabled=false,onSignIn}:{disabled?:boolean;onSignIn:()=>void}) {
  const [stage,setStage]=useState<'options'|'signup'|'verify'>('options');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError((e as Error).message);}finally{setPassword('');setBusy(false);}}
  const locked=disabled||busy;
  return <section className="email-access" aria-label="Email and password access">
    <p className="auth-divider">Email and password</p>
    {stage==='options'?<div className="email-options"><button className="primary" disabled={locked} onClick={onSignIn}>Sign in with email</button><button disabled={locked} onClick={()=>{setStage('signup');setError('');setNotice('');}}>Create an account</button><p>Use your email address in the username field on the secure sign-in page.</p><p>Forgot your password? Choose sign in, then “Forgot your password?” on that page.</p></div>:
      <form onSubmit={event=>{event.preventDefault();void run(async()=>{if(stage==='signup'){await createEmailAccount(email,password);setStage('verify');setNotice('Check your email for a verification code.');}else{await confirmEmailAccount(email,code);await signIn(undefined,'Account',email);}});}}>
        <h2>{stage==='signup'?'Create your account':'Verify your email'}</h2>
        <label>Email address<input type="email" name="email" autoComplete="email" required value={email} disabled={locked} onChange={event=>setEmail(event.target.value)}/></label>
        {stage==='signup'?<label>Password<input type="password" name="password" autoComplete="new-password" required minLength={12} value={password} disabled={locked} onChange={event=>setPassword(event.target.value)} aria-describedby="password-guidance"/><span id="password-guidance">At least 12 characters, with uppercase and lowercase letters, a number and a symbol.</span></label>:<label>Verification code<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={locked} onChange={event=>setCode(event.target.value)}/></label>}
        <button className="primary" disabled={locked}>{busy?'Please wait…':stage==='signup'?'Create account':'Verify and continue to sign in'}</button>
        {stage==='verify'&&<button type="button" disabled={locked} onClick={()=>void run(async()=>{await resendEmailCode(email);setNotice('A new verification code has been requested. Check your email.');})}>Resend code</button>}
        <button type="button" disabled={locked} onClick={()=>{setPassword('');setStage('options');setError('');setNotice('');}}>Back to sign-in options</button>
        {stage==='signup'&&<button type="button" disabled={locked} onClick={()=>{setPassword('');setStage('verify');setError('');setNotice('Enter the email and code from your earlier signup.');}}>Already have a verification code?</button>}
      </form>}
    {error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </section>;
}
