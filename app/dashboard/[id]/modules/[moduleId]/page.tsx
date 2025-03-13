import React from 'react';
import { ModuleDetails } from '@/components/moduleDetails';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string, moduleId: string }>
}) {
  const { id, moduleId } = await params;
  return <ModuleDetails productId={id} moduleId={moduleId} />;
}
