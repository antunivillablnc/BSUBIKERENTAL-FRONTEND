# Staff Interface Consolidation - Summary

## Overview
Successfully removed separate teaching staff and non-teaching staff interfaces. Staff members now use the same user interface as students but with a different application form.

## Changes Made

### 1. Login Redirect Logic (`app/page.tsx`)
- **Before**: Teaching staff and non-teaching staff were redirected to `/staff`
- **After**: All non-admin users (including staff) are redirected to `/home`
- Staff and students now share the same home interface

### 2. Reserve Page (`app/reserve/page.tsx`)
- Added user role detection
- Updated "Rent a bike" button to redirect:
  - Students → `/reserve/apply` (student application form)
  - Staff (teaching/non-teaching) → `/reserve/apply-staff` (staff application form)

### 3. Staff Application Form (`app/reserve/apply-staff/page.tsx`)
- **New file created** with staff-specific fields:
  - Staff ID (instead of SR Code)
  - Employee Type (Teaching Staff / Non-Teaching Staff)
  - Department (instead of College/Program)
  - Required documents: Certificate of Indigency, ITR, Certificate of Employment
- Uses same layout and UI as student form for consistency

### 4. Backend Application Handler (`backend/src/routes/application.ts`)
- Updated to handle both student and staff applications
- Added `applicationType` field (defaults to 'student')
- Conditional field storage based on application type:
  - **Student fields**: srCode, college, program, GWA, extracurricular activities
  - **Staff fields**: staffId, employeeType, department, employment certificate
- Both types share common fields: personal info, address, family income, etc.

### 5. Staff Page Redirect (`app/staff/page.tsx`)
- **Before**: Full custom interface with dashboard, metrics, and mock application form
- **After**: Simple redirect to `/home`
- Kept file for backward compatibility but streamlined to just redirect

### 6. AppShell Component (`app/AppShell.tsx`)
- Removed special handling for `/staff` route
- Staff pages now render with standard navbar and layout

## User Roles
The system now recognizes these roles:
- **admin** → redirects to `/admin` (unchanged)
- **student** → redirects to `/home`, uses `/reserve/apply`
- **teaching_staff** → redirects to `/home`, uses `/reserve/apply-staff`
- **non_teaching_staff** → redirects to `/home`, uses `/reserve/apply-staff`

## Database Schema
Applications now store an `applicationType` field:
- `"student"` - includes student-specific fields
- `"staff"` - includes staff-specific fields

## Testing Recommendations
1. Test login flow for teaching_staff and non_teaching_staff roles
2. Verify redirect from `/reserve` button based on user role
3. Test staff application submission with required documents
4. Verify admin can view and process both student and staff applications
5. Test that existing `/staff` route redirects properly

## Benefits
✅ Unified user experience for all non-admin users
✅ Reduced code duplication
✅ Easier maintenance with single interface codebase
✅ Clear separation via application forms instead of entire interfaces
✅ Preserved all staff-specific data requirements

