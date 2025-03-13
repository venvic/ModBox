import React from 'react';
import { ProductModules } from '@/components/module';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return <ProductModules productId={id} />;
}