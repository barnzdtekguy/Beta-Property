'use server';

import { redirect } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function submitPropertyInquiry(formData: FormData) {
  const propertyId = String(formData.get('property_id') ?? '').trim();
  const returnPath = String(formData.get('return_path') ?? '/contact');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const details = String(formData.get('request_details') ?? '').trim();
  const preferredContactMethod = String(formData.get('preferred_contact_method') ?? 'phone');
  const trap = String(formData.get('website') ?? '').trim();

  const destination =
    returnPath === '/contact' || /^\/properties\/[a-z0-9-]+$/.test(returnPath)
      ? returnPath
      : '/contact';
  const fail = (reason: string): never =>
    redirect(`${destination}?inquiry=${encodeURIComponent(reason)}#inquiry`);

  if (trap) fail('invalid');
  if (
    fullName.length < 2 ||
    fullName.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    phone.length < 7 ||
    phone.length > 40 ||
    details.length < 5 ||
    details.length > 4000 ||
    !['phone', 'email', 'whatsapp'].includes(preferredContactMethod)
  ) {
    fail('invalid');
  }

  if (propertyId) {
    const userClient = createClient();
    const { data: property, error: propertyError } = await userClient
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('status', 'published')
      .maybeSingle();

    if (propertyError) {
      console.error('[submitPropertyInquiry] property lookup failed:', propertyError.message);
      fail('unavailable');
    }
    if (!property) fail('unavailable');
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from('inquiries').insert({
    full_name: fullName,
    email,
    phone,
    request_details: details,
    inquiry_type: 'buyer',
    property_id: propertyId || null,
    preferred_contact_method: preferredContactMethod,
    status: 'new',
  });

  if (error) {
    console.error('[submitPropertyInquiry] insert failed:', error.message);
    fail('unavailable');
  }

  redirect(`${destination}?inquiry=sent#inquiry`);
}
