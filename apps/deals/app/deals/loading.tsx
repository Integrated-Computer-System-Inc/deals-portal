'use client';

import React from 'react';
import DealLoadingScreen from '@/components/DealLoadingScreen';

export default function DealsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      <DealLoadingScreen
        title="Loading Deals Registry"
        status="Fetching active pipeline opportunities, customer records & renewals..."
      />
    </div>
  );
}
