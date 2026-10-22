# Long Documentary Pipeline v6

GENERAL RULES (apply to every step, every video)
- Deliver only one step per reply. At the end of a step print: what was made, where it is saved, problems found,
  choices you made, then "STEP N DONE. Type NEXT for Step N+1." Never start the next step before I type NEXT.
  "CONTINUE" means resume the unfinished step (for example after a tool limit).
- Do not ask me questions inside a step. Make the best call, keep going, and list your choices at the end.
  Exception: if no script is provided, ask me to paste it and stop.
- Project folder: create it with "/Volumes/Leghari 1/Automation/History Documentaries/new-documentary.sh".
  Keep a checklist in PLAN.md and tick items off, so when I type NEXT or CONTINUE after any interruption you read
  PLAN.md and continue from the right place.
- Tools for this pipeline: Google Flow (images only), ai33 pro (voice), Remotion (animation), ffmpeg and whisper-cli
  (in /Volumes/Leghari 1/Automation/tools). NOT used: Higgsfield, ElevenLabs, Flow video clips, thumbnails,
  History Motion Studio. Do not change older projects.
- Never "fix" the script's wording or facts yourself; if you doubt something, list it in the report.
- Never skip a failed check silently. If a tool fails or a check fails, say so and fix it or tell me.

LANGUAGES
- Narration (voice) = Hindi (Devanagari).
- ALL TEXT THAT APPEARS INSIDE THE VIDEO = ENGLISH: labels, tags, stamps, newspaper headlines, date and place
  captions, numbers. Short (1 to 4 words), true to the script, in capital or typewriter style, spelled correctly.
  Never put Hindi text on screen.

FIXED VISUAL STYLE (every picture, every video)
- Vintage paper cut-out collage: black-and-white and sepia figures and objects cut out like paper, with a thin white
  paper border and a soft shadow.
- ONE accent colour only: red (thread, pins, stamps, circles, arrows), added by the animation, never drawn in pictures.
- No text, labels, numbers or logos inside generated pictures. The animation adds them.
- Never place a raw rectangular photo on screen; convert it to the cut-out style first.
- No filler: no blank cards, no decorative tape, no scraps without meaning. Everything on screen is tied to the
  narration. Everything must match the year and country of that shot; no modern objects.
- Nothing may flicker or blink (see the anti-blink rules in Step 5).

THE DESK SYSTEM (the look of the whole video)
- The whole video happens on ONE big base surface, "the desk" (for example dark aged wood or worn leather, chosen
  once from the topic). It never changes in the whole video.
- The camera films the desk like a real camera and slides from one area to the next. It never cuts.
- At every new area, the camera arrives at an EMPTY part of the desk. Then a ground sheet (map, newspaper page,
  patent, ledger, letter, telegram...) lands there, and then the script-related cut-outs and extras appear on it.
  Old sheets stay behind on the desk, so it fills up as the story moves.

## Workflow note
Steps 1 to 7 will be pasted one by one the first time and appended below. From the next video on, only a TOPIC,
the script and the YouTube text are given, and the whole pipeline runs from this file, ONE STEP AT A TIME.

<!-- STEPS 1-7 BELOW (not yet received) -->

## STEP 1 — INTAKE

TOPIC: [TOPIC]

SCRIPT (paste the ChatGPT script parts, Steps 1–4, here):
[PASTE SCRIPT]

YOUTUBE TEXT (paste ChatGPT Step 5 here: titles, description, tags, hashtags):
[PASTE YOUTUBE TEXT]

Do this:
1. Create the project folder for this topic with new-documentary.sh.
2. Build 01_Script/script-hindi-full.txt: join the parts in order and remove everything that is not narration
   (section labels like [A1: …], "Word count" lines, notes, headings). Keep paragraph breaks.
   Also save 01_Script/script-labeled.txt with the section labels kept (they define the chapters).
3. Check and report: is it Hindi (Devanagari)? (If it is Roman Urdu, stop and tell me to get the Hindi version.)
   Total word count and estimated duration at 135 words per minute (the limit is 3,300 words; report if above).
   Any CTA words (subscribe, like, comment)? Does the hook start with an exact date? Is the bridge present?
4. Write facts.md: every date, number, person, place and claim in the script, with a source found by web search.
   Mark each verified or not verified. Do not edit the script. List the not verified items in your report.
5. Save the YOUTUBE TEXT exactly as given into 08_Final_Video/youtube_description_tags.txt (titles, description, tags,
   hashtags). Leave out any thumbnail text.
6. Create PLAN.md with the 7-step checklist.
Stop after the report.

## STEP 2 — SHOT PLAN

Read script-labeled.txt. Plan the whole visual side. No pictures yet.

1. Split the narration into sentences and shots. Chapters come from the section labels.
   HOOK = the first 60–90 seconds up to the end of the bridge. PART 1 = the first 5 minutes (including the hook).
   PART 2 = everything after 5 minutes.
2. DESK PLAN: choose one desk surface for the topic (mood and era). Lay out the camera path over the desk in a snake
   pattern (left to right, step down, right to left, and so on). Each shot is a CAMERA STOP at a new empty area.
   Per chapter, add one short zoom-out to show the filled desk before moving on.
3. Write 03_Scene_Plans/shot_list.csv and .json, one row per shot:
   shot_id | chapter | part | narration line | on-screen action (what HAPPENS: the narration's verb becomes the
   screen action) | desk stop position (x, y) | ground sheet type and how it lands | cut-outs used with positions on the
   sheet | extras (each with its cue word and entry animation) | red thread (from → to, cue word, path) |
   newspaper headline (exact English text) | stamp/label (exact English text) | camera move
4. Rules for the shots:
   - Part 1 shots last 3–5 seconds. Part 2 shots last 6–10 seconds (slow zoom or drift on one area, never the same
     move twice in a row).
   - Every Part 1 shot has the main subject plus 2–3 extra small elements tied to words of that line
     (sun for morning, moon for night, calendar tag for a date, map piece and pin for a city, coins for money,
     crowd figures for doubters, clouds/rain/thermometer for weather, red circle or black ribbon for danger or death).
     Entry animations must differ inside a shot (drop with settle, pop, slide with a small rotation, unfold,
     stamp press, drawn line). A Part 1 shot with fewer than 2 extras is an error.
   - Red thread: at least 3–4 in the hook, at least one per minute in the rest of Part 1, and in Part 2 about one
     every 1–2 minutes where the narration links two things. Each thread connects two things the narration links at that
     moment and is drawn from pin to pin on a cue word.
   - Newspaper headlines: at least 2–3 in the hook, with a short TRUE headline from the script in English, era-correct
     masthead style, generic masthead name if unsure. Never invent a quote.
   - Stamps, labels and tags only with short true words from the script, in English (for example FIRST CAR, 1888,
     GERMANY, DIED 1893). Write the exact text for each in shot_list.csv.
5. Picture list (file name, what it is, era, country, clothing, angle). Each picture is ONE person or object on its own.
   Reuse the same pictures across shots when the script returns to the same person or machine (about 30–50 pictures).
   Also list the PROPS KIT (sun, moon, clouds, coins, banknote, calendar sheet, crowd figures, thermometer,
   black ribbon, newspaper clipping blanks...): check /Volumes/Leghari 1/Automation/asset-library first and reuse what exists.
   Also list 15–20 ground sheet types chosen from the topic (old map of the real place, newspaper page of that era and
   country, patent or blueprint, ledger, letter, telegram, poster...). Sheets can be reused at a different rotation,
   crop and place.
6. Write the style line once, word for word, in 03_Scene_Plans/style_line.txt.
7. Quality check before you report: does every shot show its narration action? Any filler? Any anachronism?
   Any shot below the rules above? Any Hindi text on screen? Fix them first.
Report: number of shots (Part 1 / Part 2), pictures, props, sheets, threads in the hook, headlines in the hook.
Stop.
