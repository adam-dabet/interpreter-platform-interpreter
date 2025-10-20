import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Privacy Policy
        </h1>
        
        <div className="text-sm text-gray-600 mb-6">
          <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
          <p>Effective Date: December 2024</p>
          <p>Last Updated: December 2024</p>
        </div>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              The Integrity Company Ancillary Care Solutions Inc. ("Company," "we," "us," or "our") is 
              committed to protecting the privacy and security of your personal information. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when you use 
              our interpreter platform and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg mb-2">Personal Information</h3>
                <p>We collect personal information that you provide to us, including but not limited to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Name, address, phone number, and email address</li>
                  <li>Social Security Number or Tax Identification Number (for tax reporting purposes)</li>
                  <li>Professional credentials, certifications, and licenses</li>
                  <li>Language proficiency and qualifications</li>
                  <li>Work history and references</li>
                  <li>Banking information for payment processing</li>
                  <li>Insurance information (E&O insurance)</li>
                  <li>W-9 forms and tax documentation</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Assignment Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Job assignments and scheduling details</li>
                  <li>Service location and client information</li>
                  <li>Time tracking and attendance records</li>
                  <li>Invoices and payment records</li>
                  <li>Completion reports and service notes</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Technical Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Usage data and platform interactions</li>
                  <li>Login credentials and authentication data</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <span className="font-semibold">Service Provision:</span> To facilitate interpreter assignments, 
                scheduling, and coordination with clients
              </li>
              <li>
                <span className="font-semibold">Payment Processing:</span> To process payments, invoices, and 
                maintain financial records
              </li>
              <li>
                <span className="font-semibold">Compliance:</span> To comply with legal obligations, including 
                tax reporting and regulatory requirements
              </li>
              <li>
                <span className="font-semibold">Platform Operations:</span> To maintain, improve, and secure 
                our platform and services
              </li>
              <li>
                <span className="font-semibold">Communication:</span> To send notifications, updates, and 
                important information about assignments and services
              </li>
              <li>
                <span className="font-semibold">Quality Assurance:</span> To monitor service quality and ensure 
                compliance with professional standards
              </li>
              <li>
                <span className="font-semibold">Security:</span> To protect against fraud, unauthorized access, 
                and other security threats
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. HIPAA Compliance</h2>
            <div className="space-y-3">
              <p>
                As interpreters working in healthcare settings, you may be exposed to Protected Health 
                Information (PHI) as defined under the Health Insurance Portability and Accountability Act 
                (HIPAA).
              </p>
              <p className="font-semibold">Our HIPAA Commitments:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We maintain strict safeguards to protect PHI</li>
                <li>Access to PHI is limited to authorized personnel only</li>
                <li>We provide HIPAA training and compliance requirements to all interpreters</li>
                <li>We implement technical, physical, and administrative safeguards</li>
                <li>We require immediate reporting of any suspected or actual breaches</li>
                <li>We maintain Business Associate Agreements (BAAs) with covered entities</li>
              </ul>
              <p className="text-red-600 font-semibold mt-3">
                Any breach of HIPAA requirements may result in immediate termination and legal consequences.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Information Sharing and Disclosure</h2>
            <div className="space-y-3">
              <p>We may share your information in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">With Clients:</span> We share necessary information with 
                  clients to facilitate interpreter services (e.g., name, qualifications, language skills)
                </li>
                <li>
                  <span className="font-semibold">Service Providers:</span> We may share information with 
                  third-party service providers who assist with payment processing, platform hosting, and 
                  other operational needs
                </li>
                <li>
                  <span className="font-semibold">Legal Requirements:</span> We may disclose information when 
                  required by law, court order, or government request
                </li>
                <li>
                  <span className="font-semibold">Tax Authorities:</span> We share tax-related information 
                  with federal and state tax authorities as required by law
                </li>
                <li>
                  <span className="font-semibold">Business Transfers:</span> In the event of a merger, 
                  acquisition, or sale of assets, your information may be transferred to the new entity
                </li>
              </ul>
              <p className="mt-3 font-semibold">
                We do NOT sell your personal information to third parties for marketing purposes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information, including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and updates</li>
              <li>Employee training on data security and privacy</li>
              <li>Incident response and breach notification procedures</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the Internet or electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your information, we cannot 
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined 
              in this Privacy Policy, unless a longer retention period is required or permitted by law. 
              This includes:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Tax records: Minimum of 7 years as required by law</li>
              <li>Employment records: As required by applicable labor laws</li>
              <li>Service records: For the duration of our business relationship plus applicable statute of limitations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights and Choices</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <span className="font-semibold">Access:</span> Request access to your personal information
              </li>
              <li>
                <span className="font-semibold">Correction:</span> Request correction of inaccurate information
              </li>
              <li>
                <span className="font-semibold">Deletion:</span> Request deletion of your information 
                (subject to legal retention requirements)
              </li>
              <li>
                <span className="font-semibold">Opt-Out:</span> Opt-out of certain communications 
                (note: some communications are required for service provision)
              </li>
              <li>
                <span className="font-semibold">Data Portability:</span> Request a copy of your information 
                in a portable format
              </li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. California Privacy Rights</h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer 
              Privacy Act (CCPA), including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to say no to the sale of personal information</li>
              <li>Right to access your personal information</li>
              <li>Right to equal service and price</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 18. We do not knowingly collect 
              personal information from children under 18. If we become aware that we have collected personal 
              information from a child under 18, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new Privacy Policy on our platform and updating the "Last Updated" date. Your 
              continued use of our services after such modifications constitutes your acknowledgment and 
              acceptance of the modified Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on servers located outside of your state, 
              province, country, or other governmental jurisdiction. By using our services, you consent to 
              the transfer of your information to facilities located in the United States and other countries.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Third-Party Links</h2>
            <p>
              Our platform may contain links to third-party websites. We are not responsible for the privacy 
              practices or content of these third-party sites. We encourage you to read the privacy policies 
              of any third-party sites you visit.
            </p>
          </section>

          {/* Contact Information */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h3>
              <p className="mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
              <p>2424 Vista Way, Suite 125</p>
              <p>Oceanside, CA 92054</p>
              <p className="mt-2">Phone: 888-418-2565</p>
              <p>Email: support@theintegritycompanyinc.com</p>
              <p className="mt-4">
                <span className="font-semibold">Privacy Officer:</span> For privacy-specific inquiries, 
                you may contact our Privacy Officer at the above address.
              </p>
            </div>
          </div>

          {/* Acknowledgment */}
          <div className="mt-8 p-6 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Acknowledgment:</span> By accepting the Privacy Policy during 
              the registration process, you acknowledge that you have read, understood, and agree to the 
              collection, use, and disclosure of your personal information as described in this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

