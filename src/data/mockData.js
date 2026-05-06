export const UPCOMING_EVENTS = [
  { id: 1, title: 'Ash Wednesday Gathering',  date: '2026-02-18', time: '19:00', type: 'Worship' },
  { id: 2, title: 'Sunday Worship Experience', date: '2026-02-22', time: '10:00', type: 'Weekend Service' },
  { id: 3, title: 'Serve Team Rally',           date: '2026-02-28', time: '09:00', type: 'Equipping' },
  { id: 4, title: 'Easter Creative Sync',       date: '2026-03-05', time: '13:00', type: 'Collaboration' },
];

export const PEOPLE_LIST = [
  { id: 1, firstName: 'Sarah',  lastName: 'Jenkins',  name: 'Sarah Jenkins',  email: 'sarah.j@example.com',  phone: '(555) 123-4567', address: '123 Meadow Ln, TX', type: 'First Time', gender: 'Female', bgCheck: 'N/A' },
  { id: 2, firstName: 'David',  lastName: 'Martinez', name: 'David Martinez', email: 'martinez@example.com',  phone: '(555) 987-6543', address: '456 Oak Dr, TX',    type: 'Member',     gender: 'Male',   bgCheck: 'N/A' },
  { id: 3, firstName: 'Marcus', lastName: 'Johnson',  name: 'Marcus Johnson', email: 'marcus.j@example.com', phone: '(555) 654-3210', address: '654 Maple Ave, TX', type: 'Volunteer',  gender: 'Male',   bgCheck: 'Expired' },
  { id: 4, firstName: 'Emily',  lastName: 'Thorne',   name: 'Emily Thorne',   email: 'emily.t@example.com',  phone: '(555) 321-0987', address: '321 Elm Ct, TX',   type: 'Staff',      gender: 'Female', bgCheck: 'Clear' },
  { id: 5, firstName: 'Liam',   lastName: 'Martinez', name: 'Liam Martinez',  email: '', phone: '', address: '456 Oak Dr, TX', type: 'Child', gender: 'Male',   parents: 'David Martinez',  parentPhone: '(555) 987-6543', allergies: 'Peanuts', securityCode: 'A4B2', checkInStatus: 'Checked In', room: 'Preschool' },
  { id: 6, firstName: 'Chloe',  lastName: 'Jenkins',  name: 'Chloe Jenkins',  email: '', phone: '', address: '123 Meadow Ln, TX', type: 'Child', gender: 'Female', parents: 'Sarah Jenkins', parentPhone: '(555) 123-4567', allergies: 'None',    securityCode: 'X9M1', checkInStatus: 'Signed Out',  room: 'Elementary' },
];

export const PLAN_ITEMS = [
  { id: 1, time: '7:00 PM', length: '5:00',  title: 'Welcome & Vision',            type: 'Element', person: 'Pastor Joshua' },
  { id: 2, time: '7:05 PM', length: '15:00', title: 'Worship Set (3 Songs)',        type: 'Song',    person: 'Worship Band' },
  { id: 3, time: '7:20 PM', length: '5:00',  title: 'Guided Prayer Moment',         type: 'Element', person: 'Elder Team' },
  { id: 4, time: '7:25 PM', length: '35:00', title: 'Message: Beauty from Ashes',   type: 'Sermon',  person: 'Pastor Joshua' },
];

export const SONG_LIBRARY = [
  { id: 1, title: 'Build My Life',          artist: 'Housefires',        key: 'G', originalKey: 'G', bpm: 70, ccli: '7070345', lastPlayed: 'Feb 1',  hasLyrics: true,  hasChords: true,  hasAudio: true,  youtube: 'https://youtube.com/watch?v=QZW4_8_zCBE' },
  { id: 2, title: 'What A Beautiful Name',  artist: 'Hillsong Worship',  key: 'D', originalKey: 'D', bpm: 68, ccli: '7068424', lastPlayed: 'Jan 25', hasLyrics: true,  hasChords: true,  hasAudio: false, youtube: 'https://youtube.com/watch?v=nQWFzMvCfLE' },
];

export const RECENT_DONATIONS = [
  { id: 1, name: 'Anonymous',   amount: '$500.00', date: '2026-02-16', fund: 'General Tithe', type: 'Zelle' },
  { id: 2, name: 'David Chen',  amount: '$150.00', date: '2026-02-15', fund: 'Missions',      type: 'Online Recurring' },
];

export const COMMUNITY_POSTS = [
  { id: 1, author: 'Pastor Joshua', role: 'Lead Pastor',      time: '2 hours ago', content: 'So excited for our Serve Team Rally this weekend! God is doing amazing things at Lifegate. Who is joining us?', likes: 24, comments: 5 },
  { id: 2, author: 'Sarah Jenkins', role: "Women's Ministry", time: '5 hours ago', content: "Ladies! Don't forget our Saturday morning coffee and devotional at 9 AM. Bring a friend! ☕️📖",              likes: 12, comments: 2 },
  { id: 3, author: 'David Martinez', role: 'Member',          time: 'Yesterday',   content: 'Does anyone know if the youth group is meeting at the main campus or the park this Wednesday? Thanks!',       likes: 3,  comments: 4 },
];

export const MINISTRY_TEAMS = [
  { id: 1,  name: "Men's Ministry",                  lead: 'Michael Carter', members: 42, access: 'Full Admin', status: 'unlocked',    desc: "Manage men's breakfasts, retreats, and mentorship groups.",                          roster: [{id: 3, name: 'David Chen'}] },
  { id: 2,  name: "Women's Ministry",                lead: 'Sarah Jenkins',  members: 56, access: 'View Only',  status: 'restricted',  desc: "Coordinate Bible studies, women's events, and support groups.",                      roster: [{id: 1, name: 'Sarah Jenkins'}] },
  { id: 3,  name: 'Lifegate Youth',                  lead: 'David Chen',     members: 18, access: 'Full Admin', status: 'unlocked',    desc: 'Youth group scheduling, parent communications, and camp planning.',                  roster: [] },
  { id: 4,  name: 'Lifegate Kids',                   lead: 'Emily Thorne',   members: 35, access: 'View Only',  status: 'restricted',  desc: "Children's curriculum, check-in data, and background checks.",                      roster: [] },
  { id: 5,  name: 'Lifegate Music',                  lead: 'Marcus Johnson', members: 24, access: 'Full Admin', status: 'unlocked',    desc: 'Worship sets, band schedules, and rehearsal resources.',                            roster: [] },
  { id: 6,  name: 'Lifegate Media',                  lead: 'James Wilson',   members: 12, access: 'No Access',  status: 'locked',      desc: 'A/V scheduling, stage plots, and livestream management.',                           roster: [] },
  { id: 7,  name: 'Lifegate Ushers and Protocol',    lead: 'Robert Hayes',   members: 28, access: 'No Access',  status: 'locked',      desc: 'Service protocols, seating logistics, and offering collection.',                    roster: [] },
  { id: 8,  name: 'Lifegate Hospitality',            lead: 'Linda Gomez',    members: 30, access: 'View Only',  status: 'restricted',  desc: 'Coffee bar, guest welcome packages, and event catering.',                           roster: [] },
  { id: 9,  name: 'Lifegate Sunday Prayer Team',     lead: 'Pastor Joshua',  members: 15, access: 'Full Admin', status: 'unlocked',    desc: 'Altar ministry schedules and confidential prayer requests.',                        roster: [] },
  { id: 10, name: 'Lifegate Friday Prayer Team',     lead: 'Anna Roberts',   members: 20, access: 'No Access',  status: 'locked',      desc: 'Intercessory prayer focus lists and Friday night watch schedules.',                 roster: [] },
  { id: 11, name: 'Lifegate Outreach and Follow-Up', lead: 'Tom Harris',     members: 25, access: 'View Only',  status: 'restricted',  desc: 'Community service events, evangelism, and guest retention tracking.',               roster: [] },
  { id: 12, name: 'Lifegate Board',                  lead: 'Elder Council',  members: 7,  access: 'Full Admin', status: 'unlocked',    desc: 'Financial reports, strategic planning, and governance documents.',                  roster: [] },
  { id: 13, name: 'Lifegate Communications',         lead: 'Jessica Lee',    members: 8,  access: 'No Access',  status: 'locked',      desc: 'Social media planning, website updates, and bulletin announcements.',              roster: [] },
];
