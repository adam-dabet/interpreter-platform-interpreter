const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
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

// Interpreter profile management routes (protected)
router.get('/profiles/pending', authenticateToken, adminController.getPendingProfiles);
router.get('/profiles', authenticateToken, adminController.getAllProfiles); // New route for all applications
router.get('/profiles/:profileId', authenticateToken, adminController.getProfileDetails);
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
            // General Rates
            { service_category: 'general', rate_type: 'A', rate_amount: 140.00, time_minutes: 120 },
            { service_category: 'general', rate_type: 'B', rate_amount: 70.00, time_minutes: 60 },
            // Legal Rates
            { service_category: 'legal', rate_type: 'A', rate_amount: 330.00, time_minutes: 180 },
            { service_category: 'legal', rate_type: 'B', rate_amount: 330.00, time_minutes: 180 },
            // Medical Certified Rates
            { service_category: 'medical_certified', rate_type: 'A', rate_amount: 200.00, time_minutes: 120 },
            { service_category: 'medical_certified', rate_type: 'B', rate_amount: 100.00, time_minutes: 60 },
            // Psychological Rates
            { service_category: 'psychological', rate_type: 'A', rate_amount: 200.00, time_minutes: 120 },
            { service_category: 'psychological', rate_type: 'B', rate_amount: 100.00, time_minutes: 60 },
            // Routine Visits Rates
            { service_category: 'routine_visits', rate_type: 'A', rate_amount: 140.00, time_minutes: 120 },
            { service_category: 'routine_visits', rate_type: 'B', rate_amount: 70.00, time_minutes: 60 }
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
        
        // Validate required fields
        if (rate_amount === undefined || time_minutes === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Rate amount and time minutes are required'
            });
        }
        
        const result = await db.query(`
            UPDATE billing_account_rates SET
                rate_amount = $1,
                time_minutes = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND billing_account_id = $4
            RETURNING id, service_category, rate_type, rate_amount, time_minutes
        `, [rate_amount, time_minutes, rateId, accountId]);
        
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
            SELECT c.id, c.name, c.email, c.phone, c.title, c.is_active, c.created_at, c.updated_at,
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
        const { name, email, phone, title, billing_account_id, is_active } = req.body;
        
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
                is_active = $6,
                last_updated_by = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING id, name, email, phone, title, billing_account_id, is_active, created_at, updated_at
        `, [name, email, phone, title, billing_account_id, is_active, req.user.id, id]);
        
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
            SELECT cl.id, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, cl.address, 
                   cl.is_active, cl.created_at, cl.updated_at,
                   ba.name as billing_account_name,
                   COUNT(c.id) as claims_count
            FROM claimants cl
            LEFT JOIN billing_accounts ba ON cl.billing_account_id = ba.id
            LEFT JOIN claims c ON cl.id = c.claimant_id AND c.is_active = true
            WHERE cl.is_active = true 
            GROUP BY cl.id, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, cl.address, 
                     cl.is_active, cl.created_at, cl.updated_at, ba.name
            ORDER BY cl.name ASC
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
            SELECT cl.id, cl.name, cl.gender, cl.date_of_birth, cl.phone, cl.language, cl.billing_account_id, 
                   cl.address, cl.is_active, cl.created_at, cl.updated_at,
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
            SELECT id, case_type, claim_number, date_of_injury, diagnosis, is_active, created_at, updated_at
            FROM claims
            WHERE claimant_id = $1 AND is_active = true
            ORDER BY created_at DESC
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
        const { name, gender, date_of_birth, phone, language, billing_account_id, address } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO claimants (name, gender, date_of_birth, phone, language, billing_account_id, address, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, gender, date_of_birth, phone, language, billing_account_id, address, is_active, created_at, updated_at
        `, [name, gender, date_of_birth, phone, language, billing_account_id, address, req.user.id]);
        
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
        const { name, gender, date_of_birth, phone, language, billing_account_id, address, is_active } = req.body;
        
        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const result = await db.query(`
            UPDATE claimants SET
                name = $1,
                gender = $2,
                date_of_birth = $3,
                phone = $4,
                language = $5,
                billing_account_id = $6,
                address = $7,
                is_active = $8,
                last_updated_by = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING id, name, gender, date_of_birth, phone, language, billing_account_id, address, is_active, created_at, updated_at
        `, [name, gender, date_of_birth, phone, language, billing_account_id, address, is_active, req.user.id, id]);
        
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
                   c.is_active, c.created_at, c.updated_at,
                   cl.name as claimant_name, cl.id as claimant_id
            FROM claims c
            JOIN claimants cl ON c.claimant_id = cl.id
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
            SELECT id, case_type, claim_number, date_of_injury, diagnosis, is_active, created_at, updated_at
            FROM claims
            WHERE claimant_id = $1 AND is_active = true
            ORDER BY created_at DESC
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
        const { claimant_id, case_type, claim_number, date_of_injury, diagnosis } = req.body;
        
        // Validate required fields
        if (!claimant_id || !case_type || !claim_number) {
            return res.status(400).json({
                success: false,
                message: 'Claimant ID, case type, and claim number are required'
            });
        }
        
        const result = await db.query(`
            INSERT INTO claims (claimant_id, case_type, claim_number, date_of_injury, diagnosis, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, claimant_id, case_type, claim_number, date_of_injury, diagnosis, is_active, created_at, updated_at
        `, [claimant_id, case_type, claim_number, date_of_injury, diagnosis, req.user.id]);
        
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
        const { case_type, claim_number, date_of_injury, diagnosis, is_active } = req.body;
        
        // Validate required fields
        if (!case_type || !claim_number) {
            return res.status(400).json({
                success: false,
                message: 'Case type and claim number are required'
            });
        }
        
        const result = await db.query(`
            UPDATE claims SET
                case_type = $1,
                claim_number = $2,
                date_of_injury = $3,
                diagnosis = $4,
                is_active = $5,
                last_updated_by = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, claimant_id, case_type, claim_number, date_of_injury, diagnosis, is_active, created_at, updated_at
        `, [case_type, claim_number, date_of_injury, diagnosis, is_active, req.user.id, id]);
        
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

module.exports = router;