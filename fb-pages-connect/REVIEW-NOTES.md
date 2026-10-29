# Meta App Review notes

Copy the relevant parts into the App Review form. Keep the video and the text consistent with how the app really behaves.

## Before you submit
- Business Verification completed for the business portfolio that owns the app.
- App deployed on a public HTTPS domain. Set `PUBLIC_URL`, `BUSINESS_NAME`, `CONTACT_EMAIL` in `.env`.
- In **App settings > Basic**: Privacy Policy URL `https://YOUR-DOMAIN/privacy`, Terms URL `https://YOUR-DOMAIN/terms`, Data Deletion Request URL `https://YOUR-DOMAIN/data-deletion` (callback) or the instructions page, app icon, category.
- Add the reviewer's test Facebook account as a Tester and give them a Page they can manage, plus login steps.

## Permission justifications

**pages_show_list**
The app lets the Page administrator log in with Facebook and choose which of their Pages to manage. We use this permission to list the Pages the administrator manages.

**pages_manage_metadata**
Needed to connect the selected Page to the app so it can read the Page's Messenger conversations.

**pages_messaging**
The administrator uses the app to read messages that customers sent to their Page and to reply. For customers who have an order, booking or request, the Page sends status updates (for example "your order has shipped") using Message Tags: POST_PURCHASE_UPDATE, CONFIRMED_EVENT_UPDATE, ACCOUNT_UPDATE and HUMAN_AGENT. The app does not send promotional content: promotional wording is blocked, each recipient must have an order/booking reference, every message includes "Reply STOP to stop receiving updates", and anyone who replies STOP is excluded.

## Screencast script (about 3 minutes, narrate in English)
1. Open the app, click **Connect with Facebook**, log in, and select a Page in the popup.
2. Show the **Pages** screen with the Page listed and the granted permissions.
3. Send a message to the Page from the tester's Facebook account. Click **Sync customers**. Show the customer under **Leads**.
4. Open **Inbox**, open that conversation and send a normal reply.
5. On **Leads**, enter an order reference for that customer.
6. Open **Order & Booking Updates**: choose the Page, a ready-made "Order shipped" template and the Post-purchase tag. Point out the preview and the STOP footer. Send it.
7. Show the message arriving in Messenger, then the **Logs** screen.
8. Reply STOP from the tester account and show the customer is excluded from the next send.
9. Show `/privacy` and `/data-deletion`.

## Things that commonly cause rejection
- Showing or describing promotions, offers or discounts anywhere in the video or text.
- A Privacy Policy or Data Deletion URL that does not load, or a login the reviewer cannot complete.
- Requesting permissions the video never demonstrates.
