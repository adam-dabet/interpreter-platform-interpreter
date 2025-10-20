import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Independent Contractor Interpreter Agreement
        </h1>
        
        <div className="text-sm text-gray-600 mb-6">
          <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
        </div>

        <div className="space-y-6 text-gray-700">
          <p>
            This Independent Contractor Interpreter Agreement ("Agreement") is entered into by and between:
          </p>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="font-semibold mb-2">
              The Integrity Company Ancillary Care Solutions Inc. ("Company")
            </p>
            <p>
              with its principal place of business at 2424 Vista Way, Suite 125, Oceanside, CA 92054 
              (or such other address as Company may later designate without affecting the validity of this Agreement),
            </p>
            <p className="mt-4 font-semibold">and</p>
            <p className="mt-2">
              Interpreter ("Contractor"), an independent contractor
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Independent Contractor Relationship</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Contractor is engaged as an independent contractor and not as an employee, agent, partner, 
                or joint venturer of Company.
              </li>
              <li>
                Contractor shall have no authority to bind Company or represent itself as an employee of Company.
              </li>
              <li>
                Contractor acknowledges that California Labor Code § 2750.3 ("AB 5") requires independent 
                contractors to meet certain conditions. Contractor agrees this engagement falls under the 
                professional services exemption and Contractor shall exercise discretion and independent 
                judgment in performing interpreting services.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Services</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Contractor agrees to provide interpretation and related language services on an as-needed 
                basis as scheduled by Company.
              </li>
              <li>
                Contractor shall determine the method, manner, and means of performing services, subject 
                only to the requirements of the assignment.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Contractor Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain all licenses, certifications, and permits required by law.</li>
              <li>
                Maintain active Errors & Omissions (E&O) insurance and provide proof of coverage to Company 
                upon request.
              </li>
              <li>
                Provide any other documentation required by law or Company (e.g., W-9, business license, 
                professional certifications).
              </li>
              <li>
                Be responsible for all federal, state, and local taxes arising from compensation received 
                under this Agreement.
              </li>
              <li>
                Supply and maintain all tools, equipment, and resources necessary to perform interpreting services.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              4. Compensation, Invoicing, Cancellations & No-Shows
            </h2>
            <div className="space-y-3">
              <p>
                Contractor shall be compensated according to agreed assignment rates as set forth in writing 
                at the time of scheduling.
              </p>
              <p>No minimum amount of work is guaranteed.</p>
              <p>
                Contractor is not eligible for employee benefits (including but not limited to health insurance, 
                retirement benefits, vacation, or sick leave).
              </p>
              
              <div className="mt-4">
                <p className="font-semibold mb-2">Invoices:</p>
                <p>
                  Contractor must submit an invoice for every job performed. Each invoice shall include: 
                  (a) The Integrity Company job number; (b) Date of service; (c) Start and end time of service; 
                  and (d) Total hours billed.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Payment Terms:</p>
                <p>
                  Payment will be issued within forty-five (45) days from the date Company receives a proper 
                  invoice. While Company's current practice is to process payments within thirty (30) days, 
                  the maximum allowable payment period shall be forty-five (45) days.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Mileage Policy:</p>
                <p>
                  Mileage reimbursement is not authorized for assignments located within a twenty-five (25) 
                  mile radius of the assignment location. For assignments beyond that radius, mileage must be 
                  requested in advance and approved in writing by Company. If mileage is not requested and 
                  approved prior to the assignment, any mileage submitted on an invoice will be declined and 
                  not paid.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Interpreter Cancellations:</p>
                <p>
                  Should Contractor be unable to attend an assignment, Contractor must notify Company immediately. 
                  Failure to provide advance notice will result in a last-minute cancellation fee for the missed 
                  appointment, equal to the minimum reserved hours for that assignment. Company will make every 
                  reasonable effort to secure an alternate interpreter and mitigate such fees.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">24-Hour Cancellation Rule:</p>
                <p>
                  If an assignment is canceled by the Company or client with less than twenty-four (24) hours' 
                  notice, Contractor shall be compensated for the minimum reserved hours or agreed flat rate 
                  for that assignment.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Interpreter No-Show:</p>
                <p>
                  If Contractor confirms an assignment but fails to appear without at least twenty-four (24) 
                  hours' prior notice to Company, Contractor shall be responsible for reimbursing Company the 
                  minimum rate that Contractor would have charged Company for that assignment. Such reimbursement 
                  may be deducted from future payments owed to Contractor or pursued directly by Company.
                </p>
              </div>

              <div className="mt-4">
                <p className="font-semibold mb-2">Repeated No-Shows:</p>
                <p>
                  Two (2) or more unexcused no-shows within any twelve (12) month period shall constitute 
                  grounds for immediate termination of this Agreement by Company.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Confidentiality & HIPAA Compliance</h2>
            <div className="space-y-3">
              <p>
                Contractor acknowledges that services may involve confidential or protected health information (PHI).
              </p>
              <p>
                Contractor agrees to comply fully with the Health Insurance Portability and Accountability Act 
                of 1996 (HIPAA) and all related regulations, including safeguarding PHI, limiting access only 
                to authorized individuals, and reporting any suspected or actual breaches immediately to Company.
              </p>
              <p>
                <span className="font-semibold">Definition of Confidential Information:</span> Information is 
                deemed Confidential Information if, given the nature of Company's business, a reasonable person 
                would consider such information confidential.
              </p>
              <p>
                Contractor agrees: (a) to exercise the same degree of care as he/she accords to his/her own 
                confidential information, but in no case less than reasonable care; and (b) to use Confidential 
                Information which Company provides to Contractor only for the performance of Services for Company 
                and not for Contractor's own benefit.
              </p>
              <p className="font-semibold text-red-600">
                Notwithstanding any other provision in this Agreement, Company has the right to immediately 
                terminate this Agreement in the event of any breach of this provision.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Code of Ethics for Interpreters</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Accuracy and Completeness:</span> Render all messages faithfully 
                and accurately without omission, addition, or distortion.
              </li>
              <li>
                <span className="font-semibold">Confidentiality:</span> Protect the privacy of all parties and 
                maintain strict confidentiality regarding all information learned during assignments.
              </li>
              <li>
                <span className="font-semibold">Impartiality:</span> Remain neutral and avoid conflicts of 
                interest. Disclose any real or potential conflicts to Company immediately.
              </li>
              <li>
                <span className="font-semibold">Professional Conduct:</span> Conduct oneself with professionalism, 
                respect, and courtesy at all times.
              </li>
              <li>
                <span className="font-semibold">Competence:</span> Accept only assignments within one's 
                qualifications, skills, and certifications.
              </li>
              <li>
                <span className="font-semibold">Continuous Improvement:</span> Maintain and improve language 
                proficiency, cultural competence, and interpreting skills through ongoing professional development.
              </li>
              <li>
                <span className="font-semibold">Compliance with Law:</span> Adhere to all applicable federal, 
                state, and local laws, including HIPAA and patient rights laws.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Non-Solicitation & Non-Circumvention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Contractor agrees not to solicit, contract with, or accept work directly from any Company client, 
                customer, or referral source introduced through the Company during the term of this Agreement 
                and for a period of twelve (12) months following termination.
              </li>
              <li>
                Contractor acknowledges that all clients and referral sources are the exclusive property of 
                the Company.
              </li>
              <li>
                Any violation of this provision shall entitle Company to seek injunctive relief, damages, and 
                recovery of all lost profits resulting from the breach.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Indemnification</h2>
            <div className="space-y-3">
              <p>
                Contractor shall indemnify, defend, and hold harmless Company, its officers, employees, and 
                clients from and against any claims, damages, liabilities, costs, and expenses arising from 
                Contractor's negligence, misconduct, or failure to comply with this Agreement.
              </p>
              <p>
                Each Party hereby agrees to indemnify and hold harmless the other and such indemnified Party's 
                subsidiaries, directors, officers, agents, and employees from and against all claims, liabilities, 
                and expenses, including reasonable attorneys' fees, which may result from acts, omissions, or 
                breach of this Agreement by the indemnifying Party, its subcontractors, employees, or agents. 
                This provision shall survive the termination of this Agreement.
              </p>
              <p>
                <span className="font-semibold">Limitation of Liability:</span> Notwithstanding anything to the 
                contrary, except in cases of willful misconduct or gross negligence, Contractor's entire liability 
                to Company for damages or other amounts arising out of or in connection with the services provided 
                under this Agreement shall not exceed the total amount of payments made by Company to Contractor 
                under this Agreement.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Term & Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                This Agreement shall commence on the date of acceptance and remain in effect until terminated 
                by either party upon written notice.
              </li>
              <li>
                Either party may terminate this Agreement at any time, with or without cause, upon written notice.
              </li>
              <li>
                Company may terminate this Agreement immediately in the event of repeated no-shows, ethical 
                violations, or breach of confidentiality.
              </li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Governing Law</h2>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of the State of California.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Notices and Address Changes</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                All notices shall be sent to the addresses provided, unless either party provides written 
                notice of a change of address.
              </li>
              <li>
                A change in address by either party shall not void or otherwise affect the enforceability 
                of this Agreement.
              </li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Entire Agreement</h2>
            <p>
              This Agreement constitutes the entire understanding between the parties and supersedes all prior 
              agreements or understandings, whether oral or written.
            </p>
          </section>

          {/* Company Information */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Contact Information</h3>
              <p className="font-semibold">The Integrity Company Ancillary Care Solutions Inc.</p>
              <p>2424 Vista Way, Suite 125</p>
              <p>Oceanside, CA 92054</p>
              <p className="mt-2">Phone: 888-418-2565</p>
              <p>Email: support@theintegritycompanyinc.com</p>
            </div>
          </div>

          {/* Acceptance Notice */}
          <div className="mt-8 p-6 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Note:</span> By accepting the terms and conditions during the 
              registration process, you acknowledge that you have read, understood, and agree to be bound by 
              this Independent Contractor Interpreter Agreement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;

