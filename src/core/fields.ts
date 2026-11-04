export const efforts = ['XS', 'S', 'M', 'L', 'XL'] as const
export const priorities = ['P0', 'P1', 'P2', 'P3'] as const
export const issueTypes = ['Bug', 'Epic', 'Feature', 'Spec', 'Task'] as const

export type Effort = (typeof efforts)[number]
export type Priority = (typeof priorities)[number]
