#!/bin/bash
# One command: get the newest code, install what is new, and start the site at http://localhost:3000
cd "$(dirname "$0")" || exit 1
git pull origin claude/confident-goldberg-005itr
npm install
npm run dev
