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

THE DESK SYSTEM (the look of the FIRST 5 MINUTES only = Part 1)
- Part 1 happens on ONE big base surface, "the desk" (for example dark aged wood or worn leather, chosen once from
  the topic). It does not change during Part 1.
- The camera films the desk like a real camera and slides from one area to the next. It never cuts.
- At every new area, the camera arrives at an EMPTY part of the desk. Then a ground sheet (map, newspaper page,
  patent, ledger, letter, telegram...) lands there, and then the script-related cut-outs and extras appear on it.
  Old sheets stay behind on the desk, so it fills up as the story moves.
- AT THE 5-MINUTE MARK the camera zooms out smoothly to show the WHOLE desk with everything that was shown in
  Part 1 still on it, so the full, crowded desk is visible.
- AFTER 5 MINUTES (Part 2) there is NO desk and no desk background. Part 2 uses still pictures (see Step 6).

## Workflow note
Steps 1 to 7 will be pasted one by one the first time and appended below. From the next video on, only a TOPIC,
the script and the YouTube text are given, and the whole pipeline runs from this file, ONE STEP AT A TIME.


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
2. DESK PLAN (Part 1 only): choose one desk surface for the topic (mood and era). Lay out the camera path over the
   desk in a snake pattern (left to right, step down, right to left, and so on). Each Part 1 shot is a CAMERA STOP at
   a new empty area. The desk exists only for the first 5 minutes. Plan a final ZOOM-OUT at the 5-minute mark that
   shows the whole filled desk. Part 2 shots (after 5 minutes) are still pictures with no desk and no desk path.
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
   - HAND STAMP (only in the first 5 minutes, 2-3 places in total): at a key English word (for example FIRST CAR,
     DIED 1893) a hand holding a rubber stamp enters, presses the stamp on the paper and lifts away; the stamp
     leaves the word printed in red ink. The printed word must be exactly the same size and shape as the stamp
     face, so it clearly looks printed by that stamp. Count it as one of that shot's extras and write the exact
     English text for it in shot_list.csv (column: stamp/label, marked HAND STAMP).
   - Stamps, labels and tags only with short true words from the script, in English (for example FIRST CAR, 1888,
     GERMANY, DIED 1893). Write the exact text for each in shot_list.csv.
5. Picture list (file name, what it is, era, country, clothing, angle). Each picture is ONE person or object on its own.
   Reuse the same pictures across shots when the script returns to the same person or machine (about 30–50 pictures).
   Also list the PROPS KIT (sun, moon, clouds, coins, banknote, calendar sheet, crowd figures, thermometer,
   black ribbon, newspaper clipping blanks, a hand holding a rubber stamp...): check /Volumes/Leghari 1/Automation/asset-library first and reuse what exists.
   Also list 15–20 ground sheet types chosen from the topic (old map of the real place, newspaper page of that era and
   country, patent or blueprint, ledger, letter, telegram, poster...). Sheets can be reused at a different rotation,
   crop and place.
6. Write the style line once, word for word, in 03_Scene_Plans/style_line.txt.
7. Quality check before you report: does every shot show its narration action? Any filler? Any anachronism?
   Any shot below the rules above? Any Hindi text on screen? Fix them first.
Report: number of shots (Part 1 / Part 2), pictures, props, sheets, threads in the hook, headlines in the hook.
Stop.

## STEP 3 — PICTURES WITH GOOGLE FLOW

Make every picture from the picture list, the props kit items that do not exist yet, the desk and the ground sheets.
1. Prompt for each cut-out picture: what it is, era and country, angle; then "lots of empty space around it, nothing
   touching the edges"; then the style line word for word; then "plain white background, no text, no labels, no
   numbers, no arrows, no frame, no modern objects". Square unless clearly wide or tall.
2. If a real public-domain photo or engraving of this person or machine exists (Wikimedia Commons, Library of
   Congress), download it, note the credit in credits.txt, and use it as the reference so the person or machine looks
   real. Convert it to the same cut-out style. Never use it as a raw rectangle.
3. Flow cannot make transparent PNGs: remove the background yourself, keep a thin white paper border, clean the edge
   (remove halo and fringe pixels, the alpha edge must be crisp and stable), and save into 05_Transparent_PNGs with the
   name from the list.
4. DESK: make one large desk surface for the whole video (texture only, no objects, no text), at least 7680x4320,
   tileable with no visible seams. Save to 04_Historical_Images/desk.png.
5. SHEETS: make each ground sheet type as a single sheet of paper with irregular torn or aged edges on a plain solid
   background, no text, low contrast, about 2400x1500 px. Cut each out from its background (clean alpha edge; the
   shadow is added by the animation) and save into 04_Historical_Images.
6. Look at every picture. If it has text, a colour other than black/white/sepia, a cut-off edge, extra objects, a rough
   or haloed edge, a wrong era, or a different style, make it again (twice at most).
7. If Flow stops because of a daily limit: save what is done and what is pending in PLAN.md, tell me, and stop.
   I will type CONTINUE later.
8. Save all prompts in 05_Transparent_PNGs/prompts.md, report how many Flow generations were used, and open one
   contact sheet with all pictures.
Stop.

## STEP 4 — VOICE

VOICE NAME (ai33 pro, Hindi): [VOICE NAME, e.g. Hindi Voice 2]
(If I leave it empty, use the voice name from my last video.)

1. Make the voice with ai33 pro (use the existing ai33_task.sh / tts.sh in the Automation folder if they fit), calm
   and deep, reading script-hindi-full.txt word for word. Same voice and settings for every paragraph. Make it
   one paragraph at a time and join the parts with natural pauses. Save 02_Voiceover/narration_full.mp3 (and a wav).
2. Get the time of every word with whisper-cli, then align it to the SCRIPT's words (so timings follow the script
   even if whisper mishears a word). Save 02_Voiceover/words.json.
3. Check: total duration, no cut-off words, no pause longer than 1.5 seconds, no change in the voice between parts,
   no sound glitches. Redo any bad paragraph.
4. Update shot_list.csv with exact start and end times: each shot starts at the timestamp of the first word of its first
   sentence (absolute time on one timeline, never by adding clip lengths). Report the voice duration and any shot that
   became too short or too long for its rules.
Stop.

## STEP 5 — ANIMATION PART 1: THE FIRST 5 MINUTES
FPS: 30   (change to 60 only if I write it here)

Set up the Remotion project (1920x1080). If a Remotion template from an earlier video exists in
/Volumes/Leghari 1/Automation, reuse it; otherwise create it at /Volumes/Leghari 1/Automation/remotion-history-template.
It must be a reusable template: desk, sheets, pictures, positions, thread paths, pins, labels, headlines, stamps and
timings all live in one settings file, so a new video only needs a new settings file and new pictures. Build all Part 1
shots from shot_list.csv, each landing on its words.

THE CAMERA works like a real camera filming one large desk. It slides slowly from one area of the desk to the next
(start slow, speed up, settle slow), with a small drift while it rests. It never cuts. The desk background never
changes. In Part 1 the camera moves to a new area every 3 to 5 seconds.
ARRIVAL SEQUENCE for every stop:
 1. The camera slides to an empty area of the desk. It leaves the old area during the last words of the previous
    line and arrives at the first word of the new line.
 2. The ground sheet lands on that area (drop and settle with a small rotation, or slide in from the edge, or
    unfold) in 0.4 to 0.7 seconds, with a soft shadow growing as it lands. It may begin up to 0.2 s before the first word.
 3. Then the cut-outs, extras, thread, headlines and stamps appear on their own words, each with a different entry.
Nothing from the new stop is visible before the camera arrives. Old sheets stay on the desk behind.
Do not render the whole desk each frame: only draw the items near the camera view. Keep all desk coordinates in the
settings file.

How things appear:
- Cut-outs enter with paper movement (drop and settle with a small bounce, slide with a slight rotation, pop,
  unfold), with a soft shadow that grows as they land. Far layers move slower (2.5D depth).
- Each shot: the main subject plus its 2–3 extras, each landing on its word with a different entry.
- Newspaper clippings with the planned true English headline slide or spin in. Red ink stamps press in with the planned
  English words. Labels are torn paper tags or typewriter captions in English, clean readable font. A magnifying
  circle may grow out of a detail, joined by two thin lines.
- Keep the top 8% and bottom 15% of the frame free of anything important; never cut a picture off at the edge.
- HAND STAMP (2-3 places only, in Part 1, as planned in the shot list): a cut-out hand holding a rubber stamp slides
  in on the cue word, presses down on the paper (small squash, short pause), lifts and leaves. The English word
  appears in red ink at the moment of the press, exactly as large as the stamp face (same width, height and
  rotation), so the stamp clearly made it. The imprint stays. Count the hand stamp as one of that shot's extras.

THE RED THREAD (build it in full detail):
- Real cotton-thread look: 4–6 px, deep red (#B3261E), twisted-fibre texture, slightly darker edge, soft shadow on
  the paper below.
- It runs between two glossy red pushpins (small highlight, short shadow). The first pin drops with a tiny bounce, the
  thread is DRAWN from pin to pin on the cue word over 0.8–1.5 s (slow start, fast middle, slow settle), then the
  second pin drops.
- The path is a natural slight sag, never a ruler-straight line, or a traced path on a picture (a route on a map, a rail,
  a road). For traced paths, look at the picture and trace the exact route.
- After it lands it keeps a very small sway. It can carry a small paper tag with a short English label (date, place,
  number). When no longer needed it fades out with the pins; it never pops off.

ANTI-BLINK RULES (the last video's pictures blinked; this must never happen):
- Load every image with Remotion's <Img> and preload all images before rendering (hold the render with delayRender
  until they are decoded). Never use CSS background images or plain <img> without preloading.
- Mount each picture once for its whole life; never unmount and remount it between frames, never change its React
  key. Control it only with opacity and transform from interpolate().
- Do not animate blur or CSS filters on large images frame by frame. Use pre-rendered shadows and fixed depth blur
  values. Entries use opacity, scale, position and rotation only.
- Use cut-outs with a clean alpha edge (no halo pixels). Avoid sub-pixel rounding jumps: keep transforms smooth,
  do not round positions per frame.
- If a render still blinks, lower render concurrency (1–2) and re-render those parts.
- Detect blinks after rendering: compare consecutive frames for the full lifetime of every cut-out. Any picture whose
  pixels disappear and come back for 1–2 frames is a blink. Fix and re-render until the report shows zero blinks.

END OF PART 1 (5-minute mark): the camera zooms out smoothly (about 3-4 s, ease in-out) until the whole desk is
visible with every sheet and cut-out from Part 1 still on it, and holds for a moment. Then Part 2 begins. Check that
all of Part 1's items are present and that nothing is cut off.
HOOK REQUIREMENTS: at least 3–4 red threads, at least 2–3 newspaper headlines, 2–3 extras on every shot.
TIMING: every visual appears on its word or up to 0.2 s before it, never after.

Check it: render a still every second in the hook and every 2 seconds in the rest of Part 1, look at all of them, and
fix anything off (a thread off its path, a missing pin, a late visual, cut-off or misspelled English text, filler,
Hindi text on screen). Render out/part1.mp4 with the voice. Report: extras per shot, threads and headlines in the
hook, blinks found and fixed, largest sync delay. Open the video.
Stop.

## STEP 6 — ANIMATION PART 2: AFTER 5 MINUTES

Using the same Remotion template and settings file, build every shot after the 5-minute mark. From here there is NO
desk and no desk background: each shot is a still picture composition on a plain, quiet backdrop (one simple aged
dark paper tone, same for the whole of Part 2, chosen once).
- Each shot lasts 6-10 s: the cut-outs (and a sheet such as a map or newspaper page only when the narration needs
  it) are composed together and land softly on the first words, then a slow smooth zoom or drift on the picture,
  never the same move twice in a row, one direction per shot, then a smooth transition to the next shot.
- A red thread, English label, stamp or headline only where the shot list says so (key facts, about once every
  1–2 minutes).
- SMOOTH ZOOM, NO SHAKING: use pictures at least 2x the output size, apply the zoom with GPU transforms with sub-pixel
  precision (no rounding to whole pixels), 5–8% zoom over the whole stop, ease in-out.
- Shots and chapters flow into each other with smooth transitions (slide or soft cross-dissolve, no hard cuts). No
  black frames. The picture never stops completely; it always drifts a little.
- Same anti-blink rules, performance rule and timing rules as Step 5.
Check: render a still every 2 seconds and look at them. Measure jitter: for every zoom/drift, check that the movement
between consecutive frames changes smoothly (no jumps). Re-render any shot that shakes or blinks.
Render each chapter to out/part2_chapter_N.mp4 and report: shots built, threads and labels used, jitter check result,
blinks found and fixed. Open one sample chapter.
Stop.

## STEP 7 — FINAL RENDER AND YOUTUBE TEXT

1. Join Part 1 and all Part 2 chapters with the voice into one timeline. If SFX or music files exist in the asset
   library, add very light paper/stamp sounds and quiet background music under the voice; otherwise skip them and say
   so. Export 08_Final_Video/<Topic>_final.mp4 (1920x1080, H.264, same fps as the project).
2. Check and report numbers:
   - Sync: for every shot, the difference between the shot change and its first word (at most 1 frame late) and the
     largest delay found. The video length must equal the voice length plus one second. Fix and re-render if not.
   - Black frames: none. Blinks: zero. Jitter on zooms: none. On-screen text: all English, spelled correctly,
     nothing cut off, no Hindi text.
   - Hook: number of red threads, newspaper headlines and extras per shot.
3. Update 08_Final_Video/youtube_description_tags.txt: keep the titles, description, tags and hashtags from ChatGPT,
   but replace the estimated timestamps with the REAL chapter timestamps from the final video. Keep it plain text.
4. Final report: what was built, what is missing, every choice you made, and anything I should check by hand.
   Open the final video.
Done.
