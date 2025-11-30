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
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            padding: 20px; 
            line-height: 1.6; 
            color: ${colors.text}; 
            background-color: ${colors.background};
        }
        h1 { 
            font-size: 24px; 
            border-bottom: 2px solid ${colors.divider}; 
            padding-bottom: 10px; 
            color: ${colors.text};
        }
        h2 { 
            font-size: 20px; 
            margin-top: 25px; 
            color: ${colors.primary}; 
        }
        h3 { 
            font-size: 16px; 
            font-weight: bold; 
            margin-top: 15px; 
            color: ${colors.text};
        }
        p { margin-bottom: 10px; font-size: 14px; }
        ul { margin-bottom: 10px; padding-left: 20px; }
        li { font-size: 14px; margin-bottom: 5px; }
        strong { color: ${colors.text}; }
        .warning { 
            background-color: ${colors.warningBackground}; 
            border: 1px solid ${colors.warningBorder}; 
            padding: 15px; 
            border-radius: 8px; 
            color: ${colors.warningText}; 
            font-weight: normal; 
        }
        .warning strong {
            color: ${colors.warningText};
        }
        .critical { 
            text-transform: uppercase; 
            font-weight: bold; 
            color: ${colors.error};
        }
    </style>
</head>
<body>

<h1>TERMS OF SERVICE</h1>
<p><strong>Last Updated:</strong> December 1, 2025</p>

<div class="warning">
    <p><strong>IMPORTANT LEGAL NOTICE:</strong> PLEASE READ THESE TERMS CAREFULLY. THEY CONTAIN SIGNIFICANT RESTRICTIONS ON YOUR RIGHTS, INCLUDING:</p>
    <ul>
        <li><strong>MANDATORY BINDING ARBITRATION</strong> FOR U.S. RESIDENTS.</li>
        <li><strong>CLASS ACTION WAIVER</strong> FOR U.S. RESIDENTS.</li>
        <li><strong>EXCLUSIVE JURISDICTION IN TEL AVIV</strong> FOR NON-U.S. RESIDENTS.</li>
        <li><strong>WAIVER OF CANCELLATION RIGHTS</strong> UNDER ISRAELI CONSUMER PROTECTION LAW REGARDING VIRTUAL CURRENCY.</li>
        <li><strong>COMPLETE DISCLAIMER OF MEDICAL LIABILITY</strong> AND AI ACCURACY.</li>
    </ul>
</div>

<h2>1. ACCEPTANCE OF TERMS</h2>
<p>These Terms of Service ("Terms") constitute a binding legal agreement between you ("User," "You," or "Your") and the developer/operator of MacrosVisionAI ("Developer," "We," "Us," or "Our"), located in Israel.</p>
<p>By downloading, installing, accessing, or using the MacrosVisionAI mobile application ("App") or any associated services (collectively, the "Service"), you explicitly acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
<p class="critical">IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST IMMEDIATELY UNINSTALL THE APP AND CEASE ALL USE OF THE SERVICE.</p>

<h2>2. ELIGIBILITY</h2>
<p>You must be at least 18 years of age to use this Service. By using the Service, you represent and warrant that you possess the legal capacity to enter into a binding contract and that you are not barred from using the Service under the laws of the United States, Israel, or other applicable jurisdiction.</p>

<h2>3. NOT A MEDICAL DEVICE & HEALTH DISCLAIMER</h2>
<p class="critical">THIS SECTION IS CRITICAL. PLEASE READ CAREFULLY.</p>

<h3>3.1 Informational Tool Only</h3>
<p>The Service is an informational tool designed to assist with general wellness tracking. <strong>IT IS NOT A MEDICAL DEVICE.</strong> Nothing in the Service, including calorie counts, macronutrient breakdowns, or ingredient identifications, constitutes medical advice, diagnosis, or treatment.</p>

<h3>3.2 Non-Reliance</h3>
<p>You explicitly acknowledge that you should not rely on the Service for the management of any medical condition, including but not limited to:</p>
<ul>
    <li>Diabetes (e.g., insulin dosage calculations).</li>
    <li>Eating disorders (e.g., Anorexia, Bulimia).</li>
    <li>Phenylketonuria (PKU).</li>
    <li>Pregnancy nutrition.</li>
</ul>
<p>Always consult with a qualified physician or healthcare provider before making any changes to your diet, exercise, or medication regimen.</p>

<h3>3.3 STRICT PROHIBITION ON ALLERGEN DETECTION</h3>
<div class="warning">
<p><strong>WARNING: DO NOT USE THIS SERVICE TO DETECT ALLERGENS.</strong></p>
<p>Computer Vision and Artificial Intelligence (AI) cannot detect ingredients that are dissolved, hidden, obscured, or cross-contaminated (e.g., peanut oil in a sauce, dissolved sugar, gluten traces). <strong>Reliance on the Service for allergen safety is STRICTLY PROHIBITED and constitutes a material breach of these Terms.</strong> We expressly disclaim any liability for injury, anaphylaxis, or death resulting from such reliance.</p>
</div>

<h2>4. ARTIFICIAL INTELLIGENCE & ACCURACY DISCLAIMER</h2>

<h3>4.1 Probabilistic Nature of AI</h3>
<p>The Service utilizes experimental Generative Artificial Intelligence (Large Language Models and Vision Transformers), including third-party services such as Google Gemini. You acknowledge that these models are <strong>probabilistic, not deterministic</strong>. They generate responses based on statistical patterns, not factual knowledge.</p>

<h3>4.2 Hallucinations</h3>
<p>You acknowledge that the Service may produce "<strong>Hallucinations</strong>"—confident but factually incorrect, nonsensical, or unrelated responses. The AI may misidentify food items, miscalculate portion sizes, or invent nutritional data.</p>

<h3>4.3 Human-in-the-Loop Requirement</h3>
<p>You agree that the AI acts solely as a "drafting assistant." You assume full responsibility for acting as the "editor" and independently verifying all data (including calories and macros) before logging it or relying on it.</p>

<h2>5. ACCOUNTS AND SECURITY</h2>

<h3>5.1 Account Creation</h3>
<p>To access certain features, you must register an account. You agree to provide accurate, current, and complete information.</p>

<h3>5.2 Account Security</h3>
<p>You are responsible for maintaining the confidentiality of your credentials. You notify us immediately of any unauthorized use. We are not liable for any loss or damage arising from your failure to protect your account.</p>

<h3>5.3 Account Deletion</h3>
<p>You may delete your account at any time via the Settings menu. Upon deletion, your data is removed from our active databases in accordance with our Privacy Policy. This action is irreversible.</p>

<h2>6. VIRTUAL CURRENCY ("COINS") AND PAYMENTS</h2>

<h3>6.1 Definition of Virtual Currency</h3>
<p>The Service may make available virtual currency, points, or credits ("Coins"). <strong>Coins are a limited, non-transferable, revocable, non-exclusive license to access specific features of the digital Service.</strong></p>

<h3>6.2 No Cash Value</h3>
<p>Coins are <strong>NOT</strong> personal property, have <strong>NO</strong> monetary value, and cannot be redeemed for cash, refunds, or transferable to other users or outside the App.</p>

<h3>6.3 Dynamic Pricing (Inflation/Deflation)</h3>
<p>We reserve the right to modify the "Coin Cost" of any feature (e.g., increasing the cost to scan a meal from 4 to 8 Coins) at any time, without prior notice, based on our operational costs (e.g., API token pricing). You agree that the "purchasing power" of your Coins may fluctuate.</p>

<h3>6.4 WAIVER OF CANCELLATION RIGHTS (ISRAELI USERS)</h3>
<p><strong>Pursuant to the Israeli Consumer Protection Law, 5741-1981 (the "CPL"):</strong></p>
<p>You generally have the right to cancel a remote transaction within 14 days. <strong>HOWEVER</strong>, pursuant to Section 14C(d) of the CPL, this right does not apply to "Information" (as defined in the Computers Law) or goods that can be recorded, transcribed, or reproduced which the consumer has accessed.</p>
<p class="critical">YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT "COINS" CONSTITUTE "INFORMATION" AND DIGITAL GOODS PROVIDED IMMEDIATELY. BY PURCHASING COINS, YOU WAIVE YOUR RIGHT TO CANCEL THE TRANSACTION AND RECEIVE A REFUND ONCE THE COINS HAVE BEEN CREDITED TO YOUR ACCOUNT.</p>

<h2>7. SUBSCRIPTIONS AND LIFETIME ACCESS</h2>

<h3>7.1 "Lifetime" Defined</h3>
<p>A "Lifetime Subscription" or "Lifetime Access" grants you access to premium features for the <strong>lifetime of the Service's existence</strong>, not the lifetime of the User. It does not imply that the Service will exist in perpetuity. If the Developer ceases operations or shuts down the Service, the Lifetime license terminates immediately without refund.</p>

<h3>7.2 Fair Use Policy (The "Cap")</h3>
<p>To ensure the economic sustainability of the Service (where every AI interaction incurs a variable cost to the Developer), <strong>ALL ACCOUNTS, INCLUDING "LIFETIME" ACCOUNTS, ARE SUBJECT TO A FAIR USE POLICY.</strong></p>
<p>We reserve the right to enforce daily limits on API usage (e.g., a cap on the number of AI scans per day). Usage beyond this daily allowance may require the consumption of Coins or waiting until the allowance resets (24-hour cycle).</p>

<h2>8. ADVERTISEMENTS AND REWARDS</h2>

<h3>8.1 Ad-Supported Model</h3>
<p>Certain features may be accessible by watching video advertisements ("Rewarded Ads").</p>

<h3>8.2 Prohibited Conduct (Ad Fraud)</h3>
<p>You agree not to use any automated system, including "robots," "spiders," "scripts," emulators, or autoclickers to:</p>
<ol>
    <li>Artificially inflate ad views or click-through rates.</li>
    <li>"Farm" Coins or rewards.</li>
    <li>Bypass or block advertisements while claiming rewards ("Ad Blocking").</li>
</ol>
<p>Violation of this section constitutes a material breach and will result in the <strong>immediate termination of your account and forfeiture of all Coins</strong> without notice.</p>

<h2>9. USER GENERATED CONTENT (UGC) & DATA PROCESSING</h2>

<h3>9.1 Image Uploads</h3>
<p>By uploading images of food ("User Content") to the Service, you grant the Developer a worldwide, royalty-free, non-exclusive, sublicensable license to use, reproduce, modify, and transmit your User Content solely for the purpose of providing the Service (e.g., sending the image to Google Gemini for analysis).</p>

<h3>9.2 Transient Processing</h3>
<p>You acknowledge that images are processed via third-party AI providers. While we employ "Transient Processing" (images are analyzed and not permanently stored by us for model training), we cannot guarantee the data retention policies of third-party providers.</p>

<h3>9.3 Prohibited Content</h3>
<p>You agree not to upload content that is illegal, offensive, pornographic, or infringes on the intellectual property rights of others.</p>

<h2>10. DISCLAIMER OF WARRANTIES</h2>
<p class="critical">TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. THE DEVELOPER SPECIFICALLY DISCLAIMS ALL WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE AI OUTPUTS WILL BE ACCURATE, SAFE, OR ERROR-FREE.</p>

<h2>11. LIMITATION OF LIABILITY</h2>
<p class="critical">TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE DEVELOPER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:</p>
<ul>
    <li>(A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE;</li>
    <li>(B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE;</li>
    <li>(C) ANY CONTENT OBTAINED FROM THE SERVICE (INCLUDING AI HALLUCINATIONS);</li>
    <li>(D) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.</li>
</ul>
<p class="critical">IN NO EVENT SHALL THE DEVELOPER'S AGGREGATE LIABILITY EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS ($100.00) OR THE AMOUNT YOU PAID THE DEVELOPER, IF ANY, IN THE PAST SIX MONTHS.</p>

<h2>12. GOVERNING LAW AND DISPUTE RESOLUTION</h2>
<p>This section contains a <strong>Bifurcated Jurisdiction Clause</strong>. Please identify your residency to understand which laws apply to you.</p>

<h3>12.1 For Residents of the United States</h3>
<p>This Agreement and any dispute arising out of or related to it shall be governed by the <strong>Federal Arbitration Act</strong>, applicable federal law, and the laws of the State of Delaware, without regard to conflict of laws principles.</p>
<ul>
    <li><strong>Mandatory Arbitration:</strong> You and the Developer agree that any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof shall be determined by <strong>binding, individual arbitration</strong> administered by the American Arbitration Association (AAA).</li>
    <li><strong>Class Action Waiver:</strong> YOU AND THE DEVELOPER AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER <strong>ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY</strong>, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</li>
    <li><strong>Small Claims Exception:</strong> Either party may assert claims, if they qualify, in small claims court in Delaware or your county of residence.</li>
</ul>

<h3>12.2 For Residents of Israel and Rest of World</h3>
<p>This Agreement shall be governed by and construed in accordance with the <strong>laws of the State of Israel</strong>.</p>
<ul>
    <li><strong>Exclusive Jurisdiction:</strong> The competent courts in <strong>Tel Aviv-Jaffa, Israel</strong>, shall have exclusive jurisdiction over any dispute arising from or related to these Terms. You hereby waive any objection to such venue based on <em>forum non conveniens</em>.</li>
    <li><strong>Consumer Protection:</strong> Nothing in these terms shall deprive you of the mandatory consumer protection rights granted to you under the laws of your country of residence, to the extent such rights cannot be derogated from by contract.</li>
</ul>

<h2>13. INDEMNIFICATION</h2>
<p>You agree to indemnify, defend, and hold harmless the Developer, its officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with:</p>
<ol>
    <li>Your access to or use of the Service.</li>
    <li>Your reliance on AI-generated nutritional or medical data.</li>
    <li>Your violation of these Terms.</li>
    <li>Your violation of any third-party right, including intellectual property rights.</li>
</ol>

<h2>14. CHANGES TO TERMS</h2>
<p>We reserve the right to modify these Terms at any time. We will provide notice of material changes via the App (e.g., a pop-up or "Sign-In Wrap"). Your continued use of the Service after such changes constitutes your acceptance of the new Terms. If you do not agree, you must stop using the Service.</p>

<h2>15. CONTACT INFORMATION</h2>
<p>If you have any questions regarding these Terms, please contact us at:</p>
<p><strong>Email:</strong> contact@danprav.me<br>
<strong>Location:</strong> Tel Aviv, Israel</p>

</body>
</html>
`;