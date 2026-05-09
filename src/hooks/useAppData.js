import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UPCOMING_EVENTS,
  PEOPLE_LIST,
  RECENT_DONATIONS,
  SONG_LIBRARY,
  MINISTRY_TEAMS,
  PLAN_ITEMS,
  COMMUNITY_POSTS,
} from '../data/mockData';

/**
 * Custom hook for managing Firestore subscriptions and app-wide data
 * Handles live updates from events, people, donations, songs, teams
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @returns {Object} App data: { events, people, donations, songs, teams, planItems }
 */
export function useAppData(isAuthenticated) {
  const [events, setEvents] = useState(UPCOMING_EVENTS);
  const [people, setPeople] = useState(PEOPLE_LIST);
  const [planItems, setPlanItems] = useState(PLAN_ITEMS);
  const [donations, setDonations] = useState(RECENT_DONATIONS);
  const [songs, setSongs] = useState(SONG_LIBRARY);
  const [teamsList, setTeamsList] = useState(MINISTRY_TEAMS);
  const [workflows, setWorkflows] = useState([
    { id: 1, title: 'Post-Service Guest Text', trigger: "Added to 'New Guest' list", actions: 'Send SMS', iconName: 'Smartphone' },
    { id: 2, title: 'Volunteer Reminder', trigger: '3 Days Before Scheduled Date', actions: 'Send Email', iconName: 'Mail' },
  ]);
  const [communityPosts, setCommunityPosts] = useState(COMMUNITY_POSTS);
  const [securitySettings, setSecuritySettings] = useState({ is2FA: true, isDLP: true, isPII: true, isOptOut: true, isEndpoint: false });
  const [servicePlan, setServicePlan] = useState({
    headerData: { title: 'Ash Wednesday Gathering', date: '2026-02-18', time: '19:00', location: 'Main Auditorium' },
    serviceTimes: [
      { id: 1, label: '1st Service', time: '8:00 AM', location: 'Main Auditorium', volunteers: 12 },
      { id: 2, label: '2nd Service', time: '10:30 AM', location: 'Main Auditorium', volunteers: 20 },
      { id: 3, label: 'Online Stream', time: '10:30 AM', location: 'YouTube / Church Online', volunteers: 4 },
    ],
  });

  // Per-collection loading states
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  /**
   * Subscribe to Firestore collections when authenticated
   */
  useEffect(() => {
    if (!isAuthenticated || !db) {
      setLoadingPeople(false);
      setLoadingEvents(false);
      return;
    }

    let unsubEvents;
    let unsubPeople;
    let unsubDonations;
    let unsubSongs;
    let unsubTeams;
    let unsubWorkflows;
    let unsubCommunityPosts;
    let unsubSecuritySettings;
    let unsubServicePlan;

    try {
        unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
          setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setLoadingEvents(false);
        });

        unsubPeople = onSnapshot(collection(db, 'people'), (snapshot) => {
          setPeople(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setLoadingPeople(false);
        });

        unsubDonations = onSnapshot(collection(db, 'donations'), (snapshot) => {
          setDonations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });

        unsubSongs = onSnapshot(collection(db, 'songs'), (snapshot) => {
          setSongs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });

        unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
          setTeamsList(snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() })));
        });

        unsubWorkflows = onSnapshot(collection(db, 'workflows'), (snapshot) => {
          setWorkflows(snapshot.docs.map((workflowDoc) => ({ id: workflowDoc.id, ...workflowDoc.data() })));
        });

        unsubCommunityPosts = onSnapshot(collection(db, 'communityPosts'), (snapshot) => {
          setCommunityPosts(snapshot.docs.map((postDoc) => ({ id: postDoc.id, ...postDoc.data() })));
        });

        unsubSecuritySettings = onSnapshot(doc(db, 'settings', 'security'), (settingsDoc) => {
          if (settingsDoc.exists()) {
            setSecuritySettings((prev) => ({ ...prev, ...settingsDoc.data() }));
          }
        });

        unsubServicePlan = onSnapshot(doc(db, 'settings', 'servicePlan'), (planDoc) => {
          if (planDoc.exists()) {
            setServicePlan((prev) => ({ ...prev, ...planDoc.data() }));
          }
        });
      } catch (error) {
        console.error('[useAppData] Failed to subscribe to collections:', error);
      }

    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubPeople) unsubPeople();
      if (unsubDonations) unsubDonations();
      if (unsubSongs) unsubSongs();
      if (unsubTeams) unsubTeams();
      if (unsubWorkflows) unsubWorkflows();
      if (unsubCommunityPosts) unsubCommunityPosts();
      if (unsubSecuritySettings) unsubSecuritySettings();
      if (unsubServicePlan) unsubServicePlan();
    };
  }, [isAuthenticated]);

  return {
    events,
    setEvents,
    loadingEvents,
    people,
    setPeople,
    loadingPeople,
    planItems,
    setPlanItems,
    donations,
    setDonations,
    songs,
    setSongs,
    teamsList,
    setTeamsList,
    workflows,
    setWorkflows,
    communityPosts,
    setCommunityPosts,
    securitySettings,
    setSecuritySettings,
    servicePlan,
    setServicePlan,
  };
}
