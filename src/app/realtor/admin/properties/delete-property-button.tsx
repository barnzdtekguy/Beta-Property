'use client';

import { useState } from 'react';
import { deleteProperty } from './actions';

export function DeletePropertyButton({ propertyId, title }: { propertyId: string; title: string }) {
  const [pending, setPending] = useState(false);

  return (
    <form action={deleteProperty} onSubmit={(event) => {
      if (!window.confirm(`Delete “${title}” and all of its images? This cannot be undone.`)) {
        event.preventDefault();
        return;
      }
      setPending(true);
    }}>
      <input type="hidden" name="property_id" value={propertyId} />
      <button disabled={pending} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">
        {pending ? 'Deleting…' : 'Delete'}
      </button>
    </form>
  );
}
