// src/constants/termsOfServiceText.ts

export interface TermsHtmlColors {
  background: string;
  text: string;
  primary: string;
  warningBackground: string;
  warningText: string;
  warningBorder: string;
  error: string;
  divider: string;
}

export const getTermsOfServiceHTML = (colors: TermsHtmlColors): string => `
<!DOCTYPE html>
<html lang="en">
<head>
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
   <style>
       body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${colors.background}; color: ${colors.text}; padding: 20px; line-height: 1.6; font-size: 16px; }
       h1 { color: ${colors.primary}; font-size: 24px; margin-bottom: 10px; border-bottom: 2px solid ${colors.divider}; padding-bottom: 10px; }
       h2 { color: ${colors.text}; font-size: 19px; margin-top: 30px; margin-bottom: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid ${colors.divider}; padding-bottom: 5px; }
       h3 { color: ${colors.text}; font-size: 17px; margin-top: 20px; margin-bottom: 10px; font-weight: 600; opacity: 0.9; }
       p { margin-bottom: 15px; }
       ul, ol { margin-bottom: 15px; padding-left: 20px; }
       li { margin-bottom: 8px; }
       strong { font-weight: 700; }
      .critical { border: 2px solid ${colors.error}; background-color: rgba(255, 0, 0, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold; color: ${colors.text}; }
      .warning { border: 1px solid ${colors.warningBorder}; background-color: ${colors.warningBackground}; color: ${colors.warningText}; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .apple-section { border: 1px solid ${colors.divider}; background-color: rgba(128, 128, 128, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0; }
      .footer { margin-top: 40px; border-top: 1px solid ${colors.divider}; padding-top: 20px; font-size: 14px; opacity: 0.7; }
       a { color: ${colors.primary}; text-decoration: none; }
   </style>
</head>
<body>

   <h1>Terms of Service</h1>
   <p><strong>Last Updated: December 1, 2025</strong></p>

   <h2>1. Preamble and Binding Agreement</h2>
   <p>These Terms of Service ("Terms") constitute a binding legal agreement between you ("User," "You," or "Your") and the developer of Macros Vision AI ("Developer," "We," "Us," or "Our"), a legal entity operating under the laws of the State of Israel.</p>
   <p>By downloading, installing, accessing, purchasing "Coins," subscribing to, or using the Macros Vision AI mobile application (the "Service" or "App"), you explicitly acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
   
   <div class="warning">
       <strong>WARNING:</strong> THESE TERMS CONTAIN A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER FOR RESIDENTS OF THE UNITED STATES (SECTION 12). IT AFFECTS YOUR RIGHTS TO RESOLVE DISPUTES.
   </div>

   <p>If you do not agree to these Terms, you must immediately uninstall the App and cease all use of the Service.</p>

   <h2>2. Not a Medical Device & Health Disclaimer</h2>
   
   <h3>2.1 General Wellness Tool</h3>
   <p>The Service is a data aggregation and estimation tool designed solely for general wellness tracking, recreational use, and informational purposes. It is <strong>NOT</strong> a medical device. It is <strong>NOT</strong> intended to diagnose, cure, mitigate, treat, or prevent any disease, disorder, or medical condition.</p>

   <h3>2.2 No Medical Advice</h3>
   <p>Nothing within the Service—including but not limited to calorie counts, macronutrient estimates ("Macros"), nutritional grades (A-F scores), or metabolic calculations (BMR/TDEE)—constitutes medical advice, diagnosis, or treatment. All content is generated for informational purposes only. The "Nutritional Grades" provided by the App are heuristic suggestions based on general wellness principles and do not correspond to any clinical standard or government-issued dietary guideline.</p>

   <h3>2.3 High-Risk Usage Prohibited</h3>
   <p>You expressly acknowledge that the Service is inappropriate for, and must not be relied upon for, the management of critical medical conditions, including but not limited to:</p>
   <ul>
       <li><strong>Diabetes:</strong> Calculating insulin or medication dosages based on App estimates.</li>
       <li><strong>Eating Disorders:</strong> Management of Anorexia, Bulimia, or other disorders.</li>
       <li><strong>Pregnancy:</strong> Monitoring nutritional intake during pregnancy or breastfeeding.</li>
   </ul>
   <p><strong>YOU ASSUME FULL RESPONSIBILITY FOR YOUR HEALTH.</strong> Always consult with a qualified healthcare provider before making significant changes to your diet or relying on nutritional data.</p>

   <div class="critical">
       <h3>2.4 STRICT PROHIBITION ON ALLERGEN DETECTION</h3>
       <p>CRITICAL WARNING: The Service utilizes probabilistic Artificial Intelligence (AI) and Computer Vision to estimate food content. AI CANNOT reliably detect ingredients that are hidden, dissolved, cross-contaminated, or obscured (e.g., peanut oil in a sauce, gluten traces, shellfish stock, dissolved sugars).</p>
       <p>RELIANCE ON THIS SERVICE FOR ALLERGEN DETECTION IS STRICTLY PROHIBITED. We expressly disclaim all liability for injury, anaphylaxis, hospitalization, or death resulting from reliance on the App for allergen identification. You agree that using the App for allergen safety constitutes a material breach of these Terms and a misuse of the Service.</p>
   </div>

   <h2>3. Artificial Intelligence Limitations & Liability</h2>

   <h3>3.1 Experimental Technology</h3>
   <p>You acknowledge that the AI Analysis features (text-to-macros, image-to-macros) are provided on an "As-Is" and "Experimental" basis. The Service utilizes third-party Generative AI models (e.g., OpenAI, Google Gemini) which are subject to latency, downtime, and modification. We make no warranties regarding the continuous availability or accuracy of these features.</p>

   <h3>3.2 Probabilistic Nature & Hallucinations</h3>
   <p>You understand that Generative AI is probabilistic, not deterministic. It predicts the most likely response based on patterns, which may result in "hallucinations"—outputs that sound confident and plausible but are factually incorrect.</p>
   <ul>
       <li>The App may misidentify a fried food as grilled.</li>
       <li>The App may significantly under- or over-estimate portion sizes.</li>
       <li>The App may generate nutritional values that defy the laws of physics (e.g., more protein than total weight).</li>
   </ul>

   <h3>3.3 The "Human-in-the-Loop" Doctrine</h3>
   <p>You agree that the AI acts solely as a drafting assistant. You assume the role of the "Human-in-the-Loop." It is your sole responsibility to:</p>
   <ol>
       <li>Verify the identity of the food recognized by the AI.</li>
       <li>Validate the estimated portion sizes and weight.</li>
       <li>Cross-reference nutritional values with trusted sources before saving them to your log.</li>
   </ol>
   <p>By saving an entry, you accept the data as your own and release the Developer from any liability regarding its accuracy.</p>

   <h2>4. Virtual Currency ("Coins") and Economy</h2>

   <h3>4.1 Limited License</h3>
   <p>The Service allows you to acquire virtual currency ("Coins") through purchase or interaction (e.g., watching advertisements). You acknowledge that Coins are:</p>
   <ul>
       <li>A limited, non-transferable, revocable, non-exclusive license to access specific features of the App.</li>
       <li><strong>NOT</strong> personal property and have <strong>NO</strong> monetary value in the real world.</li>
       <li><strong>NOT</strong> redeemable for cash, checks, or refunds from the Developer or any third party.</li>
   </ul>

   <h3>4.2 Dynamic Pricing (Floating Exchange Rate)</h3>
   <p>The Service relies on third-party API providers whose costs fluctuate. <strong>WE RESERVE THE RIGHT TO MODIFY THE COIN COST OF ANY FEATURE AT ANY TIME WITHOUT NOTICE.</strong></p>
   <p>For example, a food scan costing 4 Coins today may cost 8 Coins tomorrow if underlying API costs increase. The cost of features is displayed at the point of use. By initiating an action, you agree to the posted Coin price at that specific moment. You acknowledge that the purchasing power of your Coins may fluctuate over time.</p>

   <h3>4.3 Expiration of Coins</h3>
   <p>To ensure the efficient management of the Service, the Developer reserves the right to expire and delete unused Coins (both purchased and earned) from your account if your account remains inactive (no login) for a period of twelve (12) consecutive months.</p>

   <h3>4.4 Ad-Rewarded Coins</h3>
   <p>You agree not to use bots, scripts, emulators, or automation tools to artificially inflate ad views or accumulate Coins. Violation of this policy constitutes fraud and will result in the immediate termination of your account and forfeiture of all Coins without recourse.</p>

   <h2>5. Subscriptions and Lifetime Access</h2>

   <h3>5.1 Auto-Renewing Subscriptions</h3>
   <p>If you purchase a recurring subscription, payment will be charged to your Apple ID or Google Play account upon confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. You must manage cancellation via your Store settings; uninstalling the App does <strong>NOT</strong> cancel your subscription.</p>

   <h3>5.2 Definition of "Lifetime" Access</h3>
   <p>A "Lifetime" subscription grants you access to premium features for the <strong>operational lifetime of the Service</strong>, not the lifetime of the user.</p>
   <ul>
       <li>We reserve the right to discontinue the Service or specific features with reasonable notice (e.g., 60 days).</li>
       <li>If the Developer ceases operations, enters bankruptcy, or permanently discontinues the App, the "Lifetime" license terminates immediately, and no refund will be provided.</li>
   </ul>

   <h3>5.3 Fair Use Policy</h3>
   <p>To prevent abuse and ensure service stability, <strong>ALL PLANS, INCLUDING "LIFETIME" AND "UNLIMITED," ARE SUBJECT TO A FAIR USE POLICY.</strong> We reserve the right to enforce a hard cap on AI usage (e.g., 50 scans per day) to prevent commercial scraping, botting, or excessive cost generation. Usage exceeding this limit may be throttled or require Coins.</p>

   <h2>6. Refunds and Cancellation Rights</h2>

   <h3>6.1 General Policy</h3>
   <p>All purchases are final. Refunds are at the sole discretion of the Application Store (Apple/Google) and are subject to their respective policies. The Developer cannot issue refunds directly.</p>

   <div class="warning">
       <h3>6.2 Waiver for Israeli Consumers</h3>
       <p><strong>NOTICE TO ISRAELI USERS:</strong> Pursuant to the <em>Consumer Protection Law, 5741-1981</em>, the right to cancel a remote transaction within 14 days does <strong>NOT</strong> apply to "Information" or "Goods that can be recorded, transcribed, or reproduced" which the consumer has accessed.</p>
       <p>YOU EXPRESSLY ACKNOWLEDGE THAT "COINS" AND "PREMIUM ACCESS" CONSTITUTE DIGITAL "INFORMATION" (DATA). BY PURCHASING AND IMMEDIATELY RECEIVING ACCESS TO THESE DIGITAL GOODS, YOU WAIVE YOUR RIGHT TO CANCEL THE TRANSACTION.</p>
   </div>

   <h3>6.3 Waiver for EU/EEA Users (Right of Withdrawal)</h3>
   <p><strong>NOTICE TO EU USERS:</strong> You expressly consent to the immediate performance of the contract upon the purchase of Coins or Subscriptions. You acknowledge that by accessing the digital content or utilizing the Coins immediately upon purchase, you lose your Right of Withdrawal from the contract once performance has begun (Article 16(m) of the Consumer Rights Directive).</p>

   <h2>7. Intellectual Property and User Content</h2>

   <h3>7.1 License Grant to Developer</h3>
   <p>By submitting User Content (including food images, text descriptions, and logs), you grant the Developer a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, distribute, prepare derivative works of, and display the Content.</p>
   <p><strong>Specific Use for AI Training:</strong> You explicitly grant us the right to use your anonymized food images and corrections to train, fine-tune, and improve our computer vision and nutritional estimation models.</p>

   <h3>7.2 Metadata</h3>
   <p>You agree that the Service may process metadata associated with your images (e.g., camera type, lighting conditions). You represent that you have stripped sensitive location data (EXIF GPS) from your images before upload if you do not wish for it to be processed.</p>

   <h2>8. Data Privacy and Advertising</h2>

   <h3>8.1 Advertising Consent</h3>
   <p>The Service is supported by advertising. By using the Service, you consent to the display of advertisements. We utilize the Google Mobile Ads SDK, which may collect data to serve personalized ads.</p>
   <p><strong>Consent Management:</strong> We provide a Consent Management Platform (CMP) to allow you to manage your preferences regarding data collection for advertising purposes, in compliance with GDPR and CPRA.</p>

   <h3>8.2 Data Deletion</h3>
   <p>You may request the deletion of your account and associated personal data at any time via the Settings menu ("Delete Account"). While we will delete your personal account data, you acknowledge that anonymized User Content previously used to train our AI models cannot be extracted or deleted from those aggregated models.</p>

   <h2>9. Disclaimer of Warranties</h2>
   <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE AI OUTPUTS WILL BE ACCURATE, RELIABLE, OR ERROR-FREE.</p>

   <h2>10. Limitation of Liability</h2>
   <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM (A) YOUR ACCESS TO OR USE OF THE SERVICE; (B) ANY AI "HALLUCINATIONS" OR INACCURATE NUTRITIONAL DATA; (C) ANY THIRD-PARTY CONDUCT; OR (D) UNAUTHORIZED ACCESS TO YOUR TRANSMISSIONS OR CONTENT.</p>
   <p>IN NO EVENT SHALL THE DEVELOPER'S TOTAL LIABILITY EXCEED THE GREATER OF FIFTY DOLLARS ($50) OR THE AMOUNT YOU PAID THE DEVELOPER IN THE PAST SIX MONTHS.</p>

   <h2>11. Apple App Store Provisions</h2>
   <div class="apple-section">
       <p>If you downloaded this App from the Apple App Store:</p>
       <ul>
           <li><strong>Party:</strong> These Terms are between you and the Developer, not Apple.</li>
           <li><strong>Maintenance:</strong> Apple has no obligation to furnish maintenance or support.</li>
           <li><strong>Warranty:</strong> In the event of any failure to conform to any warranty, you may notify Apple, and Apple will refund the purchase price. Apple has no other warranty obligation.</li>
           <li><strong>Beneficiary:</strong> Apple is a third-party beneficiary of these Terms and may enforce them against you.</li>
       </ul>
   </div>

   <h2>12. Governing Law and Dispute Resolution</h2>

   <h3>12.1 For Residents of the United States (Arbitration)</h3>
   <p>All disputes arising out of or relating to these Terms or the Service shall be resolved exclusively by binding arbitration under the Federal Arbitration Act. The arbitration shall be conducted by the American Arbitration Association (AAA). <strong>YOU WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN CLASS ACTIONS.</strong></p>

   <h3>12.2 For Users Outside the United States (including Israel)</h3>
   <p>These Terms shall be governed by and construed in accordance with the laws of the State of Israel, without regard to its conflict of law principles. You agree to submit to the exclusive personal jurisdiction of the competent courts located in Tel Aviv-Jaffa for any dispute arising from these Terms.</p>

   <h2>13. Contact Information</h2>
   <p>For legal inquiries, please contact:</p>
   <p>Email: <a href="mailto:contact@danprav.me">contact@danprav.me</a></p>

   <div class="footer">
       © ${new Date().getFullYear()} Macros Vision AI. All rights reserved.
   </div>
</body>
</html>
`;