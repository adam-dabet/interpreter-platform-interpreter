const db = require('../config/database');
const { validationResult } = require('express-validator');

class JobController {
  // Get all available jobs (for interpreters to browse)
  async getAvailableJobs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        language, 
        service_type, 
        location,
        date_from,
        date_to,
        remote_only = false,
        interpreter_id = null // For location-based filtering
      } = req.query;

      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          j.*,
          l1.name as source_language_name,
          l2.name as target_language_name,
          st.name as service_type_name,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
            THEN CONCAT(u.first_name, ' ', u.last_name) 
            ELSE NULL 
          END as created_by_name,
          cl.name as claimant_name,
          c.claim_number as claim_number,
          c.case_type as case_type,
          COUNT(*) OVER() as total_count
        FROM jobs j
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN users u ON j.created_by = u.id
        LEFT JOIN claimants cl ON j.claimant_id = cl.id
        LEFT JOIN claims c ON j.claim_id = c.id
        WHERE j.status = 'finding_interpreter' 
        AND j.scheduled_date >= CURRENT_DATE
      `;

      const queryParams = [];
      let paramCount = 0;

      // Add filters
      if (language) {
        paramCount++;
        query += ` AND (l1.code = $${paramCount} OR l2.code = $${paramCount})`;
        queryParams.push(language);
      }

      if (service_type) {
        paramCount++;
        query += ` AND st.code = $${paramCount}`;
        queryParams.push(service_type);
      }

      if (location) {
        paramCount++;
        query += ` AND (j.location_city ILIKE $${paramCount} OR j.location_state ILIKE $${paramCount})`;
        queryParams.push(`%${location}%`);
      }

      if (date_from) {
        paramCount++;
        query += ` AND j.scheduled_date >= $${paramCount}`;
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND j.scheduled_date <= $${paramCount}`;
        queryParams.push(date_to);
      }

      if (remote_only === 'true') {
        query += ` AND j.is_remote = true`;
      }

      // Matching logic for specific interpreter
      if (interpreter_id) {
        console.log('Filtering jobs for interpreter:', interpreter_id);
        
        // Simplified matching logic to avoid complex geolocation queries
        query += `
          AND EXISTS (
            SELECT 1 FROM interpreters i 
            WHERE i.id = $${paramCount + 1}
            AND i.is_active = true
            AND i.profile_status = 'approved'
            AND (
              -- Include remote jobs for all interpreters
              j.is_remote = true
              OR
              -- For non-remote jobs, check if interpreter has the required service type and language
              (j.is_remote = false AND EXISTS (
                SELECT 1 FROM interpreter_service_types ist
                WHERE ist.interpreter_id = i.id 
                AND ist.service_type_id = j.service_type_id
              ) AND EXISTS (
                SELECT 1 FROM interpreter_languages il
                WHERE il.interpreter_id = i.id 
                AND (il.language_id = j.source_language_id OR il.language_id = j.target_language_id)
              ))
            )
          )
          -- Exclude jobs that the interpreter has already responded to
          AND NOT EXISTS (
            SELECT 1 FROM job_assignments ja
            WHERE ja.job_id = j.id AND ja.interpreter_id = $${paramCount + 1}
          )
        `;
        paramCount++;
        queryParams.push(interpreter_id);
      }

      query += ` ORDER BY j.priority DESC, j.scheduled_date ASC, j.scheduled_time ASC
                 LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      
      queryParams.push(parseInt(limit), offset);

      console.log('Executing query with params:', { queryParams, interpreter_id });
      const result = await db.query(query, queryParams);
      
      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(totalCount / limit);

      console.log(`Found ${result.rows.length} jobs for interpreter ${interpreter_id || 'all'}`);
      if (result.rows.length > 0) {
        console.log('Sample job:', {
          id: result.rows[0].id,
          title: result.rows[0].title,
          service_type: result.rows[0].service_type_name,
          languages: `${result.rows[0].source_language_name} → ${result.rows[0].target_language_name}`,
          location: `${result.rows[0].location_city}, ${result.rows[0].location_state}`,
          is_remote: result.rows[0].is_remote
        });
      }

      res.json({
        success: true,
        data: {
          jobs: result.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: parseInt(totalCount),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching available jobs:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        where: error.where
      });
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get jobs for a specific interpreter (their assignments)
  async getInterpreterJobs(req, res) {
    try {
      const interpreterId = req.user.interpreterId; // From auth middleware
      const { status, page = 1, limit = 10 } = req.query;
      
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          j.*,
          ja.status as assignment_status,
          ja.agreed_rate,
          ja.actual_hours,
          ja.total_payment,
          ja.accepted_at,
          ja.declined_at,
          l1.name as source_language_name,
          l2.name as target_language_name,
          st.name as service_type_name,
          COUNT(*) OVER() as total_count
        FROM jobs j
        INNER JOIN job_assignments ja ON j.id = ja.job_id
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        WHERE ja.interpreter_id = $1
      `;

      const queryParams = [interpreterId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND ja.status = $${paramCount}`;
        queryParams.push(status);
      }

      query += ` ORDER BY j.scheduled_date ASC, j.scheduled_time ASC
                 LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      
      queryParams.push(parseInt(limit), offset);

      const result = await db.query(query, queryParams);
      
      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          jobs: result.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: parseInt(totalCount),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching interpreter jobs:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get all jobs (admin view)
  async getAllJobs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        priority,
        date_from,
        date_to
      } = req.query;

      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          j.*,
          l1.name as source_language_name,
          l2.name as target_language_name,
          st.name as service_type_name,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
            THEN CONCAT(u.first_name, ' ', u.last_name) 
            ELSE NULL 
          END as created_by_name,
          j.assigned_interpreter_id,
          CASE 
            WHEN i.first_name IS NOT NULL AND i.last_name IS NOT NULL 
            THEN CONCAT(i.first_name, ' ', i.last_name) 
            ELSE NULL 
          END as assigned_interpreter_name,
          i.email as assigned_interpreter_email,
          i.phone as assigned_interpreter_phone,
          COUNT(*) OVER() as total_count
        FROM jobs j
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN users u ON j.created_by = u.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        WHERE 1=1
      `;

      const queryParams = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        query += ` AND j.status = $${paramCount}`;
        queryParams.push(status);
      }

      if (priority) {
        paramCount++;
        query += ` AND j.priority = $${paramCount}`;
        queryParams.push(priority);
      }

      if (date_from) {
        paramCount++;
        query += ` AND j.scheduled_date >= $${paramCount}`;
        queryParams.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND j.scheduled_date <= $${paramCount}`;
        queryParams.push(date_to);
      }

      query += ` ORDER BY j.created_at DESC
                 LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      
      queryParams.push(parseInt(limit), offset);

      const result = await db.query(query, queryParams);
      
      const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          jobs: result.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: parseInt(totalCount),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all jobs:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Create a new job (admin only)
  async createJob(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        jobNumber,
        appointmentDate,
        appointmentTime,
        appointmentType,
        reserveTime,
        serviceType,
        language,
        interpreterType,
        claimantId,
        claimId,
        locationOfService
      } = req.body;

      const created_by = req.user.userId;

      console.log('Creating job with data:', req.body);
      
      // Map frontend fields to database fields
      const title = jobNumber;
      
      // Get claimant information if provided
      let claimantName = '';
      let claimNumber = '';
      if (claimantId) {
        try {
          const claimantResult = await db.query(
            'SELECT name FROM claimants WHERE id = $1 AND is_active = true',
            [claimantId]
          );
          if (claimantResult.rows.length > 0) {
            claimantName = claimantResult.rows[0].name;
          }
        } catch (claimantError) {
          console.error('Error fetching claimant:', claimantError);
        }
      }
      
      if (claimId) {
        try {
          const claimResult = await db.query(
            'SELECT claim_number FROM claims WHERE id = $1 AND is_active = true',
            [claimId]
          );
          if (claimResult.rows.length > 0) {
            claimNumber = claimResult.rows[0].claim_number;
          }
        } catch (claimError) {
          console.error('Error fetching claim:', claimError);
        }
      }
      
      const description = `Job for ${claimantName}${claimNumber ? ` (${claimNumber})` : ''} - ${appointmentType} appointment`;
      
      // Map appointment type to job type enum
      let job_type = 'other'; // default
      
      // Medical appointment types
      const medicalTypes = [
        'acupuncture', 'ame', 'cardiac_evaluation', 'chiropractor', 'consult_treat', 'consultation',
        'ct_scan', 'dentist', 'diagnostic_testing', 'ekg', 'emg', 'epidural_injection', 'evaluation',
        'follow_up', 'follow_up_lab_work', 'follow_up_pt', 'functional_capacity', 'hearing_loss',
        'hernia_consult', 'ime', 'initial_appointment', 'injection', 'injection_steroid', 'internal_medicine',
        'laser_procedure', 'medical', 'medical_clerance', 'medical_procedure', 'mri', 'occupational',
        'one_time_appointment', 'orthopaedic', 'pain_management', 'physical_therapy', 'physical_therapy_initial',
        'psychological', 'qme', 'second_opinion', 'surgery', 'surgery_check_in', 'surgery_discharge',
        'surgery_post_op', 'surgery_pre_op', 'surgical_consult', 'vocational_evaluation', 'x_ray',
        'cognitive_behavioral_therapy'
      ];
      
      // Legal appointment types
      const legalTypes = [
        'deposition', 'deposition_zoom', 'legal', 'recorded_statement', 'settlement_documents',
        'status_conference', 'status_conference_remote', 'trial', 'mandatory_settlement_agreement',
        'hearing', 'mandatory_settlement_conference', 'permanent_stationary'
      ];
      
      // Telehealth appointment types
      const telehealthTypes = [
        'phone', 'video', 'consult_telehealth', 'follow_up_telehealth', 'medical_telehealth'
      ];
      
      if (medicalTypes.includes(appointmentType)) {
        job_type = 'medical';
      } else if (legalTypes.includes(appointmentType)) {
        job_type = 'legal';
      } else if (telehealthTypes.includes(appointmentType)) {
        job_type = 'medical'; // Default telehealth to medical
      }
      
      // Override job type based on service type if available
      if (serviceType) {
        const serviceTypeInt = parseInt(serviceType);
        if (serviceTypeInt === 2) { // Legal service type
          job_type = 'legal';
        } else if (serviceTypeInt === 11 || serviceTypeInt === 27) { // Video or Phone
          job_type = 'medical';
        }
      }
      
      // Parse location to extract city, state, and zip code
      const location_address = locationOfService;
      let location_city = '';
      let location_state = 'CA'; // Default to CA
      let location_zip_code = '';
      
      console.log('Parsing location:', locationOfService);
      
      // Try to extract city, state, and zip from the address
      if (locationOfService && locationOfService.includes(',')) {
        const parts = locationOfService.split(',').map(part => part.trim());
        console.log('Location parts:', parts);
        
        // Look for state and zip code patterns
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          console.log(`Checking part ${i}: "${part}"`);
          
          // Check for 2-letter state code (e.g., "CA")
          if (part.length === 2 && /^[A-Z]{2}$/i.test(part)) {
            console.log(`Found state code: ${part}`);
            location_state = part.toUpperCase();
            
            // Check if next part is a zip code
            if (i + 1 < parts.length) {
              const nextPart = parts[i + 1];
              console.log(`Checking next part for zip: "${nextPart}"`);
              if (/^\d{5}(-\d{4})?$/.test(nextPart)) {
                console.log(`Found zip code: ${nextPart}`);
                location_zip_code = nextPart;
              }
            }
            break;
          }
          
          // Check for state with zip code in same part (e.g., "CA 92054")
          const stateZipMatch = part.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
          if (stateZipMatch) {
            console.log(`Found state+zip in same part: ${stateZipMatch[1]} ${stateZipMatch[2]}`);
            location_state = stateZipMatch[1].toUpperCase();
            location_zip_code = stateZipMatch[2];
            break;
          }
        }
        
        // Find the city (usually the part before the state)
        const stateIndex = parts.findIndex(part => 
          (part.length === 2 && /^[A-Z]{2}$/i.test(part)) ||
          /^[A-Z]{2}\s+\d{5}(-\d{4})?$/i.test(part)
        );
        
        console.log(`State found at index: ${stateIndex}`);
        
        if (stateIndex > 0) {
          // City is the part right before the state
          location_city = parts[stateIndex - 1];
          console.log(`City from before state: ${location_city}`);
        } else if (parts.length >= 2) {
          // Fallback: use the second part as city if no state found
          location_city = parts[1];
          console.log(`City from fallback: ${location_city}`);
        } else {
          // Fallback: use the first part as city
          location_city = parts[0];
          console.log(`City from first part: ${location_city}`);
        }
        
        console.log('Final parsed location:', {
          city: location_city,
          state: location_state,
          zip: location_zip_code
        });
      }
      // Get coordinates from the address using a geocoding service
      let latitude = null;
      let longitude = null;
      
      if (locationOfService) {
        try {
          // Use a free geocoding service (Nominatim/OpenStreetMap)
          const encodedAddress = encodeURIComponent(locationOfService);
          const geocodingUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
          
          console.log('Geocoding address:', locationOfService);
          
          const geocodeResponse = await fetch(geocodingUrl, {
            headers: {
              'User-Agent': 'InterpreterPlatform/1.0'
            }
          });
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData && geocodeData.length > 0) {
              const location = geocodeData[0];
              latitude = parseFloat(location.lat);
              longitude = parseFloat(location.lon);
              
              console.log('Geocoding successful:', {
                address: locationOfService,
                lat: latitude,
                lon: longitude,
                display_name: location.display_name
              });
            } else {
              console.log('No geocoding results found for:', locationOfService);
            }
          } else {
            console.log('Geocoding request failed:', geocodeResponse.status);
          }
        } catch (geocodeError) {
          console.error('Error during geocoding:', geocodeError);
        }
      }
      const is_remote = appointmentType === 'phone' || appointmentType === 'video' || 
                       appointmentType === 'consult_telehealth' || appointmentType === 'follow_up_telehealth' || 
                       appointmentType === 'medical_telehealth' || appointmentType === 'deposition_zoom' || 
                       appointmentType === 'status_conference_remote';
      const scheduled_date = appointmentDate;
      const scheduled_time = appointmentTime + ':00'; // Add seconds
      const estimated_duration_minutes = parseInt(reserveTime) || 60;
      
      // Ensure language is a valid UUID
      let source_language_id = null;
      if (language) {
        // If language is already a UUID, use it
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(language)) {
          source_language_id = language;
        } else {
          // Try to find the language by name or code
          try {
            const langResult = await db.query(
              'SELECT id FROM languages WHERE name ILIKE $1 OR code ILIKE $1 OR id::text = $1 LIMIT 1',
              [language]
            );
            if (langResult.rows.length > 0) {
              source_language_id = langResult.rows[0].id;
            }
          } catch (langError) {
            console.error('Error finding language:', langError);
          }
        }
      }
      const target_language_id = 'cce8d6ee-bb56-4553-b790-48b087f9f3a5'; // Default to English
      
      // Ensure service_type_id is a valid integer
      let service_type_id = null;
      if (serviceType) {
        const serviceTypeInt = parseInt(serviceType);
        if (!isNaN(serviceTypeInt)) {
          // Verify the service type exists
          try {
            const serviceResult = await db.query(
              'SELECT id FROM service_types WHERE id = $1 AND is_active = true LIMIT 1',
              [serviceTypeInt]
            );
            if (serviceResult.rows.length > 0) {
              service_type_id = serviceTypeInt;
            }
          } catch (serviceError) {
            console.error('Error finding service type:', serviceError);
          }
        }
      }
      
      // Get the actual rate from the service type
      let hourly_rate = 50.00; // Default fallback rate
      let rate_unit = 'hours';
      if (service_type_id) {
        try {
          const rateResult = await db.query(
            'SELECT rate_amount, rate_unit FROM service_type_rates WHERE service_type_id = $1',
            [service_type_id]
          );
          if (rateResult.rows.length > 0) {
            const rateData = rateResult.rows[0];
            hourly_rate = parseFloat(rateData.rate_amount) || 50.00;
            rate_unit = rateData.rate_unit || 'hours';
          }
        } catch (rateError) {
          console.error('Error fetching service type rate:', rateError);
        }
      }
      
      // Calculate total amount based on rate unit
      let total_amount;
      if (rate_unit === 'minutes') {
        total_amount = estimated_duration_minutes * hourly_rate;
      } else if (rate_unit === 'word') {
        // For document translation, estimate words per minute
        const wordsPerMinute = 150; // Average reading speed
        const estimatedWords = estimated_duration_minutes * wordsPerMinute;
        total_amount = estimatedWords * hourly_rate;
      } else {
        // Default to hourly rate
        total_amount = (estimated_duration_minutes / 60) * hourly_rate;
      }
      const client_name = claimantName;
      const client_email = 'client@example.com'; // Default - should be added to form
      const client_phone = '';
      const client_notes = '';
      const special_requirements = '';
      
      console.log('Mapped job data:', {
        title, description, job_type, location_address, location_city,
        location_state, is_remote, scheduled_date, scheduled_time, estimated_duration_minutes,
        source_language_id, target_language_id, service_type_id, hourly_rate, total_amount,
        client_name, client_email
      });

      // Handle interpreter type
      let interpreter_type_id = null;
      if (interpreterType) {
        console.log('Setting interpreter_type_id for new job:', interpreterType);
        interpreter_type_id = interpreterType;
      }

      // Store the original appointment type
      const appointment_type = appointmentType || null;

      const query = `
        INSERT INTO jobs (
          title, description, job_type, location_address, location_city,
          location_state, location_zip_code, latitude, longitude, is_remote,
          scheduled_date, scheduled_time, estimated_duration_minutes,
          source_language_id, target_language_id, service_type_id, interpreter_type_id, appointment_type,
          hourly_rate, total_amount, client_name, client_email, client_phone,
          client_notes, special_requirements, claimant_id, claim_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *
      `;

      const values = [
        title, description, job_type, location_address, location_city,
        location_state, location_zip_code, latitude, longitude, is_remote,
        scheduled_date, scheduled_time, estimated_duration_minutes,
        source_language_id, target_language_id, service_type_id, interpreter_type_id, appointment_type,
        hourly_rate, total_amount, client_name, client_email, client_phone,
        client_notes, special_requirements, claimantId, claimId, created_by
      ];

      const result = await db.query(query, values);
      
      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating job:', error);
      
      // Provide more specific error messages
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({ 
          success: false, 
          message: 'A job with this number already exists' 
        });
      } else if (error.code === '23503') { // Foreign key constraint violation
        res.status(400).json({ 
          success: false, 
          message: 'Invalid reference (language, service type, or user not found)' 
        });
      } else if (error.code === '22P02') { // Invalid text representation
        res.status(400).json({ 
          success: false, 
          message: 'Invalid data format provided' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Internal server error',
          error: error.message 
        });
      }
    }
  }

  // Get a specific job by ID
  async getJobById(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          j.*,
          l1.name as source_language_name,
          l2.name as target_language_name,
          st.name as service_type_name,
          it.name as interpreter_type_name,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
            THEN CONCAT(u.first_name, ' ', u.last_name) 
            ELSE NULL 
          END as created_by_name,
          CASE 
            WHEN i.first_name IS NOT NULL AND i.last_name IS NOT NULL 
            THEN CONCAT(i.first_name, ' ', i.last_name) 
            ELSE NULL 
          END as assigned_interpreter_name,
          i.email as interpreter_email,
          cl.name as claimant_name,
          c.claim_number as claim_number,
          c.case_type as case_type
        FROM jobs j
        LEFT JOIN languages l1 ON j.source_language_id = l1.id
        LEFT JOIN languages l2 ON j.target_language_id = l2.id
        LEFT JOIN service_types st ON j.service_type_id = st.id
        LEFT JOIN interpreter_types it ON j.interpreter_type_id = it.id
        LEFT JOIN users u ON j.created_by = u.id
        LEFT JOIN interpreters i ON j.assigned_interpreter_id = i.id
        LEFT JOIN claimants cl ON j.claimant_id = cl.id
        LEFT JOIN claims c ON j.claim_id = c.id
        WHERE j.id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update a job (admin only)
  async updateJob(req, res) {
    try {
      console.log('=== UPDATE JOB REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Request params:', req.params);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updated_by = req.user.userId;

      // Get the job first to check if it exists
      const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      // Handle frontend field mappings
      let {
        title,
        description,
        job_type,
        priority,
        status,
        location_address,
        location_city,
        location_state,
        location_zip_code,
        latitude,
        longitude,
        is_remote,
        scheduled_date,
        scheduled_time,
        estimated_duration_minutes,
        source_language_id,
        target_language_id,
        service_type_id,
        hourly_rate,
        total_amount,
        client_name,
        client_email,
        client_phone,
        client_notes,
        special_requirements,
        admin_notes,
        // Frontend field mappings
        appointmentType,
        interpreterType,
        // Additional frontend fields
        appointmentDate,
        appointmentTime,
        language,
        locationOfService,
        claimantName,
        serviceType,
        reserveTime
      } = req.body;

      // Store the original appointment type and map to job_type if provided
      let appointment_type = null;
      if (appointmentType) {
        console.log('Storing original appointmentType:', appointmentType);
        appointment_type = appointmentType;
        
        // Medical appointment types
        const medicalTypes = [
          'acupuncture', 'ame', 'cardiac_evaluation', 'chiropractor', 'consult_treat', 'consultation',
          'ct_scan', 'dentist', 'diagnostic_testing', 'ekg', 'emg', 'epidural_injection', 'evaluation',
          'follow_up', 'follow_up_lab_work', 'follow_up_pt', 'functional_capacity', 'hearing_loss',
          'hernia_consult', 'ime', 'initial_appointment', 'injection', 'injection_steroid', 'internal_medicine',
          'laser_procedure', 'medical', 'medical_clerance', 'medical_procedure', 'mri', 'occupational',
          'one_time_appointment', 'orthopaedic', 'pain_management', 'physical_therapy', 'physical_therapy_initial',
          'psychological', 'qme', 'second_opinion', 'surgery', 'surgery_check_in', 'surgery_discharge',
          'surgery_post_op', 'surgery_pre_op', 'surgical_consult', 'vocational_evaluation', 'x_ray',
          'cognitive_behavioral_therapy'
        ];
        
        // Legal appointment types
        const legalTypes = [
          'deposition', 'deposition_zoom', 'legal', 'recorded_statement', 'settlement_documents',
          'status_conference', 'status_conference_remote', 'trial', 'mandatory_settlement_agreement',
          'hearing', 'mandatory_settlement_conference', 'permanent_stationary'
        ];
        
        // Telehealth appointment types
        const telehealthTypes = [
          'phone', 'video', 'consult_telehealth', 'follow_up_telehealth', 'medical_telehealth'
        ];
        
        if (medicalTypes.includes(appointmentType)) {
          job_type = 'medical';
          console.log('Appointment type is MEDICAL');
        } else if (legalTypes.includes(appointmentType)) {
          job_type = 'legal';
          console.log('Appointment type is LEGAL');
        } else if (telehealthTypes.includes(appointmentType)) {
          job_type = 'medical'; // Default telehealth to medical
          console.log('Appointment type is TELEHEALTH (mapped to medical)');
        } else {
          job_type = 'other';
          console.log('Appointment type is OTHER');
        }
        
        console.log('Mapped job_type:', job_type);
      } else {
        console.log('No appointmentType provided in request');
      }

      // Map interpreterType to interpreter_type_id if provided
      let interpreter_type_id = null;
      if (interpreterType) {
        console.log('Setting interpreter_type_id:', interpreterType);
        interpreter_type_id = interpreterType;
      }

      // Map frontend date/time fields to database fields
      if (appointmentDate) {
        console.log('Setting scheduled_date:', appointmentDate);
        scheduled_date = appointmentDate;
      }

      if (appointmentTime) {
        console.log('Setting scheduled_time:', appointmentTime + ':00');
        scheduled_time = appointmentTime + ':00';
      }

      // Map language field to source_language_id
      if (language) {
        console.log('Setting source_language_id:', language);
        source_language_id = language;
      }

      // Map serviceType field to service_type_id
      if (serviceType) {
        console.log('Setting service_type_id:', serviceType);
        service_type_id = parseInt(serviceType);
      }

      // Map locationOfService to location_address and parse location details
      if (locationOfService) {
        console.log('Setting location_address:', locationOfService);
        location_address = locationOfService;
        
        // Parse location to extract city, state, and zip code
        let parsed_location_city = '';
        let parsed_location_state = 'CA'; // Default to CA
        let parsed_location_zip_code = '';
        
        console.log('Parsing location:', locationOfService);
        
        // Try to extract city, state, and zip from the address
        if (locationOfService && locationOfService.includes(',')) {
          const parts = locationOfService.split(',').map(part => part.trim());
          console.log('Location parts:', parts);
          
          // Look for state and zip code patterns
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            console.log(`Checking part ${i}: "${part}"`);
            
            // Check for 2-letter state code (e.g., "CA")
            if (part.length === 2 && /^[A-Z]{2}$/i.test(part)) {
              console.log(`Found state code: ${part}`);
              parsed_location_state = part.toUpperCase();
              
              // Check if next part is a zip code
              if (i + 1 < parts.length) {
                const nextPart = parts[i + 1];
                console.log(`Checking next part for zip: "${nextPart}"`);
                if (/^\d{5}(-\d{4})?$/.test(nextPart)) {
                  console.log(`Found zip code: ${nextPart}`);
                  parsed_location_zip_code = nextPart;
                  break;
                }
              }
            }
          }
          
          // Assume the first part is the city if we have multiple parts
          if (parts.length > 0) {
            parsed_location_city = parts[0];
          }
        }
        
        // Update location fields if we parsed them
        if (parsed_location_city) {
          location_city = parsed_location_city;
        }
        if (parsed_location_state) {
          location_state = parsed_location_state;
        }
        if (parsed_location_zip_code) {
          location_zip_code = parsed_location_zip_code;
        }
      }

      // Map claimantName to client_name
      if (claimantName) {
        console.log('Setting client_name:', claimantName);
        client_name = claimantName;
      }

      // Map reserveTime to estimated_duration_minutes
      if (reserveTime) {
        console.log('Setting estimated_duration_minutes:', reserveTime);
        estimated_duration_minutes = parseInt(reserveTime);
      }

      const query = `
        UPDATE jobs SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          job_type = COALESCE($3, job_type),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          location_address = COALESCE($6, location_address),
          location_city = COALESCE($7, location_city),
          location_state = COALESCE($8, location_state),
          location_zip_code = COALESCE($9, location_zip_code),
          latitude = COALESCE($10, latitude),
          longitude = COALESCE($11, longitude),
          is_remote = COALESCE($12, is_remote),
          scheduled_date = COALESCE($13, scheduled_date),
          scheduled_time = COALESCE($14, scheduled_time),
          estimated_duration_minutes = COALESCE($15, estimated_duration_minutes),
          source_language_id = COALESCE($16, source_language_id),
          target_language_id = COALESCE($17, target_language_id),
          service_type_id = COALESCE($18, service_type_id),
          interpreter_type_id = COALESCE($19, interpreter_type_id),
          appointment_type = COALESCE($20, appointment_type),
          hourly_rate = COALESCE($21, hourly_rate),
          total_amount = COALESCE($22, total_amount),
          client_name = COALESCE($23, client_name),
          client_email = COALESCE($24, client_email),
          client_phone = COALESCE($25, client_phone),
          client_notes = COALESCE($26, client_notes),
          special_requirements = COALESCE($27, special_requirements),
          admin_notes = COALESCE($28, admin_notes),
          updated_by = $29,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $30
        RETURNING *
      `;

      const values = [
        title, description, job_type, priority, status, location_address, location_city,
        location_state, location_zip_code, latitude, longitude, is_remote,
        scheduled_date, scheduled_time, estimated_duration_minutes,
        source_language_id, target_language_id, service_type_id, interpreter_type_id, appointment_type,
        hourly_rate, total_amount, client_name, client_email, client_phone,
        client_notes, special_requirements, admin_notes, updated_by, id
      ];

      console.log('=== FINAL VALUES FOR UPDATE ===');
      console.log('job_type:', job_type);
      console.log('interpreter_type_id:', interpreter_type_id);
      console.log('Values array length:', values.length);

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Job updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete a job (admin only)
  async deleteJob(req, res) {
    try {
      const { id } = req.params;

      // Check if job exists
      const jobCheck = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      // Check if job has assignments
      const assignmentCheck = await db.query('SELECT * FROM job_assignments WHERE job_id = $1', [id]);
      if (assignmentCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete job with existing assignments' 
        });
      }

      await db.query('DELETE FROM jobs WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get job statistics (admin dashboard)
  async getJobStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'finding_interpreter' THEN 1 END) as finding_interpreter_jobs,
          COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_jobs,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_jobs,
          COUNT(CASE WHEN scheduled_date = CURRENT_DATE THEN 1 END) as today_jobs,
          COUNT(CASE WHEN scheduled_date = CURRENT_DATE + INTERVAL '1 day' THEN 1 END) as tomorrow_jobs,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_revenue
        FROM jobs
      `;

      const result = await db.query(statsQuery);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new JobController();
