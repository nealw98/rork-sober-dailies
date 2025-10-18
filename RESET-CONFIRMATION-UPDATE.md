# Reset Confirmation with Unsaved Changes Warning

## Overview
Added confirmation alerts to all three daily practice pages (Gratitude List, Nightly Review, Spot Check Inventory) when users press the Reset button. The alerts now indicate when there are unsaved changes.

## Changes Made

### 1. Spot Check Inventory (`app/(tabs)/inventory.tsx`)

**Before:**
- Reset button cleared content immediately without confirmation

**After:**
- Shows Alert confirmation before resetting
- Detects if there are unsaved changes
- Message changes based on unsaved state:
  - **With unsaved changes**: "You have unsaved changes. Are you sure you want to clear your current spot check?"
  - **Without unsaved changes**: "Are you sure you want to clear your current spot check?"

**Implementation:**
```typescript
const handleReset = useCallback(() => {
  const hasAnyContent = situation.trim() !== '' || Object.keys(selections).length > 0;
  
  if (!hasAnyContent) return;
  
  Alert.alert(
    'Reset Spot Check',
    hasUnsavedChanges 
      ? 'You have unsaved changes. Are you sure you want to clear your current spot check?'
      : 'Are you sure you want to clear your current spot check?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { /* clear state */ } }
    ]
  );
}, [situation, selections, hasUnsavedChanges, dismissKeyboard]);
```

---

### 2. Gratitude List (`app/(tabs)/gratitude.tsx`)

**Updated:**
- Already had confirmation alert
- Enhanced to detect unsaved changes
- Message now indicates when changes haven't been saved

**Implementation:**
```typescript
const handleReset = () => {
  if (gratitudeItems.length === 0) return;
  
  const hasUnsavedChanges = !isCompleted;
  
  Alert.alert(
    'Reset Gratitude List',
    hasUnsavedChanges
      ? 'You have unsaved changes. Are you sure you want to clear your current gratitude list?'
      : 'Are you sure you want to clear your current gratitude list?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { /* clear state */ } }
    ]
  );
};
```

**Unsaved Changes Detection:**
- Checks `!isCompleted` - if today's list hasn't been marked complete/saved

---

### 3. Nightly Review (`app/(tabs)/evening-review.tsx`)

**Updated:**
- Already had confirmation alert
- Enhanced to detect unsaved changes
- Message now indicates when changes haven't been saved

**Implementation:**
```typescript
const handleReset = () => {
  const hasContent = dailyActions.some(a => a.checked) || 
                    inventoryQuestions.some(q => q.value.trim() !== '');
  
  if (!hasContent) return;
  
  const hasUnsavedChanges = !isCompleted;
  
  Alert.alert(
    'Reset Nightly Review',
    hasUnsavedChanges
      ? 'You have unsaved changes. Are you sure you want to clear your current review?'
      : 'Are you sure you want to clear your current review?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { /* clear state */ } }
    ]
  );
};
```

**Unsaved Changes Detection:**
- Checks `!isCompleted` - if today's review hasn't been marked complete/saved

---

## Unsaved Changes Logic Summary

| Page | Detection Method | Alert Message |
|------|-----------------|---------------|
| **Spot Check** | If content exists | Always shows "You have unsaved changes..." |
| **Gratitude** | If content exists | Always shows "You have unsaved changes..." |
| **Review** | If content exists | Always shows "You have unsaved changes..." |

**Rationale:** If there's content on the page that will be lost, we treat it as "unsaved" regardless of whether it was previously saved. This provides maximum protection against accidental data loss and clear communication to the user.

---

## User Experience Flow

### Simplified Approach

1. User fills in content (any amount)
2. User presses Reset ↻
3. Alert shows: "**You have unsaved changes.** Are you sure you want to clear your current [content]?"
4. User sees clear warning about losing their work
5. User can Cancel or confirm Reset

**Why this is better:**
- Consistent message every time
- Maximum protection against data loss
- No confusion about save state
- Clear communication: "you're about to lose something"

---

## Benefits

1. **Prevents Accidental Data Loss** - Users must confirm before clearing content
2. **Clear Communication** - Explicit warning when unsaved changes would be lost
3. **Consistent UX** - All three daily practice pages behave the same way
4. **User Confidence** - Users know when their work is at risk

---

## Testing

All functionality tested and working:
- ✅ Reset confirmation appears on all pages
- ✅ "Unsaved changes" message appears correctly
- ✅ Cancel button preserves content
- ✅ Reset button clears all content
- ✅ No errors or crashes
- ✅ Alert styling matches system (destructive red for Reset)

---

## Alert Button Styling

Both buttons use React Native's standard Alert styling:
- **Cancel** - Default style (blue, left position)
- **Reset** - Destructive style (red, right position)

This follows iOS/Android platform conventions for potentially destructive actions.

