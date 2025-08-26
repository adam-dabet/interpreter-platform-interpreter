# Service Type Rates Update

## Overview
This update transforms the "Professional Information" section into a "Rates" section that allows users to set different rates for each service type. Users can either agree to platform-set rates or choose their own custom rates, with the incentive that agreeing to platform rates makes them more likely to receive jobs.

## Changes Made

### Database Changes
- **Migration File**: `backend/migrations/create_service_type_rates.sql`
- **New Tables**: 
  - `service_type_rates` - Stores platform-set default rates for each service type
  - `interpreter_service_rates` - Stores user's rates for each service type (platform or custom)
- **Default Platform Rates**:
  - Medical: $45/hour
  - Legal: $60/hour
  - Phone: $2.50/minute
  - Document: $0.15/minute
  - Other: $50/hour

### Backend Changes

#### Parametric Routes (`backend/src/routes/parametric.js`)
- Updated service types endpoint to include platform rates
- Modified `/all` endpoint to return service types with rates
- Added JOIN with `service_type_rates` table

#### Interpreter Model (`backend/src/models/Interpreter.js`)
- Added `service_rates` parameter handling
- Updated create method to insert service rates into `interpreter_service_rates` table
- Maintains backward compatibility with existing service types

#### Validation Middleware (`backend/src/middleware/validation.js`)
- Replaced `rate_amount` and `rate_unit` validation with `service_rates` JSON validation
- Updated validation rules for the new rate structure

#### Interpreter Routes (`backend/src/routes/interpreters.js`)
- Updated validation to handle `service_rates` instead of individual rate fields
- Added JSON validation for service rates

### Frontend Changes

#### Validation Schema (`frontend/src/services/validationSchemas.js`)
- Removed old `rate_amount` and `rate_unit` validation
- Added new `service_rates` validation schema with conditional validation:
  - Platform rates: No additional validation needed
  - Custom rates: Must have valid amount (0-1000) and unit (minutes/hours)

#### Professional Info Step (`frontend/src/components/forms/ProfessionalInfoStep.js`)
- Removed old rate input fields
- Kept business information, experience, and bio fields
- No longer handles individual rate setting

#### Service Types Step (`frontend/src/components/forms/ServiceTypesStep.js`)
- **Title Changed**: From "Select Your Service Types" to "Service Types & Rates"
- **New Functionality**: 
  - Shows platform rates for each selected service type
  - Radio buttons to choose between platform rates or custom rates
  - Custom rate inputs (amount + unit) when "Set Custom Rate" is selected
  - Dynamic rate display based on selection
- **Rate Management**: 
  - Automatically sets platform rates when service types are selected
  - Allows switching between platform and custom rates
  - Validates custom rates when provided

#### Interpreter Profile (`frontend/src/pages/InterpreterProfile.js`)
- Updated form data structure to include `service_rates` array
- Removed old `rate_amount` and `rate_unit` fields
- Updated form submission to handle service rates as JSON

#### Review Step (`frontend/src/components/forms/ReviewStep.js`)
- Updated display to show service rates instead of single rate
- Shows each service type with its corresponding rate
- Displays "Platform Rate" for platform rates or custom amount/unit for custom rates

### Key Features

#### Platform Rates
- **Automatic Assignment**: When a service type is selected, it automatically gets the platform rate
- **Competitive Pricing**: Platform rates are set to be competitive in the market
- **Job Priority**: Users agreeing to platform rates are more likely to receive job assignments

#### Custom Rates
- **Flexibility**: Users can set their own rates for any service type
- **Validation**: Custom rates must be within reasonable bounds ($0-$1000)
- **Time Units**: Support for both per-minute and per-hour pricing

#### User Experience
- **Clear Choice**: Radio buttons make it easy to choose between platform and custom rates
- **Visual Feedback**: Shows platform rates prominently for comparison
- **Incentive Messaging**: Clear communication that platform rates increase job opportunities

### Data Structure

#### Service Rate Object
```javascript
{
  service_type_id: "1",
  rate_type: "platform" | "custom",
  rate_amount: 45.00,        // Only required for custom rates
  rate_unit: "hours"         // Only required for custom rates
}
```

#### Platform Rate Object (from database)
```javascript
{
  id: "uuid",
  service_type_id: 1,
  rate_amount: 45.00,
  rate_unit: "hours",
  is_active: true
}
```

### Migration Instructions

1. **Run the migration**:
   ```bash
   cd backend
   psql -d your_database_name -f migrations/create_service_type_rates.sql
   ```

2. **Restart the backend server** to ensure all changes are loaded

3. **Clear frontend cache** if using any caching mechanisms

### Benefits

1. **Better Job Matching**: Platform rates ensure consistent pricing for clients
2. **Increased Job Opportunities**: Users agreeing to platform rates get priority
3. **Flexible Pricing**: Users can still set custom rates when needed
4. **Market Competitiveness**: Platform rates are optimized for market conditions
5. **Simplified Billing**: Consistent rate structure across the platform

### Future Enhancements

- Dynamic platform rate updates based on market conditions
- Rate comparison tools for users
- Bulk rate management for multiple service types
- Rate history and analytics
- Seasonal rate adjustments
- Geographic rate variations
