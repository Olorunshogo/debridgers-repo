# TASKS &amp; JOTTINGS

- Do I know anybody that'll handle aggressive marketing?
- Do I know anybody that'll handle aggressive sales?
- **Call Yaga for Niger farmer&apos;s connect**
- **Call Yeyedu also for Niger farmer&apos;s connect**

- Praise, Email Marketing
- Selling bag of Beans

## Core Values

- Think about core values for the following roles:
  - **investors**
  - **agents**
  - **logistics**
  - **farmers**
  - **employees**

## Agents Onboarding System

1. 🎯 Objective
   Create a controlled onboarding system where:
   Agents can register accounts
   Accounts are reviewed by admin
   Only approved agents gain access (login later)

2. 🧩 System Overview
   Registration → Pending → Admin Review → Approved → (Future: Login Access)

3. 👤 Agent Registration (Frontend)

Endpoint:
POST /api/register-agent

Request Payload:

```json
{
  "firstName": "Amina",
  "lastName": "Yusuf",
  "email": "amina@gmail.com",
  "phone": "08012345678",
  "lga": "Kaduna North",
  "address": "12 Barnawa Road, Kaduna",
  "password": "securepassword"
}
```

Agent Modal 10. 📩 User Feedback (Frontend UX)
After Registration:
Display:
“Your application has been received and is under review. You will be notified once approved.”
