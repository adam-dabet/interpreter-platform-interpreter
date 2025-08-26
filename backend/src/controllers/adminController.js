const db = require('../config/database');
const emailService = require('../services/emailService');
const Interpreter = require('../models/Interpreter');
const loggerService = require('../services/loggerService');
const userService = require('../services/userService');

class AdminController {
  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      // Get interpreter profile statistics
      const overview = await Interpreter.getDashboardStats();
      
      // Get top languages
      const languagesResult = await db.query(`
        SELECT l.name as language_name, COUNT(*) as count
        FROM interpreter_languages il
        JOIN languages l ON il.language_id = l.id
        JOIN interpreters i ON il.interpreter_id = i.id
        WHERE i.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY l.name
        ORDER BY count DESC
        LIMIT 5
      `);
      
      // Get service type distribution
      const serviceTypesResult = await db.query(`
        SELECT st.name as service_type, COUNT(*) as count
        FROM interpreter_service_types ist
        JOIN service_types st ON ist.service_type_id = st.id
        JOIN interpreters i ON ist.interpreter_id = i.id
        WHERE i.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY st.name
        ORDER BY count DESC
      `);

      await loggerService.info('Dashboard stats retrieved', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl
      });
      
      res.json({
        success: true,
        data: {
          overview: {
            pending_profiles: parseInt(overview.pending_profiles) || 0,
            under_review: parseInt(overview.under_review) || 0,
            draft_profiles: parseInt(overview.draft_profiles) || 0,
            this_week_submissions: parseInt(overview.this_week_submissions) || 0,
            approval_rate: parseFloat(overview.approval_rate) || 0,
            avg_review_time_hours: parseFloat(overview.avg_review_time_hours) || 0
          },
          top_languages: languagesResult.rows,
          service_type_distribution: serviceTypesResult.rows
        }
      });
    } catch (error) {
      await loggerService.error('Failed to get dashboard statistics', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics'
      });
    }
  }

  // Get pending interpreter profiles
  async getPendingProfiles(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;
      
      const filters = {};
      // Default to showing pending profiles for the "pending" endpoint
      if (status) {
        filters.status = status;
      } else {
        filters.status = 'pending';
      }
      
      const result = await Interpreter.getAll(filters, parseInt(limit), offset);
      
      await loggerService.info('Pending profiles retrieved', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        count: result.interpreters.length,
        filters
      });
      
      // Format profiles for frontend (match the expected field names from admin dashboard)
      const applications = result.interpreters.map(profile => ({
        id: profile.id,
        applicant_name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.phone,
        state: profile.state_name,
        state_code: profile.state_code,
        languages: profile.languages, // Now comes from the updated Interpreter.getAll method
        service_types: profile.service_types, // Now comes from the updated Interpreter.getAll method
        years_experience: profile.years_of_experience,
        submission_date: profile.created_at,
        application_status: profile.profile_status,
        created_at: profile.created_at,
        days_pending: Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: {
          applications, // Changed from 'profiles' to 'applications' to match dashboard expectation
          pagination: {
            current_page: parseInt(page),
            total_count: result.totalCount,
            has_more: result.hasMore,
            per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      await loggerService.error('Failed to get pending profiles', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get pending profiles'
      });
    }
  }

  // Get interpreter profile details
  async getProfileDetails(req, res) {
    try {
      const { profileId } = req.params;
      
      const profile = await Interpreter.findById(profileId);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Format languages, service_types, service_rates, certificates, and w9_forms for frontend display
      const formattedProfile = {
        ...profile,
        // Map field names to match frontend expectations
        years_experience: profile.years_of_experience,
        application_status: profile.profile_status,
        submission_date: profile.created_at,
        languages: Array.isArray(profile.languages) 
          ? profile.languages.map(lang => lang.language_name || lang.native_name || 'Unknown').join(', ')
          : (profile.languages || 'N/A'),
        service_types: Array.isArray(profile.service_types)
          ? profile.service_types.map(service => service.service_type_name || service.service_type_code || 'Unknown').join(', ')
          : (profile.service_types || 'N/A'),
        service_rates: Array.isArray(profile.service_rates) ? profile.service_rates : [],
        certificates: Array.isArray(profile.certificates) ? profile.certificates : [],
        w9_forms: Array.isArray(profile.w9_forms) ? profile.w9_forms : []
      };

      await loggerService.info('Profile details retrieved', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId,
        email: profile.email
      });

      res.json({
        success: true,
        data: formattedProfile
      });

    } catch (error) {
      await loggerService.error('Failed to get profile details', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId: req.params.profileId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get profile details'
      });
    }
  }

  // Update interpreter profile status
  async updateProfileStatus(req, res) {
    try {
      const { profileId } = req.params;
      const { status, notes } = req.body;

      const updatedProfile = await Interpreter.updateStatus(
        profileId, 
        status, 
        req.user?.userId, 
        notes
      );

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      await loggerService.info('Profile status updated', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId,
        newStatus: status,
        updatedBy: req.user?.userId
      });

      res.json({
        success: true,
        message: 'Profile status updated successfully',
        data: updatedProfile
      });

    } catch (error) {
      await loggerService.error('Failed to update profile status', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId: req.params.profileId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update profile status'
      });
    }
  }

  // Get all interpreter profiles (not just pending)
  async getAllProfiles(req, res) {
    try {
      const { page = 1, limit = 10, status, search, language, service_type, state } = req.query;
      const offset = (page - 1) * limit;
      
      const filters = {};
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (language) filters.language = language;
      if (service_type) filters.service_type = service_type;
      if (state) filters.state = state;
      
      const result = await Interpreter.getAll(filters, parseInt(limit), offset);
      
      await loggerService.info('All profiles retrieved', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        count: result.interpreters.length,
        filters
      });
      
      // Format profiles for frontend
      const applications = result.interpreters.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        applicant_name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.phone,
        street_address: profile.street_address,
        street_address_2: profile.street_address_2,
        city: profile.city,
        state: profile.state_name,
        state_code: profile.state_code,
        zip_code: profile.zip_code,
        formatted_address: profile.formatted_address,
        languages: profile.languages || 'N/A',
        service_types: profile.service_types || 'N/A',
        service_rates: profile.service_rates || [],
        certificates: profile.certificates || [],
        w9_forms: profile.w9_forms || [],
        years_experience: profile.years_of_experience,
        hourly_rate: profile.hourly_rate,
        bio: profile.bio,
        availability_notes: profile.availability_notes,
        submission_date: profile.created_at,
        application_status: profile.profile_status,
        verification_status: profile.verification_status,
        created_at: profile.created_at,
        days_pending: Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24))
      }));

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            current_page: parseInt(page),
            total_count: result.totalCount,
            has_more: result.hasMore,
            per_page: parseInt(limit)
          }
        }
      });

    } catch (error) {
      await loggerService.error('Failed to get all profiles', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get all profiles'
      });
    }
  }

  // Approve interpreter profile
  async approveProfile(req, res) {
    try {
      const { profileId } = req.params;
      const { notes } = req.body;

      // Update status to approved
      const updatedProfile = await Interpreter.updateStatus(
        profileId, 
        'approved', 
        req.user?.userId, 
        notes
      );

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Get full profile details for email notification
      const fullProfile = await Interpreter.findById(profileId);

      // Create user account and send approval email notification
      try {
        // Create user account for the approved interpreter
        const userCredentials = await userService.createInterpreterUser(fullProfile);
        
        // Send approval email with login credentials
        await emailService.sendInterpreterApproval({
          email: fullProfile.email,
          name: `${fullProfile.first_name} ${fullProfile.last_name}`,
          notes: notes || '',
          loginUrl: userCredentials.loginUrl,
          username: userCredentials.username,
          tempPassword: userCredentials.tempPassword
        });
        
        await loggerService.info('User account created and approval email sent', {
          category: 'ADMIN',
          profileId,
          userId: userCredentials.userId,
          email: fullProfile.email
        });
        
      } catch (emailError) {
        // Log email error but don't fail the approval
        await loggerService.warn('Failed to create user account or send approval email', {
          category: 'EMAIL',
          profileId,
          email: fullProfile.email,
          error: emailError.message
        });
      }

      await loggerService.info('Profile approved', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId,
        approvedBy: req.user?.userId,
        email: fullProfile.email
      });

      res.json({
        success: true,
        message: 'Profile approved successfully',
        data: updatedProfile
      });

    } catch (error) {
      await loggerService.error('Failed to approve profile', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId: req.params.profileId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to approve profile'
      });
    }
  }

  // Reject interpreter profile
  async rejectProfile(req, res) {
    try {
      const { profileId } = req.params;
      const { rejection_reason, notes } = req.body;

      // Update status to rejected
      const updatedProfile = await Interpreter.updateStatus(
        profileId, 
        'rejected', 
        req.user?.userId, 
        rejection_reason
      );

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Get full profile details for email notification
      const fullProfile = await Interpreter.findById(profileId);

      // Send rejection email notification
      try {
        await emailService.sendInterpreterRejection({
          email: fullProfile.email,
          name: `${fullProfile.first_name} ${fullProfile.last_name}`,
          rejection_reason,
          notes: notes || ''
        });
      } catch (emailError) {
        // Log email error but don't fail the rejection
        await loggerService.warn('Failed to send rejection email', {
          category: 'EMAIL',
          profileId,
          email: fullProfile.email,
          error: emailError.message
        });
      }

      await loggerService.info('Profile rejected', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId,
        rejectedBy: req.user?.userId,
        email: fullProfile.email,
        rejection_reason
      });

      res.json({
        success: true,
        message: 'Profile rejected successfully',
        data: updatedProfile
      });

    } catch (error) {
      await loggerService.error('Failed to reject profile', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId: req.params.profileId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to reject profile'
      });
    }
  }

  // Delete interpreter profile
  async deleteProfile(req, res) {
    try {
      const { profileId } = req.params;

      // Check if profile exists
      const existingProfile = await Interpreter.findById(profileId);
      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      // Delete the profile and all related data
      const deletedProfile = await Interpreter.deleteById(profileId);

      await loggerService.info('Profile deleted', {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId,
        deletedBy: req.user?.userId,
        email: existingProfile.email
      });

      res.json({
        success: true,
        message: 'Profile deleted successfully',
        data: {
          id: deletedProfile.id,
          email: deletedProfile.email,
          name: `${deletedProfile.first_name} ${deletedProfile.last_name}`
        }
      });

    } catch (error) {
      await loggerService.error('Failed to delete profile', error, {
        category: 'ADMIN',
        userId: req.user?.userId,
        endpoint: req.originalUrl,
        profileId: req.params.profileId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete profile'
      });
    }
  }
}

module.exports = new AdminController();