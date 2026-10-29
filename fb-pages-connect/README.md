# Page Direct

Apne Facebook Pages ka personal dashboard: connect, leads, inbox, templates aur bulk campaigns (Message Tags ke saath).
Sirf aap ke computer par chalta hai (`127.0.0.1`), koi npm package nahi chahiye, Node 20.6+.

## Meta app setup (ek baar)
1. developers.facebook.com par app banayein. Use cases: Facebook Login, Engage with customers on Messenger.
2. **Facebook Login for Business > Configurations** mein configuration banayein (General, User access token) aur permissions chunein: `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `business_management`. Configuration ID copy karein.
3. Login settings ke **Valid OAuth Redirect URIs** mein `http://localhost:3100/auth/callback` daalein.
4. **App settings > Basic** se App ID aur App Secret lein.

## Chalane ka tareeqa
```
cd fb-pages-connect
cp .env.example .env     # .env mein App ID, Secret, Configuration ID bharein
npm start
```
Phir http://localhost:3100 kholein.

## Screens
- **Dashboard**: messages sent, leads, pages, templates
- **Pages**: Facebook connect/refresh, har page ka "Leads sync"
- **Leads**: wo log jinhon ne page se baat ki, labels lagayein
- **Labels**: leads ke groups
- **Inbox**: conversations dekhein aur jawab dein
- **Library**: message templates (`{name}`, `{fullname}`, `{page}`)
- **Bulk Campaigns**: ek ya kai pages tick karein, template aur tag chunein, audience (saare leads ya label) chunein
- **Logs**: har message ka sent/failed record

## Zaroori baatein
- Message Tags sirf kaam ke messages ke liye hain (order, booking, account update). Promotion/offer bhejna allowed nahi.
- Development mode mein messages sirf app ke admin/tester ko pahunchte hain. Asal customers ke liye `pages_messaging` ki Advanced Access (App Review) chahiye.
- Campaign shuru karne se pehle confirm poochta hai. Messages 0.3 second ke gap se bheje jate hain.
- Page tokens aur data `data/store.json` mein hain (git mein nahi jata). Ye password jaisa samjhein.
