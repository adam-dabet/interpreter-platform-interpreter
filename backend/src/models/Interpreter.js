const db = require('../config/database');
const loggerService = require('../services/loggerService');

class Interpreter {
    static async create(interpreterData) {
        const {
            // Personal Information
            first_name,
            last_name,
            middle_name = null,
            email,
            phone,
            date_of_birth = null,
            gender = null,
            
            // Address Information
            street_address,
            street_address_2 = null,
            city,
            state_id,
            zip_code,
            county = null,
            formatted_address = null,
            latitude = null,
            longitude = null,
            place_id = null,
            
            // Professional Information
            years_of_experience = 0,
            availability_notes = null,
            bio = null,
            
            // Arrays
            languages = [],
            service_types = [],
            service_rates = [],
            certificates = [],
            
            // W-9 Information
            w9_data = null,
            w9_file = null,
            
            // Metadata
            created_by = null
        } = interpreterData;

        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Insert main interpreter profile
            const interpreterResult = await client.query(`
                INSERT INTO interpreters (
                    first_name, last_name, middle_name, email, phone, date_of_birth, gender,
                    street_address, street_address_2, city, state_id, zip_code, county,
                    formatted_address, latitude, longitude, place_id,
                    years_of_experience, availability_notes, bio,
                    profile_status, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING id, created_at
            `, [
                first_name, last_name, middle_name, email, phone, date_of_birth, gender,
                street_address, street_address_2, city, parseInt(state_id), zip_code, county,
                formatted_address, latitude, longitude, place_id,
                years_of_experience, availability_notes, bio,
                'pending', created_by
            ]);

            const interpreterId = interpreterResult.rows[0].id;
            const createdAt = interpreterResult.rows[0].created_at;

            // Insert languages
            for (const language of languages) {
                await client.query(`
                    INSERT INTO interpreter_languages (
                        interpreter_id, language_id, proficiency_level, is_primary
                    ) VALUES ($1, $2, $3, $4)
                `, [
                    interpreterId, // Use UUID directly
                    language.language_id, // This should be a UUID from the languages table
                    language.proficiency_level,
                    language.is_primary || false
                ]);
            }

            // Insert service types and rates
            for (const serviceTypeId of service_types) {
                // Service types table uses INTEGER ids, so always convert to integer
                const formattedServiceTypeId = parseInt(serviceTypeId);
                
                await client.query(`
                    INSERT INTO interpreter_service_types (interpreter_id, service_type_id)
                    VALUES ($1, $2)
                `, [interpreterId, formattedServiceTypeId]);
            }

            // Insert service rates if provided
            if (service_rates && service_rates.length > 0) {
                for (const serviceRate of service_rates) {
                    await client.query(`
                        INSERT INTO interpreter_service_rates (
                            interpreter_id, service_type_id, rate_type, rate_amount, rate_unit,
                            custom_minimum_hours, custom_interval_minutes,
                            custom_second_interval_rate_amount, custom_second_interval_rate_unit
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        interpreterId,
                        parseInt(serviceRate.service_type_id),
                        serviceRate.rate_type,
                        serviceRate.rate_amount,
                        serviceRate.rate_unit,
                        serviceRate.custom_minimum_hours || null,
                        serviceRate.custom_interval_minutes || null,
                        serviceRate.custom_second_interval_rate_amount || null,
                        serviceRate.custom_second_interval_rate_unit || null
                    ]);
                }
            }

            // Insert certificates (if any)
            for (const certificate of certificates) {
                // Certificate types table uses INTEGER ids, so always convert to integer
                const formattedCertificateTypeId = parseInt(certificate.certificate_type_id);
                
                await client.query(`
                    INSERT INTO interpreter_certificates (
                        interpreter_id, certificate_type_id, certificate_number,
                        issuing_organization, issue_date, expiry_date,
                        file_path, file_name, file_size
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    interpreterId,
                    formattedCertificateTypeId,
                    certificate.certificate_number || null,
                    certificate.issuing_organization || null,
                    certificate.issue_date || null,
                    certificate.expiry_date || null,
                    certificate.file_path || null,
                    certificate.file_name || null,
                    certificate.file_size || null
                ]);
            }

            // Insert W-9 form data (if provided)
            if (w9_data || w9_file) {
                let filePath = null;
                let fileName = null;
                let fileSize = null;

                // Handle file upload if provided
                if (w9_file) {
                    filePath = w9_file.file_path || w9_file.path || null;
                    fileName = w9_file.file_name || w9_file.originalname || null;
                    fileSize = w9_file.file_size || w9_file.size || null;
                }

                // Use manual entry data or create default data
                const w9FormData = w9_data || {
                    business_name: `${first_name} ${last_name}`.trim(),
                    business_type: 'individual',
                    tax_classification: 'individual',
                    address: street_address || '',
                    city: city || '',
                    state: state_id || '',
                    zip_code: zip_code || ''
                };

                await client.query(`
                    INSERT INTO interpreter_w9_forms (
                        interpreter_id, business_name, business_type, tax_classification,
                        ssn, ein, address, city, state, zip_code,
                        exempt_payee_code, exempt_from_fatca, exempt_from_backup_withholding,
                        file_path, file_name, file_size, entry_method
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                `, [
                    interpreterId,
                    w9FormData.business_name,
                    w9FormData.business_type || 'individual',
                    w9FormData.tax_classification || 'individual',
                    w9FormData.ssn || null,
                    w9FormData.ein || null,
                    w9FormData.address,
                    w9FormData.city,
                    w9FormData.state,
                    w9FormData.zip_code,
                    w9FormData.exempt_payee_code || null,
                    w9FormData.exempt_from_fatca || false,
                    w9FormData.exempt_from_backup_withholding || false,
                    filePath,
                    fileName,
                    fileSize,
                    w9_file ? 'upload' : 'manual'
                ]);
            }

            await client.query('COMMIT');

            // Log the creation
            await loggerService.info('Interpreter profile created', {
                category: 'INTERPRETER',
                interpreterId,
                email,
                languageCount: languages.length,
                serviceTypeCount: service_types.length,
                certificateCount: certificates.length,
                hasW9Data: !!(w9_data || w9_file)
            });

            return {
                id: interpreterId,
                created_at: createdAt,
                profile_status: 'draft'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            await loggerService.error('Failed to create interpreter profile', error, {
                category: 'INTERPRETER',
                email
            });
            throw error;
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        try {
            const query = `
                SELECT 
                    i.*,
                    s.name as state_name,
                    s.code as state_code,
                    array_agg(DISTINCT jsonb_build_object(
                        'language_id', il.language_id,
                        'language_name', l.name,
                        'language_code', l.code,
                        'native_name', l.native_name,
                        'proficiency_level', il.proficiency_level,
                        'is_primary', il.is_primary
                    )) FILTER (WHERE il.id IS NOT NULL) as languages,
                    array_agg(DISTINCT jsonb_build_object(
                        'service_type_id', ist.service_type_id,
                        'service_type_name', st.name,
                        'service_type_code', st.code,
                        'service_type_description', st.description
                    )) FILTER (WHERE ist.id IS NOT NULL) as service_types,
                    array_agg(DISTINCT jsonb_build_object(
                        'certificate_id', ic.id,
                        'certificate_type_id', ic.certificate_type_id,
                        'certificate_type_name', ct.name,
                        'certificate_number', ic.certificate_number,
                        'issuing_organization', ic.issuing_organization,
                        'issue_date', ic.issue_date,
                        'expiry_date', ic.expiry_date,
                        'verification_status', ic.verification_status,
                        'file_path', ic.file_path,
                        'file_name', ic.file_name,
                        'file_size', ic.file_size
                    )) FILTER (WHERE ic.id IS NOT NULL) as certificates,
                    array_agg(DISTINCT jsonb_build_object(
                        'service_type_id', isr.service_type_id,
                        'service_type_name', st2.name,
                        'rate_type', isr.rate_type,
                        'rate_amount', isr.rate_amount,
                        'rate_unit', isr.rate_unit,
                        'custom_minimum_hours', isr.custom_minimum_hours,
                        'custom_interval_minutes', isr.custom_interval_minutes,
                        'custom_second_interval_rate_amount', isr.custom_second_interval_rate_amount,
                        'custom_second_interval_rate_unit', isr.custom_second_interval_rate_unit
                    )) FILTER (WHERE isr.id IS NOT NULL) as service_rates,
                    array_agg(DISTINCT jsonb_build_object(
                        'id', iw9.id,
                        'business_name', iw9.business_name,
                        'business_type', iw9.business_type,
                        'tax_classification', iw9.tax_classification,
                        'ssn', iw9.ssn,
                        'ein', iw9.ein,
                        'address', iw9.address,
                        'city', iw9.city,
                        'state', iw9.state,
                        'zip_code', iw9.zip_code,
                        'exempt_payee_code', iw9.exempt_payee_code,
                        'exempt_from_fatca', iw9.exempt_from_fatca,
                        'exempt_from_backup_withholding', iw9.exempt_from_backup_withholding,
                        'file_path', iw9.file_path,
                        'file_name', iw9.file_name,
                        'file_size', iw9.file_size,
                        'entry_method', iw9.entry_method,
                        'verification_status', iw9.verification_status,
                        'created_at', iw9.created_at
                    )) FILTER (WHERE iw9.id IS NOT NULL) as w9_forms
                FROM interpreters i
                LEFT JOIN us_states s ON i.state_id = s.id
                LEFT JOIN interpreter_languages il ON i.id = il.interpreter_id
                LEFT JOIN languages l ON il.language_id = l.id
                LEFT JOIN interpreter_service_types ist ON i.id = ist.interpreter_id
                LEFT JOIN service_types st ON ist.service_type_id = st.id
                LEFT JOIN interpreter_certificates ic ON i.id = ic.interpreter_id
                LEFT JOIN certificate_types ct ON ic.certificate_type_id = ct.id
                LEFT JOIN interpreter_service_rates isr ON i.id = isr.interpreter_id
                LEFT JOIN service_types st2 ON isr.service_type_id = st2.id
                LEFT JOIN interpreter_w9_forms iw9 ON i.id = iw9.interpreter_id
                WHERE i.id = $1
                GROUP BY i.id, s.name, s.code
            `;

            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            await loggerService.error('Failed to find interpreter by ID', error, {
                category: 'INTERPRETER',
                interpreterId: id
            });
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const result = await db.query(
                'SELECT * FROM interpreters WHERE email = $1',
                [email]
            );

            return result.rows[0] || null;

        } catch (error) {
            await loggerService.error('Failed to find interpreter by email', error, {
                category: 'INTERPRETER',
                email
            });
            throw error;
        }
    }

    static async updateStatus(id, status, updatedBy, notes = null) {
        try {
            // For now, skip the updated_by field due to schema mismatch (UUID vs INTEGER)
            // TODO: Fix schema to use consistent ID types
            const result = await db.query(`
                UPDATE interpreters 
                SET profile_status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [status, id]);

            if (result.rows.length === 0) {
                return null;
            }

            await loggerService.info('Interpreter status updated', {
                category: 'INTERPRETER',
                interpreterId: id,
                newStatus: status,
                updatedBy,
                notes: notes || null
            });

            return result.rows[0];

        } catch (error) {
            await loggerService.error('Failed to update interpreter status', error, {
                category: 'INTERPRETER',
                interpreterId: id,
                status
            });
            throw error;
        }
    }



    static async getAll(filters = {}, limit = 50, offset = 0) {
        try {
            const { status, language, service_type, state, search } = filters;
            
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramCounter = 1;

            if (status) {
                whereClause += ` AND i.profile_status = $${paramCounter}`;
                queryParams.push(status);
                paramCounter++;
            }

            if (state) {
                whereClause += ` AND i.state_id = $${paramCounter}`;
                queryParams.push(parseInt(state)); // state_id is still an integer (references us_states)
                paramCounter++;
            }

            if (language) {
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM interpreter_languages il 
                    WHERE il.interpreter_id = i.id AND il.language_id = $${paramCounter}
                )`;
                queryParams.push(language); // language should be a UUID string
                paramCounter++;
            }

            if (service_type) {
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM interpreter_service_types ist 
                    WHERE ist.interpreter_id = i.id AND ist.service_type_id = $${paramCounter}
                )`;
                queryParams.push(parseInt(service_type)); // service_type should be an integer
                paramCounter++;
            }

            if (search) {
                whereClause += ` AND (
                    LOWER(i.first_name || ' ' || i.last_name) LIKE LOWER($${paramCounter}) OR
                    LOWER(i.email) LIKE LOWER($${paramCounter})
                )`;
                queryParams.push(`%${search}%`);
                paramCounter++;
            }

            const query = `
                SELECT 
                    i.id, i.first_name, i.last_name, i.email, i.phone, i.street_address, i.street_address_2, i.city, i.zip_code, i.formatted_address,
                    s.name as state_name, s.code as state_code, i.years_of_experience, i.hourly_rate, i.bio, i.availability_notes,
                    i.profile_status, i.verification_status, i.created_at,
                    COUNT(*) OVER() as total_count,
                    COALESCE(
                        STRING_AGG(DISTINCT l.name, ', ' ORDER BY l.name), 
                        'N/A'
                    ) as languages,
                    COALESCE(
                        STRING_AGG(DISTINCT st.name, ', ' ORDER BY st.name), 
                        'N/A'
                    ) as service_types,
                    array_agg(DISTINCT jsonb_build_object(
                        'service_type_id', isr.service_type_id,
                        'service_type_name', st2.name,
                        'rate_type', isr.rate_type,
                        'rate_amount', isr.rate_amount,
                        'rate_unit', isr.rate_unit,
                        'custom_minimum_hours', isr.custom_minimum_hours,
                        'custom_interval_minutes', isr.custom_interval_minutes,
                        'custom_second_interval_rate_amount', isr.custom_second_interval_rate_amount,
                        'custom_second_interval_rate_unit', isr.custom_second_interval_rate_unit
                    )) FILTER (WHERE isr.id IS NOT NULL) as service_rates,
                    array_agg(DISTINCT jsonb_build_object(
                        'id', iw9.id,
                        'business_name', iw9.business_name,
                        'business_type', iw9.business_type,
                        'tax_classification', iw9.tax_classification,
                        'ssn', iw9.ssn,
                        'ein', iw9.ein,
                        'address', iw9.address,
                        'city', iw9.city,
                        'state', iw9.state,
                        'zip_code', iw9.zip_code,
                        'exempt_payee_code', iw9.exempt_payee_code,
                        'exempt_from_fatca', iw9.exempt_from_fatca,
                        'exempt_from_backup_withholding', iw9.exempt_from_backup_withholding,
                        'file_path', iw9.file_path,
                        'file_name', iw9.file_name,
                        'file_size', iw9.file_size,
                        'entry_method', iw9.entry_method,
                        'verification_status', iw9.verification_status,
                        'created_at', iw9.created_at
                    )) FILTER (WHERE iw9.id IS NOT NULL) as w9_forms,
                    array_agg(DISTINCT jsonb_build_object(
                        'id', ic.id,
                        'certificate_type_id', ic.certificate_type_id,
                        'certificate_type_name', ct.name,
                        'certificate_number', ic.certificate_number,
                        'issuing_organization', ic.issuing_organization,
                        'issue_date', ic.issue_date,
                        'expiry_date', ic.expiry_date,
                        'file_path', ic.file_path,
                        'file_name', ic.file_name,
                        'file_size', ic.file_size,
                        'verification_status', ic.verification_status,
                        'created_at', ic.created_at
                    )) FILTER (WHERE ic.id IS NOT NULL) as certificates
                FROM interpreters i
                LEFT JOIN us_states s ON i.state_id = s.id
                LEFT JOIN interpreter_languages il ON i.id = il.interpreter_id
                LEFT JOIN languages l ON il.language_id = l.id
                LEFT JOIN interpreter_service_types ist ON i.id = ist.interpreter_id
                LEFT JOIN service_types st ON ist.service_type_id = st.id
                LEFT JOIN interpreter_service_rates isr ON i.id = isr.interpreter_id
                LEFT JOIN service_types st2 ON isr.service_type_id = st2.id
                LEFT JOIN interpreter_w9_forms iw9 ON i.id = iw9.interpreter_id
                LEFT JOIN interpreter_certificates ic ON i.id = ic.interpreter_id
                LEFT JOIN certificate_types ct ON ic.certificate_type_id = ct.id
                ${whereClause}
                GROUP BY i.id, i.first_name, i.last_name, i.email, i.phone, i.street_address, i.street_address_2, i.city, i.zip_code, i.formatted_address,
                         s.name, s.code, i.years_of_experience, i.hourly_rate, i.bio, i.availability_notes, i.profile_status, 
                         i.verification_status, i.created_at
                ORDER BY i.created_at DESC
                LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
            `;

            queryParams.push(limit, offset);
            const result = await db.query(query, queryParams);

            const totalCount = result.rows[0]?.total_count || 0;
            const interpreters = result.rows.map(row => {
                const { total_count, ...interpreter } = row;
                return interpreter;
            });

            return {
                interpreters,
                totalCount: parseInt(totalCount),
                hasMore: offset + limit < totalCount
            };

        } catch (error) {
            await loggerService.error('Failed to get interpreters list', error, {
                category: 'INTERPRETER',
                filters
            });
            throw error;
        }
    }



    static async getDashboardStats() {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) FILTER (WHERE profile_status = 'pending') as pending_profiles,
                    COUNT(*) FILTER (WHERE profile_status = 'under_review') as under_review,
                    COUNT(*) FILTER (WHERE profile_status = 'draft') as draft_profiles,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week_submissions,
                    ROUND(
                        (COUNT(*) FILTER (WHERE profile_status = 'approved')::numeric / 
                         NULLIF(COUNT(*) FILTER (WHERE profile_status IN ('approved', 'rejected')), 0)) * 100, 2
                    ) as approval_rate,
                    ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 1) as avg_review_time_hours
                FROM interpreters 
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            `;
            
            const result = await db.query(statsQuery);
            return result.rows[0];

        } catch (error) {
            await loggerService.error('Failed to get dashboard stats', error, {
                category: 'INTERPRETER'
            });
            throw error;
        }
    }

    // Delete interpreter profile and all related data
    static async deleteById(interpreterId) {
        try {
            // Start a transaction to ensure data consistency
            await db.query('BEGIN');

            // Delete related records first (due to foreign key constraints)
            
            // Delete interpreter certificates
            await db.query(
                'DELETE FROM interpreter_certificates WHERE interpreter_id = $1',
                [interpreterId]
            );

            // Delete interpreter W9 forms
            await db.query(
                'DELETE FROM interpreter_w9_forms WHERE interpreter_id = $1',
                [interpreterId]
            );

            // Delete interpreter service rates
            await db.query(
                'DELETE FROM interpreter_service_rates WHERE interpreter_id = $1',
                [interpreterId]
            );

            // Delete interpreter service types
            await db.query(
                'DELETE FROM interpreter_service_types WHERE interpreter_id = $1',
                [interpreterId]
            );

            // Delete interpreter languages
            await db.query(
                'DELETE FROM interpreter_languages WHERE interpreter_id = $1',
                [interpreterId]
            );

            // Finally, delete the interpreter profile
            const result = await db.query(
                'DELETE FROM interpreters WHERE id = $1 RETURNING *',
                [interpreterId]
            );

            // Commit the transaction
            await db.query('COMMIT');

            await loggerService.info('Interpreter profile deleted', {
                category: 'INTERPRETER',
                interpreterId
            });

            return result.rows[0];

        } catch (error) {
            // Rollback the transaction on error
            await db.query('ROLLBACK');
            
            await loggerService.error('Failed to delete interpreter profile', error, {
                category: 'INTERPRETER',
                interpreterId
            });
            throw error;
        }
    }

    // Find interpreter by email
    static async findByEmail(email) {
        try {
            const result = await db.query(
                'SELECT * FROM interpreters WHERE email = $1',
                [email]
            );
            return result.rows[0];
        } catch (error) {
            await loggerService.error('Failed to find interpreter by email', error, {
                category: 'INTERPRETER',
                email
            });
            throw error;
        }
    }

    // Update interpreter profile
    static async update(interpreterId, updateData) {
        try {
            console.log('Interpreter.update called with:', { interpreterId, updateData });
            
            // Build dynamic update query
            const fields = [];
            const values = [];
            let paramCount = 0;

            // Add fields to update
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && updateData[key] !== null) {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updateData[key]);
                }
            });

            console.log('Update query fields:', fields);
            console.log('Update query values:', values);

            if (fields.length === 0) {
                console.log('No fields to update, returning null');
                return null; // No fields to update
            }

            // Add interpreter ID as the last parameter
            values.push(interpreterId);

            const query = `
                UPDATE interpreters 
                SET ${fields.join(', ')}
                WHERE id = $${paramCount + 1}
                RETURNING *
            `;

            console.log('Update query:', query);
            const result = await db.query(query, values);

            if (result.rows.length === 0) {
                return null; // Interpreter not found
            }

            await loggerService.info('Interpreter profile updated', {
                category: 'INTERPRETER',
                interpreterId,
                updatedFields: Object.keys(updateData)
            });

            return result.rows[0];

        } catch (error) {
            await loggerService.error('Failed to update interpreter profile', error, {
                category: 'INTERPRETER',
                interpreterId
            });
            throw error;
        }
    }

}

module.exports = Interpreter;