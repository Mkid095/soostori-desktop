/**
 * desktop-business-repository.ts — BusinessRepository entry point.
 * Part of desktop-business-repository split per ANPAS.
 */

import type { BusinessRepository } from '@soostori/business'
import type { UUID } from '@soostori/core'
import type { Business, Person, Membership, PersonMemberships } from '@soostori/business'
import { DesktopPersonRepository } from './business-person-repo'
import { DesktopBusinessRepositoryImpl } from './business-business-repo'
import { DesktopMembershipRepository } from './business-membership-repo'

export class DesktopBusinessRepository implements BusinessRepository {
  private person = new DesktopPersonRepository()
  private business = new DesktopBusinessRepositoryImpl()
  private membership = new DesktopMembershipRepository()

  async findPerson(id: UUID): Promise<Person | null> { return this.person.findPerson(id) }
  async findPersonByCloudId(cloudUserId: string): Promise<Person | null> { return this.person.findPersonByCloudId(cloudUserId) }
  async findPersonByEmail(email: string): Promise<Person | null> { return this.person.findPersonByEmail(email) }
  async createPerson(data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> { return this.person.createPerson(data) }
  async updatePerson(id: UUID, changes: Partial<Person>): Promise<Person> { return this.person.updatePerson(id, changes) }

  async findBusiness(id: UUID): Promise<Business | null> { return this.business.findBusiness(id) }
  async findBusinessesByOwner(personId: UUID): Promise<Business[]> { return this.business.findBusinessesByOwner(personId) }
  async createBusiness(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> { return this.business.createBusiness(data) }
  async updateBusiness(id: UUID, changes: Partial<Business>): Promise<Business> { return this.business.updateBusiness(id, changes) }

  async findMembership(id: UUID): Promise<Membership | null> { return this.membership.findMembership(id) }
  async findMemberships(personId: UUID): Promise<Membership[]> { return this.membership.findMemberships(personId) }
  async findMembershipsByBusiness(businessId: UUID): Promise<Membership[]> { return this.membership.findMembershipsByBusiness(businessId) }
  async createMembership(data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'invitedAt'>): Promise<Membership> { return this.membership.createMembership(data) }
  async updateMembership(id: UUID, changes: Partial<Membership>): Promise<Membership> { return this.membership.updateMembership(id, changes) }
  async revokeMembership(id: UUID): Promise<void> { return this.membership.revokeMembership(id) }

  async setActiveBusiness(_personId: UUID, _businessId: UUID): Promise<void> { /* single-shop: no-op */ }
  async getActiveBusiness(_deviceId: UUID): Promise<Business | null> { return this.business.getActiveBusiness() }
  async getPersonMemberships(personId: UUID): Promise<PersonMemberships | null> { return this.membership.getPersonMemberships(personId) }
}
