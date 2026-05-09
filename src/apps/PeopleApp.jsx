import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, UserPlus, AlertCircle, X, QrCode, UserCheck,
  CheckCircle2, Printer, Upload, Download, Pencil, Trash2, ScanLine
} from 'lucide-react';
import { FixedSizeList } from 'react-window';
import { db } from '../config/firebase';
import { createPeopleBulk, createPerson, deletePerson, updatePersonCheckInStatus, updatePersonProfile } from '../lib/firestoreServices';
import {
  downloadKidsDirectoryImportTemplate,
  downloadMainDirectoryImportTemplate,
  getPersonImportKey,
  parseDirectoryWorkbook,
} from '../lib/directoryImport';
import { validatePersonProfile } from '../lib/validation';
import { useAuth } from '../hooks/useAuth';

function generateSecurityCode() {
  // Use rejection sampling to avoid modulo bias when mapping bytes to base-36 chars.
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // 36 characters
  const cap = Math.floor(256 / 36) * 36; // 252 — reject bytes >= 252
  const buf = new Uint8Array(64); // oversized to absorb rejections
  let code = '';
  while (code.length < 4) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && code.length < 4; i++) {
      if (buf[i] < cap) code += chars[buf[i] % 36];
    }
  }
  return code;
}

export default function PeopleApp({ theme, people, setPeople, isAdmin, globalSearch, showToast, loadingPeople }) {
  const { user } = useAuth();
  const mainImportInputRef = useRef(null);
  const kidsImportInputRef = useRef(null);
  const qrScannerRef = useRef(null);
  const qrDivRef = useRef(null);
  const [activeTab, setActiveTab] = useState('directory');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [qrScanActive, setQrScanActive] = useState(false);
  const [qrScanResult, setQrScanResult] = useState(null);
  const [newPerson, setNewPerson] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    type: 'Member', gender: 'Female', bgCheck: 'N/A',
    parents: '', parentPhone: '', allergies: ''
  });
  const [editPerson, setEditPerson] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    type: 'Member', gender: 'Female', bgCheck: 'N/A',
    parents: '', parentPhone: '', allergies: ''
  });

  useEffect(() => { if (globalSearch !== undefined) setSearchQuery(globalSearch); }, [globalSearch]);

  const resetImportInput = (mode) => {
    if (mode === 'kids' && kidsImportInputRef.current) {
      kidsImportInputRef.current.value = '';
    }
    if (mode === 'main' && mainImportInputRef.current) {
      mainImportInputRef.current.value = '';
    }
  };

  const toPersonPayload = (person) => ({
    ...person,
    name: `${person.firstName} ${person.lastName}`.trim(),
    securityCode: person.type === 'Child' ? (person.securityCode || generateSecurityCode()) : '',
    checkInStatus: person.type === 'Child' ? (person.checkInStatus || 'Signed Out') : '',
  });

  const getDisplayName = (person) => {
    const firstName = person.firstName || person.name?.split(' ')[0] || '';
    const lastName = person.lastName || person.name?.split(' ').slice(1).join(' ') || '';
    return `${firstName} ${lastName}`.trim();
  };

  const getInitial = (person) => {
    return (person.firstName || person.name || '?').charAt(0).toUpperCase();
  };

  const openDetail = (label, value) => {
    if (!value) return;
    setSelectedDetail({ label, value });
  };

  const renderDetailTrigger = (label, value, className = '') => {
    if (!value) return null;

    return (
      <button
        type="button"
        onClick={() => openDetail(label, value)}
        className={`truncate text-left hover:text-sky-700 hover:underline underline-offset-2 ${className}`}
      >
        {value}
      </button>
    );
  };

  const filteredPeople = useMemo(() => people.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      (p.name?.toLowerCase().includes(q)) ||
      (p.email?.toLowerCase().includes(q)) ||
      (p.phone?.toLowerCase().includes(q)) ||
      (p.type?.toLowerCase().includes(q)) ||
      (p.address?.toLowerCase().includes(q)) ||
      (`${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;
    if (activeTab === 'directory') return ['Member', 'Staff', 'Volunteer'].includes(p.type);
    if (activeTab === 'visitors') return ['First Time', 'Returning', 'Guest'].includes(p.type);
    if (activeTab === 'kids' || activeTab === 'checkin') return p.type === 'Child';
    return true;
  }), [people, searchQuery, activeTab]);

  const handleAdd = async () => {
    const validationResult = validatePersonProfile(newPerson);
    if (!validationResult.valid) {
      showToast(validationResult.message);
      return;
    }

    const dataToSave = toPersonPayload(newPerson);

    try {
      const createdPerson = await createPerson(dataToSave, user?.email);

      if (!db) {
        setPeople([{ id: createdPerson.id, ...dataToSave }, ...people]);
      }

      setIsAdding(false);
      showToast('Profile created successfully!');
      setNewPerson({ firstName: '', lastName: '', email: '', phone: '', address: '', type: 'Member', gender: 'Female', bgCheck: 'N/A', parents: '', parentPhone: '', allergies: '' });
    } catch (error) {
      console.error(error);
      showToast('Failed to create profile.');
    }
  };

  const handleStartEdit = (person) => {
    setEditingPersonId(person.id);
    setEditPerson({
      firstName: person.firstName || person.name?.split(' ')[0] || '',
      lastName: person.lastName || person.name?.split(' ').slice(1).join(' ') || '',
      email: person.email || '',
      phone: person.phone || '',
      address: person.address || '',
      type: person.type || 'Member',
      gender: person.gender || 'Female',
      bgCheck: person.bgCheck || 'N/A',
      parents: person.parents || '',
      parentPhone: person.parentPhone || '',
      allergies: person.allergies || '',
      securityCode: person.securityCode || '',
      checkInStatus: person.checkInStatus || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const validationResult = validatePersonProfile(editPerson);
    if (!validationResult.valid) {
      showToast(validationResult.message);
      return;
    }

    const payload = toPersonPayload(editPerson);

    try {
      await updatePersonProfile(editingPersonId, payload);

      if (!db) {
        setPeople(people.map((person) => (
          person.id === editingPersonId ? { ...person, ...payload } : person
        )));
      }

      setIsEditing(false);
      setEditingPersonId(null);
      showToast('Profile updated successfully!');
    } catch (error) {
      console.error('[PeopleApp] Failed to update profile:', error);
      showToast('Failed to update profile.');
    }
  };

  const handleCheckInToggle = async (childId, currentStatus) => {
    if (!isAdmin) return;

    const newStatus = currentStatus === 'Checked In' ? 'Signed Out' : 'Checked In';
    const child = people.find(p => p.id === childId);
    const parentName = child?.parents || 'Unknown';

    try {
      await updatePersonCheckInStatus(childId, newStatus, parentName, user?.email);

      if (!db) {
        setPeople(people.map((person) => (
          person.id === childId ? { ...person, checkInStatus: newStatus } : person
        )));
      }

      showToast(newStatus === 'Checked In' ? 'Child Checked In Successfully' : 'Child Signed Out Successfully');
    } catch (error) {
      console.error(error);
      showToast('Failed to update check-in status.');
    }
  };

  const handleDeleteProfile = async (personId) => {
    if (deleteConfirmId !== personId) {
      setDeleteConfirmId(personId);
      return;
    }
    setDeleteConfirmId(null);
    const personData = people.find(p => p.id === personId);

    try {
      await deletePerson(personId, personData, user?.email);

      if (!db) {
        setPeople(people.filter((person) => person.id !== personId));
      }

      showToast('Profile deleted');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete profile.');
    }
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (_) {}
      qrScannerRef.current = null;
    }
    setQrScanActive(false);
  };

  const startQrScanner = async () => {
    if (!qrDivRef.current) return;
    setQrScanResult(null);
    setQrScanActive(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-div');
      qrScannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const matched = people.find(p => p.type === 'Child' && p.securityCode === decodedText.trim().toUpperCase());
          if (matched) {
            setQrScanResult({ found: true, person: matched, code: decodedText });
            stopQrScanner();
          } else {
            setQrScanResult({ found: false, code: decodedText });
          }
        },
        () => {}
      );
    } catch (err) {
      console.error('[QR Scanner]', err);
      setQrScanActive(false);
      showToast('Camera unavailable or permission denied');
    }
  };

  useEffect(() => () => { stopQrScanner(); }, []);

  const handleImportPeople = async (mode, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const { people: importedPeople, skippedRows } = await parseDirectoryWorkbook(file, mode);

      if (importedPeople.length === 0) {
        const skippedLabel = skippedRows.length > 0 ? ` ${skippedRows.length} row(s) were skipped.` : '';
        throw new Error(`No valid people were found in the spreadsheet.${skippedLabel}`);
      }

      const seenKeys = new Set(people.map((person) => getPersonImportKey(person)).filter(Boolean));
      let duplicateCount = 0;
      const uniquePeople = importedPeople.reduce((result, person) => {
        const key = getPersonImportKey(person);
        if (key && seenKeys.has(key)) {
          duplicateCount += 1;
          return result;
        }

        if (key) {
          seenKeys.add(key);
        }

        result.push({
          ...toPersonPayload(person)
        });
        return result;
      }, []);

      if (uniquePeople.length === 0) {
        throw new Error('All rows already exist in the directory or were invalid.');
      }

      const createdPeople = await createPeopleBulk(uniquePeople, user?.email);

      if (!db) {
        setPeople([...createdPeople, ...people]);
      }

      const notices = [
        `Imported ${createdPeople.length} profile${createdPeople.length === 1 ? '' : 's'}.`
      ];

      if (duplicateCount > 0) {
        notices.push(`Skipped ${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}.`);
      }

      if (skippedRows.length > 0) {
        notices.push(`Skipped ${skippedRows.length} invalid row${skippedRows.length === 1 ? '' : 's'}.`);
      }

      showToast(notices.join(' '));
    } catch (error) {
      console.error('[PeopleApp] Failed to import directory spreadsheet:', error);
      showToast(error?.message || 'Failed to import spreadsheet.');
    } finally {
      setIsImporting(false);
      resetImportInput(mode);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left min-w-0">
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 max-w-xl">
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">People &amp; Check-ins</h1>
            <p className="text-stone-500 text-sm mt-1 max-w-md">Manage profiles, backgrounds, and secure kids check-in.</p>
          </div>
          <div className="flex flex-wrap gap-3 xl:justify-end shrink-0">
            <button onClick={() => setActiveTab('checkin')} className="px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-md text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center justify-center gap-2">
              <UserCheck size={16}/> Launch Check-in Station
            </button>
            {isAdmin && (
              <button onClick={() => setIsAdding(true)} className={`px-4 py-2.5 ${theme.bg} text-white rounded-md text-sm font-medium shadow-sm hover:opacity-90 flex items-center justify-center gap-2`}>
                <UserPlus size={16}/> Add Profile
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <>
            <input
              ref={mainImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => handleImportPeople('main', event)}
            />
            <input
              ref={kidsImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => handleImportPeople('kids', event)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
              <button
                onClick={() => mainImportInputRef.current?.click()}
                disabled={isImporting}
                className="min-h-16 px-4 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium shadow-sm hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-center"
              >
                <Upload size={16}/>{isImporting ? 'Importing...' : 'Import Main Directory'}
              </button>
              <button
                onClick={() => kidsImportInputRef.current?.click()}
                disabled={isImporting}
                className="min-h-16 px-4 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium shadow-sm hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-center"
              >
                <Upload size={16}/>{isImporting ? 'Importing...' : 'Import Kids Directory'}
              </button>
              <button
                onClick={downloadMainDirectoryImportTemplate}
                className="min-h-16 px-4 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center justify-center gap-2 text-center"
              >
                <Download size={16}/> Main Template
              </button>
              <button
                onClick={downloadKidsDirectoryImportTemplate}
                className="min-h-16 px-4 py-3 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium shadow-sm hover:bg-stone-50 flex items-center justify-center gap-2 text-center"
              >
                <Download size={16}/> Kids Template
              </button>
            </div>
          </>
        )}
        {isAdmin && (
          <p className="text-xs text-stone-500">Use Main Directory for adults, members, visitors, staff, and volunteers. Use Kids Directory only for child records with parent details.</p>
        )}
      </div>

      <div className="border-b border-stone-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max pr-3">
          {['directory', 'visitors', 'kids', 'checkin'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === tab ? `${theme.border} ${theme.color}` : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
              {tab === 'directory' && 'General Directory'}
              {tab === 'visitors'  && 'Visitors'}
              {tab === 'kids'      && 'Lifegate Kids'}
              {tab === 'checkin'   && <><QrCode size={14} className="inline mr-1"/> Kids Check-in</>}
            </button>
          ))}
        </nav>
      </div>

      {isAdding && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900">Add New Profile</h2>
              <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.firstName} onChange={e => setNewPerson({...newPerson, firstName: e.target.value})} />
                <input type="text" placeholder="Last Name"  className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.lastName}  onChange={e => setNewPerson({...newPerson, lastName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.type} onChange={e => setNewPerson({...newPerson, type: e.target.value})}>
                  <optgroup label="Directory">
                    <option value="Member">Member</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Staff">Staff</option>
                  </optgroup>
                  <optgroup label="Visitors">
                    <option value="First Time">First Time Guest</option>
                    <option value="Returning">Returning Guest</option>
                  </optgroup>
                  <optgroup label="Kids Ministry">
                    <option value="Child">Child (Lifegate Kids)</option>
                  </optgroup>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.gender} onChange={e => setNewPerson({...newPerson, gender: e.target.value})}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
              {newPerson.type !== 'Child' && (
                <>
                  <input type="email" placeholder="Email Address" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.email} onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
                  <input type="text" placeholder="Phone Number"   className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.phone} onChange={e => setNewPerson({...newPerson, phone: e.target.value})} />
                </>
              )}
              <input type="text" placeholder={newPerson.type === 'Child' ? "Home Address" : "Mailing Address"} className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.address} onChange={e => setNewPerson({...newPerson, address: e.target.value})} />
              {newPerson.type === 'Child' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Parents &amp; Guardians</h4>
                  <input type="text" placeholder="Parent(s) Full Name"    className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.parents}     onChange={e => setNewPerson({...newPerson, parents: e.target.value})} />
                  <input type="text" placeholder="Parent Phone Number"    className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.parentPhone} onChange={e => setNewPerson({...newPerson, parentPhone: e.target.value})} />
                  <input type="text" placeholder="Allergies / Medical Notes" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={newPerson.allergies}  onChange={e => setNewPerson({...newPerson, allergies: e.target.value})} />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleAdd} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && isAdmin && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-stone-900">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.firstName} onChange={e => setEditPerson({...editPerson, firstName: e.target.value})} />
                <input type="text" placeholder="Last Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.lastName} onChange={e => setEditPerson({...editPerson, lastName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.type} onChange={e => setEditPerson({...editPerson, type: e.target.value})}>
                  <optgroup label="Directory">
                    <option value="Member">Member</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Staff">Staff</option>
                  </optgroup>
                  <optgroup label="Visitors">
                    <option value="First Time">First Time Guest</option>
                    <option value="Returning">Returning Guest</option>
                    <option value="Guest">Guest</option>
                  </optgroup>
                  <optgroup label="Kids Ministry">
                    <option value="Child">Child (Lifegate Kids)</option>
                  </optgroup>
                </select>
                <select className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.gender} onChange={e => setEditPerson({...editPerson, gender: e.target.value})}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
              {editPerson.type !== 'Child' && (
                <>
                  <input type="email" placeholder="Email Address" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.email} onChange={e => setEditPerson({...editPerson, email: e.target.value})} />
                  <input type="text" placeholder="Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.phone} onChange={e => setEditPerson({...editPerson, phone: e.target.value})} />
                  <input type="text" placeholder="Background Check" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.bgCheck} onChange={e => setEditPerson({...editPerson, bgCheck: e.target.value})} />
                </>
              )}
              <input type="text" placeholder={editPerson.type === 'Child' ? 'Home Address' : 'Mailing Address'} className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.address} onChange={e => setEditPerson({...editPerson, address: e.target.value})} />
              {editPerson.type === 'Child' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Parents &amp; Guardians</h4>
                  <input type="text" placeholder="Parent(s) Full Name" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.parents} onChange={e => setEditPerson({...editPerson, parents: e.target.value})} />
                  <input type="text" placeholder="Parent Phone Number" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.parentPhone} onChange={e => setEditPerson({...editPerson, parentPhone: e.target.value})} />
                  <input type="text" placeholder="Allergies / Medical Notes" className="w-full p-2 border border-stone-200 rounded-md outline-none focus:border-sky-500" value={editPerson.allergies} onChange={e => setEditPerson({...editPerson, allergies: e.target.value})} />
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md font-medium text-sm">Cancel</button>
                <button onClick={handleSaveEdit} className={`px-4 py-2 ${theme.bg} text-white rounded-md font-medium text-sm hover:opacity-90`}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Full Details</p>
                <h2 className="text-xl font-bold text-stone-900 mt-1">{selectedDetail.label}</h2>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="text-stone-400 hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm leading-relaxed text-stone-800 break-words whitespace-pre-wrap">{selectedDetail.value}</p>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setSelectedDetail(null)} className={`px-4 py-2 ${theme.bg} text-white rounded-md text-sm font-medium hover:opacity-90`}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
          <h3 className="font-semibold text-stone-800">
            {activeTab === 'directory' && "General Church Directory"}
            {activeTab === 'visitors'  && "Visitor Log"}
            {activeTab === 'kids'      && "Lifegate Kids Roster"}
            {activeTab === 'checkin'   && "Live Check-in Station"}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4" />
            <input type="text" placeholder="Search records..." className="pl-9 pr-4 py-1.5 border border-stone-200 rounded-md text-sm outline-none focus:border-sky-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="lg:hidden p-3 space-y-3">
          {(activeTab === 'directory' || activeTab === 'visitors') && filteredPeople.map((person) => (
            <div key={`m-${person.id}`} className="rounded-xl border border-stone-200 p-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{person.firstName || person.name?.split(' ')[0]} {person.lastName || person.name?.split(' ')[1] || ''}</p>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-1 flex-wrap">
                    {person.email ? renderDetailTrigger('Email Address', person.email, 'max-w-[180px]') : <span>No email</span>}
                    <span>•</span>
                    {person.phone ? renderDetailTrigger('Phone Number', person.phone, 'max-w-[140px]') : <span>No phone</span>}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${activeTab === 'visitors' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-700'}`}>{person.type}</span>
              </div>
              {person.address && <div className="mt-2">{renderDetailTrigger('Address', person.address, 'text-xs text-stone-500 max-w-full')}</div>}
              {isAdmin && (
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => handleStartEdit(person)} className="px-3 py-1.5 text-xs font-semibold rounded-md text-sky-700 bg-sky-50 border border-sky-100">Edit</button>
                  <button onClick={() => handleDeleteProfile(person.id)} className="px-3 py-1.5 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100">Delete</button>
                </div>
              )}
            </div>
          ))}

          {activeTab === 'kids' && filteredPeople.map((child) => (
            <div key={`mk-${child.id}`} className="rounded-xl border border-stone-200 p-3 bg-white">
              <p className="font-semibold text-stone-900 text-sm">{child.firstName} {child.lastName}</p>
              <p className="text-xs text-stone-500 mt-1">Parents: {child.parents ? renderDetailTrigger('Parents / Guardians', child.parents, 'inline-block max-w-[220px] align-bottom') : 'N/A'}</p>
              <p className="text-xs text-stone-500">Phone: {child.parentPhone ? renderDetailTrigger('Parent Phone', child.parentPhone, 'inline-block max-w-[160px] align-bottom') : 'N/A'}</p>
              {child.allergies && child.allergies !== 'None' && <p className="text-xs text-rose-600 font-semibold mt-1">Allergies: {renderDetailTrigger('Allergies / Medical Notes', child.allergies, 'inline-block max-w-[220px] align-bottom')}</p>}
              {isAdmin && (
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => handleStartEdit(child)} className="px-3 py-1.5 text-xs font-semibold rounded-md text-sky-700 bg-sky-50 border border-sky-100">Edit</button>
                  <button onClick={() => handleDeleteProfile(child.id)} className="px-3 py-1.5 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100">Delete</button>
                </div>
              )}
            </div>
          ))}

          {activeTab === 'checkin' && filteredPeople.map((child) => {
            const isCheckedIn = child.checkInStatus === 'Checked In';
            return (
              <div key={`mc-${child.id}`} className={`rounded-xl border p-3 ${isCheckedIn ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{child.firstName} {child.lastName}</p>
                    <p className="text-xs text-stone-500 mt-1">Security: <span className="font-mono font-bold tracking-wider text-indigo-700">{child.securityCode}</span></p>
                    <p className="text-xs text-stone-500">Status: {child.checkInStatus}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleCheckInToggle(child.id, child.checkInStatus)} className={`px-3 py-2 rounded-md text-xs font-bold min-w-[96px] ${isCheckedIn ? 'bg-stone-200 text-stone-700' : 'bg-emerald-600 text-white'}`}>
                      {isCheckedIn ? 'Sign Out' : 'Check In'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPeople.length === 0 && (
            <div className="px-5 py-8 text-center text-stone-500 text-sm">No records found matching your criteria.</div>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto max-h-[600px] overflow-y-auto">
          {(activeTab === 'directory' || activeTab === 'visitors') && (
            <div className="divide-y divide-stone-100">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 bg-white sticky top-0 z-10 border-b border-stone-100">
                <div>Person</div>
                <div>Contact</div>
                <div>Details</div>
                {isAdmin && <div className="text-right">Actions</div>}
                {!isAdmin && <div className="text-right">Profile</div>}
              </div>
              {filteredPeople.length > 80 ? (
                <FixedSizeList
                  height={520}
                  itemCount={filteredPeople.length}
                  itemSize={80}
                  width="100%"
                >
                  {({ index, style }) => {
                    const person = filteredPeople[index];
                    return (
                      <div key={person.id} style={style} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 px-5 items-center hover:bg-stone-50/70 border-b border-stone-100 transition-colors">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${theme.light} ${theme.color}`}>{getInitial(person)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 truncate text-sm">{getDisplayName(person)}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${activeTab === 'visitors' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-700'}`}>{person.type}</span>
                          </div>
                        </div>
                        <div className="min-w-0 text-xs">
                          {person.email ? renderDetailTrigger('Email Address', person.email, 'text-stone-700 max-w-full block') : <span className="text-stone-400">No email</span>}
                          {person.phone ? renderDetailTrigger('Phone Number', person.phone, 'text-stone-500 mt-0.5 max-w-full block') : null}
                        </div>
                        <div className="min-w-0 text-xs text-stone-500">{person.bgCheck || 'N/A'}</div>
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin ? (
                            <>
                              <button onClick={() => handleStartEdit(person)} className="px-2 py-1 text-[10px] font-semibold rounded text-sky-700 bg-sky-50 border border-sky-100">Edit</button>
                              {deleteConfirmId === person.id ? (
                                <>
                                  <button onClick={() => handleDeleteProfile(person.id)} className="px-2 py-1 text-[10px] font-semibold rounded text-white bg-rose-600">Confirm</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 text-[10px] font-semibold rounded text-stone-500">Cancel</button>
                                </>
                              ) : (
                                <button onClick={() => handleDeleteProfile(person.id)} className="px-2 py-1 text-[10px] font-semibold rounded text-rose-700 bg-rose-50 border border-rose-100">Delete</button>
                              )}
                            </>
                          ) : <span className="text-xs text-stone-400">View only</span>}
                        </div>
                      </div>
                    );
                  }}
                </FixedSizeList>
              ) : (
                filteredPeople.map((person) => (
                  <div key={person.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 px-5 py-4 items-center hover:bg-stone-50/70 transition-colors">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${theme.light} ${theme.color}`}>
                        {getInitial(person)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{getDisplayName(person)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${activeTab === 'visitors' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-700'}`}>{person.type}</span>
                          <span className="text-xs text-stone-500">{person.gender || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      {person.email ? renderDetailTrigger('Email Address', person.email, 'text-sm text-stone-700 max-w-full block') : <p className="text-sm text-stone-700">No email</p>}
                      {person.phone ? renderDetailTrigger('Phone Number', person.phone, 'text-xs text-stone-500 mt-1 max-w-full block') : <p className="text-xs text-stone-500 mt-1">No phone</p>}
                    </div>
                    <div className="min-w-0">
                      {person.address ? renderDetailTrigger('Address', person.address, 'text-sm text-stone-700 max-w-full block') : <p className="text-sm text-stone-700">No address</p>}
                      <p className="text-xs text-stone-500 mt-1">Background Check: {person.bgCheck || 'N/A'}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin ? (
                        <>
                          <button onClick={() => handleStartEdit(person)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100" title="Edit Profile">Edit</button>
                          {deleteConfirmId === person.id ? (
                            <>
                              <button onClick={() => handleDeleteProfile(person.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-rose-600 hover:bg-rose-700">Confirm</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-stone-500 hover:bg-stone-100">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => handleDeleteProfile(person.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100" title="Delete Profile">Delete</button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">View only</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'kids' && (
            <div className="divide-y divide-stone-100">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 bg-white sticky top-0 z-10 border-b border-stone-100">
                <div>Child</div>
                <div>Guardians</div>
                <div>Care Notes</div>
                {isAdmin && <div className="text-right">Actions</div>}
                {!isAdmin && <div className="text-right">Status</div>}
              </div>
              {filteredPeople.map((child) => (
                <div key={child.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 px-5 py-4 items-center hover:bg-stone-50/70 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${theme.light} ${theme.color}`}>
                      {getInitial(child)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{getDisplayName(child)}</p>
                      {child.address ? renderDetailTrigger('Address', child.address, 'text-xs text-stone-500 mt-1 max-w-full block') : <p className="text-xs text-stone-500 mt-1">No address</p>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    {child.parents ? renderDetailTrigger('Parents / Guardians', child.parents, 'text-sm font-medium text-stone-800 max-w-full block') : <p className="text-sm font-medium text-stone-800">No guardian listed</p>}
                    {child.parentPhone ? renderDetailTrigger('Parent Phone', child.parentPhone, 'text-xs text-stone-500 mt-1 max-w-full block') : <p className="text-xs text-stone-500 mt-1">No phone</p>}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${child.allergies && child.allergies !== 'None' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {child.allergies && child.allergies !== 'None'
                        ? renderDetailTrigger('Allergies / Medical Notes', child.allergies, 'max-w-full block')
                        : 'No allergies noted'}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Status: {child.checkInStatus || 'Signed Out'}</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin ? (
                      <>
                        <button onClick={() => handleStartEdit(child)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100" title="Edit Profile">
                          Edit
                        </button>
                        {deleteConfirmId === child.id ? (
                          <>
                            <button onClick={() => handleDeleteProfile(child.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-rose-600 hover:bg-rose-700">Confirm</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-stone-500 hover:bg-stone-100">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => handleDeleteProfile(child.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100" title="Delete Profile">
                            Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-stone-400">View only</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'checkin' && (
            <>
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-3">
                {!qrScanActive ? (
                  <button onClick={startQrScanner} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                    <ScanLine size={16} /> Scan QR Code
                  </button>
                ) : (
                  <button onClick={stopQrScanner} className="inline-flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg text-sm font-semibold hover:bg-stone-700 transition-colors">
                    <X size={16} /> Stop Scanner
                  </button>
                )}
                {qrScanResult && (
                  <div className={`text-sm font-semibold rounded-lg px-3 py-2 ${qrScanResult.found ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {qrScanResult.found
                      ? `✓ ${qrScanResult.person.firstName} ${qrScanResult.person.lastName} — code ${qrScanResult.code}`
                      : `Code "${qrScanResult.code}" not found`}
                  </div>
                )}
              </div>
              {qrScanActive && (
                <div id="qr-reader-div" ref={qrDivRef} className="mt-3 max-w-xs rounded-xl overflow-hidden border border-stone-200 shadow-sm" />
              )}
            </div>
            <table className="w-full text-sm text-left relative">
              <thead className="border-b border-stone-100 text-stone-500 font-medium sticky top-0 bg-white z-10">
                <tr>
                  <th className="px-5 py-3">Child Name</th>
                  <th className="px-5 py-3">Room / Group</th>
                  <th className="px-5 py-3">Security Code</th>
                  <th className="px-5 py-3">Allergies</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPeople.map((child) => {
                  const isCheckedIn = child.checkInStatus === 'Checked In';
                  return (
                    <tr key={child.id} className={`${isCheckedIn ? 'bg-emerald-50/30' : ''} hover:bg-stone-50 transition-colors`}>
                      <td className="px-5 py-4 font-bold text-stone-900">{child.firstName} {child.lastName}</td>
                      <td className="px-5 py-4 text-stone-600 font-medium">{child.room || 'Unassigned'}</td>
                      <td className="px-5 py-4 font-mono font-bold tracking-widest text-indigo-600">{child.securityCode}</td>
                      <td className="px-5 py-4 text-rose-500 text-xs font-bold uppercase tracking-wider">{child.allergies !== 'None' ? child.allergies : ''}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCheckedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                          {isCheckedIn ? <CheckCircle2 size={12} className="mr-1"/> : null}
                          {child.checkInStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCheckedIn && <button className="p-1.5 text-stone-400 hover:text-stone-700 bg-white border border-stone-200 rounded shadow-sm" title="Print Tag"><Printer size={14}/></button>}
                          {isAdmin && (
                            <button onClick={() => handleCheckInToggle(child.id, child.checkInStatus)} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${isCheckedIn ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                              {isCheckedIn ? 'Sign Out' : 'Check In'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}

          {filteredPeople.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">No records found matching your criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}
