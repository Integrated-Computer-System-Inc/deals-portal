/**
 * Email Templates for Deals Registration Portal
 * Provides responsive, branded HTML templates and standardized subjects
 * for all lifecycle events: Create, Update, Lost, Renew, and Expiring warnings.
 */

function getPortalBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/**
 * Base email layout wrapper with modern ICS branding
 */
export function wrapEmailHtml(content: string, previewText: string = ''): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deals Registration Notification</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(60deg, #ab47bc, #8e24aa); padding: 24px 30px; text-align: left; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; color: #ffffff; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #f3e5f5; }
    .body-content { padding: 28px 30px; }
    .status-badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; border-radius: 12px; }
    .badge-blue { background-color: #f3e5f5; color: #7b1fa2; border: 1px solid #e1bee7; }
    .badge-green { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-amber { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-red { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-slate { background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .data-table { width: 100%; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .data-table tr:nth-child(even) { background-color: #f8fafc; }
    .data-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .data-table td.label { font-weight: 600; color: #475569; width: 35%; background-color: #fafafa; }
    .data-table td.value { color: #0f172a; font-weight: 500; }
    .btn-container { text-align: center; margin: 28px 0 10px 0; }
    .btn { display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff !important; background: linear-gradient(60deg, #ab47bc, #8e24aa); text-decoration: none; border-radius: 6px; }
    .footer-bottom { background: linear-gradient(60deg, #ab47bc, #8e24aa); color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .footer-bottom-cell { padding: 20px 25px; vertical-align: top; text-align: left; }
    .footer-bottom-links { margin-bottom: 12px; font-size: 12px; font-weight: bold; }
    .footer-bottom-links a { color: #ffffff; text-decoration: underline; }
    .footer-bottom-links span { color: #f3e5f5; opacity: 0.7; margin: 0 8px; }
    .footer-copyright { margin: 0; font-size: 11px; line-height: 1.4; color: #f3e5f5; }
  </style>
</head>
<body>
  ${previewText ? `
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>` : ''}
  <div class="container">
    <div class="header">
      <h1>ICS Deals Registration Portal</h1>
      <p>Integrated Computer Systems, Inc. • Automated Deal Notification</p>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <table class="footer-bottom" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td class="footer-bottom-cell">
          <div class="footer-bottom-links">
            <a href="${getPortalBaseUrl()}">Deals Portal</a>
            <span>|</span>
            <a href="https://www.ics.com.ph">ICS Website</a>
            <span>|</span>
            <a href="https://www.ics.com.ph/contact-us">Contact Us</a>
          </div>
          <p class="footer-copyright">
            This is a system generated message. DO NOT REPLY TO THIS EMAIL.<br>
            Copyright &copy; 2026, Integrated Computer Systems, Inc. All rights reserved.<br>
            Limketkai Building, Ortigas Ave, San Juan City, 1502 Metro Manila
          </p>
        </td>
      </tr>
    </table>
  </div>
  <div style="display:none;font-size:0;line-height:0;max-height:0;opacity:0;overflow:hidden;mso-hide:all;">
    UID: ${nonce}
  </div>
</body>
</html>`;
}

// --------------------------------------------------------------------------------
// 1. Create Deal Email
// --------------------------------------------------------------------------------

export interface CreateDealEmailData {
  dealID: number | string;
  dealRegID?: string | null;
  custName: string;
  projectName?: string | null;
  brand: string;
  bu: string;
  assignedAO: string;
  aoNickName?: string;
  currency?: string;
  regDate?: Date | string | null;
  expDate?: Date | string | null;
  totalAmount?: number | null;
  creatorName?: string | null;
  creatorAccount?: string | null;
}

export function generateCreateDealEmail(data: CreateDealEmailData): {
  subject: string;
  message: string;
} {
  const portalUrl = getPortalBaseUrl();
  const dealLink = `${portalUrl}/deals/${data.dealID}/edit`;
  const regFormatted = data.regDate ? new Date(data.regDate).toLocaleDateString() : 'N/A';
  const expFormatted = data.expDate ? new Date(data.expDate).toLocaleDateString() : 'N/A';
  const amountFormatted =
    data.totalAmount != null
      ? Number(data.totalAmount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : 'N/A';
  const dealRef = data.dealRegID || `ID-${data.dealID}`;
  const aoGreeting = data.aoNickName || data.assignedAO || 'Team';

  const subject = `[Deal Registration] Created: ${dealRef} - ${data.custName}`;

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">New Deal Registration</h2>
    <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
      Hi ${aoGreeting},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      A new deal has been successfully registered for <strong>${data.custName}</strong> by 
      ${data.creatorName || data.creatorAccount || 'Portal User'}.
    </p>

    <table class="data-table">
      <tr>
        <td class="label">Deal Registration ID</td>
        <td class="value"><strong>${dealRef}</strong></td>
      </tr>
      <tr>
        <td class="label">Brand</td>
        <td class="value">${data.brand}</td>
      </tr>
      <tr>
        <td class="label">Project Name</td>
        <td class="value">${data.projectName || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">Registration Date</td>
        <td class="value">${regFormatted}</td>
      </tr>
      <tr>
        <td class="label">Expiration Date</td>
        <td class="value">${expFormatted}</td>
      </tr>
      <tr>
        <td class="label">Currency</td>
        <td class="value">${data.currency || 'PHP'}</td>
      </tr>
      <tr>
        <td class="label">Deal Amount</td>
        <td class="value" style="color: #047857; font-weight: 700;">${amountFormatted}</td>
      </tr>
    </table>

    <div class="btn-container">
      <a href="${dealLink}" class="btn">View Deal in Portal</a>
    </div>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `New Deal Registered: ${dealRef} - ${data.custName}`),
  };
}

// --------------------------------------------------------------------------------
// 2. Update Deal Email
// --------------------------------------------------------------------------------

export interface DealFieldChange {
  label: string;
  from: string;
  to: string;
}

export interface UpdateDealEmailData {
  dealID: number | string;
  dealRegID?: string | null;
  custName: string;
  projectName?: string | null;
  brand: string;
  bu: string;
  assignedAO: string;
  aoNickName?: string;
  dealStatus?: string;
  currency?: string;
  regDate?: Date | string | null;
  expDate?: Date | string | null;
  newStatus?: string;
  remarks?: string | null;
  totalAmount?: number | null;
  creatorName?: string | null;
  creatorAccount?: string | null;
  changes?: DealFieldChange[];
}

function formatTemplateDate(d?: Date | string | null): string {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString();
}

export function generateUpdateDealEmail(data: UpdateDealEmailData): {
  subject: string;
  message: string;
} {
  const portalUrl = getPortalBaseUrl();
  const dealLink = `${portalUrl}/deals/${data.dealID}/edit`;
  const dealRef = data.dealRegID || `ID-${data.dealID}`;
  const amountFormatted =
    data.totalAmount != null
      ? Number(data.totalAmount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : 'N/A';
  const regFormatted = formatTemplateDate(data.regDate);
  const expFormatted = formatTemplateDate(data.expDate);
  const aoGreeting = data.aoNickName || data.assignedAO || 'Team';

  const subject = `[Deal Registration] Updated: ${dealRef} - ${data.custName}`;

  // Index changes by field label
  const changesMap = new Map<string, DealFieldChange>();
  const renderedChangeLabels = new Set<string>();
  if (data.changes && data.changes.length > 0) {
    for (const c of data.changes) {
      changesMap.set(c.label.trim().toLowerCase(), c);
    }
  }

  const renderRow = (
    label: string,
    currentValueHtml: string,
    isBoldDefault: boolean = false
  ): string => {
    const normKey = label.trim().toLowerCase();
    const change = changesMap.get(normKey);
    if (change) {
      renderedChangeLabels.add(normKey);
      return `
      <tr style="background-color: #fffbeb;">
        <td class="label" style="background-color: #fef3c7; color: #92400e; font-weight: 600;">${label}</td>
        <td class="value">
          <del style="color: #dc2626; text-decoration: line-through;">${change.from || '(empty)'}</del> - <strong style="color: #16a34a;">${change.to || '(empty)'}</strong>
        </td>
      </tr>`;
    }

    const valueDisplay = isBoldDefault ? `<strong>${currentValueHtml}</strong>` : currentValueHtml;
    return `
      <tr>
        <td class="label">${label}</td>
        <td class="value">${valueDisplay}</td>
      </tr>`;
  };

  // Render any remaining changes not captured in standard rows
  const renderRemainingChanges = (): string => {
    if (!data.changes || data.changes.length === 0) return '';
    const unrendered = data.changes.filter(
      (c) => !renderedChangeLabels.has(c.label.trim().toLowerCase())
    );
    if (unrendered.length === 0) return '';
    return unrendered
      .map(
        (c) => `
      <tr style="background-color: #fffbeb;">
        <td class="label" style="background-color: #fef3c7; color: #92400e; font-weight: 600;">${c.label}</td>
        <td class="value">
          <del style="color: #dc2626; text-decoration: line-through;">${c.from || '(empty)'}</del> - <strong style="color: #16a34a;">${c.to || '(empty)'}</strong>
        </td>
      </tr>`
      )
      .join('');
  };

  const statusDisplay = data.dealStatus || data.newStatus || 'Registered';

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">Deal Update Notification</h2>
    <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
      Hi ${aoGreeting},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      The deal for <strong>${data.custName}</strong> has been updated by 
      ${data.creatorName || data.creatorAccount || 'Portal User'}.
    </p>

    <table class="data-table">
      ${renderRow('Deal Registration ID', dealRef, true)}
      ${renderRow('Customer Name', data.custName)}
      ${renderRow('Business Unit (BU)', data.bu)}
      ${renderRow('Assigned AO', data.assignedAO)}
      ${renderRow('Deal Status', statusDisplay)}
      ${renderRow('Brand', data.brand)}
      ${renderRow('Project Name', data.projectName || 'N/A')}
      ${regFormatted ? renderRow('Registration Date', regFormatted) : ''}
      ${expFormatted ? renderRow('Expiration Date', expFormatted) : ''}
      ${renderRow('Currency', data.currency || 'PHP')}
      ${renderRow('Deal Amount', amountFormatted, true)}
      ${data.remarks || changesMap.has('remarks') ? renderRow('Remarks', data.remarks || 'N/A') : ''}
      ${renderRemainingChanges()}
    </table>

    <div class="btn-container">
      <a href="${dealLink}" class="btn">View Updated Deal</a>
    </div>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `Deal Updated: ${dealRef} - ${data.custName}`),
  };
}

// --------------------------------------------------------------------------------
// 3. Lost Deal Email
// --------------------------------------------------------------------------------

export interface LostDealEmailData {
  dealID: number | string;
  dealRegID?: string | null;
  custName: string;
  projectName?: string | null;
  brand: string;
  bu: string;
  assignedAO: string;
  aoNickName?: string;
  competitorVendor?: string | null;
  competitorBrand?: string | null;
  icsOffer?: string | null;
  competitorOffer?: string | null;
  reason?: string | null;
  otherInformation?: string | null;
  creatorName?: string | null;
  creatorAccount?: string | null;
}

export function generateLostDealEmail(data: LostDealEmailData): {
  subject: string;
  message: string;
} {
  const portalUrl = getPortalBaseUrl();
  const dealLink = `${portalUrl}/deals/${data.dealID}`;
  const dealRef = data.dealRegID || `ID-${data.dealID}`;
  const aoGreeting = data.aoNickName || data.assignedAO || 'Team';

  const subject = `[Deal Registration] Closed as Lost: ${dealRef} - ${data.custName}`;

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #b91c1c;">Deal Closed as Lost</h2>
    <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
      Hi ${aoGreeting},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      The opportunity for <strong>${data.custName}</strong> has been tagged as <strong>Closed / Lost</strong> by 
      ${data.creatorName || data.creatorAccount || 'Portal User'}.
    </p>

    <table class="data-table">
      <tr>
        <td class="label">Deal Registration ID</td>
        <td class="value"><strong>${dealRef}</strong></td>
      </tr>
      <tr>
        <td class="label">Brand</td>
        <td class="value">${data.brand}</td>
      </tr>
      <tr>
        <td class="label">Project Name</td>
        <td class="value">${data.projectName || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">Competitor Vendor</td>
        <td class="value">${data.competitorVendor || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">Competitor Brand</td>
        <td class="value">${data.competitorBrand || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">ICS Offer vs Competitor</td>
        <td class="value">ICS: <strong>${data.icsOffer || 'N/A'}</strong> vs Comp: <strong>${data.competitorOffer || 'N/A'}</strong></td>
      </tr>
      <tr>
        <td class="label">Lost Reason</td>
        <td class="value" style="color: #b91c1c; font-weight: 600;">${data.reason || 'No reason provided'}</td>
      </tr>
      ${
        data.otherInformation
          ? `
      <tr>
        <td class="label">Additional Remarks</td>
        <td class="value" style="white-space: pre-wrap;">${data.otherInformation}</td>
      </tr>`
          : ''
      }
    </table>

    <div class="btn-container">
      <a href="${dealLink}" class="btn" style="background-color: #475569;">View Deal History</a>
    </div>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `Deal Closed as Lost: ${dealRef} - ${data.custName}`),
  };
}

// --------------------------------------------------------------------------------
// 4. Renew Deal Email
// --------------------------------------------------------------------------------

export interface RenewDealEmailData {
  dealID: number | string;
  dealRegID?: string | null;
  custName: string;
  projectName?: string | null;
  brand: string;
  bu: string;
  assignedAO: string;
  aoNickName?: string;
  renewalDate: Date | string;
  newExpirationDate: Date | string;
  validityDays?: number | string | null;
  remarks?: string | null;
  creatorName?: string | null;
  creatorAccount?: string | null;
}

export function generateRenewDealEmail(data: RenewDealEmailData): {
  subject: string;
  message: string;
} {
  const portalUrl = getPortalBaseUrl();
  const dealLink = `${portalUrl}/deals/${data.dealID}`;
  const dealRef = data.dealRegID || `ID-${data.dealID}`;
  const renewalFormatted = new Date(data.renewalDate).toLocaleDateString();
  const expFormatted = new Date(data.newExpirationDate).toLocaleDateString();
  const aoGreeting = data.aoNickName || data.assignedAO || 'Team';

  const subject = `[Deal Registration] Renewed: ${dealRef} - ${data.custName}`;

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">Deal Renewal Notification</h2>
    <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
      Hi ${aoGreeting},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      The deal for <strong>${data.custName}</strong> has been successfully <strong>renewed</strong> by 
      ${data.creatorName || data.creatorAccount || 'Portal User'}.
    </p>

    <table class="data-table">
      <tr>
        <td class="label">Deal Registration ID</td>
        <td class="value"><strong>${dealRef}</strong></td>
      </tr>
      <tr>
        <td class="label">Brand</td>
        <td class="value">${data.brand}</td>
      </tr>
      <tr>
        <td class="label">Project Name</td>
        <td class="value">${data.projectName || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">Renewal Date</td>
        <td class="value">${renewalFormatted}</td>
      </tr>
      <tr>
        <td class="label">New Expiration Date</td>
        <td class="value" style="color: #047857; font-weight: 700;">${expFormatted} (${data.validityDays || 'N/A'} days validity)</td>
      </tr>
      ${
        data.remarks
          ? `
      <tr>
        <td class="label">Renewal Remarks</td>
        <td class="value">${data.remarks}</td>
      </tr>`
          : ''
      }
    </table>

    <div class="btn-container">
      <a href="${dealLink}" class="btn" style="background-color: #059669;">View Renewed Deal</a>
    </div>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `Deal Renewed: ${dealRef} - ${data.custName}`),
  };
}

// --------------------------------------------------------------------------------
// 5. Expiring Deal Email
// --------------------------------------------------------------------------------

export type ExpirationWarningLevel = '30d' | '15d' | '7d' | 'daily';

export interface ExpiringDealEmailData {
  dealID: number | string;
  dealRegID?: string | null;
  custName: string;
  projectName?: string | null;
  brand: string;
  bu: string;
  assignedAO: string;
  aoNickName?: string;
  expirationDate: Date | string;
  daysRemaining: number;
  warningLevel: ExpirationWarningLevel;
}

export function generateExpiringDealEmail(data: ExpiringDealEmailData): {
  subject: string;
  message: string;
} {
  const portalUrl = getPortalBaseUrl();
  const dealLink = `${portalUrl}/deals/${data.dealID}`;
  const dealRef = data.dealRegID || `ID-${data.dealID}`;
  const expFormatted = new Date(data.expirationDate).toLocaleDateString();
  const aoGreeting = data.aoNickName || data.assignedAO || 'Team';

  let warningTitle = '';
  let subjectPrefix = '';

  switch (data.warningLevel) {
    case '30d':
      warningTitle = `Deal Expiring in ${data.daysRemaining} Days (1st Warning)`;
      subjectPrefix = `[Deal Registration] Expiring in ${data.daysRemaining} Days:`;
      break;
    case '15d':
      warningTitle = `Deal Expiring in 15 Days (2nd Warning)`;
      subjectPrefix = `[Deal Registration] Expiring in 15 Days:`;
      break;
    case '7d':
      warningTitle = `CRITICAL: Deal Expiring in 7 Days`;
      subjectPrefix = `[Deal Registration] CRITICAL 7-Day Warning:`;
      break;
    case 'daily':
    default:
      warningTitle = `URGENT: Deal Expiring in ${data.daysRemaining} Day(s)`;
      subjectPrefix = `[Deal Registration] URGENT - Expiring in ${data.daysRemaining} Day(s):`;
      break;
  }

  const subject = `${subjectPrefix} ${dealRef} - ${data.custName}`;

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #991b1b;">${warningTitle}</h2>
    <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
      Hi ${aoGreeting},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      This is an automated reminder that the deal registration for <strong>${data.custName}</strong> is approaching its expiration date.
      Please take necessary action to <strong>renew</strong> or update the deal status in the portal before it lapses.
    </p>

    <table class="data-table">
      <tr>
        <td class="label">Deal Registration ID</td>
        <td class="value"><strong>${dealRef}</strong></td>
      </tr>
      <tr>
        <td class="label">Brand</td>
        <td class="value">${data.brand}</td>
      </tr>
      <tr>
        <td class="label">Project Name</td>
        <td class="value">${data.projectName || 'N/A'}</td>
      </tr>
      <tr>
        <td class="label">Expiration Date</td>
        <td class="value" style="color: #b91c1c; font-weight: 700;">${expFormatted}</td>
      </tr>
      <tr>
        <td class="label">Remaining Validity</td>
        <td class="value" style="color: #b91c1c; font-weight: 700;">${data.daysRemaining} calendar day(s)</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #991b1b;">
      <strong>Action Required:</strong> If this opportunity is still active, please submit a renewal request to protect your deal registration status.
    </div>

    <div class="btn-container">
      <a href="${dealLink}" class="btn" style="background-color: #dc2626;">View & Renew Deal</a>
    </div>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `${warningTitle}: ${dealRef} - ${data.custName}`),
  };
}

// --------------------------------------------------------------------------------
// 6. System SMTP Diagnostic Check Email
// --------------------------------------------------------------------------------

export function generateSystemDiagnosticEmail(data: {
  mode: 'DEV' | 'LIVE';
  triggeredBy: string;
  formattedDate: string;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
}): {
  subject: string;
  message: string;
} {
  const subject = `[Deal Registration] System Connection & Delivery Test (${data.formattedDate})`;

  const content = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">SMTP Delivery & Routing Test (${data.mode} MODE)</h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
      This email verifies that your SMTP transport configuration, recipient resolution engine, and mode rules are operational.
    </p>

    <table class="data-table">
      <tr>
        <td class="label">Execution Mode</td>
        <td class="value"><strong>${data.mode} MODE</strong></td>
      </tr>
      <tr>
        <td class="label">Triggered By</td>
        <td class="value">${data.triggeredBy}</td>
      </tr>
      <tr>
        <td class="label">Timestamp</td>
        <td class="value">${data.formattedDate}</td>
      </tr>
      <tr>
        <td class="label">Delivered TO</td>
        <td class="value" style="font-family: monospace; color: #0284c7;">${data.toEmails.join(', ') || '(None)'}</td>
      </tr>
      ${
        data.ccEmails.length > 0
          ? `
      <tr>
        <td class="label">Delivered CC</td>
        <td class="value" style="font-family: monospace; color: #0284c7;">${data.ccEmails.join(', ')}</td>
      </tr>`
          : ''
      }
      ${
        data.bccEmails.length > 0
          ? `
      <tr>
        <td class="label">Delivered BCC</td>
        <td class="value" style="font-family: monospace; color: #0284c7;">${data.bccEmails.join(', ')}</td>
      </tr>`
          : ''
      }
    </table>
  `;

  return {
    subject,
    message: wrapEmailHtml(content, `System Connection & Delivery Test (${data.formattedDate})`),
  };
}

// --------------------------------------------------------------------------------
// 7. Scenario Test Template Resolver
// --------------------------------------------------------------------------------

export const TEST_SCENARIO_OPTIONS = [
  { value: 'CREATE', label: '🆕 Deal Registration: Created Notification', group: 'Lifecycle' },
  { value: 'UPDATE', label: '🔄 Deal Registration: Updated Notification', group: 'Lifecycle' },
  { value: 'EXPIRING_30D', label: '⏰ Deal Registration: 30-Day Warning', group: 'Expirations' },
  { value: 'EXPIRING_7D', label: '⚠️ Deal Registration: 7-Day Critical Alert', group: 'Expirations' },
  { value: 'EXPIRING_URGENT', label: '🚨 Deal Registration: Urgent Daily Alert (3 Days)', group: 'Expirations' },
  { value: 'LOST', label: '❌ Deal Registration: Closed as Lost', group: 'Lifecycle' },
  { value: 'RENEW', label: '🔁 Deal Registration: Renewal Notification', group: 'Lifecycle' },
  { value: 'SYSTEM_CHECK', label: '🛠️ SMTP Diagnostic & Health Check', group: 'System' },
] as const;

export function getScenarioEmailTemplate(
  scenario: string,
  options?: {
    aoNickName?: string;
    mode?: 'DEV' | 'LIVE';
    triggeredBy?: string;
    toEmails?: string[];
    ccEmails?: string[];
    bccEmails?: string[];
  }
): { subject: string; message: string } {
  const sampleNow = new Date();
  const sampleFormattedDate = sampleNow.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sampleAO = options?.aoNickName || 'John';

  switch (scenario) {
    case 'CREATE':
      return generateCreateDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        currency: 'PHP',
        regDate: sampleNow,
        expDate: new Date(sampleNow.getTime() + 90 * 24 * 60 * 60 * 1000),
        totalAmount: 1850000,
        creatorName: 'Sales Admin',
      });

    case 'UPDATE':
      return generateUpdateDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        currency: 'PHP',
        regDate: sampleNow,
        expDate: new Date(sampleNow.getTime() + 90 * 24 * 60 * 60 * 1000),
        totalAmount: 2200000,
        creatorName: 'Sales Admin',
        changes: [
          { label: 'Deal Amount', from: 'PHP 1,850,000.00', to: 'PHP 2,200,000.00' },
          { label: 'Remarks', from: '(empty)', to: 'Customer added 48-port PoE switches to BOM.' },
        ],
      });

    case 'EXPIRING_30D':
      return generateExpiringDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        expirationDate: new Date(sampleNow.getTime() + 30 * 24 * 60 * 60 * 1000),
        daysRemaining: 30,
        warningLevel: '30d',
      });

    case 'EXPIRING_7D':
      return generateExpiringDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        expirationDate: new Date(sampleNow.getTime() + 7 * 24 * 60 * 60 * 1000),
        daysRemaining: 7,
        warningLevel: '7d',
      });

    case 'EXPIRING_URGENT':
      return generateExpiringDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        expirationDate: new Date(sampleNow.getTime() + 3 * 24 * 60 * 60 * 1000),
        daysRemaining: 3,
        warningLevel: 'daily',
      });

    case 'LOST':
      return generateLostDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        competitorVendor: 'Trends & Technologies Inc.',
        competitorBrand: 'Huawei Enterprise',
        icsOffer: 'Cisco Catalyst 9300 Switches (PHP 2.2M)',
        competitorOffer: 'Huawei CloudEngine S5735 (PHP 1.8M)',
        reason: 'Competitor provided lower pricing and shorter hardware delivery lead time.',
        otherInformation: 'Customer promised next phase expansion bidding in Q4.',
        creatorName: 'Sales Admin',
      });

    case 'RENEW':
      return generateRenewDealEmail({
        dealID: 9942,
        dealRegID: 'DR-2026-9942',
        custName: 'Ayala Land Inc.',
        projectName: 'Enterprise Core Network Refresh',
        brand: 'Cisco',
        bu: 'BU5',
        assignedAO: 'John Doe',
        aoNickName: sampleAO,
        renewalDate: sampleNow,
        newExpirationDate: new Date(sampleNow.getTime() + 60 * 24 * 60 * 60 * 1000),
        validityDays: 60,
        remarks: 'Approved deal registration extension granted by Cisco PAM.',
        creatorName: 'Sales Admin',
      });

    case 'SYSTEM_CHECK':
    default:
      return generateSystemDiagnosticEmail({
        mode: options?.mode || 'DEV',
        triggeredBy: options?.triggeredBy || 'IT Administrator',
        formattedDate: sampleFormattedDate,
        toEmails: options?.toEmails || ['itadmin@ics.com.ph'],
        ccEmails: options?.ccEmails || [],
        bccEmails: options?.bccEmails || [],
      });
  }
}
