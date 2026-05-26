export interface LevelInfo {
  level: number
  name: string
  minXP: number
  maxXP: number
}

export interface LeaderboardEntry {
  id: string
  displayName: string
  avatarUrl: string | null
  totalXP: number
  level: LevelInfo
  streak: number
  badgeCount: number
  lastActiveAt: Date
}
