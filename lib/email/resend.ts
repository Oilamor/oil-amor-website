import { Resend } from 'resend'
import {
  passwordResetEmail,
  welcomeEmail,
  orderConfirmationEmail,
  shippingConfirmationEmail,
  abandonedCartEmail,
  rewardsUpdateEmail,
  blendPreparationEmail,
  blendCraftingEmail,
  orderReadyEmail,
  orderDeliveredEmail,
  commissionEarnedEmail,
  orderCancelledEmail,
  refundConfirmationEmail,
} from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.EMAIL_FROM_DOMAIN
  ? `noreply@${process.env.EMAIL_FROM_DOMAIN}`
  : 'noreply@oilamor.com'

// ============================================================================
// SEND EMAIL WRAPPER
// ============================================================================
async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  if (!process.env.RESEND_API_KEY) {
    return { success: true, id: 'dev-mode-logged', logged: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Oil Amor <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('❌ Resend API error:', error)
      throw new Error(error.message || 'Failed to send email')
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    throw error
  }
}

// ============================================================================
// PASSWORD RESET
// ============================================================================
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  firstName,
}: {
  to: string
  resetUrl: string
  firstName?: string
}) {
  const html = passwordResetEmail({ firstName, resetUrl })
  return sendEmail({
    to,
    subject: 'Reset your Oil Amor password',
    html,
    text: `Oil Amor - Reset Your Password\n\nHi ${firstName || 'there'},\n\nWe received a request to reset your password. Visit this link:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nOil Amor`,
  })
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================
export async function sendWelcomeEmail({
  to,
  firstName,
}: {
  to: string
  firstName: string
}) {
  const html = welcomeEmail({ firstName })
  return sendEmail({
    to,
    subject: `Welcome to Oil Amor, ${firstName}!`,
    html,
    text: `Welcome to Oil Amor, ${firstName}!\n\nYour account has been created. Start exploring our collection of luxury essential oils.\n\nVisit: ${process.env.NEXT_PUBLIC_URL}/collections\n\nWith love,\nThe Oil Amor Team`,
  })
}

// ============================================================================
// ORDER CONFIRMATION
// ============================================================================
export async function sendOrderConfirmationEmail({
  to,
  firstName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
  trackingUrl,
}: {
  to: string
  firstName: string
  orderNumber: string
  orderDate: string
  items: Array<{
    name: string
    variant?: string
    quantity: number
    price: number
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
  const html = orderConfirmationEmail({
    firstName,
    orderNumber,
    orderDate,
    items,
    subtotal,
    shipping,
    total,
    shippingAddress,
    trackingUrl,
  })
  const itemsText = items
    .map(i => `- ${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.quantity} - $${(i.price / 100).toFixed(2)}`)
    .join('\n')
  return sendEmail({
    to,
    subject: `Order Confirmed #${orderNumber}`,
    html,
    text: `Order Confirmed #${orderNumber}\n\nThank you ${firstName}!\n\n${itemsText}\n\nSubtotal: $${(subtotal / 100).toFixed(2)}\nShipping: ${shipping === 0 ? 'FREE' : '$' + (shipping / 100).toFixed(2)}\nTotal: $${(total / 100).toFixed(2)}\n\nShipping to:\n${shippingAddress.name}\n${shippingAddress.line1}\n${shippingAddress.line2 ? shippingAddress.line2 + '\n' : ''}${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}\n\nTrack: ${trackingUrl || 'Coming soon'}\n\nOil Amor`,
  })
}

// ============================================================================
// SHIPPING CONFIRMATION
// ============================================================================
export async function sendShippingConfirmationEmail({
  to,
  firstName,
  orderNumber,
  trackingNumber,
  trackingUrl,
  carrier,
  estimatedDelivery,
}: {
  to: string
  firstName: string
  orderNumber: string
  trackingNumber: string
  trackingUrl: string
  carrier: string
  estimatedDelivery?: string
}) {
  const html = shippingConfirmationEmail({
    firstName,
    orderNumber,
    trackingNumber,
    trackingUrl,
    carrier,
    estimatedDelivery,
  })
  return sendEmail({
    to,
    subject: `Your order #${orderNumber} has shipped!`,
    html,
    text: `Your Oil Amor order has shipped!\n\nOrder #${orderNumber}\n${carrier}: ${trackingNumber}\n${estimatedDelivery ? `Est. delivery: ${estimatedDelivery}\n` : ''}Track: ${trackingUrl}\n\nOil Amor`,
  })
}

// ============================================================================
// BLEND PREPARATION
// ============================================================================
export async function sendBlendPreparationEmail({
  to,
  firstName,
  orderNumber,
  blendName,
  mode,
  bottleSize,
}: {
  to: string
  firstName: string
  orderNumber: string
  blendName: string
  mode: string
  bottleSize: number
}) {
  const html = blendPreparationEmail({ firstName, orderNumber, blendName, mode, bottleSize })
  return sendEmail({
    to,
    subject: `Your ${blendName} is being prepared`,
    html,
    text: `Hi ${firstName},\n\nWe've received your order #${orderNumber} and our artisans are preparing your bespoke blend: ${blendName} (${bottleSize}ml, ${mode}).\n\nWe'll notify you when it's ready for dispatch.\n\nOil Amor`,
  })
}

// ============================================================================
// BLEND CRAFTING
// ============================================================================
export async function sendBlendCraftingEmail({
  to,
  firstName,
  orderNumber,
  blendName,
}: {
  to: string
  firstName: string
  orderNumber: string
  blendName: string
}) {
  const html = blendCraftingEmail({ firstName, orderNumber, blendName })
  return sendEmail({
    to,
    subject: `Handcrafting your ${blendName}`,
    html,
    text: `Hi ${firstName},\n\nOur master blender is now handcrafting ${blendName} for order #${orderNumber}. Quality testing and safety verification are in progress.\n\nOil Amor`,
  })
}

// ============================================================================
// ORDER READY
// ============================================================================
export async function sendOrderReadyEmail({
  to,
  firstName,
  orderNumber,
  blendName,
}: {
  to: string
  firstName: string
  orderNumber: string
  blendName: string
}) {
  const html = orderReadyEmail({ firstName, orderNumber, blendName })
  return sendEmail({
    to,
    subject: `${blendName} is ready for dispatch`,
    html,
    text: `Hi ${firstName},\n\nGreat news! ${blendName} has passed our quality checks and is ready for dispatch (order #${orderNumber}).\n\nYou'll receive a tracking number once it's on its way.\n\nOil Amor`,
  })
}

// ============================================================================
// ORDER DELIVERED
// ============================================================================
export async function sendOrderDeliveredEmail({
  to,
  firstName,
  orderNumber,
  blendName,
  batchId,
}: {
  to: string
  firstName: string
  orderNumber: string
  blendName: string
  batchId?: string
}) {
  const html = orderDeliveredEmail({ firstName, orderNumber, blendName, batchId })
  return sendEmail({
    to,
    subject: `${blendName} has been delivered`,
    html,
    text: `Hi ${firstName},\n\nYour ${blendName} has been delivered (order #${orderNumber}).\n\nCare Instructions:\n• Store in a cool, dark place\n• Keep tightly sealed\n• Use within 12 months\n• Perform a patch test before first use\n\n${batchId ? `Scan the QR code on your label to view your full blend recipe.\n` : ''}\nOil Amor`,
  })
}

// ============================================================================
// COMMISSION EARNED
// ============================================================================
export async function sendCommissionEarnedEmail({
  to,
  firstName,
  blendName,
  saleAmount,
  commissionAmount,
  commissionRate,
  purchaserName,
}: {
  to: string
  firstName: string
  blendName: string
  saleAmount: number
  commissionAmount: number
  commissionRate: number
  purchaserName: string
}) {
  const html = commissionEarnedEmail({ firstName, blendName, saleAmount, commissionAmount, commissionRate, purchaserName })
  return sendEmail({
    to,
    subject: `You earned $${commissionAmount.toFixed(2)} from ${blendName}`,
    html,
    text: `Hi ${firstName},\n\nAmazing news! Someone purchased your community blend "${blendName}" and you've earned a commission.\n\nCommission: $${commissionAmount.toFixed(2)} (${commissionRate}% of $${saleAmount.toFixed(2)})\nPurchased by: ${purchaserName}\n\nYour commission has been credited to your store credit balance.\n\nOil Amor`,
  })
}

// ============================================================================
// ORDER CANCELLED
// ============================================================================
export async function sendOrderCancelledEmail({
  to,
  firstName,
  orderNumber,
  reason,
}: {
  to: string
  firstName: string
  orderNumber: string
  reason?: string
}) {
  const html = orderCancelledEmail({ firstName, orderNumber, reason })
  return sendEmail({
    to,
    subject: `Order #${orderNumber} has been cancelled`,
    html,
    text: `Hi ${firstName},\n\nWe're writing to confirm that your order #${orderNumber} has been cancelled.\n\n${reason ? `Reason: ${reason}\n\n` : ''}If you paid by credit card, your refund will be processed within 3-5 business days.\n\nOil Amor`,
  })
}

// ============================================================================
// ABANDONED CART
// ============================================================================
export async function sendAbandonedCartEmail({
  to,
  firstName,
  items,
  cartUrl,
}: {
  to: string
  firstName?: string
  items: Array<{ name: string; price: number }>
  cartUrl: string
}) {
  const html = abandonedCartEmail({ firstName, items, cartUrl })
  const itemsText = items.map(i => `- ${i.name} - $${(i.price / 100).toFixed(2)}`).join('\n')
  return sendEmail({
    to,
    subject: 'Your cart is waiting at Oil Amor',
    html,
    text: `You left something behind at Oil Amor\n\n${itemsText}\n\nComplete your order: ${cartUrl}\n\nOil Amor`,
  })
}

// ============================================================================
// REWARDS UPDATE
// ============================================================================
export async function sendRewardsUpdateEmail({
  to,
  firstName,
  pointsBalance,
  pointsEarned,
  tier,
  nextReward,
}: {
  to: string
  firstName: string
  pointsBalance: number
  pointsEarned?: number
  tier: string
  nextReward?: string
}) {
  const html = rewardsUpdateEmail({
    firstName,
    pointsBalance,
    pointsEarned,
    tier,
    nextReward,
  })
  return sendEmail({
    to,
    subject: `You have ${pointsBalance.toLocaleString()} Crystal Points!`,
    html,
    text: `Crystal Circle Rewards Update\n\nHi ${firstName},\n\nYou now have ${pointsBalance.toLocaleString()} points as a ${tier} member!\n${pointsEarned ? `You just earned ${pointsEarned.toLocaleString()} points.` : ''}\n${nextReward ? `Unlock ${nextReward} with your next purchase!` : ''}\n\nView rewards: ${process.env.NEXT_PUBLIC_URL}/account/rewards\n\nOil Amor`,
  })
}

// ============================================================================
// REFUND CONFIRMATION
// ============================================================================
export async function sendRefundConfirmationEmail({
  to,
  orderNumber,
  amount,
}: {
  to: string
  orderNumber: string
  amount: number
}) {
  const html = refundConfirmationEmail({ orderNumber, amount })
  return sendEmail({
    to,
    subject: `Refund processed for order #${orderNumber}`,
    html,
    text: `Refund Processed for Order #${orderNumber}\n\nA refund of $${amount.toFixed(2)} AUD has been processed for your order.\n\nDepending on your bank, the refunded amount may take 5-10 business days to appear in your account.\n\nOil Amor`,
  })
}

// Export all template functions
export {
  passwordResetEmail,
  welcomeEmail,
  orderConfirmationEmail,
  shippingConfirmationEmail,
  abandonedCartEmail,
  rewardsUpdateEmail,
  blendPreparationEmail,
  blendCraftingEmail,
  orderReadyEmail,
  orderDeliveredEmail,
  commissionEarnedEmail,
  orderCancelledEmail,
  refundConfirmationEmail,
}
