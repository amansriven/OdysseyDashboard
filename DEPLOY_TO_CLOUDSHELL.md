# Deploy Updated Code to Cloud Shell

## Quick Deploy (Copy-Paste in Cloud Shell)

```bash
cd ~/OdysseyDashboard
git pull origin main

# Or if you have local changes:
git stash
git pull origin main
git stash pop

# Restart API server
lsof -ti:5000 | xargs kill -9
python3 -m odyssey.api_server
```

## What Changed

### 1. Fixed Error
- Removed `update_session()` call (doesn't exist in ADK)
- Now passes `state` during `create_session()` instead

### 2. Better UX: Name + DOB Instead of Member ID
- **Old:** Caller Name + Member ID
- **New:** Caller Name + Member Full Name + Member DOB

**Why:** A person calling about their family member knows their name and birthday, not their member ID!

## New Test Scenarios

### Blocked Caller (Use Case 3 Demo)
```
Caller Name: David
Member Full Name: Kelly Foster
Member Date of Birth: 1977-01-07
```

**Expected:** 🔴 Red message - "I'm not able to share Kelly Foster's information..."

### Authorized Caller
```
Caller Name: Douglas Wilson
Member Full Name: Kelly Foster
Member Date of Birth: 1977-01-07
```

**Expected:** 🟢 Green message - "Authorization verified. Douglas Wilson is authorized..."

### Member Calling for Themselves
```
Caller Name: John Rodriguez
Member Full Name: John Rodriguez
Member Date of Birth: 1954-10-02
```

**Expected:** 🟢 Green message - Member accessing own data (no ROI needed)

## Files Changed

1. `odyssey/call_path.py` - Updated ROI gate to use name + DOB
2. `odyssey/tools.py` - Added `find_member_by_name_dob()` function
3. `odyssey/api_server.py` - Fixed session state initialization
4. `ui/src/app/App.tsx` - Updated ROI panel to 3 fields (caller name, member name, member DOB)

## Testing After Deploy

### In Cloud Shell Terminal 1:
```bash
cd ~/OdysseyDashboard
source ~/odyssey/QUICKSTART.sh
python3 -m odyssey.api_server
```

### In Cloud Shell Terminal 2 (if UI not running):
```bash
cd ~/OdysseyDashboard/ui
npm run dev -- --port 8080
```

### In Browser:
1. Open Web Preview → Port 8080
2. Click "Provider View"
3. See ROI panel with 3 fields now
4. Test "David" + "Kelly Foster" + "1977-01-07" → Should block
5. Test "Douglas Wilson" + "Kelly Foster" + "1977-01-07" → Should authorize

## If Changes Aren't Showing

### Option 1: Force Pull
```bash
cd ~/OdysseyDashboard
git fetch --all
git reset --hard origin/main
```

### Option 2: Manual File Update
Copy the 3 changed files manually to Cloud Shell using the editor.

## Verify It's Working

```bash
# Test the new function directly
cd ~/OdysseyDashboard
python3 -c "
from odyssey import tools
result = tools.find_member_by_name_dob('Kelly Foster', '1977-01-07')
print(result)
"
```

**Expected output:**
```python
{'member_id': 'MBR00175', 'member_name': 'Kelly Foster', 'plan_type': 'DSNP'}
```

## Demo Talking Points

> "We changed the ROI verification to use Name + Date of Birth instead of Member ID. Why? Because a son calling about his mother knows her name and birthday - he doesn't know her insurance member ID. This is more natural for real-world callers."

> "The system looks up the member by name and DOB, then checks ROI authorization. If there's no match, or multiple matches, it asks the caller to verify the information. This prevents data leakage while remaining user-friendly."
