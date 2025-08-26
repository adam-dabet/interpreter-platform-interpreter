const express = require('express');
const router = express.Router();
const db = require('../config/database');
const loggerService = require('../services/loggerService');
const { validationLogger } = require('../middleware/logging');

// Get all service types
router.get('/service-types', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT st.id, st.code, st.name, st.description, st.sort_order,
                   str.rate_amount as platform_rate_amount, 
                   str.rate_unit as platform_rate_unit,
                   str.minimum_hours as platform_minimum_hours,
                   str.interval_minutes as platform_interval_minutes,
                   str.second_interval_rate_amount as platform_second_interval_rate_amount,
                   str.second_interval_rate_unit as platform_second_interval_rate_unit
            FROM service_types st
            LEFT JOIN service_type_rates str ON st.id = str.service_type_id
            WHERE st.is_active = true 
            ORDER BY st.sort_order ASC, st.name ASC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve service types', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve service types'
        });
    }
});

// Get all languages
router.get('/languages', async (req, res) => {
    try {
        const result = await db.query('SELECT id, code, name, native_name, sort_order FROM languages WHERE is_active = true ORDER BY sort_order ASC, name ASC');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve languages', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve languages'
        });
    }
});

// Get all interpreter types
router.get('/interpreter-types', async (req, res) => {
    try {
        const result = await db.query('SELECT id, code, name, description, sort_order FROM interpreter_types WHERE is_active = true ORDER BY sort_order ASC, name ASC');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve interpreter types', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve interpreter types'
        });
    }
});



// Get all parametric data in one request (for form initialization)
router.get('/all', async (req, res) => {
    try {
        const [languages, serviceTypes, certificateTypes, interpreterTypes, usStates] = await Promise.all([
            db.query('SELECT id, code, name, native_name, sort_order FROM languages WHERE is_active = true ORDER BY sort_order ASC, name ASC'),
            db.query(`
                SELECT st.id, st.code, st.name, st.description, st.sort_order,
                       str.rate_amount as platform_rate_amount, 
                       str.rate_unit as platform_rate_unit,
                       str.minimum_hours as platform_minimum_hours,
                       str.interval_minutes as platform_interval_minutes,
                       str.second_interval_rate_amount as platform_second_interval_rate_amount,
                       str.second_interval_rate_unit as platform_second_interval_rate_unit
                FROM service_types st
                LEFT JOIN service_type_rates str ON st.id = str.service_type_id
                WHERE st.is_active = true 
                ORDER BY st.sort_order ASC, st.name ASC
            `),
            db.query('SELECT id, code, name, description, is_required, sort_order FROM certificate_types WHERE is_active = true ORDER BY is_required DESC, sort_order ASC, name ASC'),
            db.query('SELECT id, code, name, description, sort_order FROM interpreter_types WHERE is_active = true ORDER BY sort_order ASC, name ASC'),
            db.query('SELECT id, code, name FROM us_states WHERE is_active = true ORDER BY name ASC')
        ]);
        
        const data = {
            languages: languages.rows,
            serviceTypes: serviceTypes.rows,
            certificateTypes: certificateTypes.rows,
            interpreterTypes: interpreterTypes.rows,
            usStates: usStates.rows
        };
        
        await loggerService.info('All parametric data retrieved', {
            category: 'API',
            req,
            counts: {
                languages: data.languages.length,
                serviceTypes: data.serviceTypes.length,
                certificateTypes: data.certificateTypes.length,
                interpreterTypes: data.interpreterTypes.length,
                usStates: data.usStates.length
            }
        });
        
        res.json({
            success: true,
            data
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve parametric data', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve parametric data'
        });
    }
});

module.exports = router;