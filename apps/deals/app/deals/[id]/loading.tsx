'use client';

import React from 'react';
import DealLoadingScreen from '@/components/DealLoadingScreen';

export default function DealDetailsLoading() {
  return (
    <div className="max-w-5xl mx-auto py-12">
      <DealLoadingScreen
        title="Loading Deal Details"
        status="Fetching complete registration parameters, SLA scheduling & item breakdown..."
      />
    </div>
  );
}
