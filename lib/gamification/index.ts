export {
  checkNewBadges,
  getBadgeById,
  getAllBadges,
  calculateStreak,
  BADGE_DEFINITIONS,
} from './badge-system'
export type { BadgeDefinition, BadgeCheckContext } from './badge-system'

export {
  calculateXPForAction,
  calculateLevelFromXP,
  getXPForLevel,
  getTotalXPForLevel,
  XP_REWARDS,
} from './xp-calculator'
export type { XPAction, XPReward, XPCalculationResult } from './xp-calculator'
