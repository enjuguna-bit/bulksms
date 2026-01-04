import { getCustomers } from './storage';
import type { Customer } from '@/types';

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
}

export async function getCustomerContacts(): Promise<CustomerContact[]> {
  const customers = await getCustomers();
  return customers.map(customer => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phoneNumber
  }));
}
