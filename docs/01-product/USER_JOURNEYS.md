# Go Darom — User Journeys

**Status:** DRAFT. These journeys summarize approved behavior, not final screen wireframes or complete LLD state machines.

## J-01: Public visitor becomes a member
1. Visitor opens Hebrew RTL homepage and explores announcements, learning materials, puzzle or event without login.
2. Visitor tries to send DM, invite a player or enter community chat.
3. System requests Google-only Clerk sign-in, preserving original intent.
4. On first login only, visitor confirms/edits nickname and avatar.
5. System resumes originally requested action **if still available**; otherwise explains why and provides next step.
6. Member can now search directory, see online status, chat and play.

## J-02: Live invitation and match
1. Member opens another user's card → invite to Live game.
2. Setup defaults: 9×9, no clock, random colors, normal komi 6.5; can select 13/19, 15-minute clock, colors, handicap with default komi 0.5 or manually edit komi.
3. Invitee sees settings plus bell notification and online toast.
4. Invite accepted only while valid (<5m), inviter reachable under agreed presence policy, neither player blocked or already in a conflicting Live game.
5. Atomic server acceptance creates game; conflicting outstanding invitations close.
6. Both players see conventional board room; server validates each move, synchronizes and persists. Leaving room doesn't end game; persistent return-to-game control.
7. Two passes → mark dead stones/approve score, dispute → resume; alternatives include resign or proposed mutual no-winner ending.
8. Completed game appears in both players' private Replay history.

**Exceptions:** explicit logout, reconnect grace, late accept, duplicate accept, same user in multiple tabs, 48h idle, timing out with selected clock, server restart.

## J-03: Async correspondence game
1. Member invites another member; choose board/settings and per-turn deadline: none/24h/3d/7d.
2. Invite is persistent regardless of inviter online status but expires after 3 days.
3. Recipient accepts. Multiple async games may be active per user.
4. At each move server validates, persists, switches turn and starts a fresh selected per-turn deadline.
5. Recipient gets persisted turn notification, toast if online; game appears in 'your turn' list.
6. Selected deadline elapses without valid move → timeout loss; without deadline no timeout loss.

**Exceptions:** simultaneous accepted commands, invite expires while opening, reconnect, timer adjudication race.

## J-04: Shared Study Board
1. Member creates personal board; places/removes stones and saves it.
2. Member invites a specific community member to collaborate; up to two participants total.
3. Both may freely edit; operations ordered by server and reflected live on both screens.
4. Undo always reverses last globally committed operation regardless of actor.
5. Participant navigates away/disconnects; remaining member continues, and both may return to saved board.
6. Non-creator can remove board from personal list; creator can delete for everyone.
7. Creator account deletion transfers board ownership to remaining member.

**Exceptions:** conflicting simultaneous edits, undo race, permission after hide/remove, invitation expired/blocked (some details open).

## J-05: Guest event registration
1. Public visitor opens event; registration available if capacity allows.
2. Visitor enters name/email; phone and Go experience optional.
3. For limited event, system atomically reserves seat for 15m; guest receives verification email through Brevo.
4. Guest follows link within valid reservation; registration becomes confirmed; receives confirmation and personal cancellation link.
5. Invalid/expired verification produces clear message; seat becomes available and guest can retry if room remains.
6. Admin edits or cancels event; registered participants receive material-change/cancellation messages.
7. Guest cancels securely through personal token.

**Exceptions:** duplicate email, token replay, sold-out event, cancellation while pending, Brevo temporary failure, two simultaneous last-seat reservations.

## J-06: Member event registration
1. Logged-in member opens event → one-click registration.
2. System validates capacity, saves registration and sends confirmation via Brevo.
3. Member sees event in personal area and can cancel there.

## J-07: Solve weekly puzzle
1. Public visitor opens homepage's weekly puzzle or puzzle library.
2. Visitor sees starting position and player to move; plays move via interactive board.
3. System follows valid solution branches including opponent response; gives clear retry feedback for incorrect moves, optionally a hint.
4. Visitor may read optional explanation; no personal completion record.
5. Admin chooses featured puzzle manually and edits puzzle via board or SGF import.

## J-08: Admin publishes community content
1. Admin opens guarded `/admin`, creates announcement or guide using shared Tiptap editing UI.
2. Adds image, guides may include interactive board example, content enters Draft.
3. Admin reviews and publishes; public visitor sees it in appropriate section.
4. Admin can update/remove; privileged actions are logged where required.

## J-09: Block and report
1. Member blocks another member. System rejects new DM and invitations between those members, without hiding community-chat history or terminating already active games.
2. Member reports a public message or DM.
3. Admin sees report; for private DM, only reported message plus fixed bounded nearby context; audit read.
4. Admin dismisses, removes public message or suspends account according to policy.

## J-10: Delete account and preserve shared history
1. Member requests account deletion through protected workflow.
2. System resolves live/async participation, pending events/invites and member identity according to approved privacy lifecycle.
3. Identity and personal profile data are removed; retained shared content anonymized.
4. Member's personal Study Boards deleted; shared board transferred to surviving partner.
5. Completed games retained for participants with deleted member anonymized as appropriate.

**Open:** exact policies for active async participation, DM deletion, shared media, backups and exports. These require privacy lifecycle specifications before release.
