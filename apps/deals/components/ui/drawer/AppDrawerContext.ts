'use client';

import React from 'react';

export const AppDrawerContext = React.createContext<{ onClose?: () => void }>({});
