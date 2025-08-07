import { itemIcons } from './itemicons'
import { uxIcons } from './uxicons'

export const allIcons = {
  ...itemIcons,
  ...uxIcons,
} as const

// 혼용 가능한 통합 키 타입
export type IconKey = keyof typeof allIcons

export type IconCategory = typeof allIcons[IconKey]['category']
// 각 아이콘의 타입
export type IconEntry = typeof allIcons[IconKey]

export type IconProperty = (typeof allIcons)[IconKey]