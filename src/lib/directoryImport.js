import * as XLSX from 'xlsx';
import { validatePersonProfile } from './validation';

const HEADER_ALIASES = {
  firstname: 'firstName',
  first: 'firstName',
  lastname: 'lastName',
  last: 'lastName',
  fullname: 'name',
  name: 'name',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  address: 'address',
  mailingaddress: 'address',
  type: 'type',
  category: 'type',
  role: 'type',
  gender: 'gender',
  sex: 'gender',
  parents: 'parents',
  parent: 'parents',
  parentguardian: 'parents',
  guardian: 'parents',
  parentphone: 'parentPhone',
  guardianphone: 'parentPhone',
  parentphonenumber: 'parentPhone',
  allergies: 'allergies',
  allergy: 'allergies',
  medicalnotes: 'allergies',
  backgroundcheck: 'bgCheck',
  bgcheck: 'bgCheck',
};

const PERSON_TYPE_ALIASES = {
  member: 'Member',
  volunteer: 'Volunteer',
  staff: 'Staff',
  guest: 'Guest',
  child: 'Child',
  kid: 'Child',
  kids: 'Child',
  returning: 'Returning',
  'returning guest': 'Returning',
  firsttime: 'First Time',
  'first time': 'First Time',
  'first time guest': 'First Time',
  'new guest': 'First Time',
};

const MAIN_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Address',
  'Type',
  'Gender',
  'Background Check',
];

const MAIN_TEMPLATE_ROWS = [
  {
    'First Name': 'John',
    'Last Name': 'Carter',
    Email: 'john.carter@example.com',
    Phone: '555-123-4567',
    Address: '123 Main St, Dallas, TX',
    Type: 'Member',
    Gender: 'Male',
    'Background Check': 'Cleared',
  },
  {
    'First Name': 'Mia',
    'Last Name': 'Torres',
    Email: 'mia.torres@example.com',
    Phone: '555-444-1188',
    Address: '410 Cedar St, Dallas, TX',
    Type: 'Volunteer',
    Gender: 'Female',
    'Background Check': 'Pending',
  },
];

const KIDS_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Address',
  'Gender',
  'Parents',
  'Parent Phone',
  'Allergies',
];

const KIDS_TEMPLATE_ROWS = [
  {
    'First Name': 'Ava',
    'Last Name': 'Carter',
    Address: '123 Main St, Dallas, TX',
    Gender: 'Female',
    Parents: 'John Carter; Mia Carter',
    'Parent Phone': '555-987-6543',
    Allergies: 'Peanuts',
  },
];

function cleanValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function normalizeHeader(header) {
  return cleanValue(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeType(type) {
  const normalized = cleanValue(type).toLowerCase();
  return PERSON_TYPE_ALIASES[normalized] || cleanValue(type) || 'Member';
}

function normalizeGender(gender) {
  const normalized = cleanValue(gender).toLowerCase();
  if (!normalized) return '';
  if (normalized === 'm' || normalized === 'male') return 'Male';
  if (normalized === 'f' || normalized === 'female') return 'Female';
  return cleanValue(gender);
}

function splitName(name) {
  const parts = cleanValue(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function mapRowToPerson(row) {
  const normalizedRow = Object.entries(row).reduce((result, [key, value]) => {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (alias) {
      result[alias] = cleanValue(value);
    }
    return result;
  }, {});

  const derivedName = splitName(normalizedRow.name);
  const firstName = normalizedRow.firstName || derivedName.firstName;
  const lastName = normalizedRow.lastName || derivedName.lastName;
  const type = normalizeType(normalizedRow.type);

  return {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' '),
    email: normalizedRow.email || '',
    phone: normalizedRow.phone || '',
    address: normalizedRow.address || '',
    type,
    gender: normalizeGender(normalizedRow.gender),
    bgCheck: normalizedRow.bgCheck || 'N/A',
    parents: normalizedRow.parents || '',
    parentPhone: normalizedRow.parentPhone || '',
    allergies: normalizedRow.allergies || '',
  };
}

function hasAnyData(person) {
  return Object.values(person).some((value) => cleanValue(value));
}

export function getPersonImportKey(person) {
  const email = cleanValue(person.email).toLowerCase();
  if (email) return `email:${email}`;

  const name = [person.firstName, person.lastName].map((value) => cleanValue(value).toLowerCase()).filter(Boolean).join('|');
  const phone = cleanValue(person.phone || person.parentPhone).replace(/\D/g, '');
  const address = cleanValue(person.address).toLowerCase();

  if (name && phone) return `name-phone:${name}|${phone}`;
  if (name && address) return `name-address:${name}|${address}`;
  return name ? `name:${name}` : '';
}

function normalizePersonForImport(person, mode) {
  const nextPerson = { ...person };

  if (mode === 'kids') {
    nextPerson.type = 'Child';
    nextPerson.bgCheck = 'N/A';
  }

  return nextPerson;
}

function validatePersonForMode(person, mode) {
  if (mode === 'main' && person.type === 'Child') {
    return { valid: false, message: 'Child records belong in the Kids template/import.' };
  }

  return validatePersonProfile(person);
}

export async function parseDirectoryWorkbook(file, mode = 'all') {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The spreadsheet does not contain any sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (rows.length === 0) {
    throw new Error('The spreadsheet is empty.');
  }

  const validPeople = [];
  const skippedRows = [];

  rows.forEach((row, index) => {
    const person = normalizePersonForImport(mapRowToPerson(row), mode);
    if (!hasAnyData(person)) {
      return;
    }

    const validation = validatePersonForMode(person, mode);
    if (!validation.valid) {
      skippedRows.push({
        rowNumber: index + 2,
        reason: validation.message,
      });
      return;
    }

    validPeople.push(person);
  });

  return {
    people: validPeople,
    skippedRows,
    sheetName: firstSheetName,
  };
}

export function downloadMainDirectoryImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(MAIN_TEMPLATE_ROWS, { header: MAIN_TEMPLATE_HEADERS });

  XLSX.utils.book_append_sheet(workbook, sheet, 'Main Directory');
  XLSX.writeFile(workbook, 'lifegate-main-directory-template.xlsx');
}

export function downloadKidsDirectoryImportTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(KIDS_TEMPLATE_ROWS, { header: KIDS_TEMPLATE_HEADERS });

  XLSX.utils.book_append_sheet(workbook, sheet, 'Kids Directory');
  XLSX.writeFile(workbook, 'lifegate-kids-directory-template.xlsx');
}