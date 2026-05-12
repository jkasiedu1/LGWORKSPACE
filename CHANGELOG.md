# Changelog

## 2026-05-12
- Added Super Admin-managed user provisioning APIs in the worker: invite/create account, assign role claims, and delete user by email.
- Added secure first-time onboarding path where invited users receive a password setup email and choose their own password.
- Added in-app first-login username gate that requires users to set a valid username before continuing.
- Expanded Security app role modal with Add User and Remove User actions so Firebase Console is no longer required for routine account management.
- Refactored role/user admin API client calls for consistent auth, network error handling, and endpoint derivation.

## 2026-05-06
- Added Firestore-backed persistence for Community direct messages, Teams portal chat, and Workflows 2-way inbox.
- Added retry-aware Firestore mutations for transient network failures in shared service helpers.
- Added optimistic update with rollback for key mutations in Community posts, Giving donations, Music songs, and Workflows automations/inbox send flows.
- Expanded Firestore security rules for new message collections: `communityMessages`, `teamMessages`, and `workflowInboxMessages`.
- Improved chat UX with loading states and resilient send failure toasts in Community, Teams, and Workflows modules.
