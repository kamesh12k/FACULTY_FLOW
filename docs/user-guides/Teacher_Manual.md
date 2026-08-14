# FAFLOW — Academic Teacher User Manual

This manual provides instructions for Academic Faculty using the FAFLOW portal.

---

## 1. Portal Overview & Login

1. Open **`http://localhost:5173/login`** in your browser.
2. Enter your institutional email/username and password.
3. If this is your initial login, you will be prompted to set a permanent password and profile details.
4. Upon authentication, you are directed to the **Teacher Workspace Dashboard** (`/teacher/dashboard`).

---

## 2. Timetable Management

### Personal Schedule (`/teacher/timetable`)
- View your allocated teaching schedule organized by **Day Order (1 through 6)** and **Periods (1 through 5)**.
- Each schedule slot displays the Course Code, Course Title, Room/Lab Location, and Class Section.
- **Timetable Verification & Requests**: Teachers can submit proposed schedule modifications to their Head of Department for review.

### Classwise Timetable (`/teacher/class-timetable`)
- Access institution-wide and department class schedules.
- Select any Class Section from the dropdown filter to view its full weekly timetable matrix.
- Identify teacher allocations, room usage, and free periods across sections.

> [!NOTE]
> Academic Teachers have access to the Classwise Timetable for inter-faculty collaboration and lecture planning. General faculty cannot modify master class allocations.

---

## 3. Leave Application & History

### Applying for Leave (`/teacher/leave/apply`)
1. Select the leave date from the active Academic Calendar.
2. Select whether the leave is **Full Day** or **Specific Period(s)**.
3. Select the Leave Category:
   - *Casual Leave (CL)*
   - *Medical Leave (ML)*
   - *On-Duty (OD)*
   - *Compensatory Off (Comp-Off)*
4. Provide the operational reason and submit the request.
5. The request enters `Pending` status and routes to your HOD for approval.

### Tracking Leave Status (`/teacher/leaves`)
- View real-time status across **Pending**, **Approved**, **Rejected**, and **Cancelled** requests.
- **Cancellation**: Approved leaves on future dates can be cancelled by the teacher before 10:00 AM on the day of the leave. Cancellation automatically reimburses any deducted credits and reverses substitute allocations.

---

## 4. Substitution Management & Coverage

### Today's Substitution Coverage (`/teacher/today-coverage`)
- View real-time substitution coverage across your department for the current day.
- Displays slots requiring coverage, assigned substitute teachers, and emergency coverage flags.

### Substitute Management Hub (`/teacher/substitution`)
- Accept or volunteer for open substitution requests.
- View classes where colleagues are covering your scheduled periods.
- Track substitution efficiency ratings and attendance confirmations.

---

## 5. Faculty Substitution Credits & Rewards Ledger (`/teacher/credits`)

FAFLOW operates an automated workload credit ledger:

### How Credits Work
- **Covering a Class**: Awards **`+1.0 Credit`** to your balance.
- **Taking a Leave**: Deducts **`−1.0 Credit`** per teaching period.
- **College Holidays**: **`0 Credit`** change (Holidays never cost or award credits).

### Recognition Tiers
- 💎 **Diamond Contributor** (`Balance ≥ 15`): Top-priority leave approval & commendation.
- 🥇 **Gold Contributor** (`Balance ≥ 8`): Fast-track leave requests & schedule flexibility.
- 🥈 **Silver Contributor** (`Balance ≥ 2`): Balanced workload & standard priority.
- 🛡️ **Standard Standing** (`Balance ≥ 0`): Neutral baseline balance.
- ⚠️ **Action Recommended** (`Balance < 0`): Deficit; volunteering for substitutions recommended.

### Ledger Audit Trail
- Filter transactions by *All*, *Earned (+)*, *Leaves Deducted (−)*, or *Adjustments*.
- Search transaction reasons and view the chronological **Running Balance** after every event.
