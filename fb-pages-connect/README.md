# FB Pages Connect

Facebook se login karke apne saare Pages ki list dekhne ka chhota tool. Abhi sirf connect aur list hai, messaging baad mein judegi.

## Meta app setup (ek baar)
1. https://developers.facebook.com/apps par **Create App** (type: Business).
2. **Facebook Login for Business** ya **Facebook Login** product add karein.
3. Login settings mein **Valid OAuth Redirect URIs** mein `http://localhost:3000/auth/callback` daalein.
4. **App settings > Basic** se App ID aur App Secret copy karein.
5. App Development mode mein rehne dein. Aap khud app ke admin hain, isliye review ke baghair login chalega.

## Chalane ka tareeqa
```
cd fb-pages-connect
cp .env.example .env     # phir .env mein App ID aur Secret bharein
npm start                # Node 20.6 ya naya chahiye
```
Browser mein http://localhost:3000 kholein aur **Facebook se connect karein** dabayein.

Facebook ki popup mein **sab Pages select karna** zaroori hai, warna wo list mein nahi aayenge.

## Note
- Pages `/me/accounts` se aur Business Manager (`owned_pages`, `client_pages`) se dono jagah se uthaye jate hain.
- Page tokens `data/pages.json` mein save hote hain (git mein nahi jaata). Ye password jaisa samjhein.
