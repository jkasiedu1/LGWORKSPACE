# Changelog

## 2026-05-06
- Added Firestore-backed persistence for Community direct messages, Teams portal chat, and Workflows 2-way inbox.
- Added retry-aware Firestore mutations for transient network failures in shared service helpers.
- Added optimistic update with rollback for key mutations in Community posts, Giving donations, Music songs, and Workflows automations/inbox send flows.
- Expanded Firestore security rules for new message collections: `communityMessages`, `teamMessages`, and `workflowInboxMessages`.
- Improved chat UX with loading states and resilient send failure toasts in Community, Teams, and Workflows modules.
