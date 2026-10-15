# Storyline — Campus Life: The Journey

> *Your campus. Your choices. Your story.*

The main story, its structure, choices and endings. Characters are defined in
[CHARACTER_BIBLE.md](CHARACTER_BIBLE.md); the systems the story relies on
(dialogue, flags, relationships, reputation, time) are specified in
[GAME_DESIGN.md](GAME_DESIGN.md).

**Status:** design only. No mission, dialogue or story system exists in the
game yet. This document fixes the narrative structure; dialogue is written
later, mission by mission.

**Fiction notice:** UCIS University, Crestline Developments, the Founders'
Scholarship and every person in the story are invented. No real university,
company or individual is portrayed, or implied to be involved in any scandal.

---

## 1. Premise

A first-year student arrives at UCIS University for one academic year. Within
weeks, a midsemester exam paper leaks and the university's scholarship students
are blamed. Behind it is a plan to quietly sell the campus sports field to a
private hostel developer — and the people the player befriends are each more
tangled up in it than they admit.

**Central question:** *what will you risk for the truth — your grades, your
friends, your future?*

**Themes:** ambition and its price; loyalty versus integrity; how institutions
protect themselves; who gets believed.

---

## 2. Opening

### M00 — Arrival (cinematic, skippable)

A 60–90 second scripted sequence on the existing campus. A **Skip** button is
visible from the first frame; skipping jumps straight to character creation.

1. **Dawn, a trotro on the road outside the fence.** Phone notification:
   *"Congratulations — you have been admitted to UCIS University."*
2. **The gate.** Students dragging suitcases; Uncle Bright waving cars through
   the raised barriers.
3. **Sweep over the campus:** courtyard monument, lecture halls, the four
   H-shaped buildings, the hostels, the football field at sunrise.
4. **A shadow beat:** a man in a suit (Mr. Narh) on the Administration steps,
   watching surveyors' pegs being hammered into the far end of the football
   field. Nobody else notices.
5. **Title card:** *CAMPUS LIFE: THE JOURNEY — Your campus. Your choices. Your
   story.*

Implementation note: camera spline plus captions over the Phase 1 campus; no
new character art is required for a first version.

### Character creation

As specified in GAME_DESIGN.md §4: name, form of address, appearance,
programme (one of five: Engineering, Computer Science, Business
Administration, Communication Studies, Architecture), home. The chosen
**programme** decides the player's timetable, first lecture location and one
exclusive side story.

### M01 — Akwaaba (first playable mission)

Teaches movement, the camera toggle, interaction, the map and the phone. Uses
places that already exist in the Phase 1 build.

| Step | Objective | Teaches |
| --- | --- | --- |
| 1 | Walk through the gate and sign in with **Uncle Bright** at the porter's lodge | Movement, talking |
| 2 | Read the **AKWAABA** campus sign | Interaction (already implemented) |
| 3 | Find the **Administration Block** and collect your student ID | Map and minimap |
| 4 | Cross the courtyard; use the **signpost** to find Hastech Hostels | Signs, free choice of route |
| 5 | Find room **A-214** and meet **Nii** | Story NPC dialogue |
| 6 | Nii adds you to the hostel group chat | The phone |

**Outcome:** the campus opens fully; Day 1 ends at sleep. Flags:
`met_nii`, `has_student_id`.

---

## 3. Chapter structure

One academic year, six chapters plus an epilogue. Each chapter has **story
missions** that unlock in order, and **free days** between them in which the
player can roam, study, earn money, play side stories or ignore the plot
entirely. A mission becomes available when its trigger is met (a date, a
location, a relationship value, or a message on the phone) and waits for the
player. Only missions marked ⏱ have a deadline; missing it moves the story onto
a different branch rather than ending the game.

| Ch. | Title | Semester time | Arc |
| --- | --- | --- | --- |
| 1 | Freshers' Week | Weeks 1–2 | Arrive, settle, meet the cast |
| 2 | The Grind | Weeks 3–5 | Lectures, money, friendships; first hints |
| 3 | The Leak | Weeks 6–7 (midsems) | A paper leaks; Abiba is accused |
| 4 | Campaign Season | Weeks 8–10 | SRC election; suspects multiply |
| 5 | The Field | Weeks 11–12 | The land deal surfaces; a betrayal |
| 6 | The Hearing | Weeks 13–15 (finals) | The truth on trial; the ending is decided |
| — | Epilogue | End of year | Consequences play out |

### Chapter summaries

**1 · Freshers' Week.** M01, then the first lecture. The player meets Abiba in
the Library, Selasi recruiting volunteers in the courtyard, and KB throwing a
welcome party at the Student Centre. Yaw's Block B mocks Block A's freshers.

**2 · The Grind.** Money runs short; Hajia Zainab offers work or a loan. Nii's
"Past Questions 🔥" chat becomes everyone's lifeline. Esi interviews the
player for a "freshers' first month" piece and leaves a card. Surveyors'
pegs appear on the football field; Yaw is told it is "drainage work".

**3 · The Leak.** The night before midsems, a file in Nii's chat is the real
paper. The player's choice here (M05) is the game's first major decision.
After the exam, scholarship students — Abiba first — are accused. Esi starts
digging; KB, loud and well connected, looks guilty.

**4 · Campaign Season.** KB and Selasi run for SRC president. Both want the
player. The debate at the courtyard turns on the leak. Election night ends with
a result shaped by the player's campaigning and what has been revealed.

**5 · The Field.** The surveyors return in daylight. Yaw rallies the teams.
Following the money leads to the Administration Block and Mr. Narh. The
**betrayal** lands: the player's closest ally sells them out, and which ally
depends on earlier choices (M13).

**6 · The Hearing.** A disciplinary hearing at the Administration Block decides
Abiba's scholarship, the leak and — through what is revealed — the field. The
player must gather witnesses and evidence, then sit their own final exams.

---

## 4. Plot twists (reveal order)

1. **Ch. 3 — The channel.** The leak spread through Nii's chat. He knew by the
   night of the exam and kept quiet.
2. **Ch. 4 — The red herring.** KB, the obvious suspect, has been collecting
   evidence himself — his cousin was rusticated in a leak two years ago.
3. **Ch. 4 — The compromise.** Selasi's campaign took Crestline money through a
   front company, and she knew.
4. **Ch. 5 — The motive.** The leak was designed to make scholarship students
   look guilty, so Mr. Narh could suspend the Founders' Scholarship fund and
   transfer its land — the sports field — to the hostel deal.
5. **Ch. 5 — The leverage.** Dr. Sarpong covered up a smaller leak last year to
   protect the faculty's accreditation. Mr. Narh has been using it to keep her
   silent.
6. **Ch. 6 — The family tie.** KB's father's firm supplies Crestline. Bringing
   down the deal will hurt KB's own family — and he has to choose.

---

## 5. Major choices and consequences

Each major choice sets one or more **flags** and shifts relationships and
reputation. The table lists the defining options; dialogue can add nuance
without new branches.

| ID | When | Choice | Main consequences |
| --- | --- | --- | --- |
| C1 | M05 | **Open the leaked paper** / delete it / screenshot it for Esi / report it to Dr. Sarpong | Open: `bought_leaked_paper`, Integrity −20, easy midsem grade, risk of the Fall ending. Screenshot: `esi_source`, Esi +20. Report: `reported_leak`, Sarpong +15, Nii −15 |
| C2 | M06 | Vouch for Abiba publicly / privately / stay silent | Public: Abiba +30, Popularity −10, `vouched_abiba`. Silent: Abiba −30 |
| C3 | M07 | Name KB to Esi as the suspect / tell her you doubt it / say nothing | Naming KB: KB −40, Esi publishes too early, `kb_accused`. Doubting: unlocks KB's evidence in M08 |
| C4 | M08 | Campaign for Selasi / for KB / for neither | Sets `backed_selasi` or `backed_kb`; affects election result and who betrays in M13 |
| C5 | M10 | Expose Selasi's donation before the vote / after / never | Before: Selasi loses or wins narrowly, Selasi −40, Integrity +15. Never: `kept_selasi_secret` |
| C6 | M12 | Get the documents through Dr. Sarpong / KB's contacts / by sneaking into the Admin Block after hours | Sarpong: needs Sarpong ≥ 30. Sneaking: risk of being caught (`caught_admin`), Academic standing −15 |
| C7 | M13 | Forgive the betrayer / cut them off / use the betrayal as leverage | Shapes their testimony in M15 and the epilogue |
| C8 | M14 | Who testifies (choose up to three witnesses) | Each needs relationship ≥ 40 or a resolved secret |
| C9 | M15 | At the hearing: present all evidence / protect a friend by holding some back / accept Mr. Narh's offer (scholarship restored for Abiba, deal goes ahead, ₵ and a job for you) | Decides the ending (§6) |

### Who betrays the player (M13)

| Condition | Betrayer | Betrayal |
| --- | --- | --- |
| `backed_selasi` and not `kept_selasi_secret` | **Selasi** | Trades the player's evidence to Mr. Narh to save her presidency |
| `backed_kb` and `kb_accused` | **KB** | Publicly blames the player for the leak to protect his family |
| Otherwise | **Nii** | Tells Mr. Narh what the player knows in exchange for his debts being cleared |

Every betrayer can be redeemed in Chapter 6 if the player chooses to forgive
(C7) and their relationship is ≥ 20.

---

## 6. Endings

Decided at the end of M15, from flags, relationships and reputation. Each has
variants for which friends stood by the player.

| Ending | Conditions | Result |
| --- | --- | --- |
| **E1 — Truth Out Loud** (the whistle-blower) | All evidence presented (C9), at least two witnesses, Integrity ≥ 60 | Mr. Narh suspended, deal cancelled, field saved, Abiba cleared. Dr. Sarpong faces her own consequences. The player is respected, and a few people never forgive them. |
| **E2 — Comfortable Silence** (the insider) | Accepted Mr. Narh's offer (C9) | Money, a campus job, a smooth year two. The field is fenced off. Abiba keeps her scholarship but never speaks to the player again. |
| **E3 — Head Down** (the survivor) | Avoided most of the story; few major choices taken | Strong grades possible. Esi publishes a half-story; Mr. Narh is moved sideways; the deal stalls. Abiba loses her scholarship. |
| **E4 — Rusticated** (the fall) | `bought_leaked_paper` and never confessed, and the evidence surfaced | The player is suspended for a semester. The epilogue sets up a redemption path for a sequel or New Game+. |

**Partial outcomes** are possible: E1 with too few witnesses becomes a "pyrrhic"
variant where Mr. Narh survives but the deal dies.

---

## 7. Side stories (optional)

Unlocked by chapter, location or relationship. None is required to finish the
game; each can change an ending variant or a witness.

| ID | Title | Giver | Unlock | Summary and payoff |
| --- | --- | --- | --- | --- |
| S01 | Fixer | Nii | Ch. 2 | Help with phone repairs; earn ₵ and learn about the chat's mystery payer |
| S02 | Chop Money | Hajia Zainab | Ch. 2 | Work kitchen shifts or take a loan; the loan's interest becomes leverage later |
| S03 | Study Circle | Abiba | Ch. 1, Abiba ≥ 10 | Library study sessions; better grades and Abiba's trust |
| S04 | Block Rivalry | Yaw | Ch. 1 | Inter-block football; win or lose, Yaw's respect grows |
| S05 | Byline | Esi | Ch. 3 | Help Esi verify a story; teaches that sources can be wrong |
| S06 | The Lost ID Card | Uncle Bright | Any | Return a lost card around campus; small reputation reward |
| S07 | Programme thread | Lecturer for the player's programme | Ch. 2 | One exclusive story per programme. Engineering: help in Dr. Sarpong's lab and glimpse a locked exams cabinet. Computer Science: fix the hostel Wi-Fi and spot who uploads to the group chat. Business: audit a club's accounts and learn to follow money. Communication: cover a campus event for Esi. Architecture: measure the football field for a studio project and notice the survey pegs do not match any approved drainage plan |
| S08 | Lights Out | Hostel group chat | Ch. 4 | *Dumsor* during exams; organise a study session by solar lamps |

---

## 8. Main mission table

Prerequisites list the previous mission plus any extra requirement. ⏱ marks a
deadline; missing it follows the *Missed* outcome instead of failing.

| ID | Chapter | Title | Objective | Prerequisites | Outcomes |
| --- | --- | --- | --- | --- | --- |
| M00 | Opening | Arrival | Watch or skip the opening; create a character | New game | Character saved |
| M01 | 1 | Akwaaba | Gate → lodge → campus sign → Admin (ID) → hostel; meet Nii | M00 | `met_nii`, `has_student_id`; campus opens |
| M02 | 1 | First Lecture | Find your first lecture; meet Abiba in the Library; visit KB's welcome party | M01 | `met_abiba`, `met_kb`, `met_selasi`; S03, S04 unlocked |
| M03 | 2 | The Group Chat | Earn enough ₵ for the week; get added to "Past Questions 🔥"; spot the pegs on the field | M02 | `in_pq_chat`; S01, S02 unlocked |
| M04 | 2 | First Byline | Give Esi an interview; notice the unusual "drainage work" | M03 | `met_esi`; Esi +10 |
| M05 | 3 | Paper Trail ⏱ | The night before midsems, decide what to do with the file (C1) | M04, night before exam | C1 flags; Missed: treated as "delete" |
| M06 | 3 | The Accusation | Midsem results; scholarship students accused; respond (C2) | M05 | C2 flags; Abiba's status |
| M07 | 3 | Echo | Help Esi trace the leak; decide what to say about KB (C3) | M06 | C3 flags; KB revealed as a suspect |
| M08 | 4 | Campaign Trail | Choose a side in the SRC election (C4); learn KB's real reason if trusted | M07 | `backed_*`; KB evidence if `!kb_accused` |
| M09 | 4 | The Debate | Attend the courtyard debate; uncover Selasi's donation | M08 | `knows_selasi_donation` |
| M10 | 4 | Election Night ⏱ | Decide on Selasi's secret (C5); the vote | M09 | Election winner; C5 flags |
| M11 | 5 | Survey Pegs | Stand with Yaw against the surveyors; find the Crestline plan (Architecture students can read it on the spot) | M10 | `knows_deal`; Yaw +25 |
| M12 | 5 | Follow the Money | Get the scholarship-fund documents (C6) | M11 | `has_documents`; possible `caught_admin` |
| M13 | 5 | Betrayal | The betrayal (§5) lands; respond (C7) | M12 | Betrayer set; C7 flags |
| M14 | 6 | Witnesses | Persuade up to three witnesses (C8) | M13 | Witness list |
| M15 | 6 | The Hearing | Present your case at the Administration Block (C9) | M14 | **Ending decided** |
| M16 | 6 | Finals | Sit final exams; say goodbyes | M15 | Grades; epilogue |
| — | — | Epilogue | Watch the outcome play out on campus | M16 | Ending E1–E4 and variants |

---

## 9. Key flags

Kept short on purpose; dialogue may set extra local flags.

| Flag | Set in | Read by |
| --- | --- | --- |
| `met_nii`, `has_student_id` | M01 | M02 onwards |
| `in_pq_chat` | M03 | M05 |
| `bought_leaked_paper`, `reported_leak`, `esi_source` | M05 | M06, M07, M15, E4 |
| `vouched_abiba` | M06 | M14, endings |
| `kb_accused` | M07 | M08, M13 |
| `backed_selasi`, `backed_kb` | M08 | M10, M13 |
| `knows_selasi_donation`, `kept_selasi_secret` | M09, M10 | M13, M15 |
| `knows_deal`, `has_documents`, `caught_admin` | M11, M12 | M14, M15 |
| `betrayer_*`, `forgave_betrayer` | M13 | M14, epilogue |
