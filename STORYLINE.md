# Storyline — Campus Life: The Journey

> *Your campus. Your choices. Your story.*

The main story, its structure, choices and endings. Characters are defined in
[CHARACTER_BIBLE.md](CHARACTER_BIBLE.md); the systems the story relies on
(dialogue, flags, relationships, reputation, time) are specified in
[GAME_DESIGN.md](GAME_DESIGN.md).

**Status:** design only. No mission, dialogue or story system exists in the
game yet. This document fixes the narrative structure; dialogue is written
later, mission by mission.

**Fiction notice:** UCIS University (*Until Christ is Seen*), Crestline
Developments, the Founders' Scholarship and every person in the story are
invented. No real university, church, company or individual is portrayed, or
implied to be involved in any scandal. The story's wrongdoing belongs to
individuals who betray the university's ideals; it never mocks or blames the
faith the university was founded on.

---

## 1. Premise

An **ordinary first-year student** arrives at UCIS University for one academic
year. On the first night, a phone buzzes under a loose floor tile in their
hostel room. It belongs to **Kojo Badu**, the student who lived in A-214 two
years ago and was rusticated over an exam leak he says he did not commit.
Weeks later it lights up with a message from a number nobody recognises:
*"They're doing it again."*

That **personal mystery** — who Kojo was, what really happened to him, and
who is still texting a dead student's phone —
pulls the player, step by step, into a **larger campus controversy**: a new
midsemester leak, blamed on the university's scholarship students, that covers
a plan to quietly sell the sports field to a private hostel developer. The
people the player befriends are each more tangled up in it than they admit.

**Protagonist arc (confirmed direction):** ordinary student → personal mystery
→ campus-wide controversy. The player has no special lineage or destiny; they
are drawn in because of where they sleep, what they find and what they choose
to do about it. The mystery comes from the room, not the player's family, so it
works for every character-creation choice.

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
new character art is required for a first version. **Built** (about 45
seconds; shots in `src/story/data/opening.ts`). Not yet in it: students with
suitcases, cars at the barrier, and visible pegs on the field — the caption
carries the pegs for now.

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
| 2 | Read the **AKWAABA** campus sign | Interaction |
| 3 | Cross the courtyard; check the **signpost** | Signs, free choice of route |
| 4 | Find the **Administration Block** and collect your student ID from **Mrs. Agyeman**, the registry clerk | Map and minimap |
| 5 | Find **Nii** at the Hastech Hostels Block A gateway | Story NPC dialogue |
| 6 | Nii adds you to the Block A group chat; read it on your phone | The phone |
| 7 | Go up to room **A-214** and sleep | Ending a day |

The signpost comes before the Administration Block so the route never doubles
back across the courtyard. Steps done early still count: reading the sign
before signing in ticks step 2 off as soon as step 1 is done.

**Outcome:** the campus opens fully. Day 1 ends at sleep — and something
buzzes under the floor. Flags: `signed_in`, `has_student_id`, `met_nii`,
`joined_group_chat`, `read_group_chat`, `slept_day_1`, `m01_complete`.

**Built.** Conversations are in `src/story/data/dialogue/` and the steps in
`src/story/data/missions.ts`. Mrs. Agyeman pauses over the room number
("A-214… Hm. Nothing."), and Nii warns that a floor tile by the bed is loose —
small hooks for M03. Step 7 happens in the real room: the player climbs the
Block A stairs to the second floor, walks into A-214 and sleeps in the bed;
the night is still told on a story card, and the player wakes beside the bed.

### M02 — Kojo's Missing Phone

The first time the player meets Kojo Badu, the student who had A-214 before
them. **Day 2.** Teaches searching a place, asking around and making choices
that people remember. Uses the Block A second floor and the Porter's Lodge.

| Step | Objective | Where |
| --- | --- | --- |
| 1 | Read **Uncle Bright's** message: a young man at the gate is asking for "whoever is in A-214" | Phone |
| 2 | Meet **Kojo** on the road outside the main gate. He cannot come in. His old phone never came back when his things were boxed up | Main gate |
| 3 | Search **A-214**. In the wardrobe, behind the shelf paper: an old charger, KOJO on the tape | Block A, A-214 |
| 4 | Find out where lost things end up: **Nii** in the common room, or the common-room notice board | Block A, common room |
| 5 | Ask **Uncle Bright** about lost property | Porter's Lodge |
| 6 | Check the lost-property cabinet: a black Tecno with a Black Stars sticker, tagged *"A-214. Room clearance. Received from: Registry, Administration Block. UNCLAIMED."* | Porter's Lodge |
| 7 | Take the phone back to Kojo | Main gate |

**Choices and what they change.** Kojo starts at −20 (wary).

| Moment | Options | Effect |
| --- | --- | --- |
| Meeting Kojo | Offer help / ask why he waits outside / ask how you know he's who he says | Kojo +10 / 0 / +5 |
| His request | "I'll look for it" / "What's in it for me?" | Kojo +5 / −10 |
| Uncle Bright | Tell the truth / say the phone is yours / show Kojo's charger (only if found) | Bright +5, Integrity +2 / Bright −5, Integrity −5, and Kojo hears of it later / Bright +3 |
| Nii, if visited with the phone | Let him charge it and look / keep it sealed for Kojo | Nii +5, Kojo notices it was switched on / Integrity +5, Nii −2 |
| Returning it | Promise to keep anything else of his safe / ask why he really left / say goodbye | Kojo +10 / −5 / +5 |

Returning the phone adds +15 (+5 if it has been switched on). If Kojo ends
at **10 or more** he gives the player his number (`kojo_number`) and a
"Kojo" thread appears on the phone; otherwise he does not. A kind route ends
around +20, a hard one around −25. Missing the charger or Nii is fine: the
notice board also points to the lodge, and Bright opens the cabinet either way.

**The clues, kept small.** The tag says the Registry had the phone for two
years and never called Kojo. Two years back in the porter's sign-in book, a
page is torn out. If the player offers, Kojo says: *"If you ever find anything
of mine — anything — don't take it to Admin. Keep it, and tell me."* The loose
tile still will not lift, and last night's buzzing was not this phone. The
floor phone, the unknown sender and why Kojo left all stay for later missions.

**Outcome:** the phone is back with its owner; a completion card shows how
Kojo, Uncle Bright and Nii now feel; free roam. Flags: `read_bright_message`,
`m02_met_kojo`, `found_charger`, `knows_lost_property`, `bright_opened_drawer`,
`has_kojo_handset`, `returned_kojo_phone`, `m02_complete`, plus
`told_bright_truth` / `lied_to_bright`, `phone_opened` / `phone_kept_sealed`,
`kojo_offer`, `asked_why_kojo_left`, `kojo_number`, `noticed_loose_tile`,
`noticed_torn_page`.

**Continuity.** Kojo is rusticated and cannot pass the gate, so the meeting is
outside it, in daylight, and short: he tells the player nothing about why he
left. S09 (below) is still the conversation where he tells his story, and it
still depends on choices — now including the trust earned or lost in M02.

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

**1 · Freshers' Week.** M01; then M02, when the player meets Kojo at the gate
and gets his old phone back from the Porter's Lodge; then the first lecture. The player finds Kojo's
phone under the floor of A-214; Nii gets it charging. The player meets Abiba in
the Library, Selasi recruiting volunteers in the courtyard, and KB throwing a
welcome party at the Student Centre. Yaw's Block B mocks Block A's freshers.

**2 · The Grind.** Money runs short; Hajia Zainab offers work or a loan. Nii's
"Past Questions 🔥" chat becomes everyone's lifeline. Esi interviews the
player for a "freshers' first month" piece and leaves a card. Kojo's phone
receives its first message in two years, from an unknown number: *"They're
doing it again."* The player decides whether to answer (C0). Surveyors'
pegs appear on the football field; Yaw is told it is "drainage work".

**3 · The Leak.** The night before midsems, a file in Nii's chat is the real
paper. The player's choice here (M06) is the game's first major decision.
After the exam, scholarship students — Abiba first — are accused, and because
the chat is run from A-214 the player is questioned too. The leak follows the
same pattern Kojo described. Esi starts digging; KB, loud and well connected,
looks guilty.

**4 · Campaign Season.** KB and Selasi run for SRC president. Both want the
player. The debate at the courtyard turns on the leak. Election night ends with
a result shaped by the player's campaigning and what has been revealed.

**5 · The Field.** The surveyors return in daylight. Yaw rallies the teams.
Following the money leads to the Administration Block and Mr. Narh. The
**betrayal** lands: the player's closest ally sells them out, and which ally
depends on earlier choices (M14).

**6 · The Hearing.** A disciplinary hearing at the Administration Block decides
Abiba's scholarship, the leak and — through what is revealed — the field. The
player must gather witnesses and evidence, then sit their own final exams.

---

## 4. Plot twists (reveal order)

1. **Ch. 3 — The channel.** The leak spread through Nii's chat. He knew by the
   night of the exam and kept quiet.
2. **Ch. 4 — The red herring.** KB, the obvious suspect, has been collecting
   evidence himself. His cousin is **Kojo Badu** — and if KB sees the phone, he
   recognises it. The personal mystery and the campus scandal are the same
   story.
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

### The Kojo mystery (writers only)

Owner decision: Kojo's leak stays **two years ago**, and its truth stays
**mysterious** — most playthroughs end without every answer.

- **The unknown sender.** The number never picks up calls. If the player
  reaches Kojo, he swears he did not send the messages — he hid the phone under
  the tile the night his room was searched and never got it back. The sender
  is **Dr. Sarpong**: she knew Kojo had been wronged, and texted the one number
  she had when she saw the pattern starting again. She did not know who held
  the phone. This is revealed **only if she testifies** (picked as a witness at M15); otherwise the
  sender is never named, and the epilogue ends with one last message from the
  same number: *"Thank you."*
- **The first leak.** The paper Kojo was blamed for was a printing-room copy
  that was never issued to students, so it came from inside. The evidence
  points to Mr. Narh trying the scapegoat method for the first time, but this
  is **confirmed only in E1 when both Kojo (`met_kojo`) and Dr. Sarpong
  testify**. In every other ending it stays an open question.

---

## 5. Major choices and consequences

Each major choice sets one or more **flags** and shifts relationships and
reputation. The table lists the defining options; dialogue can add nuance
without new branches.

| ID | When | Choice | Main consequences |
| --- | --- | --- | --- |
| C0 | M05 | **Answer the unknown number** / hand the phone in to Uncle Bright / ignore it | Answer: `answered_phone`; the sender replies with Kojo's new number and nothing else (or, if the player already has it from M02, `kojo_number`: *"Ask Kojo what really happened."*). Kojo's account and old evidence arrive over Chapters 2–4, and S09 opens. Hand in: `phone_handed_in`; the phone reaches the Administration Block — Mr. Narh learns someone found it, and the player becomes a quiet target. Ignore: messages keep arriving; the player can answer any time before M09 |
| C1 | M06 | **Open the leaked paper** / delete it / screenshot it for Esi / report it to Dr. Sarpong | Open: `bought_leaked_paper`, Integrity −20, easy midsem grade, risk of the Fall ending. Screenshot: `esi_source`, Esi +20. Report: `reported_leak`, Sarpong +15, Nii −15 |
| C2 | M07 | Vouch for Abiba publicly / privately / stay silent | Public: Abiba +30, Popularity −10, `vouched_abiba`. Silent: Abiba −30 |
| C3 | M08 | Name KB to Esi as the suspect / tell her you doubt it / say nothing | Naming KB: KB −40, Esi publishes too early, `kb_accused`. Doubting: unlocks KB's evidence in M09 |
| C4 | M09 | Campaign for Selasi / for KB / for neither | Sets `backed_selasi` or `backed_kb`; affects election result and who betrays in M14 |
| C5 | M11 | Expose Selasi's donation before the vote / after / never | Before: Selasi loses or wins narrowly, Selasi −40, Integrity +15. Never: `kept_selasi_secret` |
| C6 | M13 | Get the documents through Dr. Sarpong / KB's contacts / by sneaking into the Admin Block after hours | Sarpong: needs Sarpong ≥ 30. Sneaking: risk of being caught (`caught_admin`), Academic standing −15 |
| C7 | M14 | Forgive the betrayer / cut them off / use the betrayal as leverage | Shapes their testimony in M16 and the epilogue |
| C8 | M15 | Who testifies (choose up to three witnesses) | Each needs relationship ≥ 40 or a resolved secret |
| C9 | M16 | At the hearing: present all evidence / protect a friend by holding some back / accept Mr. Narh's offer (scholarship restored for Abiba, deal goes ahead, ₵ and a job for you) | Decides the ending (§6) |

### Who betrays the player (M14)

| Condition | Betrayer | Betrayal |
| --- | --- | --- |
| `backed_selasi` and not `kept_selasi_secret` | **Selasi** | Trades the player's evidence to Mr. Narh to save her presidency |
| `backed_kb` and `kb_accused` | **KB** | Publicly blames the player for the leak to protect his family |
| Otherwise | **Nii** | Tells Mr. Narh what the player knows in exchange for his debts being cleared |

Every betrayer can be redeemed in Chapter 6 if the player chooses to forgive
(C7) and their relationship is ≥ 20.

---

## 6. Endings

Decided at the end of M16, from flags, relationships and reputation. Each has
variants for which friends stood by the player.

| Ending | Conditions | Result |
| --- | --- | --- |
| **E1 — Truth Out Loud** (the whistle-blower) | All evidence presented (C9), at least two witnesses, Integrity ≥ 60 | Mr. Narh suspended, deal cancelled, field saved, Abiba cleared. Dr. Sarpong faces her own consequences. The player is respected, and a few people never forgive them. |
| **E2 — Comfortable Silence** (the insider) | Accepted Mr. Narh's offer (C9) | Money, a campus job, a smooth year two. The field is fenced off. Abiba keeps her scholarship but never speaks to the player again. |
| **E3 — Head Down** (the survivor) | Avoided most of the story; few major choices taken | Strong grades possible. Esi publishes a half-story; Mr. Narh is moved sideways; the deal stalls. Abiba loses her scholarship. |
| **E4 — Rusticated** (the fall) | `bought_leaked_paper` and never confessed, and the evidence surfaced | The player is suspended for a semester. The epilogue sets up a redemption path for a sequel or New Game+. |

**Partial outcomes** are possible: E1 with too few witnesses becomes a "pyrrhic"
variant where Mr. Narh survives but the deal dies.

**The personal thread resolves separately.** In any ending except E2, if
`answered_phone` and Kojo's evidence reached the hearing or Esi, Kojo's
rustication is reopened; if he also testified in person (`met_kojo`), he is
reinstated. So even E3 can end with the player's personal mystery solved while
the public scandal is not. Who leaked the paper two years ago is confirmed only
as described in §4, *The Kojo mystery*. In E2 the player hands Kojo's
phone to Mr. Narh as part of the deal.

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
| S09 | Outside the Fence | Kojo (by message) | Ch. 3, `answered_phone` | The second meeting (the first is M02's, brief and about the phone). Kojo's own account — including that he *did* buy past questions once, just not the paper he was blamed for. Whether the player meets him depends on earlier choices (below) |

**S09 outcomes.** Meeting Kojo is earned, not guaranteed:

| Route | Needs | Result |
| --- | --- | --- |
| In person | `answered_phone`; Kojo ≥ 30 (built from M02 onwards: kept his phone sealed, kept his secrets, never shared his number); the player goes to the gate after dark, where Uncle Bright remembers him | `met_kojo`. Kojo hands over his original evidence and can testify at M16 as a witness |
| Messages only | `answered_phone`, but Kojo < 30, or the player misses the meeting or is turned back at the gate | Kojo sends a written statement: evidence, but not a witness |
| Never | `phone_handed_in`, or the messages were never answered by M09 | No contact. KB can still tell Kojo's story second-hand at M09 (`kojo_identified`), but Kojo's case is not reopened |

---

## 8. Main mission table

Prerequisites list the previous mission plus any extra requirement. ⏱ marks a
deadline; missing it follows the *Missed* outcome instead of failing.

| ID | Chapter | Title | Objective | Prerequisites | Outcomes |
| --- | --- | --- | --- | --- | --- |
| M00 | Opening | Arrival | Watch or skip the opening; create a character | New game | Character saved |
| M01 | 1 | Akwaaba | Gate → lodge → campus sign → Admin (ID) → hostel; meet Nii | M00 | `met_nii`, `has_student_id`; campus opens |
| M02 | 1 | Kojo's Missing Phone | Meet Kojo outside the gate; search A-214; ask Nii; get his old phone from the Porter's Lodge lost property; return it (see §2) | M01 | `returned_kojo_phone`; Kojo's trust; `kojo_number` if trust ≥ 10 |
| M03 | 1 | First Lecture | Find the buzzing phone under A-214's floor and get it charged; find your first lecture; meet Abiba in the Library; visit KB's welcome party | M02 | `found_kojo_phone`, `met_abiba`, `met_kb`, `met_selasi`; S03, S04 unlocked |
| M04 | 2 | The Group Chat | Earn enough ₵ for the week; get added to "Past Questions 🔥"; spot the pegs on the field | M03 | `in_pq_chat`; S01, S02 unlocked |
| M05 | 2 | First Byline | Give Esi an interview; notice the unusual "drainage work"; Kojo's phone receives *"They're doing it again"* from an unknown number (C0) | M04 | `met_esi`; Esi +10; C0 flags |
| M06 | 3 | Paper Trail ⏱ | The night before midsems, decide what to do with the file (C1) | M05, night before exam | C1 flags; Missed: treated as "delete" |
| M07 | 3 | The Accusation | Midsem results; scholarship students accused; respond (C2) | M06 | C2 flags; Abiba's status |
| M08 | 3 | Echo | Help Esi trace the leak; decide what to say about KB (C3) | M07 | C3 flags; KB revealed as a suspect |
| M09 | 4 | Campaign Trail | Choose a side in the SRC election (C4); learn KB's real reason if trusted — he recognises Kojo's phone | M08 | `backed_*`; `kojo_identified`; KB evidence if `!kb_accused` |
| M10 | 4 | The Debate | Attend the courtyard debate; uncover Selasi's donation | M09 | `knows_selasi_donation` |
| M11 | 4 | Election Night ⏱ | Decide on Selasi's secret (C5); the vote | M10 | Election winner; C5 flags |
| M12 | 5 | Survey Pegs | Stand with Yaw against the surveyors; find the Crestline plan (Architecture students can read it on the spot) | M11 | `knows_deal`; Yaw +25 |
| M13 | 5 | Follow the Money | Get the scholarship-fund documents (C6) | M12 | `has_documents`; possible `caught_admin` |
| M14 | 5 | Betrayal | The betrayal (§5) lands; respond (C7) | M13 | Betrayer set; C7 flags |
| M15 | 6 | Witnesses | Persuade up to three witnesses (C8) | M14 | Witness list |
| M16 | 6 | The Hearing | Present your case at the Administration Block (C9) | M15 | **Ending decided** |
| M17 | 6 | Finals | Sit final exams; say goodbyes | M16 | Grades; epilogue |
| — | — | Epilogue | Watch the outcome play out on campus | M17 | Ending E1–E4 and variants |

---

## 9. Key flags

Kept short on purpose; dialogue may set extra local flags.

| Flag | Set in | Read by |
| --- | --- | --- |
| `signed_in`, `has_student_id`, `met_nii`, `joined_group_chat`, `read_group_chat`, `slept_day_1` | M01 | M02 onwards |
| `m02_met_kojo`, `found_charger`, `knows_lost_property`, `has_kojo_handset`, `returned_kojo_phone` | M02 | M02 steps |
| `kojo_number`, `kojo_offer`, `phone_opened`, `lied_to_bright` | M02 | M05 (C0), S09, Kojo's and Uncle Bright's later lines |
| `seen:<interactable id>` | Reading any sign or plaque | Mission steps that ask the player to read something |
| `met:<cast id>` | First conversation with someone | The phone's "People" list |
| `found_kojo_phone` | M03 | M05, S09 |
| `answered_phone`, `phone_handed_in` | M05 (C0) | S09, M09, M16, endings |
| `met_kojo` | S09 | M16, endings, epilogue |
| `kojo_identified` | M09 | M13, M15 |
| `in_pq_chat` | M04 | M06 |
| `bought_leaked_paper`, `reported_leak`, `esi_source` | M06 | M07, M08, M16, E4 |
| `vouched_abiba` | M07 | M15, endings |
| `kb_accused` | M08 | M09, M14 |
| `backed_selasi`, `backed_kb` | M09 | M11, M14 |
| `knows_selasi_donation`, `kept_selasi_secret` | M10, M11 | M14, M16 |
| `knows_deal`, `has_documents`, `caught_admin` | M12, M13 | M15, M16 |
| `betrayer_*`, `forgave_betrayer` | M14 | M15, epilogue |
