export type UserType = 'solo' | 'school'

export type SchoolRole = 'admin' | 'editor' | 'teacher'

export interface CurrentUser {
	id: string
	displayName: string
	email?: string
	type: UserType
	role?: SchoolRole
}

export interface SchoolMember {
	id: string
	displayName: string
	email?: string
	role: SchoolRole
}
