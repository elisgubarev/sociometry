import type { Thresholds } from "./types"

/** Category thresholds after Я. Л. Коломинский. */
export const DEFAULT_THRESHOLDS: Thresholds = { star: 6, pref: 3, acc: 1 }

export const DEFAULT_MAX_CHOICES = 3
export const MIN_MAX_CHOICES = 1
export const MAX_MAX_CHOICES = 10
export const MAX_THRESHOLD = 40

export const DEFAULT_QUESTION_POS = "С кем из класса ты хотел(а) бы сидеть за одной партой?"
export const DEFAULT_QUESTION_NEG = "С кем из класса ты не хотел(а) бы сидеть за одной партой?"

export const MAX_NAME_LENGTH = 120
export const MAX_STUDENTS = 200
