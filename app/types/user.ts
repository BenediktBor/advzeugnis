export type UserType = 'solo' | 'school'

export type SchoolRole = 'admin' | 'templateManager' | 'teacher'

export interface CurrentUser {
	id: string
	displayName: string
	email?: string
	type: UserType
	role?: SchoolRole
	schoolId?: string
	schoolName?: string
}

export interface SchoolMember {
	id: string
	membershipId?: string
	displayName: string
	email?: string
	role: SchoolRole
}

export interface SchoolInvite {
	id: string
	email: string
	role: SchoolRole
	token: string
	expiresAt: number
}
