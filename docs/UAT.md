# Case Ledger — UAT Checklist

## Core flows

- [ ] Login as investigator (`investigator@rti-watch.local`)
- [ ] Dashboard shows stats, recent investigations, recent alerts
- [ ] Create investigation — verify reference ID is assigned
- [ ] Enter response document with "not answered" field
- [ ] Verify contradiction/financial alerts appear within 1s
- [ ] Review risk score breakdown
- [ ] Export evidence package HTML
- [ ] AI chat returns draft labelled for review
- [ ] **Lookup:** Investigation detail → External lookup → Preview → Authorize fetch (or paste JSON for MCA21) → Select rows → Commit → facts appear
- [ ] **i18n:** Layout language toggle → Malayalam labels → reload persists
- [ ] **Confirm contradiction** on investigation detail (no public publish)
- [ ] Sensitive investigation hidden from unauthorized user

## Forensic Lab

- [ ] **Evidence locker:** Upload PDF → processing badge → extraction completes (worker running)
- [ ] **Verify integrity:** SHA-256 re-check matches stored hash; custody event logged
- [ ] **Document examiner:** Open document → extracted text visible; add annotation (highlight + label)
- [ ] **Timeline:** Facts, documents, alerts, custody events appear; filters work
- [ ] **Network:** Persons on case appear as graph nodes with relationships
- [ ] **Analysis:** Score, financial facts by category, confirm contradiction
- [ ] **Report:** Preview HTML report; download ZIP contains `evidence-report.html` and `files/`
- [ ] **Report PDF:** Download PDF (`report.pdf`) with Chromium/`PUPPETEER_EXECUTABLE_PATH` on worker
- [ ] **Export profiles:** full / redacted / publishable change report content (no diary in publishable)
- [ ] **Search:** Document full-text hits appear in global search
- [ ] **Bates:** New committed document receives exhibit number

## Multi-persona (police / journalist)

- [ ] Create **criminal** investigation with FIR/station fields
- [ ] **Diary** tab: add patrol/interview entry; privileged entries omitted from publishable export
- [ ] **CDR import:** Upload CSV from Analysis tab → facts and network refresh
- [ ] **Cross-case badge:** Person in 2+ cases shows badge on Persons tab
- [ ] **Map:** Diary entry with lat/lng links to OpenStreetMap
- [ ] **Source vault** (journalist login): codename stored; reveal audited
- [ ] **Story board:** hypothesis item + publication checklist
- [ ] **Workspace mode:** Settings → Accountability / Criminal / Newsroom saved via API
- [ ] **UFED stub:** `POST .../imports/ufed-manifest` returns stub message

## Performance

- [ ] List 100 investigations < 1s
- [ ] Rule pipeline after document commit < 1s

## Sign-off

- Investigation lead: _______________
- Legal counsel: _______________
