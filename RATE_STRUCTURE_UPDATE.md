# Rate Structure Update

## Overview
This update modifies the hourly rate field to allow users to set their rate in either minutes or hours, providing more flexibility for different pricing models.

## Changes Made

### Database Changes
- **Migration File**: `backend/migrations/update_rate_structure.sql`
- **New Structure**: 
  - `rate_amount` (DECIMAL(10,2)) - The rate value
  - `rate_unit` (VARCHAR(10)) - Either 'minutes' or 'hours'
- **Tables Updated**: 
  - `interpreters`
  - `providers` (if exists)
  - `translator_applications` (if exists)

### Backend Changes

#### Validation Middleware (`backend/src/middleware/validation.js`)
- Updated validation rules for `rate_amount` and `rate_unit`
- `rate_amount`: Must be a valid decimal number
- `rate_unit`: Must be either 'minutes' or 'hours'

#### Interpreter Routes (`backend/src/routes/interpreters.js`)
- Updated validation to use new rate structure
- Replaced `hourly_rate` with `rate_amount` and `rate_unit`

#### Interpreter Model (`backend/src/models/Interpreter.js`)
- Updated SQL queries to use new rate fields
- Modified INSERT and SELECT statements
- Updated parameter handling

### Frontend Changes

#### Validation Schema (`frontend/src/services/validationSchemas.js`)
- Replaced `hourly_rate` validation with `rate_amount` and `rate_unit`
- Added validation for rate unit selection

#### Professional Info Step (`frontend/src/components/forms/ProfessionalInfoStep.js`)
- Updated form to include rate amount input and unit selection
- Added proper error handling for both fields
- Used constants for rate unit options

#### Service Types Step (`frontend/src/components/forms/ServiceTypesStep.js`)
- Updated rate handling to use new structure
- Added rate unit selection dropdown
- Updated validation and form submission

#### Review Step (`frontend/src/components/forms/ReviewStep.js`)
- Updated display to show rate with appropriate unit (per hour/per minute)

#### Interpreter Profile (`frontend/src/pages/InterpreterProfile.js`)
- Updated form data structure
- Modified form submission handling for new rate fields

#### Constants (`frontend/src/utils/constants.js`)
- Added `RATE_UNITS` constant for consistent rate unit options

## Migration Instructions

1. **Run the migration**:
   ```bash
   cd backend
   psql -d your_database_name -f migrations/update_rate_structure.sql
   ```

2. **Restart the backend server** to ensure all changes are loaded

3. **Clear frontend cache** if using any caching mechanisms

## Benefits

1. **Flexibility**: Users can now set rates per minute or per hour
2. **Better Pricing Models**: Supports different billing structures (e.g., $2/minute vs $100/hour)
3. **User Experience**: Clear distinction between rate amount and time unit
4. **Scalability**: Easy to add more time units in the future if needed

## Backward Compatibility

- Existing hourly rates are automatically migrated to the new structure
- All existing functionality remains intact
- API endpoints maintain the same response structure

## Future Enhancements

- Add support for other time units (e.g., per 15 minutes, per day)
- Implement rate conversion utilities
- Add rate comparison features
- Support for different currencies
