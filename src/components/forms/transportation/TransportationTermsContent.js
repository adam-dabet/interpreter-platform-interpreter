import React from 'react';
import { VENDOR_PORTAL_AGREEMENT_TITLE } from '../../../utils/constants';

const TransportationTermsContent = () => (
  <div className="space-y-4 text-sm text-gray-700">
    <h1 className="text-xl font-bold text-gray-900 text-center">
      {VENDOR_PORTAL_AGREEMENT_TITLE}
    </h1>

    <p className="text-center text-gray-600">
      For Vendors, Providers, Drivers, Interpreters, Transportation Providers, and Other Network Participants
    </p>

    <div className="bg-gray-50 p-3 rounded-md text-sm">
      <p><strong>Company:</strong> The Integrity Company Ancillary Care Solutions Inc.</p>
      <p><strong>Address:</strong> 2424 Vista Way, Oceanside, CA 92054</p>
      <p><strong>Website:</strong> www.TheIntegrityCompanyInc.com</p>
    </div>

    <p>
      This Vendor Portal Access and Use Agreement (&quot;Agreement&quot;) is entered into by and between
      The Integrity Company Ancillary Care Solutions Inc. (&quot;Company,&quot; &quot;Integrity,&quot; &quot;we,&quot;
      &quot;us,&quot; or &quot;our&quot;) and the vendor, provider, subcontractor, user, or company accessing
      or using the vendor portal (&quot;Vendor,&quot; &quot;you,&quot; or &quot;your&quot;). This Agreement
      governs access to and use of Company&apos;s vendor portal, scheduling platform, job management tools,
      communication tools, completion reporting tools, billing features, and related systems (collectively,
      the &quot;Portal&quot;).
    </p>

    <p>
      By clicking &quot;I Agree,&quot; creating a Portal account, logging into the Portal, accepting an
      assignment, submitting a completion report, uploading documents, or otherwise using the Portal, Vendor
      agrees to be bound by this Agreement. If Vendor does not agree, Vendor must not access or use the Portal.
    </p>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">1. Purpose of Portal</h2>
      <p>
        The Portal is provided to allow approved Vendors to receive, review, accept, decline, complete,
        document, and bill authorized assignments issued by Company. Services may include transportation,
        interpreting, translation, ancillary care coordination, or other services authorized by Company.
      </p>
      <p className="mt-2">
        Portal access does not guarantee work, assignments, payment, exclusivity, preferred status, or continued
        participation in Company&apos;s vendor network.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">2. Authorized Users and Account Security</h2>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Vendor is responsible for all activity under its Portal account, usernames, passwords, devices, and authorized users.</li>
        <li>Vendor must limit Portal access to personnel who have a legitimate business need to perform services for Company.</li>
        <li>Vendor must keep login credentials confidential and must not share usernames or passwords with unauthorized persons.</li>
        <li>Vendor must immediately notify Company of any suspected unauthorized access, lost device, compromised password, account misuse, or security incident.</li>
        <li>Company may suspend, disable, or terminate Portal access at any time for security, compliance, business, credentialing, or performance reasons.</li>
      </ol>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">3. Vendor Responsibilities</h2>
      <p className="mb-2">Vendor agrees to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Use the Portal only for authorized Company business purposes.</li>
        <li>Keep all vendor profile, licensing, insurance, contact, service area, driver, vehicle, interpreter, and credentialing information current and accurate.</li>
        <li>Review all assignment details before accepting any job or service request.</li>
        <li>Immediately notify Company through the Portal or approved communication method if Vendor cannot complete an accepted assignment.</li>
        <li>Enter completion reports, timestamps, mileage, notes, no-show information, cancellation information, and supporting documentation accurately and timely.</li>
        <li>Upload invoices, W-9 forms, insurance certificates, licenses, permits, and other requested documents when required.</li>
        <li>Comply with all Company instructions, client requirements, applicable laws, and service-specific agreements.</li>
        <li>Not use the Portal to contact, solicit, bill, market to, or contract directly with Company clients or claimants outside of Company authorization.</li>
      </ul>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">4. Assignment Acceptance and Authorization</h2>
      <p>
        A Portal assignment is not authorized unless Company issues a specific job number, authorization number,
        assignment record, or written approval. Vendor must not perform or bill for services outside the scope
        of the assignment, authorization, or approved rate.
      </p>
      <p className="mt-2">
        Vendor is responsible for confirming all assignment details before accepting a job, including date, time,
        service type, location, claimant or patient instructions, language requirements, vehicle requirements,
        special equipment requirements, and rate information when available.
      </p>
      <p className="mt-2">
        Vendor must not change the assigned provider, driver, interpreter, vehicle type, service type, route,
        rate, location, or appointment time without Company approval, except in an emergency required to protect safety.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">5. Completion Reports, Invoices, and Payment Terms</h2>
      <p>
        Vendor must submit accurate and complete completion reports and invoices through the Portal or other
        approved method. Submission of a completion report or invoice does not guarantee payment if the service
        was unauthorized, incomplete, inaccurate, unsupported, late, disputed, or otherwise not payable under
        the applicable agreement.
      </p>
      <p className="mt-2">
        A proper invoice must include all information required by Company, including where applicable: Company
        job number, claimant name, date of service, time, service type, total hours or minutes billed, mileage,
        wait time, itemized charges, vendor name, proof of service, and supporting documentation.
      </p>
      <p className="mt-2">
        <strong>Payment Terms:</strong> Payment will be issued within forty-five (45) days from the date Company
        receives a proper invoice. While Company&apos;s current practice is to process payments within thirty (30)
        days, the maximum allowable payment period shall be forty-five (45) days.
      </p>
      <p className="mt-2">
        Company may reject, delay, dispute, offset, or deny payment for duplicate invoices, missing documents,
        inaccurate billing, unauthorized charges, late invoices, failure to follow Portal procedures, or breach
        of this Agreement or any related vendor agreement.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">6. Confidentiality and HIPAA / Privacy Obligations</h2>
      <p>
        Vendor acknowledges that the Portal may contain confidential information, protected health information,
        personally identifiable information, claim information, medical appointment information, addresses,
        phone numbers, service instructions, client information, pricing, rates, and other non-public information
        (collectively, &quot;Confidential Information&quot;).
      </p>
      <p className="mt-2">
        Vendor shall use Confidential Information only as necessary to perform authorized services for Company.
        Vendor shall not access, copy, download, print, photograph, disclose, sell, share, post, transmit, or use
        Confidential Information for any unauthorized purpose.
      </p>
      <p className="mt-2">
        Vendor shall comply with HIPAA and all applicable privacy, confidentiality, security, workers&apos;
        compensation, transportation, interpretation, health care, and data protection laws that apply to Vendor
        and the services performed.
      </p>
      <p className="mt-2">
        Vendor shall immediately notify Company of any actual or suspected unauthorized access, use, disclosure,
        loss, theft, breach, or compromise involving the Portal, Confidential Information, PHI, claimant information,
        client information, or Portal credentials.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">7. Prohibited Conduct</h2>
      <p className="mb-2">Vendor shall not:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Access or attempt to access information not assigned to Vendor or not necessary for Vendor&apos;s authorized work.</li>
        <li>Use the Portal for any unlawful, fraudulent, misleading, harassing, abusive, or improper purpose.</li>
        <li>Upload false, inaccurate, altered, misleading, or incomplete documents, completion reports, or invoices.</li>
        <li>Introduce viruses, malware, spyware, bots, scraping tools, or other harmful code.</li>
        <li>Attempt to bypass, disable, interfere with, reverse engineer, or test the security of the Portal.</li>
        <li>Share claimant, client, or assignment information with unauthorized persons.</li>
        <li>Directly bill claimants, patients, injured workers, clients, medical facilities, attorneys, insurers, or employers for Company-authorized services.</li>
        <li>Use Company client or claimant information to solicit work outside of Company.</li>
      </ul>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">8. Credentialing, Insurance, and Compliance Documents</h2>
      <p>
        Vendor must maintain all licenses, permits, registrations, certifications, insurance policies, driver
        documents, vehicle documents, professional qualifications, and other credentials required by law, Company,
        clients, or service type. Vendor must upload current documents when requested and must promptly update
        expired or changed documents.
      </p>
      <p className="mt-2">
        Company may suspend assignments, Portal access, or payment processing if Vendor credentialing documents
        are missing, expired, incomplete, inaccurate, or unacceptable.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">9. Records and Audit Rights</h2>
      <p>
        Vendor must maintain accurate records related to all services accepted, performed, reported, or billed through
        the Portal. Records may include completion reports, trip logs, invoices, mileage records, timestamps,
        signatures, licenses, insurance, incident reports, and communications.
      </p>
      <p className="mt-2">
        Company may review Portal submissions and request supporting documentation to verify compliance, billing
        accuracy, service completion, credentialing status, safety, and client requirements. Vendor must cooperate
        with reasonable audits and investigations.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">10. Intellectual Property and Portal Ownership</h2>
      <p>
        The Portal, including software, workflows, job records, forms, templates, content, data structure, Company
        names, logos, and related materials, is owned by Company or its licensors. Vendor receives a limited,
        revocable, non-exclusive, non-transferable right to use the Portal only for authorized Company business purposes.
      </p>
      <p className="mt-2">
        Vendor shall not copy, modify, reproduce, distribute, sell, license, or create derivative works from the
        Portal or Company materials without Company&apos;s prior written consent.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">11. Independent Contractor Status</h2>
      <p>
        Vendor is an independent contractor and is not an employee, partner, joint venturer, agent, or representative
        of Company. Portal access, assignment offers, communication tools, completion report requirements, or billing
        procedures do not create an employment relationship.
      </p>
      <p className="mt-2">
        Vendor remains solely responsible for its employees, contractors, drivers, interpreters, agents, taxes, wages,
        benefits, insurance, licenses, vehicles, equipment, and business expenses.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">12. Indemnification</h2>
      <p>
        Vendor shall indemnify, defend, and hold harmless Company, its officers, directors, employees, representatives,
        clients, and customers from and against any claims, losses, damages, liabilities, fines, penalties, costs, and
        expenses, including reasonable attorneys&apos; fees, arising out of or related to Vendor&apos;s use of the
        Portal, services performed, breach of this Agreement, violation of law, inaccurate submissions, billing errors,
        confidentiality violations, HIPAA/privacy incidents, negligence, misconduct, or acts or omissions of Vendor
        or Vendor&apos;s personnel.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">13. Limitation of Liability</h2>
      <p>
        The Portal is provided for business use and may be modified, suspended, interrupted, or discontinued. To the
        maximum extent permitted by law, Company is not liable for indirect, incidental, consequential, special,
        punitive, or exemplary damages arising from Portal use, inability to access the Portal, data errors, delays,
        interruptions, or assignment availability. Company&apos;s total liability under this Agreement shall not
        exceed the amounts paid by Company to Vendor for Portal-related assignments during the three (3) months
        preceding the event giving rise to the claim, except where prohibited by law or in cases of Company&apos;s
        gross negligence or willful misconduct.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">14. Suspension and Termination</h2>
      <p>
        Company may suspend or terminate Vendor&apos;s Portal access, assignment eligibility, or network participation
        at any time, with or without notice, for security concerns, credentialing issues, non-performance, billing
        concerns, legal compliance, client request, suspected fraud, confidentiality concerns, safety concerns,
        breach of this Agreement, or business reasons.
      </p>
      <p className="mt-2">
        Upon termination or suspension, Vendor must stop accessing the Portal and must return, delete, or protect
        Company Confidential Information as instructed by Company and as required by law.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">15. Relationship to Other Agreements</h2>
      <p>
        This Agreement supplements any transportation vendor agreement, interpreter agreement, provider agreement,
        subcontractor agreement, fee schedule, statement of work, authorization, or other written agreement between
        Vendor and Company. If there is a conflict, the more specific service agreement or written authorization
        controls for the applicable service, unless Company states otherwise in writing.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">16. Electronic Acceptance and Signature</h2>
      <p>
        Vendor agrees that electronic acceptance, check-box acceptance, typed name, digital signature, click-through
        agreement, Portal login, or continued Portal use may be treated as Vendor&apos;s legally binding signature
        and acceptance of this Agreement to the fullest extent permitted by law.
      </p>
      <p className="mt-2">
        The individual accepting this Agreement represents that they are authorized to bind Vendor to this Agreement.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">17. Governing Law and Venue</h2>
      <p>
        This Agreement is governed by the laws of the State of California. Venue for disputes shall be in the state
        or federal courts located in San Diego County, California, unless a different venue is required by law.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">18. Updates to Agreement</h2>
      <p>
        Company may update this Agreement from time to time by posting the updated version in the Portal, sending
        notice, or requiring renewed acceptance. Continued use of the Portal after an update constitutes acceptance
        of the updated Agreement.
      </p>
    </section>

    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">19. Vendor Acknowledgment</h2>
      <p className="mb-2">Vendor acknowledges and agrees that:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Vendor has read and understands this Agreement.</li>
        <li>Vendor agrees to comply with all Portal rules, Company instructions, and applicable laws.</li>
        <li>Vendor is responsible for all Portal activity under Vendor&apos;s account.</li>
        <li>Vendor will protect claimant, client, PHI, and confidential information.</li>
        <li>Vendor understands that payment requires a proper invoice and compliance with Company requirements.</li>
      </ul>
    </section>

    <div className="mt-4 pt-4 border-t border-gray-300">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-md font-semibold text-gray-900 mb-2">Company Contact Information</h3>
        <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
        <p>2424 Vista Way, Oceanside, CA 92054</p>
        <p className="mt-1">Phone: 888-418-2565</p>
        <p>Email: customerservice@theintegritycompanyinc.com</p>
      </div>
    </div>
  </div>
);

export default TransportationTermsContent;
