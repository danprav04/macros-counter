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
       h2 { color: ${colors.text}; font-size: 20px; margin-top: 30px; margin-bottom: 15px; font-weight: 700; }
       h3 { color: ${colors.text}; font-size: 18px; margin-top: 20px; margin-bottom: 10px; font-weight: 600; opacity: 0.9; }
       p { margin-bottom: 15px; }
       ul, ol { margin-bottom: 15px; padding-left: 20px; }
       li { margin-bottom: 8px; }
       strong { font-weight: 700; }
      .critical { border: 2px solid ${colors.error}; background-color: rgba(255, 0, 0, 0.05); padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold; }
      .warning { border: 1px solid ${colors.warningBorder}; background-color: ${colors.warningBackground}; color: ${colors.warningText}; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .footer { margin-top: 40px; border-top: 1px solid ${colors.divider}; padding-top: 20px; font-size: 14px; opacity: 0.7; }
       a { color: ${colors.primary}; text-decoration: none; }
   </style>
</head>
<body>

   <h1>Terms of Service</h1>
   <p><strong>Last Updated: December 2025</strong></p>

   <p>These Terms of Service ("Terms") constitute a binding legal agreement between you ("User" or "You") and the developer of Macros Vision AI ("Developer," "We," "Us," or "Our"), operating under the laws of the State of Israel.</p>

   <p>By downloading, installing, accessing, buying "Coins," or subscribing to the Macros Vision AI mobile application (the "App"), you explicitly acknowledge that you have read, understood, and agree to be bound by these Terms.</p>

   <div class="critical">
       IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST IMMEDIATELY UNINSTALL THE APP AND CEASE ALL USE OF THE SERVICE.
   </div>

   <h2>1. ELIGIBILITY AND ACCOUNT SECURITY</h2>
   <p>You must be at least 18 years of age to use this Service. By creating an account, you represent that you possess the legal capacity to enter into a binding contract.</p>
   <p>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to protect your account security.</p>

   <h2>2. NOT A MEDICAL DEVICE & HEALTH DISCLAIMER</h2>
   <div class="critical">
       THIS SERVICE IS NOT A MEDICAL DEVICE.
   </div>
   
   <h3>2.1 General Wellness Tool</h3>
   <p>The Service is an informational tool designed solely for general wellness tracking and recreational use. It is <strong>NOT</strong> intended to diagnose, cure, mitigate, treat, or prevent any disease or medical condition. Nothing in the App, including calorie counts, macronutrient estimates, or health insights, constitutes medical advice.</p>

   <h3>2.2 High-Risk Conditions</h3>
   <p>You expressly acknowledge that you should <strong>NOT</strong> rely on the Service for the management of critical medical conditions, including but not limited to:</p>
   <ul>
       <li>Diabetes (e.g., calculating insulin dosages).</li>
       <li>Eating disorders (e.g., Anorexia, Bulimia).</li>
       <li>Pregnancy nutrition or pediatric nutrition.</li>
   </ul>
   <p>Always consult with a qualified healthcare provider before making decisions related to your diet or health.</p>

   <h3>2.3 STRICT PROHIBITION ON ALLERGEN DETECTION</h3>
   <div class="warning">
       <strong>WARNING: DO NOT USE THIS SERVICE TO DETECT ALLERGENS.</strong><br><br>
       Computer Vision and Artificial Intelligence cannot reliably detect ingredients that are hidden, dissolved, cross-contaminated, or obscured (e.g., peanut oil in a sauce, gluten traces, shellfish stock). <strong>Reliance on the Service for allergen safety is STRICTLY PROHIBITED.</strong> We expressly disclaim all liability for injury, anaphylaxis, or death resulting from reliance on the App for allergen detection.
   </div>

   <h2>3. ARTIFICIAL INTELLIGENCE LIMITATIONS</h2>
   <h3>3.1 Probabilistic Nature</h3>
   <p>The Service utilizes third-party Generative AI models (e.g., Google Gemini) to analyze food. You acknowledge that these models are <strong>probabilistic, not deterministic</strong>. They generate predictions based on patterns, which may result in "hallucinations"—confident but factually incorrect outputs.</p>

   <h3>3.2 User Responsibility ("Human-in-the-Loop")</h3>
   <p>You agree that the AI acts solely as a drafting assistant. You assume full responsibility for verifying all data (including portion sizes and nutritional values) before relying on it. The Developer does not warrant the accuracy of any AI-generated content.</p>

   <h2>4. VIRTUAL CURRENCY ("COINS")</h2>
   <h3>4.1 Limited License</h3>
   <p>The Service allows you to acquire virtual currency ("Coins") through purchase or interaction (e.g., watching ads). You acknowledge that Coins are:</p>
   <ul>
       <li>A limited, non-transferable, revocable, non-exclusive license to access specific features of the App.</li>
       <li><strong>NOT</strong> personal property and have <strong>NO</strong> monetary value.</li>
       <li><strong>NOT</strong> redeemable for cash, checks, or refunds from the Developer or any third party.</li>
   </ul>

   <h3>4.2 Platform-Specific Balances</h3>
   <p>Coins purchased on the Apple App Store are subject to Apple’s media terms and generally cannot be transferred to the Google Play Store, and vice-versa, unless explicitly supported by our cross-platform account synchronization.</p>

   <h3>4.3 Dynamic Pricing (Floating Exchange Rate)</h3>
   <p>The Service relies on third-party API providers whose costs fluctuate. <strong>WE RESERVE THE RIGHT TO MODIFY THE COIN COST OF ANY FEATURE AT ANY TIME WITHOUT NOTICE.</strong> For example, a food scan costing 4 Coins today may cost 8 Coins tomorrow if underlying API costs increase. You agree that the "purchasing power" of your Coins is not guaranteed.</p>

   <h3>4.4 Expiration</h3>
   <p>To the extent permitted by law, we reserve the right to expire unused Coins if your account remains inactive for a period of 12 months.</p>

   <h2>5. SUBSCRIPTIONS AND LIFETIME ACCESS</h2>
   <h3>5.1 Auto-Renewing Subscriptions</h3>
   <p>If you purchase a recurring subscription (e.g., Monthly Pro), the following terms apply:</p>
   <ul>
       <li><strong>Billing:</strong> Payment is charged to your iTunes/Google Play Account upon confirmation of purchase.</li>
       <li><strong>Renewal:</strong> Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
       <li><strong>Cancellation:</strong> You must cancel your subscription through your Device Settings (Apple ID or Google Play). <strong>Uninstalling the App does NOT cancel your subscription.</strong></li>
   </ul>

   <h3>5.2 "Lifetime" Access Definition</h3>
   <p>A "Lifetime" subscription grants access to premium features for the <strong>operational lifetime of the Service</strong>, not the lifetime of the user. If the Developer ceases operations, goes bankrupt, or discontinues the App, the "Lifetime" license terminates immediately, and no refund will be provided.</p>

   <h3>5.3 Fair Use Policy (API Cap)</h3>
   <p>To ensure the economic sustainability of the Service, <strong>ALL PLANS, INCLUDING "LIFETIME" AND "UNLIMITED," ARE SUBJECT TO A FAIR USE POLICY.</strong> We reserve the right to enforce a soft cap on AI usage (e.g., 50 scans per day) to prevent commercial abuse. Usage exceeding this limit may be throttled or require Coins.</p>

   <h2>6. REFUNDS AND CANCELLATION RIGHTS</h2>
   <h3>6.1 General Policy</h3>
   <p>All purchases are final. Refunds are at the sole discretion of the Application Store (Apple/Google) and are subject to their respective policies.</p>

   <h3>6.2 Waiver for Israeli Users (Consumer Protection Law)</h3>
   <div class="warning">
       <strong>NOTICE TO ISRAELI CONSUMERS:</strong><br>
       Pursuant to the <em>Consumer Protection Law, 5741-1981</em>, the right to cancel a remote transaction within 14 days does <strong>NOT</strong> apply to "Information" or "Goods that can be recorded, transcribed, or reproduced" which the consumer has accessed. <br><br>
       <strong>YOU EXPRESSLY ACKNOWLEDGE THAT "COINS" AND "PREMIUM ACCESS" CONSTITUTE DIGITAL INFORMATION. BY PURCHASING AND IMMEDIATELY RECEIVING THESE DIGITAL GOODS, YOU WAIVE YOUR RIGHT TO CANCEL THE TRANSACTION.</strong>
   </div>

   <h2>7. ADVERTISEMENTS AND REWARDS</h2>
   <p>The App may offer rewards for watching advertisements. You agree not to use bots, scripts, or automation to artificially inflate ad views. Violation of this policy constitutes a material breach and will result in the immediate termination of your account and forfeiture of all Coins.</p>

   <h2>8. LIMITATION OF LIABILITY</h2>
   <div class="critical">
       TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS." THE DEVELOPER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM YOUR USE OF THE SERVICE, RELIANCE ON AI OUTPUTS, OR FAILURE OF THIRD-PARTY PLATFORMS.
   </div>

   <h2>9. GOVERNING LAW AND DISPUTE RESOLUTION</h2>
   <h3>9.1 For US Residents</h3>
   <p>These Terms are governed by the Federal Arbitration Act and the laws of the State of Delaware. All disputes shall be resolved by binding individual arbitration. <strong>YOU WAIVE YOUR RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN CLASS ACTIONS.</strong></p>

   <h3>9.2 For Rest of World (including Israel)</h3>
   <p>These Terms are governed by the laws of the State of Israel. The competent courts in Tel Aviv-Jaffa shall have exclusive jurisdiction over any dispute.</p>

   <h2>10. CONTACT</h2>
   <p>For legal inquiries, please contact: <a href="mailto:contact@danprav.me">contact@danprav.me</a></p>

   <div class="footer">
       © ${new Date().getFullYear()} Macros Vision AI. All rights reserved.
   </div>
</body>
</html>
`;