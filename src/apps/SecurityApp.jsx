import { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ToggleRight, ToggleLeft, History,
  EyeOff, SmartphoneNfc, UserCog, X, Loader2, RefreshCw,
  UserPlus, UserMinus, Gift, Calendar, LogIn, LogOut, Shield
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { saveSecuritySettings } from '../lib/firestoreServices';
import {
  grantAdminAccess,
  revokeAdminAccess,
  grantAppAccess,
  revokeAppAccess,
  inviteUser,
  deleteUserByEmail,
} from '../lib/securityAdmin';
import { APPS } from '../config/apps';

export default function SecurityApp({ theme, isSeniorPastor, securitySettings, setSecuritySettings, showToast }) {
  const [is2FA, setIs2FA] = useState(securitySettings?.is2FA ?? true);
  const [isDLP, setIsDLP] = useState(securitySettings?.isDLP ?? true);
  const [isPII, setIsPII] = useState(securitySettings?.isPII ?? true);
  const [isOptOut, setIsOptOut] = useState(securitySettings?.isOptOut ?? true);
  const [isEndpoint, setIsEndpoint] = useState(securitySettings?.isEndpoint ?? false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantMode, setGrantMode] = useState('full-admin');
  const [selectedApps, setSelectedApps] = useState([]);
  const [revokeEmail, setRevokeEmail] = useState('');
  const [directorRole, setDirectorRole] = useState('full-admin');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMode, setInviteMode] = useState('app-access');
  const [inviteApps, setInviteApps] = useState([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [removeEmail, setRemoveEmail] = useState('');
  const [isRemovingUser, setIsRemovingUser] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    if (!db) { setAuditLoading(false); return; }
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAuditLoading(false);
    }, () => setAuditLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!securitySettings) return;
    setIs2FA(securitySettings.is2FA ?? true);
    setIsDLP(securitySettings.isDLP ?? true);
    setIsPII(securitySettings.isPII ?? true);
    setIsOptOut(securitySettings.isOptOut ?? true);
    setIsEndpoint(securitySettings.isEndpoint ?? false);
  }, [securitySettings]);

  const handleSaveSettings = async () => {
    const settings = { is2FA, isDLP, isPII, isOptOut, isEndpoint };
    try {
      await saveSecuritySettings(settings);
      setSecuritySettings(settings);
      showToast('Enterprise Security Settings Secured and Applied');
    } catch (error) {
      console.error('[SecurityApp] Failed to save settings:', error);
      showToast('Failed to save security settings');
    }
  };

  const handleGrantAccess = async () => {
    if (!grantEmail.trim()) {
      showToast('Please enter an email address');
      return;
    }

    try {
      if (grantMode === 'app-access') {
        if (selectedApps.length === 0) {
          showToast('Please select at least one app');
          return;
        }
        await grantAppAccess(grantEmail, selectedApps);
        showToast(`App access granted to ${grantEmail.trim()} — they must sign out and back in to activate it.`);
      } else {
        await grantAdminAccess(grantEmail);
        showToast(`Admin access granted to ${grantEmail.trim()} — they must sign out and back in to activate it.`);
      }
      setGrantEmail('');
      setSelectedApps([]);
      setShowRoleModal(false);
    } catch (error) {
      console.error('[SecurityApp] Failed to grant access:', error);
      showToast(error?.message || 'Failed to grant access');
    }
  };

  const toggleAppSelection = (appId) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const toggleInviteAppSelection = (appId) => {
    setInviteApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleProvisionUser = async () => {
    if (!inviteEmail.trim()) {
      showToast('Please enter an email address');
      return;
    }

    if (inviteMode === 'app-access' && inviteApps.length === 0) {
      showToast('Select at least one app for app-scoped access');
      return;
    }

    setIsProvisioning(true);
    try {
      const payload = {
        email: inviteEmail.trim(),
        role: inviteMode === 'full-admin' ? 'admin' : 'appAccess',
        apps: inviteMode === 'app-access' ? inviteApps : [],
        sendSetupEmail: true,
      };

      const result = await inviteUser(payload);
      const actionLabel = result?.created ? 'created and invited' : 'updated and invited';
      showToast(`User ${actionLabel}: ${inviteEmail.trim()}. Password setup email sent.`);
      setInviteEmail('');
      setInviteApps([]);
    } catch (error) {
      console.error('[SecurityApp] Failed to provision user:', error);
      showToast(error?.message || 'Failed to invite user');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!removeEmail.trim()) {
      showToast('Enter an email address to remove');
      return;
    }

    const confirmed = window.confirm(`Remove user account ${removeEmail.trim()} from Firebase Auth? This cannot be undone.`);
    if (!confirmed) return;

    setIsRemovingUser(true);
    try {
      await deleteUserByEmail(removeEmail.trim());
      showToast(`User removed: ${removeEmail.trim()}`);
      setRemoveEmail('');
    } catch (error) {
      console.error('[SecurityApp] Failed to remove user:', error);
      showToast(error?.message || 'Failed to remove user');
    } finally {
      setIsRemovingUser(false);
    }
  };

  const handleDirectorRoleChange = async (value) => {
    if (value === 'revoke') {
      if (!revokeEmail.trim()) {
        showToast('Enter the email address to revoke below, then select Revoke again');
        setDirectorRole('full-admin');
        return;
      }
      try {
        await revokeAdminAccess(revokeEmail.trim());
        showToast(`Admin access revoked for ${revokeEmail.trim()}`);
        setRevokeEmail('');
        setDirectorRole('full-admin');
      } catch (error) {
        console.error('[SecurityApp] Failed to revoke admin access:', error);
        showToast(error?.message || 'Failed to revoke access');
        setDirectorRole('full-admin');
      }
    } else if (value === 'revoke-app') {
      if (!revokeEmail.trim()) {
        showToast('Enter the email address to revoke app access, then select Revoke App Access again');
        setDirectorRole('full-admin');
        return;
      }
      try {
        await revokeAppAccess(revokeEmail.trim());
        showToast(`App access revoked for ${revokeEmail.trim()}`);
        setRevokeEmail('');
        setDirectorRole('full-admin');
      } catch (error) {
        console.error('[SecurityApp] Failed to revoke app access:', error);
        showToast(error?.message || 'Failed to revoke app access');
        setDirectorRole('full-admin');
      }
    } else {
      setDirectorRole(value);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Workspace Security</h1>
          <p className="text-stone-500 text-sm mt-1">Manage authentication, data loss prevention (DLP), and roles.</p>
        </div>
        {isSeniorPastor && (
          <button onClick={handleSaveSettings} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2`}>
            <ShieldCheck size={16}/> Save Security Settings
          </button>
        )}
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><UserCog className="text-stone-700"/> Access Control Matrix</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div>
                  <p className="font-bold text-indigo-900 text-sm">Lead Pastor (Owner)</p>
                  <p className="text-xs text-indigo-700">Claim-based assignment</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-indigo-200 text-indigo-800 px-2 py-1 rounded">Super Admin</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Staff / Directors</p>
                  <p className="text-xs text-emerald-700">Assigned via Grant Access below</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-800 px-2 py-1 rounded">Full Admin</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-lg">
                <div>
                  <p className="font-bold text-violet-900 text-sm">Ministry Leaders</p>
                  <p className="text-xs text-violet-700">Access specific portals only</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-violet-200 text-violet-800 px-2 py-1 rounded">App-Scoped</span>
              </div>
              <div className="pt-4 border-t border-stone-200 mt-4">
                <label className="block text-xs font-semibold text-sky-600 mb-1.5 uppercase">Add User Account</label>
                <p className="text-xs text-stone-500 mb-3">Create account from this panel and send secure password-setup email. User selects their own password on first setup.</p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setInviteMode('full-admin'); setInviteApps([]); }}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${inviteMode === 'full-admin' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}`}
                  >Full Admin</button>
                  <button
                    onClick={() => setInviteMode('app-access')}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${inviteMode === 'app-access' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-stone-600 border-stone-300 hover:border-sky-400'}`}
                  >App-Scoped User</button>
                </div>
                {inviteMode === 'app-access' && (
                  <div className="mb-3 p-3 bg-sky-50 border border-sky-100 rounded-lg">
                    <p className="text-xs font-semibold text-sky-700 mb-2">Select allowed portals:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.values(APPS).filter(a => a.id !== 'home').map((app) => (
                        <label key={`invite-${app.id}`} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs font-medium border transition-colors ${inviteApps.includes(app.id) ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-stone-200 text-stone-600 hover:border-sky-200'}`}>
                          <input
                            type="checkbox"
                            className="accent-sky-600"
                            checked={inviteApps.includes(app.id)}
                            onChange={() => toggleInviteAppSelection(app.id)}
                          />
                          {app.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mb-4">
                  <input type="email" placeholder="new.user@lifegate.ag" className="flex-1 p-2 text-sm border border-stone-300 rounded outline-none focus:border-sky-500" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  <button onClick={handleProvisionUser} disabled={isProvisioning} className="px-4 py-2 bg-sky-700 text-white rounded text-sm font-medium hover:bg-sky-800 disabled:opacity-60">{isProvisioning ? 'Working...' : 'Add User'}</button>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 mt-4">
                <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase">Promote User to Admin</label>
                <p className="text-xs text-stone-500 mb-3">User will gain full admin access immediately. No confirmation email is sent—share new access details separately.</p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { setGrantMode('full-admin'); setSelectedApps([]); }}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${grantMode === 'full-admin' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'}`}
                  >Full Admin</button>
                  <button
                    onClick={() => setGrantMode('app-access')}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-colors ${grantMode === 'app-access' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-stone-600 border-stone-300 hover:border-indigo-400'}`}
                  >App-Scoped Access</button>
                </div>
                {grantMode === 'app-access' && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <p className="text-xs font-semibold text-indigo-700 mb-2">Select portals this user can access:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.values(APPS).filter(a => a.id !== 'home').map((app) => (
                        <label key={app.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs font-medium border transition-colors ${selectedApps.includes(app.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-stone-200 text-stone-600 hover:border-indigo-200'}`}>
                          <input
                            type="checkbox"
                            className="accent-indigo-600"
                            checked={selectedApps.includes(app.id)}
                            onChange={() => toggleAppSelection(app.id)}
                          />
                          {app.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mb-4">
                  <input type="email" placeholder="staff@lifegate.ag" className="flex-1 p-2 text-sm border border-stone-300 rounded outline-none focus:border-stone-500" value={grantEmail} onChange={e => setGrantEmail(e.target.value)} />
                  <button onClick={handleGrantAccess} className="px-4 py-2 bg-stone-800 text-white rounded text-sm font-medium hover:bg-stone-900">Grant Access</button>
                </div>
              </div>
              <div className="border-t border-stone-200 pt-4">
                <label className="block text-xs font-semibold text-rose-500 mb-1.5 uppercase">Revoke Access</label>
                <div className="flex gap-2">
                  <input type="email" placeholder="staff@lifegate.ag" className="flex-1 p-2 text-sm border border-rose-200 rounded outline-none focus:border-rose-400" value={revokeEmail} onChange={e => setRevokeEmail(e.target.value)} />
                  <select value={directorRole} onChange={(e) => handleDirectorRoleChange(e.target.value)} className="text-xs font-bold uppercase tracking-wider bg-white border border-rose-200 text-rose-700 px-2 py-1 rounded outline-none cursor-pointer">
                    <option value="full-admin">Admin</option>
                    <option value="revoke">Revoke Admin</option>
                    <option value="revoke-app">Revoke App Access</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-4">
                <label className="block text-xs font-semibold text-rose-600 mb-1.5 uppercase">Remove User Account</label>
                <p className="text-xs text-stone-500 mb-3">Deletes the Firebase login account. Use for offboarding or unauthorized accounts.</p>
                <div className="flex gap-2">
                  <input type="email" placeholder="remove.user@lifegate.ag" className="flex-1 p-2 text-sm border border-rose-200 rounded outline-none focus:border-rose-400" value={removeEmail} onChange={e => setRemoveEmail(e.target.value)} />
                  <button onClick={handleRemoveUser} disabled={isRemovingUser} className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700 disabled:opacity-60">{isRemovingUser ? 'Removing...' : 'Remove User'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <ShieldCheck size={18} className="text-stone-600"/>
              <h3 className="font-semibold text-stone-800">Authentication &amp; Access</h3>
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Enforce 2-Step Verification (2FA)</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Require all staff and team leaders to use a secondary authentication method when logging in.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIs2FA(!is2FA)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {is2FA ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Advanced Endpoint Management</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Allow admins to remotely wipe church data from personal mobile devices.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsEndpoint(!isEndpoint)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isEndpoint ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <ShieldAlert size={18} className="text-stone-600"/>
              <h3 className="font-semibold text-stone-800">Data Protection &amp; AI Governance</h3>
            </div>
            <div className="divide-y divide-stone-100">
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900 text-sm">Data Loss Prevention (DLP)</h4>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 rounded uppercase">Recommended</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically scan internal chats and documents to prevent users from sharing sensitive congregant data externally.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsDLP(!isDLP)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isDLP ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">PII Data Masking for AI</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Automatically redact names, phone numbers, and addresses before sending any context to Gemini AI.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsPII(!isPII)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isPII ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
              <div className="p-5 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">LLM Training Opt-Out</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-md">Enforce Google Workspace privacy policy ensuring your internal data is never used to train public AI models.</p>
                </div>
                <div onClick={() => isSeniorPastor && setIsOptOut(!isOptOut)} className={isSeniorPastor ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}>
                  {isOptOut ? <ToggleRight size={36} className="text-emerald-500"/> : <ToggleLeft size={36} className="text-stone-300"/>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2"><History size={18} className="text-stone-600"/><h3 className="font-semibold text-stone-800">Security Audit Log</h3></div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto">
              {auditLoading ? (
                <div className="p-6 flex justify-center"><Loader2 size={18} className="animate-spin text-stone-400" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="p-6 text-center">
                  <RefreshCw size={18} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-xs text-stone-400">No audit events recorded yet.</p>
                  <p className="text-xs text-stone-400 mt-1">Events appear here as actions are taken.</p>
                </div>
              ) : (
                auditLogs.map((log) => {
                  const actionType = log.actionType ?? '';
                  const isAlert = ['DELETE', 'DLP_BLOCK', 'REVOKE'].includes(actionType);
                  const isWarning = ['UPDATE', 'CHECK_OUT', 'NEW_DEVICE'].includes(actionType);
                  const color = isAlert ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-stone-700';
                  const bg = isAlert ? 'bg-rose-50/40' : isWarning ? 'bg-amber-50/30' : '';
                  const IconMap = {
                    CREATE: UserPlus, DELETE: UserMinus, UPDATE: Shield,
                    CHECK_IN: LogIn, CHECK_OUT: LogOut, GIVING: Gift,
                    EVENT_CREATE: Calendar, EVENT_DELETE: Calendar,
                    NEW_DEVICE: SmartphoneNfc, DLP_BLOCK: EyeOff,
                  };
                  const Icon = IconMap[actionType] ?? ShieldCheck;
                  const ts = log.timestamp ?? (log.createdAt?.toDate?.()?.toISOString()) ?? null;
                  const timeLabel = ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
                  const label = `${actionType.replace(/_/g, ' ')} — ${log.entityType ?? ''}`;
                  const detail = log.details
                    ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : log.actorEmail ?? '';
                  return (
                    <div key={log.id} className={`p-4 ${bg}`}>
                      <p className={`text-xs font-bold flex items-center gap-1.5 ${color}`}><Icon size={12}/> {label}</p>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">{detail}</p>
                      <p className="text-[10px] text-stone-400 mt-1">{timeLabel} · {log.actorEmail ?? 'system'}</p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-stone-100 bg-stone-50 text-center">
              <button className="text-xs font-semibold text-stone-600 hover:text-stone-900">View Full Logs (Google Vault)</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-stone-200 bg-stone-50"><h3 className="font-semibold text-stone-800">Role-Based Access</h3></div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Lead Pastors</span>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">Super Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Staff / Directors</span>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Full Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">Volunteers</span>
                <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-1 rounded">View Only</span>
              </div>
              {isSeniorPastor && <button onClick={() => setShowRoleModal(true)} className="w-full mt-2 py-2 border border-stone-200 rounded text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors">Manage Roles</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
