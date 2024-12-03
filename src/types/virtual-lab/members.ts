import { VlmResponse } from './common';

export type MockRole = 'administrator' | 'member';

export type Role = 'admin' | 'member';

export type MockMember = {
  key: string;
  name: string;
  lastActive: string;
  role: MockRole;
};
export interface VirtualLabMember {
  id: string;
  username: string;
  created_at: string;
  first_name: string;
  last_name: string;
  invite_accepted: boolean;
  role: Role;
  name: string;
  email: string;
}

export type UsersResponse = VlmResponse<{ users: VirtualLabMember[] }>;

export type TotalUsersResponse = VlmResponse<{ total: number }>;

/**
 * Example:
 * {
 *  "id": "https://openbluebrain.com/api/nexus/v1/realms/SBO/users/doe",
    "type": ["Agent", "Person"], 
    "given_name": "John",
    "family_name": "Doe",
    "name": "John Doe",
    "createdAt": "2024-11-19T14:40:05.373997Z"
 * }
 */
export type Agent = {
  id: string;
  given_name: string;
  family_name: string;
  name: string;
  createdAt: string;
  type: string[];
};
