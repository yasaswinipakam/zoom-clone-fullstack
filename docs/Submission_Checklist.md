# Submission Checklist

## Mandatory requirements

- [x] Zoom-inspired landing dashboard
- [x] New Meeting with generated meeting code, persistence, invite link, and room navigation
- [x] Join by meeting ID or invite link with display-name validation
- [x] Scheduled meetings with title, description, date/time, duration, and Upcoming rendering
- [x] Recent meeting rendering after end lifecycle transition
- [x] Meeting room, participant panel, leave/end actions, and shareable invite dialog

## Bonus requirements

- [x] Responsive desktop/tablet/mobile layout adjustments
- [x] Optional signup/login, bcrypt password hashes, JWTs, and protected `/auth/me`
- [x] Host badge, participant list, Mute All visual control, removal confirmation, and end-for-all confirmation

## Quality gates

- [x] Alembic initial schema and auth migration applied successfully against a fresh SQLite database
- [x] FastAPI starts successfully
- [x] Manual API smoke tests: health, auth signup/login, meeting lists
- [x] Frontend production build passes
- [x] No known critical functional bugs

Before upload, set a unique `JWT_SECRET_KEY`, run `alembic upgrade head`, seed sample data, and use deployed frontend/backend URLs in the environment files.
