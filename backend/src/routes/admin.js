const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const reminderController = require('../controllers/reminderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const db = require('../config/database');
const loggerService = require('../services/loggerService');

// Login
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  authController.login
);

// Logout
router.post('/logout', authController.logout);

// Get profile (protected)
router.get('/profile', authenticateToken, authController.getProfile);

// Dashboard routes (protected)
router.get('/dashboard/stats', authenticateToken, adminController.getDashboardStats);

// Job authorization routes (protected)
router.post('/jobs/:jobId/authorize', authenticateToken, adminController.authorizeJob);
router.post('/jobs/:jobId/reject', 
  authenticateToken,
  [
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  adminController.rejectJob
);

// Interpreter profile management routes (protected)
router.get('/profiles/pending', authenticateToken, adminController.getPendingProfiles);
router.get('/profiles/:profileId', authenticateToken, adminController.getProfileDetails);
router.get('/profiles', authenticateToken, adminController.getAllProfiles); // New route for all applications
router.put('/profiles/:profileId/status', 
  authenticateToken,
  [
    body('status').isIn(['draft', 'pending', 'under_review', 'approved', 'rejected', 'suspended']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.updateProfileStatus
);

// Specific approve/reject routes (protected)
router.post('/profiles/:profileId/approve', 
  authenticateToken,
  [
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.approveProfile
);
router.post('/profiles/:profileId/reject', 
  authenticateToken,
  [
    body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.rejectProfile
);

// Delete profile route (protected)
router.delete('/profiles/:profileId', authenticateToken, adminController.deleteProfile);

// Get all service locations
router.get('/service-locations', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, address, phone_number, location_contact, 
                   city, state, zip_code, latitude, longitude, is_active,
                   created_at, updated_at
            FROM service_locations 
            WHERE is_active = true 
            ORDER BY name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve service locations', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve service locations'
        });
    }
});

// Get a specific service location by ID
router.get('/service-locations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT id, name, address, phone_number, location_contact, 
                   city, state, zip_code, latitude, longitude, is_active,
                   created_at, updated_at
            FROM service_locations 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service location not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve service location', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve service location'
        });
    }
});

// Create a new service location
router.post('/service-locations', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            address,
            phone_number,
            location_contact,
            city,
            state,
            zip_code,
            latitude,
            longitude
        } = req.body;
        
        // Validate required fields
        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: 'Name and address are required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO service_locations (
                name, address, phone_number, location_contact, 
                city, state, zip_code, latitude, longitude, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, name, address, phone_number, location_contact, 
                      city, state, zip_code, latitude, longitude, is_active,
                      created_at, updated_at
        `, [
            name, address, phone_number, location_contact, 
            city, state, zip_code, latitude, longitude, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Service location created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create service location', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create service location'
        });
    }
});

// Update a service location
router.put('/service-locations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            address,
            phone_number,
            location_contact,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            is_active
        } = req.body;
        
        // Validate required fields
        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: 'Name and address are required'
            });
        }
        
        const result = await db.query(`
            UPDATE service_locations SET
                name = $1,
                address = $2,
                phone_number = $3,
                location_contact = $4,
                city = $5,
                state = $6,
                zip_code = $7,
                latitude = $8,
                longitude = $9,
                is_active = $10,
                last_updated_by = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING id, name, address, phone_number, location_contact, 
                      city, state, zip_code, latitude, longitude, is_active,
                      created_at, updated_at
        `, [
            name, address, phone_number, location_contact, 
            city, state, zip_code, latitude, longitude, is_active, 
            req.user.id, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service location not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Service location updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update service location', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update service location'
        });
    }
});

// Delete a service location (soft delete)
router.delete('/service-locations/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE service_locations SET
                is_active = false,
                last_updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Service location not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Service location deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete service location', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete service location'
        });
    }
});

// ===== BILLING ACCOUNTS ROUTES =====

// Get all billing accounts
router.get('/billing-accounts', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, phone, email, is_active, created_at, updated_at
            FROM billing_accounts 
            WHERE is_active = true 
            ORDER BY name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve billing accounts', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve billing accounts'
        });
    }
});

// Get a specific billing account with its rates
router.get('/billing-accounts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get billing account details
        const accountResult = await db.query(`
            SELECT id, name, phone, email, is_active, created_at, updated_at
            FROM billing_accounts 
            WHERE id = $1 AND is_active = true
        `, [id]);
        
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing account not found'
            });
        }

        // Get rates for this account
        const ratesResult = await db.query(`
            SELECT id, service_category, rate_type, rate_amount, time_minutes, is_active
            FROM billing_account_rates 
            WHERE billing_account_id = $1 AND is_active = true
            ORDER BY service_category, rate_type
        `, [id]);
        
        res.json({
            success: true,
            data: {
                ...accountResult.rows[0],
                rates: ratesResult.rows
            }
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve billing account', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve billing account'
        });
    }
});

// Create a new billing account
router.post('/billing-accounts', authenticateToken, async (req, res) => {
    try {
        const { name, phone, email, rates } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        // Insert billing account
        const accountResult = await db.query(`
            INSERT INTO billing_accounts (name, phone, email, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, phone, email, is_active, created_at, updated_at
        `, [name, phone, email, req.user.id]);
        
        const accountId = accountResult.rows[0].id;
        
        // Insert default rates for the new account
        const defaultRates = [
            // General Rates - Spanish
            { service_category: 'general_spanish', rate_type: 'A', rate_amount: 140.00, time_minutes: 120 },
            { service_category: 'general_spanish', rate_type: 'B', rate_amount: 70.00, time_minutes: 60 },
            // General Rates - Non-Spanish
            { service_category: 'general_non_spanish', rate_type: 'A', rate_amount: 140.00, time_minutes: 120 },
            { service_category: 'general_non_spanish', rate_type: 'B', rate_amount: 70.00, time_minutes: 60 },
            // Legal Rates - Spanish
            { service_category: 'legal_spanish', rate_type: 'A', rate_amount: 330.00, time_minutes: 180 },
            { service_category: 'legal_spanish', rate_type: 'B', rate_amount: 330.00, time_minutes: 180 },
            // Legal Rates - Non-Spanish
            { service_category: 'legal_non_spanish', rate_type: 'A', rate_amount: 330.00, time_minutes: 180 },
            { service_category: 'legal_non_spanish', rate_type: 'B', rate_amount: 330.00, time_minutes: 180 },
            // Medical Certified Rates - Spanish
            { service_category: 'medical_certified_spanish', rate_type: 'A', rate_amount: 200.00, time_minutes: 120 },
            { service_category: 'medical_certified_spanish', rate_type: 'B', rate_amount: 100.00, time_minutes: 60 },
            // Medical Certified Rates - Non-Spanish
            { service_category: 'medical_certified_non_spanish', rate_type: 'A', rate_amount: 200.00, time_minutes: 120 },
            { service_category: 'medical_certified_non_spanish', rate_type: 'B', rate_amount: 100.00, time_minutes: 60 }
        ];
        
        // Insert default rates
        for (const rate of defaultRates) {
            await db.query(`
                INSERT INTO billing_account_rates (
                    billing_account_id, service_category, rate_type, 
                    rate_amount, time_minutes
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                accountId,
                rate.service_category,
                rate.rate_type,
                rate.rate_amount,
                rate.time_minutes
            ]);
        }
        
        res.status(201).json({
            success: true,
            message: 'Billing account created successfully',
            data: accountResult.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create billing account', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create billing account'
        });
    }
});

// Update a billing account
router.put('/billing-accounts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, is_active } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const result = await db.query(`
            UPDATE billing_accounts SET
                name = $1,
                phone = $2,
                email = $3,
                is_active = $4,
                last_updated_by = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING id, name, phone, email, is_active, created_at, updated_at
        `, [name, phone, email, is_active, req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing account not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Billing account updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update billing account', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update billing account'
        });
    }
});

// Update a specific rate
router.put('/billing-accounts/:accountId/rates/:rateId', authenticateToken, async (req, res) => {
    try {
        const { accountId, rateId } = req.params;
        const { rate_amount, time_minutes } = req.body;
        
        // Validate that at least one field is provided
        if (rate_amount === undefined && time_minutes === undefined) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (rate_amount or time_minutes) is required'
            });
        }
        
        // Build dynamic update query based on provided fields
        let updateFields = [];
        let values = [];
        let paramCount = 1;
        
        if (rate_amount !== undefined) {
            updateFields.push(`rate_amount = $${paramCount}`);
            values.push(rate_amount);
            paramCount++;
        }
        
        if (time_minutes !== undefined) {
            updateFields.push(`time_minutes = $${paramCount}`);
            values.push(time_minutes);
            paramCount++;
        }
        
        // Add updated_at and WHERE clause parameters
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(rateId, accountId);
        
        const result = await db.query(`
            UPDATE billing_account_rates SET
                ${updateFields.join(', ')}
            WHERE id = $${paramCount} AND billing_account_id = $${paramCount + 1}
            RETURNING id, service_category, rate_type, rate_amount, time_minutes
        `, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rate not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Rate updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update rate', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update rate'
        });
    }
});

// Delete a billing account (soft delete)
router.delete('/billing-accounts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE billing_accounts SET
                is_active = false,
                last_updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing account not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Billing account deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete billing account', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete billing account'
        });
    }
});

// ===== CUSTOMERS ROUTES =====

// Get all customers
router.get('/customers', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.id, c.name, c.email, c.phone, c.title, c.billing_account_id, c.is_active, c.created_at, c.updated_at,
                   ba.name as billing_account_name
            FROM customers c
            LEFT JOIN billing_accounts ba ON c.billing_account_id = ba.id
            WHERE c.is_active = true 
            ORDER BY c.name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve customers', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve customers'
        });
    }
});

// Get a specific customer
router.get('/customers/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT c.id, c.name, c.email, c.phone, c.title, c.billing_account_id, c.is_active, c.created_at, c.updated_at,
                   ba.name as billing_account_name
            FROM customers c
            LEFT JOIN billing_accounts ba ON c.billing_account_id = ba.id
            WHERE c.id = $1 AND c.is_active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve customer', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve customer'
        });
    }
});

// Create a new customer
router.post('/customers', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, title, billing_account_id } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO customers (name, email, phone, title, billing_account_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, phone, title, billing_account_id, is_active, created_at, updated_at
        `, [name, email, phone, title, billing_account_id, req.user.id]);
        
        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create customer', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create customer'
        });
    }
});

// Update a customer
router.put('/customers/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, title, billing_account_id } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const result = await db.query(`
            UPDATE customers SET
                name = $1,
                email = $2,
                phone = $3,
                title = $4,
                billing_account_id = $5,
                last_updated_by = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, name, email, phone, title, billing_account_id, is_active, created_at, updated_at
        `, [name, email, phone, title, billing_account_id, req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update customer', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update customer'
        });
    }
});

// Delete a customer (soft delete)
router.delete('/customers/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE customers SET
                is_active = false,
                last_updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete customer', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete customer'
        });
    }
});

// ===== CLAIMANTS ROUTES =====

// Get all claimants
router.get('/claimants', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT cl.id, cl.first_name, cl.last_name, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, 
                   cl.billing_account_id, cl.address, cl.address_latitude, cl.address_longitude, cl.employer_insured, cl.is_active, cl.created_at, cl.updated_at,
                   ba.name as billing_account_name,
                   COUNT(c.id) as claims_count
            FROM claimants cl
            LEFT JOIN billing_accounts ba ON cl.billing_account_id = ba.id
            LEFT JOIN claims c ON cl.id = c.claimant_id AND c.is_active = true
            WHERE cl.is_active = true 
            GROUP BY cl.id, cl.first_name, cl.last_name, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, 
                     cl.billing_account_id, cl.address, cl.address_latitude, cl.address_longitude, cl.employer_insured, cl.is_active, cl.created_at, cl.updated_at, ba.name
            ORDER BY cl.first_name ASC, cl.last_name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve claimants', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve claimants'
        });
    }
});

// Get a specific claimant with their claims
router.get('/claimants/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get claimant details
        const claimantResult = await db.query(`
            SELECT cl.id, cl.first_name, cl.last_name, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, 
                   cl.billing_account_id, cl.address, cl.address_latitude, cl.address_longitude, cl.employer_insured, cl.is_active, cl.created_at, cl.updated_at,
                   ba.name as billing_account_name
            FROM claimants cl
            LEFT JOIN billing_accounts ba ON cl.billing_account_id = ba.id
            WHERE cl.id = $1 AND cl.is_active = true
        `, [id]);
        
        if (claimantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claimant not found'
            });
        }
        
        // Get claims for this claimant
        const claimsResult = await db.query(`
            SELECT c.id, c.case_type, c.claim_number, c.date_of_injury, c.diagnosis, c.contact_claims_handler_id, c.adjusters_assistant_id,
                   c.is_active, c.created_at, c.updated_at,
                   ch.name as contact_claims_handler_name,
                   aa.name as adjusters_assistant_name
            FROM claims c
            LEFT JOIN customers ch ON c.contact_claims_handler_id = ch.id
            LEFT JOIN customers aa ON c.adjusters_assistant_id = aa.id
            WHERE c.claimant_id = $1 AND c.is_active = true
            ORDER BY c.created_at DESC
        `, [id]);
        
        const claimant = claimantResult.rows[0];
        claimant.claims = claimsResult.rows;
        
        res.json({
            success: true,
            data: claimant
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve claimant', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve claimant'
        });
    }
});

// Create a new claimant
router.post('/claimants', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, gender, date_of_birth, phone, language, billing_account_id, address, address_latitude, address_longitude, employer_insured } = req.body;
        
        // Validate required fields
        if (!first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }
        
        // Combine first and last name for the name field
        const name = `${first_name} ${last_name}`.trim();
        
        // Convert empty strings to null for optional fields
        const cleanBillingAccountId = billing_account_id === '' ? null : billing_account_id;
        const cleanAddressLatitude = address_latitude === '' ? null : address_latitude;
        const cleanAddressLongitude = address_longitude === '' ? null : address_longitude;
        const cleanDateOfBirth = date_of_birth === '' ? null : date_of_birth;
        const cleanGender = gender === '' ? null : gender;
        const cleanPhone = phone === '' ? null : phone;
        const cleanLanguage = language === '' ? null : language;
        const cleanAddress = address === '' ? null : address;
        const cleanEmployerInsured = employer_insured === '' ? null : employer_insured;
        
        const result = await db.query(`
            INSERT INTO claimants (first_name, last_name, name, gender, date_of_birth, phone, language, billing_account_id, address, address_latitude, address_longitude, employer_insured, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, first_name, last_name, name, gender, date_of_birth, phone, language, billing_account_id, address, address_latitude, address_longitude, employer_insured, is_active, created_at, updated_at
        `, [first_name, last_name, name, cleanGender, cleanDateOfBirth, cleanPhone, cleanLanguage, cleanBillingAccountId, cleanAddress, cleanAddressLatitude, cleanAddressLongitude, cleanEmployerInsured, req.user.id]);
        
        res.status(201).json({
            success: true,
            message: 'Claimant created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create claimant', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create claimant'
        });
    }
});

// Update a claimant
router.put('/claimants/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, gender, date_of_birth, phone, language, billing_account_id, address, address_latitude, address_longitude, employer_insured, is_active } = req.body;
        
        // Validate required fields
        if (!first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }
        
        // Combine first and last name for the name field
        const name = `${first_name} ${last_name}`.trim();
        
        // Convert empty strings to null for optional fields
        const cleanBillingAccountId = billing_account_id === '' ? null : billing_account_id;
        const cleanAddressLatitude = address_latitude === '' ? null : address_latitude;
        const cleanAddressLongitude = address_longitude === '' ? null : address_longitude;
        const cleanDateOfBirth = date_of_birth === '' ? null : date_of_birth;
        const cleanGender = gender === '' ? null : gender;
        const cleanPhone = phone === '' ? null : phone;
        const cleanLanguage = language === '' ? null : language;
        const cleanAddress = address === '' ? null : address;
        const cleanEmployerInsured = employer_insured === '' ? null : employer_insured;
        
        const result = await db.query(`
            UPDATE claimants SET
                first_name = $1,
                last_name = $2,
                name = $3,
                gender = $4,
                date_of_birth = $5,
                phone = $6,
                language = $7,
                billing_account_id = $8,
                address = $9,
                address_latitude = $10,
                address_longitude = $11,
                employer_insured = $12,
                is_active = $13,
                last_updated_by = $14,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $15
            RETURNING id, first_name, last_name, name, gender, date_of_birth, phone, language, billing_account_id, address, address_latitude, address_longitude, employer_insured, is_active, created_at, updated_at
        `, [first_name, last_name, name, cleanGender, cleanDateOfBirth, cleanPhone, cleanLanguage, cleanBillingAccountId, cleanAddress, cleanAddressLatitude, cleanAddressLongitude, cleanEmployerInsured, is_active, req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claimant not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claimant updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update claimant', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update claimant'
        });
    }
});

// Delete a claimant (soft delete)
router.delete('/claimants/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE claimants SET
                is_active = false,
                last_updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claimant not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claimant deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete claimant', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete claimant'
        });
    }
});

// ===== CLAIMS ROUTES =====

// Get all claims
router.get('/claims', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.id, c.case_type, c.claim_number, c.date_of_injury, c.diagnosis, 
                   c.contact_claims_handler_id, c.adjusters_assistant_id,
                   c.is_active, c.created_at, c.updated_at,
                   cl.name as claimant_name, cl.id as claimant_id,
                   ch.name as contact_claims_handler_name,
                   aa.name as adjusters_assistant_name
            FROM claims c
            JOIN claimants cl ON c.claimant_id = cl.id
            LEFT JOIN customers ch ON c.contact_claims_handler_id = ch.id
            LEFT JOIN customers aa ON c.adjusters_assistant_id = aa.id
            WHERE c.is_active = true AND cl.is_active = true
            ORDER BY c.created_at DESC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve claims', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve claims'
        });
    }
});

// Get claims for a specific claimant
router.get('/claimants/:claimantId/claims', authenticateToken, async (req, res) => {
    try {
        const { claimantId } = req.params;
        
        const result = await db.query(`
            SELECT c.id, c.case_type, c.claim_number, c.date_of_injury, c.diagnosis, 
                   c.contact_claims_handler_id, c.adjusters_assistant_id,
                   c.is_active, c.created_at, c.updated_at,
                   ch.name as contact_claims_handler_name,
                   aa.name as adjusters_assistant_name
            FROM claims c
            LEFT JOIN customers ch ON c.contact_claims_handler_id = ch.id
            LEFT JOIN customers aa ON c.adjusters_assistant_id = aa.id
            WHERE c.claimant_id = $1 AND c.is_active = true
            ORDER BY c.created_at DESC
        `, [claimantId]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve claims for claimant', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve claims'
        });
    }
});

// Create a new claim
router.post('/claims', authenticateToken, async (req, res) => {
    try {
        const { claimant_id, case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id } = req.body;
        
        // Validate required fields
        if (!claimant_id || !case_type || !claim_number) {
            return res.status(400).json({
                success: false,
                message: 'Claimant ID, case type, and claim number are required'
            });
        }
        
        // Convert empty strings to null for optional fields
        const cleanContactClaimsHandlerId = contact_claims_handler_id === '' ? null : contact_claims_handler_id;
        const cleanAdjustersAssistantId = adjusters_assistant_id === '' ? null : adjusters_assistant_id;
        const cleanDateOfInjury = date_of_injury === '' ? null : date_of_injury;
        const cleanDiagnosis = diagnosis === '' ? null : diagnosis;
        
        const result = await db.query(`
            INSERT INTO claims (claimant_id, case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, claimant_id, case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id, is_active, created_at, updated_at
        `, [claimant_id, case_type, claim_number, cleanDateOfInjury, cleanDiagnosis, cleanContactClaimsHandlerId, cleanAdjustersAssistantId, req.user.id]);
        
        res.status(201).json({
            success: true,
            message: 'Claim created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create claim', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create claim'
        });
    }
});

// Update a claim
router.put('/claims/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id, is_active } = req.body;
        
        // Validate required fields
        if (!case_type || !claim_number) {
            return res.status(400).json({
                success: false,
                message: 'Case type and claim number are required'
            });
        }
        
        // Convert empty strings to null for optional fields
        const cleanContactClaimsHandlerId = contact_claims_handler_id === '' ? null : contact_claims_handler_id;
        const cleanAdjustersAssistantId = adjusters_assistant_id === '' ? null : adjusters_assistant_id;
        const cleanDateOfInjury = date_of_injury === '' ? null : date_of_injury;
        const cleanDiagnosis = diagnosis === '' ? null : diagnosis;
        
        const result = await db.query(`
            UPDATE claims SET
                case_type = $1,
                claim_number = $2,
                date_of_injury = $3,
                diagnosis = $4,
                contact_claims_handler_id = $5,
                adjusters_assistant_id = $6,
                is_active = $7,
                last_updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING id, claimant_id, case_type, claim_number, date_of_injury, diagnosis, contact_claims_handler_id, adjusters_assistant_id, is_active, created_at, updated_at
        `, [case_type, claim_number, cleanDateOfInjury, cleanDiagnosis, cleanContactClaimsHandlerId, cleanAdjustersAssistantId, is_active, req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claim updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update claim', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update claim'
        });
    }
});

// Delete a claim (soft delete)
router.delete('/claims/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE claims SET
                is_active = false,
                last_updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Claim deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete claim', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete claim'
        });
    }
});

// ===== JOBS ROUTES =====

// Get job statistics
router.get('/jobs/stats', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(CASE WHEN status = 'finding_interpreter' THEN 1 END) as finding_interpreter_jobs,
                COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_jobs,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_jobs,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_jobs,
                COALESCE(SUM(total_amount), 0) as total_revenue
            FROM jobs 
            WHERE is_active = true
        `);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve job stats', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job stats'
        });
    }
});

// Get all jobs
router.get('/jobs', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT j.id, j.title, j.description, j.job_type, j.priority, j.status,
                   j.location_address, j.location_city, j.location_state, j.location_zip_code,
                   j.scheduled_date, j.scheduled_time, j.arrival_time, j.estimated_duration_minutes,
                   j.hourly_rate, j.total_amount, j.payment_status, j.client_name,
                   j.client_email, j.client_phone, j.client_notes, j.special_requirements,
                   j.admin_notes, j.appointment_type, j.is_remote,
                   j.created_at, j.updated_at,
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   cl.claim_number, cl.case_type,
                   j.assigned_interpreter_id,
                   CASE 
                     WHEN i.first_name IS NOT NULL AND i.last_name IS NOT NULL 
                     THEN CONCAT(i.first_name, ' ', i.last_name) 
                     ELSE NULL 
                   END as assigned_interpreter_name,
                   i.email as assigned_interpreter_email,
                   i.phone as assigned_interpreter_phone,
                   req.name as requested_by_name,
                   ba.name as billing_account_name,
                   j.billing_account_id,
                   st.name as service_type_name,
                   sl.name as source_language_name,
                   tl.name as target_language_name
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
            LEFT JOIN customers req ON j.requested_by_id = req.id
            LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
            LEFT JOIN service_types st ON j.service_type_id = st.id
            LEFT JOIN languages sl ON j.source_language_id = sl.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            WHERE j.is_active = true
            ORDER BY j.scheduled_date DESC, j.scheduled_time DESC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve jobs', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve jobs'
        });
    }
});

// Get a specific job
router.get('/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT j.*, 
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   cl.claim_number, cl.case_type,
                   j.assigned_interpreter_id,
                   CASE 
                     WHEN i.first_name IS NOT NULL AND i.last_name IS NOT NULL 
                     THEN CONCAT(i.first_name, ' ', i.last_name) 
                     ELSE NULL 
                   END as assigned_interpreter_name,
                   i.email as assigned_interpreter_email,
                   i.phone as assigned_interpreter_phone,
                   req.name as requested_by_name,
                   ba.name as billing_account_name
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
            LEFT JOIN customers req ON j.requested_by_id = req.id
            LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
            WHERE j.id = $1 AND j.is_active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job'
        });
    }
});

// Create a new job
router.post('/jobs', authenticateToken, async (req, res) => {
    try {
        const { 
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id
        } = req.body;
        
        // Validate required fields
        if (!title || !job_type || !priority || !status || !scheduled_date || !scheduled_time) {
            return res.status(400).json({
                success: false,
                message: 'Title, job type, priority, status, scheduled date, and scheduled time are required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO jobs (
                title, description, job_type, priority, status, location_address, location_city,
                location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
                estimated_duration_minutes, hourly_rate, total_amount, payment_status,
                client_name, client_email, client_phone, client_notes, special_requirements,
                admin_notes, appointment_type, is_remote, claimant_id, claim_id,
                requested_by_id, billing_account_id, interpreter_type_id, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
            RETURNING id, title, job_type, priority, status, scheduled_date, scheduled_time, created_at
        `, [
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id || 'assigned', req.user.id
        ]);
        
        res.json({
            success: true,
            message: 'Job created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to create job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create job'
        });
    }
});

// Update a job
router.put('/jobs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id, assigned_interpreter_id
        } = req.body;
        
        const result = await db.query(`
            UPDATE jobs SET
                title = $1, description = $2, job_type = $3, priority = $4, status = $5,
                location_address = $6, location_city = $7, location_state = $8, location_zip_code = $9,
                scheduled_date = $10, scheduled_time = $11, arrival_time = $12, estimated_duration_minutes = $13,
                hourly_rate = $14, total_amount = $15, payment_status = $16,
                client_name = $17, client_email = $18, client_phone = $19, client_notes = $20,
                special_requirements = $21, admin_notes = $22, appointment_type = $23,
                is_remote = $24, claimant_id = $25, claim_id = $26, requested_by_id = $27,
                billing_account_id = $28, interpreter_type_id = $29, assigned_interpreter_id = $30, updated_by = $31,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $32
            RETURNING id, title, job_type, priority, status, scheduled_date, scheduled_time, updated_at
        `, [
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time, estimated_duration_minutes,
            hourly_rate, total_amount, payment_status, client_name, client_email, client_phone,
            client_notes, special_requirements, admin_notes, appointment_type, is_remote,
            claimant_id, claim_id, requested_by_id, billing_account_id, interpreter_type_id, assigned_interpreter_id,
            req.user.id, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Job updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update job'
        });
    }
});

// Delete a job (soft delete)
router.delete('/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE jobs SET
                is_active = false,
                updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `, [req.user.id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        await loggerService.error('Failed to delete job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete job'
        });
    }
});

// ===== JOB WORKFLOW ROUTES =====

// Start job timer (interpreter starts job)
router.post('/jobs/:id/start', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE jobs SET
                job_started_at = CURRENT_TIMESTAMP,
                status = 'in_progress',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_active = true
            RETURNING id, job_started_at, status
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or already started'
            });
        }
        
        res.json({
            success: true,
            message: 'Job started successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to start job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to start job'
        });
    }
});

// End job timer (interpreter ends job)
router.post('/jobs/:id/end', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_duration_minutes } = req.body;
        
        const result = await db.query(`
            UPDATE jobs SET
                job_ended_at = CURRENT_TIMESTAMP,
                actual_duration_minutes = $1,
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND is_active = true AND job_started_at IS NOT NULL
            RETURNING id, job_ended_at, actual_duration_minutes, status
        `, [actual_duration_minutes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or not started'
            });
        }
        
        res.json({
            success: true,
            message: 'Job ended successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to end job', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to end job'
        });
    }
});

// Submit completion report
router.post('/jobs/:id/completion-report', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            start_time, end_time, result, status, supporting_files, notes 
        } = req.body;
        
        const completionData = {
            start_time,
            end_time,
            result,
            status,
            supporting_files,
            notes,
            submitted_at: new Date().toISOString()
        };
        
        const result_query = await db.query(`
            UPDATE jobs SET
                completion_report_submitted = true,
                completion_report_submitted_at = CURRENT_TIMESTAMP,
                completion_report_data = $1,
                status = 'completion_report',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND is_active = true AND job_ended_at IS NOT NULL
            RETURNING id, completion_report_submitted, status
        `, [JSON.stringify(completionData), id]);
        
        if (result_query.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or not completed'
            });
        }
        
        res.json({
            success: true,
            message: 'Completion report submitted successfully',
            data: result_query.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to submit completion report', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to submit completion report'
        });
    }
});

// Add job note (immutable)
router.post('/jobs/:id/notes', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { note_text, note_type } = req.body;
        
        if (!note_text) {
            return res.status(400).json({
                success: false,
                message: 'Note text is required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO job_notes (job_id, note_text, note_type, created_by_admin)
            VALUES ($1, $2, $3, $4)
            RETURNING id, note_text, note_type, created_at
        `, [id, note_text, note_type || 'general', req.user.id]);
        
        res.json({
            success: true,
            message: 'Note added successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to add job note', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to add job note'
        });
    }
});

// Get job notes
router.get('/jobs/:id/notes', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT jn.id, jn.note_text, jn.note_type, jn.created_at,
                   i.first_name as interpreter_first_name, i.last_name as interpreter_last_name,
                   u.email as admin_email
            FROM job_notes jn
            LEFT JOIN interpreters i ON jn.created_by = i.id
            LEFT JOIN users u ON jn.created_by_admin = u.id
            WHERE jn.job_id = $1
            ORDER BY jn.created_at DESC
        `, [id]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve job notes', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve job notes'
        });
    }
});

// Send claimant reminder
router.post('/jobs/:id/send-reminder', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE jobs SET
                claimant_reminder_sent = true,
                claimant_reminder_sent_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_active = true
            RETURNING id, claimant_reminder_sent, claimant_reminder_sent_at
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        // TODO: Implement actual email/SMS reminder logic
        // For now, just mark as sent
        
        res.json({
            success: true,
            message: 'Claimant reminder sent successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to send claimant reminder', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to send claimant reminder'
        });
    }
});

// Update billing authorization
router.put('/jobs/:id/billing-authorization', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { authorization_obtained, notes } = req.body;
        
        const result = await db.query(`
            UPDATE jobs SET
                billing_authorization_obtained = $1,
                billing_authorization_obtained_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
                billing_authorization_notes = $2,
                status = CASE WHEN $1 = true THEN 'approved' ELSE 'assigned' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND is_active = true
            RETURNING id, billing_authorization_obtained, status
        `, [authorization_obtained, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Billing authorization updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        await loggerService.error('Failed to update billing authorization', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update billing authorization'
        });
    }
});

// Reminder management routes
router.post('/reminders/process', 
  authenticateToken,
  reminderController.processReminders
);

router.get('/reminders/upcoming', 
  authenticateToken,
  reminderController.getUpcomingReminders
);

router.get('/reminders/job/:jobId', 
  authenticateToken,
  reminderController.getJobReminderStatus
);

// Individual reminder routes
router.post('/reminders/job/:jobId/claimant', 
  authenticateToken,
  reminderController.sendClaimantReminder
);

router.post('/reminders/job/:jobId/interpreter-2day', 
  authenticateToken,
  reminderController.sendInterpreter2DayReminder
);

router.post('/reminders/job/:jobId/interpreter-1day', 
  authenticateToken,
  reminderController.sendInterpreter1DayReminder
);

router.post('/reminders/job/:jobId/interpreter-2hour', 
  authenticateToken,
  reminderController.sendInterpreter2HourReminder
);

router.post('/reminders/job/:jobId/interpreter-5minute', 
  authenticateToken,
  reminderController.sendInterpreter5MinuteReminder
);

// Get completion reports
router.get('/completion-reports', 
  authenticateToken,
  async (req, res) => {
    try {
      const query = `
        SELECT 
          j.id,
          j.title,
          j.status,
          j.completion_report_submitted,
          j.completion_report_submitted_at,
          j.completion_report_data,
          j.actual_duration_minutes,
          j.estimated_duration_minutes,
          j.hourly_rate,
          j.scheduled_date,
          j.scheduled_time,
          i.first_name as interpreter_first_name,
          i.last_name as interpreter_last_name,
          i.email as interpreter_email,
          cl.name as claimant_name,
          c.claim_number,
          st.name as service_type_name,
          l1.name as source_language_name,
          l2.name as target_language_name
        FROM jobs j
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN claimants cl ON j.claimant_id = cl.id
        LEFT JOIN claims c ON j.claim_id = c.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        WHERE j.completion_report_submitted = true
        ORDER BY j.completion_report_submitted_at DESC
      `;

      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      await loggerService.error('Failed to get completion reports', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get completion reports'
      });
    }
  }
);

// Get specific completion report
router.get('/completion-reports/:jobId', 
  authenticateToken,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const query = `
        SELECT 
          j.id,
          j.title,
          j.status,
          j.completion_report_submitted,
          j.completion_report_submitted_at,
          j.completion_report_data,
          j.actual_duration_minutes,
          j.estimated_duration_minutes,
          j.hourly_rate,
          j.scheduled_date,
          j.scheduled_time,
          j.location_address,
          j.location_city,
          j.location_state,
          i.first_name as interpreter_first_name,
          i.last_name as interpreter_last_name,
          i.email as interpreter_email,
          cl.name as claimant_name,
          c.claim_number,
          st.name as service_type_name,
          l1.name as source_language_name,
          l2.name as target_language_name
        FROM jobs j
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN claimants cl ON j.claimant_id = cl.id
        LEFT JOIN claims c ON j.claim_id = c.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        WHERE j.id = $1
      `;

      const result = await db.query(query, [jobId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      await loggerService.error('Failed to get completion report', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get completion report'
      });
    }
  }
);

module.exports = router;