const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const reminderController = require('../controllers/reminderController');
const Interpreter = require('../models/Interpreter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { body } = require('express-validator');
const db = require('../config/database');
const loggerService = require('../services/loggerService');
const { generateJobNumberWithRetry } = require('../utils/jobNumberGenerator');
const AuditService = require('../services/auditService');

// Login
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  authController.login
);

// Logout
router.post('/logout', authController.logout);

// Apply authentication and audit middleware to all protected routes
router.use(authenticateToken, auditMiddleware());

// Get profile (protected)
router.get('/profile', authController.getProfile);

// Dashboard routes (protected)
router.get('/dashboard/stats', adminController.getDashboardStats);

// Job authorization routes (protected)
router.post('/jobs/:jobId/authorize',  adminController.authorizeJob);
router.post('/jobs/:jobId/reject', 
  [
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  adminController.rejectJob
);

// Interpreter profile management routes (protected)
router.get('/profiles/pending',  adminController.getPendingProfiles);
router.get('/profiles/:profileId',  adminController.getProfileDetails);
router.get('/profiles',  adminController.getAllProfiles); // New route for all applications
router.put('/profiles/:profileId/status', 
  [
    body('status').isIn(['draft', 'pending', 'under_review', 'approved', 'rejected', 'suspended']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.updateProfileStatus
);

// Specific approve/reject routes (protected)
router.post('/profiles/:profileId/approve', 
  [
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.approveProfile
);
router.post('/profiles/:profileId/reject', 
  [
    body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  adminController.rejectProfile
);

// Delete profile route (protected)
router.delete('/profiles/:profileId',  adminController.deleteProfile);

// Get all service locations
router.get('/service-locations',  async (req, res) => {
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
router.get('/service-locations/:id',  async (req, res) => {
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
router.post('/service-locations',  async (req, res) => {
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
router.put('/service-locations/:id',  async (req, res) => {
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
router.delete('/service-locations/:id',  async (req, res) => {
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
router.get('/billing-accounts',  async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, phone, email, address, is_active, created_at, updated_at
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
router.get('/billing-accounts/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get billing account details
        const accountResult = await db.query(`
            SELECT id, name, phone, email, address, is_active, created_at, updated_at
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
router.post('/billing-accounts',  async (req, res) => {
    try {
        const { name, phone, email, address, rates } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        // Insert billing account
        const accountResult = await db.query(`
            INSERT INTO billing_accounts (name, phone, email, address, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, phone, email, address, is_active, created_at, updated_at
        `, [name, phone, email, address, req.user.id]);
        
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
router.put('/billing-accounts/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, address, is_active } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        // Only update is_active if it's explicitly provided in the request
        let updateQuery;
        let updateParams;
        
        if (is_active !== undefined) {
            // is_active was explicitly provided, update it
            updateQuery = `
                UPDATE billing_accounts SET
                    name = $1,
                    phone = $2,
                    email = $3,
                    address = $4,
                    is_active = $5,
                    last_updated_by = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING id, name, phone, email, address, is_active, created_at, updated_at
            `;
            updateParams = [name, phone, email, address, is_active, req.user.id, id];
        } else {
            // is_active was not provided, don't update it
            updateQuery = `
                UPDATE billing_accounts SET
                    name = $1,
                    phone = $2,
                    email = $3,
                    address = $4,
                    last_updated_by = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING id, name, phone, email, address, is_active, created_at, updated_at
            `;
            updateParams = [name, phone, email, address, req.user.id, id];
        }
        
        const result = await db.query(updateQuery, updateParams);
        
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
router.put('/billing-accounts/:accountId/rates/:rateId',  async (req, res) => {
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
router.delete('/billing-accounts/:id',  async (req, res) => {
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
router.get('/customers',  async (req, res) => {
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
router.get('/customers/:id',  async (req, res) => {
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
router.post('/customers',  async (req, res) => {
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
router.put('/customers/:id',  async (req, res) => {
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
router.delete('/customers/:id',  async (req, res) => {
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
router.get('/claimants',  async (req, res) => {
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
router.get('/claimants/:id',  async (req, res) => {
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
router.post('/claimants',  async (req, res) => {
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
router.put('/claimants/:id',  async (req, res) => {
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
router.delete('/claimants/:id',  async (req, res) => {
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
router.get('/claims',  async (req, res) => {
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
router.get('/claimants/:claimantId/claims',  async (req, res) => {
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
router.post('/claims',  async (req, res) => {
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
router.put('/claims/:id',  async (req, res) => {
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
router.delete('/claims/:id',  async (req, res) => {
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
router.get('/jobs/stats',  async (req, res) => {
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

// Change interpreter for a job
// Assign interpreter to a job (for jobs in finding_interpreter status)
router.post('/jobs/:id/assign-interpreter', async (req, res) => {
    try {
        const { id } = req.params;
        const { interpreter_id } = req.body;
        
        if (!interpreter_id) {
            return res.status(400).json({
                success: false,
                message: 'Interpreter ID is required'
            });
        }
        
        // Get current job details
        const jobResult = await db.query(`
            SELECT j.*, jt.name as interpreter_type_name
            FROM jobs j
            LEFT JOIN interpreter_types jt ON j.interpreter_type_id = jt.id
            WHERE j.id = $1
        `, [id]);
        
        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobResult.rows[0];
        
        // Check if job is in finding_interpreter status
        if (job.status !== 'finding_interpreter') {
            return res.status(400).json({
                success: false,
                message: 'Job must be in finding_interpreter status to assign an interpreter'
            });
        }
        
        // Check if job already has an assigned interpreter
        if (job.assigned_interpreter_id) {
            return res.status(400).json({
                success: false,
                message: 'Job already has an assigned interpreter'
            });
        }
        
        // Get interpreter details
        const interpreterResult = await db.query(`
            SELECT id, first_name, last_name, email, phone
            FROM interpreters 
            WHERE id = $1 AND profile_status = 'approved'
        `, [interpreter_id]);
        
        if (interpreterResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Interpreter not found or not approved'
            });
        }
        
        const interpreter = interpreterResult.rows[0];
        
        // Update the job with assigned interpreter
        const updateResult = await db.query(`
            UPDATE jobs 
            SET assigned_interpreter_id = $1, 
                status = 'assigned',
                assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [interpreter_id, id]);
        
        // Log the assignment
        await loggerService.info('Interpreter assigned to job', {
            category: 'ADMIN_ACTION',
            jobId: id,
            jobNumber: job.job_number,
            interpreterId: interpreter_id,
            interpreterName: `${interpreter.first_name} ${interpreter.last_name}`,
            assignedBy: req.user.id
        });
        
        // Send notification email to interpreter
        try {
            const emailService = require('../services/emailService');
            await emailService.queueEmail(
                'interpreter_assigned',
                interpreter.email,
                `${interpreter.first_name} ${interpreter.last_name}`,
                {
                    jobNumber: job.job_number,
                    jobTitle: job.title,
                    scheduledDate: job.scheduled_date,
                    scheduledTime: job.scheduled_time,
                    location: job.location_address || `${job.location_city}, ${job.location_state}`,
                    clientName: job.client_name,
                    clientEmail: job.client_email,
                    clientPhone: job.client_phone,
                    interpreterType: job.interpreter_type_name,
                    estimatedDuration: job.estimated_duration_minutes
                }
            );
        } catch (emailError) {
            console.error('Error sending assignment email:', emailError);
            // Don't fail the assignment if email fails
        }
        
        res.json({
            success: true,
            message: 'Interpreter assigned successfully',
            data: {
                job: updateResult.rows[0],
                newInterpreter: interpreter
            }
        });
        
    } catch (error) {
        console.error('Error assigning interpreter:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

router.put('/jobs/:id/change-interpreter',  async (req, res) => {
    try {
        const { id } = req.params;
        const { interpreter_id, reason } = req.body;
        
        if (!interpreter_id) {
            return res.status(400).json({
                success: false,
                message: 'Interpreter ID is required'
            });
        }
        
        // Get current job details
        const jobResult = await db.query(`
            SELECT j.*, i.first_name, i.last_name, i.email as current_interpreter_email
            FROM jobs j
            LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
            WHERE j.id = $1
        `, [id]);
        
        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobResult.rows[0];
        
        // Get new interpreter details
        const newInterpreterResult = await db.query(`
            SELECT id, first_name, last_name, email, phone
            FROM interpreters 
            WHERE id = $1 AND profile_status = 'approved'
        `, [interpreter_id]);
        
        if (newInterpreterResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Interpreter not found or not approved'
            });
        }
        
        const newInterpreter = newInterpreterResult.rows[0];
        
        // Update the job with new interpreter
        const updateResult = await db.query(`
            UPDATE jobs 
            SET assigned_interpreter_id = $1, 
                status = CASE 
                    WHEN status = 'cancelled' THEN 'assigned'
                    ELSE status 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [interpreter_id, id]);
        
        // Log the change
        await loggerService.info('Interpreter changed for job', {
            category: 'ADMIN_ACTION',
            jobId: id,
            jobNumber: job.job_number,
            previousInterpreterId: job.assigned_interpreter_id,
            previousInterpreterName: job.current_interpreter_email ? `${job.first_name} ${job.last_name}` : 'None',
            newInterpreterId: interpreter_id,
            newInterpreterName: `${newInterpreter.first_name} ${newInterpreter.last_name}`,
            reason: reason || 'No reason provided',
            changedBy: req.user.id
        });
        
        // Send notification email to new interpreter
        try {
            const emailService = require('../services/emailService');
            await emailService.queueEmail(
                'interpreter_assigned',
                newInterpreter.email,
                `${newInterpreter.first_name} ${newInterpreter.last_name}`,
                {
                    jobNumber: job.job_number,
                    jobTitle: job.title,
                    scheduledDate: job.scheduled_date,
                    scheduledTime: job.scheduled_time,
                    location: job.is_remote ? 'Remote' : `${job.location_address}, ${job.location_city}, ${job.location_state}`,
                    reason: reason || 'Interpreter assignment changed'
                },
                'normal'
            );
        } catch (emailError) {
            console.error('Failed to send notification email:', emailError);
            // Don't fail the entire operation if email fails
        }
        
        res.json({
            success: true,
            message: 'Interpreter changed successfully',
            data: {
                job: updateResult.rows[0],
                newInterpreter: newInterpreter
            }
        });
        
    } catch (error) {
        console.error('Error changing interpreter:', error);
        await loggerService.error('Failed to change interpreter', {
            category: 'ADMIN_ACTION',
            jobId: req.params.id,
            error: error.message,
            changedBy: req.user.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get available interpreters for a job
router.get('/jobs/:id/available-interpreters',  async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get job details to filter interpreters
        const jobResult = await db.query(`
            SELECT j.interpreter_type_id, j.source_language_id, j.scheduled_date, j.scheduled_time,
                   j.location_address, j.location_city, j.location_state, j.is_remote
            FROM jobs j
            WHERE j.id = $1
        `, [id]);
        
        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobResult.rows[0];
        
        // Get available interpreters based on job requirements
        const interpretersResult = await db.query(`
            SELECT DISTINCT i.id, i.first_name, i.last_name, i.email, i.phone,
                   i.profile_status, i.years_of_experience,
                   STRING_AGG(DISTINCT l.name, ', ') as languages,
                   STRING_AGG(DISTINCT st.name, ', ') as service_types
            FROM interpreters i
            LEFT JOIN interpreter_languages il ON i.id = il.interpreter_id
            LEFT JOIN languages l ON il.language_id = l.id
            LEFT JOIN interpreter_service_rates isr ON i.id = isr.interpreter_id
            LEFT JOIN service_types st ON isr.service_type_id = st.id
            WHERE i.profile_status = 'approved'
            AND ($1::uuid IS NULL OR EXISTS (
                SELECT 1 FROM interpreter_languages il2 
                WHERE il2.interpreter_id = i.id AND il2.language_id = $1
            ))
            GROUP BY i.id, i.first_name, i.last_name, i.email, i.phone, 
                     i.profile_status, i.years_of_experience
            ORDER BY i.first_name, i.last_name
        `, [job.source_language_id]);
        
        res.json({
            success: true,
            data: interpretersResult.rows
        });
        
    } catch (error) {
        console.error('Error getting available interpreters:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get email history
router.get('/emails',  async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            email_type, 
            recipient_email,
            job_id,
            date_from,
            date_to
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 0;
        
        if (status) {
            paramCount++;
            whereConditions.push(`et.status = $${paramCount}`);
            queryParams.push(status);
        }
        
        if (email_type) {
            paramCount++;
            whereConditions.push(`et.email_type = $${paramCount}`);
            queryParams.push(email_type);
        }
        
        if (recipient_email) {
            paramCount++;
            whereConditions.push(`et.recipient_email ILIKE $${paramCount}`);
            queryParams.push(`%${recipient_email}%`);
        }
        
        if (job_id) {
            paramCount++;
            whereConditions.push(`et.job_id = $${paramCount}`);
            queryParams.push(job_id);
        }
        
        if (date_from) {
            paramCount++;
            whereConditions.push(`et.sent_at >= $${paramCount}`);
            queryParams.push(date_from);
        }
        
        if (date_to) {
            paramCount++;
            whereConditions.push(`et.sent_at <= $${paramCount}`);
            queryParams.push(date_to);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM email_tracking et
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        
        // Get emails with pagination
        paramCount++;
        const limitParam = `$${paramCount}`;
        paramCount++;
        const offsetParam = `$${paramCount}`;
        
        const emailsQuery = `
            SELECT 
                et.*,
                j.job_number,
                j.title as job_title,
                i.first_name as interpreter_first_name,
                i.last_name as interpreter_last_name,
                c.name as customer_name
            FROM email_tracking et
            LEFT JOIN jobs j ON et.job_id = j.id
            LEFT JOIN interpreters i ON et.interpreter_id = i.id
            LEFT JOIN customers c ON et.customer_id = c.id
            ${whereClause}
            ORDER BY et.created_at DESC
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;
        
        const emailsResult = await db.query(emailsQuery, [...queryParams, limit, offset]);
        
        res.json({
            success: true,
            data: emailsResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching email history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get email statistics
router.get('/emails/stats',  async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        
        if (date_from && date_to) {
            whereClause = 'WHERE et.sent_at BETWEEN $1 AND $2';
            queryParams = [date_from, date_to];
        }
        
        const statsQuery = `
            SELECT 
                et.status,
                et.email_type,
                COUNT(*) as count
            FROM email_tracking et
            ${whereClause}
            GROUP BY et.status, et.email_type
            ORDER BY et.status, et.email_type
        `;
        
        const result = await db.query(statsQuery, queryParams);
        
        // Process stats into a more useful format
        const stats = {
            byStatus: {},
            byType: {},
            total: 0
        };
        
        result.rows.forEach(row => {
            stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + parseInt(row.count);
            stats.byType[row.email_type] = (stats.byType[row.email_type] || 0) + parseInt(row.count);
            stats.total += parseInt(row.count);
        });
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error fetching email stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get email details
router.get('/emails/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                et.*,
                j.job_number,
                j.title as job_title,
                i.first_name as interpreter_first_name,
                i.last_name as interpreter_last_name,
                c.name as customer_name
            FROM email_tracking et
            LEFT JOIN jobs j ON et.job_id = j.id
            LEFT JOIN interpreters i ON et.interpreter_id = i.id
            LEFT JOIN customers c ON et.customer_id = c.id
            WHERE et.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching email details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get SMS history with filtering and pagination
router.get('/sms',  async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            sms_type, 
            recipient_phone, 
            date_from, 
            date_to 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Build WHERE conditions
        const whereConditions = [];
        const queryParams = [];
        let paramCount = 0;
        
        if (status) {
            paramCount++;
            whereConditions.push(`st.status = $${paramCount}`);
            queryParams.push(status);
        }
        
        if (sms_type) {
            paramCount++;
            whereConditions.push(`st.sms_type = $${paramCount}`);
            queryParams.push(sms_type);
        }
        
        if (recipient_phone) {
            paramCount++;
            whereConditions.push(`st.recipient_phone ILIKE $${paramCount}`);
            queryParams.push(`%${recipient_phone}%`);
        }
        
        if (date_from) {
            paramCount++;
            whereConditions.push(`st.sent_at >= $${paramCount}`);
            queryParams.push(date_from);
        }
        
        if (date_to) {
            paramCount++;
            whereConditions.push(`st.sent_at <= $${paramCount}`);
            queryParams.push(date_to);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM sms_tracking st
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);
        
        // Get SMS with pagination
        paramCount++;
        const limitParam = `$${paramCount}`;
        paramCount++;
        const offsetParam = `$${paramCount}`;
        
        const smsQuery = `
            SELECT 
                st.*,
                j.job_number,
                j.title as job_title,
                i.first_name as interpreter_first_name,
                i.last_name as interpreter_last_name,
                c.name as customer_name
            FROM sms_tracking st
            LEFT JOIN jobs j ON st.job_id = j.id
            LEFT JOIN interpreters i ON st.interpreter_id = i.id
            LEFT JOIN customers c ON st.customer_id = c.id
            ${whereClause}
            ORDER BY st.created_at DESC
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;
        
        const smsResult = await db.query(smsQuery, [...queryParams, limit, offset]);
        
        res.json({
            success: true,
            data: smsResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching SMS history:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get SMS statistics
router.get('/sms/stats',  async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        
        if (date_from && date_to) {
            whereClause = 'WHERE st.sent_at BETWEEN $1 AND $2';
            queryParams = [date_from, date_to];
        }
        
        const statsQuery = `
            SELECT 
                st.status,
                st.sms_type,
                COUNT(*) as count
            FROM sms_tracking st
            ${whereClause}
            GROUP BY st.status, st.sms_type
            ORDER BY st.status, st.sms_type
        `;
        
        const result = await db.query(statsQuery, queryParams);
        
        // Process stats into a more useful format
        const stats = {
            byStatus: {},
            byType: {},
            total: 0
        };
        
        result.rows.forEach(row => {
            stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + parseInt(row.count);
            stats.byType[row.sms_type] = (stats.byType[row.sms_type] || 0) + parseInt(row.count);
            stats.total += parseInt(row.count);
        });
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error fetching SMS stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get SMS details
router.get('/sms/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                st.*,
                j.job_number,
                j.title as job_title,
                i.first_name as interpreter_first_name,
                i.last_name as interpreter_last_name,
                c.name as customer_name
            FROM sms_tracking st
            LEFT JOIN jobs j ON st.job_id = j.id
            LEFT JOIN interpreters i ON st.interpreter_id = i.id
            LEFT JOIN customers c ON st.customer_id = c.id
            WHERE st.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'SMS not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching SMS details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send SMS message
router.post('/sms/send',  async (req, res) => {
    try {
        const { recipientPhone, message, jobId, recipientName, smsType, recipientId, recipientType } = req.body;
        
        // Debug logging
        console.log('SMS Send Request Body:', {
            recipientPhone,
            message,
            jobId,
            recipientName,
            smsType,
            recipientId,
            recipientType
        });
        
        if (!recipientPhone || !message) {
            console.log('Validation failed: missing phone or message');
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }

        const smsService = require('../services/smsService');
        
        // Determine tracking data based on recipient type
        let trackingData = {
            smsType: smsType || 'manual_message',
            recipientName: recipientName || 'Manual Message',
            jobId: jobId || null,
            interpreterId: null,
            customerId: null,
            reminderType: null
        };

        // Set appropriate ID based on recipient type
        if (recipientType === 'interpreter' && recipientId) {
            trackingData.interpreterId = parseInt(recipientId);
        } else if (recipientType === 'claimant' && recipientId) {
            trackingData.customerId = parseInt(recipientId);
        }
        
        // Send SMS with tracking
        console.log('Sending SMS with tracking data:', trackingData);
        const result = await smsService.sendSMS(recipientPhone, message, trackingData);

        console.log('SMS sent successfully:', result);
        
        // Log the SMS send action
        await AuditService.logAction({
            userId: req.user.userId,
            username: req.user.username,
            action: 'SMS_SEND',
            resourceType: 'SMS',
            resourceId: result.trackingId,
            details: {
                recipient_phone: recipientPhone,
                recipient_name: recipientName,
                recipient_type: recipientType,
                job_id: jobId,
                message_length: message.length,
                sms_type: smsType
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            data: result,
            message: 'SMS sent successfully'
        });
        
    } catch (error) {
        console.error('Error sending SMS:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            success: false,
            message: 'Failed to send SMS',
            error: error.message
        });
    }
});

// Get SMS for a specific job
router.get('/jobs/:id/sms',  async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                st.*,
                j.job_number,
                j.title as job_title
            FROM sms_tracking st
            LEFT JOIN jobs j ON st.job_id = j.id
            WHERE st.job_id = $1
            ORDER BY st.created_at DESC
        `, [id]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching job SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get emails for a specific job
router.get('/jobs/:id/emails',  async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                et.*,
                j.job_number,
                j.title as job_title
            FROM email_tracking et
            LEFT JOIN jobs j ON et.job_id = j.id
            WHERE et.job_id = $1
            ORDER BY et.created_at DESC
        `, [id]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching job emails:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all jobs
router.get('/jobs',  async (req, res) => {
    try {
        const { 
            status, 
            dateRange, 
            needsInterpreter, 
            needsConfirmation, 
            needsInterpreterConfirmation,
            needsBilling, 
            needsPayment, 
            isRemote, 
            priority, 
            search 
        } = req.query;

        // Build WHERE clause dynamically
        let whereClause = 'WHERE j.is_active = true';
        const queryParams = [];
        let paramCounter = 1;

        // Status filter
        if (status && status !== 'all') {
            whereClause += ` AND j.status = $${paramCounter}`;
            queryParams.push(status);
            paramCounter++;
        }

        // Date range filter
        if (dateRange && dateRange !== 'all') {
            const now = new Date();
            let dateCondition = '';
            
            switch (dateRange) {
                case 'today':
                    dateCondition = `j.scheduled_date = CURRENT_DATE`;
                    break;
                case 'tomorrow':
                    dateCondition = `j.scheduled_date = CURRENT_DATE + INTERVAL '1 day'`;
                    break;
                case 'this_week':
                    dateCondition = `j.scheduled_date >= DATE_TRUNC('week', CURRENT_DATE) AND j.scheduled_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
                    break;
                case 'next_week':
                    dateCondition = `j.scheduled_date >= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week' AND j.scheduled_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '2 weeks'`;
                    break;
                case 'this_month':
                    dateCondition = `j.scheduled_date >= DATE_TRUNC('month', CURRENT_DATE) AND j.scheduled_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`;
                    break;
                case 'past':
                    dateCondition = `j.scheduled_date < CURRENT_DATE`;
                    break;
                case 'upcoming':
                    dateCondition = `j.scheduled_date >= CURRENT_DATE`;
                    break;
            }
            
            if (dateCondition) {
                whereClause += ` AND ${dateCondition}`;
            }
        }

        // Needs interpreter filter - jobs that are in 'finding_interpreter' status
        if (needsInterpreter === 'true') {
            whereClause += ` AND j.status = 'finding_interpreter'`;
        }

        // Needs confirmation filter - jobs that haven't been confirmed with facility yet
        if (needsConfirmation === 'true') {
            whereClause += ` AND j.facility_confirmed = false`;
        }

        // Needs interpreter confirmation filter - jobs with assigned interpreters that have pending confirmation
        if (needsInterpreterConfirmation === 'true') {
            whereClause += ` AND j.assigned_interpreter_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM job_assignments ja 
                WHERE ja.job_id = j.id 
                AND ja.interpreter_id = j.assigned_interpreter_id 
                AND ja.status = 'accepted' 
                AND ja.confirmation_status = 'pending'
            )`;
        }

        // Needs billing filter - jobs that are completed but haven't been billed yet
        if (needsBilling === 'true') {
            whereClause += ` AND j.status = 'completed' AND j.status != 'billed'`;
        }

        // Needs payment filter - jobs that have completion report submitted but haven't been paid
        if (needsPayment === 'true') {
            whereClause += ` AND j.status = 'completion_report' AND j.payment_status != 'paid'`;
        }

        // Remote/In-person filter
        if (isRemote && isRemote !== 'all') {
            whereClause += ` AND j.is_remote = $${paramCounter}`;
            queryParams.push(isRemote === 'true');
            paramCounter++;
        }

        // Priority filter
        if (priority && priority !== 'all') {
            whereClause += ` AND j.priority = $${paramCounter}`;
            queryParams.push(priority);
            paramCounter++;
        }

        // Search filter
        if (search) {
            whereClause += ` AND (
                LOWER(j.job_number) LIKE LOWER($${paramCounter}) OR
                LOWER(j.title) LIKE LOWER($${paramCounter}) OR
                LOWER(j.client_name) LIKE LOWER($${paramCounter}) OR
                LOWER(c.first_name || ' ' || c.last_name) LIKE LOWER($${paramCounter}) OR
                LOWER(i.first_name || ' ' || i.last_name) LIKE LOWER($${paramCounter})
            )`;
            queryParams.push(`%${search}%`);
            paramCounter++;
        }

        const result = await db.query(`
            SELECT j.id, j.job_number, j.title, j.description, j.job_type, j.priority, j.status,
                   j.location_address, j.location_city, j.location_state, j.location_zip_code,
                   j.scheduled_date, j.scheduled_time, j.arrival_time, j.estimated_duration_minutes,
                   j.hourly_rate, j.total_amount, j.payment_status, j.client_name,
                   j.client_email, j.client_phone, j.client_notes, j.special_requirements,
                   j.admin_notes, j.appointment_type, j.is_remote, j.facility_confirmed,
                   j.created_at, j.updated_at,
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   c.phone as claimant_phone, c.address as claimant_address, 
                   c.city as claimant_city, c.state as claimant_state, c.zip_code as claimant_zip_code,
                   cl.claim_number, cl.case_type, cl.date_of_injury, cl.diagnosis,
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
                   tl.name as target_language_name,
                   creator.username as created_by_username,
                   creator.email as created_by_email
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
            LEFT JOIN customers req ON j.requested_by_id = req.id
            LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
            LEFT JOIN service_types st ON j.service_type_id = st.id
            LEFT JOIN languages sl ON j.source_language_id = sl.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            LEFT JOIN users creator ON j.created_by = creator.id
            ${whereClause}
            ORDER BY j.scheduled_date ASC, j.scheduled_time ASC
        `, queryParams);
        
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
router.get('/jobs/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT j.*, 
                   c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                   c.phone as claimant_phone, c.address as claimant_address, 
                   c.city as claimant_city, c.state as claimant_state, c.zip_code as claimant_zip_code,
                   cl.claim_number, cl.case_type, cl.date_of_injury, cl.diagnosis,
                   j.assigned_interpreter_id,
                   CASE 
                     WHEN i.first_name IS NOT NULL AND i.last_name IS NOT NULL 
                     THEN CONCAT(i.first_name, ' ', i.last_name) 
                     ELSE NULL 
                   END as assigned_interpreter_name,
                   i.first_name as interpreter_first_name, i.last_name as interpreter_last_name,
                   i.email as assigned_interpreter_email,
                   i.phone as assigned_interpreter_phone,
                   req.name as requested_by_name,
                   ba.name as billing_account_name, ba.id as billing_account_id,
                   it.code as interpreter_type_code, it.name as interpreter_type_name,
                   st.name as service_type_name, st.id as service_type_id,
                   sl.name as source_language_name, tl.name as target_language_name,
                   ja.confirmation_status,
                   ja.confirmed_at,
                   ja.confirmation_notes
            FROM jobs j
            LEFT JOIN claimants c ON j.claimant_id = c.id
            LEFT JOIN claims cl ON j.claim_id = cl.id
            LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
            LEFT JOIN customers req ON j.requested_by_id = req.id
            LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
            LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
            LEFT JOIN service_types st ON j.service_type_id = st.id
            LEFT JOIN languages sl ON j.source_language_id = sl.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            LEFT JOIN job_assignments ja ON j.id = ja.job_id AND j.assigned_interpreter_id = ja.interpreter_id
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

// Get billing account rates for a job
router.get('/jobs/:id/billing-rates',  async (req, res) => {
    try {
        const { id } = req.params;
        
        // First get the job details to find the billing account and interpreter type
        const jobResult = await db.query(`
            SELECT j.billing_account_id, j.interpreter_type_id, it.code as interpreter_type_code,
                   tl.name as target_language_name
            FROM jobs j
            LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
            LEFT JOIN languages tl ON j.target_language_id = tl.id
            WHERE j.id = $1 AND j.is_active = true
        `, [id]);
        
        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobResult.rows[0];
        
        // Map interpreter type and language to service category
        let serviceCategory = null;
        if (job.interpreter_type_code === 'qualified_standard') {
            serviceCategory = 'general_non_spanish';
        } else if (job.interpreter_type_code === 'court_certified') {
            serviceCategory = job.target_language_name?.toLowerCase() === 'spanish' ? 'legal_spanish' : 'legal_non_spanish';
        } else if (job.interpreter_type_code === 'medical_certified') {
            serviceCategory = 'medical_certified_non_spanish';
        }
        
        if (!serviceCategory) {
            return res.json({
                success: true,
                data: {
                    serviceCategory: null,
                    rates: []
                }
            });
        }
        
        // Get the billing account rates for this service category
        const ratesResult = await db.query(`
            SELECT service_category, rate_type, rate_amount, time_minutes
            FROM billing_account_rates
            WHERE billing_account_id = $1 AND service_category = $2 AND is_active = true
            ORDER BY rate_type ASC
        `, [job.billing_account_id, serviceCategory]);
        
        res.json({
            success: true,
            data: {
                serviceCategory: serviceCategory,
                rates: ratesResult.rows
            }
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve billing rates', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve billing rates'
        });
    }
});

// Create a new job
router.post('/jobs',  async (req, res) => {
    try {
        const { 
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id, notes
        } = req.body;
        
        // Validate required fields
        if (!title || !job_type || !priority || !status || !scheduled_date || !scheduled_time) {
            return res.status(400).json({
                success: false,
                message: 'Title, job type, priority, status, scheduled date, and scheduled time are required'
            });
        }
        
        // Generate unique job number
        const jobNumber = await generateJobNumberWithRetry();
        
        const result = await db.query(`
            INSERT INTO jobs (
                job_number, title, description, job_type, priority, status, location_address, location_city,
                location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
                estimated_duration_minutes, hourly_rate, total_amount, payment_status,
                client_name, client_email, client_phone, client_notes, special_requirements,
                admin_notes, appointment_type, is_remote, claimant_id, claim_id,
                requested_by_id, billing_account_id, interpreter_type_id, notes, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
            )
            RETURNING id, title, job_type, priority, status, scheduled_date, scheduled_time, created_at
        `, [
            jobNumber, // job_number
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id, notes, req.user.userId
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
router.put('/jobs/:id',  async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, description, job_type, priority, status, location_address, location_city,
            location_state, location_zip_code, facility_phone, scheduled_date, scheduled_time, arrival_time,
            estimated_duration_minutes, hourly_rate, total_amount, payment_status,
            client_name, client_email, client_phone, client_notes, special_requirements,
            admin_notes, appointment_type, is_remote, claimant_id, claim_id,
            requested_by_id, billing_account_id, interpreter_type_id, assigned_interpreter_id, notes
        } = req.body;
        
        // Build dynamic update query to only update fields that are provided
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        // Helper function to add field to update if it's provided
        const addField = (field, value) => {
            if (value !== undefined && value !== null) {
                updateFields.push(`${field} = $${++paramCount}`);
                updateValues.push(value);
            }
        };

        // Add fields that should always be updated
        addField('updated_by', req.user.id);
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // Add optional fields only if they are provided
        addField('title', title);
        addField('description', description);
        addField('job_type', job_type);
        addField('priority', priority);
        addField('status', status);
        addField('location_address', location_address);
        addField('location_city', location_city);
        addField('location_state', location_state);
        addField('location_zip_code', location_zip_code);
        addField('facility_phone', facility_phone);
        addField('scheduled_date', scheduled_date);
        addField('scheduled_time', scheduled_time);
        addField('arrival_time', arrival_time);
        addField('estimated_duration_minutes', estimated_duration_minutes);
        addField('hourly_rate', hourly_rate);
        addField('total_amount', total_amount);
        addField('payment_status', payment_status);
        addField('client_name', client_name);
        addField('client_email', client_email);
        addField('client_phone', client_phone);
        addField('client_notes', client_notes);
        addField('special_requirements', special_requirements);
        addField('admin_notes', admin_notes);
        addField('appointment_type', appointment_type);
        addField('is_remote', is_remote);
        addField('claimant_id', claimant_id);
        addField('claim_id', claim_id);
        addField('requested_by_id', requested_by_id);
        addField('billing_account_id', billing_account_id);
        addField('interpreter_type_id', interpreter_type_id);
        addField('assigned_interpreter_id', assigned_interpreter_id);
        addField('notes', notes);

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update'
            });
        }

        // Add WHERE clause parameter
        updateValues.push(id);

        const updateQuery = `
            UPDATE jobs SET
                ${updateFields.join(', ')}
            WHERE id = $${paramCount + 1}
            RETURNING id, title, job_type, priority, status, scheduled_date, scheduled_time, updated_at
        `;

        const result = await db.query(updateQuery, updateValues);
        
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

// Update facility confirmation status
router.put('/jobs/:id/facility-confirmation',  async (req, res) => {
    try {
        const { id } = req.params;
        const { facility_confirmed } = req.body;
        
        const result = await db.query(
            'UPDATE jobs SET facility_confirmed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, facility_confirmed',
            [facility_confirmed, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        // Log the action
        await AuditService.logAction({
            userId: req.user.userId,
            username: req.user.username,
            action: 'FACILITY_CONFIRMATION',
            resourceType: 'JOB',
            resourceId: id,
            details: {
                facility_confirmed: facility_confirmed,
                previous_value: !facility_confirmed
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Facility confirmation status updated successfully',
            data: {
                id: result.rows[0].id,
                facility_confirmed: result.rows[0].facility_confirmed
            }
        });
    } catch (error) {
        console.error('Error updating facility confirmation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update facility confirmation status'
        });
    }
});

// Delete a job (soft delete)
router.delete('/jobs/:id',  requireAdmin, async (req, res) => {
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
router.post('/jobs/:id/start',  async (req, res) => {
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
router.post('/jobs/:id/end',  async (req, res) => {
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
router.post('/jobs/:id/completion-report',  async (req, res) => {
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
router.post('/jobs/:id/notes',  async (req, res) => {
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
router.get('/jobs/:id/notes',  async (req, res) => {
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

// Get invoice PDF for a job
router.get('/jobs/:id/invoice',  async (req, res) => {
    try {
        const { id } = req.params;
        
        // First verify the job exists and is billed
        const jobResult = await db.query(`
            SELECT j.id, j.job_number, j.status
            FROM jobs j
            WHERE j.id = $1 AND j.is_active = true
        `, [id]);
        
        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        
        const job = jobResult.rows[0];
        
        if (job.status !== 'billed') {
            return res.status(400).json({
                success: false,
                message: 'Invoice is only available for billed jobs'
            });
        }
        
        // Look for the invoice PDF file
        const fs = require('fs');
        const path = require('path');
        const tempDir = './temp';
        
        if (!fs.existsSync(tempDir)) {
            return res.status(404).json({
                success: false,
                message: 'Invoice PDF not found'
            });
        }
        
        // Find the invoice PDF file
        const files = fs.readdirSync(tempDir);
        const invoiceFile = files.find(file => 
            file.includes(`invoice_${job.job_number}_`) && file.endsWith('.pdf')
        );
        
        if (!invoiceFile) {
            // Try to regenerate the invoice PDF
            try {
                const pdfInvoiceService = require('../services/pdfInvoiceService');
                
                // Get full job details for PDF generation
                const fullJobResult = await db.query(`
                    SELECT j.*, 
                           c.first_name as claimant_first_name, c.last_name as claimant_last_name,
                           c.date_of_birth as claimant_dob, c.employer,
                           cl.claim_number, cl.case_type, cl.date_of_injury, cl.diagnosis,
                           ba.name as billing_company_name, ba.address as billing_company_address,
                           st.name as service_type_name,
                           sl.name as source_language_name, tl.name as target_language_name,
                           it.name as interpreter_type_name
                    FROM jobs j
                    LEFT JOIN claimants c ON j.claimant_id = c.id
                    LEFT JOIN claims cl ON j.claim_id = cl.id
                    LEFT JOIN billing_accounts ba ON j.billing_account_id = ba.id
                    LEFT JOIN service_types st ON j.service_type_id = st.id
                    LEFT JOIN languages sl ON j.source_language_id = sl.id
                    LEFT JOIN languages tl ON j.target_language_id = tl.id
                    LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
                    WHERE j.id = $1
                `, [id]);
                
                if (fullJobResult.rows.length > 0) {
                    const jobData = fullJobResult.rows[0];
                    const pdfPath = await pdfInvoiceService.generateInvoicePDF(jobData);
                    
                    // Set headers and stream the file
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `inline; filename="invoice_${job.job_number}.pdf"`);
                    
                    const fileStream = fs.createReadStream(pdfPath);
                    fileStream.pipe(res);
                    
                    // Clean up the temporary file after streaming
                    fileStream.on('end', () => {
                        try {
                            fs.unlinkSync(pdfPath);
                        } catch (cleanupError) {
                            // Ignore cleanup errors
                        }
                    });
                    
                    return;
                }
            } catch (pdfError) {
                await loggerService.error('Failed to regenerate invoice PDF', pdfError, {
                    category: 'API',
                    jobId: id
                });
            }
            
            return res.status(404).json({
                success: false,
                message: 'Invoice PDF not found and could not be regenerated'
            });
        }
        
        const filePath = path.join(tempDir, invoiceFile);
        
        // Set headers and stream the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice_${job.job_number}.pdf"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        await loggerService.error('Failed to retrieve invoice PDF', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invoice PDF'
        });
    }
});

// Send claimant reminder
router.post('/jobs/:id/send-reminder',  async (req, res) => {
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
router.put('/jobs/:id/billing-authorization',  async (req, res) => {
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
  reminderController.processReminders
);

router.get('/reminders/upcoming', 
  reminderController.getUpcomingReminders
);

router.get('/reminders/job/:jobId', 
  reminderController.getJobReminderStatus
);

// Individual reminder routes
router.post('/reminders/job/:jobId/claimant', 
  reminderController.sendClaimantReminder
);

router.post('/reminders/job/:jobId/interpreter-2day', 
  reminderController.sendInterpreter2DayReminder
);

router.post('/reminders/job/:jobId/interpreter-1day', 
  reminderController.sendInterpreter1DayReminder
);

router.post('/reminders/job/:jobId/interpreter-2hour', 
  reminderController.sendInterpreter2HourReminder
);

router.post('/reminders/job/:jobId/interpreter-5minute', 
  reminderController.sendInterpreter5MinuteReminder
);

// Get completion reports
router.get('/completion-reports', 
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

// Interpreter Management Routes
// Get all interpreters
router.get('/interpreters', 
  async (req, res) => {
    try {
      const query = `
        SELECT 
          i.id,
          i.first_name,
          i.last_name,
          i.email,
          i.phone,
          i.profile_status,
          i.is_active,
          i.created_at,
          i.updated_at,
          s.name as state_name,
          s.code as state_code
        FROM interpreters i
        LEFT JOIN us_states s ON i.state_id = s.id
        WHERE i.is_active = true
        ORDER BY i.created_at DESC
      `;

      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      await loggerService.error('Failed to get interpreters', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get interpreters'
      });
    }
  }
);

// Get interpreter by ID
router.get('/interpreters/:id', 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const interpreter = await Interpreter.findById(id);
      
      if (!interpreter) {
        return res.status(404).json({
          success: false,
          message: 'Interpreter not found'
        });
      }

      res.json({
        success: true,
        data: interpreter
      });
    } catch (error) {
      await loggerService.error('Failed to get interpreter', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get interpreter'
      });
    }
  }
);

// Create new interpreter
// Get languages for forms
router.get('/languages', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM languages ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages'
    });
  }
});

// Get states for forms
router.get('/states', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, code FROM us_states WHERE is_active = true ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states'
    });
  }
});

// Get service types for forms
router.get('/service-types', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM service_types ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service types'
    });
  }
});

router.post('/interpreters', 
  async (req, res) => {
    try {
      const interpreterData = {
        ...req.body,
        created_by: req.user.id,
        profile_status: 'approved' // Admin-created interpreters are auto-approved
      };

      const interpreter = await Interpreter.create(interpreterData);
      
      res.status(201).json({
        success: true,
        message: 'Interpreter created successfully',
        data: interpreter
      });
    } catch (error) {
      await loggerService.error('Failed to create interpreter', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create interpreter'
      });
    }
  }
);

// Update interpreter
router.put('/interpreters/:id', 
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updated_by: req.user.id
      };

      const interpreter = await Interpreter.update(id, updateData);
      
      if (!interpreter) {
        return res.status(404).json({
          success: false,
          message: 'Interpreter not found'
        });
      }

      res.json({
        success: true,
        message: 'Interpreter updated successfully',
        data: interpreter
      });
    } catch (error) {
      await loggerService.error('Failed to update interpreter', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to update interpreter'
      });
    }
  }
);

// Delete interpreter (soft delete)
router.delete('/interpreters/:id', 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await db.query(
        'UPDATE interpreters SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Interpreter not found'
        });
      }

      res.json({
        success: true,
        message: 'Interpreter deleted successfully'
      });
    } catch (error) {
      await loggerService.error('Failed to delete interpreter', error, {
        category: 'API',
        req
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete interpreter'
      });
    }
  }
);

// ===== AUDIT LOG ROUTES =====

// Get audit logs with filtering and pagination
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      userId,
      action,
      resourceType,
      resourceId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await AuditService.getAuditLogs(filters);
    
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// Get audit logs for a specific resource
router.get('/audit-logs/resource/:resourceType/:resourceId', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    const logs = await AuditService.getResourceAuditLogs(resourceType, resourceId);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource audit logs',
      error: error.message
    });
  }
});

// Get user activity summary
router.get('/audit-logs/user/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const summary = await AuditService.getUserActivitySummary(userId, parseInt(days));
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity summary',
      error: error.message
    });
  }
});

// Get system activity statistics
router.get('/audit-logs/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await AuditService.getSystemActivityStats(parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching system activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system activity stats',
      error: error.message
    });
  }
});

module.exports = router;