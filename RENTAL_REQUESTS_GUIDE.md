# Rental Requests System - Implementation Guide

## ✅ **Problem Solved: Replaced Transactions with Rental Requests**

### **Issues Fixed:**
1. **Chat Permissions**: "Missing or insufficient permissions" - Fixed by ensuring both participants are included
2. **Rental Requests**: Replaced complex transaction system with simple `rentalRequests` collection

## 🔧 **New Firestore Structure**

### **Rental Requests Collection:**
```
/rentalRequests/{requestId} {
   requestId: "request123",
   listingId: "listing789", 
   ownerId: "uidOwner",
   requesterId: "uidRequester",
   status: "pending", // pending | accepted | declined
   createdAt: <timestamp>
}
```

### **Updated Firestore Rules:**
```javascript
// Rental Requests: owner and requester can access
match /rentalRequests/{requestId} {
  allow create: if request.auth != null &&
    (request.auth.uid == request.resource.data.requesterId);

  allow read, update, delete: if request.auth != null &&
    (request.auth.uid == resource.data.ownerId ||
     request.auth.uid == resource.data.requesterId);
}
```

## 🚀 **New Functions Available**

### **In `src/lib/firestore.ts`:**

```typescript
// Create a rental request
export const createRentalRequest = async (rentalRequestData: Omit<RentalRequest, 'id' | 'createdAt'>): Promise<string>

// Get requests by owner (for listing owners)
export const getRentalRequestsByOwner = async (ownerId: string): Promise<RentalRequest[]>

// Get requests by requester (for users who made requests)
export const getRentalRequestsByRequester = async (requesterId: string): Promise<RentalRequest[]>

// Update request status (accept/decline)
export const updateRentalRequest = async (requestId: string, updates: Partial<RentalRequest>): Promise<void>
```

## 📱 **Updated ProductDetail Component**

### **Request Rent Button:**
- ✅ Creates rental request in `/rentalRequests` collection
- ✅ Includes `listingId`, `ownerId`, `requesterId`, `status: 'pending'`
- ✅ Navigates to dashboard after successful request
- ✅ Proper error handling with toast notifications

### **Propose Swap Button:**
- ✅ Uses same rental request system
- ✅ Can be extended later with a `type` field to distinguish swaps
- ✅ Same validation and error handling

## 🔑 **Chat Permissions Fixed**

### **Chat Creation:**
```typescript
// ✅ Correct - includes both participants
await ensureChat(chatId, [ownerId, currentUserId], listing.title, listing.id);
```

### **Why This Fixes Permissions:**
- Both users are included in the `participants` array
- Firestore rules require both participants to be present
- Both users can now read/write to the chat and messages

## 🧪 **Testing the New System**

### **Test Rental Requests:**
1. Go to any product detail page
2. Click "Request to Rent" 
3. Check Firestore Console → `rentalRequests` collection
4. Verify document was created with correct fields

### **Test Chat Permissions:**
1. Click "Contact" on any item
2. Send a message
3. Open the same chat in another browser/tab
4. Both users should be able to see and send messages

### **Test Owner/Requester Access:**
1. **As Requester**: Check dashboard for your requests
2. **As Owner**: Check dashboard for incoming requests
3. Both should see appropriate requests based on their role

## 📋 **Next Steps**

### **Dashboard Integration:**
- Update Dashboard component to show rental requests
- Add accept/decline functionality for owners
- Show request status for requesters

### **Optional Enhancements:**
- Add `type` field to distinguish rentals vs swaps
- Add `startDate`/`endDate` fields for rental periods
- Add `amount` field for rental pricing
- Add messaging integration with rental requests

## ✅ **What's Working Now**

- ✅ **Rental requests** are created in dedicated collection
- ✅ **Chat permissions** work correctly with both participants
- ✅ **Firestore rules** are simplified and secure
- ✅ **Error handling** with proper user feedback
- ✅ **Navigation** to appropriate pages after actions
- ✅ **Type safety** with TypeScript interfaces

The system is now much simpler and more focused on the core functionality you need!
