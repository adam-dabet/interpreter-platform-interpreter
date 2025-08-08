const express = require('express');
const router = express.Router();
const db = require('../config/database');
const loggerService = require('../services/loggerService');
const { validationLogger } = require('../middleware/logging');

// Get all active languages
router.get('/languages', async (req, res) => {
    try {
        const query = `
            SELECT id, code, name, native_name, sort_order
            FROM languages 
            WHERE is_active = true 
            ORDER BY sort_order ASC, name ASC
        `;
        
        const result = await db.query(query);
        
        await loggerService.info('Languages retrieved', {
            category: 'API',
            req,
            count: result.rows.length
        });
        
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

// Get all active service types
router.get('/service-types', async (req, res) => {
    try {
        const query = `
            SELECT id, code, name, description, sort_order
            FROM service_types 
            WHERE is_active = true 
            ORDER BY sort_order ASC, name ASC
        `;
        
        const result = await db.query(query);
        
        await loggerService.info('Service types retrieved', {
            category: 'API',
            req,
            count: result.rows.length
        });
        
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

// Get all active certificate types
router.get('/certificate-types', async (req, res) => {
    try {
        const query = `
            SELECT id, code, name, description, is_required, sort_order
            FROM certificate_types 
            WHERE is_active = true 
            ORDER BY is_required DESC, sort_order ASC, name ASC
        `;
        
        const result = await db.query(query);
        
        await loggerService.info('Certificate types retrieved', {
            category: 'API',
            req,
            count: result.rows.length
        });
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve certificate types', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve certificate types'
        });
    }
});

// Get all US states
router.get('/us-states', async (req, res) => {
    try {
        const query = `
            SELECT id, code, name
            FROM us_states 
            WHERE is_active = true 
            ORDER BY name ASC
        `;
        
        const result = await db.query(query);
        
        await loggerService.info('US states retrieved', {
            category: 'API',
            req,
            count: result.rows.length
        });
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        await loggerService.error('Failed to retrieve US states', error, {
            category: 'API',
            req
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve US states'
        });
    }
});

// Get all parametric data in one request (for form initialization)
router.get('/all', async (req, res) => {
    try {
        const [languages, serviceTypes, certificateTypes, usStates] = await Promise.all([
            db.query('SELECT id, code, name, native_name, sort_order FROM languages WHERE is_active = true ORDER BY sort_order ASC, name ASC'),
            db.query('SELECT id, code, name, description, sort_order FROM service_types WHERE is_active = true ORDER BY sort_order ASC, name ASC'),
            db.query('SELECT id, code, name, description, is_required, sort_order FROM certificate_types WHERE is_active = true ORDER BY is_required DESC, sort_order ASC, name ASC'),
            db.query('SELECT id, code, name FROM us_states WHERE is_active = true ORDER BY name ASC')
        ]);
        
        const data = {
            languages: languages.rows,
            serviceTypes: serviceTypes.rows,
            certificateTypes: certificateTypes.rows,
            usStates: usStates.rows
        };
        
        await loggerService.info('All parametric data retrieved', {
            category: 'API',
            req,
            counts: {
                languages: data.languages.length,
                serviceTypes: data.serviceTypes.length,
                certificateTypes: data.certificateTypes.length,
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