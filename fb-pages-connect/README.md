# Page Direct

A personal dashboard for your own Facebook Pages: connect Pages, see customers, reply in an inbox, and send order, booking and account updates with Message Tags.
Runs on your own computer (`127.0.0.1`). No npm packages needed, Node 20.6+.

## Meta app setup (once)
1. Create an app at developers.facebook.com. Use cases: Facebook Login, Engage with customers on Messenger.
2. Under **Facebook Login for Business > Configurations**, create a configuration (General, User access token) with the permissions `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `business_management`. Copy the Configuration ID.
3. Add `http://localhost:3100/auth/callback` to **Valid OAuth Redirect URIs**.
4. Copy the App ID and App Secret from **App settings > Basic**.

## Run
```
cd fb-pages-connect
cp .env.example .env     # fill in App ID, Secret, Configuration ID, business name, contact email
npm start
```
Open http://localhost:3100.

## Screens
- **Dashboard**, **Pages** (connect, sync customers, open a Page's inbox), **Leads** (order/booking reference, opt-out, labels), **Labels**, **Inbox**, **Library** (templates), **Order & Booking Updates**, **Logs**.
- Public pages for Meta App Review: `/privacy`, `/terms`, `/data-deletion`. Facebook's data deletion callback: `POST /data-deletion`.

## Built-in policy safeguards
- Updates require a Message Tag (order, booking, account or human-agent) and an order/booking reference for each recipient.
- Promotional wording (sale, discount, offer, free, percentages, etc.) is blocked.
- Every update ends with "Reply STOP to stop receiving updates". People who reply STOP are excluded.
- Sending stops automatically after 5 failures in a row.
- Messages go out slowly (0.3 s apart) and the sender asks for confirmation first.

## Notes
- In Development mode, messages only reach people with a role on the app. Real customers need Advanced Access to `pages_messaging` (App Review). See `REVIEW-NOTES.md`.
- Tokens and customer data are stored in `data/store.json` (not committed to git). Treat it like a password.
