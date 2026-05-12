/**
 * Rewards Notification System
 * 
 * Handles notifications for tier upgrades, charm unlocks, credit earnings,
 * and other Crystal Circle events. Integrates with email services and
 * in-app notification systems.
 */

import { TierLevel, CRYSTAL_CIRCLE_TIERS, getTierDisplayName } from './tiers';
import { CHAIN_CATALOG } from './chain-system';
import { CHARM_CATALOG } from './charm-system';
import { getCustomerRewardsProfile } from './customer-rewards';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NotificationType =
  | 'tier_upgrade'
  | 'chain_unlock'
  | 'charm_unlock'
  | 'credit_earned'
  | 'credit_expiring'
  | 'milestone'
  | 'refill_reminder'
  | 'birthday_gift'
  | 'quarterly_box';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  customerId: string;
  metadata: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  channels: NotificationChannel[];
  createdAt: Date;
  expiresAt?: Date;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface EmailTemplateData {
  templateId: string;
  subject: string;
  variables: Record<string, string | number | boolean>;
}

// ============================================================================
// NOTIFICATION CREATION FUNCTIONS
// ============================================================================

/**
 * Create tier upgrade notification
 * @param customerId - Customer's unique identifier
 * @param newTier - New tier level achieved
 * @param previousTier - Previous tier level
 * @returns Created notification payload
 */
export async function createTierUpgradeNotification(
  customerId: string,
  newTier: TierLevel,
  previousTier?: TierLevel
): Promise<NotificationPayload> {
  const tierConfig = CRYSTAL_CIRCLE_TIERS[newTier];
  const profile = await getCustomerRewardsProfile(customerId);
  
  const newBenefits = previousTier
    ? tierConfig.benefits.filter(
        b => !CRYSTAL_CIRCLE_TIERS[previousTier].benefits.includes(b)
      )
    : tierConfig.benefits;
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'tier_upgrade',
    title: `🌟 Welcome to ${tierConfig.name}!`,
    message: `Congratulations! You've ascended to ${tierConfig.name} tier in the Crystal Circle. ${tierConfig.description}`,
    customerId,
    metadata: {
      newTier,
      previousTier,
      newBenefits,
      unlockedChains: tierConfig.unlockedChains,
      unlockedCharms: tierConfig.unlockedCharms,
      refillDiscount: tierConfig.refillDiscount,
      tierColor: tierConfig.color,
      tierIcon: tierConfig.icon
    },
    priority: 'high',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
  
  await persistNotification(notification);
  await sendEmailNotification(customerId, createTierUpgradeEmail(newTier, newBenefits));
  
  return notification;
}

/**
 * Create chain unlock notification
 * @param customerId - Customer's unique identifier
 * @param chainType - Unlocked chain type
 * @returns Created notification payload
 */
export async function createChainUnlockNotification(
  customerId: string,
  chainType: string
): Promise<NotificationPayload> {
  const chainConfig = CHAIN_CATALOG[chainType as keyof typeof CHAIN_CATALOG];
  
  if (!chainConfig) {
    throw new Error(`Invalid chain type: ${chainType}`);
  }
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'chain_unlock',
    title: '✨ New Chain Unlocked!',
    message: `You've unlocked the ${chainConfig.name}! ${chainConfig.description.substring(0, 100)}...`,
    customerId,
    metadata: {
      chainType,
      chainName: chainConfig.name,
      chainValue: chainConfig.value,
      chainImage: chainConfig.image,
      specifications: chainConfig.specifications
    },
    priority: 'medium',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
  };
  
  await persistNotification(notification);
  await sendEmailNotification(customerId, createChainUnlockEmail(chainConfig));
  
  return notification;
}

/**
 * Create charm unlock notification
 * @param customerId - Customer's unique identifier
 * @param charmId - Unlocked charm ID
 * @returns Created notification payload
 */
export async function createCharmUnlockNotification(
  customerId: string,
  charmId: string
): Promise<NotificationPayload> {
  const charmConfig = CHARM_CATALOG[charmId];
  
  if (!charmConfig) {
    throw new Error(`Invalid charm ID: ${charmId}`);
  }
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'charm_unlock',
    title: '🔮 New Charm Collected!',
    message: `The ${charmConfig.name} has been added to your collection! ${charmConfig.meaning}`,
    customerId,
    metadata: {
      charmId,
      charmName: charmConfig.name,
      charmMeaning: charmConfig.meaning,
      charmMaterial: charmConfig.material,
      charmImage: charmConfig.image,
      description: charmConfig.description
    },
    priority: 'medium',
    channels: ['in_app'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
  };
  
  await persistNotification(notification);
  
  return notification;
}

/**
 * Create credit earned notification
 * @param customerId - Customer's unique identifier
 * @param amount - Credit amount earned
 * @param reason - Reason for credit
 * @returns Created notification payload
 */
export async function createCreditEarnedNotification(
  customerId: string,
  amount: number,
  reason: string
): Promise<NotificationPayload> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'credit_earned',
    title: '💰 Account Credit Added!',
    message: `$${amount.toFixed(2)} has been added to your account credit. ${reason}`,
    customerId,
    metadata: {
      amount,
      reason,
      newBalance: profile.accountCredit + amount,
      totalEarned: profile.creditHistory
        .filter(t => t.type === 'earned')
        .reduce((sum, t) => sum + t.amount, 0) + amount
    },
    priority: 'high',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
  };
  
  await persistNotification(notification);
  await sendEmailNotification(customerId, createCreditEarnedEmail(amount, reason, profile.accountCredit + amount));
  
  return notification;
}

/**
 * Create credit expiring warning notification
 * @param customerId - Customer's unique identifier
 * @param amount - Amount expiring
 * @param expiryDate - Date of expiration
 * @returns Created notification payload
 */
export async function createCreditExpiringNotification(
  customerId: string,
  amount: number,
  expiryDate: Date
): Promise<NotificationPayload> {
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'credit_expiring',
    title: '⏰ Credit Expiring Soon',
    message: `$${amount.toFixed(2)} in account credit will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}. Use it before it's gone!`,
    customerId,
    metadata: {
      amount,
      expiryDate: expiryDate.toISOString(),
      daysUntilExpiry
    },
    priority: 'high',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: expiryDate
  };
  
  await persistNotification(notification);
  
  return notification;
}

/**
 * Create milestone achievement notification
 * @param customerId - Customer's unique identifier
 * @param milestoneType - Type of milestone
 * @param value - Milestone value
 * @returns Created notification payload
 */
export async function createMilestoneNotification(
  customerId: string,
  milestoneType: 'purchases' | 'spend' | 'referrals' | 'streak',
  value: number
): Promise<NotificationPayload> {
  const titles: Record<string, string> = {
    purchases: `🎉 ${value} Purchases!`,
    spend: `💎 $${value} Total Spend!`,
    referrals: `👥 ${value} Friends Referred!`,
    streak: `🔥 ${value} Day Streak!`
  };
  
  const messages: Record<string, string> = {
    purchases: `Amazing! You've made ${value} purchases with Oil Amor. Thank you for being part of our Crystal Circle!`,
    spend: `Wow! You've spent $${value} with us. Your loyalty means everything.`,
    referrals: `${value} friends have joined thanks to you! You're spreading the wellness.`,
    streak: `${value} days of consistent wellness practice. Keep shining!`
  };
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'milestone',
    title: titles[milestoneType],
    message: messages[milestoneType],
    customerId,
    metadata: {
      milestoneType,
      value,
      achievedAt: new Date().toISOString()
    },
    priority: 'medium',
    channels: ['in_app'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  
  await persistNotification(notification);
  
  return notification;
}

/**
 * Create refill reminder notification
 * @param customerId - Customer's unique identifier
 * @param daysSinceLastOrder - Days since last oil order
 * @returns Created notification payload
 */
export async function createRefillReminderNotification(
  customerId: string,
  daysSinceLastOrder: number
): Promise<NotificationPayload> {
  const profile = await getCustomerRewardsProfile(customerId);
  const discount = profile.refillDiscount;
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'refill_reminder',
    title: '🌿 Time for a Refill?',
    message: `It's been ${daysSinceLastOrder} days since your last order. ${discount > 0 ? `Enjoy ${discount}% off your refill as a ${getTierDisplayName(profile.currentTier)} member!` : 'Keep your wellness ritual going with a fresh refill.'}`,
    customerId,
    metadata: {
      daysSinceLastOrder,
      refillDiscount: discount,
      currentTier: profile.currentTier
    },
    priority: 'low',
    channels: ['email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
  
  await persistNotification(notification);
  
  return notification;
}

/**
 * Create birthday gift notification
 * @param customerId - Customer's unique identifier
 * @param giftType - Type of birthday gift
 * @returns Created notification payload
 */
export async function createBirthdayGiftNotification(
  customerId: string,
  giftType: string
): Promise<NotificationPayload> {
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'birthday_gift',
    title: '🎂 Happy Birthday!',
    message: `Wishing you a year filled with wellness and joy! Your birthday gift (${giftType}) is waiting for you.`,
    customerId,
    metadata: {
      giftType,
      claimable: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    priority: 'high',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
  
  await persistNotification(notification);
  await sendEmailNotification(customerId, createBirthdayEmail(giftType));
  
  return notification;
}

/**
 * Create quarterly box notification (for Radiance+ members)
 * @param customerId - Customer's unique identifier
 * @param boxValue - Value of quarterly box
 * @returns Created notification payload
 */
export async function createQuarterlyBoxNotification(
  customerId: string,
  boxValue: number
): Promise<NotificationPayload> {
  const quarters = ['Spring', 'Summer', 'Fall', 'Winter'];
  const currentQuarter = quarters[Math.floor(new Date().getMonth() / 3)];
  
  const notification: NotificationPayload = {
    id: generateNotificationId(),
    type: 'quarterly_box',
    title: `📦 Your ${currentQuarter} Crystal Box is Ready!`,
    message: `Your exclusive quarterly crystal box ($${boxValue} value) has been prepared and will ship soon. Thank you for being a valued Radiance member!`,
    customerId,
    metadata: {
      quarter: currentQuarter,
      boxValue,
      shippingSoon: true
    },
    priority: 'medium',
    channels: ['in_app', 'email'],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
  };
  
  await persistNotification(notification);
  
  return notification;
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function createTierUpgradeEmail(
  newTier: TierLevel,
  newBenefits: string[]
): EmailTemplateData {
  const tierConfig = CRYSTAL_CIRCLE_TIERS[newTier];
  
  return {
    templateId: 'tier-upgrade',
    subject: `🌟 You've reached ${tierConfig.name} status!`,
    variables: {
      tierName: tierConfig.name,
      tierColor: tierConfig.color,
      tierIcon: tierConfig.icon,
      newBenefits: newBenefits.join('\n'),
      description: tierConfig.description,
      unlockedChains: tierConfig.unlockedChains.join(', '),
      refillDiscount: tierConfig.refillDiscount.toString()
    }
  };
}

function createChainUnlockEmail(
  chainConfig: (typeof CHAIN_CATALOG)[keyof typeof CHAIN_CATALOG]
): EmailTemplateData {
  return {
    templateId: 'chain-unlock',
    subject: `✨ Your ${chainConfig.name} is ready!`,
    variables: {
      chainName: chainConfig.name,
      chainDescription: chainConfig.description,
      chainValue: chainConfig.value.toString(),
      material: chainConfig.specifications.material,
      length: chainConfig.specifications.length
    }
  };
}

function createCreditEarnedEmail(
  amount: number,
  reason: string,
  newBalance: number
): EmailTemplateData {
  return {
    templateId: 'credit-earned',
    subject: '💰 Account Credit Added!',
    variables: {
      amount: amount.toFixed(2),
      reason,
      newBalance: newBalance.toFixed(2)
    }
  };
}

function createBirthdayEmail(giftType: string): EmailTemplateData {
  return {
    templateId: 'birthday-gift',
    subject: '🎂 Happy Birthday from Oil Amor!',
    variables: {
      giftType,
      claimUrl: '/account/birthday-gift'
    }
  };
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Get customer notifications
 * @param customerId - Customer's unique identifier
 * @param unreadOnly - Only return unread notifications
 * @param limit - Maximum number to return
 * @returns Array of notifications
 */
export async function getCustomerNotifications(
  customerId: string,
  unreadOnly: boolean = false,
  limit: number = 20
): Promise<NotificationPayload[]> {
  // In real implementation, would query database
  // Return mock data for now
  return [];
}

/**
 * Mark notification as read
 * @param notificationId - Notification ID
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  // In real implementation, update database
}

/**
 * Mark all notifications as read for customer
 * @param customerId - Customer's unique identifier
 */
export async function markAllNotificationsAsRead(
  customerId: string
): Promise<void> {
  // In real implementation, update database
}

/**
 * Delete notification
 * @param notificationId - Notification ID
 */
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  // In real implementation, delete from database
}

/**
 * Get unread notification count
 * @param customerId - Customer's unique identifier
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationCount(
  customerId: string
): Promise<number> {
  // In real implementation, query database
  return 0;
}

// ============================================================================
// INTERNAL FUNCTIONS
// ============================================================================

/**
 * Persist notification to database
 * @param notification - Notification to save
 */
async function persistNotification(
  notification: NotificationPayload
): Promise<void> {
  // In real implementation, save to Sanity/Database
}

/**
 * Send email notification via email service
 * @param customerId - Customer's unique identifier
 * @param templateData - Email template data
 */
async function sendEmailNotification(
  customerId: string,
  templateData: EmailTemplateData
): Promise<void> {
  // This would integrate with Klaviyo, SendGrid, or similar
  
  // Klaviyo integration example:
  // await klaviyoClient.sendEmail({
  //   to: customerEmail,
  //   template: templateData.templateId,
  //   variables: templateData.variables
  // });
}

/**
 * Generate unique notification ID
 * @returns Unique notification ID
 */
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// BULK NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Send notification to multiple customers
 * @param customerIds - Array of customer IDs
 * @param notificationType - Type of notification
 * @param data - Notification data
 * @returns Results of bulk send
 */
export async function sendBulkNotification(
  customerIds: string[],
  notificationType: NotificationType,
  data: Record<string, unknown>
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };
  
  for (const customerId of customerIds) {
    try {
      // Create and send notification based on type
      switch (notificationType) {
        case 'tier_upgrade':
          await createTierUpgradeNotification(
            customerId,
            data.newTier as TierLevel,
            data.previousTier as TierLevel
          );
          break;
        case 'credit_earned':
          await createCreditEarnedNotification(
            customerId,
            data.amount as number,
            data.reason as string
          );
          break;
        default:
          throw new Error(`Bulk notification not implemented for type: ${notificationType}`);
      }
      results.sent++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed for ${customerId}: ${error}`);
    }
  }
  
  return results;
}

/**
 * Schedule future notification
 * @param customerId - Customer's unique identifier
 * @param notificationType - Type of notification
 * @param scheduledTime - When to send
 * @param data - Notification data
 * @returns Scheduled notification ID
 */
export async function scheduleNotification(
  customerId: string,
  notificationType: NotificationType,
  scheduledTime: Date,
  data: Record<string, unknown>
): Promise<string> {
  const notificationId = generateNotificationId();
  
  // In real implementation, would use job scheduler like Bull or AWS EventBridge
  
  return notificationId;
}

/**
 * Cancel scheduled notification
 * @param notificationId - Notification ID to cancel
 */
export async function cancelScheduledNotification(
  notificationId: string
): Promise<boolean> {
  // In real implementation, would remove from job scheduler
  return true;
}
