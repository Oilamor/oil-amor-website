// ============================================================================
// OIL AMOR - LUXURY EMAIL TEMPLATES
// Premium transactional emails with sophisticated design
// ============================================================================

const BRAND = {
  colors: {
    gold: '#c9a227',
    goldLight: '#f5e6c8',
    dark: '#0a080c',
    card: '#111111',
    text: '#f5f3ef',
    muted: '#a69b8a',
    subtle: '#6b655a',
    success: '#2ecc71',
    error: '#e74c3c',
  },
  fonts: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "system-ui, -apple-system, sans-serif",
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
}

// Base email wrapper with luxury styling
function baseEmail(content: string, options: { preview?: string } = {}) {
  const { preview = 'Oil Amor' } = options
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${preview}</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: ${BRAND.colors.dark} !important; }
      .email-card { background-color: ${BRAND.colors.card} !important; }
    }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
    }
    
    /* Animations (limited email client support) */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in {
      animation: fadeIn 0.6s ease-out forwards;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.dark}; font-family: ${BRAND.fonts.sans}; -webkit-font-smoothing: antialiased;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preview}
  </div>
  
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-wrapper" style="background-color: ${BRAND.colors.dark};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container email-card" style="max-width: 600px; background: linear-gradient(180deg, ${BRAND.colors.card} 0%, #0d0b0f 100%); border-radius: ${BRAND.borderRadius.lg}; border: 1px solid rgba(245, 243, 239, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          ${content}
          
        </table>
        
        <!-- Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; margin-top: 30px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <!-- Social Icons -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com/oilamor" style="display: block; width: 36px; height: 36px; background: rgba(201, 162, 39, 0.1); border: 1px solid rgba(201, 162, 39, 0.2); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; color: ${BRAND.colors.gold}; font-size: 14px;">IG</a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://facebook.com/oilamor" style="display: block; width: 36px; height: 36px; background: rgba(201, 162, 39, 0.1); border: 1px solid rgba(201, 162, 39, 0.2); border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none; color: ${BRAND.colors.gold}; font-size: 14px;">FB</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: ${BRAND.colors.subtle}; font-size: 12px; line-height: 1.6; margin: 0;">
                © ${new Date().getFullYear()} Oil Amor. All rights reserved.<br>
                <a href="{{unsubscribe_url}}" style="color: ${BRAND.colors.muted}; text-decoration: none;">Unsubscribe</a> | 
                <a href="${process.env.NEXT_PUBLIC_URL || 'https://oilamor.com'}/privacy" style="color: ${BRAND.colors.muted}; text-decoration: none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================
function emailHeader(title: string, subtitle?: string) {
  return `
<!-- Header -->
<tr>
  <td style="padding: 50px 40px 30px; text-align: center; border-bottom: 1px solid rgba(245, 243, 239, 0.06);" class="mobile-padding">
    <!-- Logo -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 24px;">
      <tr>
        <td style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0.05) 100%); border: 1px solid rgba(201, 162, 39, 0.3); border-radius: 50%; text-align: center; vertical-align: middle;">
          <span style="font-size: 32px; line-height: 72px;">👑</span>
        </td>
      </tr>
    </table>
    
    <!-- Brand -->
    <h1 style="font-family: ${BRAND.fonts.serif}; font-size: 14px; color: ${BRAND.colors.gold}; letter-spacing: 4px; text-transform: uppercase; margin: 0 0 16px; font-weight: 400;">
      Oil Amor
    </h1>
    
    <!-- Title -->
    <h2 style="font-family: ${BRAND.fonts.serif}; font-size: 28px; color: ${BRAND.colors.text}; margin: 0 0 12px; font-weight: 400; line-height: 1.3;" class="animate-in">
      ${title}
    </h2>
    
    ${subtitle ? `
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; margin: 0; line-height: 1.6;">
      ${subtitle}
    </p>
    ` : ''}
  </td>
</tr>
`
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================
function emailButton(text: string, url: string, options: { fullWidth?: boolean } = {}) {
  const { fullWidth = false } = options
  
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${fullWidth ? 'width="100%"' : ''} style="margin: 32px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.colors.gold} 0%, #b8941f 100%); color: ${BRAND.colors.dark}; text-decoration: none; padding: 18px 40px; border-radius: ${BRAND.borderRadius.md}; font-size: 15px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 20px rgba(201, 162, 39, 0.3); ${fullWidth ? 'width: 100%; box-sizing: border-box;' : ''}">
        ${text}
      </a>
    </td>
  </tr>
</table>
`
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================
export function passwordResetEmail(params: {
  firstName?: string
  resetUrl: string
  expiresIn?: string
}) {
  const { firstName, resetUrl, expiresIn = '1 hour' } = params
  
  const content = `
${emailHeader('Reset Your Password', 'Secure your account with a new password')}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName || 'there'},
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      We received a request to reset your Oil Amor account password. Click the button below to create a new secure password.
    </p>
    
    ${emailButton('Reset My Password', resetUrl)}
    
    <!-- Divider -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td style="border-top: 1px solid rgba(245, 243, 239, 0.08);"></td>
      </tr>
    </table>
    
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 0 0 16px;">
      Or copy and paste this link into your browser:
    </p>
    
    <p style="font-size: 13px; color: ${BRAND.colors.gold}; word-break: break-all; margin: 0 0 32px; font-family: monospace; background: rgba(201, 162, 39, 0.05); padding: 12px 16px; border-radius: ${BRAND.borderRadius.sm}; border: 1px solid rgba(201, 162, 39, 0.15);">
      ${resetUrl}
    </p>
    
    <!-- Security Notice -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(231, 76, 60, 0.05); border: 1px solid rgba(231, 76, 60, 0.15); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 0;">
            <strong style="color: ${BRAND.colors.error};">⏰ Expires in ${expiresIn}</strong><br>
            This link will expire for your security. If you didn't request this reset, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>
    
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0;">
      Need help? Reply to this email or contact our support team.<br>
      <span style="color: ${BRAND.colors.subtle};">Your privacy and security are important to us.</span>
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: 'Reset your Oil Amor password' })
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================
export function welcomeEmail(params: {
  firstName: string
  loginUrl?: string
}) {
  const { firstName, loginUrl = process.env.NEXT_PUBLIC_URL || 'https://oilamor.com' } = params
  
  const content = `
${emailHeader('Welcome to Oil Amor', 'Your journey to natural wellness begins now')}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Dear ${firstName},
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      Welcome to the Oil Amor family. Your account has been successfully created and you're now part of an exclusive community dedicated to natural wellness and luxurious self-care.
    </p>
    
    <!-- Benefits Grid -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td style="padding: 16px; background: rgba(201, 162, 39, 0.05); border-radius: ${BRAND.borderRadius.sm}; border: 1px solid rgba(201, 162, 39, 0.1);">
          <p style="font-size: 14px; color: ${BRAND.colors.text}; margin: 0 0 8px;">✨ Crystal Circle Rewards</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0;">Earn points on every purchase</p>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
      <tr>
        <td style="padding: 16px; background: rgba(201, 162, 39, 0.05); border-radius: ${BRAND.borderRadius.sm}; border: 1px solid rgba(201, 162, 39, 0.1);">
          <p style="font-size: 14px; color: ${BRAND.colors.text}; margin: 0 0 8px;">♻️ Forever Bottle Program</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0;">Refill your favorites, save the planet</p>
        </td>
      </tr>
      <tr><td style="height: 12px;"></td></tr>
      <tr>
        <td style="padding: 16px; background: rgba(201, 162, 39, 0.05); border-radius: ${BRAND.borderRadius.sm}; border: 1px solid rgba(201, 162, 39, 0.1);">
          <p style="font-size: 14px; color: ${BRAND.colors.text}; margin: 0 0 8px;">🎁 Exclusive Member Perks</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0;">Early access to new collections</p>
        </td>
      </tr>
    </table>
    
    ${emailButton('Explore Collection', loginUrl + '/collections')}
    
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      With love and wellness,<br>
      <strong style="color: ${BRAND.colors.gold};">The Oil Amor Team</strong>
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: 'Welcome to Oil Amor, ${firstName}' })
}

// ============================================================================
// ORDER CONFIRMATION EMAIL
// ============================================================================
export function orderConfirmationEmail(params: {
  firstName: string
  orderNumber: string
  orderDate: string
  items: Array<{
    name: string
    variant?: string
    quantity: number
    price: number
    image?: string
  }>
  subtotal: number
  shipping: number
  total: number
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  trackingUrl?: string
}) {
  const { 
    firstName, 
    orderNumber, 
    orderDate, 
    items, 
    subtotal, 
    shipping, 
    total,
    shippingAddress,
    trackingUrl 
  } = params

  const itemsHtml = items.map(item => `
<tr>
  <td style="padding: 16px 0; border-bottom: 1px solid rgba(245, 243, 239, 0.06);">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="vertical-align: top;">
          <p style="font-size: 15px; color: ${BRAND.colors.text}; margin: 0 0 4px; font-weight: 500;">
            ${item.name}
          </p>
          ${item.variant ? `<p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0 0 4px;">${item.variant}</p>` : ''}
          <p style="font-size: 13px; color: ${BRAND.colors.subtle}; margin: 0;">Qty: ${item.quantity}</p>
        </td>
        <td align="right" style="vertical-align: top; white-space: nowrap;">
          <p style="font-size: 15px; color: ${BRAND.colors.text}; margin: 0;">
            $${(item.price / 100).toFixed(2)}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`).join('')

  const content = `
${emailHeader('Order Confirmed', `Order #${orderNumber}`)}

<!-- Order Status Banner -->
<tr>
  <td style="padding: 0 40px;" class="mobile-padding">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.2); border-radius: ${BRAND.borderRadius.md}; margin-bottom: 32px;">
      <tr>
        <td style="padding: 16px 20px; text-align: center;">
          <p style="font-size: 14px; color: ${BRAND.colors.success}; margin: 0; font-weight: 500;">
            ✅ Payment Confirmed &bull; ${orderDate}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Content -->
<tr>
  <td style="padding: 0 40px 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      Thank you for your order. We're preparing your items with care and will notify you once they ship.
    </p>
    
    <!-- Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
      ${itemsHtml}
    </table>
    
    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(201, 162, 39, 0.03); border-radius: ${BRAND.borderRadius.md}; padding: 24px; margin-bottom: 32px;">
      <tr>
        <td style="padding-bottom: 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td><p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0;">Subtotal</p></td>
              <td align="right"><p style="font-size: 14px; color: ${BRAND.colors.text}; margin: 0;">$${(subtotal / 100).toFixed(2)}</p></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 16px; border-bottom: 1px solid rgba(245, 243, 239, 0.08);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td><p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0;">Shipping</p></td>
              <td align="right"><p style="font-size: 14px; color: ${BRAND.colors.text}; margin: 0;">${shipping === 0 ? 'FREE' : '$' + (shipping / 100).toFixed(2)}</p></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td><p style="font-size: 16px; color: ${BRAND.colors.text}; margin: 0; font-weight: 600;">Total</p></td>
              <td align="right"><p style="font-size: 18px; color: ${BRAND.colors.gold}; margin: 0; font-weight: 600;">$${(total / 100).toFixed(2)}</p></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Shipping Address -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
      <tr>
        <td>
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Shipping To</p>
          <p style="font-size: 14px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0;">
            ${shippingAddress.name}<br>
            ${shippingAddress.line1}<br>
            ${shippingAddress.line2 ? shippingAddress.line2 + '<br>' : ''}
            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br>
            ${shippingAddress.country}
          </p>
        </td>
      </tr>
    </table>
    
    ${trackingUrl ? emailButton('Track Order', trackingUrl) : ''}
    
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      Questions? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_URL}/contact" style="color: ${BRAND.colors.gold}; text-decoration: none;">Help Center</a>.
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `Order Confirmed #${orderNumber} - Oil Amor` })
}

// ============================================================================
// SHIPPING CONFIRMATION EMAIL
// ============================================================================
export function shippingConfirmationEmail(params: {
  firstName: string
  orderNumber: string
  trackingNumber: string
  trackingUrl: string
  carrier: string
  estimatedDelivery?: string
}) {
  const { firstName, orderNumber, trackingNumber, trackingUrl, carrier, estimatedDelivery } = params
  
  const content = `
${emailHeader('Your Order is On Its Way!', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Great news, ${firstName}!
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      Your Oil Amor order has shipped and is making its way to you. Get ready for a moment of pure wellness.
    </p>
    
    <!-- Tracking Box -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.02) 100%); border: 1px solid rgba(201, 162, 39, 0.2); border-radius: ${BRAND.borderRadius.lg}; margin-bottom: 32px;">
      <tr>
        <td style="padding: 32px; text-align: center;">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px;">${carrier}</p>
          <p style="font-size: 24px; color: ${BRAND.colors.gold}; font-family: monospace; margin: 0 0 8px; letter-spacing: 1px;">
            ${trackingNumber}
          </p>
          ${estimatedDelivery ? `<p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0;">Estimated delivery: <strong style="color: ${BRAND.colors.text};">${estimatedDelivery}</strong></p>` : ''}
        </td>
      </tr>
    </table>
    
    ${emailButton('Track Package', trackingUrl)}
    
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0;">
      We'll send you another update when your package is out for delivery.
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `Your order #${orderNumber} has shipped!` })
}

// ============================================================================
// ABANDONED CART EMAIL
// ============================================================================
export function abandonedCartEmail(params: {
  firstName?: string
  items: Array<{
    name: string
    image?: string
    price: number
  }>
  cartUrl: string
}) {
  const { firstName, items, cartUrl } = params
  
  const itemsHtml = items.slice(0, 3).map(item => `
<tr>
  <td style="padding: 16px; background: rgba(245, 243, 239, 0.02); border-radius: ${BRAND.borderRadius.sm}; margin-bottom: 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="vertical-align: middle;">
          <p style="font-size: 15px; color: ${BRAND.colors.text}; margin: 0; font-weight: 500;">${item.name}</p>
          <p style="font-size: 14px; color: ${BRAND.colors.gold}; margin: 4px 0 0;">$${(item.price / 100).toFixed(2)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr><td style="height: 8px;"></td></tr>
`).join('')
  
  const content = `
${emailHeader('You Left Something Behind', 'Your wellness ritual is waiting')}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      ${firstName ? `Hi ${firstName},` : 'Hello,'}
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      We noticed you were interested in some of our finest essential oils. Your cart is waiting for you—complete your order now.
    </p>
    
    <!-- Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
      ${itemsHtml}
    </table>
    
    ${items.length > 3 ? `<p style="font-size: 14px; color: ${BRAND.colors.muted}; text-align: center; margin: 0 0 24px;">+ ${items.length - 3} more items</p>` : ''}
    
    ${emailButton('Complete My Order', cartUrl)}
    
    <!-- Urgency -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="text-align: center;">
          <p style="font-size: 13px; color: ${BRAND.colors.subtle}; margin: 0;">
            Items in your cart are not reserved and may sell out.
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`

  return baseEmail(content, { preview: 'Your cart is waiting at Oil Amor' })
}

// ============================================================================
// CRYSTAL CIRCLE - REWARDS UPDATE
// ============================================================================
export function rewardsUpdateEmail(params: {
  firstName: string
  pointsBalance: number
  pointsEarned?: number
  tier: string
  nextReward?: string
}) {
  const { firstName, pointsBalance, pointsEarned, tier, nextReward } = params
  
  const tierColors: Record<string, string> = {
    'Quartz': '#e0e0e0',
    'Amethyst': '#9b59b6',
    'Sapphire': '#3498db',
    'Emerald': '#2ecc71',
    'Diamond': '#c9a227',
  }
  
  const content = `
${emailHeader('Crystal Circle Rewards', `${tier} Member`)}

<!-- Tier Banner -->
<tr>
  <td style="padding: 0 40px 32px;" class="mobile-padding">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, ${tierColors[tier] || BRAND.colors.gold}20 0%, ${tierColors[tier] || BRAND.colors.gold}05 100%); border: 1px solid ${tierColors[tier] || BRAND.colors.gold}30; border-radius: ${BRAND.borderRadius.lg};">
      <tr>
        <td style="padding: 32px; text-align: center;">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Current Balance</p>
          <p style="font-size: 48px; color: ${tierColors[tier] || BRAND.colors.gold}; margin: 0; font-weight: 600; text-shadow: 0 0 40px ${tierColors[tier] || BRAND.colors.gold}40;">
            ${pointsBalance.toLocaleString()}
          </p>
          <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 8px 0 0;">points</p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Content -->
<tr>
  <td style="padding: 0 40px 40px;" class="mobile-padding">
    ${pointsEarned ? `
    <p style="font-size: 16px; color: ${BRAND.colors.success}; line-height: 1.8; margin: 0 0 24px; text-align: center;">
      ✨ You just earned ${pointsEarned.toLocaleString()} points!
    </p>
    ` : ''}
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      Hi ${firstName},
    </p>
    
    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 32px;">
      As a ${tier} member, you enjoy exclusive benefits and early access to our limited collections. Your points can be redeemed for discounts, free shipping, and special gifts.
    </p>
    
    ${nextReward ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(46, 204, 113, 0.05); border: 1px solid rgba(46, 204, 113, 0.15); border-radius: ${BRAND.borderRadius.md}; margin-bottom: 32px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0 0 8px;">You're close to unlocking</p>
          <p style="font-size: 18px; color: ${BRAND.colors.success}; margin: 0; font-weight: 500;">${nextReward}</p>
        </td>
      </tr>
    </table>
    ` : ''}
    
    ${emailButton('View Rewards', `${process.env.NEXT_PUBLIC_URL}/account/rewards`)}
  </td>
</tr>
`

  return baseEmail(content, { preview: `You have ${pointsBalance.toLocaleString()} Crystal Points!` })
}

// ============================================================================
// BLEND PREPARATION EMAIL
// ============================================================================
export function blendPreparationEmail(params: {
  firstName: string
  orderNumber: string
  blendName: string
  mode: string
  bottleSize: number
}) {
  const { firstName, orderNumber, blendName, mode, bottleSize } = params

  const content = `
${emailHeader('Your Blend is Being Prepared', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      We've received your order and our artisans are preparing your bespoke blend. Every drop is measured with precision and care.
    </p>

    <!-- Blend Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(201, 162, 39, 0.05); border: 1px solid rgba(201, 162, 39, 0.1); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0 0 8px;">Your Blend</p>
          <p style="font-size: 20px; color: ${BRAND.colors.text}; margin: 0 0 4px; font-weight: 500;">${blendName}</p>
          <p style="font-size: 13px; color: ${BRAND.colors.subtle}; margin: 0;">${bottleSize}ml • ${mode === 'pure' ? 'Pure Essential Oil' : 'Carrier Oil Blend'}</p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      We'll notify you when your blend is ready for dispatch.
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `Your ${blendName} is being prepared` })
}

// ============================================================================
// BLEND CRAFTING EMAIL
// ============================================================================
export function blendCraftingEmail(params: {
  firstName: string
  orderNumber: string
  blendName: string
}) {
  const { firstName, orderNumber, blendName } = params

  const content = `
${emailHeader('Handcrafting Your Blend', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      Our master blender is now handcrafting <strong style="color: ${BRAND.colors.gold};">${blendName}</strong>. Each oil is being carefully measured, mixed, and balanced to create your perfect formulation.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(155, 89, 182, 0.05); border: 1px solid rgba(155, 89, 182, 0.15); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="font-size: 14px; color: ${BRAND.colors.muted}; margin: 0;">
            🧪 Quality testing and safety verification in progress
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      Next step: quality check and labelling
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `Handcrafting ${blendName}` })
}

// ============================================================================
// ORDER READY EMAIL
// ============================================================================
export function orderReadyEmail(params: {
  firstName: string
  orderNumber: string
  blendName: string
}) {
  const { firstName, orderNumber, blendName } = params

  const content = `
${emailHeader('Your Order is Ready', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      Great news! <strong style="color: ${BRAND.colors.gold};">${blendName}</strong> has passed our quality checks and is ready for dispatch. Your carefully crafted blend is packaged and waiting for the courier.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(46, 204, 113, 0.05); border: 1px solid rgba(46, 204, 113, 0.15); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="font-size: 14px; color: ${BRAND.colors.success}; margin: 0;">
            ✅ Quality Verified • ✅ Labelled • ✅ Packed
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      You'll receive a tracking number once your order is on its way.
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `${blendName} is ready for dispatch` })
}

// ============================================================================
// ORDER DELIVERED EMAIL
// ============================================================================
export function orderDeliveredEmail(params: {
  firstName: string
  orderNumber: string
  blendName: string
  batchId?: string
}) {
  const { firstName, orderNumber, blendName, batchId } = params

  const content = `
${emailHeader('Your Blend Has Arrived', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      Your <strong style="color: ${BRAND.colors.gold};">${blendName}</strong> has been delivered. We hope it brings you the wellness and tranquility you seek.
    </p>

    <!-- Care Instructions -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(201, 162, 39, 0.05); border: 1px solid rgba(201, 162, 39, 0.1); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="font-size: 14px; color: ${BRAND.colors.gold}; margin: 0 0 12px; font-weight: 500;">💎 Care Instructions</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0 0 8px;">• Store in a cool, dark place away from direct sunlight</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0 0 8px;">• Keep the bottle tightly sealed when not in use</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0 0 8px;">• Use within 12 months for optimal potency</p>
          <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0;">• Perform a patch test before first use</p>
        </td>
      </tr>
    </table>

    ${batchId ? `
    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 24px 0; text-align: center;">
      Scan the QR code on your label to view your full blend recipe, safety information, and reorder anytime.
    </p>
    ` : ''}

    ${emailButton('Reorder This Blend', `${process.env.NEXT_PUBLIC_URL}/account/orders`)}

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      With love and wellness,<br>
      <strong style="color: ${BRAND.colors.gold};">The Oil Amor Team</strong>
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `${blendName} has been delivered` })
}

// ============================================================================
// COMMISSION EARNED EMAIL
// ============================================================================
export function commissionEarnedEmail(params: {
  firstName: string
  blendName: string
  saleAmount: number
  commissionAmount: number
  commissionRate: number
  purchaserName: string
}) {
  const { firstName, blendName, saleAmount, commissionAmount, commissionRate, purchaserName } = params

  const content = `
${emailHeader('You Earned a Commission!', 'Community Blend Sale')}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      Amazing news! Someone purchased your community blend <strong style="color: ${BRAND.colors.gold};">${blendName}</strong> and you've earned a commission.
    </p>

    <!-- Commission Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(201, 162, 39, 0.05); border: 1px solid rgba(201, 162, 39, 0.1); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Commission Earned</p>
          <p style="font-size: 36px; color: ${BRAND.colors.gold}; margin: 0; font-weight: 600;">
            $${commissionAmount.toFixed(2)}
          </p>
          <p style="font-size: 13px; color: ${BRAND.colors.subtle}; margin: 8px 0 0;">
            ${commissionRate}% of $${saleAmount.toFixed(2)} sale
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 24px 0; text-align: center;">
      Purchased by: <strong style="color: ${BRAND.colors.text};">${purchaserName}</strong>
    </p>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      Your commission has been credited to your store credit balance and can be used on your next purchase.
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `You earned $${commissionAmount.toFixed(2)} from ${blendName}` })
}

// ============================================================================
// ORDER CANCELLED EMAIL
// ============================================================================
export function orderCancelledEmail(params: {
  firstName: string
  orderNumber: string
  reason?: string
}) {
  const { firstName, orderNumber, reason } = params

  const content = `
${emailHeader('Order Cancelled', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hi ${firstName},
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      We're writing to confirm that your order <strong style="color: ${BRAND.colors.text};">#${orderNumber}</strong> has been cancelled.
    </p>

    ${reason ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(231, 76, 60, 0.05); border: 1px solid rgba(231, 76, 60, 0.15); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="font-size: 14px; color: ${BRAND.colors.error}; margin: 0;">Reason: ${reason}</p>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 24px 0;">
      If you paid by credit card, your refund will be processed within 3-5 business days. If you have any questions, please reply to this email.
    </p>

    ${emailButton('Shop Again', `${process.env.NEXT_PUBLIC_URL}/collections`)}
  </td>
</tr>
`

  return baseEmail(content, { preview: `Order #${orderNumber} has been cancelled` })
}

// ============================================================================
// REFUND CONFIRMATION EMAIL
// ============================================================================
export function refundConfirmationEmail(params: {
  orderNumber: string
  amount: number
}) {
  const { orderNumber, amount } = params

  const content = `
${emailHeader('Refund Processed', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 40px;" class="mobile-padding">
    <p style="font-size: 16px; color: ${BRAND.colors.text}; line-height: 1.8; margin: 0 0 24px;">
      Hello,
    </p>

    <p style="font-size: 16px; color: ${BRAND.colors.muted}; line-height: 1.8; margin: 0 0 24px;">
      A refund has been processed for your order <strong style="color: ${BRAND.colors.text};">#${orderNumber}</strong>.
    </p>

    <!-- Refund Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: rgba(46, 204, 113, 0.05); border: 1px solid rgba(46, 204, 113, 0.15); border-radius: ${BRAND.borderRadius.md}; margin: 24px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Refunded Amount</p>
          <p style="font-size: 36px; color: ${BRAND.colors.success}; margin: 0; font-weight: 600;">
            $${amount.toFixed(2)}
          </p>
          <p style="font-size: 13px; color: ${BRAND.colors.subtle}; margin: 8px 0 0;">
            AUD — will appear in 5-10 business days
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 24px 0;">
      Depending on your bank, the refunded amount may take 5-10 business days to appear in your account. If you have any questions, please reply to this email.
    </p>

    ${emailButton('View Your Orders', `${process.env.NEXT_PUBLIC_URL}/account/orders`)}

    <p style="font-size: 14px; color: ${BRAND.colors.muted}; line-height: 1.6; margin: 32px 0 0; text-align: center;">
      With love and wellness,<br>
      <strong style="color: ${BRAND.colors.gold};">The Oil Amor Team</strong>
    </p>
  </td>
</tr>
`

  return baseEmail(content, { preview: `Refund of $${amount.toFixed(2)} for order #${orderNumber}` })
}

// ============================================================================
// ADMIN ORDER NOTIFICATION EMAIL
// ============================================================================
export function adminOrderNotificationEmail(params: {
  orderNumber: string
  customerName: string
  customerEmail: string
  total: number
  status: string
  items: Array<{ name: string; quantity: number; price: number }>
  action: 'new_order' | 'status_change' | 'refund' | 'cancelled'
  previousStatus?: string
  refundAmount?: number
  adminUrl?: string
}) {
  const { orderNumber, customerName, customerEmail, total, status, items, action, previousStatus, refundAmount, adminUrl } = params

  const actionLabels: Record<string, string> = {
    new_order: '🛒 New Order Received',
    status_change: '📦 Order Status Updated',
    refund: '💰 Order Refunded',
    cancelled: '❌ Order Cancelled',
  }

  const actionColor = action === 'new_order' ? BRAND.colors.gold : action === 'refund' || action === 'cancelled' ? BRAND.colors.error : BRAND.colors.success

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${BRAND.colors.text}; font-size: 13px;">${item.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${BRAND.colors.muted}; font-size: 13px; text-align: center;">x${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${BRAND.colors.text}; font-size: 13px; text-align: right;">$${(item.price / 100).toFixed(2)}</td>
    </tr>
  `).join('')

  const content = `
${emailHeader(actionLabels[action] || 'Order Update', `Order #${orderNumber}`)}

<!-- Content -->
<tr>
  <td style="padding: 32px;" class="mobile-padding">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${actionColor}10; border: 1px solid ${actionColor}30; border-radius: ${BRAND.borderRadius.md}; margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px;">
          <p style="font-size: 12px; color: ${BRAND.colors.muted}; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">${actionLabels[action] || 'Order Update'}</p>
          <p style="font-size: 24px; color: ${actionColor}; margin: 0; font-weight: 600;">Order #${orderNumber}</p>
          ${previousStatus ? `<p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 8px 0 0;">Status: ${previousStatus} → ${status}</p>` : `<p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 8px 0 0;">Status: ${status}</p>`}
          ${refundAmount ? `<p style="font-size: 13px; color: ${BRAND.colors.error}; margin: 8px 0 0;">Refund: $${refundAmount.toFixed(2)} AUD</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Customer Info -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px;">
      <tr>
        <td style="padding: 0 0 8px; color: ${BRAND.colors.muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Customer</td>
      </tr>
      <tr>
        <td style="padding: 0 0 4px; color: ${BRAND.colors.text}; font-size: 14px;"><strong>${customerName}</strong></td>
      </tr>
      <tr>
        <td style="padding: 0; color: ${BRAND.colors.muted}; font-size: 13px;">${customerEmail}</td>
      </tr>
    </table>

    <!-- Items -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px;">
      <tr>
        <td style="padding: 0 0 8px; color: ${BRAND.colors.muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Items</td>
      </tr>
      ${itemsHtml}
      <tr>
        <td style="padding: 12px 0 0; color: ${BRAND.colors.muted}; font-size: 13px;"></td>
        <td style="padding: 12px 0 0; color: ${BRAND.colors.muted}; font-size: 13px; text-align: center;">Total</td>
        <td style="padding: 12px 0 0; color: ${BRAND.colors.gold}; font-size: 16px; font-weight: 600; text-align: right;">$${(total / 100).toFixed(2)}</td>
      </tr>
    </table>

    ${adminUrl ? emailButton('View in Admin', adminUrl) : ''}
  </td>
</tr>
`

  return baseEmail(content, { preview: `${actionLabels[action] || 'Order Update'} — #${orderNumber}` })
}
