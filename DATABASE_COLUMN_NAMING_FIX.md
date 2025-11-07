# Database Column Naming Fix

## Problem Summary

**Error:** `column Assessment.createdAt does not exist`

**Root Cause:** Code-level mismatch between Sequelize model configuration and database schema.

## What Was Wrong

### Database Schema (Correct ✅)
Your PostgreSQL database correctly uses **snake_case** column names:
- `created_at`
- `updated_at`
- `user_id`
- `conversation_id`
- etc.

### Code Configuration (Inconsistent ❌)
Some Sequelize models were missing the `underscored: true` configuration, causing them to look for **camelCase** columns:
- Looking for: `createdAt`
- Database has: `created_at`

## Solution: CODE LEVEL FIX

### What Was Changed

Updated three model files and one controller to use underscored naming:

#### 1. `src/models/Assessment.js`
```javascript
// BEFORE
}, {
  tableName: 'assessments',
  timestamps: true
});

// AFTER
}, {
  tableName: 'assessments',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
```

#### 2. `src/models/User.js`
```javascript
// BEFORE
}, {
  tableName: 'users',
  timestamps: true,
  hooks: { ... }
});

// AFTER
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: { ... }
});
```

#### 3. `src/models/Provider.js`
```javascript
// BEFORE
}, {
  tableName: 'providers',
  timestamps: true
});

// AFTER
}, {
  tableName: 'providers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
```

#### 4. `src/controllers/assessment.controller.js`
```javascript
// BEFORE
order: [['createdAt', 'DESC']]

// AFTER
order: [['created_at', 'DESC']]
```

### Models Already Correct ✅
- `src/models/Conversation.js` - Already had `underscored: true`
- `src/models/Message.js` - Already had `underscored: true`

## Why This Happened

The global Sequelize configuration in `src/config/database.js` sets:
```javascript
define: {
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}
```

However, when individual models define their own options, they need to **explicitly include** these settings, or they override the global defaults.

## Testing the Fix

### Before Fix
```bash
GET /api/v1/assessments
# Error: column Assessment.createdAt does not exist
```

### After Fix
```bash
GET /api/v1/assessments
# Success: Returns assessments with proper column mapping
```

## No Database Changes Required

**Important:** This was purely a code-level fix. No database migrations or schema changes were needed because:
- ✅ Database already has correct snake_case columns
- ✅ Only the Sequelize model configuration needed updating
- ✅ No data loss or migration required

## Verification Steps

1. **Restart your server:**
   ```bash
   npm run dev
   ```

2. **Test the assessments endpoint:**
   ```bash
   curl http://localhost:5000/api/v1/assessments \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Expected result:** Should return assessments without column errors

## For Render Deployment

This fix is already in your code. When you deploy to Render:
1. The models will use the correct underscored configuration
2. Database migrations will create tables with snake_case columns
3. No additional configuration needed

## Summary

- **Issue Type:** Code-level configuration mismatch
- **Database Changes:** None required
- **Files Modified:** 3 model files + 1 controller file
- **Impact:** Fixes all timestamp-related query errors
- **Status:** ✅ Fixed and ready for deployment
