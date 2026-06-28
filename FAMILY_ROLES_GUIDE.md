# 👨‍👩‍👧‍👦 Fable Family Roles & Invitation Flow

## Account Types (3 Roles)

| Role | Can Sign Up Directly? | How They Join | Can Invite Others? | Can Record Stories? |
|------|:---:|:---:|:---:|:---:|
| **Parent** | ✅ Yes | `/auth/signup` | ✅ Yes | No |
| **Learner (Kid)** | ❌ No | Invitation code | ❌ No | No |
| **Author** | ❌ No | Invitation code | ❌ No | ✅ Yes |

## The Invitation Workflow

### Step 1️⃣: Parent Signs Up
- Parent creates account at **`/auth/signup`**
- Enters: name, household name, email, password
- **Result**: Parent account created + household created

### Step 2️⃣: Parent Generates Invitation Codes
**Parents go to `/parent/family` to invite family members**

1. Sign in as parent
2. Scroll to **"Invite a New Family Member"** section
3. Select account type:
   - 📚 **Learner** - Read family stories
   - ✍️ **Author** - Record and write family stories
4. (Optional) Add name hint: "Sarah's friend" or "Grandpa Mike"
5. Click **"GENERATE INVITATION CODE"**
6. 📋 Copy the code: e.g., `ABC123DEF456`
7. 📤 Share code with family member

### Step 3️⃣: Learner/Author Uses Invitation Code
**Family member goes to `/auth/onboard`**

1. Enter the invitation code
2. System validates code:
   - ✅ Code exists
   - ✅ Code not expired (30-day limit)
   - ✅ Code not already used
3. Fill in signup form:
   - Name
   - Email
   - Password
   - System shows: "Invited by: [Parent Name]"
4. Create account
5. ➡️ Redirects to **`/auth/signin`**

### Step 4️⃣: Sign In & Dashboard Access
**Anyone can sign in at `/auth/signin`**

1. Email + password
2. ➡️ Redirects to **`/dashboard`**
3. View/explore family stories based on role

## URLs at a Glance

### For Parents
- **Signup**: `/auth/signup` ← Parents create account here
- **Family Management**: `/parent/family` ← Parents invite family members here
- **Dashboard**: `/dashboard` ← View family stories

### For Learners & Authors
- **Join**: `/auth/onboard` ← Learners/Authors enter invitation code here
- **Signin**: `/auth/signin` ← Everyone signs in here
- **Dashboard**: `/dashboard` ← View family stories

## Key Features

✅ **No self-signup for kids/authors** - Parental control built in
✅ **Codes expire** - Invitations valid for 30 days only
✅ **One-time use** - Each code can only be used once
✅ **Role differentiation** - Authors can record stories, learners only read
✅ **Secure** - Database policies enforce access control
✅ **Easy sharing** - Copy-to-clipboard for invitation codes

## Example Family Setup

```
Household: "Smith Family"

Parents:
- Alice (alice@example.com) - Creates household, manages family
- Bob (bob@example.com) - Invited by Alice

Learners:
- Sarah (sarah@example.com) - Invited as Learner
- Tommy (tommy@example.com) - Invited as Learner

Authors:
- Grandpa Mike (mike@example.com) - Invited as Author (records stories)
- Aunt Jane (jane@example.com) - Invited as Author (records stories)
```

Alice (parent) invited:
- Bob → Parent account (separate signup still needed for parents)
- Sarah, Tommy → Learner accounts (via invitation codes)
- Grandpa Mike, Aunt Jane → Author accounts (via invitation codes)

## What Each Role Can Do

### Parents
- ✅ Create household
- ✅ Generate invitation codes
- ✅ View all family members
- ✅ See pending invitations
- ✅ View family stories
- ✅ Manage household

### Learners (Kids)
- ✅ View family stories
- ✅ Explore stories
- ✅ Answer gateway questions
- ❌ Cannot record stories
- ❌ Cannot invite others

### Authors
- ✅ View family stories
- ✅ Explore stories
- ✅ **Record new stories**
- ✅ **Edit stories**
- ✅ **Answer gateway questions**
- ❌ Cannot invite others
- ❌ Cannot generate invitation codes

---

**Need help?** Check `/parent/family` - the Family Dashboard shows:
- All household members with their roles
- All pending invitation codes
- Easy copy-to-clipboard for sharing codes
